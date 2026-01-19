// 文件: api/index.js (这是给 Vercel 用的)
export const config = {
  runtime: 'edge', // 🔥 关键：开启 Edge 模式，解除 10 秒超时限制
};

export default async function handler(request) {
  // 处理 CORS 预检
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
    // 你的智谱 Key
    const API_KEY = "1efd5a531e264686a78cb9af688a4916.zJegTzxa61V0EsIe";

    const body = await request.json();
    
    // 强制开启流式，让它一个字一个字蹦，防止超时
    body.stream = true;

    // 转发给智谱
    const zhipuResponse = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    // 🔥 关键：直接把水管接通 (透传)
    return new Response(zhipuResponse.body, {
      status: zhipuResponse.status,
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
