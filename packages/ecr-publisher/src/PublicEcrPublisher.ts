import type {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import type {PublishResult} from "./PublishResult";
import type {PublisherSettings} from "./PublisherSettings";
import {BaseEcrPublisher} from "./BaseEcrPublisher";

export class PublicEcrPublisher extends BaseEcrPublisher {
  constructor(ecrPublic: ECRPUBLICClient, settings?: PublisherSettings) {
    super(settings);
    this.context.ecrPublic = ecrPublic;
  }

  async publish(options: PublishEcrOptions): Promise<PublishResult> {
    return super.publish({...options, public: true});
  }
}
