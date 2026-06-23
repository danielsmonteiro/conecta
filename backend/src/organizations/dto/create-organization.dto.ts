import { OrganizationStatus, OrganizationType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(OrganizationType)
  type: OrganizationType;

  @IsOptional() @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;

  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() documentNumber?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() mainContactName?: string;
  @IsOptional() @IsString() mainContactPhone?: string;
  @IsOptional() @IsEmail() mainContactEmail?: string;
  @IsOptional() @IsString() notes?: string;
}
