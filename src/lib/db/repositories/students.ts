import { db } from '../schema'
import type { Student } from '../../types'

export async function listStudents(activeOnly = false): Promise<Student[]> {
  const students = await db.students.orderBy('name').toArray()
  return activeOnly ? students.filter((student) => student.active) : students
}

export async function getStudent(id: string): Promise<Student | undefined> {
  return db.students.get(id)
}

export async function addStudent(input: { name: string; notes?: string }): Promise<Student> {
  const now = new Date().toISOString()
  const student: Student = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    notes: input.notes?.trim() || undefined,
    active: true,
    createdAt: now,
    updatedAt: now
  }
  await db.students.add(student)
  return student
}

export async function updateStudent(
  id: string,
  input: { name: string; notes?: string }
): Promise<void> {
  const existing = await db.students.get(id)
  if (!existing) throw new Error('Student not found')
  await db.students.put({
    ...existing,
    name: input.name.trim(),
    notes: input.notes?.trim() || undefined,
    updatedAt: new Date().toISOString()
  })
}

export async function setStudentActive(id: string, active: boolean): Promise<void> {
  const existing = await db.students.get(id)
  if (!existing) throw new Error('Student not found')
  await db.students.put({
    ...existing,
    active,
    updatedAt: new Date().toISOString()
  })
}
