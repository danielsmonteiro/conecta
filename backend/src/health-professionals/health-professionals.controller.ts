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
import { CreateHealthProfessionalDto } from './dto/create-health-professional.dto';
import { UpdateHealthProfessionalDto } from './dto/update-health-professional.dto';
import { HealthProfessionalsService } from './health-professionals.service';

@Controller('health-professionals')
@UseGuards(JwtAuthGuard)
export class HealthProfessionalsController {
  constructor(private readonly service: HealthProfessionalsService) {}

  @Get()
  list(@Query() q: PaginationDto) {
    return this.service.list(q);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateHealthProfessionalDto) {
    return this.service.create(dto);
  }

  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.service.profile(id);
  }

  @Get(':id/metrics')
  metrics(@Param('id') id: string) {
    return this.service.metrics(id);
  }

  @Get(':id/events')
  events(@Param('id') id: string) {
    return this.service.events(id);
  }

  @Get(':id/allocations')
  allocations(@Param('id') id: string) {
    return this.service.allocations(id);
  }

  @Get(':id/financial')
  financial(@Param('id') id: string) {
    return this.service.financial(id);
  }

  @Get(':id/conversations')
  conversations(@Param('id') id: string) {
    return this.service.conversations(id);
  }

  @Get(':id/channel-identities')
  channelIdentities(@Param('id') id: string) {
    return this.service.channelIdentities(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHealthProfessionalDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
