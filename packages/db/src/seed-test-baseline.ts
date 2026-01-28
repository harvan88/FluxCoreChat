#!/usr/bin/env bun
/**
 * Seed: Entorno de pruebas baseline
 *
 * - Crea usuarios/cuentas de prueba (incluye owner protegido y admin con scope ACCOUNT_DELETE_FORCE)
 * - Asegura recursos Fluxcore (assistant + vector store + file) para validar AD-130
 *
 * Uso:
 *   cd packages/db
 *   bun run seed:test-baseline
 */

import { db } from './connection';
import {
  users,
  accounts,
  systemAdmins,
  fluxcoreAssistants,
  fluxcoreVectorStores,
  fluxcoreVectorStoreFiles,
  fluxcoreAssistantVectorStores,
} from './schema';
import { eq, and } from 'drizzle-orm';
import { hash } from 'bcrypt';
import { randomUUID } from 'node:crypto';

const PROTECTED_OWNER_ID = '535949b8-58a9-4310-87a7-42a2480f5746';
const DEFAULT_PASSWORD = process.env.TEST_BASELINE_PASSWORD ?? '123456';
const PASSWORD_SALT_ROUNDS = 10;

interface SeedUser {
  id?: string;
  email: string;
  name: string;
  alias: string;
  accountType: 'personal' | 'business';
  grantForceScope?: boolean;
}

const BASELINE_USERS: SeedUser[] = [
  {
    id: PROTECTED_OWNER_ID,
    email: 'protected-owner@test.com',
    name: 'Protected Owner',
    alias: 'protected-owner',
    accountType: 'business',
  },
  {
    email: 'admin-force@test.com',
    name: 'Admin Force',
    alias: 'admin-force',
    accountType: 'business',
    grantForceScope: true,
  },
];

async function ensureUser(seed: SeedUser) {
  let existingUser = null as (typeof users.$inferSelect) | null;

  if (seed.id) {
    existingUser = (
      await db.select().from(users).where(eq(users.id, seed.id)).limit(1)
    )[0] as typeof existingUser;
    if (existingUser && existingUser.email !== seed.email) {
      console.log(
        `⚠️  Usuario con id=${seed.id} ya existe con email ${existingUser.email}. Se mantendrá ese registro.`
      );
    }
  }

  if (!existingUser) {
    existingUser = (
      await db.select().from(users).where(eq(users.email, seed.email)).limit(1)
    )[0] as typeof existingUser;
  }

  if (!existingUser) {
    const passwordHash = await hash(DEFAULT_PASSWORD, PASSWORD_SALT_ROUNDS);
    const [createdUser] = await db
      .insert(users)
      .values({
        id: seed.id ?? randomUUID(),
        email: seed.email,
        name: seed.name,
        passwordHash,
      })
      .returning();
    existingUser = createdUser;
    console.log(`✅ Usuario creado: ${seed.email}`);
  } else {
    console.log(`⏭️  Usuario ya existe: ${seed.email}`);
  }

  let existingAccount = (
    await db.select().from(accounts).where(eq(accounts.ownerUserId, existingUser.id)).limit(1)
  )[0];

  if (!existingAccount) {
    const { username, alias } = await ensureUniqueAccountIdentifiers(seed.alias);
    const [account] = await db
      .insert(accounts)
      .values({
        ownerUserId: existingUser.id,
        username,
        displayName: seed.name,
        accountType: seed.accountType,
        alias,
        profile: {},
        privateContext: '',
      })
      .returning();
    existingAccount = account;
    console.log(`✅ Cuenta creada: @${account.alias}`);
  } else {
    console.log(`⏭️  Cuenta existente para ${seed.email}: @${existingAccount.alias ?? existingAccount.username}`);
  }

  return { user: existingUser, account: existingAccount };
}

async function ensureUniqueAccountIdentifiers(base: string) {
  let username = base;
  let alias = base;
  let suffix = 0;

  const exists = async (value: string) => {
    const [record] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.username, value))
      .limit(1);
    return Boolean(record);
  };

  while (await exists(username)) {
    suffix += 1;
    username = `${base}-${suffix}`;
    alias = username;
  }

  return { username, alias };
}

async function ensureSystemAdmin(userId: string) {
  if (!userId) return;
  await db
    .insert(systemAdmins)
    .values({
      userId,
      scopes: { credits: true, policies: true, ACCOUNT_DELETE_FORCE: true },
      createdBy: null,
    })
    .onConflictDoUpdate({
      target: systemAdmins.userId,
      set: { scopes: { credits: true, policies: true, ACCOUNT_DELETE_FORCE: true } },
    });

  console.log(`🔐 Scope ACCOUNT_DELETE_FORCE garantizado para userId=${userId}`);
}

async function ensureFluxcoreResources(accountId: string) {
  const assistant = await ensureAssistant(accountId);
  const vectorStore = await ensureVectorStore(accountId);
  await ensureVectorStoreFile(vectorStore.id);
  await ensureAssistantLink(assistant.id, vectorStore.id);
}

async function ensureAssistant(accountId: string) {
  const [existing] = await db
    .select()
    .from(fluxcoreAssistants)
    .where(and(eq(fluxcoreAssistants.accountId, accountId), eq(fluxcoreAssistants.name, 'Seed OpenAI Assistant')))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [assistant] = await db
    .insert(fluxcoreAssistants)
    .values({
      accountId,
      name: 'Seed OpenAI Assistant',
      description: 'Asistente baseline para pruebas externas',
      status: 'production',
      runtime: 'openai',
      externalId: `asst_seed_${accountId.slice(0, 8)}`,
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        topP: 1,
        responseFormat: 'text',
      },
      timingConfig: {
        responseDelaySeconds: 2,
        smartDelay: true,
      },
    })
    .returning();

  console.log(`🤖 Asistente seed creado (${assistant.externalId})`);
  return assistant;
}

async function ensureVectorStore(accountId: string) {
  const [existing] = await db
    .select()
    .from(fluxcoreVectorStores)
    .where(and(eq(fluxcoreVectorStores.accountId, accountId), eq(fluxcoreVectorStores.name, 'Seed Vector Store')))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [store] = await db
    .insert(fluxcoreVectorStores)
    .values({
      accountId,
      name: 'Seed Vector Store',
      description: 'Vector store baseline para pruebas externas',
      backend: 'openai',
      status: 'production',
      visibility: 'private',
      source: 'primary',
      externalId: `vs_seed_${accountId.slice(0, 8)}`,
    })
    .returning();

  console.log(`📚 Vector store seed creado (${store.externalId})`);
  return store;
}

async function ensureVectorStoreFile(vectorStoreId: string) {
  const [existing] = await db
    .select()
    .from(fluxcoreVectorStoreFiles)
    .where(and(eq(fluxcoreVectorStoreFiles.vectorStoreId, vectorStoreId), eq(fluxcoreVectorStoreFiles.name, 'Seed File')))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [file] = await db
    .insert(fluxcoreVectorStoreFiles)
    .values({
      vectorStoreId,
      name: 'Seed File',
      status: 'completed',
      externalId: `file_seed_${vectorStoreId.slice(0, 8)}`,
      mimeType: 'text/plain',
      sizeBytes: 1024,
    })
    .returning();

  console.log(`📄 Archivo seed registrado (${file.externalId})`);
  return file;
}

async function ensureAssistantLink(assistantId: string, vectorStoreId: string) {
  const [existing] = await db
    .select()
    .from(fluxcoreAssistantVectorStores)
    .where(
      and(
        eq(fluxcoreAssistantVectorStores.assistantId, assistantId),
        eq(fluxcoreAssistantVectorStores.vectorStoreId, vectorStoreId)
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [link] = await db
    .insert(fluxcoreAssistantVectorStores)
    .values({
      assistantId,
      vectorStoreId,
      accessMode: 'read',
      isEnabled: true,
    })
    .returning();

  console.log(`🔗 Asistente vinculado al vector store (link=${link.id})`);
  return link;
}

async function main() {
  console.log('🌱 Iniciando seed:test-baseline...');

  const results = [] as Array<{ userId: string; accountId: string; grantForceScope?: boolean }>;

  for (const seed of BASELINE_USERS) {
    const { user, account } = await ensureUser(seed);
    results.push({ userId: user.id, accountId: account.id, grantForceScope: seed.grantForceScope });
    if (seed.grantForceScope) {
      await ensureSystemAdmin(user.id);
      await ensureFluxcoreResources(account.id);
    }
  }

  console.log('\nResumen seed:test-baseline');
  console.log('────────────────────────');
  for (const entry of results) {
    console.log(`👤 UserId: ${entry.userId}`);
    console.log(`🏦 AccountId: ${entry.accountId}`);
    if (entry.grantForceScope) {
      console.log('   • Cuenta admin con ACCOUNT_DELETE_FORCE');
    }
  }

  console.log('\n✨ Seed baseline completado');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error en seed:test-baseline', error);
    process.exit(1);
  });
