# @98kb/ecr-publisher

A CLI tool to automatically version, build, and publish Docker images to AWS ECR (Elastic Container Registry).

## Overview

The ECR Publisher CLI automates the entire Docker image publishing workflow:

1. **Version Management** - Automatically bumps semantic versions based on existing ECR tags
2. **Repository Management** - Creates ECR repositories if they don't exist
3. **Image Building** - Builds Docker images with proper `--docker-args`
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

## Examples

### Basic Usage

```bash
# Build and publish with minor version bump (requires dockerfile in docker args or default Dockerfile in context)
ecr-publisher --repo analytics --bump minor --docker-args -f apps/analytics/Dockerfile
```

### Specify AWS Region

```bash
# Publish to specific AWS region
ecr-publisher --region eu-west-1 --repo my-service --docker-args -f apps/my-service/Dockerfile
```

### Custom Docker Arguments

```bash
# Pass custom docker build arguments including dockerfile path
ecr-publisher --repo my-service \
  --docker-args -f apps/my-service/Dockerfile --build-arg NODE_ENV=production --build-arg API_URL=https://api.prod.com
```

### Custom Build Context

```bash
# Use current directory as build context with dockerfile in current directory
ecr-publisher --repo my-service --docker-args -f Dockerfile .
```

### Version Management

The tool uses semantic versioning (semver):

- **patch** (1.0.0 → 1.0.1) - Bug fixes, no breaking changes
- **minor** (1.0.0 → 1.1.0) - New features, backward compatible
- **major** (1.0.0 → 2.0.0) - Breaking changes

If no existing versions are found, it starts with `0.0.0`.

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
