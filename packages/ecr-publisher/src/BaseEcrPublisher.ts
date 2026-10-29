/* eslint-disable no-console */
import type {Context} from "./Context";
import type {Hook} from "./Hook";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import {ensureECRRepo} from "./ensureECRRepo";
import {toLatestImageTag} from "./toLatestImageTag";
import {bumpVersion} from "./bumpVersion";
import {buildDockerImage} from "./buildDockerImage";
import {uploadImageToECR} from "./uploadImageToECR";
import chalk from "chalk";
import type {PublishResult} from "./PublishResult";
import type {PublisherSettings} from "./PublisherSettings";
import {normalizePublisherSettings} from "./normalizePublisherSettings";
import {assertConfirmationAuthority} from "./assertConfirmationAuthority";

export class BaseEcrPublisher {
  context: Context;

  readonly preBuildHooks: Hook[] = [];
  readonly postVersionBumpHooks: Hook[] = [];
  readonly postBuildHooks: Hook[] = [];

  constructor(settings?: PublisherSettings) {
    this.context = {settings: normalizePublisherSettings(settings)} as Context;
  }

  afterVersionBump(fn: Hook): this {
    this.postVersionBumpHooks.push(fn);
    return this;
  }

  beforeBuild(fn: Hook): this {
    this.preBuildHooks.push(fn);
    return this;
  }

  afterBuild(fn: Hook): this {
    this.postBuildHooks.push(fn);
    return this;
  }

  async publish(options: PublishEcrOptions): Promise<PublishResult> {
    assertConfirmationAuthority(this.context.settings);
    this.context.options = options;
    await ensureECRRepo(this.context);
    await this.setNewVersion();
    const localImageTag = await buildDockerImage(this);
    const {digest} = await uploadImageToECR(this.context, localImageTag);
    return this.toPublishResult(digest);
  }

  async applyHooks(hooks: Hook[]): Promise<void> {
    for await (const hook of hooks) {
      this.context = await hook(this.context);
    }
  }

  private async setNewVersion(): Promise<void> {
    if (this.context.options.overrideVersion) {
      this.context.newVersion = this.context.options.overrideVersion;
      console.log(
        `🔧 ${chalk.magenta("Version:")} ${chalk.green(this.context.newVersion)} (override)`,
      );
    } else {
      this.context.currentVersion =
        (await toLatestImageTag(this.context)) ??
        `${this.context.options.versionPrefix}0.0.0`;
      this.context.newVersion = `${this.context.options.versionPrefix}${bumpVersion(this.context)}`;
    }
    await this.applyHooks(this.postVersionBumpHooks);
  }

  private toPublishResult(digest: string): PublishResult {
    const {options, currentVersion, newVersion} = this.context;
    if (options.overrideVersion) {
      return {newVersion, digest};
    }
    return {previousVersion: currentVersion, newVersion, digest};
  }
}
