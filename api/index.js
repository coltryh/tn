// 文件: api/index.js (Minimax Coding Plan 官方专用版)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    });
  }

  try {
    // 1. 你的 Minimax Coding Plan Key (sk-cp 开头)
    const API_KEY = "sk-cp-ci7wMCIWzMmkymTp0VdexCloEVWjevQZ-OqJzHzpcMPfYMPbRWHUzP50_QbSREsD7UTszpw4O1fEMU8T2-qaORrvGdnr7f-La3dJ7Qd7uw85sxgk349JAl0";

    // 2. 目标地址：Minimax 官方 Anthropic 兼容接口 (国内节点)
    // 注意：Coding Plan 必须走这个兼容接口，且国内用户推荐用 minimaxi.com
    const TARGET_URL = "https://api.minimaxi.com/anthropic/v1/messages";

    const claudeBody = await req.json();

    // 3. 直接转发请求 (因为 Minimax 官方支持 Anthropic 协议)
    // 我们只需要把 Key 塞进正确的 Header 里
    const upstreamResp = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,           // Anthropic 标准鉴权头
        'anthropic-version': '2023-06-01', // 必须带上版本号
        'Authorization': `Bearer ${API_KEY}` // 双重保险，有些网关认这个
      },
      body: JSON.stringify({
        ...claudeBody,
        stream: true // 强制流式
      })
    });

    if (!upstreamResp.ok) {
      const err = await upstreamResp.text();
      return new Response(`Minimax Error: ${err}`, { status: upstreamResp.status });
    }

    // 4. 管道透传 (Pipe)
    // 直接把 Minimax 的流式结果发回给 Claude Code
    return new Response(upstreamResp.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
