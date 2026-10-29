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
import {confirmStep} from "./confirmStep";
import {parsePushDigest} from "./parsePushDigest";
import {DigestNotFoundError} from "./DigestNotFoundError";
import chalk from "chalk";
import type {Context} from "./Context";
import type {ResolvedPublisherSettings} from "./normalizePublisherSettings";

/**
 * Logs in, tags, and pushes the image, returning the pushed tag and the digest
 * from this run's `docker push` output.
 */
export async function uploadImageToECR(
  context: Context,
  localImageTag: string,
): Promise<{imageTag: string; digest: string}> {
  const ecrImageTag = context.options.public
    ? await loginAndTagPublic(context, localImageTag)
    : await loginAndTagPrivate(context, localImageTag);
  const digest = await pushImageToECR(context, ecrImageTag);
  console.log(
    chalk.hex("#00FF00")(
      `\n🎉 Successfully uploaded image to ECR: ${ecrImageTag}`,
    ),
  );
  return {imageTag: ecrImageTag, digest};
}

async function loginAndTagPublic(
  {ecrPublic, options, newVersion, settings}: Context,
  localImageTag: string,
): Promise<string> {
  const {token} = await getPublicECRAuth(ecrPublic!);
  await dockerLogin(settings, token, "public.ecr.aws");
  const alias = options.alias ?? (await getPublicRegistryAlias(ecrPublic!));
  const ecrImageTag = `public.ecr.aws/${alias}/${options.repo}:${newVersion}`;
  await tagImage(settings, localImageTag, ecrImageTag);
  return ecrImageTag;
}

async function loginAndTagPrivate(
  {ecr, options, newVersion, settings}: Context,
  localImageTag: string,
): Promise<string> {
  const {token, registryUrl} = await getECRAuth(ecr!);
  await dockerLogin(settings, token, registryUrl);
  const ecrImageTag = `${registryUrl}/${options.repo}:${newVersion}`;
  await tagImage(settings, localImageTag, ecrImageTag);
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

async function dockerLogin(
  {runner, interactive}: ResolvedPublisherSettings,
  token: string,
  registryUrl: string,
): Promise<void> {
  console.log("\n🔑 Logging into Docker with ECR credentials...");
  const [, password] = token.split(":");
  await runner({
    command: "docker",
    args: ["login", "--username", "AWS", "--password-stdin", registryUrl],
    input: password,
    interactive,
  });
}

async function tagImage(
  {runner, interactive}: ResolvedPublisherSettings,
  localImageTag: string,
  ecrImageTag: string,
): Promise<void> {
  console.log(`🏷️  Tagging image for ECR: ${localImageTag} -> ${ecrImageTag}`);
  printCommand(`docker tag ${localImageTag} ${ecrImageTag}`);
  await runner({
    command: "docker",
    args: ["tag", localImageTag, ecrImageTag],
    interactive,
  });
}

async function pushImageToECR(
  context: Context,
  ecrImageTag: string,
): Promise<string> {
  console.log(`📤 Pushing image to ECR: ${ecrImageTag}`);
  printCommand(`docker push ${ecrImageTag}`);
  await confirmStep(
    context,
    "push",
    "Do you want to push the Docker image to ECR?",
  );
  return runPushForDigest(context.settings, ecrImageTag);
}

async function runPushForDigest(
  {runner, interactive}: ResolvedPublisherSettings,
  ecrImageTag: string,
): Promise<string> {
  const {stdout} = await runner({
    command: "docker",
    args: ["push", ecrImageTag],
    interactive,
    captureStdout: true,
  });
  const digest = parsePushDigest(stdout);
  if (!digest) throw new DigestNotFoundError(ecrImageTag);
  return digest;
}
