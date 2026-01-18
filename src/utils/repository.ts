import { prisma } from '../infra/prisma.js';
import { AuditPlugin } from '../plugins/audit.plugin.js';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export class Repository<T extends BaseEntity> {
  constructor(private model: any, private entityName: string) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const result = await this.model.create({ data });

    await AuditPlugin.log({
      entity: this.entityName,
      entityId: result.id,
      action: 'create',
      after: result,
    });

    return result;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {
    const before = await this.model.findUnique({ where: { id } });
    if (!before) {
      throw new Error(`${this.entityName} not found`);
    }

    const result = await this.model.update({
      where: { id },
      data,
    });

    await AuditPlugin.log({
      entity: this.entityName,
      entityId: id,
      action: 'update',
      before,
      after: result,
    });

    return result;
  }

  async delete(id: string): Promise<void> {
    const before = await this.model.findUnique({ where: { id } });
    if (!before) {
      throw new Error(`${this.entityName} not found`);
    }

    await this.model.delete({ where: { id } });

    await AuditPlugin.log({
      entity: this.entityName,
      entityId: id,
      action: 'delete',
      before,
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } });
  }

  async findMany(options?: {
    where?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }): Promise<T[]> {
    return this.model.findMany(options);
  }
}