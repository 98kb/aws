import {
  type ECRPUBLICClient,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr-public";
import {isRepositoryNotFound} from "./isRepositoryNotFound";

export async function checkEcrPublicRepoExists(
  ecr: ECRPUBLICClient,
  repo: string,
): Promise<boolean> {
  try {
    await ecr.send(new DescribeRepositoriesCommand({repositoryNames: [repo]}));
    return true;
  } catch (error) {
    if (isRepositoryNotFound(error)) return false;
    throw error;
  }
}
