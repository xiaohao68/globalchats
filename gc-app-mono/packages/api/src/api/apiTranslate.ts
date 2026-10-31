import { gqlClient } from "../apiClient.ts";
import { Nullable } from "@gc/utils";
import { EApiCode } from "@gc/model";
import { TransOutput } from "../gen/graphql.ts";
import { Translate } from "../gql/index.ts";

interface RequestData {
  // lineId
  id: string;
  // 源语种
  srcLang: string;
  // 目标语种
  dstLang: string;
  // 翻译内容
  texts: string[];
  forceUpdateCache?: boolean;
}

interface ResponseData {
  translate: TransOutput[];
}

const serialize = (data: Nullable<ResponseData>): (string | Error)[] => {
  if (!data) {
    return [];
  }
  return data.translate
    .sort((a, b) => a.index - b.index)
    .map((it) => {
      if (it.code === EApiCode.success) {
        return it.text;
      }
      return new Error(it.code);
    });
};

export const apiTranslate = async (
  data: RequestData,
  signal?: AbortController["signal"],
) => {
  // console.log("api data api res");
  // console.log(data);
  const res = await gqlClient<ResponseData>(
    {
      query: Translate,
      variables: {
        translateId: data.id,
        sourceLang: data.srcLang,
        destinationLang: data.dstLang,
        texts: data.texts,
        forceUpdateCache: data.forceUpdateCache,
      },
    },
    {
      signal: signal,
      timeout: 30_000,
    },
    { authMode: "require" },
  );

  // console.log("res");
  // console.log(res);
  return serialize(res.data.data);
};
