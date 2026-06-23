import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { CbosModule } from './cbos/cbos.module';
import { AllocationsModule } from './allocations/allocations.module';
import { ApplicationsModule } from './applications/applications.module';
import { AuthModule } from './auth/auth.module';
import { ContractsModule } from './contracts/contracts.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { FinancialModule } from './financial/financial.module';
import { HealthProfessionalsModule } from './health-professionals/health-professionals.module';
import { HealthUnitsModule } from './health-units/health-units.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MatchingModule } from './matching/matching.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicAgenciesModule } from './public-agencies/public-agencies.module';
import { SettingsModule } from './settings/settings.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { UsersModule } from './users/users.module';
import { VacanciesModule } from './vacancies/vacancies.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    SettingsModule,
    OrganizationsModule,
    PublicAgenciesModule,
    HealthUnitsModule,
    SpecialtiesModule,
    HealthProfessionalsModule,
    ContractsModule,
    VacanciesModule,
    ApplicationsModule,
    AllocationsModule,
    MatchingModule,
    FinancialModule,
    ConversationsModule,
    AiModule,
    IntegrationsModule,
    DocumentTypesModule,
    AuditModule,
    CbosModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
