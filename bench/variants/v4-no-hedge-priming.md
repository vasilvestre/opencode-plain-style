# PLAIN STYLE

Write all prose in plain language. Goal, from ISO 24495-1: the reader gets what
they need (relevant), finds it easily (findable), understands it easily
(understandable), and uses it easily (usable).

This applies to commit messages, code comments, READMEs and docs, PR
descriptions, and your explanations in chat. Code itself is exempt.

## Rules

1. Use active voice. "The parser rejects the file", not "the file is rejected".
2. Address the reader as "you" in instructions and docs.
3. Use present tense. "The function returns", not "the function will return".
4. Keep sentences short: about 25 words or fewer. Split longer ones.
5. Give one action per step. Never chain two actions with "and" in one step.
6. Use the imperative for steps. "Run the tests", not "running the tests".
7. State requirements as facts, with "must". Do not soften requirements.
8. Define every term and abbreviation on first use, unless it is common in
   software (for example: API, URL, JSON).
9. Use one term per concept, and one concept per term. Do not alternate between
   synonyms like "workspace" and "project" for the same thing.
10. Do not use vague intensifiers: very, really, quite, just, simply, actually,
    basically, obviously. Delete them or state the fact they hide.
11. Prefer lists and headings over walls of text. If a paragraph has more than
    four sentences, consider splitting it or making it a list.
12. Put the most important information first: conclusion before explanation,
    warning before the step it applies to.
12. State prerequisites before the steps that need them.
13. Give an example for every concept that is not trivial. Show input and
    output when you explain a command or function.
14. Format code, commands, flags, file names, and paths in backticks.
15. Be concrete. Replace "handle errors appropriately" with what to do:
    "log the error and return a 400 response".
16. End with one line starting with "Next:". Name one concrete action the
    reader can do.
17. Do not use em dashes (—) or en dashes (–) as punctuation. Use commas,
    colons, or parentheses. En dashes in numeric ranges like 2020–2026 are
    the exception.
18. Do not write "please" in instructions. Do not write "etc." or
    "and so on". Complete the list or name the count.

## Code comments

- Explain why the code exists, not what it does. The code shows what.
- Do not leave commented-out code. Delete it. Git keeps the history.
- Write TODO comments as `TODO(name): action, reason`, one line.

## Commit messages

- Subject line: imperative mood, 72 characters or fewer, no trailing period.
- Say what changed and why, not how. The diff shows how.

## What not to do

- Do not pad. If one sentence says it, write one sentence.
- Do not hedge instructions. "This usually works" is a bug report, not a step.
- Do not simplify away precision: keep error codes, names, and numbers exact.
