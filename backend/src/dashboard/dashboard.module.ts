import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialModule } from '../financial/financial.module';
import { FinancialService } from '../financial/financial.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financial: FinancialService,
  ) {}

  // GET /api/dashboard/summary — objeto PLANO com os contadores operacionais
  // (mesmo contrato da produção).
  async summary() {
    const p = this.prisma;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const c = (model: any, where: any) => model.count({ where });

    const [
      registeredDoctors,
      registeredHealthUnits,
      activeHealthUnits,
      pendingSetupHealthUnits,
      healthUnitsWithoutHierarchyCount,
      registeredContracts,
      pendingContracts,
      pausedContracts,
      activeContracts,
      registeredVacancies,
      openVacancies,
      partiallyFilledVacancies,
      filledVacancies,
      pendingReviewVacancies,
      urgentVacancies,
      registeredApplications,
      pendingApplications,
      underReviewApplications,
      selectedApplications,
      rejectedApplications,
      withdrawnApplications,
      applicationsFromMatching,
      eligibleApplications,
      registeredAllocations,
      confirmedAllocations,
      pendingConfirmationAllocations,
      inProgressAllocations,
      completedAllocations,
      noShowAllocations,
      organizationsCount,
      activeOrganizationsCount,
      publicAgenciesCount,
      activePublicAgenciesCount,
    ] = await Promise.all([
      c(p.healthProfessional, { status: 'ACTIVE', deletedAt: null }),
      c(p.healthUnit, { deletedAt: null }),
      c(p.healthUnit, { status: 'ACTIVE', deletedAt: null }),
      c(p.healthUnit, { status: { not: 'ACTIVE' }, deletedAt: null }),
      c(p.healthUnit, { organizationId: null, deletedAt: null }),
      c(p.contract, { deletedAt: null }),
      c(p.contract, { status: { in: ['DRAFT', 'PENDING_REVIEW'] }, deletedAt: null }),
      c(p.contract, { status: 'SUSPENDED', deletedAt: null }),
      c(p.contract, { status: 'ACTIVE', deletedAt: null }),
      c(p.vacancy, { deletedAt: null }),
      c(p.vacancy, { status: 'OPEN', deletedAt: null }),
      c(p.vacancy, { status: 'PARTIALLY_FILLED', deletedAt: null }),
      c(p.vacancy, { status: 'FILLED', deletedAt: null }),
      c(p.vacancy, { status: 'PENDING_HUMAN_REVIEW', deletedAt: null }),
      c(p.vacancy, { priority: { in: ['HIGH', 'URGENT'] }, status: { notIn: ['ARCHIVED', 'COMPLETED', 'CANCELLED'] }, deletedAt: null }),
      c(p.application, {}),
      c(p.application, { status: 'PENDING' }),
      c(p.application, { status: 'IN_REVIEW' }),
      c(p.application, { status: 'APPROVED' }),
      c(p.application, { status: 'REJECTED' }),
      c(p.application, { status: 'WITHDRAWN' }),
      c(p.application, { origin: 'MATCHING' }),
      c(p.application, { status: 'APPROVED' }),
      c(p.allocation, {}),
      c(p.allocation, { status: 'CONFIRMED' }),
      c(p.allocation, { status: 'PENDING' }),
      c(p.allocation, { status: 'IN_PROGRESS' }),
      c(p.allocation, { status: 'COMPLETED' }),
      c(p.allocation, { attendanceStatus: 'ABSENT' }),
      c(p.organization, { deletedAt: null }),
      c(p.organization, { status: 'ACTIVE', deletedAt: null }),
      c(p.publicAgency, { deletedAt: null }),
      c(p.publicAgency, { status: 'ACTIVE', deletedAt: null }),
    ]);

    const [
      calculatedMatches,
      perfectMatches,
      projectedFinancialEntries,
      pendingFinancialEntries,
      overdueFinancialEntries,
      paidFinancialEntries,
      contestedFinancialEntries,
      openConversations,
      waitingHumanConversations,
      humanHandlingConversations,
      resolvedConversations,
      aiEnabledConversations,
      conversationMessagesLast24h,
      outboundMessagesToday,
      failedOutboundMessages,
      inboundWebhooksToday,
      aiRunsToday,
      aiFailedRuns,
      activeProviders,
      fin,
    ] = await Promise.all([
      c(p.application, { matchScore: { not: null } }),
      c(p.application, { matchScore: { gte: 90 } }),
      c(p.financialEntry, { status: 'PENDING_APPROVAL' }),
      c(p.financialEntry, { status: 'PENDING_APPROVAL' }),
      c(p.financialEntry, { status: 'OVERDUE' }),
      c(p.financialEntry, { status: 'PAID' }),
      c(p.financialEntry, { status: 'CONTESTED' }),
      c(p.conversation, { status: { in: ['OPEN', 'AI_ACTIVE', 'WAITING_HUMAN'] } }),
      c(p.conversation, { status: 'WAITING_HUMAN' }),
      c(p.conversation, { status: 'OPEN' }),
      c(p.conversation, { status: 'CLOSED' }),
      c(p.conversation, { aiEnabled: true }),
      c(p.message, { createdAt: { gte: last24h } }),
      c(p.outboundMessageLog, { createdAt: { gte: startOfToday } }),
      c(p.outboundMessageLog, { status: 'FAILED' }),
      c(p.webhookLog, { createdAt: { gte: startOfToday } }),
      c(p.aiConversationRun, { startedAt: { gte: startOfToday } }),
      c(p.aiConversationRun, { status: 'FAILED' }),
      c(p.messagingProvider, { status: 'ACTIVE' }),
      this.financial.summary(),
    ]);

    const operationalAlerts =
      urgentVacancies + waitingHumanConversations + overdueFinancialEntries + failedOutboundMessages + pendingConfirmationAllocations;

    return {
      registeredDoctors,
      registeredHealthUnits,
      activeHealthUnits,
      pendingSetupHealthUnits,
      registeredContracts,
      pendingContracts,
      pausedContracts,
      registeredVacancies,
      openVacancies,
      partiallyFilledVacancies,
      filledVacancies,
      pendingReviewVacancies,
      urgentVacancies,
      pendingApplications,
      registeredApplications,
      interestedApplications: pendingApplications,
      underReviewApplications,
      eligibleApplications,
      selectedApplications,
      rejectedApplications,
      withdrawnApplications,
      calculatedMatches,
      perfectMatches,
      ineligibleMatches: 0,
      applicationsFromMatching,
      activeContracts,
      registeredAllocations,
      confirmedAllocations,
      pendingConfirmationAllocations,
      inProgressAllocations,
      completedAllocations,
      noShowAllocations,
      pendingDocuments: 0,
      projectedFinancialEntries,
      totalReceivable: fin.totalReceivable,
      totalPayable: fin.totalPayable,
      estimatedMargin: fin.estimatedMargin,
      pendingFinancialEntries,
      overdueFinancialEntries,
      paidFinancialEntries,
      contestedFinancialEntries,
      openConversations,
      waitingHumanConversations,
      humanHandlingConversations,
      resolvedConversations,
      aiEnabledConversations,
      conversationMessagesLast24h,
      outboundMessagesToday,
      failedOutboundMessages,
      inboundWebhooksToday,
      messagingProviderStatus: activeProviders > 0 ? 'CONFIGURED' : 'NOT_CONFIGURED',
      aiRunsToday,
      aiFailedRuns,
      aiHandoffs: 0,
      aiBlockedActions: 0,
      operationalAlerts,
      organizationsCount,
      activeOrganizationsCount,
      publicAgenciesCount,
      activePublicAgenciesCount,
      healthUnitsWithoutHierarchyCount,
    };
  }
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  summary() {
    return this.service.summary();
  }
}

@Module({
  imports: [FinancialModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
