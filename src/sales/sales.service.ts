import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  CreateSaleDto,
  FarmScopedQueryDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 50, 1), 200);

    const sales = await this.prisma.sale.findMany({
      where: { farmId: query.farm_id, isDeleted: false },
      include: {
        items: true,
        user: { select: { firstname: true, surname: true, role: true } },
      },
      orderBy: { saleDate: 'desc' },
      take,
    });

    return sales.map((sale) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      items: sale.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }));
  }

  async create(user: AuthUser, dto: CreateSaleDto) {
    assertFarmAccess(user, dto.farm_id);

    if (!dto.items?.length) {
      throw new BadRequestException('At least one sale item is required');
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          customerName: dto.customerName,
          totalAmount: dto.totalAmount,
          userId: user.id,
          farmId: dto.farm_id,
          items: {
            create: dto.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              farmId: dto.farm_id,
            })),
          },
        },
        include: { items: true },
      });

      const eggItems = dto.items.filter((i) => /egg/i.test(i.description));
      if (eggItems.length > 0) {
        const totalEggsSold = eggItems.reduce((s, i) => s + i.quantity, 0);
        const eggInventory = await tx.inventory.findFirst({
          where: {
            farmId: dto.farm_id,
            category: 'EGGS',
            itemName: 'Eggs',
            isDeleted: false,
          },
        });
        if (eggInventory) {
          const newLevel = Math.max(
            0,
            Number(eggInventory.stockLevel) - totalEggsSold,
          );
          await tx.inventory.update({
            where: { id: eggInventory.id },
            data: { stockLevel: newLevel },
          });
        }
      }

      return created;
    });

    return {
      ...sale,
      totalAmount: Number(sale.totalAmount),
      items: sale.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };
  }

  async remove(user: AuthUser, id: string, farmId: string, reason?: string) {
    assertFarmAccess(user, farmId);

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException(
        'A valid reason (min 5 chars) is required for deletion',
      );
    }

    const existing = await this.prisma.sale.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Sale not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.deleteLog.create({
        data: {
          userId: user.id,
          farmId,
          tableName: 'sales',
          deletedDataCsv: JSON.stringify(existing),
          reason: reason.trim(),
        },
      });

      await tx.sale.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    });

    return { success: true };
  }

  async restore(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const existing = await this.prisma.sale.findFirst({
      where: { id, farmId, isDeleted: true },
    });
    if (!existing) throw new NotFoundException('Deleted sale not found');

    await this.prisma.sale.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    return { success: true };
  }
}
