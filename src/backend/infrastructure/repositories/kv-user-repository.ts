import type { KVNamespace } from '@cloudflare/workers-types';
import { User } from '../../domain/models/user';
import type { UserProps } from '../../domain/models/user';
import type { IUserRepository } from '../../domain/repositories';


/**
 * Repository for managing users in Cloudflare KV.
 */
export class KVUserRepository implements IUserRepository {
  private readonly kv: KVNamespace;
  private readonly namespace: string;
  private readonly emailNamespace: string;

  constructor(kv: KVNamespace, namespace = 'users', emailNamespace = 'user-emails') {
    this.kv = kv;
    this.namespace = namespace;
    this.emailNamespace = emailNamespace;
  }

  /**
   * Finds a user by their unique ID.
   */
  async findById(id: string): Promise<User | null> {
    const data = await this.kv.get<UserProps>(this.getKey(id), 'json');
    return data ? new User(data) : null;
  }

  /**
   * Finds a user by their email address.
   * @param email - The user's email address.
   * @returns The user if found, otherwise null.
   */
  async findByEmail(email: string): Promise<User | null> {
    const id = await this.kv.get(this.getEmailKey(email), 'text');
    if (!id) return null;
    return this.findById(id);
  }

  /**
   * Upserts a user by email. If the user exists, updates displayName and profileImageUrl.
   * Otherwise, creates a new user.
   * @param props - Partial user properties (must include email, displayName, profileImageUrl).
   * @returns The upserted User.
   */
  async upsertByEmail(props: { email: string; displayName: string; profileImageUrl: string }): Promise<User> {
    let user = await this.findByEmail(props.email);
    if (user) {
      // Update displayName and profileImageUrl if changed
      user = new User({
        ...user.toJSON(),
        displayName: props.displayName,
        profileImageUrl: props.profileImageUrl,
        email: props.email,
      });
      await this.save(user);
    } else {
      const id = crypto.randomUUID();
      user = new User({
        id,
        displayName: props.displayName,
        profileImageUrl: props.profileImageUrl,
        email: props.email,
      });
      await this.save(user);
      await this.kv.put(this.getEmailKey(props.email), id);
    }
    return user;
  }

  /**
   * Saves a user to the KV store.
   * @param user - The user to save.
   */
  async save(user: User): Promise<void> {
    await this.kv.put(this.getKey(user.id), JSON.stringify(user.toJSON()));
    await this.kv.put(this.getEmailKey(user.email), user.id);
  }

  /**
   * Gets the KV key for a user by ID.
   */
  private getKey(id: string): string {
    return `${this.namespace}:${id}`;
  }

  /**
   * Gets the KV key for a user by email.
   */
  private getEmailKey(email: string): string {
    return `${this.emailNamespace}:${email}`;
  }
}
