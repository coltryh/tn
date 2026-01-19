export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // 1. 如果是 GET 请求，返回存活状态
  if (request.method === 'GET') return new Response('Proxy Active');

  try {
    // 2. 这里的 Key 填你自己的！
    const API_KEY = "Bearer 1efd5a531e264686a78cb9af688a4916.zJegTzxa61V0EsIe";

    // 3. 拿到请求体
    const body = await request.json();

    // 4. 帮你是转发给智谱
    const zhipuResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: JSON.stringify(body)
    });

    // 5. 把结果返回给你
    const data = await zhipuResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
