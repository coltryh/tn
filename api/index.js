export const config = {
  runtime: 'edge', // 使用 Edge 模式，跟 Cloudflare 代码几乎通用
};

export default async function handler(request) {
  // 1. 如果不是 POST，证明活著
  if (request.method !== 'POST') return new Response('Vercel Tunnel Active');

  try {
    // 2. 接收本地发来的“乱码”
    const encodedBody = await request.text();
    
    // 3. 解码 (Base64 -> JSON)
    // 对应本地的混淆逻辑
    const originalBody = decodeURIComponent(escape(atob(encodedBody)));

    // 4. 定义 Zhipu API
    const zhipuUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    
    // 5. 🔥 硬编码 Key (在这里填入你的 Key)
    const API_KEY = "Bearer 1efd5a531e264686a78cb9af688a4916.zJegTzxa61V0EsIe";

    // 6. 发起请求
    const apiResponse = await fetch(zhipuUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY
      },
      body: originalBody
    });

    // 7. 拿到结果，再次加密 (JSON -> Base64) 回传
    const responseJson = await apiResponse.text();
    const encodedResponse = btoa(unescape(encodeURIComponent(responseJson)));

    // 8. 伪装成纯文本返回
    return new Response(encodedResponse, {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (e) {
    return new Response('Proxy Error: ' + e.message, { status: 500 });
  }
}
