// plain-style — OpenCode plugin.
//
// Injects the plain-language rulebook (plain-style.md, beside this file) into
// every chat's system prompt on every LLM request — primary agent and
// subagents alike — so the rules survive context compaction. Pattern cloned
// from the ponytail plugin (experimental.chat.system.transform).
//
// Registered in opencode.jsonc: { "plugin": [..., "./plugins/plain-style.mjs"] }

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read once at load; a missing file throws here so startup fails loud instead
// of silently injecting nothing.
const rulebook = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'plain-style.md'),
  'utf8',
);

export default async () => ({
  'experimental.chat.system.transform': async (_input, output) => {
    output.system.push(rulebook);
  },
});
