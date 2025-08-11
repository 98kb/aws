# ECR Image Tagger Construct

AWS CDK construct for automated ECR image tagging with stage tags during deployment.

## Usage

```typescript
import { EcrImageTaggerConstruct } from '@mapp/ecr-image-tagger-construct';

const tagger = new EcrImageTaggerConstruct(this, 'EcrTagger', {
  repositoryName: 'my-app-repository',
  imageTag: '1.2.0',
  stageTag: 'prod',
  region: 'us-east-1' // optional
});

// Ensure tagging happens after successful deployment
myService.node.addDependency(tagger.customResource);
```

## Properties

```typescript
interface EcrImageTaggerProps {
  repositoryName: string;  // ECR repository name
  imageTag: string;        // Source image tag to duplicate
  stageTag: string;        // Stage tag to apply (e.g., 'dev', 'uat', 'prod')
  region?: string;         // AWS region (defaults to current region)
}
```

## How it Works

1. Retrieves the digest of the image being deployed
2. Finds and removes the stage tag from any image currently using it
3. Applies the stage tag to the new image being deployed

Each stage tag can only exist on one image at a time, but a single image can have multiple stage tags if deployed to multiple environments.

## Development

```bash
pnpm run build      # Build the construct
```

## IAM Permissions

The construct automatically creates the necessary IAM permissions for ECR operations.
