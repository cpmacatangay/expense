import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input, Textarea } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Icon, IconButton } from '../../components/m3'
import { useToast } from '../../components/shared/Toast'
import {
  addStudent,
  listStudents,
  setStudentActive,
  updateStudent
} from '../../lib/db/repositories/students'
import type { Student } from '../../lib/types'
import { studentSchema } from '../../lib/validation/schemas'

interface StudentDialogProps {
  open: boolean
  student: Student | null
  onClose: () => void
  onSaved: () => void
}

function StudentDialog({ open, student, onClose, onSaved }: StudentDialogProps) {
  const { showToast } = useToast()
  const [name, setName] = useState(student?.name ?? '')
  const [notes, setNotes] = useState(student?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName(student?.name ?? '')
    setNotes(student?.notes ?? '')
    setError(null)
  }

  const handleSubmit = async () => {
    setError(null)
    const parsed = studentSchema.safeParse({ name, notes: notes || undefined })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the student details')
      return
    }

    setSaving(true)
    try {
      if (student) {
        await updateStudent(student.id, parsed.data)
        showToast('Student updated', 'success')
      } else {
        await addStudent(parsed.data)
        showToast('Student added', 'success')
      }
      onSaved()
      onClose()
      reset()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the student')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={student ? 'Edit student' : 'Add student'}
      description="Use a first name or nickname. No contact details."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Saving…' : student ? 'Save changes' : 'Add student'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            Name
          </span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Ana"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
            Notes · optional
          </span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Section, nickname, or anything useful"
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Dialog>
  )
}

export function StudentsPage() {
  const students = useLiveQuery(() => listStudents(), [], [])
  const { showToast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)

  const active = students.filter((student) => student.active)
  const archived = students.filter((student) => !student.active)

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditing(student)
    setDialogOpen(true)
  }

  const toggleActive = async (student: Student) => {
    try {
      await setStudentActive(student.id, !student.active)
      showToast(student.active ? 'Student archived' : 'Student restored', 'success')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not update the student', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${active.length} active · ${archived.length} archived`}
        action={
          <Button size="sm" onClick={openAdd} disabled={active.length >= 10}>
            <span slot="icon">
              <Icon>add</Icon>
            </span>
            Add
          </Button>
        }
      />

      {active.length === 0 ? (
        <EmptyState
          icon={<Icon>person</Icon>}
          title="Add your first student"
          description="The roster is shared by all four adults. You can add up to 10 active students."
          action={
            <Button size="sm" onClick={openAdd}>
              <span slot="icon">
                <Icon>add</Icon>
              </span>
              Add student
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {active.map((student) => (
            <Card key={student.id} className="!p-3">
              <div className="flex items-center gap-3">
                <Avatar name={student.name} order={student.name.length} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="m3-title-small truncate">{student.name}</p>
                  {student.notes ? (
                    <p className="m3-body-small mt-0.5 truncate text-on-surface-variant">
                      {student.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <IconButton aria-label="Edit student" onClick={() => openEdit(student)}>
                    <Icon>edit</Icon>
                  </IconButton>
                  <IconButton
                    aria-label="Archive student"
                    onClick={() => void toggleActive(student)}
                  >
                    <Icon>archive</Icon>
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <div className="mt-8">
          <h2 className="m3-label-medium mb-2 uppercase tracking-[0.16em] text-on-surface-variant">
            Archived
          </h2>
          <div className="space-y-2">
            {archived.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-3 rounded-2xl border border-outline-variant/70 bg-surface-container/50 px-4 py-3"
              >
                <Avatar name={student.name} order={student.name.length} size="sm" />
                <span className="min-w-0 flex-1 m3-body-medium truncate text-on-surface-variant">
                  {student.name}
                </span>
                <IconButton
                  aria-label="Restore student"
                  onClick={() => void toggleActive(student)}
                >
                  <Icon>restore</Icon>
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <StudentDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        student={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => setDialogOpen(false)}
      />
    </div>
  )
}
