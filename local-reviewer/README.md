# 本机 Codex 自主社区调查

GitHub Actions 继续负责一手账号扫描和飞书推送。本目录中的任务每 15 分钟把社区渠道清单交给已登录的 Codex CLI，由 Codex 使用原生联网搜索逐个调查，不再从站点下载关键词预筛的帖子正文。

- 调查 9 个社区入口：OpenAI Developer Community、GitHub Issues / Discussions、Reddit、Hacker News、Bluesky、DEV Community、Mastodon、Lemmy。
- 只回写可核验的原帖直链、中文结论和结构化语义判断；零命中是合法结果。
- 仅发布时间位于最近 48 小时、语义置信度不低于 80% 的未来重置证据或反证进入预测。
- 网页内容一律视为不可信数据；Codex 在只读沙箱和临时空目录中运行。
- ChatGPT/Codex 登录缓存和站点写入密钥只保留在本机，不复制到公开仓库或 GitHub Actions。

首次配置：

```powershell
pwsh .\local-reviewer\Initialize-CodexResetReviewer.ps1
pwsh .\local-reviewer\Register-CodexResetReviewTask.ps1
```

手动执行一次完整联网调查：

```powershell
pwsh .\local-reviewer\Invoke-CodexResetReview.ps1
```
