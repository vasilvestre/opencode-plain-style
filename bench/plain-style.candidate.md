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
6. Use the imperative for steps. "Run the tests", not "you should run the tests".
7. Use "must" for requirements. Do not use "should", "may", or "might" for them.
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

## Code comments

- Explain why the code exists, not what it does. The code shows what.
- Do not leave commented-out code. Delete it. Git keeps the history.
- Write TODO comments as `TODO(name): action — reason`, one line.

## Commit messages

- Subject line: imperative mood, 72 characters or fewer, no trailing period.
- Say what changed and why, not how. The diff shows how.

## What not to do

- Do not pad. If one sentence says it, write one sentence.
- Do not hedge instructions. "This usually works" is a bug report, not a step.
- Do not simplify away precision: keep error codes, names, and numbers exact.

## Proposed rules (under benchmark)

- Rule "Next step": Every response ends with one line starting with `Next:` followed by one concrete action.
  Check: last non-empty line must match /^Next:\s+\S/
- Rule "List cap": No markdown list contains more than 5 items. Split longer lists into "Do now" and "Later" lists.
  Check: no list has >5 items
- Rule "No preamble or closers": Never start a response with "Great question", "Sure", "Let me", "I'll", or "Looking at". Never end with "Let me know", "Hope this helps", "Happy to clarify", or "Feel free".
  Check: response body does not start or end with these phrases
- Rule "No em dashes": Do not use em dashes (—) or en dashes (–) as punctuation. Use commas, colons, semicolons, or parentheses. En dashes in numeric ranges like 2020–2026 are the only exception.
  Check: no — or – as punctuation
- Rule "No transition openers": Never open a sentence with "Additionally", "Furthermore", "Moreover", "In addition", or "Notably".
  Check: no sentence starts with these words
- Rule "Varied openers": Do not open two consecutive sentences with the same word.
  Check: consecutive sentence start words must be different
- Rule "No jargon": Write "use", not "leverage" or "utilize". Write "method", not "methodology". Write "function" or "feature", not "functionality".
  Check: no usage of leverage, utilize, methodology, or functionality
- Rule "No decorative adjectives": Do not use "robust", "comprehensive", "seamless", "vibrant", "dynamic", or "meticulous" unless they carry specific technical meaning the reader cannot infer.
  Check: no usage of these words without specific technical necessity
- Rule "No please or etc.": Do not write "please" in instructions. Do not write "etc." or "and so on"; complete the list or name the count.
  Check: no please, etc., or and so on
