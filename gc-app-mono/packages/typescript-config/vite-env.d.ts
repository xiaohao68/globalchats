interface ImportMetaEnv {
  readonly MODE: string;
  readonly VITE_API_URL: string;
  readonly VITE_CMS_URL: string;
  readonly VITE_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
