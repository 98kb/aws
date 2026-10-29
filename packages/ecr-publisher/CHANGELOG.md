# Changelog

## 3.0.0 — 2026-10-29

Headless CI publishing: `publish()` can now run without a TTY and returns the pushed image digest.

### Breaking changes

- **Errors are thrown instead of calling `process.exit`.** `publish()` rejects with a typed `EcrPublisherError`; declining a prompt rejects with `PublishCancelledError`. The CLI still exits 0 on cancellation and 1 on any other error.
- **`previousVersion` is optional.** `publish()` resolves with `{previousVersion?, newVersion, digest}`; `previousVersion` is absent when `overrideVersion` is used.
- **Push output is line-based.** `docker push` output is captured to read the digest and echoed line by line, so Docker's live progress bars no longer redraw.
- **Repository check errors propagate.** Only `RepositoryNotFoundException` counts as a missing repo; any other error (e.g. `AccessDenied`) now rejects instead of triggering repo creation.
- The 2.x prompt/exit and spawn helpers are removed from the public API.

### Features

- `publish()` resolves with the pushed image `digest`, parsed from this run's `docker push` output.
- Optional `PublisherSettings` for `createEcrPublisher` / `createPublicEcrPublisher` and the `EcrPublisher` / `PublicEcrPublisher` constructors: `confirm`, `yes`, `interactive`, `createRepo` (`prompt` | `always` | `never`), and an injectable command runner.
- Preflight check fails headless runs without confirmation authority before any side effect.
- Typed error hierarchy with stable codes and an `isEcrPublisherError(error, code?)` guard.
- CLI flags `--yes`, `--non-interactive`, and `--create-repo <prompt|always|never>`; the success line prints the digest.
- Spinners drop animation in headless runs.

### Fixes

- Installed `ecr-publisher` bin now has a node shebang; previously it was run by `sh` and failed with `use strict: not found`.
- `--help`, README, and `--docker-args` examples now include the build context (`.`).
- A closed or destroyed TTY stdin is treated as unable to prompt, so runs reject with `ConfirmationRequiredError` instead of hanging.

## 2.6.0 — 2026-06-01

### Features

- Support for public ECR repositories (`--public` flag, `createPublicEcrPublisher`).

### Fixes

- Improved handling of custom Docker arguments.
