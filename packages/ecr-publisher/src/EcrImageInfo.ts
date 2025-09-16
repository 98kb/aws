/**
 * Represents an ECR image with its digest and associated tags
 */
export interface EcrImageInfo {
  /** The unique image digest (SHA256 hash) */
  imageDigest: string;
  /** Array of tags associated with this digest */
  imageTags: string[];
  /** Size of the image in bytes */
  imageSizeInBytes?: number;
  /** When the image was pushed */
  imagePushedAt?: Date;
}
