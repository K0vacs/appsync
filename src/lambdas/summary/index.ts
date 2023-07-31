import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Event } from "./types";

// Get ENV Variables
const { ENVIRONMENT, REGION } = process.env;

// Create S3 client
const s3Client = new S3Client({
  ...(ENVIRONMENT === "local" && {
    endpoint: "http://localstack:4566",
    credentials: {
      accessKeyId: "MYLOCALACCESSKEYID",
      secretAccessKey: "MYSECRETACCESSKEY",
    },
  }),
  region: REGION ?? "eu-west-2",
  forcePathStyle: true,
});

const sqsClient = new SQSClient({
  ...(ENVIRONMENT === "local" && {
    endpoint: "http://localstack:4566",
    credentials: {
      accessKeyId: "MYLOCALACCESSKEYID",
      secretAccessKey: "MYSECRETACCESSKEY",
    },
  }),
  region: REGION ?? "eu-west-2",
});

export const handler = async (event: Event): Promise<void> => {
  try {
    const { customerId, conversationId } = event.arguments.input;
    const transcript = await getTranscript(customerId, conversationId);

    // Get summary
    await getSummary(transcript);
  } catch (error: any) {
    console.error(error);
  }

  return;
};

const getTranscript = async (customerId: string, conversationId: string) => {
  try {
    // Get object
    const getObject = new GetObjectCommand({
      Bucket: `${ENVIRONMENT}-bucket-name`,
      Key: `${customerId}/${conversationId}/transcript.json`,
    });
    const { Body }: any = await s3Client.send(getObject); // TODO: Type body

    // Return json string
    return JSON.parse(await Body?.transformToString());
  } catch (error) {
    console.error(error);

    throw new Error("Failed to get transcript");
  }
};

const getSummary = async (transcript: any) => {
  // TODO: Type transcript
  const transcriptJSON = mapTranscriptToJSON(transcript);

  const meta = {
    conversationId: transcript[0].meta.conversationid,
    customerId: transcript[0].meta.customerid,
  };

  const sendToQueue = await summarizeTranscript(meta, transcriptJSON.join(" "));

  return sendToQueue;
};

const mapTranscriptToJSON = (transcript: any) => {
  // TODO: Type transcript
  return transcript.map((item: any) => {
    // TODO: Type item
    const speaker = item.meta.displayname;
    const text = item.text.trim();

    const jsonOutput = `${speaker}: ${text}`;
    return jsonOutput;
  });
};

const summarizeTranscript = async (
  meta: any,
  transcript: any
): Promise<any> => {
  // TODO: Type meta and transcript
  const url = "https://example.com";

  try {
    const response = await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: url,
        MessageBody: JSON.stringify({
          promptId: "promptId",
          data: transcript,
          meta: {
            conversationId: meta.conversationId,
            customerId: meta.customerId,
          },
          webhook: {
            url: "webhook url",
            messageGroupId: Date.now().toString(),
            messageDeduplicationId: Date.now().toString(),
          },
        }),
        MessageGroupId: Date.now().toString(),
        MessageDeduplicationId: Date.now().toString(),
      })
    );

    return response;
  } catch (error) {
    console.log(error);

    throw error;
  }
};
