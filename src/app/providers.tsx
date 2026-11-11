import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useState, type ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { queryStorage } from "@/data/cache/queryStorage";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: queryStorage,
      key: "salo-query-cache",
      throttleTime: 1000
    })
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
    >
      <BrowserRouter>{children}</BrowserRouter>
    </PersistQueryClientProvider>
  );
}
