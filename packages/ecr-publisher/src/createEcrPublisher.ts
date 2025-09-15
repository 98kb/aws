/* eslint-disable require-atomic-updates */
import type {ECRClient} from "@aws-sdk/client-ecr";
import {ensureECRRepo} from "./ensureECRRepo";
import {toLatestImageTag} from "./toLatestImageTag";
import {bumpVersion} from "./bumpVersion";
import {buildDockerImage} from "./buildDockerImage";
import {uploadImageToECR} from "./uploadImageToECR";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import type {Context} from "./Context";
import type {Hook} from "./Hook";

export function createEcrPublisher(ecr: ECRClient) {
  let context = {} as Context;
  const preBuildHooks: Hook[] = [];
  const applyHooks = async (hooks: Hook[]) => {
    for await (const hook of hooks) {
      context = await hook(context);
    }
  };
  return {
    beforeBuild(fn: Hook) {
      preBuildHooks.push(fn);
      return this;
    },

    publish: async (options: PublishEcrOptions) => {
      context.ecr = ecr;
      context.options = options;
      await ensureECRRepo(context);
      context.currentVersion = (await toLatestImageTag(context)) ?? "0.0.0";
      context.newVersion = options.versionPrefix + bumpVersion(context);
      const localImageTag = await buildDockerImage(context, {
        preBuild: applyHooks.bind(null, preBuildHooks),
      });
      await uploadImageToECR(context, localImageTag);
    },
  };
}
