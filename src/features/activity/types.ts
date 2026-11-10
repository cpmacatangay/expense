export type ActivityEntityType =
  | "group"
  | "adult"
  | "invitation"
  | "student"
  | "outing"
  | "item"
  | "settlement";

export type ActivityActor = {
  id: string;
  display_name: string;
  nickname: string | null;
};

export type ActivityEvent = {
  id: string;
  group_id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  created_at: string;
  actor: ActivityActor | null;
};

export type ActivityFilter = "all" | "settlements" | "outings" | "members";

export type ActivityPageResult = {
  events: ActivityEvent[];
  nextCursor: string | null;
};
