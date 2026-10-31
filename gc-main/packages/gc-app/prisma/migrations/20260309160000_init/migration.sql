-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "avatar" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "shardingKey" TEXT NOT NULL,
    "shardingSeq" INTEGER,
    "displayName" TEXT NOT NULL,
    "subdomain" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "logo" TEXT,
    "inviteCode" TEXT,
    "inviteCodeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_workspaces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "region" TEXT,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "apiFormat" TEXT,
    "displayName" TEXT NOT NULL,
    "capabilities" JSONB,
    "inputPrice" DECIMAL(18,6),
    "outputPrice" DECIMAL(18,6),
    "markupMultiplier" DECIMAL(18,6),
    "maxTokens" INTEGER,
    "maxOutputTokens" INTEGER,
    "supportsStreaming" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "name" TEXT,
    "bio" TEXT,
    "themePreset" TEXT NOT NULL DEFAULT 'lavender-dream',
    "themeRadius" TEXT NOT NULL DEFAULT 'default',
    "themeScale" TEXT NOT NULL DEFAULT 'none',
    "themeContentLayout" TEXT NOT NULL DEFAULT 'full',
    "themeMode" TEXT NOT NULL DEFAULT 'light',
    "sidebarMode" TEXT NOT NULL DEFAULT 'default',
    "language" TEXT NOT NULL DEFAULT 'en',
    "loginAt" TIMESTAMP(3),
    "loginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_attachments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "extension" TEXT,
    "size" INTEGER NOT NULL,
    "folder" TEXT NOT NULL,
    "authorId" TEXT,
    "appUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "workspace_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_translation_entries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "shardingKey" TEXT,
    "sourceText" TEXT NOT NULL,
    "sourceTextHash" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "destinationText" TEXT NOT NULL,
    "destinationLang" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_translation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "im_whatsapp_accounts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "lid" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "hijackWorkspaceMemberId" TEXT,
    "assignWorkspaceMemberId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "im_whatsapp_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "im_whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "imWhatsappAccountId" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "assignWorkspaceMemberId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "im_whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "im_whatsapp_messages" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "imWhatsappAccountId" TEXT NOT NULL,
    "imWhatsappConversationId" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "participant" TEXT,
    "participantAlt" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "im_whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "im_whatsapp_participants" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "imWhatsappAccountId" TEXT NOT NULL,
    "lid" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "im_whatsapp_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "im_event_outbox" (
    "seq" SERIAL NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "publishAttempts" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "im_event_outbox_pkey" PRIMARY KEY ("seq")
);

-- CreateTable
CREATE TABLE "im_command_outbox" (
    "seq" SERIAL NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "conversationId" TEXT,
    "commandType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "ackedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "im_command_outbox_pkey" PRIMARY KEY ("seq")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_shardingKey_key" ON "workspaces"("shardingKey");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_shardingSeq_key" ON "workspaces"("shardingSeq");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_subdomain_key" ON "workspaces"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_inviteCode_key" ON "workspaces"("inviteCode");

-- CreateIndex
CREATE INDEX "user_workspaces_userId_idx" ON "user_workspaces"("userId");

-- CreateIndex
CREATE INDEX "user_workspaces_workspaceId_idx" ON "user_workspaces"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_workspaces_userId_workspaceId_key" ON "user_workspaces"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verifications_email_type_isUsed_idx" ON "email_verifications"("email", "type", "isUsed");

-- CreateIndex
CREATE INDEX "login_attempts_identifier_identifierType_idx" ON "login_attempts"("identifier", "identifierType");

-- CreateIndex
CREATE UNIQUE INDEX "configs_key_key" ON "configs"("key");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "workspace_attachments_workspaceId_deletedAt_idx" ON "workspace_attachments"("workspaceId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_translation_entries_workspaceId_sourceLang_destin_key" ON "workspace_translation_entries"("workspaceId", "sourceLang", "destinationLang", "sourceTextHash");

-- CreateIndex
CREATE INDEX "im_whatsapp_accounts_workspaceId_jid_idx" ON "im_whatsapp_accounts"("workspaceId", "jid");

-- CreateIndex
CREATE INDEX "im_whatsapp_accounts_workspaceId_assignWorkspaceMemberId_idx" ON "im_whatsapp_accounts"("workspaceId", "assignWorkspaceMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "im_whatsapp_accounts_workspaceId_lid_key" ON "im_whatsapp_accounts"("workspaceId", "lid");

-- CreateIndex
CREATE INDEX "im_whatsapp_conversations_workspaceId_assignWorkspaceMember_idx" ON "im_whatsapp_conversations"("workspaceId", "assignWorkspaceMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "im_whatsapp_conversations_workspaceId_imWhatsappAccountId_j_key" ON "im_whatsapp_conversations"("workspaceId", "imWhatsappAccountId", "jid");

-- CreateIndex
CREATE INDEX "im_whatsapp_messages_workspaceId_imWhatsappConversationId_c_idx" ON "im_whatsapp_messages"("workspaceId", "imWhatsappConversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "im_whatsapp_messages_workspaceId_imWhatsappAccountId_fromMe_key" ON "im_whatsapp_messages"("workspaceId", "imWhatsappAccountId", "fromMe", "remoteJid", "messageId");

-- CreateIndex
CREATE INDEX "im_whatsapp_participants_workspaceId_imWhatsappAccountId_ji_idx" ON "im_whatsapp_participants"("workspaceId", "imWhatsappAccountId", "jid");

-- CreateIndex
CREATE UNIQUE INDEX "im_whatsapp_participants_workspaceId_imWhatsappAccountId_li_key" ON "im_whatsapp_participants"("workspaceId", "imWhatsappAccountId", "lid");

-- CreateIndex
CREATE UNIQUE INDEX "im_event_outbox_eventId_key" ON "im_event_outbox"("eventId");

-- CreateIndex
CREATE INDEX "im_event_outbox_workspaceId_publishedAt_seq_idx" ON "im_event_outbox"("workspaceId", "publishedAt", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "im_command_outbox_commandId_key" ON "im_command_outbox"("commandId");

-- CreateIndex
CREATE INDEX "im_command_outbox_workspaceId_provider_accountId_status_seq_idx" ON "im_command_outbox"("workspaceId", "provider", "accountId", "status", "seq");

-- AddForeignKey
ALTER TABLE "user_workspaces" ADD CONSTRAINT "user_workspaces_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workspaces" ADD CONSTRAINT "user_workspaces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_attachments" ADD CONSTRAINT "workspace_attachments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_translation_entries" ADD CONSTRAINT "workspace_translation_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_accounts" ADD CONSTRAINT "im_whatsapp_accounts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_conversations" ADD CONSTRAINT "im_whatsapp_conversations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_conversations" ADD CONSTRAINT "im_whatsapp_conversations_imWhatsappAccountId_fkey" FOREIGN KEY ("imWhatsappAccountId") REFERENCES "im_whatsapp_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_messages" ADD CONSTRAINT "im_whatsapp_messages_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_messages" ADD CONSTRAINT "im_whatsapp_messages_imWhatsappAccountId_fkey" FOREIGN KEY ("imWhatsappAccountId") REFERENCES "im_whatsapp_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_messages" ADD CONSTRAINT "im_whatsapp_messages_imWhatsappConversationId_fkey" FOREIGN KEY ("imWhatsappConversationId") REFERENCES "im_whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_participants" ADD CONSTRAINT "im_whatsapp_participants_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_whatsapp_participants" ADD CONSTRAINT "im_whatsapp_participants_imWhatsappAccountId_fkey" FOREIGN KEY ("imWhatsappAccountId") REFERENCES "im_whatsapp_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_event_outbox" ADD CONSTRAINT "im_event_outbox_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "im_command_outbox" ADD CONSTRAINT "im_command_outbox_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

