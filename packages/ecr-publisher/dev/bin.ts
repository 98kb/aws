import {ECRClient} from "@aws-sdk/client-ecr";
import {run} from "../src/run";

const ecr = new ECRClient({region: "us-east-1"});

// Example showing how to use docker arguments including dockerfile path
run(ecr, {
  dryRun: true,
  repo: "my-repo",
  bump: "patch",
  context: ".", // Custom build context
  dockerArgs: [
    "-f",
    "Dockerfile",
    "-p",
    "3000:3000",
    "--build-arg",
    "NODE_ENV=production",
  ], // Custom docker arguments including dockerfile path
});
