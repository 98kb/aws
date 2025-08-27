import {type ECRClient, DescribeRepositoriesCommand} from "@aws-sdk/client-ecr";

export async function checkEcrRepoExists(
  ecr: ECRClient,
  repo: string,
): Promise<boolean> {
  try {
    await ecr.send(new DescribeRepositoriesCommand({repositoryNames: [repo]}));
    return true;
  } catch {
    return false;
  }
}
