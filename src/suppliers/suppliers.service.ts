import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  CreateSupplierDto,
  FarmScopedQueryDto,
  UpdateSupplierBalanceDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);

    const suppliers = await this.prisma.supplier.findMany({
      where: { farmId: query.farm_id },
      orderBy: { name: 'asc' },
      take,
    });

    return suppliers.map((s) => ({
      ...s,
      balanceOwed: Number(s.balanceOwed),
    }));
  }

  async getStats(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, farmId },
      include: { inventory: true },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const orderCount = supplier.inventory.length;
    const totalSpent = supplier.inventory.reduce(
      (sum, item) =>
        sum + Number(item.stockLevel) * Number(item.costPerUnit || 0),
      0,
    );

    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      createdAt: supplier.createdAt,
      balanceOwed: Number(supplier.balanceOwed),
      orderCount,
      totalSpent,
    };
  }

  async create(user: AuthUser, dto: CreateSupplierDto) {
    assertFarmAccess(user, dto.farm_id);

    const supplier = await this.prisma.supplier.create({
      data: {
        farmId: dto.farm_id,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        balanceOwed: dto.balanceOwed ?? 0,
      },
    });

    return { ...supplier, balanceOwed: Number(supplier.balanceOwed) };
  }

  async updateBalance(
    user: AuthUser,
    id: string,
    dto: UpdateSupplierBalanceDto,
  ) {
    assertFarmAccess(user, dto.farm_id);

    const existing = await this.prisma.supplier.findFirst({
      where: { id, farmId: dto.farm_id },
    });
    if (!existing) throw new NotFoundException('Supplier not found');

    await this.prisma.supplier.update({
      where: { id },
      data: { balanceOwed: { increment: dto.amount } },
    });

    return { success: true };
  }
}
