import { prisma } from "../src/server/lib/prisma";
import { createShardingKey } from "../src/server/lib/sharding";
import { hashPassword } from "../src/server/lib/session";

async function main(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "sa@usegc.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "1234Qwer.";
  const workspaceName = process.env.SEED_WORKSPACE_NAME || "Globalchats";

  const passwordHash = await hashPassword(adminPassword);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isAdmin: true,
      status: "ACTIVE",
      username: "admin",
    },
    create: {
      id: crypto.randomUUID(),
      email: adminEmail,
      username: "admin",
      passwordHash,
      isEmailVerified: true,
      isAdmin: true,
      status: "ACTIVE",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { shardingKey: "00000000" },
    update: {
      displayName: workspaceName,
      inviteCodeEnabled: true,
      inviteCode: "seedjoin",
    },
    create: {
      id: crypto.randomUUID(),
      shardingKey: "00000000",
      shardingSeq: 0,
      displayName: workspaceName,
      status: "ACTIVE",
      inviteCode: "seedjoin",
      inviteCodeEnabled: true,
    },
  });

  const existingMembership = await prisma.userWorkspace.findFirst({
    where: { userId: adminUser.id, workspaceId: workspace.id },
  });

  if (!existingMembership) {
    await prisma.userWorkspace.create({
      data: {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });
  }

  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, userId: adminUser.id },
  });

  if (!existingMember) {
    await prisma.workspaceMember.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        userId: adminUser.id,
        role: "OWNER",
        status: "ACTIVE",
        name: "Admin",
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
    });
  }

  await prisma.config.upsert({
    where: { key: "app.name" },
    update: { value: JSON.stringify({ value: "Globalchats" }) },
    create: {
      id: crypto.randomUUID(),
      key: "app.name",
      value: JSON.stringify({ value: "Globalchats" }),
      description: "Default application name",
    },
  });

  const account = await prisma.imWhatsappAccount.upsert({
    where: {
      workspaceId_lid: {
        workspaceId: workspace.id,
        lid: "seed-account-1",
      },
    },
    update: { jid: "seed-account@s.whatsapp.net" },
    create: {
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      lid: "seed-account-1",
      jid: "seed-account@s.whatsapp.net",
      assignWorkspaceMemberId: existingMember?.id,
      data: { title: "Seed Account" },
    },
  });

  const conversation = await prisma.imWhatsappConversation.upsert({
    where: {
      workspaceId_imWhatsappAccountId_jid: {
        workspaceId: workspace.id,
        imWhatsappAccountId: account.id,
        jid: "customer-1@s.whatsapp.net",
      },
    },
    update: {},
    create: {
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      imWhatsappAccountId: account.id,
      jid: "customer-1@s.whatsapp.net",
      assignWorkspaceMemberId: existingMember?.id,
      data: { summary: "Seed conversation" },
    },
  });

  const existingMessage = await prisma.imWhatsappMessage.findFirst({
    where: {
      workspaceId: workspace.id,
      imWhatsappAccountId: account.id,
      remoteJid: "customer-1@s.whatsapp.net",
      messageId: "seed-message-1",
      fromMe: false,
    },
  });

  if (!existingMessage) {
    await prisma.imWhatsappMessage.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        imWhatsappAccountId: account.id,
        imWhatsappConversationId: conversation.id,
        fromMe: false,
        remoteJid: "customer-1@s.whatsapp.net",
        messageId: "seed-message-1",
        data: { text: "Hello from the seed dataset" },
      },
    });
  }

  const extraWorkspace = await prisma.workspace.upsert({
    where: { inviteCode: "sandbox01" },
    update: {
      displayName: "Globalchats Sandbox",
      status: "ACTIVE",
      inviteCodeEnabled: true,
    },
    create: {
      id: crypto.randomUUID(),
      shardingKey: createShardingKey(),
      displayName: "Globalchats Sandbox",
      status: "ACTIVE",
      inviteCode: "sandbox01",
      inviteCodeEnabled: true,
    },
  });

  const extraMembership = await prisma.userWorkspace.findFirst({
    where: { userId: adminUser.id, workspaceId: extraWorkspace.id },
  });

  if (!extraMembership) {
    await prisma.userWorkspace.create({
      data: {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        workspaceId: extraWorkspace.id,
        role: "ADMIN",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
