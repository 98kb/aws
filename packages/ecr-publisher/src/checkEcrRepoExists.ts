import {type ECRClient, DescribeRepositoriesCommand} from "@aws-sdk/client-ecr";
import {isRepositoryNotFound} from "./isRepositoryNotFound";

export async function checkEcrRepoExists(
  ecr: ECRClient,
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
