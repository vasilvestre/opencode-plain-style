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
if (typeof createPlugin.id !== 'string' || !createPlugin.id.startsWith('vasilvestre.opencode-plain-style')) {
  console.error('FAIL: plugin does not export a stable id (required by opencode v2)');
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

// The v2 context hook also narrows the tool list, but only in enforce mode.
async function contextEvent(options, agent) {
  let handler;
  await createPlugin.setup({
    options,
    session: { hook: async (name, fn) => name === 'context' && (handler = fn) },
  });
  const event = { agent, system: [], tools: { read: {}, write: {}, edit: {}, patch: {}, shell: {} } };
  await handler(event);
  return event;
}

const warn = await contextEvent({}, 'code-reviewer');
if (!('write' in warn.tools) || !('edit' in warn.tools)) {
  console.error('FAIL: warn mode removed a tool');
  process.exit(1);
}
if (warn.system.length !== 1) {
  console.error('FAIL: warn mode did not inject the rulebook');
  process.exit(1);
}

const enforce = await contextEvent({ agentTools: 'enforce' }, 'code-reviewer');
if ('write' in enforce.tools || 'edit' in enforce.tools || 'patch' in enforce.tools) {
  console.error('FAIL: enforce mode kept a hidden tool for a review agent');
  process.exit(1);
}
if (!('read' in enforce.tools) || !('shell' in enforce.tools)) {
  console.error('FAIL: enforce mode removed a tool it must keep');
  process.exit(1);
}

const builder = await contextEvent({ agentTools: 'enforce' }, 'build');
if (!('write' in builder.tools) || !('edit' in builder.tools)) {
  console.error('FAIL: enforce mode removed a tool from an agent that writes');
  process.exit(1);
}

console.log('OK: the context hook hides write tools from review agents in enforce mode only');
