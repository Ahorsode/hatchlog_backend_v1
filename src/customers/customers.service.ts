import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { assertFarmAccess } from '../common/farm-access';
import type {
  CreateCustomerDto,
  FarmScopedQueryDto,
  UpdateCustomerDto,
} from '../common/dto/domain.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: FarmScopedQueryDto) {
    assertFarmAccess(user, query.farm_id);
    const take = Math.min(Math.max(query.limit ?? 200, 1), 500);

    const customers = await this.prisma.customer.findMany({
      where: { farmId: query.farm_id },
      orderBy: { name: 'asc' },
      take,
    });

    return customers.map((c) => ({
      ...c,
      balanceOwed: Number(c.balanceOwed),
    }));
  }

  async getById(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const customer = await this.prisma.customer.findFirst({
      where: { id, farmId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return { ...customer, balanceOwed: Number(customer.balanceOwed) };
  }

  async getStats(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const customer = await this.prisma.customer.findFirst({
      where: { id, farmId },
      include: { orders: { where: { isDeleted: false } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      createdAt: customer.createdAt,
      balanceOwed: Number(customer.balanceOwed),
      orderCount: customer.orders.length,
      totalSpent: customer.orders.reduce(
        (sum, o) => sum + Number(o.totalAmount),
        0,
      ),
    };
  }

  async create(user: AuthUser, dto: CreateCustomerDto) {
    assertFarmAccess(user, dto.farm_id);

    const customer = await this.prisma.customer.create({
      data: {
        farmId: dto.farm_id,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        balanceOwed: dto.balanceOwed ?? 0,
      },
    });

    return { ...customer, balanceOwed: Number(customer.balanceOwed) };
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    assertFarmAccess(user, existing.farmId);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
      },
    });

    return { ...updated, balanceOwed: Number(updated.balanceOwed) };
  }

  async remove(user: AuthUser, id: string, farmId: string) {
    assertFarmAccess(user, farmId);

    const existing = await this.prisma.customer.findFirst({
      where: { id, farmId },
    });
    if (!existing) throw new NotFoundException('Customer not found');

    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }
}
