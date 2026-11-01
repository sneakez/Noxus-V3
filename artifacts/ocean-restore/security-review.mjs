// Content/path audit for this branch; prints finding locations, never secret values.
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
const paths = [...new Set([...git(['diff', '--name-only', 'a5316c9']).trim().split(/\r?\n/), ...git(['ls-files', '--others', '--exclude-standard']).trim().split(/\r?\n/)])].filter(Boolean);
const logs = await fs.readdir('artifacts/ocean-restore', { recursive: true });
for (const path of logs) if (path.endsWith('.log') && !path.startsWith('dev-server')) paths.push(`artifacts/ocean-restore/${path.replaceAll('\\', '/')}`);
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['provider-key', /\bsk-[A-Za-z0-9_-]{24,}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{18,}\b/],
  ['jwt-literal', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['credential-url', /(?:postgres(?:ql)?|mysql|https?):\/\/[^\s/:@]+:[^\s/@]+@/],
];
const findings = [];
let textFiles = 0;
for (const path of [...new Set(paths)].sort()) {
  if (/(^|\/)(?:node_modules|\.aws|\.ssh)(\/|$)|(^|\/)\.env$|\.(?:pem|p12|pfx|xlsx|csv|zip)$/i.test(path)) findings.push({ path, reason: 'forbidden-or-review-required-path' });
  const bytes = await fs.readFile(path).catch(() => null);
  if (!bytes || bytes.includes(0)) continue;
  textFiles++;
  const lines = bytes.toString('utf8').split(/\r?\n/);
  lines.forEach((line, index) => { for (const [reason, pattern] of patterns) if (pattern.test(line)) findings.push({ path, line: index + 1, reason }); });
}
// Include both local backup commits that will accompany the restoration branch.
const history = git(['log', '-p', '--format=commit %H', 'a5316c9..HEAD', '--', '.', ':!*.png']);
for (const [reason, pattern] of patterns) if (pattern.test(history)) findings.push({ path: 'backup-commit-history', reason });
const report = { checkedAt: new Date().toISOString(), base: 'a5316c9', textFiles, changedPaths: new Set(paths).size, findings, status: findings.length ? 'REVIEW_REQUIRED' : 'PASS', provenance: 'Existing synthetic seed and isolated UI fixtures only; no new customer import. PNG artifacts are from mock UAT; sampled original-page screenshots visually reviewed. Pattern scan is not a proof against every possible secret.', excludedRuntimeLogs: ['dev-server.log', 'dev-server-error.log'] };
await fs.writeFile('artifacts/ocean-restore/security-review.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (findings.length) process.exitCode = 1;
