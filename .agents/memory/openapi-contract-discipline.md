---
name: OpenAPI contract discipline
description: Keep OpenAPI, generated client hooks, and existing UI capabilities aligned.
---

Treat the OpenAPI specification as the complete contract before regenerating API Zod schemas and React Query hooks. If a UI flow relies on an endpoint, request body, or enum option that is absent from the spec, add it to the spec and regenerate rather than preserving stale generated output.

**Why:** Code generation replaces its output. Missing contract details can silently remove client hooks or enum values that existing UI code depends on.

**How to apply:** Before codegen, compare changed and existing API callers against the spec. After codegen, run a full workspace typecheck so any older undocumented behavior is surfaced and brought into the contract.

For an optional nested response object, omit the property when no value exists. Only send `null` when the OpenAPI schema explicitly allows null.

**Why:** Generated Zod contracts distinguish an absent optional property from `null`; returning `null` for an object-only optional field can turn an otherwise successful endpoint into a 500.

**How to apply:** Match API response construction to the generated schema's optionality and nullability, especially for nested details that may not exist yet.