export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    ...overrides,
  }
}

export function mockToken(overrides: Partial<MockToken> = {}): MockToken {
  return {
    accessToken: 'mock-access-token-abc123',
    refreshToken: 'mock-refresh-token-xyz789',
    expiresAt: new Date('2099-01-01').toISOString(),
    ...overrides,
  }
}

export function mockItem(overrides: Partial<MockItem> = {}): MockItem {
  return {
    id: '1',
    name: 'Test Item',
    description: 'A test item description',
    createdAt: new Date('2024-01-01').toISOString(),
    ...overrides,
  }
}

export interface MockUser {
  id: string
  email: string
  name: string
}

export interface MockToken {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface MockItem {
  id: string
  name: string
  description: string
  createdAt: string
}
