/* eslint-disable no-console */
import type {Options} from "./Options";
import {promptConfirmOrExit} from "./promptConfirmOrExit";
import {printCommand} from "./printCommand";
import {executeCommand} from "./executeCommand";

type BuildCommandRequest = {
  imageTag: string;
  buildContext: string;
  version: string;
  dockerArgs?: string[];
};

/**
 * Builds a Docker image using the specified Docker arguments and tags it with the provided version
 * The build context can be specified in options, defaults to monorepo root if not provided
 * Dockerfile path should be specified in dockerArgs using -f or --file flag
 * @param opts - Build options including repo, context, and docker arguments
 * @param version - Version tag for the image
 * @returns Promise<string> - The image tag of the built image
 */
export async function buildDockerImage(
  opts: Options,
  version: string,
): Promise<string> {
  const request = toBuildCommandRequest(opts, version);
  const command = toDockerBuildCommand(request);
  printCommand(command);
  await promptConfirmOrExit("Do you want to build the Docker image?");
  await executeCommand(command);
  console.log(`\n✅ Successfully built Docker image: ${request.imageTag}`);
  return request.imageTag;
}

function toBuildCommandRequest(
  opts: Options,
  version: string,
): BuildCommandRequest {
  const buildContext = opts.context;
  const imageTag = `${opts.repo}:${version}`;
  console.log(`📁 Using build context: ${buildContext}`);
  console.log(`🏗️  Building: ${imageTag}`);
  return {buildContext, imageTag, version, dockerArgs: opts.dockerArgs};
}

function toDockerBuildCommand({
  imageTag,
  buildContext,
  version,
  dockerArgs,
}: BuildCommandRequest): string {
  const baseArgs = [
    "docker build",
    `-t ${imageTag}`,
    `--label version=${version}`,
    `--label built-at=${new Date().toISOString()}`,
  ];
  // Add custom docker arguments if provided
  if (dockerArgs && dockerArgs.length > 0) {
    baseArgs.push(...dockerArgs);
  }
  // Add build context last
  baseArgs.push(buildContext);
  return baseArgs.join(" ");
}
