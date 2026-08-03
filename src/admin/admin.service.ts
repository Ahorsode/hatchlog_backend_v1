import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  BindDeviceDto,
  ConfirmPaymentDto,
  ExtendTrialDto,
  IssueLicenseDto,
  RenewLicenseDto,
  RevokeFarmDto,
  UpgradeTierDto,
} from './dto/admin.dto';
import {
  generateActivationLicenseToken,
  generateIssuedLicenseToken,
  normalizeDesktopFarmId,
  normalizeHardwareFingerprint,
} from './license-token';

const PAID_STATUSES = ['ACTIVE', 'PAID', 'PAID_AND_ACTIVE'];
const TRIAL_STATUSES = [
  'CLOUD_TRIAL',
  'GRACE_PERIOD',
  'TRIALING',
  'TRIAL',
  'PENDING',
];
const EXPIRED_STATUSES = ['EXPIRED', 'LAPSED'];
const DURATION_PACK = {
  '3M': { days: 90, label: '+3 Months Subscription Pack' },
  '1Y': { days: 365, label: '+1 Year' },
} as const;

type LicenseStatus = 'PAID' | 'TRIALING' | 'EXPIRED' | 'PENDING';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function serializeDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

function ownerDisplayName(
  user: {
    firstname?: string | null;
    surname?: string | null;
    name?: string | null;
    email?: string | null;
  } | null,
): string | null {
  if (!user) return null;
  return (
    [user.firstname, user.surname].filter(Boolean).join(' ').trim() ||
    user.name ||
    user.email ||
    null
  );
}

function fullName(user: {
  firstname: string | null;
  surname: string | null;
  name?: string | null;
  email?: string | null;
}) {
  return ownerDisplayName(user) || 'Unassigned owner';
}

function deriveLicenseStatus(
  status: string | null | undefined,
  expiresAt: Date | null | undefined,
): LicenseStatus {
  const normalized = (status || '').toUpperCase();
  const now = new Date();

  if (expiresAt && expiresAt < now) return 'EXPIRED';
  if (EXPIRED_STATUSES.includes(normalized)) return 'EXPIRED';
  if (PAID_STATUSES.includes(normalized)) return 'PAID';
  if (TRIAL_STATUSES.includes(normalized)) return 'TRIALING';
  return 'PENDING';
}

function isPaidMasterStatus(status: string | null | undefined) {
  return [
    'ACTIVE',
    'PAID',
    'PAID_AND_ACTIVE',
    'PAID_STANDARD',
    'PAID_PREMIUM',
  ].includes((status ?? '').toUpperCase());
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAdminUser(actor: {
    adminId?: string;
    adminUsername?: string;
  }) {
    if (actor.adminId) {
      const byId = await this.prisma.adminUser.findUnique({
        where: { id: actor.adminId },
      });
      if (byId) return byId;
    }

    if (actor.adminUsername) {
      const byUsername = await this.prisma.adminUser.findUnique({
        where: { username: actor.adminUsername },
      });
      if (byUsername) return byUsername;
    }

    throw new BadRequestException(
      'Admin user not found in database. Seed admin_user matching HATCHLOG_ADMIN_ID / HATCHLOG_ADMIN_USERNAME.',
    );
  }

  async listFarms() {
    const farms = await this.prisma.farm.findMany({
      select: {
        id: true,
        name: true,
        location: true,
        createdAt: true,
        subscriptionTier: true,
        masterLicenseStatus: true,
        trialStartedAt: true,
        trialExpiresAt: true,
        trialExhaustedAt: true,
        userId: true,
        user: {
          select: {
            id: true,
            firstname: true,
            surname: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
        _count: {
          select: {
            deviceRegistrations: true,
            members: true,
            batches: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return farms.map((farm) => ({
      id: farm.id,
      name: farm.name,
      location: farm.location ?? null,
      ownerName: ownerDisplayName(farm.user),
      ownerEmail: farm.user?.email ?? null,
      ownerPhone: farm.user?.phoneNumber ?? null,
      userId: farm.user?.id ?? farm.userId,
      subscriptionTier: farm.subscriptionTier,
      masterLicenseStatus: farm.masterLicenseStatus ?? 'UNPAID',
      trialStartedAt: serializeDate(farm.trialStartedAt),
      trialExpiresAt: serializeDate(farm.trialExpiresAt),
      trialExhaustedAt: serializeDate(farm.trialExhaustedAt),
      deviceCount: farm._count.deviceRegistrations,
      memberCount: farm._count.members,
      batchCount: farm._count.batches,
      createdAt: farm.createdAt.toISOString(),
    }));
  }

  async getFarm(id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstname: true,
            surname: true,
            name: true,
            email: true,
          },
        },
        deviceRegistrations: {
          include: {
            user: {
              select: {
                firstname: true,
                surname: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { lastSync: 'desc' },
        },
        manualLicensePayments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: {
                id: true,
                firstname: true,
                surname: true,
                email: true,
              },
            },
          },
        },
        subscription: { include: { plan: true } },
        _count: {
          select: {
            deviceRegistrations: true,
            batches: true,
            houses: true,
          },
        },
      },
    });

    if (!farm) throw new NotFoundException('Farm not found');

    return {
      id: farm.id,
      name: farm.name,
      location: farm.location ?? null,
      ownerName: ownerDisplayName(farm.user),
      ownerEmail: farm.user?.email ?? null,
      subscriptionTier: farm.subscriptionTier,
      masterLicenseStatus: farm.masterLicenseStatus ?? 'UNPAID',
      trialStartedAt: serializeDate(farm.trialStartedAt),
      trialExpiresAt: serializeDate(farm.trialExpiresAt),
      trialExhaustedAt: serializeDate(farm.trialExhaustedAt),
      deviceCount: farm._count.deviceRegistrations,
      createdAt: farm.createdAt.toISOString(),
      devices: farm.deviceRegistrations.map((device) => ({
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        hardwareId: device.hardwareId,
        status: device.status,
        licenseExpiresAt: serializeDate(device.licenseExpiresAt),
        lastSync: serializeDate(device.lastSync),
        userName: ownerDisplayName(device.user),
        userEmail: device.user?.email ?? null,
      })),
      paymentHistory: farm.manualLicensePayments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        paidAt: payment.createdAt.toISOString(),
        durationDays: payment.durationDays,
        notes: payment.paymentModeNote,
      })),
      members: farm.members.map((m) => ({
        id: m.id,
        role: m.role,
        userId: m.user.id,
        name: [m.user.firstname, m.user.surname].filter(Boolean).join(' '),
        email: m.user.email,
      })),
      subscription: farm.subscription
        ? {
            status: farm.subscription.status,
            startDate: farm.subscription.startDate,
            endDate: farm.subscription.endDate,
            plan: farm.subscription.plan
              ? {
                  name: farm.subscription.plan.name,
                  tier: farm.subscription.plan.tier,
                  price: Number(farm.subscription.plan.price),
                }
              : null,
          }
        : null,
      counts: {
        batches: farm._count.batches,
        houses: farm._count.houses,
        devices: farm._count.deviceRegistrations,
      },
    };
  }

  async listLicenses() {
    const licenses = await this.prisma.issuedLicense.findMany({
      select: {
        id: true,
        farmId: true,
        hardwareId: true,
        desktopFarmId: true,
        durationDays: true,
        targetExpiryDate: true,
        activationToken: true,
        transactionReference: true,
        issuedAt: true,
        farm: { select: { name: true } },
        adminUser: { select: { username: true } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });

    return licenses.map((l) => ({
      id: l.id,
      farmId: l.farmId,
      farmName: l.farm.name,
      hardwareId: l.hardwareId,
      desktopFarmId: l.desktopFarmId,
      durationDays: l.durationDays,
      targetExpiryDate: l.targetExpiryDate,
      activationToken: l.activationToken,
      transactionReference: l.transactionReference,
      issuedAt: l.issuedAt,
      adminUsername: l.adminUser.username,
    }));
  }

  async getDeviceByHardwareId(hardwareId: string) {
    const normalized = normalizeHardwareFingerprint(hardwareId);
    if (!normalized) {
      throw new BadRequestException('hardwareId is required');
    }

    const registration = await this.prisma.deviceRegistration.findFirst({
      where: { hardwareId: normalized },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
          },
        },
      },
    });

    if (!registration) {
      throw new NotFoundException('No device found for this hardware ID');
    }

    return {
      farmId: registration.farmId,
      farmName: registration.farm.name,
      subscriptionTier: registration.farm.subscriptionTier,
      status: registration.status,
      licenseExpiresAt: registration.licenseExpiresAt?.toISOString() ?? null,
      lastSync: registration.lastSync?.toISOString() ?? null,
      hardwareId: registration.hardwareId,
      deviceName: registration.deviceName,
      deviceType: registration.deviceType,
    };
  }

  async getLicense(id: string) {
    const license = await this.prisma.issuedLicense.findUnique({
      where: { id },
      include: {
        farm: { select: { id: true, name: true } },
        adminUser: { select: { username: true } },
        accountUser: {
          select: {
            id: true,
            firstname: true,
            surname: true,
            email: true,
          },
        },
      },
    });

    if (!license) throw new NotFoundException('License not found');

    return {
      ...license,
      adminUsername: license.adminUser.username,
      accountUserName: license.accountUser
        ? [license.accountUser.firstname, license.accountUser.surname]
            .filter(Boolean)
            .join(' ')
        : null,
    };
  }

  async getPaymentDashboard() {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const [
      totalRegisteredFarms,
      activeFreeTrialsCurrentMonth,
      activePaidLicenses,
      expiredLicenses,
      totalRevenue,
      registrations,
    ] = await this.prisma.$transaction([
      this.prisma.farm.count(),
      this.prisma.deviceRegistration.count({
        where: {
          status: { in: TRIAL_STATUSES },
          registeredAt: { gte: monthStart },
          OR: [{ licenseExpiresAt: null }, { licenseExpiresAt: { gte: now } }],
        },
      }),
      this.prisma.deviceRegistration.count({
        where: {
          status: { in: PAID_STATUSES },
          licenseExpiresAt: { gte: now },
        },
      }),
      this.prisma.deviceRegistration.count({
        where: {
          OR: [
            { status: { in: EXPIRED_STATUSES } },
            { licenseExpiresAt: { lt: now } },
          ],
        },
      }),
      this.prisma.manualLicensePayment.aggregate({
        _sum: { amount: true },
        where: { currency: 'GHS' },
      }),
      this.prisma.deviceRegistration.findMany({
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              user: {
                select: {
                  firstname: true,
                  surname: true,
                  name: true,
                  phoneNumber: true,
                  email: true,
                },
              },
            },
          },
          manualLicensePayments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              amount: true,
              currency: true,
              paymentModeNote: true,
              createdAt: true,
              durationDays: true,
            },
          },
        },
        orderBy: [{ lastSync: 'desc' }, { registeredAt: 'desc' }],
      }),
    ]);

    return {
      metrics: {
        totalRegisteredFarms,
        activeFreeTrialsCurrentMonth,
        activePaidLicenses,
        expiredLicenses,
        totalManualRevenueGhs: Number(totalRevenue._sum.amount ?? 0),
      },
      rows: registrations.map((registration) => {
        const latestPayment = registration.manualLicensePayments[0];

        return {
          id: registration.id,
          farmId: registration.farmId,
          farmName: registration.farm.name,
          ownerName: fullName(registration.farm.user),
          ownerPhoneNumber: registration.farm.user.phoneNumber,
          ownerEmail: registration.farm.user.email,
          hardwareId: registration.hardwareId,
          deviceName: registration.deviceName,
          deviceType: registration.deviceType,
          licenseStatus: deriveLicenseStatus(
            registration.status,
            registration.licenseExpiresAt,
          ),
          rawStatus: registration.status,
          accessValidUntil: serializeDate(registration.licenseExpiresAt),
          lastSync: serializeDate(registration.lastSync),
          registeredAt: registration.registeredAt.toISOString(),
          lastActivationToken: registration.lastActivationToken,
          lastPayment: latestPayment
            ? {
                amount: Number(latestPayment.amount),
                currency: latestPayment.currency,
                paymentModeNote: latestPayment.paymentModeNote,
                createdAt: latestPayment.createdAt.toISOString(),
                durationDays: latestPayment.durationDays,
              }
            : null,
        };
      }),
    };
  }

  async listActivity(limit = 100) {
    const take = Math.min(Math.max(limit, 1), 200);

    const events = await this.prisma.subscriptionEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        farmId: true,
        eventType: true,
        metadata: true,
        createdAt: true,
        farm: { select: { name: true } },
      },
    });

    return events.map((event) => {
      const metadata =
        event.metadata &&
        typeof event.metadata === 'object' &&
        !Array.isArray(event.metadata)
          ? (event.metadata as Record<string, unknown>)
          : null;

      const adminUsername =
        metadata && typeof metadata.adminUsername === 'string'
          ? metadata.adminUsername
          : null;

      return {
        id: event.id,
        farmId: event.farmId,
        farmName: event.farm?.name ?? null,
        eventType: event.eventType,
        adminUsername,
        metadata,
        createdAt: event.createdAt.toISOString(),
      };
    });
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  async issueLicense(dto: IssueLicenseDto) {
    const admin = await this.resolveAdminUser(dto);
    const duration = DURATION_PACK[dto.durationPack];
    const targetExpiryDate = addDays(new Date(), duration.days);

    const farm = await this.prisma.farm.findFirst({
      where: { userId: dto.accountUserId },
      select: { id: true },
    });

    if (!farm) {
      throw new BadRequestException(
        'No farm found for the selected cloud account',
      );
    }

    const normalizedHardware = normalizeHardwareFingerprint(dto.hardwareId);
    const normalizedDesktopFarmId = normalizeDesktopFarmId(dto.desktopFarmId);

    const activationToken = generateIssuedLicenseToken({
      hardwareId: normalizedHardware,
      desktopFarmId: normalizedDesktopFarmId,
      targetExpiryDate,
      durationDays: duration.days,
    });

    const log = await this.prisma.issuedLicense.create({
      data: {
        farmId: farm.id,
        adminUserId: admin.id,
        accountUserId: dto.accountUserId,
        hardwareId: normalizedHardware,
        desktopFarmId: normalizedDesktopFarmId,
        durationDays: duration.days,
        targetExpiryDate,
        activationToken,
        transactionReference: dto.transactionReference,
      },
    });

    return {
      activationToken,
      targetExpiryDate: targetExpiryDate.toISOString(),
      durationLabel: duration.label,
      issuedLogId: log.id,
    };
  }

  async renewLicense(dto: RenewLicenseDto) {
    const admin = await this.resolveAdminUser(dto);
    const months = dto.durationMonths ?? 3;
    if (months !== 3 && months !== 12) {
      throw new BadRequestException('durationMonths must be 3 or 12');
    }

    const normalizedHardware = normalizeHardwareFingerprint(dto.hardwareId);
    const now = new Date();
    const targetExpiryDate = addMonths(now, months);

    const result = await this.prisma.$transaction(async (tx) => {
      const registration = await tx.deviceRegistration.findFirst({
        where: { hardwareId: normalizedHardware },
        select: {
          id: true,
          status: true,
          licenseExpiresAt: true,
        },
      });

      if (!registration) {
        throw new BadRequestException(
          'No registration found for this hardware ID',
        );
      }

      const updatedRegistration = await tx.deviceRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'ACTIVE',
          licenseExpiresAt: targetExpiryDate,
          isActive: true,
          activatedByAdminId: admin.id,
          lastPaymentAt: now,
        },
        select: {
          status: true,
          licenseExpiresAt: true,
        },
      });

      const history = await tx.adminLicenseRenewalLog.create({
        data: {
          adminUserId: admin.id,
          deviceRegistrationId: registration.id,
          hardwareId: normalizedHardware,
          durationMonths: months,
          previousLicenseStatus: registration.status,
          newLicenseStatus: 'ACTIVE',
          previousExpiresAt: registration.licenseExpiresAt,
          newExpiresAt: targetExpiryDate,
        },
        select: { id: true },
      });

      return {
        status: updatedRegistration.status,
        expiresAt: updatedRegistration.licenseExpiresAt,
        historyId: history.id,
      };
    });

    return {
      licenseStatus: result.status,
      licenseExpiresAt:
        result.expiresAt?.toISOString() ?? targetExpiryDate.toISOString(),
      historyId: result.historyId,
    };
  }

  async confirmPayment(dto: ConfirmPaymentDto) {
    const admin = await this.resolveAdminUser(dto);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.deviceRegistration.findUnique({
        where: { id: dto.deviceRegistrationId },
        include: {
          farm: {
            select: {
              id: true,
              name: true,
              masterLicenseStatus: true,
            },
          },
        },
      });

      if (!registration) {
        throw new BadRequestException('Device registration not found');
      }

      if (!registration.hardwareId) {
        throw new BadRequestException(
          'This device has no hardware fingerprint yet',
        );
      }

      const hardwareId = normalizeHardwareFingerprint(registration.hardwareId);
      const baseDate =
        registration.licenseExpiresAt && registration.licenseExpiresAt > now
          ? registration.licenseExpiresAt
          : now;
      const targetExpiryDate = addDays(baseDate, dto.durationDays);
      const activationToken = generateActivationLicenseToken({
        hardwareId,
        targetExpiryDate,
        durationDays: dto.durationDays,
      });

      const payment = await tx.manualLicensePayment.create({
        data: {
          farmId: registration.farmId,
          deviceRegistrationId: registration.id,
          adminUserId: admin.id,
          hardwareId,
          amount: dto.amount,
          currency: 'GHS',
          durationDays: dto.durationDays,
          targetExpiryDate,
          paymentModeNote: dto.paymentModeNote,
          activationToken,
        },
      });

      await tx.deviceRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'ACTIVE',
          licenseExpiresAt: targetExpiryDate,
          lastActivationToken: activationToken,
          lastPaymentAt: now,
          activatedByAdminId: admin.id,
          isActive: true,
        },
      });

      if (registration.farm.masterLicenseStatus !== 'PAID_AND_ACTIVE') {
        await tx.farm.update({
          where: { id: registration.farmId },
          data: { masterLicenseStatus: 'PAID_AND_ACTIVE' },
        });
      }

      return {
        activationToken,
        expiresAt: targetExpiryDate.toISOString(),
        paymentId: payment.id,
      };
    });
  }

  async bindDevice(dto: BindDeviceDto) {
    const admin = await this.resolveAdminUser(dto);
    const normalizedHardwareId = normalizeHardwareFingerprint(dto.hardwareId);
    const now = new Date();
    const durationDays = 365;
    const targetExpiryDate = addDays(now, durationDays);

    return this.prisma.$transaction(async (tx) => {
      let farm = await tx.farm.findFirst({
        where: { userId: dto.userId },
      });

      if (!farm) {
        farm = await tx.farm.create({
          data: {
            name: 'My Poultry Farm',
            capacity: 1000,
            userId: dto.userId,
          },
        });
      }

      const token = generateActivationLicenseToken({
        hardwareId: normalizedHardwareId,
        targetExpiryDate,
        durationDays,
      });

      const existingReg = await tx.deviceRegistration.findFirst({
        where: {
          farmId: farm.id,
          OR: [
            { hardwareId: normalizedHardwareId },
            { deviceId: normalizedHardwareId },
          ],
        },
      });

      let deviceRegistrationId: string;

      if (existingReg) {
        await tx.deviceRegistration.update({
          where: { id: existingReg.id },
          data: {
            userId: dto.userId,
            status: 'ACTIVE',
            licenseExpiresAt: targetExpiryDate,
            lastActivationToken: token,
            lastPaymentAt: now,
            activatedByAdminId: admin.id,
            isActive: true,
          },
        });
        deviceRegistrationId = existingReg.id;
      } else {
        const created = await tx.deviceRegistration.create({
          data: {
            farmId: farm.id,
            userId: dto.userId,
            deviceId: normalizedHardwareId,
            hardwareId: normalizedHardwareId,
            deviceName: 'Manual Desktop Bind',
            status: 'ACTIVE',
            licenseExpiresAt: targetExpiryDate,
            lastActivationToken: token,
            lastPaymentAt: now,
            activatedByAdminId: admin.id,
            isActive: true,
            licenseKey: `PMS-BIND-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          },
        });
        deviceRegistrationId = created.id;
      }

      if (farm.masterLicenseStatus !== 'PAID_AND_ACTIVE') {
        await tx.farm.update({
          where: { id: farm.id },
          data: { masterLicenseStatus: 'PAID_AND_ACTIVE' },
        });
      }

      await tx.manualLicensePayment.create({
        data: {
          farmId: farm.id,
          deviceRegistrationId,
          adminUserId: admin.id,
          hardwareId: normalizedHardwareId,
          amount: 0.0,
          currency: 'GHS',
          durationDays,
          targetExpiryDate,
          paymentModeNote:
            'Admin manually bound desktop hardware ID to Web Account.',
          activationToken: token,
        },
      });

      return {
        token,
        expiresAt: targetExpiryDate.toISOString(),
      };
    });
  }

  async upgradeTier(farmId: string, dto: UpgradeTierDto) {
    const admin = await this.resolveAdminUser(dto);
    const periodEnd = addDays(new Date(), dto.durationDays);

    await this.prisma.$transaction(async (tx) => {
      const before = await tx.farm.findUnique({
        where: { id: farmId },
        select: {
          userId: true,
          subscriptionTier: true,
          masterLicenseStatus: true,
          trialExpiresAt: true,
        },
      });

      if (!before) throw new NotFoundException('Farm not found');

      await tx.farm.update({
        where: { id: farmId },
        data: {
          subscriptionTier: dto.tier,
          masterLicenseStatus: `PAID_${dto.tier}`,
          trialExpiresAt: periodEnd,
          trialExhaustedAt: null,
        },
      });

      await tx.deviceRegistration.updateMany({
        where: { farmId },
        data: {
          status: 'ACTIVE',
          licenseExpiresAt: periodEnd,
          lastPaymentAt: new Date(),
          isActive: true,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          farmId,
          userId: before.userId,
          eventType: 'TIER_UPGRADED',
          metadata: {
            adminId: admin.id,
            adminUsername: admin.username,
            tier: dto.tier,
            durationDays: dto.durationDays,
            newExpiresAt: periodEnd.toISOString(),
            previousTier: before.subscriptionTier,
            previousStatus: before.masterLicenseStatus,
            previousExpiresAt: before.trialExpiresAt?.toISOString() ?? null,
          },
        },
      });
    });

    return { success: true };
  }

  async extendTrial(farmId: string, dto: ExtendTrialDto) {
    const admin = await this.resolveAdminUser(dto);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const farm = await tx.farm.findUnique({
        where: { id: farmId },
        select: {
          id: true,
          userId: true,
          subscriptionTier: true,
          masterLicenseStatus: true,
          trialStartedAt: true,
          trialExpiresAt: true,
        },
      });

      if (!farm) throw new NotFoundException('Farm not found');

      if (
        farm.subscriptionTier !== 'BASIC' ||
        isPaidMasterStatus(farm.masterLicenseStatus)
      ) {
        throw new BadRequestException(
          'Paid farms cannot receive a trial extension',
        );
      }

      const baseDate =
        farm.trialExpiresAt && farm.trialExpiresAt > now
          ? farm.trialExpiresAt
          : now;
      const trialExpiresAt = addDays(baseDate, dto.extraDays);

      await tx.farm.update({
        where: { id: farmId },
        data: {
          masterLicenseStatus: 'CLOUD_TRIAL',
          trialStartedAt: farm.trialStartedAt ?? now,
          trialExpiresAt,
          trialExhaustedAt: null,
        },
      });

      await tx.deviceRegistration.updateMany({
        where: { farmId },
        data: {
          status: 'CLOUD_TRIAL',
          licenseExpiresAt: trialExpiresAt,
          isActive: true,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          farmId,
          userId: farm.userId,
          eventType: 'TRIAL_EXTENDED',
          metadata: {
            adminId: admin.id,
            adminUsername: admin.username,
            extraDays: dto.extraDays,
            newExpiresAt: trialExpiresAt.toISOString(),
            previousExpiresAt: farm.trialExpiresAt?.toISOString() ?? null,
          },
        },
      });
    });

    return { success: true };
  }

  async revokeFarm(farmId: string, dto: RevokeFarmDto) {
    const admin = await this.resolveAdminUser(dto);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const farm = await tx.farm.update({
        where: { id: farmId },
        data: {
          masterLicenseStatus: 'REVOKED',
          trialExhaustedAt: now,
        },
        select: { userId: true },
      });

      const deviceResult = await tx.deviceRegistration.updateMany({
        where: { farmId },
        data: {
          status: 'EXPIRED',
          licenseExpiresAt: now,
          isActive: false,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          farmId,
          userId: farm.userId,
          eventType: 'ACCESS_REVOKED',
          metadata: {
            adminId: admin.id,
            adminUsername: admin.username,
            revokedAt: now.toISOString(),
            deviceCount: deviceResult.count,
          },
        },
      });
    });

    return { success: true };
  }
}
