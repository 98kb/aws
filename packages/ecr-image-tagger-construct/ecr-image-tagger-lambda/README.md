# ECR Image Tagger Lambda

AWS Lambda function for automated ECR image tagging as a CloudFormation custom resource.

## Installation

```bash
pnpm install
```

## Usage

### CloudFormation Example

```yaml
Resources:
  EcrImageTagger:
    Type: AWS::CloudFormation::CustomResource
    Properties:
      ServiceToken: !GetAtt EcrImageTaggerFunction.Arn
      repositoryName: "my-app-repository"
      imageTag: "latest"
      stageTag: "PROD"
      region: !Ref AWS::Region
```

### Properties

```typescript
interface EcrTaggingProperties {
  repositoryName: string;
  imageTag: string;
  stageTag: string;
  region: string;
}
```

## Development

```bash
pnpm run build      # Build the package
pnpm run typecheck  # Type checking
```

## IAM Permissions

Required permissions for the Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:ListImages"
      ],
      "Resource": "arn:aws:ecr:*:*:repository/*"
    }
  ]
}
```
