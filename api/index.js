// 文件: api/index.js (GitHub/Vercel 端)
export const config = {
  runtime: 'edge', // 保持 Edge 模式防超时
};

export default async function handler(request) {
  // CORS 预检
  if (request.method === 'OPTIONS') {
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
    // 1. 你的新 Minimax Key
    const API_KEY = "sk-cp-ci7wMCIWzMmkymTp0VdexCloEVWjevQZ-OqJzHzpcMPfYMPbRWHUzP50_QbSREsD7UTszpw4O1fEMU8T2-qaORrvGdnr7f-La3dJ7Qd7uw85sxgk349JAl0";

    const body = await request.json();
    
    // 强制开启流式
    body.stream = true;

    // 2. 关键修改：转发给 Minimax 的 Anthropic 兼容接口
    // Minimax 2.5 官方兼容地址：https://api.minimax.io/anthropic/v1/messages
    const minimaxResponse = await fetch('https://api.minimax.io/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Minimax 同时也支持标准 Bearer 认证，双管齐下最稳
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    // 3. 管道透传
    return new Response(minimaxResponse.body, {
      status: minimaxResponse.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': '*',
        'Connection': 'keep-alive'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
