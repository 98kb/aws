export type PublishResult = {
  /** Absent when `overrideVersion` was used. */
  previousVersion?: string;
  newVersion: string;
  /** Digest of the pushed image, from this run's `docker push` output. */
  digest: string;
};
