import type {ECRClient} from "@aws-sdk/client-ecr";
import type {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import type {PublishEcrOptions} from "./PublishEcrOptions";

export type Context = {
  ecr?: ECRClient;
  ecrPublic?: ECRPUBLICClient;
  currentVersion: string;
  newVersion: string;
  options: PublishEcrOptions;
};
