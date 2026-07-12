# ADR 007: Generate agent instructions for non-automatable migrations

- **Status:** Proposed
- **Date:** 2026-07-12
- **Related design doc:** [001-vitestify](../design-docs/archived/001-vitestify.md)

## Context

- Some setups (custom Jest config, unusual Nx executors) are too risky to auto-fix; skipping silently leaves users broken.

## Decision

- Heuristics will emit **`needs-agent`** findings; an agent-instruction transform will stage Markdown files for them.
- Automated transforms continue for everything else. **Not yet implemented.**

## Consequences

### Positive

- Common path stays fully automated; edge cases get actionable instructions for users or AI assistants.

### Negative / accepted risks

- Instruction quality is manual; users must notice and act on generated files.
