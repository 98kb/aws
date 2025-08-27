import type {ECRClient} from "@aws-sdk/client-ecr";
import {ensureECRRepo} from "./ensureECRRepo";
import {toLatestImageTag} from "./toLatestImageTag";
import {bumpVersion} from "./bumpVersion";
import {buildDockerImage} from "./buildDockerImage";
import {uploadImageToECR} from "./uploadImageToECR";
import type {PublishEcrOptions} from "./PublishEcrOptions";

export function createEcrPublisher(ecr: ECRClient) {
  return {
    publish: async (opts: PublishEcrOptions) => {
      await ensureECRRepo(ecr, opts);
      const latestTag = (await toLatestImageTag(ecr, opts.repo)) ?? "0.0.0";
      const newVersion = bumpVersion(latestTag, opts.bump);
      const localImageTag = await buildDockerImage(opts, newVersion);
      await uploadImageToECR(ecr, localImageTag, opts.repo, newVersion);
    },
  };
}
