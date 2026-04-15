import { describe, it, expect } from 'vitest'
import {
  buildLocationTree,
  flattenTree,
  getAncestors,
  getDescendantIds,
} from '@/lib/location-tree'
import type { Location } from '@/types'

// Helpers
function loc(
  id: string,
  parent_id: string | null,
  label: string,
): Location {
  return { id, owner_id: 'owner-1', parent_id, label, created_at: '2024-01-01T00:00:00Z' }
}

describe('buildLocationTree', () => {
  it('buildLocationTree should return empty array when given empty locations', () => {
    expect(buildLocationTree([])).toEqual([])
  })

  it('buildLocationTree should return one root node with empty children when given single location with no parent', () => {
    const locations = [loc('a', null, 'Closet')]
    expect(buildLocationTree(locations)).toEqual([{ ...locations[0], children: [] }])
  })

  it('buildLocationTree should place root nodes at top level when given multiple locations with no parent', () => {
    const locations = [loc('a', null, 'Closet'), loc('b', null, 'Drawer')]
    const tree = buildLocationTree(locations)
    expect(tree).toHaveLength(2)
    expect(tree.map((n) => n.id)).toEqual(['a', 'b'])
    expect(tree[0].children).toEqual([])
    expect(tree[1].children).toEqual([])
  })

  it('buildLocationTree should nest children under their parent when given parent-child relationship', () => {
    const locations = [loc('a', null, 'Closet'), loc('b', 'a', 'Shelf')]
    const tree = buildLocationTree(locations)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('a')
    expect(tree[0].children).toHaveLength(1)
    expect(tree[0].children[0].id).toBe('b')
    expect(tree[0].children[0].children).toEqual([])
  })

  it('buildLocationTree should omit orphaned child when given location whose parent_id is not in the list', () => {
    const locations = [loc('b', 'missing-parent', 'Shelf')]
    const tree = buildLocationTree(locations)
    expect(tree).toEqual([])
  })

  it('buildLocationTree should support deep nesting when given 3+ level hierarchy', () => {
    const locations = [
      loc('a', null, 'Closet'),
      loc('b', 'a', 'Shelf'),
      loc('c', 'b', 'Box'),
      loc('d', 'c', 'Compartment'),
    ]
    const tree = buildLocationTree(locations)
    expect(tree).toHaveLength(1)
    const shelf = tree[0].children[0]
    const box = shelf.children[0]
    const compartment = box.children[0]
    expect(shelf.id).toBe('b')
    expect(box.id).toBe('c')
    expect(compartment.id).toBe('d')
    expect(compartment.children).toEqual([])
  })
})

describe('flattenTree', () => {
  it('flattenTree should return empty array when given empty tree', () => {
    expect(flattenTree([])).toEqual([])
  })

  it('flattenTree should assign depth 0 to root nodes when given flat tree', () => {
    const locations = [loc('a', null, 'Closet'), loc('b', null, 'Drawer')]
    const tree = buildLocationTree(locations)
    const flat = flattenTree(tree)
    expect(flat).toHaveLength(2)
    expect(flat[0]).toMatchObject({ id: 'a', depth: 0 })
    expect(flat[1]).toMatchObject({ id: 'b', depth: 0 })
  })

  it('flattenTree should assign increasing depth to children when given nested tree', () => {
    const locations = [
      loc('a', null, 'Closet'),
      loc('b', 'a', 'Shelf'),
      loc('c', 'b', 'Box'),
    ]
    const tree = buildLocationTree(locations)
    const flat = flattenTree(tree)
    expect(flat).toHaveLength(3)
    expect(flat[0]).toMatchObject({ id: 'a', depth: 0 })
    expect(flat[1]).toMatchObject({ id: 'b', depth: 1 })
    expect(flat[2]).toMatchObject({ id: 'c', depth: 2 })
  })

  it('flattenTree should produce DFS order when given tree with multiple children', () => {
    const locations = [
      loc('root', null, 'Root'),
      loc('child1', 'root', 'Child1'),
      loc('child2', 'root', 'Child2'),
      loc('grandchild', 'child1', 'Grandchild'),
    ]
    const tree = buildLocationTree(locations)
    const flat = flattenTree(tree)
    expect(flat.map((n) => n.id)).toEqual(['root', 'child1', 'grandchild', 'child2'])
  })
})

describe('getAncestors', () => {
  it('getAncestors should return empty array when given id with no parent', () => {
    const locations = [loc('a', null, 'Closet')]
    expect(getAncestors(locations, 'a')).toEqual([])
  })

  it('getAncestors should return parent when given child with one parent', () => {
    const locations = [loc('a', null, 'Closet'), loc('b', 'a', 'Shelf')]
    expect(getAncestors(locations, 'b')).toEqual([locations[0]])
  })

  it('getAncestors should return ancestor chain in root-first order when given deep hierarchy', () => {
    const locations = [
      loc('a', null, 'Closet'),
      loc('b', 'a', 'Shelf'),
      loc('c', 'b', 'Box'),
    ]
    expect(getAncestors(locations, 'c')).toEqual([locations[0], locations[1]])
  })

  it('getAncestors should stop early when parent_id points to missing location', () => {
    const locations = [loc('b', 'missing-parent', 'Shelf')]
    expect(getAncestors(locations, 'b')).toEqual([])
  })
})

describe('getDescendantIds', () => {
  it('getDescendantIds should return empty array when given id with no children', () => {
    const locations = [loc('a', null, 'Closet')]
    expect(getDescendantIds(locations, 'a')).toEqual([])
  })

  it('getDescendantIds should return direct children when given id with one level of children', () => {
    const locations = [
      loc('a', null, 'Closet'),
      loc('b', 'a', 'Shelf'),
      loc('c', 'a', 'Drawer'),
    ]
    expect(getDescendantIds(locations, 'a')).toEqual(['b', 'c'])
  })

  it('getDescendantIds should return all descendants when given id with multi-level hierarchy', () => {
    const locations = [
      loc('a', null, 'Closet'),
      loc('b', 'a', 'Shelf'),
      loc('c', 'b', 'Box'),
    ]
    const ids = getDescendantIds(locations, 'a')
    expect(ids).toContain('b')
    expect(ids).toContain('c')
    expect(ids).toHaveLength(2)
  })
})
