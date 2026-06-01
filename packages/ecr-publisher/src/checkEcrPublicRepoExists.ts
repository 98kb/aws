import {
  type ECRPUBLICClient,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr-public";

export async function checkEcrPublicRepoExists(
  ecr: ECRPUBLICClient,
  repo: string,
): Promise<boolean> {
  try {
    await ecr.send(new DescribeRepositoriesCommand({repositoryNames: [repo]}));
    return true;
  } catch {
    return false;
  }
}
