import { ApiBaseResponse, apiClient } from "../apiClient";
import {
  computesSHA256ByFile,
  makeMultipartFormData,
  makeUUIDByHash,
} from "@gc/utils";
import { checkExistsFile } from "../utils";

export enum AttachmentType {
  Image = "IMAGE",
  Video = "VIDEO",
  Audio = "AUDIO",
  File = "FILE",
}

export enum AttachmentFolder {
  Attachment = "ATTACHMENT",
  Avatar = "AVATAR",
}

interface RequestData {
  file: ArrayBuffer;
  fileName: string;
  type?: AttachmentType;
  folder?: AttachmentFolder;
}

export const apiFileUpload = async (
  data: RequestData,
  // signal?: AbortController["signal"],
): Promise<string> => {
  const sha265 = computesSHA256ByFile(data.file);
  const fileUuid = makeUUIDByHash(sha265);
  const fileType = data.type || AttachmentType.Image;
  const folder = data.folder || AttachmentFolder.Attachment;
  const { exists, url } = await checkExistsFile(fileUuid, fileType, folder);

  if (exists) {
    return url!;
  }

  const { body, boundary } = makeMultipartFormData(data.file, data.fileName);

  const res = await apiClient.post<
    ApiBaseResponse<{
      id: string;
      fullPath: string;
    }>
  >("/api/files/upload", body, {
    params: {
      id: fileUuid,
      folder: folder,
      type: fileType,
    },
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
  });
  return res.data.data.fullPath;
};
