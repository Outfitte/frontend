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
})
