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
  return new EcrPublisher(ecr);
}

class EcrPublisher {
  private context: Context = {} as Context;

  private preBuildHooks: Hook[] = [];

  constructor(ecr: ECRClient) {
    this.context.ecr = ecr;
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
    const localImageTag = await buildDockerImage(this.context, {
      preBuild: this.applyHooks.bind(this, this.preBuildHooks),
    });
    await uploadImageToECR(this.context, localImageTag);
  }

  private async applyHooks(hooks: Hook[]): Promise<void> {
    for await (const hook of hooks) {
      this.context = await hook(this.context);
    }
  }
}
