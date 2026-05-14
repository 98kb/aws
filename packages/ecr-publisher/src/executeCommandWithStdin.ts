import spawn from "cross-spawn";
import {handleDockerError} from "./handleDockerError";

export async function executeCommandWithStdin(
  cmd: string,
  args: string[],
  stdinInput: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stdio: ["pipe", "inherit", "inherit"] = [
      "pipe",
      "inherit",
      "inherit",
    ];
    const dockerProcess = spawn(cmd, args, {stdio});

    dockerProcess.stdin!.write(stdinInput);
    dockerProcess.stdin!.end();

    dockerProcess.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Docker build failed with exit code ${code}`));
      }
    });

    dockerProcess.on("error", error => {
      handleDockerError(error);
    });
  });
}
