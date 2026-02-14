// 文件: api/index.js (适配 Sk-api 新 Key 版)
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
    // 1. 你的新 API Key
    const API_KEY = "Sk-api-6mj_P8s4IIyKI60EKbGrwaL-Pi3ncZJ7lcSM-AHLRjJG3ZFAAoNr9nPcD0ifFHCQ6lPqN8fFqukQSpNn8VWSjshcpbaN_KaRVR822SWy-PydowFqTXEqgow";
    
    // 2. 目标地址 (默认为 SiliconFlow/Minimax)
    // 如果这个 Key 是 DeepSeek 官方的，请改为: "https://api.deepseek.com/chat/completions"
    const TARGET_URL = "https://api.siliconflow.cn/v1/chat/completions";

    const claudeBody = await req.json();

    // 3. 【协议转换】Anthropic (Claude) -> OpenAI
    const openAIMessages = [];
    
    // System Prompt 转换
    if (claudeBody.system) {
      openAIMessages.push({ role: "system", content: claudeBody.system });
    }
    
    // 对话历史转换
    if (claudeBody.messages) {
      claudeBody.messages.forEach(msg => {
        let contentStr = "";
        if (Array.isArray(msg.content)) {
          contentStr = msg.content.map(c => c.text || "").join("");
        } else {
          contentStr = msg.content;
        }
        openAIMessages.push({ role: msg.role, content: contentStr });
      });
    }

    // 4. 发起请求
    const upstreamResp = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: claudeBody.model, // 模型名称由 proxy.js 决定
        messages: openAIMessages,
        stream: true, 
        temperature: claudeBody.temperature || 0.7,
        max_tokens: 4096
      })
    });

    if (!upstreamResp.ok) {
      const err = await upstreamResp.text();
      // 如果报错，把错误信息直接返给你看
      return new Response(`Upstream Error: ${err}`, { status: upstreamResp.status });
    }

    // 5. 【流式回译】OpenAI Stream -> Anthropic Stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = upstreamResp.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // 伪造 Anthropic 头
    await writer.write(encoder.encode(`event: message_start\ndata: {"type":"message_start","message":{"id":"msg_${Date.now()}","role":"assistant","content":[],"usage":{"input_tokens":0,"output_tokens":0}}}\n\n`));
    await writer.write(encoder.encode(`event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`));

    (async () => {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && !trimmed.includes("[DONE]")) {
              try {
                const json = JSON.parse(trimmed.substring(6));
                const content = json.choices[0]?.delta?.content || "";
                if (content) {
                  // 翻译回 Claude 格式
                  const chunk = JSON.stringify({
                    type: "content_block_delta",
                    index: 0,
                    delta: { type: "text_delta", text: content }
                  });
                  await writer.write(encoder.encode(`event: content_block_delta\ndata: ${chunk}\n\n`));
                }
              } catch (e) {}
            }
          }
        }
        await writer.write(encoder.encode(`event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":0}}\n\n`));
        await writer.write(encoder.encode(`event: message_stop\ndata: {"type":"message_stop"}\n\n`));
        await writer.close();
      } catch (e) { try { await writer.close(); } catch {} }
    })();

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
