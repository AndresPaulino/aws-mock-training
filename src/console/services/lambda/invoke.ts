// Simulated Lambda invoke, shared by the Lambda, API Gateway and SNS consoles. Mutates a cloud draft.
import type { CloudState, LambdaFunction } from '../../../cloud/types';
import { rid } from '../../../cloud/seed';

export const lambdaArn = (c: CloudState, f: Pick<LambdaFunction, 'region' | 'name'>) => `arn:aws:lambda:${f.region}:${c.accountId}:function:${f.name}`;
export const findLambda = (c: CloudState, ref: string) => c.lambdas.find((f) => f.id === ref || f.name === ref || lambdaArn(c, f) === ref);

export interface InvokeResult { ok: boolean; ms: number; response: string; log: string }

export function invokeLambda(c: CloudState, fnRef: string, event: unknown, source: string): InvokeResult | undefined {
  const f = findLambda(c, fnRef);
  if (!f) return;
  const now = Date.now();
  const cold = !f.invocations.length || now - f.invocations[0].t > 15 * 60 * 1000;
  const ms = Math.round((15 + Math.random() * 60) * Math.min(4, 0.5 + 512 / f.memoryMb));
  const init = cold ? Math.round(150 + Math.random() * 200) : 0;
  const timedOut = f.timeoutSec < 1;
  const threw = f.code.includes('throw');
  const ok = !timedOut && !threw;
  const req = crypto.randomUUID();
  const errMsg = timedOut ? `Task timed out after ${f.timeoutSec}.00 seconds` : 'Error: Unhandled exception thrown by handler';
  const response = ok
    ? JSON.stringify({ statusCode: 200, body: JSON.stringify({ message: `Hello from ${f.name}!`, source, event }) }, null, 2)
    : JSON.stringify({ errorType: timedOut ? 'Sandbox.Timedout' : 'Error', errorMessage: errMsg }, null, 2);
  const log = [
    `START RequestId: ${req} Version: $LATEST`,
    ok ? `INFO\tevent received from ${source}` : `ERROR\t${errMsg}`,
    `END RequestId: ${req}`,
    `REPORT RequestId: ${req}\tDuration: ${ms}.00 ms\tBilled Duration: ${ms} ms\tMemory Size: ${f.memoryMb} MB\tMax Memory Used: ${Math.min(f.memoryMb, 60 + Math.round(Math.random() * 30))} MB${cold ? `\tInit Duration: ${init}.00 ms` : ''}`,
  ].join('\n');
  f.invocations = [{ t: now, ok, ms, msg: `${source}: ${ok ? 'Succeeded' : errMsg}` }, ...f.invocations].slice(0, 50);
  const lgName = `/aws/lambda/${f.name}`;
  let lg = c.logGroups.find((g) => g.name === lgName && g.region === f.region);
  if (!lg) { lg = { id: rid('lg'), name: lgName, region: f.region, createdAt: now, retentionDays: null, storedMb: 0 }; c.logGroups.push(lg); }
  lg.storedMb += 0.001;
  return { ok, ms, response, log };
}
