# opencode-plain-style

Plain-language writing rules for opencode agents, injected into every system prompt.

**Measured effect: fully-compliant prose rises from 66.7% to 93.3% of runs (+26.6 points).**
See the [benchmark](bench/BENCHMARK.md) for method, raw data, and reproduction steps.

## What it does

The plugin adds one rulebook to the system prompt on every LLM call.
The rulebook derives from ISO 24495-1 (plain language) and the Google developer documentation style guide.
It governs commit messages, code comments, READMEs, docs, PR descriptions, and chat explanations.
Code itself is exempt.

Rules include:

- Active voice, second person, present tense.
- Sentences of 25 words or fewer.
- Imperative mood for steps, one action per step.
- `must` for requirements, never hedging modal verbs.
- A banned list of vague intensifiers.
- Lists and headings over walls of text, conclusion first.

Because the injection happens per request, the rules survive context compaction.
AGENTS.md instructions, by contrast, get summarized away during compaction.

## Install

Add the package to the `plugin` array in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@vasilvestre/opencode-plain-style"]
}
```

Restart opencode. The plugin loads at startup and works for the primary agent and every subagent.

## How it works

The plugin registers one hook: `experimental.chat.system.transform`.
On each request it pushes the rulebook text into the system prompt array.
The rulebook is read from disk once at module load, so each request costs one array push and zero I/O.
Total plugin code: about 25 lines, no dependencies.

Note: the hook is marked experimental in opencode.
If opencode renames it, the plugin fails loudly at startup rather than injecting nothing.

## Example output

Same blind prompt, same model, same agent: "Describe what happens when an HTTP request reaches an Express server."

Without the plugin (control), the agent writes dense prose with vague intensifiers:

```text
Express is really just a callback you handed to http.createServer() —
app.listen(port) is sugar for http.createServer(app).listen(port).
It's middleware all the way down: routes are just middleware that
happens to match on path + method.
```

With the plugin (treatment), the same agent writes numbered steps and adds an example:

```text
1. Node's HTTP server receives it. Node parses the raw bytes into req
   (request) and res (response) objects, then calls your Express app
   as a handler function.
2. Express wraps the request. Express extends req and res with its own
   helpers (like req.query, res.json()), then starts walking the
   middleware stack.

Example:

const express = require('express');
const app = express();
app.use(express.json());          // parses JSON body
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});
```

Both excerpts are real benchmark outputs, unedited.
Full transcripts: [bench/runs/20260729-105827/](bench/runs/20260729-105827/).

## Benchmark

A/B design: same agent, same pinned model, two config replicas identical except this plugin.

| Rule                    | Control | Treatment | Delta  |
| ----------------------- | ------: | --------: | -----: |
| Banned-intensifier-free |   80.0% |      100% | +20.0  |
| Hedge-free              |   93.3% |      100% |  +6.7  |
| Sentences ≤25 words     |   73.3% |     93.3% | +20.0  |
| Fully compliant         |   66.7% |     93.3% | +26.6  |

30 runs total: 5 blind probes × 3 repetitions × 2 arms, deterministic scoring, zero LLM judging.
Injection shifts probability; it does not guarantee compliance.
For a hard guarantee, add deterministic linting (for example Vale) to CI.

Full details: [bench/BENCHMARK.md](bench/BENCHMARK.md).

## Customize the rules

The rulebook is plain markdown at `.opencode/plugins/plain-style.md`.
Fork the repo, edit the file, and point your config at the local copy:

```json
{
  "plugin": ["file:///path/to/your/fork/.opencode/plugins/plain-style.mjs"]
}
```

## Development

The `bench/` directory holds the full benchmark suite: harness, scorer, aggregator, raw results.

```bash
cd bench
./harness.sh 3 --jobs 2
node aggregate.mjs runs/<timestamp>
```

The harness measures the machine's live opencode config, control arm versus treatment arm.

## License

MIT.
