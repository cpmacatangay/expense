import { db } from '../schema'
import type { Member } from '../../types'

export async function listMembers(): Promise<Member[]> {
  return db.members.orderBy('order').toArray()
}

export async function getMember(id: string): Promise<Member | undefined> {
  return db.members.get(id)
}

export async function getMembersByIds(ids: string[]): Promise<Member[]> {
  const members = await db.members.bulkGet(ids)
  return members.filter((member): member is Member => Boolean(member))
}

export async function memberNameMap(): Promise<Record<string, string>> {
  const members = await listMembers()
  return Object.fromEntries(members.map((member) => [member.id, member.name]))
}
