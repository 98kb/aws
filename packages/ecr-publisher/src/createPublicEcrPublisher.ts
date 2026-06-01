import type {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import {PublicEcrPublisher} from "./PublicEcrPublisher";

export function createPublicEcrPublisher(ecrPublic: ECRPUBLICClient) {
  return new PublicEcrPublisher(ecrPublic);
}
