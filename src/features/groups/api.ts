import { addDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { householdCollection, householdDoc } from '../../lib/firestore'
import type { Group } from '../../types/models'

export interface GroupInput {
  name: string
  color?: string
  sortOrder?: number
}

export async function addGroup(householdId: string, input: GroupInput): Promise<void> {
  const now = Date.now()
  await addDoc(householdCollection(householdId, 'groups'), {
    name: input.name.trim(),
    color: input.color ?? null,
    sortOrder: input.sortOrder ?? now,
    createdAt: now,
  })
}

export async function updateGroup(
  householdId: string,
  id: string,
  patch: Partial<Pick<Group, 'name' | 'color' | 'sortOrder'>>,
): Promise<void> {
  await updateDoc(householdDoc(householdId, 'groups', id), patch)
}

export async function deleteGroup(householdId: string, id: string): Promise<void> {
  await deleteDoc(householdDoc(householdId, 'groups', id))
}
