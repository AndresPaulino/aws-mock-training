// Content schema. Every content file under src/content/{lessons,questions,flashcards}
// does `export default [...] satisfies X[]` and uses only `import type` (no runtime imports),
// so `npm test` (scripts/check-content.ts) can load them with plain Node.

export type DomainId = 'secure' | 'resilient' | 'performance' | 'cost';
export type ModuleId = 'm1' | 'm2' | 'm3a' | 'm3b' | 'm4' | 'm5';
export type LessonDomain = DomainId | 'foundations';

/** Short, lowercase service key, e.g. 'ec2', 's3', 'nat-gateway'. See services.ts for the catalog. */
export type ServiceId = string;

// ---------- Animated diagrams ----------
// Coordinates are on a 100 x 60 canvas (x right, y down). Renderer scales to fit.
export interface DiagramGroup {
  id: string;
  label: string;
  kind: 'cloud' | 'region' | 'vpc' | 'az' | 'subnet-public' | 'subnet-private' | 'onprem' | 'internet' | 'generic';
  x: number; y: number; w: number; h: number;
}
export interface DiagramNode {
  id: string;
  label: string;
  /** ServiceId for the icon (falls back to a generic box), or 'user' | 'server' | 'database' | 'internet'. */
  icon?: string;
  x: number; y: number; // centre point
  sub?: string;         // small second line, e.g. '10.0.1.0/24'
}
export interface DiagramEdge {
  id: string;
  from: string; // node id
  to: string;   // node id
  label?: string;
  dashed?: boolean;
}
export interface DiagramStep {
  /** One or two sentences shown under the diagram for this step. */
  caption: string;
  /** Ids of nodes / edges / groups to highlight in this step. */
  highlight: string[];
  /** Edge ids to animate a packet along (direction from->to unless reverse). */
  flow?: { edge: string; reverse?: boolean; color?: 'ok' | 'bad' }[];
  /** Ids to show as blocked/failed (red X), e.g. a denied packet or a failed AZ. */
  fail?: string[];
}
export interface Diagram {
  title: string;
  groups?: DiagramGroup[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  steps: DiagramStep[];
}

// ---------- Lessons ----------
export interface ProsCons {
  option: string;
  pros: string[];
  cons: string[];
  useWhen: string;
}
export interface LessonSection {
  heading: string;
  /** Mini-markdown: blank-line separated paragraphs, `- ` bullets, **bold**, `code`. */
  body: string;
  table?: { headers: string[]; rows: string[][] };
  /** true when this content goes beyond the user's cheat-sheet PDFs (gap-filled from the SAA-C03 exam guide). */
  beyond?: boolean;
}
export interface Lesson {
  id: string;            // must match an id in outline.ts
  module: ModuleId;
  domain: LessonDomain;
  title: string;
  minutes: number;       // estimated study time
  summary: string;       // 1-2 sentences: what you'll be able to do after
  analogy: { title: string; body: string }; // plain-English, newbie-friendly
  sections: LessonSection[];
  diagram?: Diagram;
  keyFacts: string[];    // crisp, memorizable facts (numbers, limits, defaults)
  examTips: string[];    // "if the question says X, the answer is Y"
  pitfalls: string[];    // common traps / distractors
  prosCons?: ProsCons[]; // option comparisons
  services: ServiceId[];
  /** Id of a console lab in src/labs (optional; leave out if unsure). */
  labId?: string;
  beyond?: boolean;      // whole lesson is beyond the PDFs
}

// ---------- Questions ----------
export interface Question {
  id: string;            // globally unique, e.g. 'sec-001'
  domain: DomainId;
  lessonIds: string[];   // 1-3 ids from outline.ts
  difficulty: 1 | 2 | 3; // 1 = recall, 2 = applied scenario, 3 = exam-hard multi-constraint
  stem: string;          // the scenario + question. For multi-select, end with "(Choose TWO.)" or "(Choose THREE.)"
  options: string[];     // 4 options (5 for choose-two, 6 for choose-three)
  answer: number[];      // 0-based indices of correct options
  explanation: string;   // why the right answer is right, in plain English; name the keyword that gives it away
  optionExplanations: string[]; // same length as options: why each is right or wrong
  tags: ServiceId[];
}

// ---------- Flashcards ----------
export interface Flashcard {
  id: string;
  lessonId: string;
  front: string;
  back: string;
}

// ---------- Service catalog ----------
export type ServiceCategory =
  | 'compute' | 'containers' | 'storage' | 'database' | 'networking' | 'security'
  | 'management' | 'integration' | 'analytics' | 'migration' | 'ml' | 'frontend' | 'cost';

export interface ServiceInfo {
  id: ServiceId;
  name: string;          // 'Amazon S3'
  short: string;         // 'S3' — label for icons
  category: ServiceCategory;
  oneLiner: string;
  whatItIs: string;      // 2-4 sentences, newbie-friendly
  useWhen: string[];
  notFor: string[];
  pricing: string;       // how it bills (what you pay for)
  examSignals: string[]; // phrases in questions that point to this service
  related: ServiceId[];
  lessonIds: string[];
  /** true if a full mock-console page exists for it */
  console?: boolean;
}

// ---------- Architecture patterns & builder scenarios ----------
export interface Pattern {
  id: string;
  title: string;
  domain: DomainId;
  problem: string;
  howItWorks: string;
  diagram: Diagram;
  pros: string[];
  cons: string[];
  useWhen: string[];
  avoidWhen: string[];
  alternatives: { name: string; tradeoff: string }[];
  examSignals: string[];
  lessonIds: string[];
}

export type Pillar = 'security' | 'reliability' | 'performance' | 'cost' | 'operations';

export interface ScenarioRule {
  /** Satisfied when the design contains at least one of these services. */
  anyOf?: ServiceId[];
  /** Satisfied when the design contains NONE of these services. */
  noneOf?: ServiceId[];
  /** Satisfied when some edge connects a node from `from` to a node in `to` (either direction). */
  connect?: { from: ServiceId[]; to: ServiceId[] };
  /** Satisfied when at least `count` nodes of any of these services exist (e.g. two EC2 for HA). */
  atLeast?: { services: ServiceId[]; count: number };
  pillar: Pillar;
  weight: number;        // 1-3
  pass: string;          // feedback when satisfied
  fail: string;          // feedback (a hint, not the answer) when not satisfied
}

export interface Scenario {
  id: string;
  title: string;
  domain: DomainId;
  difficulty: 1 | 2 | 3;
  brief: string;               // the customer story
  requirements: string[];      // bullet constraints (RTO, budget, compliance...)
  palette: ServiceId[];        // services offered in the builder sidebar (include distractors)
  rules: ScenarioRule[];
  solution: {
    services: ServiceId[];
    edges: [ServiceId, ServiceId][];
    explanation: string;
    tradeoffs: string[];
  };
  lessonIds: string[];
}
