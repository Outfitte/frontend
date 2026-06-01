import type {
  Category,
  FieldHint,
  Item,
  ItemTransfer,
  ItemTransferView,
  Location,
  Outfit,
  OutfitItem,
  OutfitLog,
  Photo,
  Share,
  ShareView,
  SharedItem,
  SharedLocation,
  SharedOutfit,
  UserSummary,
  WearLog,
} from '@/types'

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
    brand: "Levi's",
    category_id: 'cat-001',
    color: 'blue',
    status: 'active',
    metadata: { condition: 'good', size: 'M' },
    photos: [mockPhoto()],
    location_id: 'loc-001',
    purchase_price: '89.99',
    purchase_currency: 'USD',
    purchase_date: '2025-03-15',
    seller_url: 'https://example.com/jacket',
    dispose_reason: null,
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
      mockFieldHint(),
      mockFieldHint({
        key: 'size',
        label: 'Size',
        placeholder: 'e.g. S, M, L, XL',
      }),
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

export function mockOutfitItem(
  overrides: Partial<OutfitItem> = {}
): OutfitItem {
  return {
    outfit_id: 'outfit-001',
    item_id: 'item-001',
    position: 1,
    ...overrides,
  }
}

export function mockOutfit(overrides: Partial<Outfit> = {}): Outfit {
  return {
    id: 'outfit-001',
    owner_id: 'user-001',
    name: 'Casual Friday',
    notes: 'Weekend look',
    items: [],
    photos: [],
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function mockOutfitLog(overrides: Partial<OutfitLog> = {}): OutfitLog {
  return {
    id: 'outfitlog-001',
    outfit_id: 'outfit-001',
    owner_id: 'user-001',
    worn_on: '2026-04-10',
    notes: 'Felt great',
    wear_log_ids: [],
    created_at: '2026-04-10T08:00:00Z',
    ...overrides,
  }
}

export function mockUserSummary(
  overrides: Partial<UserSummary> = {}
): UserSummary {
  return {
    id: 'user-001',
    email: 'user@example.com',
    ...overrides,
  }
}

export function mockShare(overrides: Partial<Share> = {}): Share {
  return {
    id: 'share-001',
    recipient_id: 'user-001',
    target_type: 'item',
    target_id: 'item-001',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function mockShareView(overrides: Partial<ShareView> = {}): ShareView {
  return {
    id: 'share-001',
    recipient: mockUserSummary(),
    target_type: 'item',
    target_id: 'item-001',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function mockSharedItem(
  overrides: Partial<SharedItem> = {}
): SharedItem {
  return {
    ...mockItem(),
    shared_by: mockUserSummary(),
    ...overrides,
  }
}

export function mockSharedOutfit(
  overrides: Partial<SharedOutfit> = {}
): SharedOutfit {
  return {
    ...mockOutfit(),
    shared_by: mockUserSummary(),
    ...overrides,
  }
}

export function mockSharedLocation(
  overrides: Partial<SharedLocation> = {}
): SharedLocation {
  return {
    location: mockLocation(),
    items: [],
    shared_by: mockUserSummary(),
    ...overrides,
  }
}

export function mockItemTransfer(
  overrides: Partial<ItemTransfer> = {}
): ItemTransfer {
  return {
    id: 'transfer-001',
    sender_id: 'user-001',
    recipient_id: 'user-002',
    status: 'pending',
    transfer_history: false,
    created_at: '2026-01-01T00:00:00Z',
    decided_at: null,
    ...overrides,
  }
}

export function mockItemTransferView(
  overrides: Partial<ItemTransferView> = {}
): ItemTransferView {
  return {
    id: 'transfer-001',
    sender_id: 'user-001',
    recipient_id: 'user-002',
    status: 'pending',
    transfer_history: false,
    created_at: '2026-01-01T00:00:00Z',
    decided_at: null,
    item: mockItem(),
    sender: mockUserSummary({ id: 'user-001', email: 'bob@example.com' }),
    recipient: mockUserSummary({ id: 'user-002', email: 'alice@example.com' }),
    ...overrides,
  }
}
