import {existsSync} from "node:fs";
import {resolve, dirname} from "node:path";

/**
 * Finds the monorepo root by searching upward for workspace indicators
 * @returns The absolute path to the monorepo root, or current working directory if not found
 */
export function findMonorepoRoot(): string {
  let currentPath = resolve(process.cwd());

  while (currentPath !== dirname(currentPath)) {
    if (isWorkspaceRoot(currentPath)) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }

  return process.cwd();
}

function isWorkspaceRoot(path: string): boolean {
  return existsSync(resolve(path, "pnpm-workspace.yaml"));
}
