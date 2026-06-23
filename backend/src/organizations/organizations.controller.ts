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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  list(@Query() q: PaginationDto) {
    return this.service.list(q);
  }

  @Get(':id/profile')
  profile(@Param('id') id: string) {
    return this.service.profile(id);
  }

  @Get(':id/financial')
  financial(@Param('id') id: string) {
    return this.service.financial(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
