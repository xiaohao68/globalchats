import { gqlClient } from "../apiClient.ts";
import { ModelsByScene } from "../gql/index.ts";

interface Model {
  id: string;
  displayName: string;
  name: string;
  region: string;
  provider: string;
  isActive: boolean;
}

interface ResponseData {
  modelsByScene: Model[];
}

export const apiTranslateModelList = async () => {
  const res = await gqlClient<ResponseData>(
    {
      query: ModelsByScene,
      variables: { scene: "TRANSLATE" },
    },
    {},
    { authMode: "require" },
  );
  const modelList = res.data.data.modelsByScene.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    region: model.region,
  }));

  const defaultModel = modelList[0];

  return {
    defaultModel,
    modelList,
  };
};
