import { QueryClient } from '@tanstack/react-query'

const isTest = import.meta.env.MODE === 'test'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: isTest ? false : 3 },
    mutations: { retry: false },
  },
})
