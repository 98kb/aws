import type {CloudFormationCustomResourceEvent} from "aws-lambda";

/**
 * Extracts existing PhysicalResourceId from event or generates a new one
 */
export function extractOrGeneratePhysicalResourceId(
  event: CloudFormationCustomResourceEvent,
): string {
  const eventWithId = event as {PhysicalResourceId?: string};
  return eventWithId.PhysicalResourceId || `ecr-tagger-${Date.now()}`;
}
