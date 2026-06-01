import type {ECRClient} from "@aws-sdk/client-ecr";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import type {PublishResult} from "./PublishResult";
import {BaseEcrPublisher} from "./BaseEcrPublisher";

export class EcrPublisher extends BaseEcrPublisher {
  constructor(ecr: ECRClient) {
    super();
    this.context.ecr = ecr;
  }

  async publish(options: PublishEcrOptions): Promise<PublishResult> {
    return super.publish({...options, public: false});
  }
}
