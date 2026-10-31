export interface ITranslateOptions {
  enable: boolean;
  from: string;
  to: string;
}

export const makeEmptyTranslateOptions = (): ITranslateOptions => {
  return {
    enable: false,
    from: "",
    to: "",
  };
};

export interface ITranslateConfig {
  isIndependent: boolean;
  modelId: string;
  receiveMessage: ITranslateOptions;
  sendMessage: ITranslateOptions;
}

export const makeEmptyTranslateConfig = (): ITranslateConfig => {
  return {
    isIndependent: false,
    modelId: "",
    receiveMessage: makeEmptyTranslateOptions(),
    sendMessage: makeEmptyTranslateOptions(),
  };
};
