import { Maybe } from "@gc/utils";
import { apiFileRequest } from "../api/apiFileRequest.ts";

export const checkExistsFile = async (
  fileUuid: string,
  _type: string,
  _folder: string,
): Promise<{
  exists: boolean;
  url?: Maybe<string>;
}> => {
  return await apiFileRequest({
    fileUuid: fileUuid,
    preview: true,
  });
};
