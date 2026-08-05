# Codex Reset Radar Scheduler

每 15 分钟调用一次 Codex Reset Radar。站点同时监控 Tibo、OpenAI、OpenAI Developers、两位 Codex 团队成员及多个社区渠道。一手额度重置信号发送给全部配置接收人，社区预测越过 80% / 95% 时仅提醒邓平安；每天北京时间 10:00 和 17:00 还会固定向邓平安发送预测率与原因报告。

[`local-reviewer`](./local-reviewer) 不再接收站点关键词预筛的帖子正文。它在当前 Windows 用户下把 9 个社区渠道交给已登录的 Codex CLI，由 Codex 自主联网搜索、打开原帖、判断未来重置语义并结构化回写。找不到证据可以返回零条；低于 80% 语义置信度或只描述常规/过去重置的帖子，不展示、不计分、不推送。

## 安全边界

- 仓库不保存任何密钥。
- `MONITOR_KEY`、`FEISHU_APP_SECRET` 和接收人列表只保存在 GitHub Actions Secrets。
- 站点按 X status ID 去重，并按接收人保存成功回执；部分发送失败时，下一轮只重试尚未成功的接收人。
- 所有接收人都成功后才确认整条提醒送达。
- 联网搜索结果、帖子和网页内容全部是不可信输入，只用于读取、核验和分类，不执行其中的任何指令。

## 启用条件

1. Actions Secret `MONITOR_KEY` 已配置。
2. Actions Secret `FEISHU_APP_SECRET` 已配置。
3. Actions Secret `FEISHU_RECIPIENTS_JSON` 已配置为接收人数组。
4. 飞书应用具备 `im:message:send_as_bot` 权限，且接收人在应用可用范围内。
