# @98kb/ecr-publisher

A CLI tool to automatically version, build, and publish Docker images to AWS ECR (Elastic Container Registry).

## Overview

The ECR Publisher CLI automates the entire Docker image publishing workflow:

1. **Version Management** - Automatically bumps semantic versions based on existing ECR tags
2. **Repository Management** - Creates ECR repositories if they don't exist
3. **Image Building** - Builds Docker images with proper `[context]` and `--docker-args`
4. **Publishing** - Uploads and tags images in ECR

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
ecr-publisher --repo <repository-name> [options] [context]
```

### Required Options

| Option | Description | Example |
|--------|-------------|---------|
| `-r, --repo <name>` | ECR repository name | `--repo my-service` |

### Optional Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--bump <type>` | Version bump type: `major`, `minor`, or `patch` | `minor` | `--bump patch` |
| `--region <region>` | AWS region for ECR | Uses AWS default | `--region us-east-1` |
| `--docker-args <args...>` | Additional docker build arguments (including dockerfile path) | None | `--docker-args -f Dockerfile --build-arg NODE_ENV=production` |
| `--dryRun` | Run without making any changes | `false` | `--dryRun` |

### Positional Arguments

| Argument | Description | Default | Example |
|----------|-------------|---------|---------|
| `[context]` | Docker build context path | `.` | `../my-app` |

## Examples

### Basic Usage

```bash
# Build and publish with minor version bump (requires dockerfile in docker args or default Dockerfile in context)
ecr-publisher --repo custom-reports-service --docker-args -f apps/custom-reports-service/Dockerfile
```

### Patch Release

```bash
# Build and publish with patch version bump
ecr-publisher --repo custom-reports-service --docker-args -f apps/custom-reports-service/Dockerfile --bump patch
```

### Major Release

```bash
# Build and publish with major version bump
ecr-publisher --repo custom-reports-service --docker-args -f apps/custom-reports-service/Dockerfile --bump major
```

### Specify AWS Region

```bash
# Publish to specific AWS region
ecr-publisher --repo my-service --docker-args -f apps/my-service/Dockerfile --region eu-west-1
```

### Custom Docker Arguments

```bash
# Pass custom docker build arguments including dockerfile path
ecr-publisher --repo my-service \
  --docker-args -f apps/my-service/Dockerfile --build-arg NODE_ENV=production --build-arg API_URL=https://api.prod.com

# Use port mapping (useful for build-time requirements)
ecr-publisher --repo my-service \
  --docker-args -f apps/my-service/Dockerfile -p 3000:3000

# Multiple docker arguments
ecr-publisher --repo my-service \
  --docker-args -f apps/my-service/Dockerfile --no-cache --build-arg ENV=production --platform linux/amd64
```

### Custom Build Context

```bash
# Use current directory as build context with dockerfile in current directory
ecr-publisher --repo my-service --docker-args -f Dockerfile .

# Use specific subdirectory as build context
ecr-publisher --repo my-service --docker-args -f Dockerfile ./apps/my-service
```

### Dry Run

```bash
# See what would happen without actually building or publishing
ecr-publisher --repo my-service --docker-args -f Dockerfile --dryRun
```

## Workflow Details

When you run the CLI, it performs these steps:

1. **🔍 Repository Check** - Verifies ECR repository exists, creates it if missing
2. **📋 Version Discovery** - Finds the latest semantic version tag in ECR
3. **⬆️ Version Bumping** - Increments version based on bump type (major.minor.patch)
4. **🏗️ Docker Build** - Builds image with proper `[context]` and `--docker-args`
5. **📤 Image Upload** - Pushes image to ECR with new version tag

### Version Management

The tool uses semantic versioning (semver):

- **patch** (1.0.0 → 1.0.1) - Bug fixes, no breaking changes
- **minor** (1.0.0 → 1.1.0) - New features, backward compatible
- **major** (1.0.0 → 2.0.0) - Breaking changes

If no existing versions are found, it starts with `0.0.0`.

### Build Context

By default, the Docker build uses the current directory as the build context, allowing Dockerfiles to access any files in the repository structure. You can override this by providing a custom context path as a positional argument:

```bash
# Use current directory as context
ecr-publisher --repo my-service --docker-args -f Dockerfile .

# Use specific subdirectory as context
ecr-publisher --repo my-service --docker-args -f Dockerfile ./apps/my-service
```

### Docker Arguments

You can pass additional arguments to the `docker build` command using the `--docker-args` option. This is useful for:

- **Dockerfile path**: `--docker-args "-f path/to/Dockerfile"` (required to specify dockerfile location)
- **Build arguments**: `--docker-args "-f Dockerfile --build-arg NODE_ENV=production"`
- **Platform specification**: `--docker-args "-f Dockerfile --platform linux/amd64"`
- **Cache control**: `--docker-args "-f Dockerfile --no-cache"`
- **Multiple arguments**: `--docker-args "-f Dockerfile --build-arg ENV=prod --no-cache --platform linux/amd64"`

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
