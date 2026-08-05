# 本机 Codex AI 语义复核

云端 GitHub Actions 仍负责抓取来源和发送飞书消息。本目录只在当前 Windows 用户登录后运行：读取站点的规则预筛候选，调用已登录的 Codex CLI 做语义分类，再把结构化结论写回站点。

- 未经 AI 复核的社区帖子不展示、不计分、不推送。
- AI 置信度低于 80% 的结论不计入预测。
- ChatGPT/Codex 登录缓存只留在本机，不复制到公开仓库或 GitHub Actions。
- 帖子内容按不可信数据处理，Codex 运行在只读沙箱和临时空目录中。

首次配置：

```powershell
pwsh .\local-reviewer\Initialize-CodexResetReviewer.ps1
pwsh .\local-reviewer\Register-CodexResetReviewTask.ps1
```

手动验证：

```powershell
pwsh .\local-reviewer\Invoke-CodexResetReview.ps1
```
