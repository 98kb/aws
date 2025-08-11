import type {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from "aws-lambda";
import type {Logger} from "./Logger";

export async function notifyCloudFormation(
  event: CloudFormationCustomResourceEvent,
  response: CloudFormationCustomResourceResponse,
  logger: Logger,
): Promise<void> {
  try {
    logger.info("Sending response to CloudFormation", {response});
    const responseBody = JSON.stringify(response);
    await sendCfResponse(event.ResponseURL, responseBody, logger);
  } catch (error) {
    logger.error("Failed to send response to CloudFormation", error);
    throw error;
  }
}

async function sendCfResponse(
  url: string,
  responseBody: string,
  logger: Logger,
): Promise<void> {
  const requestOptions = toRequestOptions(url, responseBody);
  const fetchResponse = await fetch(url, requestOptions);
  logger.info("Response sent successfully", {
    status: fetchResponse.status,
    statusText: fetchResponse.statusText,
  });
}

function toRequestOptions(url: string, body: string): RequestInit {
  return {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": body.length.toString(),
    },
    body,
  };
}
