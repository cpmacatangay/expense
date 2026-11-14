-- Remove activity payloads that were logged for private drafts before 0019.
-- Item/attendance rows have no status in their payload, so remove the events whose
-- outing is still a private draft.

delete from public.activity_events ae
where (
  ae.entity_type = 'outing'
  and (
    ae.after_json ->> 'status' = 'private_draft'
    or ae.before_json ->> 'status' = 'private_draft'
  )
)
or (
  ae.entity_type = 'item'
  and (
    exists (
      select 1
      from public.items i
      join public.outings o on o.id = i.outing_id
      where i.id = ae.entity_id
        and o.status = 'private_draft'
    )
    or exists (
      select 1
      from public.outings o
      where o.id = coalesce(
        (ae.after_json ->> 'outingId')::uuid,
        (ae.before_json ->> 'outingId')::uuid
      )
        and o.status = 'private_draft'
    )
  )
)
or (
  ae.entity_type = 'outing'
  and ae.action in ('attendance.added', 'attendance.removed', 'student_attendance.added', 'student_attendance.removed')
  and exists (
    select 1 from public.outings o
    where o.id = ae.entity_id and o.status = 'private_draft'
  )
);
