import { createHash } from "node:crypto";

const requiredEnvironment = [
  "MONITOR_URL",
  "MONITOR_KEY",
  "FEISHU_APP_ID",
  "FEISHU_APP_SECRET",
  "FEISHU_RECIPIENTS_JSON",
];

const missing = requiredEnvironment.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.log(`Scheduler is not armed. Missing: ${missing.join(", ")}`);
  process.exit(0);
}

const {
  MONITOR_URL,
  MONITOR_KEY,
  FEISHU_APP_ID,
  FEISHU_APP_SECRET,
  FEISHU_RECIPIENTS_JSON,
} = process.env;

function readRecipients() {
  let recipients;
  try {
    recipients = JSON.parse(FEISHU_RECIPIENTS_JSON);
  } catch {
    throw new Error("FEISHU_RECIPIENTS_JSON must contain valid JSON.");
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("FEISHU_RECIPIENTS_JSON must contain a non-empty array.");
  }

  const keys = new Set();
  for (const recipient of recipients) {
    if (
      !recipient ||
      typeof recipient !== "object" ||
      typeof recipient.key !== "string" ||
      !/^[a-z0-9_-]{1,64}$/.test(recipient.key) ||
      typeof recipient.name !== "string" ||
      recipient.name.trim().length === 0 ||
      typeof recipient.openId !== "string" ||
      !/^ou_[a-zA-Z0-9]+$/.test(recipient.openId)
    ) {
      throw new Error(
        "Every Feishu recipient needs a valid key, name and openId.",
      );
    }
    if (keys.has(recipient.key)) {
      throw new Error(`Duplicate Feishu recipient key: ${recipient.key}`);
    }
    keys.add(recipient.key);
  }

  return recipients;
}

async function readJson(response, label) {
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON data (HTTP ${response.status})`);
  }

  return { response, payload };
}

async function getTenantToken() {
  const result = await readJson(
    await fetch(
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app_id: FEISHU_APP_ID,
          app_secret: FEISHU_APP_SECRET,
        }),
      },
    ),
    "Feishu authentication",
  );

  if (
    !result.response.ok ||
    result.payload.code !== 0 ||
    !result.payload.tenant_access_token
  ) {
    throw new Error(
      `Feishu authentication failed: ${result.payload.msg ?? result.response.status}`,
    );
  }

  return result.payload.tenant_access_token;
}

async function checkForSignal() {
  const result = await readJson(
    await fetch(MONITOR_URL, {
      method: "POST",
      headers: { "x-monitor-key": MONITOR_KEY },
    }),
    "Codex reset monitor",
  );

  if (!result.response.ok || !result.payload.ok) {
    throw new Error(
      `Codex reset monitor failed: ${result.payload.message ?? result.response.status}`,
    );
  }

  return result.payload;
}

function formatPublishedAt(value) {
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(publishedAt);
}

function safePostUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function messageContent(signal) {
  if (signal.alertKind === "prediction_report") {
    const detailUrl = safePostUrl(signal.dashboardUrl ?? signal.postUrl);
    const content = [
      [
        {
          tag: "text",
          text:
            `当前预测率：${Number(signal.predictionProbability)}%\n` +
            `观察窗口：未来 48 小时\n` +
            `支持讨论：${Number(signal.supportingPosts)} 条 / ${Number(signal.supportingSources)} 个渠道\n` +
            `相反观点：${Number(signal.contradictingPosts)} 条\n` +
            `AI 复核：${Number(signal.aiReviewApproved)} 条通过、${Number(signal.aiReviewPending)} 条待审、${Number(signal.aiReviewRejected)} 条排除\n` +
            `生成时间：${formatPublishedAt(signal.publishedAt)}（北京时间）`,
        },
      ],
      [
        {
          tag: "text",
          text: `\n原因分析\n${signal.translationZh}`,
        },
      ],
      [
        {
          tag: "text",
          text: `\n口径说明\n${signal.classificationReason}\n该预测未获 OpenAI 或 Codex 团队确认。`,
        },
      ],
    ];
    if (detailUrl) {
      content.push([{ tag: "a", text: "查看预测详情", href: detailUrl }]);
    }
    return JSON.stringify({
      zh_cn: {
        title: "Codex 额度重置预测报告",
        content,
      },
    });
  }

  if (signal.alertKind === "community_prediction") {
    const predictionRate = Number.isFinite(Number(signal.predictionProbability))
      ? `${Number(signal.predictionProbability)}%`
      : signal.confidence;
    const threshold = Number.isFinite(Number(signal.predictionThreshold))
      ? `${Number(signal.predictionThreshold)}%`
      : "80%";
    const detailUrl = safePostUrl(signal.dashboardUrl ?? signal.postUrl);
    const content = [
      [
        {
          tag: "text",
          text:
            "⚠️ 这是社区讨论预测，尚未获得 OpenAI 或 Codex 团队确认。\n" +
            `预测率：${predictionRate}\n` +
            `触发阈值：${threshold}\n` +
            `观察窗口：最近 48 小时\n` +
            `触发时间：${formatPublishedAt(signal.publishedAt)}（北京时间）`,
        },
      ],
      [
        {
          tag: "text",
          text: `\n社区证据摘要\n${signal.translationZh ?? signal.originalText}`,
        },
      ],
      [
        {
          tag: "text",
          text: `\n评分依据\n${signal.classificationReason}`,
        },
      ],
    ];
    if (detailUrl) {
      content.push([
        {
          tag: "a",
          text: "查看预测详情",
          href: detailUrl,
        },
      ]);
    }
    return JSON.stringify({
      zh_cn: {
        title: "Codex 额度重置预测预警",
        content,
      },
    });
  }

  const translation =
    typeof signal.translationZh === "string" && signal.translationZh.trim()
      ? signal.translationZh.trim()
      : "中文翻译暂不可用，请结合原文和判定依据查看。";
  const postUrl = safePostUrl(signal.postUrl);
  const content = [
    [
      {
        tag: "text",
        text:
          `来源：${signal.sourceName}（${signal.sourceAccount}）\n` +
          `类别：${signal.category}\n` +
          `可信度：${signal.confidence}\n` +
          `发布时间：${formatPublishedAt(signal.publishedAt)}（北京时间）`,
      },
    ],
    [
      {
        tag: "text",
        text: `\n中文翻译\n${translation}`,
      },
    ],
    [
      {
        tag: "text",
        text: `\n判定依据\n${signal.classificationReason}`,
      },
    ],
    [
      {
        tag: "text",
        text: `\n原文\n${signal.originalText}`,
      },
    ],
  ];
  if (postUrl) {
    content.push([
      {
        tag: "a",
        text: "查看原帖",
        href: postUrl,
      },
    ]);
  }
  return JSON.stringify({
    zh_cn: {
      title: "Codex 额度重置监控",
      content,
    },
  });
}

function selectRecipients(signal, recipients) {
  if (signal.targetRecipientNames === undefined) return recipients;
  if (
    !Array.isArray(signal.targetRecipientNames) ||
    signal.targetRecipientNames.length === 0 ||
    signal.targetRecipientNames.some(
      (name) => typeof name !== "string" || name.trim().length === 0,
    )
  ) {
    throw new Error("Signal targetRecipientNames must be a non-empty name array.");
  }

  const targetNames = new Set(
    signal.targetRecipientNames.map((name) => name.trim()),
  );
  const selected = recipients.filter((recipient) =>
    targetNames.has(recipient.name.trim()),
  );
  const selectedNames = new Set(selected.map((recipient) => recipient.name.trim()));
  const missingNames = [...targetNames].filter((name) => !selectedNames.has(name));
  if (missingNames.length > 0) {
    throw new Error(
      `Configured Feishu recipients are missing targets: ${missingNames.join(", ")}`,
    );
  }
  return selected;
}

function idempotencyKey(signal, recipient) {
  const digest = createHash("sha256")
    .update(`${signal.tweetId}:${recipient.key}`)
    .digest("hex")
    .slice(0, 32);
  return `codex-reset-${digest}`;
}

async function sendFeishuMessage(token, signal, recipient) {
  const endpoint = new URL(
    "https://open.feishu.cn/open-apis/im/v1/messages",
  );
  endpoint.searchParams.set("receive_id_type", "open_id");
  const result = await readJson(
    await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        receive_id: recipient.openId,
        msg_type: "post",
        content: messageContent(signal),
        uuid: idempotencyKey(signal, recipient),
      }),
    }),
    `Feishu message for ${recipient.name}`,
  );

  if (
    !result.response.ok ||
    result.payload.code !== 0 ||
    !result.payload.data?.message_id
  ) {
    throw new Error(
      `Feishu message for ${recipient.name} failed: ` +
        `${result.payload.msg ?? result.response.status}`,
    );
  }

  return result.payload.data.message_id;
}

async function recordDelivery(signal, recipient, messageId) {
  const deliveryUrl = new URL("/api/delivery", MONITOR_URL);
  const result = await readJson(
    await fetch(deliveryUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-monitor-key": MONITOR_KEY,
      },
      body: JSON.stringify({
        tweetId: signal.tweetId,
        recipientKey: recipient.key,
        recipientName: recipient.name,
        messageId,
      }),
    }),
    "Codex reset monitor delivery receipt",
  );

  if (!result.response.ok || !result.payload.ok) {
    throw new Error(
      `Delivery receipt failed: ${result.payload.message ?? result.response.status}`,
    );
  }
}

async function acknowledgeSignal(signal, recipientKeys) {
  const ackUrl = new URL("/api/ack", MONITOR_URL);
  const result = await readJson(
    await fetch(ackUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-monitor-key": MONITOR_KEY,
      },
      body: JSON.stringify({
        tweetId: signal.tweetId,
        recipientKeys,
      }),
    }),
    "Codex reset monitor acknowledgement",
  );

  if (!result.response.ok || !result.payload.ok) {
    throw new Error(
      `Acknowledgement failed: ${result.payload.message ?? result.response.status}`,
    );
  }
}

const recipients = readRecipients();
const signal = await checkForSignal();
if (!signal.matched) {
  console.log(signal.message ?? "No new reset signal.");
  process.exit(0);
}

const selectedRecipients = selectRecipients(signal, recipients);
const deliveredRecipientKeys = new Set(signal.deliveredRecipientKeys ?? []);
const pendingRecipients = selectedRecipients.filter(
  (recipient) => !deliveredRecipientKeys.has(recipient.key),
);

if (pendingRecipients.length > 0) {
  const token = await getTenantToken();
  for (const recipient of pendingRecipients) {
    const messageId = await sendFeishuMessage(token, signal, recipient);
    if (signal.deliveryMode !== "stateless") {
      await recordDelivery(signal, recipient, messageId);
    }
    deliveredRecipientKeys.add(recipient.key);
  }
}

const recipientKeys = selectedRecipients.map((recipient) => recipient.key);
if (signal.deliveryMode !== "stateless") {
  await acknowledgeSignal(signal, recipientKeys);
}
console.log(
  `Delivered ${signal.alertKind ?? "official_signal"} ${signal.tweetId} directly to ` +
    `${recipientKeys.length} Feishu recipient(s).`,
);
