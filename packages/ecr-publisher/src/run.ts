/* eslint-disable no-console */
import type {ECRClient} from "@aws-sdk/client-ecr";
import {ensureECRRepo} from "./ensureECRRepo";
import {toLatestImageTag} from "./toLatestImageTag";
import {bumpVersion} from "./bumpVersion";
import {buildDockerImage} from "./buildDockerImage";
import {uploadImageToECR} from "./uploadImageToECR";
import type {Options} from "./Options";

export async function run(ecr: ECRClient, opts: Options) {
  await ensureECRRepo(ecr, opts);
  const latestTag = (await toLatestImageTag(ecr, opts.repo)) ?? "0.0.0";
  const newVersion = bumpVersion(latestTag, opts.bump);
  console.log(`🔧 Bumping version from ${latestTag} to ${newVersion}`);
  const localImageTag = await buildDockerImage(opts, newVersion);
  if (!opts.dryRun) {
    await uploadImageToECR(ecr, localImageTag, opts.repo, newVersion);
  }
}
