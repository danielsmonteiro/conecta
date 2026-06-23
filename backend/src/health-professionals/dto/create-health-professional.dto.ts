import { Council, Gender, ProfessionalOrigin, ProfessionalType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateHealthProfessionalDto {
  @IsString() @MinLength(1)
  fullName: string;

  @IsString() @MinLength(1)
  whatsapp: string;

  @IsString()
  primaryCboId: string;

  @IsEnum(ProfessionalType)
  professionalType: ProfessionalType;

  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsEnum(Council) council?: Council;
  @IsOptional() @IsEnum(ProfessionalOrigin) origin?: ProfessionalOrigin;
  @IsOptional() @IsBoolean() isIndicated?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) additionalCboIds?: string[];

  @IsOptional() @IsString() socialName?: string;
  @IsOptional() @IsString() cpf?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() councilNumber?: string;
  @IsOptional() @IsString() councilState?: string;
  @IsOptional() @IsString() specialistRegistryNumber?: string;
  @IsOptional() @IsString() crmNumber?: string;
  @IsOptional() @IsString() crmState?: string;
  @IsOptional() @IsString() rqeNumber?: string;
  @IsOptional() @IsString() mainSpecialtyId?: string;
  @IsOptional() @IsString() indicatedBy?: string;
  @IsOptional() @IsString() notes?: string;
}
