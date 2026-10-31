import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "https://app.usegc.com/graphql",
  generates: {
    "../../packages/api/src/gen/": {
      preset: "client",
    },
  },
};
export default config;
