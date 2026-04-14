import type { Category, FieldHint } from '@/types/category'
import type { Item, Photo } from '@/types/item'
import type { Location } from '@/types/location'
import type { WearLog } from '@/types/wear-log'

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

export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-001',
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

export function mockPhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 'photo-001',
    media_key: 'uploads/photo-001.jpg',
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function mockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-001',
    owner_id: 'user-001',
    name: 'Blue Denim Jacket',
    brand: 'Levi\'s',
    category_id: 'cat-001',
    color: 'blue',
    metadata: { condition: 'good', size: 'M' },
    photos: [mockPhoto()],
    location_id: 'loc-001',
    purchase_price: '89.99',
    purchase_currency: 'USD',
    purchase_date: '2025-03-15',
    seller_url: 'https://example.com/jacket',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function mockLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-001',
    owner_id: 'user-001',
    parent_id: null,
    label: 'Main Closet',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function mockChildLocation(overrides: Partial<Location> = {}): Location {
  return mockLocation({
    id: 'loc-002',
    parent_id: 'loc-001',
    label: 'Top Shelf',
    ...overrides,
  })
}

export function mockFieldHint(overrides: Partial<FieldHint> = {}): FieldHint {
  return {
    key: 'condition',
    label: 'Condition',
    placeholder: 'e.g. new, good, worn',
    ...overrides,
  }
}

export function mockCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-001',
    label: 'Jackets',
    is_preset: true,
    field_hints: [
      mockFieldHint({ key: 'condition', label: 'Condition', placeholder: 'e.g. new, good, worn' }),
      mockFieldHint({ key: 'size', label: 'Size', placeholder: 'e.g. S, M, L, XL' }),
    ],
    ...overrides,
  }
}

export function mockWearLog(overrides: Partial<WearLog> = {}): WearLog {
  return {
    id: 'wearlog-001',
    item_id: 'item-001',
    owner_id: 'user-001',
    worn_on: '2026-04-10',
    notes: 'Wore to work',
    created_at: '2026-04-10T08:00:00Z',
    ...overrides,
  }
}
