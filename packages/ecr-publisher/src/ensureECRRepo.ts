import ora from "ora";
import {checkEcrRepoExists} from "./checkEcrRepoExists";
import {createEcrRepo} from "./createEcrRepo";
import type {Context} from "./Context";

export async function ensureECRRepo({ecr, options}: Context) {
  const spinner = ora("Checking ECR repo...").start();
  const repoExists = await checkEcrRepoExists(ecr, options.repo);
  spinner.stop();
  if (!repoExists) {
    await createEcrRepo(ecr, options.repo);
  }
}
