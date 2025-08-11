/* eslint-disable no-console */
import {
  type ECRClient,
  GetAuthorizationTokenCommand,
} from "@aws-sdk/client-ecr";
import {spawn} from "node:child_process";

export async function uploadImageToECR(
  ecr: ECRClient,
  localImageTag: string,
  repoName: string,
  version: string,
): Promise<string> {
  console.log(`🚀 Starting ECR upload for ${localImageTag}`);
  const {token, registryUrl} = await getECRAuth(ecr);
  await dockerLogin(token, registryUrl);
  const ecrImageTag = await tagImageForECR(
    localImageTag,
    registryUrl,
    repoName,
    version,
  );
  await pushImageToECR(ecrImageTag);
  console.log(`🎉 Successfully uploaded image to ECR: ${ecrImageTag}`);
  return ecrImageTag;
}

async function getECRAuth(ecr: ECRClient) {
  const command = new GetAuthorizationTokenCommand({});
  const response = await ecr.send(command);
  const authData = response.authorizationData?.[0];
  if (!authData) throw new Error("No auth data");
  const token = Buffer.from(authData.authorizationToken!, "base64").toString(
    "utf-8",
  );
  return {token, registryUrl: authData.proxyEndpoint!};
}

async function dockerLogin(token: string, registryUrl: string): Promise<void> {
  console.log("🔑 Logging into Docker with ECR credentials...");
  const [, password] = token.split(":");
  const loginCommand = `echo "${password}" | docker login --username AWS --password-stdin ${registryUrl}`;
  await executeDockerCommand(loginCommand, "✅ Successfully logged into ECR");
}

async function executeDockerCommand(command: string, successMsg: string) {
  console.log(`🔨 Running: ${command}`);

  return new Promise<void>((resolve, reject) => {
    const dockerProcess = spawn(command, {
      stdio: "inherit", // This will stream output directly to console
      shell: true,
    });

    dockerProcess.on("close", code => {
      if (code === 0) {
        console.log(successMsg);
        resolve();
      } else {
        reject(new Error(`Docker command failed with exit code ${code}`));
      }
    });

    dockerProcess.on("error", error => {
      reject(error);
    });
  });
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
  await executeDockerCommand(
    tagCommand,
    "✅ Successfully tagged image for ECR",
  );
  return ecrImageTag;
}

async function pushImageToECR(ecrImageTag: string): Promise<void> {
  console.log(`📤 Pushing image to ECR: ${ecrImageTag}`);
  const pushCommand = `docker push ${ecrImageTag}`;
  await executeDockerCommand(
    pushCommand,
    "✅ Successfully pushed image to ECR",
  );
}
