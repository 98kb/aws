import type {ECRClient} from "@aws-sdk/client-ecr";
import {EcrPublisher} from "./EcrPublisher";
import type {PublisherSettings} from "./PublisherSettings";

export function createEcrPublisher(
  ecr: ECRClient,
  settings?: PublisherSettings,
) {
  return new EcrPublisher(ecr, settings);
}
