import type { D1Database } from '@cloudflare/workers-types';
import { User } from '../../domain/models/user';
import type { IUserRepository } from '../../domain/repositories';

export class D1UserRepository implements IUserRepository {
  private readonly db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first();

    return result ? this.mapToUser(result) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    return result ? this.mapToUser(result) : null;
  }

  async upsertByEmail(props: { 
    email: string; 
    displayName: string; 
    profileImageUrl: string; 
  }): Promise<User> {
    // Try to find existing user
    const existing = await this.findByEmail(props.email);
    
    if (existing) {
      // Update existing user
      await this.db.prepare(`
        UPDATE users 
        SET display_name = ?, profile_image_url = ?
        WHERE email = ?
      `).bind(
        props.displayName,
        props.profileImageUrl,
        props.email
      ).run();

      return new User({
        id: existing.id,
        email: props.email,
        displayName: props.displayName,
        profileImageUrl: props.profileImageUrl,
      });
    } else {
      // Create new user
      const id = crypto.randomUUID();
      
      await this.db.prepare(`
        INSERT INTO users (id, email, display_name, profile_image_url)
        VALUES (?, ?, ?, ?)
      `).bind(
        id,
        props.email,
        props.displayName,
        props.profileImageUrl
      ).run();

      return new User({
        id,
        email: props.email,
        displayName: props.displayName,
        profileImageUrl: props.profileImageUrl,
      });
    }
  }

  async save(user: User): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO users (id, email, display_name, profile_image_url)
      VALUES (?, ?, ?, ?)
    `).bind(
      user.id,
      user.email,
      user.displayName,
      user.profileImageUrl
    ).run();
  }

  private mapToUser(row: any): User {
    return new User({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      profileImageUrl: row.profile_image_url,
    });
  }
}