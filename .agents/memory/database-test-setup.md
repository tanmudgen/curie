---
name: Database test setup
description: Constraint to remember when creating temporary verification data through the workspace SQL helper.
---

The workspace SQL helper sends statements as prepared queries, so a call containing multiple SQL commands is rejected. Run temporary fixture inserts, updates, and cleanup statements as separate calls.

**Why:** Multi-command setup fails before any statement runs, which can make a valid verification plan appear to have a database problem.

**How to apply:** Keep each `executeSql` call to one statement; use parameters for generated room codes and other test values, and clean dependent rows before parent rows.