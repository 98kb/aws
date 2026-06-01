/* eslint-disable no-console */
import {
  type ECRClient,
  GetAuthorizationTokenCommand,
} from "@aws-sdk/client-ecr";
import {
  type ECRPUBLICClient,
  GetAuthorizationTokenCommand as GetPublicAuthorizationTokenCommand,
  DescribeRegistriesCommand,
} from "@aws-sdk/client-ecr-public";
import {printCommand} from "./printCommand";
import {promptConfirmOrExit} from "./promptConfirmOrExit";
import {executeCommand} from "./executeCommand";
import {executeCommandWithStdin} from "./executeCommandWithStdin";
import chalk from "chalk";
import type {Context} from "./Context";

export async function uploadImageToECR(
  {ecr, ecrPublic, options, newVersion}: Context,
  localImageTag: string,
): Promise<string> {
  if (options.public) {
    return uploadImageToPublicECR(
      ecrPublic!,
      options,
      newVersion,
      localImageTag,
    );
  }
  return uploadImageToPrivateECR(ecr!, options, newVersion, localImageTag);
}

async function uploadImageToPublicECR(
  ecrPublic: ECRPUBLICClient,
  options: Context["options"],
  newVersion: string,
  localImageTag: string,
): Promise<string> {
  const {token} = await getPublicECRAuth(ecrPublic);
  await dockerLogin(token, "public.ecr.aws");
  const alias = options.alias ?? (await getPublicRegistryAlias(ecrPublic));
  const ecrImageTag = await tagImageForPublicECR(
    localImageTag,
    alias,
    options.repo,
    newVersion,
  );
  await pushImageToECR(ecrImageTag);
  console.log(
    chalk.hex("#00FF00")(
      `\n🎉 Successfully uploaded image to ECR: ${ecrImageTag}`,
    ),
  );
  return ecrImageTag;
}

async function uploadImageToPrivateECR(
  ecr: ECRClient,
  options: Context["options"],
  newVersion: string,
  localImageTag: string,
): Promise<string> {
  const {token, registryUrl} = await getECRAuth(ecr);
  await dockerLogin(token, registryUrl);
  const ecrImageTag = await tagImageForECR(
    localImageTag,
    registryUrl,
    options.repo,
    newVersion,
  );
  await pushImageToECR(ecrImageTag);
  console.log(
    chalk.hex("#00FF00")(
      `\n🎉 Successfully uploaded image to ECR: ${ecrImageTag}`,
    ),
  );
  return ecrImageTag;
}

async function getECRAuth(ecr: ECRClient) {
  const response = await ecr.send(new GetAuthorizationTokenCommand({}));
  const authData = response.authorizationData?.[0];
  if (!authData) throw new Error("No auth data");
  const token = Buffer.from(authData.authorizationToken!, "base64").toString(
    "utf-8",
  );
  const registryUrl = authData.proxyEndpoint!.replace(/^https?:\/\//, "");
  return {token, registryUrl};
}

async function getPublicECRAuth(ecrPublic: ECRPUBLICClient) {
  const response = await ecrPublic.send(
    new GetPublicAuthorizationTokenCommand({}),
  );
  const rawToken = response.authorizationData?.authorizationToken;
  if (!rawToken) throw new Error("No public ECR auth data");
  const token = Buffer.from(rawToken, "base64").toString("utf-8");
  return {token};
}

// eslint-disable-next-line complexity
async function getPublicRegistryAlias(
  ecrPublic: ECRPUBLICClient,
): Promise<string> {
  const response = await ecrPublic.send(new DescribeRegistriesCommand({}));
  const alias = response.registries?.[0]?.aliases?.[0]?.name;
  if (!alias) throw new Error("Could not determine public ECR registry alias");
  return alias;
}

async function dockerLogin(token: string, registryUrl: string): Promise<void> {
  console.log("\n🔑 Logging into Docker with ECR credentials...");
  const [, password] = token.split(":");
  await executeCommandWithStdin(
    "docker",
    ["login", "--username", "AWS", "--password-stdin", registryUrl],
    password,
  );
}

async function tagImageForECR(
  localImageTag: string,
  registryUrl: string,
  repoName: string,
  version: string,
): Promise<string> {
  // Remove the protocol from the registry URL for Docker commands
  const registryHost = registryUrl.replace(/^https?:\/\//, "");
  const ecrImageTag = `${registryHost}/${repoName}:${version}`;
  console.log(`🏷️  Tagging image for ECR: ${localImageTag} -> ${ecrImageTag}`);
  printCommand(`docker tag ${localImageTag} ${ecrImageTag}`);
  await executeCommand("docker", ["tag", localImageTag, ecrImageTag]);
  return ecrImageTag;
}

async function tagImageForPublicECR(
  localImageTag: string,
  alias: string,
  repoName: string,
  version: string,
): Promise<string> {
  const ecrImageTag = `public.ecr.aws/${alias}/${repoName}:${version}`;
  console.log(`🏷️  Tagging image for ECR: ${localImageTag} -> ${ecrImageTag}`);
  printCommand(`docker tag ${localImageTag} ${ecrImageTag}`);
  await executeCommand("docker", ["tag", localImageTag, ecrImageTag]);
  return ecrImageTag;
}

async function pushImageToECR(ecrImageTag: string): Promise<void> {
  console.log(`📤 Pushing image to ECR: ${ecrImageTag}`);
  printCommand(`docker push ${ecrImageTag}`);
  await promptConfirmOrExit("Do you want to push the Docker image to ECR?");
  await executeCommand("docker", ["push", ecrImageTag]);
}
