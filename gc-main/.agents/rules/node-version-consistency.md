# Node.js 版本一致性

## 核心规则

**本地开发环境、Docker 构建镜像、Docker 运行时镜像必须使用相同版本的 Node.js**

## 版本配置位置

| 环境 | 配置文件 | 字段 |
|------|----------|------|
| 本地开发 | `.nvmrc` | Node 版本号 (如 `24`) |
| Docker 构建 | `docker/Dockerfile.shared` | `FROM node:<version>-alpine` |
| Docker 运行时 | `docker/Dockerfile.shared` | `FROM node:<version>-alpine` (runner 阶段) |

## 当前版本

- **Node.js 版本**: `24`
- **基础镜像**: `node:24-alpine`
- **验证**: `node --version` 应显示 `v24.x.x`

## 更新版本步骤

当需要升级 Node 版本时，必须同步更新以下位置：

### 1. 更新本地 `.nvmrc`

```bash
# 在项目根目录执行
echo "24" > .nvmrc
```

### 2. 更新 Dockerfile

修改 `docker/Dockerfile.shared` 中的所有 `FROM node:XXX-alpine` 行：

```dockerfile
# 阶段1: 基础镜像
FROM node:24-alpine AS base

# ... 中间阶段 ...

# 阶段3: 生产运行时
FROM node:24-alpine AS runner

# 子镜像也使用相同版本
FROM runner AS api-runtime
FROM runner AS www-runtime
FROM runner AS webapp-runtime
```

### 3. 验证一致性

```bash
# 检查本地版本
node --version

# 检查 Dockerfile 版本
grep -E "^FROM node:" docker/Dockerfile.shared

# 确保版本号一致
```

## 一致性检查命令

在提交代码前，运行以下命令确保版本一致：

```bash
# 获取 .nvmrc 版本
LOCAL_VERSION=$(cat .nvmrc)

# 获取 Dockerfile 版本
DOCKER_VERSION=$(grep -m1 "FROM node:" docker/Dockerfile.shared | sed 's/FROM node:\([0-9]*\).*/\1/')

# 对比
if [ "$LOCAL_VERSION" = "$DOCKER_VERSION" ]; then
  echo "✅ Node 版本一致: $LOCAL_VERSION"
else
  echo "❌ Node 版本不一致! 本地: $LOCAL_VERSION, Docker: $DOCKER_VERSION"
  exit 1
fi
```

## 常见问题

### Q: 为什么需要保持版本一致？

- **构建一致性**: 本地构建成功不代表 Docker 构建成功
- **依赖兼容性**: 某些包依赖特定 Node 版本
- **运行时行为**: 不同版本可能有不同的运行时行为

### Q: 如何快速同步更新所有位置？

当需要升级 Node 版本时，使用以下步骤：

```bash
# 1. 更新 .nvmrc
sed -i '' 's/^.*$/24/' .nvmrc

# 2. 更新 Dockerfile 中的所有 node 版本
sed -i '' 's/node:[0-9]*-alpine/node:24-alpine/g' docker/Dockerfile.shared

# 3. 验证更新
grep -n "node:" .nvmrc docker/Dockerfile.shared
```
