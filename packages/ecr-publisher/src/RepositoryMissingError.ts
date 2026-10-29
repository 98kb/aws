import {EcrPublisherError} from "./EcrPublisherError";

export class RepositoryMissingError extends EcrPublisherError {
  override name = "RepositoryMissingError";

  constructor(readonly repo: string) {
    super("REPO_MISSING", `ECR repository "${repo}" does not exist.`);
  }
}
