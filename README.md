# Tibo Reset Watch Scheduler

本机调度器每 5 分钟串行抓取一次 Tibo 的公开动态、调用 Codex AI 做语义复核，并通过本机飞书机器人直接送达。GitHub Actions 保留错开整点的 15 分钟兜底计划，不参与正常本机主链路。

[`local-reviewer`](./local-reviewer) 会逐条判断 Tibo 最近 48 小时的帖子、引用帖和回复。它会打开原帖核验上下文，识别明确重置、banked reset、未来计划、强烈暗示和明确不会重置；不再运行社区搜索或生成预测率。

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
