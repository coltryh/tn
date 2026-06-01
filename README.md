
// 文件: proxy.js (抛弃 Vercel，本地直连 Minimax 终极版)
const http = require('http');

// 1. 核心魔法：无视公司 Zscaler 证书拦截
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 2. 你的 Minimax Key
const API_KEY = "sk-cp-ci7wMCIWzMmkymTp0VdexCloEVWjevQZ-OqJzHzpcMPfYMPbRWHUzP50_QbSREsD7UTszpw4O1fEMU8T2-qaORrvGdnr7f-La3dJ7Qd7uw85sxgk349JAl0";

// 3. Minimax 官方接口与模型
const TARGET_URL = 'https://api.minimaxi.com/anthropic/v1/messages';
const FORCE_MODEL = 'MiniMax-M2.7'; // 建议用 M2.7，最稳定

const server = http.createServer(async (req, res) => {
    // 允许跨域
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
                
                // 强制接管模型并开启流式
                originalRequest.stream = true; 
                originalRequest.model = FORCE_MODEL;

                console.log(`🚀 直连 Minimax (${FORCE_MODEL})... 正在耐心等待思考...`);

                // 重点：直接从你本地发请求给 Minimax，不再绕道 Vercel！
                const minimaxResp = await fetch(TARGET_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': API_KEY,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(originalRequest)
                });

                if (!minimaxResp.ok) {
                    const errText = await minimaxResp.text();
                    console.error(`❌ Minimax 报错:`, errText);
                    if (!res.headersSent) {
                        res.writeHead(minimaxResp.status, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: errText }));
                    }
                    return;
                }

                // 建立超长待机管道
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive'
                });

                const reader = minimaxResp.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
                console.log("✅ 单次流式传输完美结束");

            } catch (error) { 
                console.error('❌ 本地代理错误:', error.message);
                if (!res.headersSent) res.end(); 
            }
        });
    }
});

server.listen(3000, () => {
    console.log('-------------------------------------------');
    console.log('🚀 终极无中间商直连版基站已启动！');
    console.log(`🤖 锁定模型: ${FORCE_MODEL}`);
    console.log('-------------------------------------------');
});
