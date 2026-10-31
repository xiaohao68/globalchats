import { gqlClient } from "../apiClient";
import { GetAttachment } from "../gql";
import type { WsAttachment } from "../gen/graphql.ts";

interface RequestData {
  fileUuid: string;
  preview: boolean;
}

interface FileDownloadResponse {
  exists: boolean;
  url?: string;
}

export const apiFileRequest = async (
  data: RequestData,
): Promise<FileDownloadResponse> => {
  try {
    const response = await gqlClient<{ attachments: WsAttachment[] }>(
      {
        query: GetAttachment,
        variables: { id: data.fileUuid },
      },
      {},
      { authMode: "require" },
    );

    const attachment = response.data?.data?.attachments?.[0];
    if (attachment?.url) {
      return { exists: true, url: attachment.url };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
};
