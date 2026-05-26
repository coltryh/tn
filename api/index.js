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

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 增加到120秒

      const upstreamResp = await fetch(TARGET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(claudeBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!upstreamResp.ok) {
        const err = await upstreamResp.text();
        return new Response(`Minimax Error: ${upstreamResp.status} - ${err}`, {
          status: upstreamResp.status,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // 先读取完整 body，检查是否为空
      const fullBody = await upstreamResp.text();

      // 检查空响应
      if (!fullBody || fullBody.trim() === '') {
        return new Response(JSON.stringify({ error: 'upstream returned empty body' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const contentType = upstreamResp.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // 流式响应
        return new Response(fullBody, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } else {
        // 非流式 JSON 响应
        return new Response(fullBody, {
          headers: {
            'Content-Type': 'application/json',
          }
        });
      }

    } catch (e) {
      console.error('[Minimax Proxy Error]', e.message, e.stack);
      return new Response(JSON.stringify({
        error: e.message,
        type: e.name === 'AbortError' ? 'timeout' : 'unknown_error'
      }), { status: 500 });
    }
  }
