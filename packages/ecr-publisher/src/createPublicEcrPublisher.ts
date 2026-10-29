import type {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import {PublicEcrPublisher} from "./PublicEcrPublisher";
import type {PublisherSettings} from "./PublisherSettings";

export function createPublicEcrPublisher(
  ecrPublic: ECRPUBLICClient,
  settings?: PublisherSettings,
) {
  return new PublicEcrPublisher(ecrPublic, settings);
}
