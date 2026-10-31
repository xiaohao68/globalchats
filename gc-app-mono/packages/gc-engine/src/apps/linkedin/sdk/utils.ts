import { isEmpty } from "lodash-es";
import { IThirdAppUserInfo } from "@gc/model";

interface TagCodeData {
  data: {
    plainId: number;
  };
  included?: {
    customPronoun: null;
    memorialized: false;
    lastName: string;
    firstName: string;
    // dashEntityUrn: "urn:li:fsd_profile:ACoAAByPrfIBPWVBOw4Jh0_qqkjsVPEiX-j9up0";
    // objectUrn: "urn:li:member:479178226";
    backgroundImage: null;
    picture: {
      artifacts: {
        width: 800;
        fileIdentifyingUrlPathSegment: "crop_800_800/B56ZffKyvlGQAM-/0/1751795839102?e=1757548800&amp;v=beta&amp;t=N1KI1up2JXLymo3xB_cpxqZnHbMLL0YT_ApMqjBP0qs";
        expiresAt: 1757548800000;
        height: 800;
        $type: "com.linkedin.common.VectorArtifact";
      }[];

      rootUrl: string;
    };
    entityUrn: string;
    publicIdentifier: "沅岐-蒋-26a586114";
  }[];
}

export const findUserInfoFromCodeTag = (): Maybe<IThirdAppUserInfo> => {
  // 查找所有 ID 以指定前缀开头的 code 标签
  const codeTags = document.querySelectorAll(`code[id]`);

  for (const codeTag of codeTags) {
    try {
      if (!codeTag.textContent) {
        continue;
      }
      const jsonContent = JSON.parse(
        codeTag.textContent?.trim(),
      ) as Partial<TagCodeData>;

      console.log("jsonContent");
      console.log(jsonContent?.data?.plainId);
      console.log(isEmpty(jsonContent?.data?.plainId));
      if (!jsonContent?.data?.plainId) {
        continue;
      }
      console.log(jsonContent);
      const tempInfo = jsonContent.included?.[0];
      console.log("tempInfo");
      console.log(tempInfo);
      const avatar = tempInfo?.picture
        ? tempInfo?.picture.rootUrl +
          tempInfo?.picture?.artifacts?.[0]?.fileIdentifyingUrlPathSegment
        : "";
      const nickname = (tempInfo?.firstName || "") + (tempInfo?.lastName || "");
      const userId = tempInfo?.publicIdentifier || tempInfo?.entityUrn!;
      return {
        id: userId,
        nickname: nickname,
        avatar: avatar,
        isGroup: false,
      };
    } catch (error) {
      console.error(error);
    }
  }

  return null;
};
