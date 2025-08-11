/* eslint-disable no-console */
import {ECRClient} from "@aws-sdk/client-ecr";
import {program} from "./program";
import type {Options} from "./Options";
import {run} from "./run";

const parsed = program.parse(process.argv);
const opts = parsed.opts<Omit<Options, "context">>();
const context = parsed.args[0]; // Get the context argument

const fullOpts: Options = {
  ...opts,
  context,
};

const ecr = new ECRClient({region: opts.region});

run(ecr, fullOpts).catch(error => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
