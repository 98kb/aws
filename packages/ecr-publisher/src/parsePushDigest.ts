const DIGEST_PATTERN = /digest: (sha256:[0-9a-f]{64})/g;

/** Returns the last `digest: sha256:<64 hex>` in `docker push` output. */
export function parsePushDigest(stdout: string): string | undefined {
  return [...stdout.matchAll(DIGEST_PATTERN)].at(-1)?.[1];
}
