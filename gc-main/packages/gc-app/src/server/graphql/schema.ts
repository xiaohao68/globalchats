import { Prisma, type User, type Workspace } from "@prisma/client";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import { GraphQLError } from "graphql";
import { prisma } from "@/server/lib/prisma";
import { createShardingKey } from "@/server/lib/sharding";
import { hashPassword, signAccessToken, verifyPassword, type SessionPayload } from "@/server/lib/session";

interface GraphQLContext {
  session: SessionPayload | null;
}

type ConnectionInput = {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
};

type AuthenticatedContext = {
  session: SessionPayload;
};

type WorkspaceContext = {
  workspace: Workspace;
  membership: {
    id: string;
    role: string;
    isManager: boolean;
  };
  user: User;
};

const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON

  type Query {
    me: AuthUser
    workspace: WorkspaceOperations!
    workspaceInvite(code: String!): WorkspaceInvitePreview!
    adminTables: [AdminTableMeta!]!
    adminTableRows(input: AdminTableRowsInput!): AdminTableRowsPage!
    configs: [AdminConfigItem!]!
    im: ImOperations!
    imtp: ImtpQuery!
  }

  type Mutation {
    login(input: LoginInput!): AuthLoginPayload!
    register(input: RegisterInput!): AuthRegisterPayload!
    createWorkspace(input: CreateWorkspaceInput!): AuthWorkspaceSummary!
    acceptWorkspaceInvite(code: String!): WorkspaceInviteAcceptResult!
    workspace: WorkspaceOperations!
    createAdminConfig(input: CreateAdminConfigInput!): AdminConfigItem!
    updateConfig(id: ID!, input: UpdateConfigInput!): AdminConfigItem!
    deleteAdminConfig(id: ID!): Boolean!
    im: ImOperations!
  }

  input LoginInput {
    email: String!
    password: String!
    captchaToken: String
  }

  input RegisterInput {
    email: String!
    password: String!
    username: String
    inviteCode: String
    avatar: String
    captchaToken: String
    verificationCode: String
  }

  input CreateWorkspaceInput {
    displayName: String!
  }

  type AuthUser {
    id: ID!
    email: String!
    username: String
    avatar: String
    isAdmin: Boolean!
    currentWorkspace: AuthCurrentWorkspace
    workspaces: [AuthWorkspaceSummary!]!
  }

  type AuthCurrentWorkspace {
    id: ID!
    shardingKey: String!
    displayName: String!
    status: String!
    logo: String
    role: String!
  }

  type AuthWorkspaceSummary {
    id: ID!
    displayName: String!
    logo: String
    role: String!
    isCurrent: Boolean
    accessToken: String!
  }

  type AuthLoginPayload {
    accessToken: String!
    user: AuthUser!
    workspaces: [AuthWorkspaceSummary!]!
    requiresSelection: Boolean!
  }

  type AuthRegisterPayload {
    accessToken: String!
    user: AuthUser!
    workspaces: [AuthWorkspaceSummary!]!
    requiresSelection: Boolean!
  }

  type WorkspaceOperations {
    members: [WorkspaceMemberItem!]!
    inviteLink: WorkspaceInviteLink!
    setInviteLinkEnabled(enabled: Boolean!): WorkspaceInviteLink!
    regenerateInviteLink: WorkspaceInviteLink!
    updateMember(input: UpdateWorkspaceMemberInput!): WorkspaceMemberItem!
    updateMemberPreferences(input: UpdateWorkspaceMemberPreferencesInput!): WorkspaceMemberItem!
    updateGeneral(input: UpdateWorkspaceGeneralInput!): WorkspaceOverview!
    updateMemberRole(input: UpdateWorkspaceMemberRoleInput!): WorkspaceMemberItem!
    deleteMember(workspaceMemberId: ID!): Boolean!
  }

  type WorkspaceOverview {
    id: ID!
    displayName: String!
    logo: String
  }

  type WorkspaceInviteLink {
    code: String
    path: String
    enabled: Boolean!
  }

  type WorkspaceInvitePreview {
    status: String!
    workspaceDisplayName: String
    path: String
  }

  type WorkspaceInviteAcceptResult {
    workspaceId: ID!
    workspaceDisplayName: String!
    joined: Boolean!
    role: String!
  }

  type WorkspaceMemberItem {
    id: ID!
    userId: String!
    email: String!
    name: String
    bio: String
    themePreset: String
    themeRadius: String
    themeScale: String
    themeContentLayout: String
    themeMode: String
    sidebarMode: String
    language: String
    role: String!
    status: String!
    invitedAt: DateTime
    joinedAt: DateTime
    declinedAt: DateTime
  }

  input UpdateWorkspaceMemberInput {
    workspaceMemberId: ID!
    name: String
    bio: String
    status: String
  }

  input UpdateWorkspaceMemberPreferencesInput {
    workspaceMemberId: ID!
    themePreset: String
    themeRadius: String
    themeScale: String
    themeContentLayout: String
    themeMode: String
    sidebarMode: String
    language: String
  }

  input UpdateWorkspaceGeneralInput {
    displayName: String!
    logo: String
  }

  input UpdateWorkspaceMemberRoleInput {
    workspaceMemberId: ID!
    role: String!
  }

  type AdminTableMeta {
    name: String!
    rowCount: Int!
  }

  input AdminTableRowsInput {
    tableName: String!
    page: Int
    pageSize: Int
  }

  type AdminTableColumn {
    name: String!
    type: String!
    notNull: Boolean!
    pk: Boolean!
  }

  type AdminTableRow {
    values: JSON!
  }

  type AdminTableRowsPage {
    tableName: String!
    page: Int!
    pageSize: Int!
    totalCount: Int!
    totalPages: Int!
    columns: [AdminTableColumn!]!
    rows: [AdminTableRow!]!
  }

  type AdminConfigItem {
    id: ID!
    key: String!
    value: String!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateAdminConfigInput {
    key: String!
    value: String!
    description: String
  }

  input UpdateConfigInput {
    key: String
    value: String
    description: String
  }

  type ImOperations {
    whatsapp: ImWhatsappOperations!
    login(input: ImLoginInput!): ImLoginPayload!
  }

  input ImLoginInput {
    email: String!
    password: String!
    captchaToken: String
  }

  type ImLoginPayload {
    imUsers: [ImLoginUser!]!
  }

  type ImLoginUser {
    accessToken: String!
    imUser: ImUser!
  }

  type ImUser {
    id: ID!
    username: String
    name: String
    wsMemberId: String
    loginAt: String
    loginIp: String
    position: String
    createdAt: String
    updatedAt: String
    deletedAt: String
  }

  type ImWhatsappOperations {
    accounts(input: ImWhatsappAccountConnectionInput): ImWhatsappAccountConnection!
    conversations(input: ImWhatsappConversationConnectionInput): ImWhatsappConversationConnection!
    messages(input: ImWhatsappMessageConnectionInput): ImWhatsappMessageConnection!
    updateAccount(input: ImWhatsappUpdateAccountInput!): ImWhatsappAccountUpdatePayload!
    updateConversation(input: ImWhatsappUpdateConversationInput!): ImWhatsappConversationUpdatePayload!
    listAggregateConversations(input: ImWhatsappListAggregateConversationsInput): [ImAggregateConversation!]!
    listAggregateMessages(input: ImWhatsappListAggregateMessagesInput!): [ImAggregateMessage!]!
    sendAggregateMessage(input: ImWhatsappSendAggregateMessageInput!): ImAggregateSendMessageResult!
  }

  input ImWhatsappAccountConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
    search: String
  }

  input ImWhatsappConversationConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
    accountId: ID!
    search: String
  }

  input ImWhatsappMessageConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
    accountId: ID!
    conversationId: ID!
  }

  input ImWhatsappUpdateAccountInput {
    accountId: ID!
    assignWorkspaceMemberId: ID
    hijackWorkspaceMemberId: ID
  }

  input ImWhatsappUpdateConversationInput {
    conversationId: ID!
    assignWorkspaceMemberId: ID
  }

  input ImWhatsappListAggregateConversationsInput {
    scope: String
    search: String
    limit: Int
  }

  input ImWhatsappListAggregateMessagesInput {
    conversationId: ID!
    scope: String
    limit: Int
  }

  input ImWhatsappSendAggregateMessageInput {
    conversationId: ID!
    text: String!
  }

  type ConnectionPageInfo {
    hasPreviousPage: Boolean!
    hasNextPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type ImWhatsappAccountEdge {
    cursor: String!
    nodeId: ID!
    lid: String!
    jid: String!
    hijackWorkspaceMemberId: String
    assignWorkspaceMemberId: String
    data: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImWhatsappConversationEdge {
    cursor: String!
    nodeId: ID!
    imWhatsappAccountId: ID!
    jid: String!
    assignWorkspaceMemberId: String
    data: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImWhatsappMessageEdge {
    cursor: String!
    nodeId: ID!
    imWhatsappAccountId: ID!
    imWhatsappConversationId: ID!
    fromMe: Boolean!
    remoteJid: String!
    messageId: String!
    participant: String
    participantAlt: String
    data: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImWhatsappAccountConnection {
    edges: [ImWhatsappAccountEdge!]!
    pageInfo: ConnectionPageInfo!
    totalCount: Int!
  }

  type ImWhatsappConversationConnection {
    edges: [ImWhatsappConversationEdge!]!
    pageInfo: ConnectionPageInfo!
    totalCount: Int!
  }

  type ImWhatsappMessageConnection {
    edges: [ImWhatsappMessageEdge!]!
    pageInfo: ConnectionPageInfo!
    totalCount: Int!
  }

  type ImWhatsappAccountUpdatePayload {
    accountId: ID!
    assignWorkspaceMemberId: String
    hijackWorkspaceMemberId: String
    updatedAt: DateTime!
  }

  type ImWhatsappConversationUpdatePayload {
    conversationId: ID!
    assignWorkspaceMemberId: String
    updatedAt: DateTime!
  }

  type ImAggregateConversation {
    provider: String!
    conversationId: ID!
    accountId: ID!
    title: String!
    summary: String!
    conversationJid: String!
    accountJid: String
    lastMessagePreview: String
    lastMessageDirection: String
    lastMessageStatus: String
    lastMessageAt: DateTime
    conversationAssigneeMemberId: String
    accountAssigneeMemberId: String
    visibilitySource: String!
    updatedAt: DateTime!
  }

  type ImAggregateMessage {
    provider: String!
    rowId: String!
    conversationId: ID!
    accountId: ID!
    providerMessageId: String!
    direction: String!
    preview: String
    status: String
    senderId: String
    participant: String
    participantAlt: String
    remoteJid: String!
    raw: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImAggregateSendMessageResult {
    success: Boolean!
    commandId: String!
    accountId: ID!
    conversationId: ID!
    scheduledAt: DateTime!
  }

  type ImtpQuery {
    whatsapp: ImtpWhatsappOperations!
  }

  type ImtpWhatsappOperations {
    accounts(input: ImtpWhatsAppAccountConnectionInput): ImtpWhatsAppAccountConnection!
    conversations(input: ImtpWhatsAppConversationConnectionInput): ImtpWhatsAppConversationConnection!
    messages(input: ImtpWhatsAppMessageConnectionInput): ImtpWhatsAppMessageConnection!
  }

  input ImtpWhatsAppAccountConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
    search: String
  }

  input ImtpWhatsAppConversationConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
    accountId: ID!
    search: String
  }

  input ImtpWhatsAppMessageConnectionInput {
    first: Int
    after: String
    last: Int
    before: String
    accountId: ID!
    conversationId: ID!
  }

  type ImtpWhatsAppAccountEdge {
    nodeId: ID!
    lid: String!
    jid: String!
    hijackImUserId: String
    assignImUserId: String
    data: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImtpWhatsAppConversationEdge {
    nodeId: ID!
    jid: String!
    imtpWhatsappAccountId: ID!
    data: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImtpWhatsAppMessageEdge {
    nodeId: ID!
    messageId: String!
    fromMe: Boolean!
    remoteJid: String!
    participant: String
    participantAlt: String
    imtpWhatsappAccountId: ID!
    imtpWhatsappConversationId: ID!
    data: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ImtpWhatsAppAccountConnection {
    edges: [ImtpWhatsAppAccountEdge!]!
    pageInfo: ConnectionPageInfo!
    totalCount: Int!
  }

  type ImtpWhatsAppConversationConnection {
    edges: [ImtpWhatsAppConversationEdge!]!
    pageInfo: ConnectionPageInfo!
    totalCount: Int!
  }

  type ImtpWhatsAppMessageConnection {
    edges: [ImtpWhatsAppMessageEdge!]!
    pageInfo: ConnectionPageInfo!
    totalCount: Int!
  }
`;

function encodeCursor(index: number): string {
  return Buffer.from(String(index)).toString("base64url");
}

function decodeCursor(cursor?: string | null): number {
  if (!cursor) return -1;

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const index = Number(decoded);
    return Number.isNaN(index) ? -1 : index;
  } catch {
    return -1;
  }
}

function applyConnection<T>(items: T[], input: ConnectionInput | null | undefined): {
  items: Array<{ node: T; cursor: string }>;
  pageInfo: {
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
} {
  const totalCount = items.length;
  const first = input?.first ?? null;
  const last = input?.last ?? null;
  const afterIndex = decodeCursor(input?.after);
  const beforeIndex = decodeCursor(input?.before);

  let startIndex = afterIndex + 1;
  let endIndex = beforeIndex >= 0 ? beforeIndex : totalCount;

  if (first !== null && first !== undefined) {
    endIndex = Math.min(endIndex, startIndex + first);
  } else if (last !== null && last !== undefined) {
    startIndex = Math.max(startIndex, endIndex - last);
  }

  const slice = items.slice(startIndex, endIndex);
  const edges = slice.map((node, sliceIndex) => ({
    node,
    cursor: encodeCursor(startIndex + sliceIndex),
  }));

  return {
    items: edges,
    totalCount,
    pageInfo: {
      hasPreviousPage: startIndex > 0,
      hasNextPage: endIndex < totalCount,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
}

function createError(message: string, code: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code },
  });
}

function normalizeResolverError(error: unknown): never {
  if (error instanceof GraphQLError) {
    throw error;
  }

  if (isDatabaseUnavailableError(error)) {
    throw createError("Database is unavailable", "SERVICE_UNAVAILABLE");
  }

  throw error;
}

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001" || error.code === "P1002";
  }

  if (error instanceof Error) {
    return error.message.includes("Can't reach database server");
  }

  return false;
}

function requireSession(context: GraphQLContext): AuthenticatedContext {
  if (!context.session) {
    throw createError("Unauthorized", "UNAUTHORIZED");
  }

  return { session: context.session };
}

async function getUserById(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw createError("User not found", "UNAUTHORIZED");
  }
  return user;
}

async function resolveWorkspaceContext(context: GraphQLContext): Promise<WorkspaceContext> {
  const { session } = requireSession(context);
  const user = await getUserById(session.userId);
  const workspaceId = session.workspaceId;

  if (!workspaceId) {
    throw createError("Workspace not selected", "UNAUTHORIZED");
  }

  const membership = await prisma.userWorkspace.findFirst({
    where: { userId: session.userId, workspaceId },
  });

  if (!membership) {
    throw createError("Workspace access denied", "FORBIDDEN");
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    throw createError("Workspace not found", "NOT_FOUND");
  }

  return {
    user,
    workspace,
    membership: {
      id: membership.id,
      role: membership.role,
      isManager: membership.role === "OWNER" || membership.role === "ADMIN" || user.isAdmin,
    },
  };
}

async function requireAdmin(context: GraphQLContext): Promise<User> {
  const { session } = requireSession(context);
  const user = await getUserById(session.userId);
  if (!user.isAdmin) {
    throw createError("Forbidden", "FORBIDDEN");
  }
  return user;
}

function formatInvitePath(code: string | null): string | null {
  if (!code) return null;
  return `/console/invite/${code}`;
}

async function buildWorkspaceSummaries(userId: string, currentWorkspaceId?: string | null) {
  const memberships = await prisma.userWorkspace.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    memberships.map(async (membership) => ({
      id: membership.workspace.id,
      displayName: membership.workspace.displayName,
      logo: membership.workspace.logo,
      role: membership.role,
      isCurrent: membership.workspaceId === currentWorkspaceId,
      accessToken: await signAccessToken({
        userId,
        workspaceId: membership.workspaceId,
        isAdmin: false,
      }),
    })),
  );
}

async function buildAuthUser(user: User, currentWorkspaceId?: string | null) {
  const workspaces = await buildWorkspaceSummaries(user.id, currentWorkspaceId);
  const currentSummary = workspaces.find((item) => item.id === currentWorkspaceId) ?? workspaces[0] ?? null;
  const currentWorkspace = currentSummary
    ? await prisma.workspace.findUnique({ where: { id: currentSummary.id } })
    : null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    currentWorkspace: currentWorkspace && currentSummary
      ? {
          id: currentWorkspace.id,
          shardingKey: currentWorkspace.shardingKey,
          displayName: currentWorkspace.displayName,
          status: currentWorkspace.status,
          logo: currentWorkspace.logo,
          role: currentSummary.role,
        }
      : null,
    workspaces,
  };
}

async function createWorkspaceMembership(args: {
  userId: string;
  workspaceId: string;
  role: string;
}): Promise<void> {
  const userWorkspaceId = crypto.randomUUID();
  const workspaceMemberId = crypto.randomUUID();
  const now = new Date();

  await prisma.userWorkspace.create({
    data: {
      id: userWorkspaceId,
      userId: args.userId,
      workspaceId: args.workspaceId,
      role: args.role,
      createdAt: now,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      id: workspaceMemberId,
      userId: args.userId,
      workspaceId: args.workspaceId,
      role: args.role,
      status: "ACTIVE",
      invitedAt: now,
      joinedAt: now,
    },
  });
}

async function resolveWorkspaceMembers(workspaceId: string) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return members.map((member) => ({
    id: member.id,
    userId: member.userId,
    email: member.user.email,
    name: member.name || member.user.username || member.user.email,
    bio: member.bio,
    themePreset: member.themePreset,
    themeRadius: member.themeRadius,
    themeScale: member.themeScale,
    themeContentLayout: member.themeContentLayout,
    themeMode: member.themeMode,
    sidebarMode: member.sidebarMode,
    language: member.language,
    role: member.role,
    status: member.status,
    invitedAt: member.invitedAt,
    joinedAt: member.joinedAt,
    declinedAt: member.declinedAt,
  }));
}

function normalizeSearch(value?: string | null): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function assertTableName(tableName: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
    throw createError("Invalid table name", "BAD_USER_INPUT");
  }
  return tableName;
}

function resolveMessagePreview(data: Prisma.JsonValue | null | undefined): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const record = data as Record<string, unknown>;
  const directText = typeof record.text === "string" ? record.text : null;
  const preview = typeof record.preview === "string" ? record.preview : null;
  return directText ?? preview;
}

const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Query: {
    me: async (_root: unknown, _args: unknown, context: GraphQLContext) => {
      const { session } = requireSession(context);
      const user = await getUserById(session.userId);
      return buildAuthUser(user, session.workspaceId);
    },
    workspace: () => ({}),
    workspaceInvite: async (_root: unknown, args: { code: string }) => {
      const workspace = await prisma.workspace.findFirst({
        where: { inviteCode: args.code, deletedAt: null },
      });

      if (!workspace || !workspace.inviteCodeEnabled) {
        return {
          status: "NOT_FOUND",
          workspaceDisplayName: null,
          path: null,
        };
      }

      return {
        status: "ACTIVE",
        workspaceDisplayName: workspace.displayName,
        path: formatInvitePath(workspace.inviteCode),
      };
    },
    adminTables: async (_root: unknown, _args: unknown, context: GraphQLContext) => {
      await requireAdmin(context);
      const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename ASC
      `);

      const entries = await Promise.all(
        tables.map(async (table) => {
          const safeName = assertTableName(table.tablename);
          const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
            `SELECT COUNT(*)::bigint AS count FROM "${safeName}"`,
          );
          const countValue = countRows[0]?.count ?? 0;
          return {
            name: safeName,
            rowCount: Number(countValue),
          };
        }),
      );

      return entries;
    },
    adminTableRows: async (_root: unknown, args: { input: { tableName: string; page?: number | null; pageSize?: number | null } }, context: GraphQLContext) => {
      await requireAdmin(context);
      const tableName = assertTableName(args.input.tableName);
      const page = Math.max(1, args.input.page ?? 1);
      const pageSize = Math.max(1, Math.min(100, args.input.pageSize ?? 20));
      const offset = (page - 1) * pageSize;

      const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string; data_type: string; is_nullable: string; ordinal_position: number }>>(`
        SELECT column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position ASC
      `);
      const primaryKeys = await prisma.$queryRawUnsafe<Array<{ attname: string }>>(`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'public."${tableName}"'::regclass
          AND i.indisprimary
      `);
      const totalCountRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${tableName}"`,
      );
      const totalCount = Number(totalCountRows[0]?.count ?? 0);
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT * FROM "${tableName}" OFFSET ${offset} LIMIT ${pageSize}`,
      );

      return {
        tableName,
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        columns: columns.map((column) => ({
          name: column.column_name,
          type: column.data_type,
          notNull: column.is_nullable === "NO",
          pk: primaryKeys.some((item) => item.attname === column.column_name),
        })),
        rows: rows.map((row) => ({ values: row })),
      };
    },
    configs: async (_root: unknown, _args: unknown, context: GraphQLContext) => {
      await requireAdmin(context);
      return prisma.config.findMany({ orderBy: { key: "asc" } });
    },
    im: () => ({}),
    imtp: () => ({}),
  },
  Mutation: {
    login: async (_root: unknown, args: { input: { email: string; password: string } }) => {
      try {
        const email = args.input.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw createError("Invalid email or password", "UNAUTHORIZED");
        }

        const passwordValid = await verifyPassword(args.input.password, user.passwordHash);
        if (!passwordValid) {
          throw createError("Invalid email or password", "UNAUTHORIZED");
        }

        const workspaces = await buildWorkspaceSummaries(user.id);
        const currentWorkspaceId = workspaces[0]?.id ?? null;
        const accessToken = await signAccessToken({
          userId: user.id,
          workspaceId: currentWorkspaceId,
          isAdmin: user.isAdmin,
        });

        return {
          accessToken,
          user: await buildAuthUser(user, currentWorkspaceId),
          workspaces,
          requiresSelection: workspaces.length > 1,
        };
      } catch (error) {
        normalizeResolverError(error);
      }
    },
    register: async (_root: unknown, args: { input: { email: string; password: string; username?: string | null; avatar?: string | null; inviteCode?: string | null } }) => {
      try {
        const email = args.input.email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          throw createError("Email already in use", "BAD_USER_INPUT");
        }

        const passwordHash = await hashPassword(args.input.password);
        const user = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email,
            username: args.input.username?.trim() || email.split("@")[0],
            avatar: args.input.avatar?.trim() || null,
            passwordHash,
            isEmailVerified: true,
            status: "ACTIVE",
            isAdmin: false,
          },
        });

        let currentWorkspaceId: string | null = null;
        if (args.input.inviteCode) {
          const workspace = await prisma.workspace.findFirst({
            where: { inviteCode: args.input.inviteCode, inviteCodeEnabled: true, deletedAt: null },
          });

          if (!workspace) {
            throw createError("Invite code is invalid", "BAD_USER_INPUT");
          }

          await createWorkspaceMembership({
            userId: user.id,
            workspaceId: workspace.id,
            role: "MEMBER",
          });
          currentWorkspaceId = workspace.id;
        }

        const workspaces = await buildWorkspaceSummaries(user.id, currentWorkspaceId);
        const accessToken = await signAccessToken({
          userId: user.id,
          workspaceId: currentWorkspaceId ?? workspaces[0]?.id ?? null,
          isAdmin: user.isAdmin,
        });

        return {
          accessToken,
          user: await buildAuthUser(user, currentWorkspaceId ?? workspaces[0]?.id ?? null),
          workspaces,
          requiresSelection: workspaces.length > 1,
        };
      } catch (error) {
        normalizeResolverError(error);
      }
    },
    createWorkspace: async (_root: unknown, args: { input: { displayName: string } }, context: GraphQLContext) => {
      try {
        const { session } = requireSession(context);
        const user = await getUserById(session.userId);
        const displayName = args.input.displayName.trim();
        if (!displayName) {
          throw createError("Workspace name is required", "BAD_USER_INPUT");
        }

        const workspace = await prisma.workspace.create({
          data: {
            id: crypto.randomUUID(),
            shardingKey: createShardingKey(),
            displayName,
            status: "ACTIVE",
            inviteCode: createShardingKey(),
            inviteCodeEnabled: true,
          },
        });

        await createWorkspaceMembership({
          userId: user.id,
          workspaceId: workspace.id,
          role: "OWNER",
        });

        return {
          id: workspace.id,
          displayName: workspace.displayName,
          logo: workspace.logo,
          role: "OWNER",
          isCurrent: true,
          accessToken: await signAccessToken({
            userId: user.id,
            workspaceId: workspace.id,
            isAdmin: user.isAdmin,
          }),
        };
      } catch (error) {
        normalizeResolverError(error);
      }
    },
    acceptWorkspaceInvite: async (_root: unknown, args: { code: string }, context: GraphQLContext) => {
      const { session } = requireSession(context);
      const workspace = await prisma.workspace.findFirst({
        where: { inviteCode: args.code, inviteCodeEnabled: true, deletedAt: null },
      });
      if (!workspace) {
        throw createError("Invite code is invalid", "BAD_USER_INPUT");
      }

      const existingMembership = await prisma.userWorkspace.findFirst({
        where: { userId: session.userId, workspaceId: workspace.id },
      });

      if (!existingMembership) {
        await createWorkspaceMembership({
          userId: session.userId,
          workspaceId: workspace.id,
          role: "MEMBER",
        });
      }

      return {
        workspaceId: workspace.id,
        workspaceDisplayName: workspace.displayName,
        joined: true,
        role: existingMembership?.role ?? "MEMBER",
      };
    },
    workspace: () => ({}),
    createAdminConfig: async (_root: unknown, args: { input: { key: string; value: string; description?: string | null } }, context: GraphQLContext) => {
      await requireAdmin(context);
      return prisma.config.create({
        data: {
          id: crypto.randomUUID(),
          key: args.input.key.trim(),
          value: args.input.value,
          description: args.input.description?.trim() || null,
        },
      });
    },
    updateConfig: async (_root: unknown, args: { id: string; input: { key?: string | null; value?: string | null; description?: string | null } }, context: GraphQLContext) => {
      await requireAdmin(context);
      return prisma.config.update({
        where: { id: args.id },
        data: {
          key: args.input.key?.trim() || undefined,
          value: args.input.value ?? undefined,
          description: args.input.description === undefined ? undefined : args.input.description?.trim() || null,
        },
      });
    },
    deleteAdminConfig: async (_root: unknown, args: { id: string }, context: GraphQLContext) => {
      await requireAdmin(context);
      await prisma.config.delete({ where: { id: args.id } });
      return true;
    },
    im: () => ({}),
  },
  WorkspaceOperations: {
    members: async (_root: unknown, _args: unknown, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      return resolveWorkspaceMembers(workspaceContext.workspace.id);
    },
    inviteLink: async (_root: unknown, _args: unknown, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      return {
        code: workspaceContext.workspace.inviteCode,
        path: formatInvitePath(workspaceContext.workspace.inviteCode),
        enabled: workspaceContext.workspace.inviteCodeEnabled,
      };
    },
    setInviteLinkEnabled: async (_root: unknown, args: { enabled: boolean }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      if (!workspaceContext.membership.isManager) {
        throw createError("Forbidden", "FORBIDDEN");
      }
      const workspace = await prisma.workspace.update({
        where: { id: workspaceContext.workspace.id },
        data: { inviteCodeEnabled: args.enabled },
      });
      return {
        code: workspace.inviteCode,
        path: formatInvitePath(workspace.inviteCode),
        enabled: workspace.inviteCodeEnabled,
      };
    },
    regenerateInviteLink: async (_root: unknown, _args: unknown, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      if (!workspaceContext.membership.isManager) {
        throw createError("Forbidden", "FORBIDDEN");
      }
      const workspace = await prisma.workspace.update({
        where: { id: workspaceContext.workspace.id },
        data: { inviteCode: createShardingKey(), inviteCodeEnabled: true },
      });
      return {
        code: workspace.inviteCode,
        path: formatInvitePath(workspace.inviteCode),
        enabled: workspace.inviteCodeEnabled,
      };
    },
    updateMember: async (_root: unknown, args: { input: { workspaceMemberId: string; name?: string | null; bio?: string | null; status?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const updated = await prisma.workspaceMember.update({
        where: { id: args.input.workspaceMemberId },
        data: {
          name: args.input.name === undefined ? undefined : args.input.name?.trim() || null,
          bio: args.input.bio === undefined ? undefined : args.input.bio?.trim() || null,
          status: args.input.status ?? undefined,
        },
        include: { user: true },
      });
      if (updated.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Workspace member not found", "NOT_FOUND");
      }
      return {
        id: updated.id,
        userId: updated.userId,
        email: updated.user.email,
        name: updated.name,
        bio: updated.bio,
        themePreset: updated.themePreset,
        themeRadius: updated.themeRadius,
        themeScale: updated.themeScale,
        themeContentLayout: updated.themeContentLayout,
        themeMode: updated.themeMode,
        sidebarMode: updated.sidebarMode,
        language: updated.language,
        role: updated.role,
        status: updated.status,
        invitedAt: updated.invitedAt,
        joinedAt: updated.joinedAt,
        declinedAt: updated.declinedAt,
      };
    },
    updateMemberPreferences: async (_root: unknown, args: { input: { workspaceMemberId: string; themePreset?: string | null; themeRadius?: string | null; themeScale?: string | null; themeContentLayout?: string | null; themeMode?: string | null; sidebarMode?: string | null; language?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const updated = await prisma.workspaceMember.update({
        where: { id: args.input.workspaceMemberId },
        data: {
          themePreset: args.input.themePreset ?? undefined,
          themeRadius: args.input.themeRadius ?? undefined,
          themeScale: args.input.themeScale ?? undefined,
          themeContentLayout: args.input.themeContentLayout ?? undefined,
          themeMode: args.input.themeMode ?? undefined,
          sidebarMode: args.input.sidebarMode ?? undefined,
          language: args.input.language ?? undefined,
        },
        include: { user: true },
      });
      if (updated.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Workspace member not found", "NOT_FOUND");
      }
      return {
        id: updated.id,
        userId: updated.userId,
        email: updated.user.email,
        name: updated.name,
        bio: updated.bio,
        themePreset: updated.themePreset,
        themeRadius: updated.themeRadius,
        themeScale: updated.themeScale,
        themeContentLayout: updated.themeContentLayout,
        themeMode: updated.themeMode,
        sidebarMode: updated.sidebarMode,
        language: updated.language,
        role: updated.role,
        status: updated.status,
        invitedAt: updated.invitedAt,
        joinedAt: updated.joinedAt,
        declinedAt: updated.declinedAt,
      };
    },
    updateGeneral: async (_root: unknown, args: { input: { displayName: string; logo?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      if (!workspaceContext.membership.isManager) {
        throw createError("Forbidden", "FORBIDDEN");
      }
      return prisma.workspace.update({
        where: { id: workspaceContext.workspace.id },
        data: {
          displayName: args.input.displayName.trim(),
          logo: args.input.logo === undefined ? undefined : args.input.logo?.trim() || null,
        },
      });
    },
    updateMemberRole: async (_root: unknown, args: { input: { workspaceMemberId: string; role: string } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      if (!workspaceContext.membership.isManager) {
        throw createError("Forbidden", "FORBIDDEN");
      }
      const updated = await prisma.workspaceMember.update({
        where: { id: args.input.workspaceMemberId },
        data: { role: args.input.role },
        include: { user: true },
      });
      if (updated.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Workspace member not found", "NOT_FOUND");
      }
      await prisma.userWorkspace.updateMany({
        where: { workspaceId: workspaceContext.workspace.id, userId: updated.userId },
        data: { role: args.input.role },
      });
      return {
        id: updated.id,
        userId: updated.userId,
        email: updated.user.email,
        name: updated.name,
        bio: updated.bio,
        themePreset: updated.themePreset,
        themeRadius: updated.themeRadius,
        themeScale: updated.themeScale,
        themeContentLayout: updated.themeContentLayout,
        themeMode: updated.themeMode,
        sidebarMode: updated.sidebarMode,
        language: updated.language,
        role: updated.role,
        status: updated.status,
        invitedAt: updated.invitedAt,
        joinedAt: updated.joinedAt,
        declinedAt: updated.declinedAt,
      };
    },
    deleteMember: async (_root: unknown, args: { workspaceMemberId: string }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      if (!workspaceContext.membership.isManager) {
        throw createError("Forbidden", "FORBIDDEN");
      }
      const member = await prisma.workspaceMember.findUnique({ where: { id: args.workspaceMemberId } });
      if (!member || member.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Workspace member not found", "NOT_FOUND");
      }
      await prisma.workspaceMember.delete({ where: { id: args.workspaceMemberId } });
      await prisma.userWorkspace.deleteMany({
        where: { workspaceId: workspaceContext.workspace.id, userId: member.userId },
      });
      return true;
    },
  },
  ImOperations: {
    whatsapp: () => ({}),
    login: async (_root: unknown, args: { input: { email: string; password: string } }) => {
      try {
        const email = args.input.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw createError("Invalid email or password", "UNAUTHORIZED");
        }
        const passwordValid = await verifyPassword(args.input.password, user.passwordHash);
        if (!passwordValid) {
          throw createError("Invalid email or password", "UNAUTHORIZED");
        }
        const workspaces = await buildWorkspaceSummaries(user.id);
        const currentWorkspaceId = workspaces[0]?.id ?? null;
        const accessToken = await signAccessToken({
          userId: user.id,
          workspaceId: currentWorkspaceId,
          isAdmin: user.isAdmin,
        });
        return {
          imUsers: [
            {
              accessToken,
              imUser: {
                id: user.id,
                username: user.username,
                name: user.username,
                wsMemberId: null,
                loginAt: null,
                loginIp: null,
                position: null,
                createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
                updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
                deletedAt: null,
              },
            },
          ],
        };
      } catch (error) {
        normalizeResolverError(error);
      }
    },
  },
  ImWhatsappOperations: {
    accounts: async (_root: unknown, args: { input?: ConnectionInput & { search?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const search = normalizeSearch(args.input?.search);
      const items = await prisma.imWhatsappAccount.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          deletedAt: null,
          OR: search
            ? [
                { lid: { contains: search, mode: "insensitive" } },
                { jid: { contains: search, mode: "insensitive" } },
              ]
            : undefined,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      const connection = applyConnection(items, args.input);
      return {
        edges: connection.items.map(({ node, cursor }) => ({
          cursor,
          nodeId: node.id,
          lid: node.lid,
          jid: node.jid,
          hijackWorkspaceMemberId: node.hijackWorkspaceMemberId,
          assignWorkspaceMemberId: node.assignWorkspaceMemberId,
          data: node.data,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
    conversations: async (_root: unknown, args: { input?: ConnectionInput & { accountId: string; search?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const search = normalizeSearch(args.input?.search);
      const items = await prisma.imWhatsappConversation.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          imWhatsappAccountId: args.input?.accountId,
          deletedAt: null,
          jid: search ? { contains: search, mode: "insensitive" } : undefined,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      const connection = applyConnection(items, args.input);
      return {
        edges: connection.items.map(({ node, cursor }) => ({
          cursor,
          nodeId: node.id,
          imWhatsappAccountId: node.imWhatsappAccountId,
          jid: node.jid,
          assignWorkspaceMemberId: node.assignWorkspaceMemberId,
          data: node.data,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
    messages: async (_root: unknown, args: { input?: ConnectionInput & { accountId: string; conversationId: string } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const items = await prisma.imWhatsappMessage.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          imWhatsappAccountId: args.input?.accountId,
          imWhatsappConversationId: args.input?.conversationId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const connection = applyConnection(items, args.input);
      return {
        edges: connection.items.map(({ node, cursor }) => ({
          cursor,
          nodeId: node.id,
          imWhatsappAccountId: node.imWhatsappAccountId,
          imWhatsappConversationId: node.imWhatsappConversationId,
          fromMe: node.fromMe,
          remoteJid: node.remoteJid,
          messageId: node.messageId,
          participant: node.participant,
          participantAlt: node.participantAlt,
          data: node.data,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
    updateAccount: async (_root: unknown, args: { input: { accountId: string; assignWorkspaceMemberId?: string | null; hijackWorkspaceMemberId?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const updated = await prisma.imWhatsappAccount.update({
        where: { id: args.input.accountId },
        data: {
          assignWorkspaceMemberId:
            args.input.assignWorkspaceMemberId === undefined
              ? undefined
              : args.input.assignWorkspaceMemberId,
          hijackWorkspaceMemberId:
            args.input.hijackWorkspaceMemberId === undefined
              ? undefined
              : args.input.hijackWorkspaceMemberId,
        },
      });
      if (updated.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Account not found", "NOT_FOUND");
      }
      return {
        accountId: updated.id,
        assignWorkspaceMemberId: updated.assignWorkspaceMemberId,
        hijackWorkspaceMemberId: updated.hijackWorkspaceMemberId,
        updatedAt: updated.updatedAt,
      };
    },
    updateConversation: async (_root: unknown, args: { input: { conversationId: string; assignWorkspaceMemberId?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const updated = await prisma.imWhatsappConversation.update({
        where: { id: args.input.conversationId },
        data: {
          assignWorkspaceMemberId:
            args.input.assignWorkspaceMemberId === undefined
              ? undefined
              : args.input.assignWorkspaceMemberId,
        },
      });
      if (updated.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Conversation not found", "NOT_FOUND");
      }
      return {
        conversationId: updated.id,
        assignWorkspaceMemberId: updated.assignWorkspaceMemberId,
        updatedAt: updated.updatedAt,
      };
    },
    listAggregateConversations: async (_root: unknown, args: { input?: { scope?: string | null; search?: string | null; limit?: number | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspaceContext.workspace.id, userId: workspaceContext.user.id },
      });
      if (!member) {
        throw createError("Workspace member not found", "UNAUTHORIZED");
      }
      const scope = args.input?.scope === "ALL" && workspaceContext.membership.isManager ? "ALL" : "MINE";
      const search = normalizeSearch(args.input?.search);
      const conversations = await prisma.imWhatsappConversation.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          deletedAt: null,
          jid: search ? { contains: search, mode: "insensitive" } : undefined,
        },
        include: {
          account: true,
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: args.input?.limit ?? 50,
      });
      return conversations
        .filter((conversation) => {
          if (scope === "ALL") return true;
          return (
            conversation.assignWorkspaceMemberId === member.id ||
            conversation.account.assignWorkspaceMemberId === member.id
          );
        })
        .map((conversation) => {
          const latestMessage = conversation.messages[0];
          return {
            provider: "WHATSAPP",
            conversationId: conversation.id,
            accountId: conversation.imWhatsappAccountId,
            title: conversation.jid,
            summary: conversation.jid,
            conversationJid: conversation.jid,
            accountJid: conversation.account.jid,
            lastMessagePreview: resolveMessagePreview(latestMessage?.data),
            lastMessageDirection: latestMessage ? (latestMessage.fromMe ? "outbound" : "inbound") : null,
            lastMessageStatus: null,
            lastMessageAt: latestMessage?.createdAt ?? null,
            conversationAssigneeMemberId: conversation.assignWorkspaceMemberId,
            accountAssigneeMemberId: conversation.account.assignWorkspaceMemberId,
            visibilitySource: conversation.assignWorkspaceMemberId ? "conversation_assigned" : "account_assigned",
            updatedAt: conversation.updatedAt,
          };
        });
    },
    listAggregateMessages: async (_root: unknown, args: { input: { conversationId: string; scope?: string | null; limit?: number | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspaceContext.workspace.id, userId: workspaceContext.user.id },
      });
      if (!member) {
        throw createError("Workspace member not found", "UNAUTHORIZED");
      }
      const conversation = await prisma.imWhatsappConversation.findUnique({
        where: { id: args.input.conversationId },
        include: { account: true },
      });
      if (!conversation || conversation.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Conversation not found", "NOT_FOUND");
      }
      const scope = args.input.scope === "ALL" && workspaceContext.membership.isManager ? "ALL" : "MINE";
      if (
        scope === "MINE" &&
        conversation.assignWorkspaceMemberId !== member.id &&
        conversation.account.assignWorkspaceMemberId !== member.id
      ) {
        throw createError("Forbidden", "FORBIDDEN");
      }
      const messages = await prisma.imWhatsappMessage.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          imWhatsappConversationId: conversation.id,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: args.input.limit ?? 100,
      });
      return messages.map((message) => ({
        provider: "WHATSAPP",
        rowId: message.id,
        conversationId: message.imWhatsappConversationId,
        accountId: message.imWhatsappAccountId,
        providerMessageId: message.messageId,
        direction: message.fromMe ? "outbound" : "inbound",
        preview: resolveMessagePreview(message.data),
        status: null,
        senderId: null,
        participant: message.participant,
        participantAlt: message.participantAlt,
        remoteJid: message.remoteJid,
        raw: message.data,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      }));
    },
    sendAggregateMessage: async (_root: unknown, args: { input: { conversationId: string; text: string } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const conversation = await prisma.imWhatsappConversation.findUnique({
        where: { id: args.input.conversationId },
      });
      if (!conversation || conversation.workspaceId !== workspaceContext.workspace.id) {
        throw createError("Conversation not found", "NOT_FOUND");
      }
      const commandId = crypto.randomUUID();
      const scheduledAt = new Date();
      await prisma.imCommandOutbox.create({
        data: {
          workspaceId: workspaceContext.workspace.id,
          commandId,
          provider: "WHATSAPP",
          accountId: conversation.imWhatsappAccountId,
          conversationId: conversation.id,
          commandType: "SEND_MESSAGE",
          payload: { text: args.input.text },
          status: "PENDING",
          occurredAt: scheduledAt,
        },
      });
      return {
        success: true,
        commandId,
        accountId: conversation.imWhatsappAccountId,
        conversationId: conversation.id,
        scheduledAt,
      };
    },
  },
  ImtpQuery: {
    whatsapp: () => ({}),
  },
  ImtpWhatsappOperations: {
    accounts: async (_root: unknown, args: { input?: ConnectionInput & { search?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const search = normalizeSearch(args.input?.search);
      const items = await prisma.imWhatsappAccount.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          deletedAt: null,
          OR: search
            ? [
                { lid: { contains: search, mode: "insensitive" } },
                { jid: { contains: search, mode: "insensitive" } },
              ]
            : undefined,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      const connection = applyConnection(items, args.input);
      return {
        edges: connection.items.map(({ node }) => ({
          nodeId: node.id,
          lid: node.lid,
          jid: node.jid,
          hijackImUserId: node.hijackWorkspaceMemberId,
          assignImUserId: node.assignWorkspaceMemberId,
          data: node.data,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
    conversations: async (_root: unknown, args: { input?: ConnectionInput & { accountId: string; search?: string | null } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const search = normalizeSearch(args.input?.search);
      const items = await prisma.imWhatsappConversation.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          imWhatsappAccountId: args.input?.accountId,
          deletedAt: null,
          jid: search ? { contains: search, mode: "insensitive" } : undefined,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      });
      const connection = applyConnection(items, args.input);
      return {
        edges: connection.items.map(({ node }) => ({
          nodeId: node.id,
          imtpWhatsappAccountId: node.imWhatsappAccountId,
          jid: node.jid,
          data: node.data,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
    messages: async (_root: unknown, args: { input?: ConnectionInput & { accountId: string; conversationId: string } }, context: GraphQLContext) => {
      const workspaceContext = await resolveWorkspaceContext(context);
      const items = await prisma.imWhatsappMessage.findMany({
        where: {
          workspaceId: workspaceContext.workspace.id,
          imWhatsappAccountId: args.input?.accountId,
          imWhatsappConversationId: args.input?.conversationId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const connection = applyConnection(items, args.input);
      return {
        edges: connection.items.map(({ node }) => ({
          nodeId: node.id,
          imtpWhatsappAccountId: node.imWhatsappAccountId,
          imtpWhatsappConversationId: node.imWhatsappConversationId,
          fromMe: node.fromMe,
          remoteJid: node.remoteJid,
          messageId: node.messageId,
          participant: node.participant,
          participantAlt: node.participantAlt,
          data: node.data,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        })),
        pageInfo: connection.pageInfo,
        totalCount: connection.totalCount,
      };
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
