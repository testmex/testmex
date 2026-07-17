---
name: charted-loop
description: Runs Charted Coding iterations in a loop — route via charted-continue, batch red or green work for an entire test file, commit, then repeat until the PR is complete. Infers design doc and PR number when omitted. Use when the user invokes charted loop, wants batch TDD for a PR test file, or asks to continue charted work with commits.
---

# Context

- designDocPath: $ARGUMENTS[0] (optional)
- prNumber: $ARGUMENTS[1] (optional)

# Goal

Run Charted Coding iterations until the PR is complete: route via `charted-continue`, batch work for the current test file, commit, then **immediately start the next iteration** — without waiting for the user to invoke `/charted-loop` again.

# Steps

## 1. Route via charted-continue

Read and follow the `charted-continue` skill with `${designDocPath}` and `${prNumber}` when provided — but **do not** invoke `charted-red` or `charted-green` yet.

Omit missing arguments; `charted-continue` resolves `${designDocPath}` and `${prNumber}` in its step 0.

Use the resolved values from `charted-continue` for the rest of this skill.

Stop early if `charted-continue` reports the PR is complete.

Record the route:

| charted-continue route | Action in step 2 |
| ---------------------- | ---------------- |
| `charted-scaffold`     | Scaffold batch   |
| `charted-red`          | Red batch        |
| `charted-green`        | Green batch      |

Also record `testFilePath` from charted-continue step 4 when routing to red or green.

## 2. Batch work

### Scaffold batch

Read and follow the `charted-scaffold` skill with `${designDocPath}` and `${prNumber}`.

### Red batch

Read and follow the `charted-red` skill with `${designDocPath}` and `${testFilePath}`, but apply it to **all** unimplemented todos in `${testFilePath}` in one pass — not just the next one.

### Green batch

Read and follow the `charted-green` skill with `${designDocPath}` and `${testFilePath}`, but activate and green **all** implemented tests in `${testFilePath}` in one pass — not one at a time.

## 3. Commit

Commit only when there are changes. Read the `commit` skill for scope rules.

Use these **Charted loop** prefixes (they override the default commit-skill emojis for this workflow):

| Change | Commit prefix |
| ------ | ------------- |
| Design doc progress only | `docs({scope}): 📝 ...` |
| Scaffold (WIP files/stubs) | `refactor({scope}): 🏗️ ...` |
| Red (test bodies written, still `it.todo`) | `test({scope}): 🛑 ...` |
| Green (implementation to pass tests, no new wired behavior) | `refactor({scope}): ✅ ...` |
| Green (new wired behavior — e.g. wiring, exports, feature flags on) | `feat({scope}): ✨ ...` |

When a green batch touches both production code and the design doc, create **two commits** in this order:

1. Production/test changes — `refactor` or `feat` as above
2. Design doc checkbox updates — `docs({scope}): 📝 ...`

When unsure whether green work is `refactor` or `feat`, use `refactor` unless the change is live, user-visible behavior.

### Commit workflow

1. Run `git status`, `git diff`, and `git log -1 --oneline` in parallel.
2. Stage only files for this iteration.
3. Commit with a HEREDOC message.
4. Run `git status` to confirm a clean commit.

Do not push unless the user asks.

## 4. Loop

After step 3 finishes (commit succeeded, or there were no changes to commit), **go back to step 1** with the same resolved `${designDocPath}` and `${prNumber}`.

Keep looping until step 1 reports the PR is complete. Do not tell the user to run `/charted-loop` again — that is this skill's job.

When the PR is complete, report a short summary of iterations run and commits made.

# Rules

- One route per iteration — never scaffold, red, and green in the same iteration.
- Do not skip ahead to a later test file while an earlier pending test in the PR order is unfinished.
- Do not stop after a single iteration while the PR still has pending work.
