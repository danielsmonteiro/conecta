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
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

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
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
