import test from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile), cwd = fileURLToPath(new URL('..', import.meta.url));
for (const file of ['browser.cjs', 'browser-cuantitativas.cjs', 'browser-economia.cjs', 'browser-exam.cjs', 'browser-elasticity.cjs', 'browser-health.cjs']) {
  test(`browser regression: ${file}`, { timeout: 120000 }, async () => {
    await run(process.execPath, ['tests/' + file], { cwd, windowsHide: true, timeout: 110000, maxBuffer: 4 * 1024 * 1024 });
  });
}
