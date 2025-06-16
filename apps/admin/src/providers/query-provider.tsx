import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

// Query keys for consistent caching
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (filters?: any) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    stats: () => ['users', 'stats'] as const,
  },
  content: {
    all: ['content'] as const,
    posts: (filters?: any) => ['content', 'posts', filters] as const,
    pages: (filters?: any) => ['content', 'pages', filters] as const,
    post: (id: string) => ['content', 'post', id] as const,
    page: (id: string) => ['content', 'page', id] as const,
    stats: () => ['content', 'stats'] as const,
  },
  plugins: {
    all: ['plugins'] as const,
    list: (filters?: any) => ['plugins', 'list', filters] as const,
    detail: (id: string) => ['plugins', 'detail', id] as const,
    settings: (id: string) => ['plugins', 'settings', id] as const,
  },
  settings: {
    all: ['settings'] as const,
    group: (group?: string) => ['settings', 'group', group] as const,
    key: (key: string) => ['settings', 'key', key] as const,
  },
} as const;
