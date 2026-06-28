import { Controller, Get, Module, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfessionalMemoryService } from './professional-memory.service';

// GET /api/memory/:professionalId — inspeciona a memória/perfil de um profissional.
@Controller('memory')
@UseGuards(JwtAuthGuard)
export class MemoryController {
  constructor(private readonly memory: ProfessionalMemoryService) {}

  @Get(':professionalId')
  async get(@Param('professionalId') professionalId: string) {
    const data = await this.memory.getForApi(professionalId);
    if (!data) throw new NotFoundException('Profissional não encontrado.');
    return data;
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [MemoryController],
  providers: [ProfessionalMemoryService],
  exports: [ProfessionalMemoryService],
})
export class MemoryModule {}
