import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService.getDeviceByHardwareId', () => {
  it('returns farm and license fields for a normalized hardware id', async () => {
    const prisma = {
      deviceRegistration: {
        findFirst: jest.fn().mockResolvedValue({
          farmId: 'farm_1',
          status: 'ACTIVE',
          licenseExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
          lastSync: new Date('2026-08-01T12:00:00.000Z'),
          hardwareId: 'ABC123',
          deviceName: 'Office PC',
          deviceType: 'DESKTOP',
          farm: {
            id: 'farm_1',
            name: 'Green Farm',
            subscriptionTier: 'PRO',
          },
        }),
      },
    };
    const service = new AdminService(prisma as any);

    const result = await service.getDeviceByHardwareId(' abc 123 ');

    expect(prisma.deviceRegistration.findFirst).toHaveBeenCalledWith({
      where: { hardwareId: 'ABC123' },
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
    expect(result).toEqual({
      farmId: 'farm_1',
      farmName: 'Green Farm',
      subscriptionTier: 'PRO',
      status: 'ACTIVE',
      licenseExpiresAt: '2026-12-01T00:00:00.000Z',
      lastSync: '2026-08-01T12:00:00.000Z',
      hardwareId: 'ABC123',
      deviceName: 'Office PC',
      deviceType: 'DESKTOP',
    });
  });

  it('throws when no registration exists', async () => {
    const service = new AdminService({
      deviceRegistration: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any);

    await expect(
      service.getDeviceByHardwareId('MISSING'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
