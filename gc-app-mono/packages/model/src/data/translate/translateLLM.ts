export interface ITranslateLLM {
  id: string;
  name: string;

  srcLangList: ILangList[];
  dstLangList: ILangList[];
}

export interface ILangList {
  // 通道支持语言
  id: string; // zh_cn
  name: string; // 简体中文
}
