const requiredEnvironment = [
  "MONITOR_URL",
  "MONITOR_KEY",
  "FEISHU_APP_ID",
  "FEISHU_APP_SECRET",
  "FEISHU_BASE_TOKEN",
  "FEISHU_TABLE_ID",
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
  FEISHU_BASE_TOKEN,
  FEISHU_TABLE_ID,
} = process.env;

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
    "Tibo monitor",
  );

  if (!result.response.ok || !result.payload.ok) {
    throw new Error(
      `Tibo monitor failed: ${result.payload.message ?? result.response.status}`,
    );
  }

  return result.payload;
}

async function createBaseRecord(token, signal) {
  const publishedAt = Date.parse(signal.publishedAt);
  const fields = {
    帖子ID: signal.tweetId,
    分类: signal.category,
    原文: signal.originalText,
    原帖链接: {
      text: "查看 X 原帖",
      link: signal.postUrl,
    },
    推送状态: "待推送",
    检测时间: Date.now(),
  };

  if (Number.isFinite(publishedAt)) {
    fields.发布时间 = publishedAt;
  }

  const endpoint =
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}` +
    `/tables/${FEISHU_TABLE_ID}/records`;
  const result = await readJson(
    await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ fields }),
    }),
    "Feishu Base",
  );

  if (!result.response.ok || result.payload.code !== 0) {
    throw new Error(
      `Feishu Base write failed: ${result.payload.msg ?? result.response.status}`,
    );
  }

  return result.payload.data?.record?.record_id ?? "unknown";
}

async function acknowledgeSignal(signal) {
  const ackUrl = new URL("/api/ack", MONITOR_URL);
  const result = await readJson(
    await fetch(ackUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-monitor-key": MONITOR_KEY,
      },
      body: JSON.stringify({ tweetId: signal.tweetId }),
    }),
    "Tibo monitor acknowledgement",
  );

  if (!result.response.ok || !result.payload.ok) {
    throw new Error(
      `Acknowledgement failed: ${result.payload.message ?? result.response.status}`,
    );
  }
}

const signal = await checkForSignal();
if (!signal.matched) {
  console.log(signal.message ?? "No new reset signal.");
  process.exit(0);
}

const token = await getTenantToken();
const recordId = await createBaseRecord(token, signal);
await acknowledgeSignal(signal);
console.log(`Delivered tweet ${signal.tweetId} to Base record ${recordId}.`);
