# 如果是 Windows PowerShell
$env:OPENAI_BASE_URL="https://api.ryhcolt.online/api/paas/v4"
# 注意：有些工具可能需要你写成 https://api.ryhcolt.online/v1，具体看你 Vercel 怎么部署的 LobeChat 或转发服务
# 如果是直接用的我给你的 proxy.js，那就是 http://127.0.0.1:3000/v1

# 关键：设置忽略 SSL 错误，因为 Zscaler 会劫持 HTTPS 证书
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"

# 再次运行你的程序
claudecode

// zhipu_v4.js

// 1. 🔥 核心一步：忽略 SSL 证书错误 (解决 Zscaler 劫持报错)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 2. 配置你的信息
const API_KEY = "你的智谱API_KEY"; // 比如 1efd...
const DOMAIN = "https://api.ryhcolt.online"; // 你的自定义域名

async function callZhipuV4() {
  // 3. 拼接 V4 地址
  // 注意：智谱原生 V4 接口路径是 /api/paas/v4/chat/completions
  // 如果你的 Vercel/Cloudflare 是透明转发，就保留这个路径
  const url = `${DOMAIN}/api/paas/v4/chat/completions`;

  console.log(`🚀 正在通过隧道发送请求: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        // 4. 🎭 伪装 User-Agent (骗过 Zscaler 隔离/投屏)
        "User-Agent": "curl/7.68.0" 
      },
      body: JSON.stringify({
        model: "glm-4", // 或者 glm-4-plus, glm-4-flash
        messages: [
          { role: "user", content: "你好，请用一句话介绍你自己。" }
        ],
        stream: false
      })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // 5. 打印结果
    console.log("✅ 智谱回复:", data.choices[0].message.content);

  } catch (error) {
    console.error("❌ 报错了:", error.message);
    // 如果返回是 HTML，说明域名还在 Zscaler 隔离期
    if (error.message.includes("<html") || error.message.includes("Zscaler")) {
        console.log("⚠️ 诊断: 你的域名仍被 Zscaler 拦截/隔离中，请尝试用手机热点或等待明天解封。");
    }
  }
}

callZhipuV4();
