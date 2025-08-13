import type {EcrImageTaggerProps} from "./EcrImageTaggerProps";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import * as path from "path";

/**
 * A CDK construct that automatically tags ECR Docker images with stage tags during deployment.
 *
 * This construct:
 * 1. Retrieves the digest of the image being deployed
 * 2. Finds and removes the stage tag from any image currently using it
 * 3. Applies the stage tag to the new image being deployed
 *
 * Each stage tag can only exist on one image at a time, but a single image
 * can have multiple stage tags if deployed to multiple environments.
 *
 * To ensure the stage tag is only applied after a successful deployment,
 * add dependencies directly to the customResource.node in your stack.
 */
export class EcrImageTaggerConstruct extends Construct {
  public readonly customResource: cdk.CustomResource;
  public readonly taggerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: EcrImageTaggerProps) {
    super(scope, id);

    const {
      repositoryName,
      imageTag,
      stageTag,
      region = cdk.Stack.of(this).region,
    } = props;

    this.taggerFunction = this.createTaggerFunction(region, repositoryName);
    this.customResource = this.createCustomResource(
      repositoryName,
      imageTag,
      stageTag,
      region,
    );
  }

  private createTaggerFunction(
    region: string,
    repositoryName: string,
  ): lambda.Function {
    const taggerFunction = new lambda.Function(this, "TaggerFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "handler.handler",
      timeout: cdk.Duration.minutes(5),
      logRetention: cdk.aws_logs.RetentionDays.TWO_WEEKS,
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../ecr-image-tagger-lambda"),
        {
          bundling: {
            image: lambda.Runtime.NODEJS_22_X.bundlingImage,
            command: [
              "bash",
              "-c",
              [
                // Set npm cache to writable location in container
                "export NPM_CONFIG_CACHE=/tmp/.npm",
                "cd /asset-input",
                "npm install",
                "npm run build",
                "cp dist/handler/handler.js /asset-output/handler.js",
                // Optional: copy source map for debugging (-f prevents failure if missing)
                "cp -f dist/handler/handler.js.map /asset-output/handler.js.map",
              ].join(" && "),
            ],
          },
        },
      ),
    });

    // Grant the Lambda function permissions to perform ECR operations
    taggerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:BatchGetImage", // Get image manifest and details
          "ecr:DescribeImages", // List all images in repository
          "ecr:BatchDeleteImage", // Remove old stage tags
          "ecr:PutImage", // Apply new stage tag
        ],
        resources: [
          `arn:aws:ecr:${region}:${cdk.Stack.of(this).account}:repository/${repositoryName}`,
        ],
      }),
    );

    return taggerFunction;
  }

  private createCustomResource(
    repositoryName: string,
    imageTag: string,
    stageTag: string,
    region: string,
  ): cdk.CustomResource {
    // Create a custom resource that uses our Lambda function
    const ecrTaggerCustomResource = new cdk.CustomResource(
      this,
      "EcrTaggerCustomResource",
      {
        serviceToken: this.taggerFunction.functionArn,
        properties: {
          repositoryName,
          imageTag,
          stageTag,
          region,
          // Add a timestamp to force updates on every deployment
          timestamp: Date.now().toString(),
        },
      },
    );

    // Make sure the custom resource runs after the function is created
    ecrTaggerCustomResource.node.addDependency(this.taggerFunction);

    return ecrTaggerCustomResource;
  }

  /**
   * The digest of the image that was tagged
   */
  public get imageDigest(): string {
    return this.customResource.getAtt("ImageDigest").toString();
  }

  /**
   * The stage tag that was applied
   */
  public get appliedStageTag(): string {
    return this.customResource.getAtt("StageTag").toString();
  }
}
