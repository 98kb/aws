# @98kb/ecr-publisher

A CLI tool to automatically version, build, and publish Docker images to AWS ECR (Elastic Container Registry).

## Overview

The ECR Publisher CLI automates the entire Docker image publishing workflow:

1. **Version Management** - Automatically bumps semantic versions based on existing ECR tags
2. **Repository Management** - Checks the repository exists; a missing one is created only as `--create-repo` allows (asks by default, never in `--non-interactive` mode unless `--create-repo always`)
3. **Image Building** - Builds Docker images with proper `--docker-args`
4. **Publishing** - Uploads and tags images in ECR and prints the pushed image digest

## Breaking changes in 3.0.0

- **Errors are thrown instead of calling `process.exit`.** `publish()` rejects with a typed error (see [Errors](#errors)); declining a prompt rejects with `PublishCancelledError`. The CLI still exits 0 on cancellation and 1 on any other error.
- **`previousVersion` is optional.** `publish()` resolves with `{previousVersion?, newVersion, digest}`; `previousVersion` is absent when `overrideVersion` was used.
- **Push output is line-based.** `docker push` output is captured to read the digest and echoed line by line, so Docker's live progress bars no longer redraw.
- **Repository check errors propagate.** Only a repository-not-found response counts as a missing repo; any other error from the existence check (for example `AccessDenied`) now rejects `publish()` instead of triggering repo creation.

## Prerequisites

Before using the ECR Publisher, ensure you have:

- **Docker** installed and running
- **AWS credentials** configured (via AWS CLI, environment variables, or IAM roles)
- Proper AWS permissions for ECR operations

### Required AWS Permissions

Your AWS credentials need the following ECR permissions:

- `ecr:CreateRepository`
- `ecr:DescribeRepositories`
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`
- `ecr:ListImages`

## Usage

### Basic Syntax

```bash
ecr-publisher --repo <repository-name> [options] [--docker-args <args...> <context>]
```

The build context (e.g. `.`) goes last inside `--docker-args`.

### Required Options

| Option | Description | Example |
|--------|-------------|---------|
| `-r, --repo <name>` | ECR repository name | `--repo my-service` |

### Optional Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--bump <type>` | Version bump type: `major`, `minor`, or `patch` | `minor` | `--bump patch` |
| `--region <region>` | AWS region for ECR | Uses AWS default | `--region us-east-1` |
| `--docker-args <args...>` | Docker build arguments, ending with the build context (e.g. `.`) | None | `--docker-args -f Dockerfile --build-arg NODE_ENV=production .` |
| `--yes` | Auto-approve the build and push prompts. Never approves repo creation | `false` | `--yes` |
| `--non-interactive` | Never prompt. Without `--yes`, fails before any AWS or Docker call | `false` | `--non-interactive` |
| `--create-repo <policy>` | Missing-repo policy: `prompt`, `always`, or `never` | `prompt` | `--create-repo always` |

On success the CLI prints the pushed version and image digest. Cancelling a prompt exits 0; every other error exits 1.

## Examples

### Basic Usage

```bash
# Build and publish with minor version bump.
# --docker-args is passed to `docker build` as-is, so it must end with the build context (here `.`).
ecr-publisher --repo analytics --bump minor --docker-args -f apps/analytics/Dockerfile .
```

### Specify AWS Region

```bash
# Publish to specific AWS region
ecr-publisher --region eu-west-1 --repo my-service --docker-args -f apps/my-service/Dockerfile .
```

### Custom Docker Arguments

```bash
# Pass custom docker build arguments including dockerfile path
ecr-publisher --repo my-service \
  --docker-args -f apps/my-service/Dockerfile --build-arg NODE_ENV=production --build-arg API_URL=https://api.prod.com .
```

### Custom Build Context

```bash
# Use current directory as build context with dockerfile in current directory
ecr-publisher --repo my-service --docker-args -f Dockerfile .
```

### CI (headless)

```bash
# No prompts; fail if the repository does not exist
ecr-publisher --repo my-service --yes --non-interactive --docker-args -f Dockerfile .
```

### Version Management

The tool uses semantic versioning (semver):

- **patch** (1.0.0 → 1.0.1) - Bug fixes, no breaking changes
- **minor** (1.0.0 → 1.1.0) - New features, backward compatible
- **major** (1.0.0 → 2.0.0) - Breaking changes

If no existing versions are found, it starts with `0.0.0`.

## Library Usage

```ts
import {ECRClient} from "@aws-sdk/client-ecr";
import {createEcrPublisher, isEcrPublisherError} from "@98kb/ecr-publisher";

const publisher = createEcrPublisher(new ECRClient({region: "us-east-1"}), {
  yes: true,
  interactive: false,
  createRepo: "never",
});

try {
  const {previousVersion, newVersion, digest} = await publisher.publish({
    repo: "my-service",
    bump: "patch",
    dockerArgs: ["-f", "Dockerfile", "."],
    versionPrefix: "",
    public: false,
  });
  console.log(previousVersion, newVersion, digest);
} catch (error) {
  if (isEcrPublisherError(error, "REPO_MISSING")) {
    // provision the repository first
  }
  throw error;
}
```

Use `createPublicEcrPublisher` with an `ECRPUBLICClient` for public ECR. `EcrPublisher` and `PublicEcrPublisher` constructors take the same optional settings as their second argument.

### Settings (`PublisherSettings`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `confirm` | `ConfirmFn` | none | Called as `confirm(message, {step})` with `step` `"create-repo"`, `"build"`, or `"push"`. Return `true` or nothing to proceed, `false` to cancel. Anything it throws propagates unchanged |
| `yes` | `boolean` | `false` | Auto-approve build and push when no `confirm` is given. Never answers repo creation |
| `interactive` | `boolean` | `true` | When `false`: never prompts, Docker gets no stdin, spinners print plain lines. No TTY auto-detection |
| `createRepo` | `CreateRepoPolicy` | `"prompt"` | `"prompt"`, `"always"`, or `"never"` when the repository is missing |
| `runner` | `CommandRunner` | `cross-spawn` runner | Runs every Docker command (build, login, tag, push) |

Build and push confirmations are answered by the first available of: the `confirm` callback, `yes`, the built-in terminal prompt (only when `interactive` is `true` and stdin is a TTY). With `interactive: false` and neither `confirm` nor `yes`, `publish()` rejects with `ConfirmationRequiredError` before any AWS or Docker call.

A missing repository is handled by `createRepo`, regardless of `yes`:

| `createRepo` | `interactive: true` | `interactive: false` |
|---|---|---|
| `"prompt"` | ask via `confirm`, else the terminal prompt; declining cancels | `RepositoryMissingError` |
| `"always"` | create without asking | create without asking |
| `"never"` | `RepositoryMissingError` | `RepositoryMissingError` |

Repository checks run before the build, so a missing-repo rejection leaves nothing built or pushed.

### Errors

All errors below extend `EcrPublisherError` and carry a stable `code`. Prefer `isEcrPublisherError(error, code)`, which checks `code` and works even if two copies of the package are installed.

| Error | `code` | When |
|-------|--------|------|
| `ConfirmationRequiredError` | `CONFIRMATION_REQUIRED` | A confirmation is needed but nothing can answer it (headless without `confirm`/`yes`, or no TTY) |
| `PublishCancelledError` | `CANCELLED` | A confirmation was declined; carries `step` |
| `RepositoryMissingError` | `REPO_MISSING` | The repository is missing and `createRepo` does not allow creating it; carries `repo` |
| `DigestNotFoundError` | `DIGEST_NOT_FOUND` | `docker push` output contained no digest; carries `imageTag` |
| `CommandFailedError` | `COMMAND_FAILED` | A Docker command failed to spawn or exited non-zero; carries `command`, `exitCode`, `errorCode` |

## Troubleshooting

### Common Issues

**Docker not available**

```
Error: Docker is not installed or not running
```

- Solution: Install Docker and ensure it's running

**AWS credentials not configured**

```
Error: Unable to locate credentials
```

- Solution: Configure AWS credentials using `aws configure` or environment variables

**Dockerfile not found**

```
Error: Dockerfile not found at specified path
```

- Solution: Verify the Dockerfile path is correct in the `--docker-args -f` option relative to the build context

**Permission denied on ECR**

```
Error: AccessDenied
```

- Solution: Ensure your AWS credentials have the required ECR permissions

### Debug Tips

1. **Check Docker**: `docker --version`
2. **Check AWS credentials**: `aws sts get-caller-identity`
3. **Verify Dockerfile path**: Ensure path in `--docker-args -f` is correct relative to build context
4. **Check ECR permissions**: Test with AWS CLI: `aws ecr describe-repositories`
