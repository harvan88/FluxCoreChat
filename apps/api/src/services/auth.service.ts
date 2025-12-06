import { hash, compare } from 'bcrypt';
import { db } from '@fluxcore/db';
import { users, accounts, actors, type NewUser, type NewAccount } from '@fluxcore/db';
import { eq } from 'drizzle-orm';

const SALT_ROUNDS = 10;

export class AuthService {
  async register(data: { email: string; password: string; name: string }) {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hash(data.password, SALT_ROUNDS);

    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        name: data.name,
      })
      .returning();

    return user;
  }

  async login(email: string, password: string) {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await compare(password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Get user accounts
    const userAccounts = await db
      .select({
        id: accounts.id,
        username: accounts.username,
        displayName: accounts.displayName,
        accountType: accounts.accountType,
      })
      .from(accounts)
      .where(eq(accounts.ownerUserId, user.id));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accounts: userAccounts,
    };
  }

  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

export const authService = new AuthService();
