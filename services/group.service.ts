import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

function generateInviteCode(): string {
  return nanoid(8).toUpperCase();
}

async function uniqueInviteCode(): Promise<string> {
  let code: string;
  let exists: boolean;
  do {
    code = generateInviteCode();
    const found = await prisma.group.findUnique({ where: { inviteCode: code } });
    exists = !!found;
  } while (exists);
  return code;
}

export async function createGroup(userId: string, name: string) {
  const inviteCode = await uniqueInviteCode();
  const group = await prisma.group.create({
    data: {
      name,
      inviteCode,
      createdBy: userId,
      members: { create: { userId, role: "admin" } },
    },
    include: { members: true },
  });
  return group;
}

export async function getUserGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: { _count: { select: { members: true, patients: true } } },
  });
}

export async function getGroupById(groupId: string, userId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, members: { some: { userId } } },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!group) throw new Error("Group not found or access denied");
  return group;
}

export async function updateGroup(groupId: string, userId: string, name: string) {
  await assertAdmin(groupId, userId);
  return prisma.group.update({ where: { id: groupId }, data: { name } });
}

export async function joinGroup(userId: string, inviteCode: string) {
  const group = await prisma.group.findUnique({ where: { inviteCode } });
  if (!group) throw new Error("Invalid invite code");

  const existing = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (existing) throw new Error("Already a member of this group");

  await prisma.groupMember.create({ data: { userId, groupId: group.id, role: "member" } });
  return group;
}

export async function getGroupMembers(groupId: string, userId: string) {
  await assertMember(groupId, userId);
  return prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function removeMember(groupId: string, adminId: string, targetUserId: string) {
  await assertAdmin(groupId, adminId);
  if (adminId === targetUserId) throw new Error("Admin cannot remove themselves");
  await prisma.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
}

export async function regenerateInviteCode(groupId: string, userId: string) {
  await assertAdmin(groupId, userId);
  const inviteCode = await uniqueInviteCode();
  return prisma.group.update({ where: { id: groupId }, data: { inviteCode } });
}

async function assertMember(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!member) throw new Error("Access denied");
  return member;
}

async function assertAdmin(groupId: string, userId: string) {
  const member = await assertMember(groupId, userId);
  if (member.role !== "admin") throw new Error("Admin access required");
  return member;
}
