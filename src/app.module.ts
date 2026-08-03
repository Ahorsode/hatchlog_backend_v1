import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { validateEnv, type Env } from './config/env.schema';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EggCategoriesModule } from './egg-categories/egg-categories.module';
import { EggsModule } from './eggs/eggs.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FarmsModule } from './farms/farms.module';
import { FeedingModule } from './feeding/feeding.module';
import { GrowthStandardsModule } from './growth-standards/growth-standards.module';
import { HealthModule } from './health/health.module';
import { HealthDomainModule } from './health-domain/health-domain.module';
import { HousesModule } from './houses/houses.module';
import { InventoryModule } from './inventory/inventory.module';
import { IsolationModule } from './isolation/isolation.module';
import { LedgerModule } from './ledger/ledger.module';
import { LivestockModule } from './livestock/livestock.module';
import { MeModule } from './me/me.module';
import { MortalityModule } from './mortality/mortality.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RemindersModule } from './reminders/reminders.module';
import { SalesModule } from './sales/sales.module';
import { StatementsModule } from './statements/statements.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SyncModule } from './sync/sync.module';
import { TeamModule } from './team/team.module';
import { TrashModule } from './trash/trash.module';
import { redisConnectionFromUrl } from './workers/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisConnectionFromUrl(
          config.get('REDIS_URL', { infer: true }),
        ),
      }),
    }),
    PrismaModule,
    RemindersModule,
    CommonModule,
    AuthModule,
    HealthModule,
    SyncModule,
    MeModule,
    HousesModule,
    LivestockModule,
    EggsModule,
    FeedingModule,
    MortalityModule,
    IsolationModule,
    EggCategoriesModule,
    GrowthStandardsModule,
    FarmsModule,
    TeamModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    OrdersModule,
    SalesModule,
    PaymentsModule,
    StatementsModule,
    // Wave 3
    HealthDomainModule,
    ExpensesModule,
    LedgerModule,
    // Wave 4
    DashboardModule,
    AnalyticsModule,
    TrashModule,
    AuditModule,
    SubscriptionsModule,
    AdminModule,
  ],
})
export class AppModule {}
