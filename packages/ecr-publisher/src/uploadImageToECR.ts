/* eslint-disable no-console */
import {
  type ECRClient,
  GetAuthorizationTokenCommand,
} from "@aws-sdk/client-ecr";
import {printCommand} from "./printCommand";
import {promptConfirmOrExit} from "./promptConfirmOrExit";
import {executeCommand} from "./executeCommand";
import chalk from "chalk";

export async function uploadImageToECR(
  ecr: ECRClient,
  localImageTag: string,
  repoName: string,
  version: string,
): Promise<string> {
  const {token, registryUrl} = await getECRAuth(ecr);
  await dockerLogin(token, registryUrl);
  const ecrImageTag = await tagImageForECR(
    localImageTag,
    registryUrl,
    repoName,
    version,
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
  return {token, registryUrl: authData.proxyEndpoint!};
}

async function dockerLogin(token: string, registryUrl: string): Promise<void> {
  console.log("\n🔑 Logging into Docker with ECR credentials...");
  const [, password] = token.split(":");
  const loginCommand = `echo "${password}" | docker login --username AWS --password-stdin ${registryUrl}`;
  await executeCommand(loginCommand);
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
  const tagCommand = `docker tag ${localImageTag} ${ecrImageTag}`;
  printCommand(tagCommand);
  await executeCommand(tagCommand);
  return ecrImageTag;
}

async function pushImageToECR(ecrImageTag: string): Promise<void> {
  console.log(`📤 Pushing image to ECR: ${ecrImageTag}`);
  const pushCommand = `docker push ${ecrImageTag}`;
  printCommand(pushCommand);
  await promptConfirmOrExit("Do you want to push the Docker image to ECR?");
  await executeCommand(pushCommand);
}
