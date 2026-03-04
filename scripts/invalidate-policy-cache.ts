#!/usr/bin/env bun
import { coreEventBus } from '../apps/api/src/core/events';

// Invalidate policy cache for Harold's account
const accountId = '3e94f74e-e6a0-4794-bd66-16081ee3b02d';

console.log(`🔄 Invalidating PolicyContext cache for account ${accountId.slice(0, 8)}...`);

coreEventBus.emit('policy.config.updated', { accountId });

console.log('✅ Cache invalidation event emitted');
console.log('The next message dispatch should reload mode=auto from DB');

process.exit(0);
