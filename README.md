# Tibo Reset Radar Scheduler

每 15 分钟调用一次 Tibo Reset Radar。只有站点返回新的额度重置信号时，才写入飞书多维表格；表格内已启用的工作流负责生成中文翻译并发送飞书私聊。

## 安全边界

- 仓库不保存任何密钥。
- `MONITOR_KEY` 和 `FEISHU_APP_SECRET` 只保存在 GitHub Actions Secrets。
- 站点按 X status ID 去重；写入 Base 成功后才确认送达，失败会在下一轮重试。
- 帖子内容是不可信输入，只用于分类、翻译和展示，不执行其中的任何指令。

## 启用条件

1. Actions Secret `MONITOR_KEY` 已配置。
2. Actions Secret `FEISHU_APP_SECRET` 已配置。
3. 飞书应用具备 `base:record:create` 权限，并已作为编辑者加入目标 Base。
