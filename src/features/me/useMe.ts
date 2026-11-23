import { useQuery } from "@tanstack/react-query";
import { claimPeopleForMe, ensurePerson, updateDisplayName, type Me } from "./api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const person = await ensurePerson();
      await claimPeopleForMe();
      return person;
    },
    staleTime: 60_000
  });
}

export { ensurePerson, claimPeopleForMe, updateDisplayName };
export type { Me };
