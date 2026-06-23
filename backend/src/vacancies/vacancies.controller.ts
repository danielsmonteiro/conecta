import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacanciesService } from './vacancies.service';

@Controller('vacancies')
@UseGuards(JwtAuthGuard)
export class VacanciesController {
  constructor(private readonly service: VacanciesService) {}

  @Get()
  list(@Query() q: PaginationDto) {
    return this.service.list(q);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateVacancyDto) {
    return this.service.create(dto);
  }

  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.service.profile(id);
  }

  @Get(':id/applications')
  applications(@Param('id') id: string) {
    return this.service.applications(id);
  }

  @Get(':id/kanban')
  kanban(@Param('id') id: string) {
    return this.service.kanban(id);
  }

  @Get(':id/matching')
  matching(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.matching(id, limit ? Number(limit) : 5);
  }

  @Get(':id/allocations')
  allocations(@Param('id') id: string) {
    return this.service.allocations(id);
  }

  @Get(':id/conversations')
  conversations(@Param('id') id: string) {
    return this.service.conversations(id);
  }

  @Get(':id/financial')
  financial(@Param('id') id: string) {
    return this.service.financial(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVacancyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
