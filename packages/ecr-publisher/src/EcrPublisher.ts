import type {ECRClient} from "@aws-sdk/client-ecr";
import type {Context} from "./Context";
import type {Hook} from "./Hook";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import {ensureECRRepo} from "./ensureECRRepo";
import {toLatestImageTag} from "./toLatestImageTag";
import {bumpVersion} from "./bumpVersion";
import {buildDockerImage} from "./buildDockerImage";
import {uploadImageToECR} from "./uploadImageToECR";

export class EcrPublisher {
  context: Context = {} as Context;

  readonly preBuildHooks: Hook[] = [];
  readonly postVersionBumpHooks: Hook[] = [];

  constructor(ecr: ECRClient) {
    this.context.ecr = ecr;
  }

  afterVersionBump(fn: Hook): EcrPublisher {
    this.postVersionBumpHooks.push(fn);
    return this;
  }

  beforeBuild(fn: Hook): EcrPublisher {
    this.preBuildHooks.push(fn);
    return this;
  }

  async publish(options: PublishEcrOptions): Promise<void> {
    this.context.options = options;
    await ensureECRRepo(this.context);
    this.context.currentVersion =
      (await toLatestImageTag(this.context)) ?? "0.0.0";
    this.context.newVersion = options.versionPrefix + bumpVersion(this.context);
    await this.applyHooks(this.postVersionBumpHooks);
    const localImageTag = await buildDockerImage(this);
    await uploadImageToECR(this.context, localImageTag);
  }

  async applyHooks(hooks: Hook[]): Promise<void> {
    for await (const hook of hooks) {
      this.context = await hook(this.context);
    }
  }
}
