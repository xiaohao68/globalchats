import { appStore } from "@gc/store";
import { getCurrentWebviewId } from "@gc/utils";
import { isEmpty } from "lodash-es";
import type { EPlatform, IThirdAppUserInfo } from "@gc/model";
import { GCEngineMiddleware } from "./GCEngineMiddleware.ts";
import { ImtpBackend } from "./backend/imtpBackend.ts";
import type { BackendApi } from "./backend/backendApi.ts";
import type { SourceScope } from "./types.ts";

const middlewareCache = new Map<string, GCEngineMiddleware>();

function getBackendForPlatform(_platform: EPlatform): BackendApi {
  // TODO: 目前所有平台暂时使用 IMTP Backend，后续按需扩展
  return new ImtpBackend();
}

function scopeKey(scope: SourceScope): string {
  return `${scope.platform}:${scope.appId}:${scope.webviewId}`;
}

export function getDefaultMiddlewareForCurrentWebview(): GCEngineMiddleware | null {
  const webviewId = getCurrentWebviewId();
  const app = appStore.getAppById(webviewId);
  if (isEmpty(app) || !app.id) {
    return null;
  }

  const scope: SourceScope = {
    appId: app.id,
    platform: app.platform as EPlatform,
    webviewId,
  };

  const key = scopeKey(scope);
  const cached = middlewareCache.get(key);
  if (cached) return cached;

  const middleware = new GCEngineMiddleware(scope, {
    backend: getBackendForPlatform(scope.platform),
    getCurrentUser: (): IThirdAppUserInfo | null => {
      const latestApp = appStore.getAppById(webviewId);
      const user = latestApp.userInfo;
      if (!user || !user.id) return null;
      return user;
    },
  });
  middlewareCache.set(key, middleware);
  return middleware;
}
