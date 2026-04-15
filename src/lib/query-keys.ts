export const queryKeys = {
  items: {
    all: ['items'] as const,
    list: (status?: string) => ['items', 'list', { status }] as const,
    detail: (id: string) => ['items', 'detail', id] as const,
    wearLogs: (id: string) => ['items', id, 'wear-logs'] as const,
  },
  locations: {
    all: ['locations'] as const,
    list: () => ['locations', 'list'] as const,
    detail: (id: string) => ['locations', 'detail', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
  },
}
