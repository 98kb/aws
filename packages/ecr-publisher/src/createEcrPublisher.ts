import type {ECRClient} from "@aws-sdk/client-ecr";
import {EcrPublisher} from "./EcrPublisher";

export function createEcrPublisher(ecr: ECRClient) {
  return new EcrPublisher(ecr);
}
