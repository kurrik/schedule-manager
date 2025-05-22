import type { KVNamespace } from '@cloudflare/workers-types';
import { User } from '../../domain/models/user';
import type { UserProps } from '../../domain/models/user';
import type { IUserRepository } from '../../domain/repositories';

export class KVUserRepository implements IUserRepository {
  private readonly kv: KVNamespace;
  private readonly namespace: string;

  constructor(kv: KVNamespace, namespace = 'users') {
    this.kv = kv;
    this.namespace = namespace;
  }

  async findById(id: string): Promise<User | null> {
    const data = await this.kv.get<UserProps>(this.getKey(id), 'json');
    return data ? new User(data) : null;
  }

  async save(user: User): Promise<void> {
    await this.kv.put(this.getKey(user.id), JSON.stringify(user.toJSON()));
  }

  private getKey(id: string): string {
    return `${this.namespace}:${id}`;
  }
}
