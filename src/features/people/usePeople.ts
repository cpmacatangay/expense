import { useQuery } from "@tanstack/react-query";
import { peopleForMe } from "./api";

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: peopleForMe,
    staleTime: 60_000
  });
}
