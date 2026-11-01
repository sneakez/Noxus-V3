// Summarise recorded runs. This does not run tests or turn missing evidence into PASS.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = 'artifacts/ocean-restore';
const read = async path => JSON.parse(await fs.readFile(`${root}/${path}`, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = await read('login-investigation/prior-verification-summary.json');
const original = await read('login-investigation/prior-source-manifest.json');
const files = [];
const changedSincePriorGates = [];
for (const entry of original.files) {
  const sha256 = hash(await fs.readFile(entry.path));
  files.push({ path: entry.path, sha256 });
  if (sha256 !== entry.sha256) changedSincePriorGates.push(entry.path);
}
assert.ok(changedSincePriorGates.every(path => path === 'scripts/commerce-ui-login.mjs' || path === 'scripts/uat-browser.mjs'), 'Application/config changed since recorded restoration gates; rerun affected gates');
const ownPath = 'scripts/ocean-gate-summary.mjs';
files.push({ path: ownPath, sha256: hash(await fs.readFile(ownPath)) });
files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
// Git blob IDs remain verifiable across CRLF/LF checkouts; raw hashes bind the runs.
const blobs = execFileSync('git', ['hash-object', '--stdin-paths'], { input: files.map(file => file.path).join('\n') + '\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim().split(/\r?\n/);
assert.equal(blobs.length, files.length);
files.forEach((file, index) => { file.gitBlobId = blobs[index]; });
const sourceTreeSha256 = hash(files.map(file => `${file.path}\0${file.sha256}\n`).join(''));
const gitSourceTreeSha256 = hash(files.map(file => `${file.path}\0${file.gitBlobId}\n`).join(''));
const appTreeSha256 = hash(files.filter(file => file.path.startsWith('src/')).map(file => `${file.path}\0${file.sha256}\n`).join(''));
const unit = await read('unit-results.json');
const core = await read('flow/results.json');
const edges = await read('edges/results.json');
const menu = await read('menu-results.json');
const login = await read('login/ui-login-results.json');
const chromeLogin = await read('login-investigation/final-script-chrome/ui-login-results.json');
const security = await read('security-review.json');
const appHealth = await read('app-health.json');
const allStepsPass = result => result.status === 'PASS' && result.errors.length === 0 && result.steps.every(step => step.status === 'PASS');
const roles = ['owner', 'admin', 'manager', 'warehouse', 'growth'];
const loginComplete = allStepsPass(login) && roles.every(role => ['pointer', 'keyboard'].every(activation => login.steps.some(step => step.role === role && step.activation === activation && ['signIn', 'reload', 'logout', 'signedOutReload'].every(key => step.checkpoints[key] === 'PASS')))) && login.logoutAttempts.length === 11 && login.logoutAttempts.every(attempt => attempt.activeUserId === null && attempt.workspace === false && attempt.events.some(event => event.type === 'click' && event.title === 'Đăng xuất' && event.trusted));
const typecheckLog = await fs.readFile(`${root}/typecheck.log`, 'utf8');
const buildLog = await fs.readFile(`${root}/build.log`, 'utf8');
const pass = ok => ok ? 'PASS' : 'FAIL';
const gates = {
  unit: { status: pass(unit.success && unit.numFailedTests === 0 && unit.numPassedTests === unit.numTotalTests), passed: unit.numPassedTests, failed: unit.numFailedTests, testFiles: unit.testResults.length, evidence: 'unit-results.json', runAt: new Date(unit.startTime).toISOString() },
  typecheck: { status: pass(prior.gates.typecheck.exitCode === 0 && typecheckLog.includes('tsc --noEmit')), exitCode: prior.gates.typecheck.exitCode, evidence: 'typecheck.log', provenance: 'prior-verification-summary.json; application/config hashes unchanged' },
  build: { status: pass(prior.gates.build.exitCode === 0 && /built in/.test(buildLog)), exitCode: prior.gates.build.exitCode, evidence: 'build.log', warning: 'Some chunks >500 kB', provenance: 'prior-verification-summary.json; application/config hashes unchanged' },
  'test:ui': { status: pass(allStepsPass(core)), groups: core.steps.length, evidence: 'flow/results.json', finishedAt: core.finishedAt },
  'test:ui:edges': { status: pass(allStepsPass(edges)), groups: edges.steps.length, evidence: 'edges/results.json', finishedAt: edges.finishedAt },
  'test:ui:followup': { status: pass(menu.status === 'PASS' && menu.errors.length === 0 && menu.pages.length === 119 && menu.pages.every(page => page.status === 'PASS')), pages: menu.pages.length, evidence: 'menu-results.json', finishedAt: menu.finishedAt },
  'test:ui:login': { status: pass(loginComplete), roles: roles.length, activationModes: ['pointer', 'keyboard'], lifecycleRuns: login.steps.filter(step => step.role).length, evidence: 'login/ui-login-results.json', finishedAt: login.finishedAt },
};
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
assert.equal(branch, 'codex/restore-ocean-role-flows');
const engineDiff = execFileSync('git', ['diff', '--name-only', 'c52cf87', '--', 'src/mock', 'src/types/index.ts', 'src/analytics/analyticsService.ts'], { encoding: 'utf8' }).trim();
assert.equal(engineDiff, '');
const generatedAt = new Date().toISOString();
const manifest = { generatedAt, evidenceBaseHead: original.head, workingTreeAtValidation: true, branch, uiReference: 'b891421', sourceTreeSha256, hashEncoding: 'SHA256 of sorted path + NUL + lowercase file SHA256 + LF, UTF-8', gitSourceTreeSha256, gitHashEncoding: 'SHA256 of sorted path + NUL + Git blob ID + LF; portable across checkout line endings', appTreeSha256, businessEngineDiffFromBackup: [], changedSincePriorGates, files };
await fs.writeFile(`${root}/source-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
const summary = { generatedAt, status: pass(Object.values(gates).every(gate => gate.status === 'PASS')), sourceTreeSha256, appTreeSha256, applicationUnchangedSincePriorGates: true, changedSincePriorGates, platform: 'Windows', dependenciesInstalled: false, businessEngineDiffFromBackup: [], gates, rolePageCounts: prior.rolePageCounts, notRun: prior.notRun, git: { backup: prior.git.backup, backupHead: prior.git.backupHead, restoreBranch: branch, publicationTarget: `origin/${branch}`, evidenceBaseHead: original.head, evidenceCapturedBeforeRestorationCommit: true, merged: false, deployed: false }, reviewChecks: prior.reviewChecks };
summary.additionalChecks = { unifiedChromeLogin: { status: chromeLogin.status, browser: chromeLogin.browser, evidence: 'login-investigation/final-script-chrome/ui-login-results.json', requiredGate: false, explanation: 'Default login gate uses shell; no PASS claimed for unified Chrome mode' } };
summary.reviewChecks = { ...summary.reviewChecks, securityEvidence: 'security-review.json', credentialPatternFindings: security.findings, appHealthEvidence: 'app-health.json', appHttpStatus: appHealth.httpStatus, humanScreenConfirmation: appHealth.humanConfirmation };
await fs.writeFile(`${root}/verification-summary.json`, JSON.stringify(summary, null, 2) + '\n');
const relative = '../../artifacts/ocean-restore/';
const rows = Object.entries(gates).map(([name, gate]) => `| ${name} | ${gate.status} | ${gate.passed ? `${gate.passed}/${unit.numTotalTests}; ${gate.testFiles} files` : gate.groups ? `${gate.groups} groups` : gate.pages ? `${gate.pages} role/page visits` : gate.roles ? `${gate.roles} roles × 2 activation modes; reload and logout persisted` : gate.warning || `exit ${gate.exitCode}`} | [evidence](${relative}${gate.evidence}) |`);
const doc = `# Gate summary — Ocean restoration\n\nGATE_SUMMARY_${summary.status === 'PASS' ? 'COMPLETE' : 'FAILED'}\n\nGenerated from recorded evidence at ${generatedAt}. No tests are executed by this summary script.\n\n| Gate | Result | Scope | Evidence |\n|---|---|---|---|\n${rows.join('\n')}\n\nApplication/config files are byte-identical to the prior 31/10–01/11 restoration gates. Only login/browser test scripts changed; the login gate was rerun on those changes. The new summary script reads evidence only. Typecheck/build exit codes come from the preserved [prior verification record](${relative}login-investigation/prior-verification-summary.json), with raw logs linked above.\n\nSource manifest: [source-manifest.json](${relative}source-manifest.json); SHA256 **${sourceTreeSha256}**. Application SHA256: **${appTreeSha256}**. Evidence HEAD c52cf87 is the backup parent, not the restoration commit. The containing Git commit and remote branch identify this packaged result.\n\n## Login investigation\n\nThe original timeout was reproduced at Manager as well as the prior Warehouse case. [Focus trace](${relative}login-investigation/focus-trace/ui-login-results.json) shows the element focused while document.hasFocus() was false, without logout key/click delivery. bringToFront alone did not resolve it. All failed experiments remain in login-investigation; their results are not relabelled PASS. See the [investigation](LOGIN_UAT_INVESTIGATION.md) for the final root cause, fix and validated scope.\n\n## Open issues and limits\n\n- Bundle warning >500 kB; Linux build and real backend/platform/payment integrations not run.\n- Full Maker/Checker manual payout, exchange/warranty, every advanced-module action and mobile form are not accepted by these tests.\n- Browser claim-paid compensation selection and multi-tab/DB concurrency remain unverified.\n- Finance/Viewer remain disabled from the prior backup; CS has no role definition. Proposals only: [role review](OCEAN_ROLE_REVIEW.md).\n- Some original analytics remain illustrative prototype data.\n\n## Review app\n\nServer: http://127.0.0.1:5174/app. Six original screens: dashboard, fulfillment, returns, syncMonitor, marketingAnalytics, auditTrail. See [before/after gallery](${relative}comparison.html). No layout/function expansion was made during gate/login closure. Publication is restricted to codex/restore-ocean-role-flows; no main merge or deployment.\n`;
const loginSection = `## Login investigation

The original timeout was reproduced with unified Chrome/156.0.8078.47 on Windows. Trusted key/click events did not reach the logout button after reload. Focus alone, password-bubble flags, fresh pages/browsers and larger virtual screens did not resolve it. A DOM-click probe exercised the application handler only; it is explicitly diagnostic and is never counted as UAT acceptance.

The same native-input probe on the already-installed chrome-headless-shell delivered trusted keyboard/click events and removed the session. Login UAT now selects that supported Puppeteer mode and waits for actual DOM/session outcomes. All five roles run sequentially on one browser/page, with pointer and keyboard logout, including signed-out reload. All failed runs remain unchanged in login-investigation. Exact internal Chromium cause is not established; unified-headless coverage remains a runner limitation. See [investigation](LOGIN_UAT_INVESTIGATION.md).

## Open issues`;
const finalDoc = doc.replace(/## Login investigation[\s\S]*?## Open issues/, loginSection)
  .replace('Application/config files', `Additional browser check: **unified Chrome login ${chromeLogin.status}**, [raw evidence](${relative}login-investigation/final-script-chrome/ui-login-results.json). This is an open runner limitation, not a PASS of that browser mode. The required login gate above uses shell.\n\nApplication/config files`)
  .replace('## Review app', `Git-normalized source hash: **${gitSourceTreeSha256}**; each manifest entry also contains its Git blob ID for independent verification across LF/CRLF checkouts.\n\n## Review app`);
await fs.writeFile('docs/audit/GATE_SUMMARY.md', finalDoc);
const roleNames = ['Owner', 'Admin', 'Manager', 'Warehouse', 'Growth'];
const roleRows = roles.map((role, index) => `| ${roleNames[index]} | ${['signIn', 'reload', 'logout', 'signedOutReload'].map(key => pass(['pointer', 'keyboard'].every(activation => login.steps.some(step => step.role === role && step.activation === activation && step.status === 'PASS' && step.checkpoints[key] === 'PASS')))).join(' | ')} |`);
const investigationPath = 'docs/audit/LOGIN_UAT_INVESTIGATION.md';
const investigation = await fs.readFile(investigationPath, 'utf8');
await fs.writeFile(investigationPath, investigation.replace(/<!-- LOGIN_RESULTS_START -->[\s\S]*?<!-- LOGIN_RESULTS_END -->/, `<!-- LOGIN_RESULTS_START -->\n| Role | Điền nhanh / đúng user | Reload giữ đúng user/role | Logout chuột và Space | Reload sau logout vẫn ở login |\n|---|---|---|---|---|\n${roleRows.join('\n')}\n<!-- LOGIN_RESULTS_END -->`));
console.log(JSON.stringify({ status: summary.status, gates, sourceFiles: files.length, changedSincePriorGates }, null, 2));
if (summary.status !== 'PASS') process.exitCode = 1;
