import { hierarchy, type HierarchyNode } from "d3-hierarchy";
import type { Person } from "./types";

export interface TreeDatum {
  person: Person;
  partner?: Person;
  children?: TreeDatum[];
}

/**
 * Build a D3-friendly hierarchy from the flat people map.
 * Partners are merged into a single node (a "couple cell") to
 * match both the flat tree convention and the radial fan chart.
 */
export function buildHierarchy(
  people: Record<string, Person>,
  rootId: string | null
): HierarchyNode<TreeDatum> | null {
  if (!rootId || !people[rootId]) return null;

  const childrenByParent = new Map<string, Person[]>();
  for (const p of Object.values(people)) {
    if (p.parentId) {
      const bucket = childrenByParent.get(p.parentId) ?? [];
      bucket.push(p);
      childrenByParent.set(p.parentId, bucket);
    }
  }

  const visited = new Set<string>();

  const build = (person: Person): TreeDatum => {
    visited.add(person.id);
    const partner = person.partnerId ? people[person.partnerId] : undefined;
    if (partner) visited.add(partner.id);

    const bioKids = childrenByParent.get(person.id) ?? [];
    const partnerKids = partner
      ? childrenByParent.get(partner.id) ?? []
      : [];
    const allKids = [...bioKids, ...partnerKids].filter(
      (k) => !visited.has(k.id)
    );

    return {
      person,
      partner,
      children: allKids.length ? allKids.map(build) : undefined,
    };
  };

  const rootPerson = people[rootId];
  return hierarchy<TreeDatum>(build(rootPerson), (d) => d.children);
}

/** Max depth (ring count) used for the radial layout. */
export function maxDepth(root: HierarchyNode<TreeDatum> | null): number {
  if (!root) return 0;
  return root.height + 1;
}

/**
 * Returns true if the person — or any ancestor via `parentId` — is female,
 * or has a female partner. Used to mark the whole subtree of a female
 * ancestor so it reads as a distinct branch in the tree.
 */
export function inheritsFemaleTint(
  people: Record<string, Person>,
  personId: string
): boolean {
  let current: Person | undefined = people[personId];
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    if (current.gender === "F") return true;
    if (current.partnerId) {
      const partner = people[current.partnerId];
      if (partner?.gender === "F") return true;
    }
    current = current.parentId ? people[current.parentId] : undefined;
  }
  return false;
}
