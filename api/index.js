export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
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
    // 1. 你的智谱 Key
    const API_KEY = "1efd5a531e264686a78cb9af688a4916.zJegTzxa61V0EsIe";

    // 2. 获取 Claude 发来的原始请求
    const body = await request.json();

    // 3. 🚨 关键修改：转发给智谱的 Anthropic 兼容接口
    // 注意：这里必须用 api/anthropic/v1/messages
    const zhipuResponse = await fetch('https://open.bigmodel.cn/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,      // Anthropic 标准是用 x-api-key
        'anthropic-version': '2023-06-01' // 必须假装是这个版本
      },
      body: JSON.stringify(body)
    });

    // 4. 处理流式响应 (哪怕不流式，原样返回也更稳)
    const data = await zhipuResponse.text();
    
    return new Response(data, {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
