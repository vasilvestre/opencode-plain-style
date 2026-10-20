// Verifies the plugin loads in both shapes, exports the v1 system-transform
// hook, and the hook injects the rulebook. Runs in CI and locally via
// `npm test`.
import process from 'node:process';

const HOOK = 'experimental.chat.system.transform';
const MARKER = 'ISO 24495-1';

const plugin = await import('../.opencode/plugins/plain-style.js');
const createPlugin = plugin.default;
const hooks = await createPlugin.server();

if (typeof createPlugin.server !== 'function') {
  console.error('FAIL: plugin does not export a server() entrypoint for opencode v1');
  process.exit(1);
}
if (typeof createPlugin.setup !== 'function') {
  console.error('FAIL: plugin does not export a setup() entrypoint for opencode v2');
  process.exit(1);
}
if (typeof createPlugin.id !== 'string' || createPlugin.id.length === 0) {
  console.error('FAIL: plugin does not export an id (required by opencode v2)');
  process.exit(1);
}
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
console.log(`OK: setup() and server() entrypoints and id "${createPlugin.id}" present`);
