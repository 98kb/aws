import ora from "ora";
import {type ECRClient} from "@aws-sdk/client-ecr";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import {checkEcrRepoExists} from "./checkEcrRepoExists";
import {createEcrRepo} from "./createEcrRepo";

export async function ensureECRRepo(ecr: ECRClient, opts: PublishEcrOptions) {
  const spinner = ora("Checking ECR repo...").start();
  const repoExists = await checkEcrRepoExists(ecr, opts.repo);
  spinner.stop();
  if (!repoExists) {
    await createEcrRepo(ecr, opts.repo);
  }
}
