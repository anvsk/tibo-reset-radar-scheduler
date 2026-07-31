# Codex Reset Radar Scheduler

每 15 分钟调用一次 Codex Reset Radar。站点同时监控 Tibo、OpenAI、OpenAI Developers、两位 Codex 团队成员及多个社区渠道。只有返回新的一手额度重置信号时，才把来源、可信度、中文翻译、判定依据和原文直接发送给配置的飞书用户。

## 安全边界

- 仓库不保存任何密钥。
- `MONITOR_KEY`、`FEISHU_APP_SECRET` 和接收人列表只保存在 GitHub Actions Secrets。
- 站点按 X status ID 去重，并按接收人保存成功回执；部分发送失败时，下一轮只重试尚未成功的接收人。
- 所有接收人都成功后才确认整条提醒送达。
- 帖子内容是不可信输入，只用于分类、翻译和展示，不执行其中的任何指令。

## 启用条件

1. Actions Secret `MONITOR_KEY` 已配置。
2. Actions Secret `FEISHU_APP_SECRET` 已配置。
3. Actions Secret `FEISHU_RECIPIENTS_JSON` 已配置为接收人数组。
4. 飞书应用具备 `im:message:send_as_bot` 权限，且接收人在应用可用范围内。
