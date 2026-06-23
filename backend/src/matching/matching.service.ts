import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchScore {
  vacancyId: string;
  doctorId: string;
  doctor: any;
  score: string; // produção retorna string
  category: 'LOW' | 'MEDIUM' | 'HIGH';
  eligible: boolean;
  operationalConflict: string | null;
  ineligibilityReasons: string[];
  positiveReasons: string[];
  negativeReasons: string[];
}

const DOCTOR_SELECT = {
  id: true,
  fullName: true,
  crmNumber: true,
  crmState: true,
  whatsapp: true,
  city: true,
  state: true,
  status: true,
  credentialStatus: true,
  isIndicated: true,
  noShowCount: true,
  attendanceRate: true,
  mainSpecialty: { select: { id: true, name: true } },
  primaryCbo: { select: { id: true, name: true, cbo2002Code: true, coCbo: true } },
};

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async scoreVacancy(vacancyId: string, limit = 5): Promise<MatchScore[]> {
    const vacancy = await this.prisma.vacancy.findFirst({ where: { id: vacancyId, deletedAt: null } });
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    const candidates = await this.prisma.healthProfessional.findMany({
      where: { deletedAt: null, status: { notIn: ['BLOCKED', 'ARCHIVED'] } },
      include: { allocations: true, mainSpecialty: { select: { id: true, name: true } }, primaryCbo: { select: { id: true, name: true, cbo2002Code: true, coCbo: true } } },
    });

    const scored = candidates.map((c) => this.score(vacancy, c, (c as any).allocations));
    return scored.sort((a, b) => Number(b.score) - Number(a.score)).slice(0, limit);
  }

  /** Lista paginada de scores das vagas em aberto (GET /api/matching/scores). */
  async scores(page = 1, limit = 12) {
    const vacancies = await this.prisma.vacancy.findMany({
      where: { deletedAt: null, status: { in: ['OPEN', 'MATCHING', 'RECEIVING_APPLICATIONS'] } },
      take: 20,
    });
    const all: MatchScore[] = [];
    for (const v of vacancies) {
      const candidates = await this.prisma.healthProfessional.findMany({
        where: { deletedAt: null, status: { notIn: ['BLOCKED', 'ARCHIVED'] } },
        include: { allocations: true, mainSpecialty: { select: { id: true, name: true } }, primaryCbo: { select: { id: true, name: true, cbo2002Code: true, coCbo: true } } },
      });
      all.push(...candidates.map((c) => this.score(v, c, (c as any).allocations)));
    }
    all.sort((a, b) => Number(b.score) - Number(a.score));
    const start = (page - 1) * limit;
    return paginate(all.slice(start, start + limit), all.length, page, limit);
  }

  private score(vacancy: any, prof: any, allocations: any[]): MatchScore {
    const positiveReasons: string[] = [];
    const negativeReasons: string[] = [];
    const ineligibilityReasons: string[] = [];
    let score = 40;

    if (vacancy.specialtyId && prof.mainSpecialtyId === vacancy.specialtyId) {
      score += 30;
      positiveReasons.push('Especialidade principal compatível.');
    } else if (!vacancy.specialtyId) {
      score += 10;
      positiveReasons.push('Vaga sem especialidade exigida.');
    } else {
      negativeReasons.push('Especialidade principal diferente da exigida.');
    }

    if (prof.status === 'ACTIVE') {
      score += 15;
      positiveReasons.push('Profissional ativo.');
    } else {
      negativeReasons.push(`Status do profissional: ${prof.status}.`);
    }

    if (prof.credentialStatus === 'VALID') {
      score += 10;
      positiveReasons.push('Credenciais válidas.');
    } else {
      score -= 5;
      negativeReasons.push(`Credenciais: ${prof.credentialStatus}.`);
    }

    if (prof.isIndicated) {
      score += 5;
      positiveReasons.push('Profissional indicado.');
    }

    const overlapping = (allocations || []).some(
      (a) =>
        ['CONFIRMED', 'IN_PROGRESS'].includes(a.status) &&
        a.startsAt &&
        a.endsAt &&
        a.startsAt < vacancy.endsAt &&
        a.endsAt > vacancy.startsAt,
    );
    const operationalConflict = overlapping ? 'Conflito de agenda com alocação existente.' : null;
    if (overlapping) {
      score = Math.round(score * 0.3);
      ineligibilityReasons.push(operationalConflict!);
    }

    score = Math.max(0, Math.min(100, score));
    const category: MatchScore['category'] = score >= 70 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';
    const eligible = !overlapping && score > 0 && prof.status !== 'BLOCKED';

    const { allocations: _a, ...doctor } = prof;
    return {
      vacancyId: vacancy.id,
      doctorId: prof.id,
      doctor,
      score: String(score),
      category,
      eligible,
      operationalConflict,
      ineligibilityReasons,
      positiveReasons,
      negativeReasons,
    };
  }
}
