import type { Location } from '@/types'

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[]
}

export function buildLocationTree(locations: Location[]): LocationTreeNode[] {
  const nodeMap = new Map<string, LocationTreeNode>()
  const roots: LocationTreeNode[] = []

  for (const loc of locations) {
    nodeMap.set(loc.id, { ...loc, children: [] })
  }

  for (const loc of locations) {
    const node = nodeMap.get(loc.id)!
    if (loc.parent_id === null) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(loc.parent_id)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  return roots
}

export function flattenTree(tree: LocationTreeNode[]): (Location & { depth: number })[] {
  const result: (Location & { depth: number })[] = []
  const stack: { node: LocationTreeNode; depth: number }[] = []
  for (let i = tree.length - 1; i >= 0; i--) {
    stack.push({ node: tree[i], depth: 0 })
  }
  while (stack.length > 0) {
    const { node, depth } = stack.pop()!
    const { children, ...loc } = node
    result.push({ ...loc, depth })
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({ node: children[i], depth: depth + 1 })
    }
  }
  return result
}

export function getAncestors(locations: Location[], id: string): Location[] {
  const byId = new Map(locations.map((l) => [l.id, l]))
  const ancestors: Location[] = []
  let current = byId.get(id)
  while (current && current.parent_id !== null) {
    const parent = byId.get(current.parent_id)
    if (!parent) break
    ancestors.unshift(parent)
    current = parent
  }
  return ancestors
}

export function getDescendantIds(locations: Location[], id: string): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const loc of locations) {
    if (loc.parent_id !== null) {
      const siblings = childrenOf.get(loc.parent_id) ?? []
      siblings.push(loc.id)
      childrenOf.set(loc.parent_id, siblings)
    }
  }
  const result: string[] = []
  const queue = [...(childrenOf.get(id) ?? [])]
  let head = 0
  while (head < queue.length) {
    const childId = queue[head++]
    result.push(childId)
    queue.push(...(childrenOf.get(childId) ?? []))
  }
  return result
}
