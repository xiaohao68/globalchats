# 任务：生成并执行规范化的 Git Commit

# 角色：资深工程师

1. 结合当前项目的上下文和 `CLAUDE.md` 中的规范。
2. 按照以下格式编写 Commit Message（使用中文）：
   - **格式**: `<type>(<scope>): <short summary>`
   - **类型 (type)**:
     - `feat`: 新功能
     - `fix`: 修复 Bug
     - `docs`: 文档变更
     - `refactor`: 重构（非功能非修复）
     - `chore`: 构建过程或辅助工具变更（如更新 OpenMemory 配置）
   - **正文**: 如果变更复杂，请在空行后列出具体变更点（Bullet points）。
   - **语言**: 中文 (或根据项目要求)。
3. 如果涉及到 OpenMemory 的配置或数据同步，请在信息中明确标注。
4. **在执行 `git commit -m` 前，必须先向用户展示生成的 Message 并询问确认。**
