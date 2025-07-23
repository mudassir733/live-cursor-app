import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time in milliseconds that unused/inactive cache data remains in memory
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Time in milliseconds that cache data remains in memory
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      // Retry failed requests
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 408) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys factory
export const queryKeys = {
  // User query keys
  users: {
    all: ['users'],
    lists: () => [...queryKeys.users.all, 'list'],
    list: (filters) => [...queryKeys.users.lists(), { filters }],
    details: () => [...queryKeys.users.all, 'detail'],
    detail: (id) => [...queryKeys.users.details(), id],
    byUsername: (username) => [...queryKeys.users.all, 'username', username],
    online: () => [...queryKeys.users.all, 'online'],
    stats: () => [...queryKeys.users.all, 'stats'],
    health: () => [...queryKeys.users.all, 'health'],
  },
  
  // System query keys
  system: {
    all: ['system'],
    health: () => [...queryKeys.system.all, 'health'],
  },
};

// Mutation keys factory
export const mutationKeys = {
  users: {
    login: 'user-login',
    updateProfile: 'user-update-profile',
    setOnline: 'user-set-online',
    setOffline: 'user-set-offline',
    updateCursor: 'user-update-cursor',
  },
};

export default queryClient;
