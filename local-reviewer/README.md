# 本机 Tibo AI 语义复核

GitHub Actions 负责抓取 Tibo 动态和飞书送达；本目录中的 Windows 任务每 15 分钟调用已登录的 Codex CLI，逐条判断待审内容。

- 输入包含 Tibo 原文、引用帖或被回复内容以及原帖链接。
- Codex 会理解省略、代词、里程碑承诺和“明天有惊喜”一类预告式表达，而不是只匹配关键词。
- 明确重置、强烈暗示、banked reset、计划/状态和明确不会重置会进入通知；无关或低置信度内容不推送。
- 网页内容视为不可信数据；Codex 在只读沙箱和临时目录中运行。
- ChatGPT/Codex 登录缓存和站点写入密钥仅保留在本机。

首次配置：

```powershell
pwsh .\local-reviewer\Initialize-CodexResetReviewer.ps1
pwsh .\local-reviewer\Register-CodexResetReviewTask.ps1
```

手动执行一次复核：

```powershell
pwsh .\local-reviewer\Invoke-CodexResetReview.ps1
```
