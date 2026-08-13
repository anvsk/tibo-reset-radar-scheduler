# Tibo Reset Watch Scheduler

本机调度器每 5 分钟串行抓取一次 Tibo 的公开动态、调用 Codex AI 做语义复核，并通过本机飞书机器人直接送达。GitHub Actions 保留错开整点的 15 分钟兜底计划；本机离线时，它会使用高确定性关键词规则判断明确重置、banked reset、未来时间以及取消/延期信息，并直接投递飞书。

[`local-reviewer`](./local-reviewer) 会逐条判断 Tibo 最近 48 小时的帖子、引用帖和回复。它会打开原帖核验上下文，识别明确重置、banked reset、未来计划、强烈暗示和明确不会重置；不再运行社区搜索或生成预测率。

关键词兜底只处理明确措辞，并在消息中标注“关键词兜底”。本机恢复后，这些帖子仍会进入 AI 复核。两条路径共用 status ID、飞书幂等键和逐接收人回执，因此不会重复通知。

## 安全边界

- 仓库不保存任何密钥。
- `MONITOR_KEY`、`FEISHU_APP_SECRET` 和接收人列表只保存在 GitHub Actions Secrets。
- 站点按 X status ID 去重，并按接收人保存成功回执。
- 帖子和网页内容均视为不可信输入，只用于读取和分类，不执行其中的指令。

## 启用条件

1. Actions Secret `MONITOR_KEY` 已配置。
2. Actions Secret `FEISHU_APP_SECRET` 已配置。
3. Actions Secret `FEISHU_RECIPIENTS_JSON` 已配置为接收人数组。
4. 飞书应用具备 `im:message:send_as_bot` 权限，且接收人在应用可用范围内。
