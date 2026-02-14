// 文件: proxy.js (Minimax Coding Plan 本地版)
const http = require('http');

// 1. 忽略证书错误 (绕过 Zscaler)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 2. Vercel 地址
const VERCEL_URL = 'https://api.ryhcolt.online/api'; 

// 3. 🔥 强制指定模型：Coding Plan 只能用这个名字，不能改！
const FORCE_MODEL = 'MiniMax-M2.5'; 

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const originalRequest = JSON.parse(body);
                
                console.log(`🔌 拦截请求 -> 🚀 转发 Minimax Coding Plan (${FORCE_MODEL})`);

                // 强制流式 + 换模型
                originalRequest.stream = true; 
                originalRequest.model = FORCE_MODEL;

                const vercelResp = await fetch(VERCEL_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'curl/7.68.0' },
                    body: JSON.stringify(originalRequest)
                });

                if (!vercelResp.ok) {
                    const errText = await vercelResp.text();
                    console.error(`❌ 上游报错:`, errText);
                    res.writeHead(vercelResp.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: errText }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

                const reader = vercelResp.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
                console.log("✅ 传输完成");

            } catch (error) { if (!res.headersSent) res.end(); }
        });
    }
});

server.listen(3000, () => {
    console.log('-------------------------------------------');
    console.log('🚀 Minimax Coding Plan 基站已启动！');
    console.log(`🔑 密钥前缀: sk-cp- (已确认)`);
    console.log(`🤖 锁定模型: ${FORCE_MODEL}`);
    console.log('-------------------------------------------');
});
