import { QueryClient } from '@tanstack/react-query';

/** Global defaults: ops data goes stale fast; sockets/polling keep it live. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
});
