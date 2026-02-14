// 文件: proxy.js (本地启动用)
const http = require('http');

// 1. 忽略证书错误 (核心：绕过公司 Zscaler 拦截)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 2. 你的 Vercel 地址 (必须是自定义域名的那个)
const VERCEL_URL = 'https://api.ryhcolt.online/api'; 

// 3. 强制指定模型
// 如果你是用 Minimax，请用这个:
const FORCE_MODEL = 'minimax/abab6.5s-chat';
// 如果你的新 Key 是 DeepSeek 的，请改成: 'deepseek-chat' 或 'deepseek-reasoner'

const server = http.createServer(async (req, res) => {
    // CORS 设置
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
                
                console.log(`🔌 拦截请求 -> 🚀 转发流式请求 (${FORCE_MODEL})`);

                // 修改请求：强制流式 + 换模型
                originalRequest.stream = true; 
                originalRequest.model = FORCE_MODEL;

                const vercelResp = await fetch(VERCEL_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'curl/7.68.0' },
                    body: JSON.stringify(originalRequest)
                });

                if (!vercelResp.ok) {
                    const errText = await vercelResp.text();
                    console.error(`❌ 上游报错 [${vercelResp.status}]:`, errText);
                    res.writeHead(vercelResp.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: errText }));
                    return;
                }

                // 建立流式管道
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });

                const reader = vercelResp.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                }
                res.end();
                console.log("✅ 传输完成");

            } catch (error) {
                console.error('❌ 代理错误:', error.message);
                if (!res.headersSent) res.end();
            }
        });
    }
});

server.listen(3000, () => {
    console.log('-------------------------------------------');
    console.log('🚀 新 Key 本地基站已启动！(端口: 3000)');
    console.log(`🤖 目标模型: ${FORCE_MODEL}`);
    console.log('-------------------------------------------');
});
