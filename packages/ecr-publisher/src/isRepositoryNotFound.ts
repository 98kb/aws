/**
 * Matches on the error name instead of `instanceof`: the ECR clients come from
 * the caller, so the SDK error classes may be duplicate copies.
 */
export function isRepositoryNotFound(error: unknown): boolean {
  return error instanceof Error && error.name === "RepositoryNotFoundException";
}
