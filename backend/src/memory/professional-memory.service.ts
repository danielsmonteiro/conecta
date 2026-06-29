import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Campos que a IA pode informar (vindos da tool `atualizar_memoria`). Chaves em PT
 * para casar com o que o modelo extrai da conversa. Só os campos PREENCHIDOS são
 * gravados — nunca inventar nem sobrescrever com vazio.
 */
export interface MemoryUpdateInput {
  nome?: string;            // → HealthProfessional.fullName
  cidade?: string;          // → HealthProfessional.city
  estado?: string;          // → HealthProfessional.state
  profissao?: string;       // → ProfessionalMemory.profession
  especialidade?: string;   // → ProfessionalMemory.specialtyName
  disponibilidade?: string; // → ProfessionalMemory.availability
  pretensaoSalarial?: string; // → ProfessionalMemory.salaryExpectation
  preferenciasVaga?: string;  // → ProfessionalMemory.vacancyPreferences
  resumo?: string;          // → ProfessionalMemory.summary
}

@Injectable()
export class ProfessionalMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Garante (cria se faltar) a linha de memória do profissional. */
  async getOrCreate(professionalId: string) {
    return this.prisma.professionalMemory.upsert({
      where: { professionalId },
      update: {},
      create: { professionalId },
    });
  }

  /** Bloco de texto com a memória, injetado no system prompt da IA (vazio se nada conhecido). */
  buildPromptBlock(professional: any, memory: any, applicationsCount = 0): string {
    if (!professional) return '';
    const linhas: string[] = [];
    const add = (rotulo: string, valor?: string | null) => {
      if (valor && String(valor).trim()) linhas.push(`- ${rotulo}: ${String(valor).trim()}`);
    };
    add('Nome', professional.fullName?.split(' ')[0]); // LGPD: só o primeiro nome no prompt
    add('Profissão', memory?.profession);
    add('Especialidade', memory?.specialtyName ?? professional.mainSpecialty?.name);
    const local = [professional.city, professional.state].filter(Boolean).join('/');
    add('Cidade/UF', local || null);
    add('Disponibilidade', memory?.availability);
    add('Pretensão salarial', memory?.salaryExpectation);
    add('Preferências de vaga', memory?.vacancyPreferences);
    if (memory?.presentedVacancyIds?.length) {
      linhas.push(`- Vagas já apresentadas: ${memory.presentedVacancyIds.length}`);
    }
    if (applicationsCount > 0) linhas.push(`- Candidaturas já feitas: ${applicationsCount}`);
    add('Resumo da conversa', memory?.summary);
    if (!linhas.length) return '';
    return ['MEMÓRIA DO PROFISSIONAL (use para personalizar; não pergunte o que já se sabe):', ...linhas].join('\n');
  }

  /**
   * Aplica o que o usuário informou. Nome/cidade/estado vão para o HealthProfessional;
   * o resto para a ProfessionalMemory. Só grava campos preenchidos. Retorna o que mudou.
   */
  async applyUpdate(professionalId: string, input: MemoryUpdateInput): Promise<string[]> {
    const clean = (v?: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : undefined);
    const changed: string[] = [];

    const profData: Record<string, string> = {};
    if (clean(input.nome)) { profData.fullName = clean(input.nome)!; changed.push('nome'); }
    if (clean(input.cidade)) { profData.city = clean(input.cidade)!; changed.push('cidade'); }
    if (clean(input.estado)) { profData.state = clean(input.estado)!; changed.push('estado'); }
    if (Object.keys(profData).length) {
      await this.prisma.healthProfessional.update({ where: { id: professionalId }, data: profData });
    }

    const memData: Record<string, string> = {};
    const map: [keyof MemoryUpdateInput, string, string][] = [
      ['profissao', 'profession', 'profissão'],
      ['especialidade', 'specialtyName', 'especialidade'],
      ['disponibilidade', 'availability', 'disponibilidade'],
      ['pretensaoSalarial', 'salaryExpectation', 'pretensão salarial'],
      ['preferenciasVaga', 'vacancyPreferences', 'preferências'],
      ['resumo', 'summary', 'resumo'],
    ];
    for (const [inKey, col, label] of map) {
      const val = clean(input[inKey]);
      if (val) { memData[col] = val; changed.push(label); }
    }
    if (Object.keys(memData).length) {
      await this.prisma.professionalMemory.upsert({
        where: { professionalId },
        update: memData,
        create: { professionalId, ...memData },
      });
    }
    return changed;
  }

  /** Marca uma vaga como já apresentada ao profissional (sem duplicar). */
  async markVacancyPresented(professionalId: string, vacancyId: string) {
    const mem = await this.getOrCreate(professionalId);
    if (mem.presentedVacancyIds.includes(vacancyId)) return;
    await this.prisma.professionalMemory.update({
      where: { professionalId },
      data: { presentedVacancyIds: { set: [...mem.presentedVacancyIds, vacancyId] } },
    });
  }

  /** Visão consolidada para a API (perfil + memória + candidaturas). */
  async getForApi(professionalId: string) {
    const professional = await this.prisma.healthProfessional.findUnique({
      where: { id: professionalId },
      include: { mainSpecialty: { select: { name: true } } },
    });
    if (!professional) return null;
    const [memory, applications] = await Promise.all([
      this.prisma.professionalMemory.findUnique({ where: { professionalId } }),
      this.prisma.application.findMany({
        where: { professionalId },
        select: { id: true, status: true, vacancy: { select: { id: true, title: true } } },
      }),
    ]);
    return {
      professional: {
        id: professional.id,
        fullName: professional.fullName,
        whatsapp: professional.whatsapp,
        city: professional.city,
        state: professional.state,
        mainSpecialty: professional.mainSpecialty?.name ?? null,
      },
      memory,
      applications,
    };
  }
}
