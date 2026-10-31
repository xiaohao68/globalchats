import { IThirdAppUserInfo } from "@gc/model";

export const findUserInfoFromDom = (): Maybe<IThirdAppUserInfo> => {
  const userInfoDom = document.querySelector("#idna-me-control-avatar-trigger");

  const userImg: Maybe<HTMLImageElement> = userInfoDom?.querySelector(
    ".fui-Avatar__initials img",
  );
  const imgSrc = userImg?.src;

  if (!imgSrc) {
    return;
  }
  const urlObj = new URL(imgSrc);

  const nickname = urlObj.searchParams.get("displayname");
  const pathSegments = urlObj.pathname.split("/");
  let userId: Maybe<string>;
  // 查找包含".cid."的路径段
  for (const segment of pathSegments) {
    if (segment.includes(".cid.")) {
      // 提取.cid.后面的部分
      userId = segment.split(".cid.")[1];
      break;
    }
  }
  if (!userId) {
    return;
  }

  return {
    id: userId,
    nickname: nickname || "",
    avatar: imgSrc,
    isGroup: false,
  };
};
