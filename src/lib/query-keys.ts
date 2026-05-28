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
  outfits: {
    all: ['outfits'] as const,
    list: (filter?: { from?: string; to?: string }) =>
      ['outfits', 'list', filter] as const,
    detail: (id: string) => ['outfits', 'detail', id] as const,
    logs: (id: string) => ['outfits', id, 'logs'] as const,
  },
  outfitLogs: {
    all: ['outfit-logs'] as const,
    range: (from: string, to: string) =>
      ['outfit-logs', 'range', { from, to }] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
    me: () => ['users', 'me'] as const,
  },
  shares: {
    outgoing: ['shares'] as const,
    withMe: ['shares', 'with-me'] as const,
  },
  transfers: {
    all: ['transfers'] as const,
    incoming: ['transfers', 'incoming'] as const,
    outgoing: ['transfers', 'outgoing'] as const,
    detail: (id: string) => ['transfers', 'detail', id] as const,
  },
}
