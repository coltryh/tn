// 文件: api/index.js (Minimax M3 提速优化版)
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
    // 1. 你的 Minimax Coding Plan Key
    const API_KEY = "sk-cp-ci7wMCIWzMmkymTp0VdexCloEVWjevQZ-OqJzHzpcMPfYMPbRWHUzP50_QbSREsD7UTszpw4O1fEMU8T2-qaORrvGdnr7f-La3dJ7Qd7uw85sxgk349JAl0";

    // 2. 目标地址：Minimax 官方 Anthropic 兼容接口
    const TARGET_URL = "https://api.minimaxi.com/anthropic/v1/messages";

    const claudeBody = await req.json();


    // 4. 转发请求给 Minimax
    const upstreamResp = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Authorization': `Bearer ${API_KEY}`
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

    // 5. 【优化 2：穿透 Vercel 缓冲，实现极速流式回传】
    return new Response(upstreamResp.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        // 禁用任何形式的缓存，且要求 Vercel 不对数据做任何转换 (no-transform)
        'Cache-Control': 'no-cache, no-store, must-revalidate, no-transform',
        // 核心提速魔法：强制关闭 Nginx/Vercel 网关的“响应缓冲”
        'X-Accel-Buffering': 'no', 
        'Connection': 'keep-alive'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
