import { ShiftType, VacancyPriority, VacancyStatus, WorkModel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVacancyDto {
  @IsString() @MinLength(1)
  title: string;

  @IsString()
  healthUnitId: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @Type(() => Number) @IsInt() @Min(1)
  requiredDoctors: number;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(VacancyStatus) status?: VacancyStatus;
  @IsOptional() @IsEnum(VacancyPriority) priority?: VacancyPriority;
  @IsOptional() @IsString() contractId?: string;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() publicAgencyId?: string;
  @IsOptional() @IsString() specialtyId?: string;
  @IsOptional() @IsEnum(ShiftType) shiftType?: ShiftType;
  @IsOptional() @IsEnum(WorkModel) workModel?: WorkModel;
  @IsOptional() @Type(() => Number) @IsNumber() clientAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() doctorAmount?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsBoolean() requiresHumanApproval?: boolean;
  @IsOptional() @IsBoolean() autoStartCampaign?: boolean;
  @IsOptional() @IsString() notes?: string;
}
