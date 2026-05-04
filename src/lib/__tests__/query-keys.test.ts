import { describe, it, expect } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

describe('queryKeys', () => {
  // --- Uniqueness / collision checks first ---

  it('queryKeys.items.all should not collide with queryKeys.locations.all', () => {
    expect(queryKeys.items.all).not.toEqual(queryKeys.locations.all)
  })

  it('queryKeys.items.all should not collide with queryKeys.categories.all', () => {
    expect(queryKeys.items.all).not.toEqual(queryKeys.categories.all)
  })

  it('queryKeys.locations.all should not collide with queryKeys.categories.all', () => {
    expect(queryKeys.locations.all).not.toEqual(queryKeys.categories.all)
  })

  it('queryKeys.items.list should produce different keys when given different statuses', () => {
    expect(queryKeys.items.list('active')).not.toEqual(queryKeys.items.list('archived'))
  })

  it('queryKeys.items.detail should produce different keys when given different ids', () => {
    expect(queryKeys.items.detail('item-001')).not.toEqual(queryKeys.items.detail('item-002'))
  })

  it('queryKeys.items.wearLogs should produce different keys when given different ids', () => {
    expect(queryKeys.items.wearLogs('item-001')).not.toEqual(queryKeys.items.wearLogs('item-002'))
  })

  it('queryKeys.items.detail should not collide with queryKeys.items.wearLogs for same id', () => {
    expect(queryKeys.items.detail('item-001')).not.toEqual(queryKeys.items.wearLogs('item-001'))
  })

  it('queryKeys.locations.detail should produce different keys when given different ids', () => {
    expect(queryKeys.locations.detail('loc-001')).not.toEqual(queryKeys.locations.detail('loc-002'))
  })

  it('queryKeys.items.list should not collide with queryKeys.items.all', () => {
    expect(queryKeys.items.list()).not.toEqual(queryKeys.items.all)
  })

  it('queryKeys.locations.list should not collide with queryKeys.locations.all', () => {
    expect(queryKeys.locations.list()).not.toEqual(queryKeys.locations.all)
  })

  it('queryKeys.categories.list should not collide with queryKeys.categories.all', () => {
    expect(queryKeys.categories.list()).not.toEqual(queryKeys.categories.all)
  })

  it('queryKeys.outfits.all should not collide with queryKeys.items.all', () => {
    expect(queryKeys.outfits.all).not.toEqual(queryKeys.items.all)
  })

  it('queryKeys.outfits.all should not collide with queryKeys.locations.all', () => {
    expect(queryKeys.outfits.all).not.toEqual(queryKeys.locations.all)
  })

  it('queryKeys.outfits.all should not collide with queryKeys.categories.all', () => {
    expect(queryKeys.outfits.all).not.toEqual(queryKeys.categories.all)
  })

  it('queryKeys.outfits.list should not collide with queryKeys.outfits.all', () => {
    expect(queryKeys.outfits.list()).not.toEqual(queryKeys.outfits.all)
  })

  it('queryKeys.outfits.list should produce different keys when given different date ranges', () => {
    expect(queryKeys.outfits.list({ from: '2026-01-01', to: '2026-01-31' })).not.toEqual(
      queryKeys.outfits.list({ from: '2026-02-01', to: '2026-02-28' }),
    )
  })

  it('queryKeys.outfits.detail should produce different keys when given different ids', () => {
    expect(queryKeys.outfits.detail('outfit-001')).not.toEqual(queryKeys.outfits.detail('outfit-002'))
  })

  it('queryKeys.outfits.logs should not collide with queryKeys.outfits.detail for same id', () => {
    expect(queryKeys.outfits.logs('outfit-001')).not.toEqual(queryKeys.outfits.detail('outfit-001'))
  })

  it('queryKeys.outfitLogs.range should produce different keys when given different date pairs', () => {
    expect(queryKeys.outfitLogs.range('2026-01-01', '2026-01-31')).not.toEqual(
      queryKeys.outfitLogs.range('2026-02-01', '2026-02-28'),
    )
  })

  it('queryKeys.users.all should not collide with queryKeys.users.list', () => {
    expect(queryKeys.users.all).not.toEqual(queryKeys.users.list())
  })

  it('queryKeys.shares.outgoing should not collide with queryKeys.shares.withMe', () => {
    expect(queryKeys.shares.outgoing).not.toEqual(queryKeys.shares.withMe)
  })

  // --- Happy path: correct key structures ---

  it('queryKeys.items.all should return the base items key', () => {
    expect(queryKeys.items.all).toEqual(['items'])
  })

  it('queryKeys.items.list should return scoped list key when given no status', () => {
    expect(queryKeys.items.list()).toEqual(['items', 'list', { status: undefined }])
  })

  it('queryKeys.items.list should return scoped list key with status when given active', () => {
    expect(queryKeys.items.list('active')).toEqual(['items', 'list', { status: 'active' }])
  })

  it('queryKeys.items.list should return scoped list key with status when given archived', () => {
    expect(queryKeys.items.list('archived')).toEqual(['items', 'list', { status: 'archived' }])
  })

  it('queryKeys.items.detail should return scoped detail key when given item id', () => {
    expect(queryKeys.items.detail('item-abc')).toEqual(['items', 'detail', 'item-abc'])
  })

  it('queryKeys.items.wearLogs should return scoped wear-logs key when given item id', () => {
    expect(queryKeys.items.wearLogs('item-abc')).toEqual(['items', 'item-abc', 'wear-logs'])
  })

  it('queryKeys.locations.all should return the base locations key', () => {
    expect(queryKeys.locations.all).toEqual(['locations'])
  })

  it('queryKeys.locations.list should return scoped list key', () => {
    expect(queryKeys.locations.list()).toEqual(['locations', 'list'])
  })

  it('queryKeys.locations.detail should return scoped detail key when given location id', () => {
    expect(queryKeys.locations.detail('loc-xyz')).toEqual(['locations', 'detail', 'loc-xyz'])
  })

  it('queryKeys.categories.all should return the base categories key', () => {
    expect(queryKeys.categories.all).toEqual(['categories'])
  })

  it('queryKeys.categories.list should return scoped list key', () => {
    expect(queryKeys.categories.list()).toEqual(['categories', 'list'])
  })

  it('queryKeys.outfits.all should return the base outfits key', () => {
    expect(queryKeys.outfits.all).toEqual(['outfits'])
  })

  it('queryKeys.outfits.list should return scoped list key when given no filter', () => {
    expect(queryKeys.outfits.list()).toEqual(['outfits', 'list', undefined])
  })

  it('queryKeys.outfits.list should return scoped list key with dates when given a date range', () => {
    expect(queryKeys.outfits.list({ from: '2026-01-01', to: '2026-01-31' })).toEqual([
      'outfits',
      'list',
      { from: '2026-01-01', to: '2026-01-31' },
    ])
  })

  it('queryKeys.outfits.detail should return scoped detail key when given outfit id', () => {
    expect(queryKeys.outfits.detail('outfit-abc')).toEqual(['outfits', 'detail', 'outfit-abc'])
  })

  it('queryKeys.outfits.logs should return scoped logs key when given outfit id', () => {
    expect(queryKeys.outfits.logs('outfit-abc')).toEqual(['outfits', 'outfit-abc', 'logs'])
  })

  it('queryKeys.outfitLogs.range should return scoped range key when given date range', () => {
    expect(queryKeys.outfitLogs.range('2026-01-01', '2026-01-31')).toEqual([
      'outfit-logs',
      'range',
      { from: '2026-01-01', to: '2026-01-31' },
    ])
  })

  it('queryKeys.users.all should return the base users key', () => {
    expect(queryKeys.users.all).toEqual(['users'])
  })

  it('queryKeys.users.list should return scoped list key', () => {
    expect(queryKeys.users.list()).toEqual(['users', 'list'])
  })

  it('queryKeys.shares.outgoing should return the outgoing shares key', () => {
    expect(queryKeys.shares.outgoing).toEqual(['shares'])
  })

  it('queryKeys.shares.withMe should return the with-me shares key', () => {
    expect(queryKeys.shares.withMe).toEqual(['shares', 'with-me'])
  })
})
