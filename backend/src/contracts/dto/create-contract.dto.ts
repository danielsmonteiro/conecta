import { ContractStatus, ContractType } from '@prisma/client';
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

export class CreateContractDto {
  @IsString() @MinLength(1)
  name: string;

  @IsEnum(ContractType)
  type: ContractType;

  @IsString()
  healthUnitId: string;

  @IsDateString()
  startsAt: string;

  @Type(() => Number) @IsInt() @Min(1)
  requiredDoctors: number;

  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
  @IsOptional() @IsString() organizationId?: string;
  @IsOptional() @IsString() publicAgencyId?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @Type(() => Number) @IsNumber() clientAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() doctorAmount?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsBoolean() requiresHumanApproval?: boolean;
  @IsOptional() @IsBoolean() autoGenerateVacancies?: boolean;
  @IsOptional() @IsString() notes?: string;
}
