interface MemberLike {
  id: string;
  userId: string | null;
}

export function resolveCurrentWorkspaceMember<T extends MemberLike>(
  members: T[],
  currentUserId?: string | null,
): T | null {
  if (!members.length) return null;

  if (currentUserId) {
    const matchedMember = members.find((member) => member.userId === currentUserId);
    if (matchedMember) return matchedMember;
  }

  return members[0];
}
