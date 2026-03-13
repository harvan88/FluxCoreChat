import { pgTable, index, unique, pgEnum, uuid, varchar, timestamp, foreignKey, jsonb, text, integer, boolean, bigint, uniqueIndex, numeric, date, real, bigserial, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"

export const assetScope = pgEnum("asset_scope", ['workspace_asset', 'profile_avatar', 'shared_internal', 'execution_plan', 'template_asset', 'message_attachment'])
export const assetStatus = pgEnum("asset_status", ['deleted', 'archived', 'ready', 'pending'])
export const dedupPolicy = pgEnum("dedup_policy", ['custom', 'intra_workspace', 'intra_account', 'none'])
export const uploadSessionStatus = pgEnum("upload_session_status", ['cancelled', 'expired', 'committed', 'uploading', 'active'])
export const assetActorType = pgEnum("asset_actor_type", ['api', 'system', 'assistant', 'user'])
export const assetAuditAction = pgEnum("asset_audit_action", ['unlinked', 'linked', 'metadata_updated', 'policy_evaluated', 'access_denied', 'restored', 'archived', 'purged', 'deleted', 'dedup_applied', 'state_changed', 'url_signed', 'preview', 'download', 'session_expired', 'upload_cancelled', 'upload_failed', 'upload_completed', 'upload_started'])
export const assetPermissionLevel = pgEnum("asset_permission_level", ['admin', 'write', 'read'])
export const assetPermissionSource = pgEnum("asset_permission_source", ['public', 'marketplace', 'shared'])


export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxUsersEmail: index("idx_users_email").on(table.email),
		usersEmailUnique: unique("users_email_unique").on(table.email),
	}
});

export const relationships = pgTable("relationships", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	perspectiveA: jsonb("perspective_a").default({"tags":[],"status":"active","saved_name":null}).notNull(),
	perspectiveB: jsonb("perspective_b").default({"tags":[],"status":"active","saved_name":null}).notNull(),
	context: jsonb("context").default({"entries":[],"total_chars":0}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	lastInteraction: timestamp("last_interaction", { mode: 'string' }),
	actorAId: uuid("actor_a_id").notNull().references(() => actors.id),
	actorBId: uuid("actor_b_id").notNull().references(() => actors.id),
},
(table) => {
	return {
		idxRelationshipsActors: index("idx_relationships_actors").on(table.actorAId, table.actorBId),
	}
});

export const conversations = pgTable("conversations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	relationshipId: uuid("relationship_id").references(() => relationships.id, { onDelete: "cascade" } ),
	channel: varchar("channel", { length: 20 }).notNull(),
	status: varchar("status", { length: 20 }).default('active'::character varying).notNull(),
	lastMessageAt: timestamp("last_message_at", { mode: 'string' }),
	lastMessageText: varchar("last_message_text", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	visitorToken: text("visitor_token"),
	identityLinkedAt: timestamp("identity_linked_at", { withTimezone: true, mode: 'string' }),
	conversationType: varchar("conversation_type", { length: 32 }).default('internal'::character varying).notNull(),
	frozenAt: timestamp("frozen_at", { withTimezone: true, mode: 'string' }),
	frozenReason: text("frozen_reason"),
	metadata: jsonb("metadata").default({}).notNull(),
	ownerAccountId: uuid("owner_account_id").references(() => accounts.id),
},
(table) => {
	return {
		idxConversationsRelationship: index("idx_conversations_relationship").on(table.relationshipId),
		idxConversationsVisitorToken: index("idx_conversations_visitor_token").on(table.visitorToken),
		idxConversationsOwnerAccount: index("idx_conversations_owner_account").on(table.ownerAccountId),
	}
});

export const creditsPolicies = pgTable("credits_policies", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	featureKey: varchar("feature_key", { length: 60 }).notNull(),
	engine: varchar("engine", { length: 30 }).notNull(),
	model: varchar("model", { length: 100 }).notNull(),
	costCredits: integer("cost_credits").notNull(),
	tokenBudget: integer("token_budget").notNull(),
	durationHours: integer("duration_hours").default(24).notNull(),
	active: boolean("active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxCreditsPoliciesFeature: index("idx_credits_policies_feature").on(table.featureKey),
		idxCreditsPoliciesEngineModel: index("idx_credits_policies_engine_model").on(table.engine, table.model),
	}
});

export const fluxcoreVectorStores = pgTable("fluxcore_vector_stores", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	externalId: varchar("external_id", { length: 255 }),
	visibility: varchar("visibility", { length: 20 }).default('private'::character varying).notNull(),
	status: varchar("status", { length: 20 }).default('draft'::character varying).notNull(),
	expirationPolicy: varchar("expiration_policy", { length: 50 }).default('never'::character varying),
	expirationDays: integer("expiration_days"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	usage: jsonb("usage").default({"bytesUsed":0,"costPerGBPerDay":0.1,"hoursUsedThisMonth":0}).notNull(),
	sizeBytes: integer("size_bytes").default(0),
	fileCount: integer("file_count").default(0),
	lastModifiedBy: varchar("last_modified_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	backend: varchar("backend", { length: 20 }).default('local'::character varying).notNull(),
	metadata: jsonb("metadata").default({}),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }),
	fileCounts: jsonb("file_counts").default({"total":0,"failed":0,"cancelled":0,"completed":0,"in_progress":0}),
	expiresAfter: jsonb("expires_after"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usageBytes: bigint("usage_bytes", { mode: "number" }).default(0),
	source: varchar("source", { length: 10 }).default('primary'::character varying).notNull(),
},
(table) => {
	return {
		idxVsBackend: index("idx_vs_backend").on(table.backend),
		idxVsExternalId: index("idx_vs_external_id").on(table.externalId),
		idxVsMetadata: index("idx_vs_metadata").on(table.metadata),
	}
});

export const accountAiEntitlements = pgTable("account_ai_entitlements", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	enabled: boolean("enabled").default(false).notNull(),
	allowedProviders: jsonb("allowed_providers").default([]),
	defaultProvider: varchar("default_provider", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const creditsConversationSessions = pgTable("credits_conversation_sessions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" } ),
	featureKey: varchar("feature_key", { length: 60 }).notNull(),
	engine: varchar("engine", { length: 30 }).notNull(),
	model: varchar("model", { length: 100 }).notNull(),
	costCredits: integer("cost_credits").notNull(),
	tokenBudget: integer("token_budget").notNull(),
	tokensUsed: integer("tokens_used").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxCreditsConversationSessionsAccount: index("idx_credits_conversation_sessions_account").on(table.accountId),
		idxCreditsConversationSessionsConversation: index("idx_credits_conversation_sessions_conversation").on(table.conversationId),
		idxCreditsConversationSessionsFeature: index("idx_credits_conversation_sessions_feature").on(table.featureKey),
		idxCreditsConversationSessionsExpiresAt: index("idx_credits_conversation_sessions_expires_at").on(table.expiresAt),
	}
});

export const creditsLedger = pgTable("credits_ledger", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	delta: integer("delta").notNull(),
	entryType: varchar("entry_type", { length: 30 }).notNull(),
	featureKey: varchar("feature_key", { length: 60 }).notNull(),
	engine: varchar("engine", { length: 30 }),
	model: varchar("model", { length: 100 }),
	conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" } ),
	sessionId: uuid("session_id"),
	metadata: jsonb("metadata").default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxCreditsLedgerAccount: index("idx_credits_ledger_account").on(table.accountId),
		idxCreditsLedgerCreatedAt: index("idx_credits_ledger_created_at").on(table.createdAt),
	}
});

export const creditsWallets = pgTable("credits_wallets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	balance: integer("balance").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		accountUnique: uniqueIndex("credits_wallets_account_unique").on(table.accountId),
		idxCreditsWalletsAccount: index("idx_credits_wallets_account").on(table.accountId),
	}
});

export const systemAdmins = pgTable("system_admins", {
	userId: uuid("user_id").primaryKey().notNull().references(() => users.id, { onDelete: "cascade" } ),
	scopes: jsonb("scopes").default({"credits":true}).notNull(),
	createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const extensionInstallations = pgTable("extension_installations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	extensionId: varchar("extension_id", { length: 100 }).notNull(),
	version: varchar("version", { length: 50 }).notNull(),
	enabled: boolean("enabled").default(true).notNull(),
	config: jsonb("config").default({}),
	grantedPermissions: jsonb("granted_permissions").default([]),
	grantedBy: uuid("granted_by").references(() => accounts.id),
	canSharePermissions: boolean("can_share_permissions").default(true),
	permissionsGrantedAt: timestamp("permissions_granted_at", { mode: 'string' }).defaultNow(),
	installedAt: timestamp("installed_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const extensionContexts = pgTable("extension_contexts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	extensionId: varchar("extension_id", { length: 100 }).notNull(),
	accountId: uuid("account_id").references(() => accounts.id),
	relationshipId: uuid("relationship_id").references(() => relationships.id),
	conversationId: uuid("conversation_id").references(() => conversations.id),
	contextType: varchar("context_type", { length: 50 }).notNull(),
	payload: jsonb("payload").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxExtensionContextsExtension: index("idx_extension_contexts_extension").on(table.extensionId),
		idxExtensionContextsAccount: index("idx_extension_contexts_account").on(table.accountId),
	}
});

export const workspaces = pgTable("workspaces", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	ownerAccountId: uuid("owner_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	description: varchar("description", { length: 500 }),
	settings: jsonb("settings").default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxWorkspacesOwner: index("idx_workspaces_owner").on(table.ownerAccountId),
	}
});

export const workspaceInvitations = pgTable("workspace_invitations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" } ),
	email: varchar("email", { length: 255 }).notNull(),
	role: varchar("role", { length: 20 }).default('operator'::character varying).notNull(),
	token: varchar("token", { length: 100 }).notNull(),
	invitedBy: uuid("invited_by").notNull().references(() => users.id),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxWorkspaceInvitationsWorkspace: index("idx_workspace_invitations_workspace").on(table.workspaceId),
		idxWorkspaceInvitationsEmail: index("idx_workspace_invitations_email").on(table.email),
		idxWorkspaceInvitationsToken: index("idx_workspace_invitations_token").on(table.token),
	}
});

export const workspaceMembers = pgTable("workspace_members", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" } ),
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	role: varchar("role", { length: 20 }).notNull(),
	permissions: jsonb("permissions").default({}).notNull(),
	invitedBy: uuid("invited_by").references(() => users.id),
	invitedAt: timestamp("invited_at", { mode: 'string' }),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxWorkspaceMembersWorkspace: index("idx_workspace_members_workspace").on(table.workspaceId),
		idxWorkspaceMembersUser: index("idx_workspace_members_user").on(table.userId),
	}
});

export const automationRules = pgTable("automation_rules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	relationshipId: uuid("relationship_id").references(() => relationships.id, { onDelete: "cascade" } ),
	mode: varchar("mode", { length: 20 }).default('supervised'::character varying).notNull(),
	enabled: boolean("enabled").default(true).notNull(),
	config: jsonb("config"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	serviceId: uuid("service_id").references(() => appointmentServices.id, { onDelete: "set null" } ),
	staffId: uuid("staff_id").references(() => appointmentStaff.id, { onDelete: "set null" } ),
	clientAccountId: uuid("client_account_id").references(() => accounts.id, { onDelete: "set null" } ),
	clientName: varchar("client_name", { length: 255 }),
	clientEmail: varchar("client_email", { length: 255 }),
	clientPhone: varchar("client_phone", { length: 50 }),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
	durationMinutes: integer("duration_minutes").notNull(),
	status: varchar("status", { length: 20 }).default('pending'::character varying).notNull(),
	notes: text("notes"),
	metadata: jsonb("metadata").default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxAppointmentsAccount: index("idx_appointments_account").on(table.accountId),
		idxAppointmentsScheduled: index("idx_appointments_scheduled").on(table.scheduledAt),
		idxAppointmentsStatus: index("idx_appointments_status").on(table.status),
	}
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: varchar("token", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: boolean("used").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		passwordResetTokensTokenUnique: unique("password_reset_tokens_token_unique").on(table.token),
	}
});

export const fluxcoreInstructionVersions = pgTable("fluxcore_instruction_versions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	instructionId: uuid("instruction_id").notNull().references(() => fluxcoreInstructions.id, { onDelete: "cascade" } ),
	versionNumber: integer("version_number").notNull(),
	content: text("content").notNull(),
	sizeBytes: integer("size_bytes").default(0),
	tokensEstimated: integer("tokens_estimated").default(0),
	wordCount: integer("word_count").default(0),
	lineCount: integer("line_count").default(0),
	changeLog: text("change_log"),
	createdBy: varchar("created_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreToolConnections = pgTable("fluxcore_tool_connections", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	toolDefinitionId: uuid("tool_definition_id").notNull().references(() => fluxcoreToolDefinitions.id, { onDelete: "cascade" } ),
	status: varchar("status", { length: 20 }).default('disconnected'::character varying).notNull(),
	errorMessage: text("error_message"),
	authConfig: jsonb("auth_config").default({"type":"none"}).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreAssistantTools = pgTable("fluxcore_assistant_tools", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	assistantId: uuid("assistant_id").notNull(),
	toolConnectionId: uuid("tool_connection_id").notNull().references(() => fluxcoreToolConnections.id, { onDelete: "cascade" } ),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" } ),
	content: jsonb("content").notNull(),
	type: varchar("type", { length: 20 }).notNull(),
	generatedBy: varchar("generated_by", { length: 20 }).default('human'::character varying).notNull(),
	aiApprovedBy: uuid("ai_approved_by").references(() => users.id),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	status: varchar("status", { length: 20 }).default('synced'::character varying).notNull(),
	fromActorId: uuid("from_actor_id").references(() => actors.id),
	toActorId: uuid("to_actor_id").references(() => actors.id),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	signalId: bigint("signal_id", { mode: "number" }),
	eventType: varchar("event_type", { length: 20 }).default('message'::character varying).notNull(),
	parentId: uuid("parent_id"),
	originalId: uuid("original_id"),
	version: integer("version").default(1).notNull(),
	isCurrent: boolean("is_current").default(true).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	deletedBy: text("deleted_by"),
	deletedScope: varchar("deleted_scope", { length: 10 }),
	metadata: jsonb("metadata").default({}).notNull(),
	senderAccountId: text("sender_account_id").notNull(),
},
(table) => {
	return {
		idxMessagesConversation: index("idx_messages_conversation").on(table.conversationId),
		idxMessagesCreated: index("idx_messages_created").on(table.createdAt),
		idxMessagesSignalId: index("idx_messages_signal_id").on(table.signalId),
		idxMessagesParent: index("idx_messages_parent").on(table.parentId),
		idxMessagesOriginal: index("idx_messages_original").on(table.originalId),
		idxMessagesSender: index("idx_messages_sender").on(table.senderAccountId),
		messagesSignalIdUnique: unique("messages_signal_id_unique").on(table.signalId),
	}
});

export const websiteConfigs = pgTable("website_configs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	status: varchar("status", { length: 20 }).default('draft'::character varying).notNull(),
	config: jsonb("config").default({}).notNull(),
	pages: jsonb("pages").default([]).notNull(),
	lastBuildAt: timestamp("last_build_at", { mode: 'string' }),
	buildHash: varchar("build_hash", { length: 64 }),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	customDomain: varchar("custom_domain", { length: 255 }),
	customDomainVerified: boolean("custom_domain_verified").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	allowAutomatedUse: boolean("allow_automated_use").default(false).notNull(),
},
(table) => {
	return {
		websiteConfigsAccountIdUnique: unique("website_configs_account_id_unique").on(table.accountId),
	}
});

export const appointmentServices = pgTable("appointment_services", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	durationMinutes: integer("duration_minutes").default(30).notNull(),
	price: numeric("price", { precision: 10, scale:  2 }),
	currency: varchar("currency", { length: 3 }).default('USD'::character varying),
	active: boolean("active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	allowAutomatedUse: boolean("allow_automated_use").default(false).notNull(),
},
(table) => {
	return {
		idxServicesAccount: index("idx_services_account").on(table.accountId),
	}
});

export const appointmentStaff = pgTable("appointment_staff", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }),
	availability: jsonb("availability").default({}).notNull(),
	services: jsonb("services").default([]).notNull(),
	active: boolean("active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	allowAutomatedUse: boolean("allow_automated_use").default(false).notNull(),
},
(table) => {
	return {
		idxStaffAccount: index("idx_staff_account").on(table.accountId),
	}
});

export const fluxcoreAssistants = pgTable("fluxcore_assistants", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	externalId: varchar("external_id", { length: 255 }),
	status: varchar("status", { length: 20 }).default('draft'::character varying).notNull(),
	modelConfig: jsonb("model_config").default({"topP":1,"model":"gpt-4o","provider":"openai","temperature":0.7,"responseFormat":"text"}).notNull(),
	timingConfig: jsonb("timing_config").default({"smartDelay":true,"responseDelaySeconds":2}).notNull(),
	sizeBytes: integer("size_bytes").default(0),
	tokensUsed: integer("tokens_used").default(0),
	lastModifiedBy: varchar("last_modified_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	runtime: varchar("runtime", { length: 20 }).default('local'::character varying).notNull(),
	authorizedDataScopes: text("authorized_data_scopes").default('{}').array().notNull(),
});

export const accounts = pgTable("accounts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	username: varchar("username", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	accountType: varchar("account_type", { length: 20 }).notNull(),
	profile: jsonb("profile").default({}).notNull(),
	privateContext: text("private_context"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	alias: varchar("alias", { length: 100 }).notNull(),
	allowAutomatedUse: boolean("allow_automated_use").default(false).notNull(),
	aiIncludeName: boolean("ai_include_name").default(true).notNull(),
	aiIncludeBio: boolean("ai_include_bio").default(true).notNull(),
	aiIncludePrivateContext: boolean("ai_include_private_context").default(true).notNull(),
	avatarAssetId: uuid("avatar_asset_id").references(() => assets.id, { onDelete: "set null" } ),
},
(table) => {
	return {
		idxAccountsAvatarAssetId: index("idx_accounts_avatar_asset_id").on(table.avatarAssetId),
		accountsUsernameUnique: unique("accounts_username_unique").on(table.username),
		accountsAliasUnique: unique("accounts_alias_unique").on(table.alias),
	}
});

export const actors = pgTable("actors", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" } ),
	accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" } ),
	role: varchar("role", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	actorType: varchar("actor_type", { length: 20 }).notNull(),
	extensionId: varchar("extension_id", { length: 100 }),
	displayName: varchar("display_name", { length: 100 }),
	externalKey: text("external_key"),
	tenantId: uuid("tenant_id").references(() => accounts.id),
	linkedAccountId: uuid("linked_account_id").references(() => accounts.id),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }),
	migratedFrom: uuid("migrated_from"),
});

export const fluxcoreToolDefinitions = pgTable("fluxcore_tool_definitions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	slug: varchar("slug", { length: 100 }).notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	category: varchar("category", { length: 100 }).notNull(),
	icon: varchar("icon", { length: 100 }),
	type: varchar("type", { length: 20 }).default('internal'::character varying).notNull(),
	visibility: varchar("visibility", { length: 20 }).default('public'::character varying).notNull(),
	schema: jsonb("schema"),
	authType: varchar("auth_type", { length: 20 }).default('none'::character varying).notNull(),
	oauthProvider: varchar("oauth_provider", { length: 100 }),
	isBuiltIn: boolean("is_built_in").default(false).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		fluxcoreToolDefinitionsSlugUnique: unique("fluxcore_tool_definitions_slug_unique").on(table.slug),
	}
});

export const fluxcoreAssistantInstructions = pgTable("fluxcore_assistant_instructions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	assistantId: uuid("assistant_id").notNull().references(() => fluxcoreAssistants.id, { onDelete: "cascade" } ),
	instructionId: uuid("instruction_id").notNull().references(() => fluxcoreInstructions.id, { onDelete: "cascade" } ),
	versionId: varchar("version_id", { length: 100 }),
	order: integer("order").default(0).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreAssistantVectorStores = pgTable("fluxcore_assistant_vector_stores", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	assistantId: uuid("assistant_id").notNull().references(() => fluxcoreAssistants.id, { onDelete: "cascade" } ),
	vectorStoreId: uuid("vector_store_id").notNull().references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	accessMode: varchar("access_mode", { length: 20 }).default('read'::character varying).notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreInstructions = pgTable("fluxcore_instructions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	visibility: varchar("visibility", { length: 20 }).default('private'::character varying).notNull(),
	currentVersionId: uuid("current_version_id"),
	status: varchar("status", { length: 20 }).default('draft'::character varying).notNull(),
	lastModifiedBy: varchar("last_modified_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isManaged: boolean("is_managed").default(false).notNull(),
});

export const fluxcoreAssetPermissions = pgTable("fluxcore_asset_permissions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	vectorStoreId: uuid("vector_store_id").references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	instructionId: uuid("instruction_id").references(() => fluxcoreInstructions.id, { onDelete: "cascade" } ),
	toolDefinitionId: uuid("tool_definition_id").references(() => fluxcoreToolDefinitions.id, { onDelete: "cascade" } ),
	granteeAccountId: uuid("grantee_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	permissionLevel: varchar("permission_level", { length: 20 }).default('read'::character varying).notNull(),
	source: varchar("source", { length: 20 }).default('shared'::character varying).notNull(),
	grantedByAccountId: uuid("granted_by_account_id").notNull().references(() => accounts.id),
	grantedAt: timestamp("granted_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	notes: text("notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxAssetPermissionsGranteeDrizzle: index("idx_asset_permissions_grantee_drizzle").on(table.granteeAccountId),
		idxAssetPermissionsSourceDrizzle: index("idx_asset_permissions_source_drizzle").on(table.source),
	}
});

export const fluxcoreRagConfigurations = pgTable("fluxcore_rag_configurations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	vectorStoreId: uuid("vector_store_id").references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	accountId: uuid("account_id").references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 100 }),
	isDefault: boolean("is_default").default(false),
	chunkingStrategy: varchar("chunking_strategy", { length: 50 }).default('recursive'::character varying).notNull(),
	chunkSizeTokens: integer("chunk_size_tokens").default(512),
	chunkOverlapTokens: integer("chunk_overlap_tokens").default(50),
	chunkSeparators: jsonb("chunk_separators").default(["\n\n","\n",". "," "]),
	chunkCustomRegex: text("chunk_custom_regex"),
	minChunkSize: integer("min_chunk_size").default(50),
	maxChunkSize: integer("max_chunk_size").default(2000),
	embeddingProvider: varchar("embedding_provider", { length: 50 }).default('openai'::character varying).notNull(),
	embeddingModel: varchar("embedding_model", { length: 100 }).default('text-embedding-3-small'::character varying),
	embeddingDimensions: integer("embedding_dimensions").default(1536),
	embeddingBatchSize: integer("embedding_batch_size").default(100),
	embeddingEndpointUrl: text("embedding_endpoint_url"),
	embeddingApiKeyRef: varchar("embedding_api_key_ref", { length: 255 }),
	retrievalTopK: integer("retrieval_top_k").default(10),
	retrievalMinScore: numeric("retrieval_min_score", { precision: 4, scale:  3 }).default('0.700'),
	retrievalMaxTokens: integer("retrieval_max_tokens").default(2000),
	hybridSearchEnabled: boolean("hybrid_search_enabled").default(false),
	hybridKeywordWeight: numeric("hybrid_keyword_weight", { precision: 3, scale:  2 }).default('0.30'),
	rerankEnabled: boolean("rerank_enabled").default(false),
	rerankProvider: varchar("rerank_provider", { length: 50 }),
	rerankModel: varchar("rerank_model", { length: 100 }),
	rerankTopN: integer("rerank_top_n").default(5),
	supportedMimeTypes: jsonb("supported_mime_types").default(["application/pdf","text/plain","text/markdown","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
	ocrEnabled: boolean("ocr_enabled").default(false),
	ocrLanguage: varchar("ocr_language", { length: 10 }).default('spa'::character varying),
	extractMetadata: boolean("extract_metadata").default(true),
	metadataFields: jsonb("metadata_fields").default(["title","author","created_date","page_count"]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxRagConfigVsDrizzle: index("idx_rag_config_vs_drizzle").on(table.vectorStoreId),
		idxRagConfigAccountDrizzle: index("idx_rag_config_account_drizzle").on(table.accountId),
	}
});

export const fluxcoreMarketplaceListings = pgTable("fluxcore_marketplace_listings", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	vectorStoreId: uuid("vector_store_id").references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	instructionId: uuid("instruction_id").references(() => fluxcoreInstructions.id, { onDelete: "cascade" } ),
	toolDefinitionId: uuid("tool_definition_id").references(() => fluxcoreToolDefinitions.id, { onDelete: "cascade" } ),
	sellerAccountId: uuid("seller_account_id").notNull().references(() => accounts.id),
	title: varchar("title", { length: 255 }).notNull(),
	shortDescription: varchar("short_description", { length: 500 }),
	longDescription: text("long_description"),
	category: varchar("category", { length: 100 }),
	tags: jsonb("tags").default([]),
	pricingModel: varchar("pricing_model", { length: 20 }).default('free'::character varying).notNull(),
	priceCents: integer("price_cents").default(0),
	currency: varchar("currency", { length: 3 }).default('USD'::character varying),
	billingPeriod: varchar("billing_period", { length: 20 }),
	usagePricePer1KTokens: integer("usage_price_per_1k_tokens"),
	status: varchar("status", { length: 20 }).default('draft'::character varying).notNull(),
	totalSubscribers: integer("total_subscribers").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalRevenueCents: bigint("total_revenue_cents", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalQueries: bigint("total_queries", { mode: "number" }).default(0),
	ratingAverage: numeric("rating_average", { precision: 3, scale:  2 }),
	ratingCount: integer("rating_count").default(0),
	previewEnabled: boolean("preview_enabled").default(true),
	previewChunkLimit: integer("preview_chunk_limit").default(5),
	licenseType: varchar("license_type", { length: 50 }).default('personal'::character varying),
	termsUrl: text("terms_url"),
	coverImageUrl: text("cover_image_url"),
	screenshots: jsonb("screenshots").default([]),
	demoUrl: text("demo_url"),
	searchKeywords: jsonb("search_keywords").default([]),
	featured: boolean("featured").default(false),
	featuredUntil: timestamp("featured_until", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
},
(table) => {
	return {
		idxMpListingsSeller: index("idx_mp_listings_seller").on(table.sellerAccountId),
		idxMpListingsStatus: index("idx_mp_listings_status").on(table.status),
		idxMpListingsCategory: index("idx_mp_listings_category").on(table.category),
	}
});

export const fluxcoreMarketplaceReviews = pgTable("fluxcore_marketplace_reviews", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	listingId: uuid("listing_id").notNull().references(() => fluxcoreMarketplaceListings.id, { onDelete: "cascade" } ),
	reviewerAccountId: uuid("reviewer_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	subscriptionId: uuid("subscription_id").references(() => fluxcoreMarketplaceSubscriptions.id),
	rating: integer("rating").notNull(),
	title: varchar("title", { length: 255 }),
	content: text("content"),
	status: varchar("status", { length: 20 }).default('published'::character varying),
	helpfulCount: integer("helpful_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxMpReviewsListing: index("idx_mp_reviews_listing").on(table.listingId),
		idxMpReviewUnique: uniqueIndex("idx_mp_review_unique").on(table.listingId, table.reviewerAccountId),
	}
});

export const fluxcoreMarketplaceSubscriptions = pgTable("fluxcore_marketplace_subscriptions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	listingId: uuid("listing_id").notNull().references(() => fluxcoreMarketplaceListings.id, { onDelete: "cascade" } ),
	subscriberAccountId: uuid("subscriber_account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	status: varchar("status", { length: 20 }).default('active'::character varying).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tokensUsedThisPeriod: bigint("tokens_used_this_period", { mode: "number" }).default(0),
	queriesThisPeriod: integer("queries_this_period").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tokensUsedTotal: bigint("tokens_used_total", { mode: "number" }).default(0),
	queriesTotal: integer("queries_total").default(0),
	externalSubscriptionId: varchar("external_subscription_id", { length: 255 }),
	lastPaymentAt: timestamp("last_payment_at", { mode: 'string' }),
	nextPaymentAt: timestamp("next_payment_at", { mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalPaidCents: bigint("total_paid_cents", { mode: "number" }).default(0),
	accessMode: varchar("access_mode", { length: 20 }).default('read'::character varying),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxMpSubscriptionsSubscriber: index("idx_mp_subscriptions_subscriber").on(table.subscriberAccountId),
		idxMpSubscriptionsListing: index("idx_mp_subscriptions_listing").on(table.listingId),
		idxMpSubUnique: uniqueIndex("idx_mp_sub_unique").on(table.listingId, table.subscriberAccountId),
	}
});

export const fluxcoreCreditTransactions = pgTable("fluxcore_credit_transactions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	transactionType: varchar("transaction_type", { length: 50 }).notNull(),
	amountCredits: numeric("amount_credits", { precision: 12, scale:  4 }).notNull(),
	description: text("description"),
	usageLogId: uuid("usage_log_id").references(() => fluxcoreUsageLogs.id),
	subscriptionId: uuid("subscription_id").references(() => fluxcoreMarketplaceSubscriptions.id),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	balanceAfter: numeric("balance_after", { precision: 12, scale:  4 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxTransactionsAccountDrizzle: index("idx_transactions_account_drizzle").on(table.accountId),
		idxTransactionsTypeDrizzle: index("idx_transactions_type_drizzle").on(table.transactionType),
	}
});

export const fluxcoreUsageLogs = pgTable("fluxcore_usage_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	resourceType: varchar("resource_type", { length: 50 }).notNull(),
	resourceId: uuid("resource_id"),
	operation: varchar("operation", { length: 50 }).notNull(),
	tokensUsed: integer("tokens_used").default(0),
	chunksProcessed: integer("chunks_processed").default(0),
	apiCalls: integer("api_calls").default(1),
	processingTimeMs: integer("processing_time_ms").default(0),
	costCredits: numeric("cost_credits", { precision: 10, scale:  4 }).default('0'),
	provider: varchar("provider", { length: 50 }),
	model: varchar("model", { length: 100 }),
	requestMetadata: jsonb("request_metadata").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	billingPeriodStart: date("billing_period_start"),
	billingPeriodEnd: date("billing_period_end"),
},
(table) => {
	return {
		idxUsageLogsAccountDrizzle: index("idx_usage_logs_account_drizzle").on(table.accountId),
		idxUsageLogsResourceDrizzle: index("idx_usage_logs_resource_drizzle").on(table.resourceType, table.resourceId),
		idxUsageLogsCreatedDrizzle: index("idx_usage_logs_created_drizzle").on(table.createdAt),
	}
});

export const fluxcoreFiles = pgTable("fluxcore_files", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 500 }).notNull(),
	originalName: varchar("original_name", { length: 500 }),
	mimeType: varchar("mime_type", { length: 100 }).default('application/octet-stream'::character varying),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }).default(0),
	textContent: text("text_content"),
	contentHash: varchar("content_hash", { length: 64 }),
	accountId: uuid("account_id").notNull(),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxFluxcoreFilesAccount: index("idx_fluxcore_files_account").on(table.accountId),
		idxFluxcoreFilesName: index("idx_fluxcore_files_name").on(table.name),
		idxFluxcoreFilesHash: index("idx_fluxcore_files_hash").on(table.contentHash),
		idxFluxcoreFilesCreated: index("idx_fluxcore_files_created").on(table.createdAt),
		fluxcoreFilesUniqueHash: unique("fluxcore_files_unique_hash").on(table.contentHash, table.accountId),
	}
});

export const fluxcoreAccountCredits = pgTable("fluxcore_account_credits", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	balanceCredits: numeric("balance_credits", { precision: 12, scale:  4 }).default('0'),
	monthlyLimitCredits: numeric("monthly_limit_credits", { precision: 12, scale:  4 }),
	dailyLimitCredits: numeric("daily_limit_credits", { precision: 12, scale:  4 }),
	usedThisMonth: numeric("used_this_month", { precision: 12, scale:  4 }).default('0'),
	usedToday: numeric("used_today", { precision: 12, scale:  4 }).default('0'),
	planType: varchar("plan_type", { length: 50 }).default('free'::character varying),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	alertThresholdPercent: integer("alert_threshold_percent").default(80),
	lastAlertSentAt: timestamp("last_alert_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxCreditsAccountUnique: uniqueIndex("idx_credits_account_unique").on(table.accountId),
	}
});

export const fluxcoreDocumentChunks = pgTable("fluxcore_document_chunks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	vectorStoreId: uuid("vector_store_id").notNull().references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	fileId: uuid("file_id").notNull().references(() => fluxcoreVectorStoreFiles.id, { onDelete: "cascade" } ),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	content: text("content").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	tokenCount: integer("token_count").default(0).notNull(),
	metadata: jsonb("metadata").default({}),
	documentType: varchar("document_type", { length: 64 }).default('text/plain'::character varying),
	language: varchar("language", { length: 16 }),
	startChar: integer("start_char"),
	endChar: integer("end_char"),
	pageNumber: integer("page_number"),
	sectionTitle: varchar("section_title", { length: 255 }),
	// TODO: failed to parse database type 'tsvector'
	searchVector: unknown("search_vector"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	// TODO: failed to parse database type 'vector(1536)'
	embedding: unknown("embedding"),
},
(table) => {
	return {
		idxDocumentChunksFileChunk: uniqueIndex("idx_document_chunks_file_chunk").on(table.fileId, table.chunkIndex),
		idxDocumentChunksVectorStoreDrizzle: index("idx_document_chunks_vector_store_drizzle").on(table.vectorStoreId),
		idxDocumentChunksFileDrizzle: index("idx_document_chunks_file_drizzle").on(table.fileId),
		idxDocumentChunksAccountDrizzle: index("idx_document_chunks_account_drizzle").on(table.accountId),
		idxDocumentChunksDocumentType: index("idx_document_chunks_document_type").on(table.documentType),
		idxDocumentChunksLanguage: index("idx_document_chunks_language").on(table.language),
		idxFluxcoreDocumentChunksEmbedding: index("idx_fluxcore_document_chunks_embedding").on(table.embedding),
		idxChunksNoEmbedding: index("idx_chunks_no_embedding").on(table.vectorStoreId),
		idxChunksMetadataGin: index("idx_chunks_metadata_gin").on(table.metadata),
	}
});

export const extensions = pgTable("extensions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	version: varchar("version", { length: 20 }).notNull(),
	description: text("description"),
	author: varchar("author", { length: 255 }),
	enabled: boolean("enabled").default(true).notNull(),
	config: jsonb("config").default({}),
	permissions: jsonb("permissions").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxExtensionsName: index("idx_extensions_name").on(table.name),
		extensionsNameKey: unique("extensions_name_key").on(table.name),
	}
});

export const accountDeletionJobs = pgTable("account_deletion_jobs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	requesterUserId: uuid("requester_user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	requesterAccountId: uuid("requester_account_id").references(() => accounts.id, { onDelete: "set null" } ),
	status: varchar("status", { length: 50 }).default('pending'::character varying).notNull(),
	phase: varchar("phase", { length: 50 }).default('snapshot'::character varying).notNull(),
	snapshotUrl: text("snapshot_url"),
	snapshotReadyAt: timestamp("snapshot_ready_at", { withTimezone: true, mode: 'string' }),
	externalState: jsonb("external_state").default({}).notNull(),
	metadata: jsonb("metadata").default({}).notNull(),
	failureReason: text("failure_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	snapshotDownloadedAt: timestamp("snapshot_downloaded_at", { withTimezone: true, mode: 'string' }),
	snapshotDownloadCount: integer("snapshot_download_count").default(0).notNull(),
	snapshotAcknowledgedAt: timestamp("snapshot_acknowledged_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		accountIdx: index("account_deletion_jobs_account_idx").on(table.accountId),
		statusIdx: index("account_deletion_jobs_status_idx").on(table.status),
		snapshotAckIdx: index("account_deletion_jobs_snapshot_ack_idx").on(table.snapshotAcknowledgedAt),
	}
});

export const fluxcoreVectorStoreFiles = pgTable("fluxcore_vector_store_files", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	vectorStoreId: uuid("vector_store_id").notNull().references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	externalId: varchar("external_id", { length: 255 }),
	mimeType: varchar("mime_type", { length: 100 }),
	sizeBytes: integer("size_bytes").default(0),
	status: varchar("status", { length: 20 }).default('pending'::character varying).notNull(),
	errorMessage: text("error_message"),
	lastModifiedBy: varchar("last_modified_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	fileId: uuid("file_id"),
	chunkCount: integer("chunk_count").default(0),
	totalTokens: integer("total_tokens").default(0),
	documentType: varchar("document_type", { length: 64 }),
	language: varchar("language", { length: 16 }),
	pageCount: integer("page_count"),
	rowCount: integer("row_count"),
	columnCount: integer("column_count"),
	metadata: jsonb("metadata").default({}),
	attributes: jsonb("attributes").default({}),
	chunkingStrategy: jsonb("chunking_strategy"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usageBytes: bigint("usage_bytes", { mode: "number" }).default(0),
	lastError: jsonb("last_error"),
},
(table) => {
	return {
		idxVsFilesAttributes: index("idx_vs_files_attributes").on(table.attributes),
		idxVsFilesExternalId: index("idx_vs_files_external_id").on(table.externalId),
	}
});

export const protectedAccounts = pgTable("protected_accounts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	reason: text("reason"),
	enforcedBy: text("enforced_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		protectedAccountsAccountUnique: unique("protected_accounts_account_unique").on(table.accountId),
	}
});

export const accountDeletionLogs = pgTable("account_deletion_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	jobId: uuid("job_id"),
	accountId: uuid("account_id").notNull(),
	requesterUserId: uuid("requester_user_id").references(() => users.id, { onDelete: "set null" } ),
	requesterAccountId: uuid("requester_account_id").references(() => accounts.id, { onDelete: "set null" } ),
	status: varchar("status", { length: 50 }).notNull(),
	reason: text("reason"),
	details: jsonb("details").default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		accountIdx: index("account_deletion_logs_account_idx").on(table.accountId),
		jobIdx: index("account_deletion_logs_job_idx").on(table.jobId),
	}
});

export const assetPolicies = pgTable("asset_policies", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	description: text("description"),
	scope: varchar("scope", { length: 50 }).notNull(),
	allowedContexts: text("allowed_contexts").notNull(),
	defaultTtlSeconds: integer("default_ttl_seconds").default(3600).notNull(),
	maxTtlSeconds: integer("max_ttl_seconds").default(86400).notNull(),
	dedupScope: varchar("dedup_scope", { length: 50 }).default('intra_account'::character varying),
	maxFileSizeBytes: integer("max_file_size_bytes"),
	allowedMimeTypes: text("allowed_mime_types"),
	requireEncryption: boolean("require_encryption").default(false),
	allowPublicAccess: boolean("allow_public_access").default(false),
	auditAllAccess: boolean("audit_all_access").default(true),
	retentionDays: integer("retention_days"),
	accountId: uuid("account_id"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxAssetPoliciesScope: index("idx_asset_policies_scope").on(table.scope),
		idxAssetPoliciesAccount: index("idx_asset_policies_account").on(table.accountId),
		idxAssetPoliciesActive: index("idx_asset_policies_active").on(table.isActive),
	}
});

export const assets = pgTable("assets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	workspaceId: uuid("workspace_id"),
	scope: assetScope("scope").default('message_attachment').notNull(),
	status: assetStatus("status").default('pending').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	version: bigint("version", { mode: "number" }).default(1).notNull(),
	name: varchar("name", { length: 500 }).notNull(),
	originalName: varchar("original_name", { length: 500 }),
	mimeType: varchar("mime_type", { length: 100 }).default('application/octet-stream'::character varying),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }).default(0),
	checksumSha256: varchar("checksum_sha256", { length: 64 }),
	dedupPolicy: dedupPolicy("dedup_policy").default('intra_account').notNull(),
	storageKey: varchar("storage_key", { length: 1000 }).notNull(),
	storageProvider: varchar("storage_provider", { length: 50 }).default('local'::character varying),
	encryption: varchar("encryption", { length: 50 }),
	encryptionKeyId: varchar("encryption_key_id", { length: 100 }),
	metadata: text("metadata"),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	retentionPolicy: varchar("retention_policy", { length: 50 }),
	hardDeleteAt: timestamp("hard_delete_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		idxAssetsAccount: index("idx_assets_account").on(table.accountId),
		idxAssetsWorkspace: index("idx_assets_workspace").on(table.workspaceId),
		idxAssetsStatus: index("idx_assets_status").on(table.status),
		idxAssetsScope: index("idx_assets_scope").on(table.scope),
		idxAssetsChecksum: index("idx_assets_checksum").on(table.checksumSha256),
		idxAssetsCreated: index("idx_assets_created").on(table.createdAt),
		idxAssetsStorageKey: index("idx_assets_storage_key").on(table.storageKey),
		assetsUniqueChecksumAccount: unique("assets_unique_checksum_account").on(table.accountId, table.checksumSha256),
	}
});

export const assetAuditLogs = pgTable("asset_audit_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id"),
	sessionId: uuid("session_id"),
	action: assetAuditAction("action").notNull(),
	actorId: uuid("actor_id"),
	actorType: assetActorType("actor_type").default('system').notNull(),
	context: varchar("context", { length: 100 }),
	accountId: uuid("account_id"),
	metadata: text("metadata"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	success: varchar("success", { length: 10 }).default('true'::character varying),
	errorMessage: text("error_message"),
	timestamp: timestamp("timestamp", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxAuditLogsAsset: index("idx_audit_logs_asset").on(table.assetId),
		idxAuditLogsSession: index("idx_audit_logs_session").on(table.sessionId),
		idxAuditLogsAction: index("idx_audit_logs_action").on(table.action),
		idxAuditLogsActor: index("idx_audit_logs_actor").on(table.actorId),
		idxAuditLogsAccount: index("idx_audit_logs_account").on(table.accountId),
		idxAuditLogsTimestamp: index("idx_audit_logs_timestamp").on(table.timestamp),
		idxAuditLogsAccountTimestamp: index("idx_audit_logs_account_timestamp").on(table.accountId, table.timestamp),
	}
});

export const assetUploadSessions = pgTable("asset_upload_sessions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	uploadedBy: uuid("uploaded_by"),
	status: uploadSessionStatus("status").default('active').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	maxSizeBytes: bigint("max_size_bytes", { mode: "number" }).default(104857600).notNull(),
	allowedMimeTypes: text("allowed_mime_types"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bytesUploaded: bigint("bytes_uploaded", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalBytes: bigint("total_bytes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	chunksReceived: bigint("chunks_received", { mode: "number" }).default(0),
	tempStorageKey: varchar("temp_storage_key", { length: 1000 }),
	fileName: varchar("file_name", { length: 500 }),
	mimeType: varchar("mime_type", { length: 100 }),
	assetId: uuid("asset_id"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	committedAt: timestamp("committed_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		idxUploadSessionsAccount: index("idx_upload_sessions_account").on(table.accountId),
		idxUploadSessionsStatus: index("idx_upload_sessions_status").on(table.status),
		idxUploadSessionsExpires: index("idx_upload_sessions_expires").on(table.expiresAt),
		idxUploadSessionsAsset: index("idx_upload_sessions_asset").on(table.assetId),
	}
});

export const aiTraces = pgTable("ai_traces", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" } ),
	messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" } ),
	runtime: varchar("runtime", { length: 20 }).notNull(),
	provider: varchar("provider", { length: 20 }).notNull(),
	model: varchar("model", { length: 100 }).notNull(),
	mode: varchar("mode", { length: 20 }).notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	durationMs: integer("duration_ms"),
	promptTokens: integer("prompt_tokens").default(0),
	completionTokens: integer("completion_tokens").default(0),
	totalTokens: integer("total_tokens").default(0),
	requestBody: jsonb("request_body"),
	responseContent: text("response_content"),
	toolsOffered: jsonb("tools_offered").default([]),
	toolsCalled: jsonb("tools_called").default([]),
	toolDetails: jsonb("tool_details"),
	attempts: jsonb("attempts"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxAiTracesAccount: index("idx_ai_traces_account").on(table.accountId),
		idxAiTracesConversation: index("idx_ai_traces_conversation").on(table.conversationId),
		idxAiTracesCreatedAt: index("idx_ai_traces_created_at").on(table.createdAt),
	}
});

export const aiSignals = pgTable("ai_signals", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	traceId: uuid("trace_id").notNull().references(() => aiTraces.id, { onDelete: "cascade" } ),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" } ),
	relationshipId: uuid("relationship_id").references(() => relationships.id, { onDelete: "set null" } ),
	signalType: varchar("signal_type", { length: 30 }).notNull(),
	signalValue: varchar("signal_value", { length: 100 }).notNull(),
	confidence: real("confidence").default(1),
	metadata: jsonb("metadata"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxAiSignalsAccount: index("idx_ai_signals_account").on(table.accountId),
		idxAiSignalsTypeValue: index("idx_ai_signals_type_value").on(table.signalType, table.signalValue),
		idxAiSignalsConversation: index("idx_ai_signals_conversation").on(table.conversationId),
		idxAiSignalsCreatedAt: index("idx_ai_signals_created_at").on(table.createdAt),
	}
});

export const aiSuggestions = pgTable("ai_suggestions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" } ),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	content: text("content").notNull(),
	model: varchar("model", { length: 100 }).notNull(),
	provider: varchar("provider", { length: 20 }),
	baseUrl: varchar("base_url", { length: 255 }),
	traceId: uuid("trace_id"),
	status: varchar("status", { length: 20 }).default('pending'::character varying).notNull(),
	promptTokens: integer("prompt_tokens").default(0),
	completionTokens: integer("completion_tokens").default(0),
	totalTokens: integer("total_tokens").default(0),
	generatedAt: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	respondedAt: timestamp("responded_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxAiSuggestionsConversation: index("idx_ai_suggestions_conversation").on(table.conversationId),
		idxAiSuggestionsAccount: index("idx_ai_suggestions_account").on(table.accountId),
		idxAiSuggestionsStatus: index("idx_ai_suggestions_status").on(table.status),
		idxAiSuggestionsCreatedAt: index("idx_ai_suggestions_created_at").on(table.createdAt),
	}
});

export const fluxcoreAgents = pgTable("fluxcore_agents", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	description: text("description"),
	status: varchar("status", { length: 20 }).default('draft'::character varying).notNull(),
	flow: jsonb("flow").default({"steps":[]}).notNull(),
	scopes: jsonb("scopes").default({"allowedTools":[],"allowedModels":[],"maxTotalTokens":5000,"canCreateSubAgents":false,"maxExecutionTimeMs":30000}).notNull(),
	triggerConfig: jsonb("trigger_config").default({"type":"message_received"}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxFluxcoreAgentsAccount: index("idx_fluxcore_agents_account").on(table.accountId),
		idxFluxcoreAgentsStatus: index("idx_fluxcore_agents_status").on(table.status),
	}
});

export const fluxcoreAgentAssistants = pgTable("fluxcore_agent_assistants", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	agentId: uuid("agent_id").notNull().references(() => fluxcoreAgents.id, { onDelete: "cascade" } ),
	assistantId: uuid("assistant_id").notNull().references(() => fluxcoreAssistants.id, { onDelete: "cascade" } ),
	role: varchar("role", { length: 30 }).default('worker'::character varying).notNull(),
	stepId: varchar("step_id", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxFluxcoreAgentAssistantsAgent: index("idx_fluxcore_agent_assistants_agent").on(table.agentId),
		idxFluxcoreAgentAssistantsAssistant: index("idx_fluxcore_agent_assistants_assistant").on(table.assistantId),
	}
});

export const fluxcoreDecisionEvents = pgTable("fluxcore_decision_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	traceId: varchar("trace_id", { length: 255 }).notNull(),
	messageId: uuid("message_id"),
	input: jsonb("input").notNull(),
	proposedWork: jsonb("proposed_work"),
	modelInfo: jsonb("model_info"),
	latencyMs: integer("latency_ms"),
	tokens: jsonb("tokens"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const templates = pgTable("templates", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	name: varchar("name", { length: 255 }).notNull(),
	content: text("content").notNull(),
	category: varchar("category", { length: 100 }),
	variables: jsonb("variables").default([]).notNull(),
	tags: jsonb("tags").default([]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	allowAutomatedUse: boolean("allow_automated_use").default(false).notNull(),
},
(table) => {
	return {
		idxTemplatesAccount: index("idx_templates_account").on(table.accountId),
		idxTemplatesAccountName: index("idx_templates_account_name").on(table.accountId, table.name),
	}
});

export const fluxcoreTemplateSettings = pgTable("fluxcore_template_settings", {
	templateId: uuid("template_id").primaryKey().notNull().references(() => templates.id, { onDelete: "cascade" } ),
	authorizeForAi: boolean("authorize_for_ai").default(false).notNull(),
	aiUsageInstructions: text("ai_usage_instructions"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	aiIncludeName: boolean("ai_include_name").default(true).notNull(),
	aiIncludeContent: boolean("ai_include_content").default(true).notNull(),
	aiIncludeInstructions: boolean("ai_include_instructions").default(true).notNull(),
});

export const fluxcoreProposedWorks = pgTable("fluxcore_proposed_works", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	conversationId: varchar("conversation_id", { length: 255 }).notNull(),
	decisionEventId: uuid("decision_event_id").notNull().references(() => fluxcoreDecisionEvents.id),
	workDefinitionId: uuid("work_definition_id").references(() => fluxcoreWorkDefinitions.id),
	intent: text("intent"),
	candidateSlots: jsonb("candidate_slots").notNull(),
	confidence: real("confidence"),
	traceId: varchar("trace_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	evaluatedAt: timestamp("evaluated_at", { mode: 'string' }),
	resolution: varchar("resolution", { length: 50 }).notNull(),
	resultingWorkId: uuid("resulting_work_id"),
});

export const fluxcoreSemanticContexts = pgTable("fluxcore_semantic_contexts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	workId: uuid("work_id").references(() => fluxcoreWorks.id),
	conversationId: varchar("conversation_id", { length: 255 }).notNull(),
	slotPath: text("slot_path").notNull(),
	proposedValue: jsonb("proposed_value").notNull(),
	requestMessageId: uuid("request_message_id"),
	requestEventId: uuid("request_event_id"),
	status: varchar("status", { length: 20 }).notNull(),
	consumedAt: timestamp("consumed_at", { mode: 'string' }),
	consumedByWorkId: uuid("consumed_by_work_id"),
	consumedByMessageId: uuid("consumed_by_message_id"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		accConvStatusIdx: index("fluxcore_semantic_contexts_acc_conv_status_idx").on(table.accountId, table.conversationId, table.status),
	}
});

export const fluxcoreExternalEffects = pgTable("fluxcore_external_effects", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	workId: uuid("work_id").notNull().references(() => fluxcoreWorks.id),
	toolName: varchar("tool_name", { length: 255 }).notNull(),
	toolCallId: varchar("tool_call_id", { length: 255 }),
	idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
	request: jsonb("request"),
	response: jsonb("response"),
	status: varchar("status", { length: 20 }).notNull(),
	claimId: uuid("claim_id"),
	startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
},
(table) => {
	return {
		fluxcoreExternalEffectsAccountIdIdempotencyKeyKey: unique("fluxcore_external_effects_account_id_idempotency_key_key").on(table.accountId, table.idempotencyKey),
	}
});

export const fluxcoreExternalEffectClaims = pgTable("fluxcore_external_effect_claims", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	semanticContextId: uuid("semantic_context_id").notNull().references(() => fluxcoreSemanticContexts.id),
	workId: uuid("work_id").notNull().references(() => fluxcoreWorks.id),
	effectType: varchar("effect_type", { length: 100 }).notNull(),
	status: varchar("status", { length: 20 }).notNull(),
	claimedAt: timestamp("claimed_at", { mode: 'string' }).defaultNow().notNull(),
	releasedAt: timestamp("released_at", { mode: 'string' }),
	externalEffectId: uuid("external_effect_id").references(() => fluxcoreExternalEffects.id),
});

export const fluxcoreWorkDefinitions = pgTable("fluxcore_work_definitions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	typeId: text("type_id").notNull(),
	version: varchar("version", { length: 20 }).notNull(),
	definitionJson: jsonb("definition_json").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deprecatedAt: timestamp("deprecated_at", { mode: 'string' }),
},
(table) => {
	return {
		fluxcoreWorkDefinitionsAccountIdTypeIdVersionKey: unique("fluxcore_work_definitions_account_id_type_id_version_key").on(table.accountId, table.typeId, table.version),
	}
});

export const fluxcoreWorks = pgTable("fluxcore_works", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	workDefinitionId: uuid("work_definition_id").notNull().references(() => fluxcoreWorkDefinitions.id),
	workDefinitionVersion: varchar("work_definition_version", { length: 20 }).notNull(),
	relationshipId: uuid("relationship_id").references(() => relationships.id),
	conversationId: varchar("conversation_id", { length: 255 }),
	aggregateKey: text("aggregate_key"),
	state: varchar("state", { length: 50 }).notNull(),
	revision: integer("revision").default(1).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	suspendedReason: text("suspended_reason"),
	cancelledReason: text("cancelled_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		accRelConvStateIdx: index("fluxcore_works_acc_rel_conv_state_idx").on(table.accountId, table.relationshipId, table.conversationId, table.state),
		accAggregateKeyIdx: index("fluxcore_works_acc_aggregate_key_idx").on(table.accountId, table.aggregateKey),
	}
});

export const fluxcoreWorkSlots = pgTable("fluxcore_work_slots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	workId: uuid("work_id").notNull().references(() => fluxcoreWorks.id),
	path: text("path").notNull(),
	type: varchar("type", { length: 50 }).notNull(),
	value: jsonb("value"),
	status: varchar("status", { length: 20 }).notNull(),
	immutable: boolean("immutable").default(false).notNull(),
	setBy: varchar("set_by", { length: 50 }).notNull(),
	setAt: timestamp("set_at", { mode: 'string' }).defaultNow().notNull(),
	evidence: jsonb("evidence"),
	semanticConfirmedAt: timestamp("semantic_confirmed_at", { mode: 'string' }),
	semanticContextId: uuid("semantic_context_id"),
},
(table) => {
	return {
		fluxcoreWorkSlotsWorkIdPathKey: unique("fluxcore_work_slots_work_id_path_key").on(table.workId, table.path),
	}
});

export const fluxcoreWorkEvents = pgTable("fluxcore_work_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id),
	workId: uuid("work_id").notNull().references(() => fluxcoreWorks.id),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	actor: varchar("actor", { length: 50 }).notNull(),
	traceId: varchar("trace_id", { length: 255 }).notNull(),
	workRevision: integer("work_revision").notNull(),
	delta: jsonb("delta"),
	evidenceRef: jsonb("evidence_ref"),
	semanticContextId: uuid("semantic_context_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		workCreatedIdx: index("fluxcore_work_events_work_created_idx").on(table.workId, table.createdAt),
	}
});

export const fluxcoreSystemMetrics = pgTable("fluxcore_system_metrics", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	metricName: varchar("metric_name", { length: 100 }).notNull(),
	metricType: varchar("metric_type", { length: 50 }).notNull(),
	value: numeric("value", { precision: 20, scale:  6 }).notNull(),
	dimensions: jsonb("dimensions").default({}),
	recordedAt: timestamp("recorded_at", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	recordedDate: date("recorded_date").default(CURRENT_DATE).notNull(),
},
(table) => {
	return {
		idxMetricsNameTime: index("idx_metrics_name_time").on(table.metricName, table.recordedAt),
		idxMetricsDate: index("idx_metrics_date").on(table.recordedDate),
	}
});

export const fluxcoreVectorStoreStats = pgTable("fluxcore_vector_store_stats", {
	vectorStoreId: uuid("vector_store_id").primaryKey().notNull().references(() => fluxcoreVectorStores.id, { onDelete: "cascade" } ),
	fileCount: integer("file_count").default(0),
	chunkCount: integer("chunk_count").default(0),
	totalTokens: integer("total_tokens").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalSizeBytes: bigint("total_size_bytes", { mode: "number" }).default(0),
	embeddedChunkCount: integer("embedded_chunk_count").default(0),
	embeddingCoveragePercent: numeric("embedding_coverage_percent", { precision: 5, scale:  2 }).default('0'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalQueries: bigint("total_queries", { mode: "number" }).default(0),
	queriesThisMonth: integer("queries_this_month").default(0),
	avgQueryTimeMs: integer("avg_query_time_ms").default(0),
	lastFileAddedAt: timestamp("last_file_added_at", { mode: 'string' }),
	lastQueryAt: timestamp("last_query_at", { mode: 'string' }),
	lastReindexAt: timestamp("last_reindex_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreQueryCache = pgTable("fluxcore_query_cache", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	queryHash: varchar("query_hash", { length: 64 }).notNull(),
	vectorStoreIds: uuid("vector_store_ids").array().notNull(),
	queryText: text("query_text").notNull(),
	cachedChunkIds: uuid("cached_chunk_ids").array().notNull(),
	cachedSimilarities: numeric("cached_similarities", undefined).array().notNull(),
	hitCount: integer("hit_count").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		idxCacheHash: index("idx_cache_hash").on(table.queryHash),
		idxCacheExpires: index("idx_cache_expires").on(table.expiresAt),
		fluxcoreQueryCacheQueryHashVectorStoreIdsKey: unique("fluxcore_query_cache_query_hash_vector_store_ids_key").on(table.queryHash, table.vectorStoreIds),
	}
});

export const accountRuntimeConfig = pgTable("account_runtime_config", {
	accountId: uuid("account_id").primaryKey().notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	activeRuntimeId: varchar("active_runtime_id", { length: 100 }).default('@fluxcore/fluxcore'::character varying).notNull(),
	config: jsonb("config").default({}).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreActorAddressLinks = pgTable("fluxcore_actor_address_links", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	actorId: uuid("actor_id").notNull().references(() => fluxcoreActors.id, { onDelete: "cascade" } ),
	addressId: uuid("address_id").notNull().references(() => fluxcoreAddresses.id, { onDelete: "cascade" } ),
	confidence: real("confidence").default(1).notNull(),
	version: integer("version").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreAddresses = pgTable("fluxcore_addresses", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	driverId: varchar("driver_id", { length: 100 }).notNull(),
	externalId: varchar("external_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		fluxcoreAddressesDriverIdExternalIdKey: unique("fluxcore_addresses_driver_id_external_id_key").on(table.driverId, table.externalId),
	}
});

export const fluxcoreAccountActorContexts = pgTable("fluxcore_account_actor_contexts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" } ),
	actorId: uuid("actor_id").notNull().references(() => fluxcoreActors.id, { onDelete: "cascade" } ),
	displayName: varchar("display_name", { length: 255 }),
	metadata: text("metadata"),
	status: varchar("status", { length: 50 }).default('active'::character varying).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxFluxcoreActorContextsAccActor: index("idx_fluxcore_actor_contexts_acc_actor").on(table.accountId, table.actorId),
	}
});

export const fluxcoreActors = pgTable("fluxcore_actors", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	internalRef: text("internal_ref"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	type: text("type").default('real'),
	externalKey: text("external_key"),
	tenantId: text("tenant_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdFromSignal: bigint("created_from_signal", { mode: "number" }).references(() => fluxcoreSignals.sequenceNumber),
},
(table) => {
	return {
		idxFluxcoreActorsExternalKey: index("idx_fluxcore_actors_external_key").on(table.externalKey),
		idxFluxcoreActorsTenant: index("idx_fluxcore_actors_tenant").on(table.tenantId),
	}
});

export const fluxcoreSessionProjection = pgTable("fluxcore_session_projection", {
	sessionId: uuid("session_id").primaryKey().notNull(),
	actorId: text("actor_id").notNull(),
	accountId: text("account_id").notNull(),
	entryPoint: text("entry_point"),
	deviceHash: text("device_hash"),
	method: text("method"),
	scopes: jsonb("scopes").default([]).notNull(),
	status: text("status").default('pending').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastSequenceNumber: bigint("last_sequence_number", { mode: "number" }).default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		idxFluxcoreSessionProjectionAccount: index("idx_fluxcore_session_projection_account").on(table.accountId),
		idxFluxcoreSessionProjectionActor: index("idx_fluxcore_session_projection_actor").on(table.actorId),
		idxFluxcoreSessionProjectionDevice: index("idx_fluxcore_session_projection_device").on(table.deviceHash),
		idxFluxcoreSessionProjectionStatus: index("idx_fluxcore_session_projection_status").on(table.status),
		idxFluxcoreSessionProjectionSequence: index("idx_fluxcore_session_projection_sequence").on(table.lastSequenceNumber),
	}
});

export const fluxcoreRealityAdapters = pgTable("fluxcore_reality_adapters", {
	adapterId: text("adapter_id").primaryKey().notNull(),
	driverId: text("driver_id").notNull(),
	adapterClass: text("adapter_class").notNull(),
	description: text("description").notNull(),
	signingSecret: text("signing_secret").notNull(),
	adapterVersion: text("adapter_version").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const fluxcoreFactTypes = pgTable("fluxcore_fact_types", {
	factType: text("fact_type").primaryKey().notNull(),
	description: text("description").notNull(),
});

export const fluxcoreProjectorCursors = pgTable("fluxcore_projector_cursors", {
	projectorName: text("projector_name").primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastSequenceNumber: bigint("last_sequence_number", { mode: "number" }).default(0).notNull(),
	lastProcessedAt: timestamp("last_processed_at", { mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	errorCount: bigint("error_count", { mode: "number" }).default(0).notNull(),
	lastError: text("last_error"),
});

export const fluxcoreSignals = pgTable("fluxcore_signals", {
	sequenceNumber: bigserial("sequence_number", { mode: "bigint" }).primaryKey().notNull(),
	signalFingerprint: text("signal_fingerprint").notNull(),
	factType: text("fact_type").notNull(),
	sourceNamespace: text("source_namespace").notNull(),
	sourceKey: text("source_key").notNull(),
	subjectNamespace: text("subject_namespace"),
	subjectKey: text("subject_key"),
	objectNamespace: text("object_namespace"),
	objectKey: text("object_key"),
	evidenceRaw: jsonb("evidence_raw").notNull(),
	evidenceFormat: text("evidence_format").notNull(),
	evidenceChecksum: text("evidence_checksum").notNull(),
	provenanceDriverId: text("provenance_driver_id").notNull(),
	provenanceExternalId: text("provenance_external_id"),
	provenanceEntryPoint: text("provenance_entry_point"),
	certifiedByAdapter: text("certified_by_adapter").notNull().references(() => fluxcoreRealityAdapters.adapterId),
	certifiedAdapterVersion: text("certified_adapter_version").notNull(),
	claimedOccurredAt: timestamp("claimed_occurred_at", { withTimezone: true, mode: 'string' }),
	observedAt: timestamp("observed_at", { withTimezone: true, mode: 'string' }).default(clock_timestamp()).notNull(),
},
(table) => {
	return {
		idxFluxcoreSource: index("idx_fluxcore_source").on(table.sequenceNumber, table.sourceNamespace, table.sourceKey),
		idxFluxcoreSubject: index("idx_fluxcore_subject").on(table.sequenceNumber, table.subjectNamespace, table.subjectKey),
		idxFluxcoreSequence: index("idx_fluxcore_sequence").on(table.sequenceNumber),
		idxFluxcoreClaimedOccurred: index("idx_fluxcore_claimed_occurred").on(table.claimedOccurredAt),
		uxFluxcoreAdapterExternal: uniqueIndex("ux_fluxcore_adapter_external").on(table.provenanceExternalId, table.certifiedByAdapter),
		fluxcoreSignalsSignalFingerprintKey: unique("fluxcore_signals_signal_fingerprint_key").on(table.signalFingerprint),
	}
});

export const fluxcoreActorIdentityLinks = pgTable("fluxcore_actor_identity_links", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	provisionalActorId: text("provisional_actor_id").notNull(),
	realAccountId: text("real_account_id").notNull(),
	tenantId: text("tenant_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	linkingSignalSeq: bigint("linking_signal_seq", { mode: "number" }).notNull().references(() => fluxcoreSignals.sequenceNumber),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).default(clock_timestamp()).notNull(),
},
(table) => {
	return {
		idxActorIdentityLinksReal: index("idx_actor_identity_links_real").on(table.realAccountId),
		fluxcoreActorIdentityLinksProvisionalActorIdKey: unique("fluxcore_actor_identity_links_provisional_actor_id_key").on(table.provisionalActorId),
	}
});

export const fluxcoreProjectorErrors = pgTable("fluxcore_projector_errors", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	projectorName: text("projector_name").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	signalSeq: bigint("signal_seq", { mode: "number" }).notNull().references(() => fluxcoreSignals.sequenceNumber, { onDelete: "cascade" } ),
	errorMessage: text("error_message").notNull(),
	errorStack: text("error_stack"),
	attempts: integer("attempts").default(1).notNull(),
	firstFailedAt: timestamp("first_failed_at", { withTimezone: true, mode: 'string' }).default(clock_timestamp()).notNull(),
	lastFailedAt: timestamp("last_failed_at", { withTimezone: true, mode: 'string' }).default(clock_timestamp()).notNull(),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		idxProjectorErrorsUnresolved: index("idx_projector_errors_unresolved").on(table.resolvedAt),
		uxProjectorSignal: unique("ux_projector_signal").on(table.projectorName, table.signalSeq),
	}
});

export const fluxcoreCognitionQueue = pgTable("fluxcore_cognition_queue", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull(),
	accountId: uuid("account_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastSignalSeq: bigint("last_signal_seq", { mode: "number" }),
	turnStartedAt: timestamp("turn_started_at", { withTimezone: true, mode: 'string' }).default(clock_timestamp()).notNull(),
	turnWindowExpiresAt: timestamp("turn_window_expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	attempts: integer("attempts").default(0).notNull(),
	lastError: text("last_error"),
	targetAccountId: uuid("target_account_id"),
},
(table) => {
	return {
		uxCognitionQueueConversationPending: uniqueIndex("ux_cognition_queue_conversation_pending").on(table.conversationId),
		idxCognitionQueueReady: index("idx_cognition_queue_ready").on(table.turnWindowExpiresAt),
		uxCognitionQueuePendingConversation: uniqueIndex("ux_cognition_queue_pending_conversation").on(table.conversationId),
	}
});

export const fluxcoreActionAudit = pgTable("fluxcore_action_audit", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	conversationId: text("conversation_id").notNull(),
	accountId: text("account_id").notNull(),
	runtimeId: text("runtime_id").notNull(),
	actionType: text("action_type").notNull(),
	actionPayload: jsonb("action_payload"),
	status: text("status").notNull(),
	rejectionReason: text("rejection_reason"),
	executedAt: timestamp("executed_at", { withTimezone: true, mode: 'string' }).default(clock_timestamp()).notNull(),
},
(table) => {
	return {
		idxActionAuditAccount: index("idx_action_audit_account").on(table.accountId, table.executedAt),
		idxActionAuditAccountDate: index("idx_action_audit_account_date").on(table.accountId, table.executedAt),
	}
});

export const fluxcoreAccountPolicies = pgTable("fluxcore_account_policies", {
	id: text("id").default('gen_random_uuid()').primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	tone: text("tone").default('neutral').notNull(),
	useEmojis: boolean("use_emojis").default(false).notNull(),
	language: text("language").default('es').notNull(),
	mode: text("mode").default('off').notNull(),
	responseDelayMs: integer("response_delay_ms").default(3000).notNull(),
	turnWindowMs: integer("turn_window_ms").default(3000).notNull(),
	turnWindowTypingMs: integer("turn_window_typing_ms").default(5000).notNull(),
	turnWindowMaxMs: integer("turn_window_max_ms").default(60000).notNull(),
	offHoursPolicy: jsonb("off_hours_policy").default({"action":"ignore"}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		fluxcoreAccountPoliciesAccountIdKey: unique("fluxcore_account_policies_account_id_key").on(table.accountId),
	}
});

export const chatcoreOutbox = pgTable("chatcore_outbox", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" } ),
	status: text("status").default('pending').notNull(),
	payload: text("payload").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attempts: bigint("attempts", { mode: "number" }).default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	lastError: text("last_error"),
},
(table) => {
	return {
		idxChatcoreOutboxPending: index("idx_chatcore_outbox_pending").on(table.status, table.createdAt),
	}
});

export const fluxcoreOutbox = pgTable("fluxcore_outbox", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	signalId: bigint("signal_id", { mode: "number" }).notNull().references(() => fluxcoreSignals.sequenceNumber, { onDelete: "cascade" } ),
	eventType: text("event_type").notNull(),
	payload: text("payload").notNull(),
	status: text("status").default('pending').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	attempts: bigint("attempts", { mode: "number" }).default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	lastError: text("last_error"),
},
(table) => {
	return {
		idxFluxcoreOutboxPending: index("idx_fluxcore_outbox_pending").on(table.status, table.createdAt),
		idxFluxcoreOutboxSignalId: index("idx_fluxcore_outbox_signal_id").on(table.signalId),
	}
});

export const assetEnrichments = pgTable("asset_enrichments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	assetId: uuid("asset_id").notNull(),
	type: varchar("type", { length: 50 }).notNull(),
	payload: jsonb("payload").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		assetEnrichmentsAssetIdTypeKey: unique("asset_enrichments_asset_id_type_key").on(table.assetId, table.type),
	}
});

export const conversationParticipants = pgTable("conversation_participants", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" } ),
	accountId: text("account_id").notNull(),
	role: varchar("role", { length: 20 }).notNull(),
	identityType: varchar("identity_type", { length: 20 }).default('registered'::character varying).notNull(),
	visitorToken: text("visitor_token"),
	subscribedAt: timestamp("subscribed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: 'string' }),
	actorId: uuid("actor_id").references(() => actors.id),
},
(table) => {
	return {
		idxCpConversation: index("idx_cp_conversation").on(table.conversationId),
		idxCpAccount: index("idx_cp_account").on(table.accountId),
		idxCpToken: index("idx_cp_token").on(table.visitorToken),
		conversationParticipantsConversationIdAccountIdKey: unique("conversation_participants_conversation_id_account_id_key").on(table.conversationId, table.accountId),
	}
});

export const messageAssets = pgTable("message_assets", {
	messageId: uuid("message_id").notNull(),
	assetId: uuid("asset_id").notNull(),
	version: integer("version").default(1).notNull(),
	position: integer("position").default(0).notNull(),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxMessageAssetsMessage: index("idx_message_assets_message").on(table.messageId),
		idxMessageAssetsAsset: index("idx_message_assets_asset").on(table.assetId),
		messageAssetsMessageIdAssetIdPk: primaryKey({ columns: [table.messageId, table.assetId], name: "message_assets_message_id_asset_id_pk"})
	}
});

export const templateAssets = pgTable("template_assets", {
	templateId: uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" } ),
	assetId: uuid("asset_id").notNull(),
	version: integer("version").default(1).notNull(),
	slot: varchar("slot", { length: 100 }).default('default'::character varying).notNull(),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idxTemplateAssetsTemplate: index("idx_template_assets_template").on(table.templateId),
		idxTemplateAssetsAsset: index("idx_template_assets_asset").on(table.assetId),
		templateAssetsTemplateIdAssetIdSlotPk: primaryKey({ columns: [table.templateId, table.assetId, table.slot], name: "template_assets_template_id_asset_id_slot_pk"})
	}
});

export const planAssets = pgTable("plan_assets", {
	planId: uuid("plan_id").notNull(),
	stepId: varchar("step_id", { length: 100 }),
	assetId: uuid("asset_id").notNull(),
	version: integer("version").default(1).notNull(),
	dependencyType: varchar("dependency_type", { length: 50 }).default('required'::character varying).notNull(),
	isReady: boolean("is_ready").default(false),
	linkedAt: timestamp("linked_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	readyAt: timestamp("ready_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		idxPlanAssetsPlan: index("idx_plan_assets_plan").on(table.planId),
		idxPlanAssetsStep: index("idx_plan_assets_step").on(table.stepId),
		idxPlanAssetsAsset: index("idx_plan_assets_asset").on(table.assetId),
		idxPlanAssetsReady: index("idx_plan_assets_ready").on(table.isReady),
		planAssetsPlanIdAssetIdPk: primaryKey({ columns: [table.planId, table.assetId], name: "plan_assets_plan_id_asset_id_pk"})
	}
});