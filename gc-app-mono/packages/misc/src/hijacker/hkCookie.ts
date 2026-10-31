import { isEmpty } from "lodash-es";
import { Nullable } from "@gc/utils";

class HkCookie {
  getCookie(name: string): Nullable<string> {
    const cookieArr = document.cookie.split(";");
    if (isEmpty(cookieArr)) {
      return;
    }

    for (let i = 0; i < cookieArr.length; i++) {
      const cookiePair = cookieArr[i]!.trim().split("=");

      if (cookiePair[0] === name) {
        return decodeURIComponent(cookiePair[1]!);
      }
    }

    return;
  }
}

export const hkCookie = new HkCookie();
