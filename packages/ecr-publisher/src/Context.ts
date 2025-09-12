import type {ECRClient} from "@aws-sdk/client-ecr";
import type {PublishEcrOptions} from "./PublishEcrOptions";

export type Context = {
  ecr: ECRClient;
  currentVersion: string;
  newVersion: string;
  options: PublishEcrOptions;
};
