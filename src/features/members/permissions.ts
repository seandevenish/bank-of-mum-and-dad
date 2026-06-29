import type { Member, MemberRole } from '../../types/models'

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  full: 'Full access',
  readonly: 'Read only',
}

/** Roles that can be assigned via the invite/role-change UI (owner is implicit). */
export const ASSIGNABLE_ROLES: MemberRole[] = ['admin', 'full', 'readonly']

/** Can this member create/edit/delete data (accounts, transactions, rules)? */
export function canWriteData(member: Member | null): boolean {
  return member?.role === 'owner' || member?.role === 'admin' || member?.role === 'full'
}

/** Can this member manage other members (invite, change role, remove)? */
export function canManageMembers(member: Member | null): boolean {
  return member?.role === 'owner' || member?.role === 'admin'
}

/** Can this member create/delete groups? Reserved for unscoped writers. */
export function canManageGroups(member: Member | null): boolean {
  return canWriteData(member) && member?.scopedGroupIds == null
}

/** Is this member limited to a subset of groups? */
export function isScoped(member: Member | null): boolean {
  return member != null && member.scopedGroupIds != null
}

/** Whether the member may see/act on the given group. Unscoped = all groups. */
export function canAccessGroup(member: Member | null, groupId: string): boolean {
  if (!member || member.scopedGroupIds == null) return true
  return member.scopedGroupIds.includes(groupId)
}
