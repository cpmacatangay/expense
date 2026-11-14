-- Private drafts must not leak through derived activity copies, and an author
-- must not retain outing reads after removal or group archive.

create or replace function public.log_activity_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_entity uuid;
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_actor uuid := auth.uid();
  v_adult_name text;
begin
  if tg_table_name = 'outings' then
    if coalesce(new.status, old.status) = 'private_draft' then
      return null;
    end if;
  elsif tg_table_name in ('items', 'outing_adults', 'outing_students') then
    if exists (
      select 1
      from public.outings o
      where o.id = coalesce(new.outing_id, old.outing_id)
        and o.status = 'private_draft'
    ) then
      return null;
    end if;
  end if;

  case tg_table_name
    when 'groups' then
      if tg_op = 'DELETE' then
        return null;
      end if;

      v_group := new.id;
      v_entity := new.id;

      if tg_op = 'INSERT' then
        v_action := 'group.created';
        v_after := jsonb_build_object('name', new.name, 'status', new.status);
      else
        if new.status is distinct from old.status then
          v_action := case new.status
            when 'archived' then 'group.archived'
            when 'deleted' then 'group.soft_deleted'
            else 'group.restored'
          end;
        else
          v_action := 'group.updated';
        end if;

        v_before := jsonb_build_object('name', old.name, 'status', old.status);
        v_after := jsonb_build_object('name', new.name, 'status', new.status);
      end if;

    when 'group_adults' then
      v_group := coalesce(new.group_id, old.group_id);
      v_entity := coalesce(new.id, old.id);

      if tg_op = 'INSERT' then
        if new.status = 'active' then
          v_action := 'adult.joined';
        else
          v_action := 'adult.invited';
        end if;

        v_after := jsonb_build_object('displayName', new.display_name, 'status', new.status);
      elsif tg_op = 'UPDATE' then
        if new.status is distinct from old.status then
          v_action := case
            when new.status = 'active' and old.status = 'removed' then 'adult.restored'
            when new.status = 'active' then 'adult.joined'
            when new.status = 'removed' then 'adult.removed'
            else 'adult.updated'
          end;
        elsif new.display_name is distinct from old.display_name then
          v_action := 'adult.renamed';
        else
          v_action := 'adult.updated';
        end if;

        v_before := jsonb_build_object('displayName', old.display_name, 'status', old.status);
        v_after := jsonb_build_object('displayName', new.display_name, 'status', new.status);
      else
        v_action := 'adult.removed';
        v_before := jsonb_build_object('displayName', old.display_name, 'status', old.status);
      end if;

    when 'invitations' then
      v_group := coalesce(new.group_id, old.group_id);
      v_entity := coalesce(new.id, old.id);

      select ga.display_name into v_adult_name
      from public.group_adults ga
      where ga.id = coalesce(new.adult_id, old.adult_id);

      if tg_op = 'INSERT' then
        v_action := 'invitation.created';
        v_after := jsonb_build_object(
          'adultName', v_adult_name,
          'expiresAt', new.expires_at
        );
      elsif tg_op = 'UPDATE' then
        if new.accepted_at is not null and old.accepted_at is null then
          v_action := 'invitation.claimed';
        elsif new.revoked_at is not null and old.revoked_at is null then
          v_action := 'invitation.revoked';
        else
          v_action := 'invitation.updated';
        end if;

        v_before := jsonb_build_object(
          'adultName', v_adult_name,
          'acceptedAt', old.accepted_at,
          'revokedAt', old.revoked_at
        );
        v_after := jsonb_build_object(
          'adultName', v_adult_name,
          'acceptedAt', new.accepted_at,
          'revokedAt', new.revoked_at
        );
      else
        v_action := 'invitation.revoked';
        v_before := jsonb_build_object(
          'adultName', v_adult_name,
          'acceptedAt', old.accepted_at,
          'revokedAt', old.revoked_at
        );
      end if;

    when 'outings' then
      v_group := coalesce(new.group_id, old.group_id);
      v_entity := coalesce(new.id, old.id);

      if tg_op = 'INSERT' then
        v_action := 'outing.created';
        v_after := jsonb_build_object(
          'date', new.date,
          'place', new.place,
          'notes', new.notes,
          'status', new.status
        );
      elsif tg_op = 'UPDATE' then
        if new.status = 'finalized' and old.status is distinct from 'finalized' then
          return null;
        end if;

        if new.status = 'reopened' and old.status is distinct from 'reopened' then
          return null;
        end if;

        if new.status = 'draft' and old.status = 'private_draft' then
          v_action := 'outing.published';
        else
          v_action := 'outing.updated';
        end if;

        v_before := jsonb_build_object(
          'date', old.date,
          'place', old.place,
          'notes', old.notes,
          'payerAdultId', old.payer_adult_id,
          'totalCentavos', old.total_centavos,
          'totalMode', old.total_mode,
          'status', old.status
        );
        v_after := jsonb_build_object(
          'date', new.date,
          'place', new.place,
          'notes', new.notes,
          'payerAdultId', new.payer_adult_id,
          'totalCentavos', new.total_centavos,
          'totalMode', new.total_mode,
          'status', new.status
        );
      else
        v_action := 'outing.deleted';
        v_before := jsonb_build_object(
          'date', old.date,
          'place', old.place,
          'notes', old.notes,
          'status', old.status
        );
      end if;

    when 'items' then
      select o.group_id into v_group
      from public.outings o
      where o.id = coalesce(new.outing_id, old.outing_id);

      v_entity := coalesce(new.id, old.id);

      if tg_op = 'INSERT' then
        v_action := 'item.created';
      elsif tg_op = 'UPDATE' then
        v_action := 'item.updated';
      else
        v_action := 'item.deleted';
      end if;

      if tg_op in ('UPDATE', 'DELETE') then
        v_before := jsonb_build_object(
          'outingId', old.outing_id,
          'name', old.name,
          'quantity', old.quantity,
          'unitAmountCentavos', old.unit_amount_centavos,
          'assignmentType', old.assignment_type,
          'assignedAdultId', old.assigned_adult_id,
          'assignedStudentId', old.assigned_student_id
        );
      end if;
      if tg_op in ('INSERT', 'UPDATE') then
        v_after := jsonb_build_object(
          'outingId', new.outing_id,
          'name', new.name,
          'quantity', new.quantity,
          'unitAmountCentavos', new.unit_amount_centavos,
          'assignmentType', new.assignment_type,
          'assignedAdultId', new.assigned_adult_id,
          'assignedStudentId', new.assigned_student_id
        );
      end if;

    when 'outing_adults' then
      select o.group_id into v_group
      from public.outings o
      where o.id = coalesce(new.outing_id, old.outing_id);

      v_entity := coalesce(new.outing_id, old.outing_id);
      if tg_op = 'DELETE' then
        v_action := 'attendance.removed';
        v_before := jsonb_build_object('adultId', old.adult_id);
      else
        v_action := case when new.present then 'attendance.added' else 'attendance.removed' end;
        v_after := jsonb_build_object('adultId', new.adult_id, 'present', new.present);
      end if;

    when 'outing_students' then
      select o.group_id into v_group
      from public.outings o
      where o.id = coalesce(new.outing_id, old.outing_id);

      v_entity := coalesce(new.outing_id, old.outing_id);
      if tg_op = 'DELETE' then
        v_action := 'student_attendance.removed';
        v_before := jsonb_build_object('studentId', old.student_id);
      else
        v_action := case
          when new.present then 'student_attendance.added'
          else 'student_attendance.removed'
        end;
        v_after := jsonb_build_object(
          'studentId', new.student_id,
          'present', new.present,
          'coveringAdultId', new.covering_adult_id
        );
      end if;

    when 'students' then
      v_group := coalesce(new.group_id, old.group_id);
      v_entity := coalesce(new.id, old.id);

      if tg_op = 'INSERT' then
        v_action := 'student.created';
      elsif tg_op = 'UPDATE' then
        if new.status is distinct from old.status then
          v_action := case new.status
            when 'archived' then 'student.archived'
            else 'student.restored'
          end;
        else
          v_action := 'student.updated';
        end if;
      else
        v_action := 'student.deleted';
      end if;

      if tg_op in ('UPDATE', 'DELETE') then
        v_before := jsonb_build_object('name', old.name, 'status', old.status, 'notes', old.notes);
      end if;
      if tg_op in ('INSERT', 'UPDATE') then
        v_after := jsonb_build_object('name', new.name, 'status', new.status, 'notes', new.notes);
      end if;

    else
      return null;
  end case;

  if v_before is not distinct from v_after then
    return null;
  end if;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    v_group,
    v_actor,
    v_action,
    case tg_table_name
      when 'outings' then 'outing'
      when 'items' then 'item'
      when 'group_adults' then 'adult'
      when 'invitations' then 'invitation'
      when 'students' then 'student'
      when 'groups' then 'group'
      when 'outing_adults' then 'outing'
      when 'outing_students' then 'outing'
      else tg_table_name
    end,
    v_entity,
    v_before,
    v_after
  );

  return null;
end;
$$;

drop policy if exists outings_select_author on public.outings;
create policy outings_select_author
  on public.outings for select
  using (
    author_profile_id = auth.uid()
    and public.is_group_member(group_id)
  );
