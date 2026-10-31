import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { LanguageCodes } from "@gc/model";
import commonZhCN from "./locales/zh-CN/common.json";
import appZhCN from "./locales/zh-CN/app.json";
import commonEn from "./locales/en/common.json";
import appEn from "./locales/en/app.json";

i18n.use(initReactI18next).init({
  // the translations
  // (tip move them in a JSON file and import them,
  // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
  resources: {
    [LanguageCodes["en"]]: {
      common: commonEn,
      app: appEn,
    },
    [LanguageCodes["zh-CN"]]: {
      common: commonZhCN,
      app: appZhCN,
    },
  },
  lng: navigator.language, // if you're using a language detector, do not define the lng option
  fallbackLng: LanguageCodes["en"],

  interpolation: {
    escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
  },
});

export const i18nNext = i18n;
