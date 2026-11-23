import { rpc } from "@/data/supabase/rpc";
import type { AddPersonResult, Person } from "./types";

export async function peopleForMe(): Promise<Person[]> {
  const data = await rpc<{ people: Person[] }>("people_for_me");
  return data.people ?? [];
}

export async function addPerson(name: string): Promise<AddPersonResult> {
  return rpc<AddPersonResult>("add_person", { p_name: name });
}
