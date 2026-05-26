 export const config = { runtime: 'edge' };

  export default async function handler(req) {
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
      const API_KEY = "sk-cp-JCd4ZdHGYFiFtwEBcxZ_mKjbY3IaXYFszPmrne1Jm7glkcYcB3YVDuTjkDa-HKmzPP6vK__cfG7fS6lwfrJLqmDDHgM
  6KI0XdHXUmDhfI-8IeibjzZcDXm8";
      const TARGET_URL = "https://api.minimaxi.com/anthropic/v1/messages";

      const claudeBody = await req.json();

      // === 优化1: 不强制流式，让请求类型自己决定 ===
      const upstreamBody = {
        ...claudeBody,
        // 如果客户端没指定 stream，默认用客户端的值
        // stream: true // 删除这行！让请求自己决定
      };

      // === 优化2: 只转发必要 headers，添加调试标记 ===
      const upstreamHeaders = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Authorization': `Bearer ${API_KEY}`,
        // 转发客户端的调试头（如果有的话）
        ...(req.headers.get('anthropic-dangerous-direct-sse') && {
          'anthropic-dangerous-direct-sse': 'true'
        })
      };

      // === 优化3: 添加超时控制 ===
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s超时

      const upstreamResp = await fetch(TARGET_URL, {
        method: 'POST',
        headers: upstreamHeaders,
        body: JSON.stringify(upstreamBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!upstreamResp.ok) {
        const err = await upstreamResp.text();
        return new Response(`Minimax Error: ${err}`, {
          status: upstreamResp.status,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // === 优化4: 根据实际内容类型决定响应方式 ===
      const contentType = upstreamResp.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // 流式响应（SSE）- 用于文本补全
        return new Response(upstreamResp.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Proxy': 'minimax-edge-v2' // 调试标记
          }
        });
      } else {
        // 非流式响应 - 用于图片等多模态内容
        // 直接返回上游响应体
        const data = await upstreamResp.json();
        return new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'X-Proxy': 'minimax-edge-v2'
          }
        });
      }

    } catch (e) {
      console.error('[Minimax Proxy Error]', e.message);
      return new Response(JSON.stringify({
        error: e.message,
        type: e.name === 'AbortError' ? 'timeout' : 'upstream_error'
      }), { status: 500 });
    }
  }
