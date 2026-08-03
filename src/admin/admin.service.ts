import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listFarms() {
    const farms = await this.prisma.farm.findMany({
      include: {
        _count: {
          select: {
            members: true,
            batches: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return farms.map((f) => ({
      id: f.id,
      name: f.name,
      location: f.location,
      subscriptionTier: f.subscriptionTier,
      createdAt: f.createdAt,
      memberCount: f._count.members,
      batchCount: f._count.batches,
    }));
  }

  async getFarm(id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
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
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: {
            batches: true,
            houses: true,
            deviceRegistrations: true,
          },
        },
      },
    });

    if (!farm) throw new NotFoundException('Farm not found');

    return {
      id: farm.id,
      name: farm.name,
      location: farm.location,
      subscriptionTier: farm.subscriptionTier,
      createdAt: farm.createdAt,
      members: farm.members.map((m: any) => ({
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
}
