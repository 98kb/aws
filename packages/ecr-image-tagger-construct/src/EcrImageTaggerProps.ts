export interface EcrImageTaggerProps {
  /**
   * The name of the ECR repository
   */
  repositoryName: string;

  /**
   * The semantic version tag of the image (e.g., '1.2.0')
   */
  imageTag: string;

  /**
   * The stage tag to apply (e.g., 'dev', 'uat', 'prod')
   */
  stageTag: string;

  /**
   * The AWS region where the ECR repository is located
   * @default - Current region
   */
  region?: string;
}
