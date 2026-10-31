# gc-console 开发规范

## 概述

`gc-console` 是 GC 项目中的 Console 前端应用，技术栈为 Next.js。本文档用于约束该包在开发过程中的基础规范，重点覆盖开发命令、组件拆分要求、目录组织方式与架构设计决策。

## UI 组件参考

- 强制要求，编写 UI 时，必须从 `../../../shadcn-ui-kit-dashboard` 中拷贝源码，使用其 tsx 和 css 等
- 目录结构和文件内容（是否拆分）按照现有项目规范作出调整

## 开发

### 启动开发服务器

```bash
pnpm --filter gc-console dev
```

运行端口: `3303`

## 代码规范

### 组件规则

- **必须**：单个 `.tsx` 文件只允许定义一个组件，避免在同一文件中混放多个组件实现。
- **必须**：尽可能拆分 component，优先按职责边界拆分，保持组件粒度清晰、便于复用与维护。
- **必须**：`src/app/` 目录下尽量不要放组件文件，组件放到 `src/modules/` 里面（按功能分类）。

### 目录结构

项目源码目录结构如下：

```
src/
  app/                      # Next.js 路由
  modules/                  # 模块组件
    {功能模块名}/
      constants/
      components/
      hooks/
      types/
      utils/
      graphql/
      states/
      selectors/
  shadcn-ui-kit/            # 组件库
```

- `src/` 下只允许 `app/`/`modules/`/`shadcn-ui-kit` 这 3 个目录；如需创建目录按实际功能拆分到上述对应的 3 个目录中。
- `modules/{功能模块名}/` 只能有一级目录；该目录名用于功能归类，不应出现额外的多层功能分组。
