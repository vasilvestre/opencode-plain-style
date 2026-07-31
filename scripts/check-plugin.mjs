// Verifies the plugin loads, exports the system-transform hook, and the hook
// injects the rulebook. Runs in CI and locally via `npm test`.
import process from 'node:process';

const HOOK = 'experimental.chat.system.transform';
const MARKER = 'ISO 24495-1';

const { default: createPlugin } = await import('../.opencode/plugins/plain-style.mjs');
const hooks = await createPlugin();
if (typeof hooks[HOOK] !== 'function') {
  console.error(`FAIL: plugin does not export hook "${HOOK}"`);
  process.exit(1);
}
const output = { system: [] };
await hooks[HOOK]({ sessionID: 'check', model: {} }, output);
if (output.system.length !== 1 || !output.system[0].includes(MARKER)) {
  console.error(`FAIL: hook did not inject the rulebook (marker "${MARKER}" missing)`);
  process.exit(1);
}
console.log(`OK: hook "${HOOK}" injects the rulebook`);
