// plain-style — OpenCode plugin, supports opencode v1.x and v2.x.
//
// Injects the plain-language rulebook (plain-style.md, beside this file) into
// every chat's system prompt on every agent-loop LLM request, primary agent
// and subagents alike.
//
// The default export is one object with both entrypoints (v2 migration guide:
// https://opencode.ai/v2/docs/build/plugins/migrate-v1):
// - v2 calls setup() and registers a "context" session hook; system parts are
//   objects ({ type: "text", text }) there.
// - v1 (object entrypoints need opencode >= 1.18.29) calls server() and gets
//   the experimental.chat.system.transform hook; system entries there are
//   plain strings. The hook must mutate output.system in place (push), because v1
//   ignores a reassignment of output.system.
//
// Auto-discovered from .opencode/plugins/ in both versions, so no
// opencode.json entry is needed. To register it by hand instead:
// { "plugin": ["./.opencode/plugins/plain-style.js"] }  (opencode v1)
// { "plugins": ["./.opencode/plugins/plain-style.js"] } (opencode v2)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read once at load; a missing file throws here so startup fails loud instead
// of silently injecting nothing.
const dir = path.dirname(fileURLToPath(import.meta.url));
const rulebook = fs.readFileSync(
  path.join(dir, 'plain-style.md'),
  'utf8',
);

// Agents whose tool list is narrowed before the request is built. A review or
// planning agent has no business writing, and a tool it cannot see is a tool it
// cannot call. This is a prompt-level guard: `permissions` in the agent file
// stays the real one.
const HIDDEN_TOOLS = [
  { test: /rev|review|audit|plan/i, tools: ['write', 'edit', 'patch'] },
];

// "warn" (default) logs and changes nothing; "enforce" removes the tools.
function hiddenTools(agent, mode) {
  const rule = HIDDEN_TOOLS.find((r) => r.test.test(agent));
  if (!rule) return [];
  if (mode === 'enforce') return rule.tools;
  console.warn(`plain-style: agent "${agent}" could hide ${rule.tools.join(', ')} (mode warn)`);
  return [];
}

// opencode v2 rejects duplicate plugin ids at startup and drops every plugin
// when two instances collide. The npm install and a local repo copy share one
// file path shape, so each instance gets a unique id keyed by its own
// directory.
const location = dir.replaceAll(/[^\w]/g, '');
const hash = [...location].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16);

export default {
  id: `vasilvestre.opencode-plain-style-${hash}`,
  async setup(ctx) {
    const mode = ctx.options?.agentTools ?? 'warn';
    await ctx.session.hook('context', (event) => {
      event.system.push({ type: 'text', text: rulebook });
      // The context event carries the agent id and the tool map. Deleting a
      // key removes the tool from the request, not from the tool registry.
      if (!event.tools || !event.agent) return;
      for (const name of hiddenTools(event.agent, mode)) delete event.tools[name];
    });
  },
  async server() {
    return {
      'experimental.chat.system.transform': async (_input, output) => {
        output.system.push(rulebook);
      },
    };
  },
};
