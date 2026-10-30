// Grades an architecture-builder design against a scenario's rules.
import type { Scenario, ScenarioRule, Pillar } from '../content/types';

export interface Design { nodes: { id: string; service: string }[]; edges: { source: string; target: string }[] }
export interface RuleResult { rule: ScenarioRule; ok: boolean }
export interface Grade { pct: number; results: RuleResult[]; pillars: Partial<Record<Pillar, { got: number; max: number }>> }

export function ruleOk(r: ScenarioRule, d: Design): boolean {
  const has = (ids: string[]) => d.nodes.some((n) => ids.includes(n.service));
  const svc = new Map(d.nodes.map((n) => [n.id, n.service]));
  if (r.anyOf && !has(r.anyOf)) return false;
  if (r.noneOf && has(r.noneOf)) return false;
  if (r.atLeast && d.nodes.filter((n) => r.atLeast!.services.includes(n.service)).length < r.atLeast.count) return false;
  if (r.connect) {
    const { from, to } = r.connect;
    const linked = d.edges.some((e) => {
      const a = svc.get(e.source) ?? '', b = svc.get(e.target) ?? '';
      return (from.includes(a) && to.includes(b)) || (from.includes(b) && to.includes(a));
    });
    if (!linked) return false;
  }
  return true;
}

export function grade(s: Scenario, d: Design): Grade {
  const results = s.rules.map((rule) => ({ rule, ok: ruleOk(rule, d) }));
  const pillars: Grade['pillars'] = {};
  let got = 0, max = 0;
  for (const { rule, ok } of results) {
    const p = (pillars[rule.pillar] ??= { got: 0, max: 0 });
    p.max += rule.weight; max += rule.weight;
    if (ok) { p.got += rule.weight; got += rule.weight; }
  }
  return { pct: max ? Math.round((got / max) * 100) : 0, results, pillars };
}
