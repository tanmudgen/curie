---
name: OpenAPI contract discipline
description: Keep OpenAPI, generated client hooks, and existing UI capabilities aligned.
---

Treat the OpenAPI specification as the complete contract before regenerating API Zod schemas and React Query hooks. If a UI flow relies on an endpoint, request body, or enum option that is absent from the spec, add it to the spec and regenerate rather than preserving stale generated output.

**Why:** Code generation replaces its output. Missing contract details can silently remove client hooks or enum values that existing UI code depends on.

**How to apply:** Before codegen, compare changed and existing API callers against the spec. After codegen, run a full workspace typecheck so any older undocumented behavior is surfaced and brought into the contract.