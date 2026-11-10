import { useQuery } from "@tanstack/react-query";
import { getPaymentQrUrl } from "./qr";

export function usePaymentQrUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["payment-qr-url", path],
    queryFn: () => getPaymentQrUrl(path as string),
    enabled: Boolean(path),
    staleTime: 240_000
  });
}
