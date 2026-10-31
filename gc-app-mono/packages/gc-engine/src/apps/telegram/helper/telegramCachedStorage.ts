import { AbstractLifeCycle } from "@gc/misc";
import { debounce, isEmpty } from "lodash-es";

class TelegramCachedStorage implements AbstractLifeCycle {
  #avatarsKey = "tt-media-avatars";
  // @ts-ignore
  // #mediaKey = "tt-media";

  // #avatarListCachedStorage!: Cache;
  willRefresh = false;

  async mount() {
    // if (await caches.has(this.#avatarsKey)) {
    //   console.log(await caches.has(this.#avatarsKey))
    //   this.#avatarListCachedStorage = await caches.open(this.#avatarsKey);
    //   const  m = await this.#avatarListCachedStorage.match("/a/avatar7137009864?6109156298261121548");
    //   console.log(m)
    //   console.log("this.#avatarListCachedStorage")
    // }
  }

  destroy() {}

  async hasAvatar() {
    return await caches.has(this.#avatarsKey);
  }

  debounceRefresh = debounce(async () => {
    this.willRefresh = true;
    const hasAvatar = await this.hasAvatar();
    if (hasAvatar) {
      this.debounceRefresh.cancel();
    }
    location.reload();
    this.willRefresh = false;
  }, 1000);

  async getAvatarById(userId: string) {
    if (isEmpty(userId)) {
      return;
    }
    const hasAvatar = await this.hasAvatar();
    // console.log(hasAvatar,this.willRefresh)
    if (!hasAvatar) {
      // this.debounceRefresh();
      return;
    }

    const avatarResponse = await caches.match(`/a/avatar${userId}`, {
      ignoreSearch: true,
    });
    if (!this.validResponse(avatarResponse)) {
      return;
    }
    // return avatarResponse?.clone().blob();
    const buffer = await avatarResponse?.clone().arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return;
    }
    return buffer;
  }

  validResponse(response?: Response) {
    if (!response) {
      return false;
    }
    return response.ok && !response.bodyUsed;
  }
}

export const telegramCachedStorage = new TelegramCachedStorage();
