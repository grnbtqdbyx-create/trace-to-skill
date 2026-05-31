# Codex patch overwrite fixture

Public source signals:

- https://github.com/openai/codex/issues/25399
- https://github.com/openai/codex/issues/10037

## Symptom

Codex CLI `0.135.0` on Linux accepted an `apply_patch` operation using `*** Add File`
against a path that already existed.

apply_patch accepted `*** Add File` for an existing file and silently caused a destructive overwrite instead of failing.

The patch body looked like:

```text
*** Begin Patch
*** Add File: /tmp/repro/existing.txt
+new content
*** End Patch
```

Observed tool output:

```text
Success. Updated the following files:
A /tmp/repro/existing.txt
```

The existing file previously contained:

```text
original line 1
original line 2
```

After the `Add File` operation, the file contained only:

```text
new content
```

## Why this is high risk

The operation is presented as a create/add operation, but the actual behavior is a destructive overwrite.
In the related `.env` symlink report, the existing workspace path was a symlink and the linked target contents
were replaced. That makes the audit trail misleading because `A path` reads like creation while the real
effect can be data loss.

## Minimum triage evidence to capture

- Codex CLI/app version and platform.
- Exact patch text, especially the `*** Add File:` target.
- Whether the target path existed before the patch.
- Whether the target path was a symlink and where it pointed.
- `git diff --stat` or `git diff -- <path>` before and after.
- Tool output summary showing `A <path>` or any overwrite warning.
- Whether `Update File` against a missing file and `Delete File` against a missing file behave strictly.
- Whether a clean temp directory reproduction fails the same way.

## Local guard

`trace-to-skill guard-patch` should fail a patch like this before it reaches an apply step:

```bash
trace-to-skill guard-patch ./change.patch --root .
```
