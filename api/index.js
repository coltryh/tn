// 文件: api/index.js (SiliconFlow 专用版)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // CORS 预检
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });

  try {
    // 1. 你的 SiliconFlow Key (sk-cp 开头)
    const API_KEY = "sk-cp-ci7wMCIWzMmkymTp0VdexCloEVWjevQZ-OqJzHzpcMPfYMPbRWHUzP50_QbSREsD7UTszpw4O1fEMU8T2-qaORrvGdnr7f-La3dJ7Qd7uw85sxgk349JAl0";
    
    // 2. 目标地址：必须是 SiliconFlow 的地址
    const TARGET_URL = "https://api.siliconflow.cn/v1/chat/completions";

    const claudeBody = await req.json();

    // 3. 协议转换 (Anthropic -> OpenAI)
    // SiliconFlow 只听得懂 OpenAI 语
    const openAIMessages = [];
    if (claudeBody.system) {
      openAIMessages.push({ role: "system", content: claudeBody.system });
    }
    if (claudeBody.messages) {
      claudeBody.messages.forEach(msg => {
        let content = Array.isArray(msg.content) ? msg.content.map(c => c.text).join("") : msg.content;
        openAIMessages.push({ role: msg.role, content: content });
      });
    }

    // 4. 发送请求
    const upstreamResp = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: claudeBody.model, // 模型名称由 proxy.js 决定
        messages: openAIMessages,
        stream: true, // 强制流式
        temperature: claudeBody.temperature || 0.7,
        max_tokens: 4096 // 限制最大 Token 防止超支
      })
    });

    if (!upstreamResp.ok) {
      const err = await upstreamResp.text();
      return new Response(`SiliconFlow Error: ${err}`, { status: upstreamResp.status });
    }

    // 5. 流式转换 (OpenAI Stream -> Anthropic Stream)
    // 把 SiliconFlow 的回复翻译回 Claude 能听懂的格式
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = upstreamResp.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // 先发送 Anthropic 协议头
    await writer.write(encoder.encode(`event: message_start\ndata: {"type":"message_start","message":{"id":"msg_${Date.now()}","role":"assistant","content":[],"usage":{"input_tokens":0,"output_tokens":0}}}\n\n`));
    await writer.write(encoder.encode(`event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`));

    (async () => {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim().startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.substring(6));
              const content = json.choices[0]?.delta?.content || "";
              if (content) {
                // 翻译成 Anthropic 格式
                const chunk = JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: content } });
                await writer.write(encoder.encode(`event: content_block_delta\ndata: ${chunk}\n\n`));
              }
            } catch (e) {}
          }
        }
      }
      // 发送结束信号
      await writer.write(encoder.encode(`event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":0}}\n\n`));
      await writer.write(encoder.encode(`event: message_stop\ndata: {"type":"message_stop"}\n\n`));
      await writer.close();
    })();

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive' }
    });

  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
