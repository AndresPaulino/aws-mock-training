// Guided console labs. Each *.lab.ts file default-exports Lab[]; steps are checked live against the simulated cloud.
import type { CloudState } from '../cloud/types';

export interface LabStep {
  title: string;
  /** What to do, in mini-markdown. Say which console page to open. */
  detail: string;
  hint: string;
  check: (c: CloudState) => boolean;
}
export interface Lab {
  id: string;
  title: string;
  lessonId: string;      // outline id this lab reinforces
  minutes: number;
  /** Console route to open when the lab starts, e.g. '/console/vpc'. */
  start: string;
  intro: string;
  steps: LabStep[];
  /** Shown on completion: what you just proved and how it shows up on the exam. */
  debrief: string;
}

const mods = import.meta.glob<{ default: Lab[] }>('./*.lab.ts', { eager: true });
const ORDER = ['lab-root', 'lab-iam', 'lab-vpc', 'lab-sg', 'lab-endpoint', 'lab-ec2-role', 'lab-kms', 'lab-s3-versioning', 'lab-s3-lifecycle', 'lab-ebs', 'lab-alb-asg', 'lab-rds', 'lab-sqs-lambda', 'lab-sns-fanout', 'lab-serverless-api', 'lab-route53', 'lab-cloudfront', 'lab-cloudwatch', 'lab-budget'];
export const labs: Lab[] = Object.values(mods).flatMap((m) => m.default).sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99));
export const getLab = (id: string) => labs.find((l) => l.id === id);
export const labsForLesson = (lessonId: string) => labs.filter((l) => l.lessonId === lessonId);
