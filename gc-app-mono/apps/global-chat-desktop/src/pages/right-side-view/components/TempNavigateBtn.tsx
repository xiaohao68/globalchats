import { Button } from "@gc/ui/components/button.tsx";
import { ERouterPath } from "@gc/model";

import { FC } from "react";
import { useNavigate } from "react-router";

export const TempNavigateBtn: FC = () => {
  const navigate = useNavigate();
  return (
    <div>
      <Button
        onClick={() => {
          navigate(ERouterPath.translate);
        }}
      >
        翻译配置
      </Button>
      <Button
        onClick={() => {
          navigate(ERouterPath.proxy);
        }}
      >
        代理配置
      </Button>
      <Button
        onClick={() => {
          // navigate(ERouterPath.crmInfo);
        }}
      >
        客户关系
      </Button>
      <Button
        onClick={() => {
          navigate(ERouterPath.fansStatistics);
        }}
      >
        粉丝统计
      </Button>
    </div>
  );
};
