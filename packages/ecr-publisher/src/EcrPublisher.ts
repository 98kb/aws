import type {ECRClient} from "@aws-sdk/client-ecr";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import type {PublishResult} from "./PublishResult";
import type {PublisherSettings} from "./PublisherSettings";
import {BaseEcrPublisher} from "./BaseEcrPublisher";

export class EcrPublisher extends BaseEcrPublisher {
  constructor(ecr: ECRClient, settings?: PublisherSettings) {
    super(settings);
    this.context.ecr = ecr;
  }

  async publish(options: PublishEcrOptions): Promise<PublishResult> {
    return super.publish({...options, public: false});
  }
}
