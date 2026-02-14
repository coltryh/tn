const http = require('http');
const https = require('https');

// 1. 忽略公司网络监控的证书报错 (核心)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 2. 你的 Vercel 项目地址 (自定义域名版)
const VERCEL_URL = 'https://api.ryhcolt.online/api'; 

// 3. 强制替换为 Minimax 2.5 模型
// (注意：如果在 Claude Code 里遇到模型报错，可以尝试改成 'abab6.5s-chat')
const FORCE_MODEL = 'MiniMax-M2.5'; 

const server = http.createServer(async (req, res) => {
    // 设置 CORS 跨域头 (允许任何工具连接)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // 处理预检请求 (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // 处理 POST 请求 (真正的对话请求)
    if (req.method === 'POST') {
        let body = '';
        
        // 接收数据
        req.on('data', chunk => body += chunk);
        
        // 数据接收完毕，开始转发
        req.on('end', async () => {
            try {
                // 1. 解析原始请求
                const originalRequest = JSON.parse(body);
                
                // 2. 打印日志：看看工具原本想调什么
                console.log(`🔌 拦截请求: ${originalRequest.model} -> 🚀 转发 Minimax (${FORCE_MODEL})`);

                // 3. 核心修改：强制流式 + 换模型
                originalRequest.stream = true; 
                originalRequest.model = FORCE_MODEL;

                // 4. 发送给 Vercel
                const vercelResp = await fetch(VERCEL_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': 'curl/7.68.0' // 伪装成 curl
                    },
                    body: JSON.stringify(originalRequest)
                });

                // 5. 处理 Vercel 报错
                if (!vercelResp.ok) {
                    const errText = await vercelResp.text();
                    console.error(`❌ Vercel/Minimax 报错 [${vercelResp.status}]:`, errText);
                    res.writeHead(vercelResp.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: errText }));
                    return;
                }

                // 6. 建立流式管道 (Pipe)
                // 收到一个字，就立马转发给 Claude Code，防止超时
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });

                const reader = vercelResp.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    // 直接将二进制流写入响应
                    res.write(value);
                }
                
                // 结束响应
                res.end();
                console.log("✅ 传输完成");

            } catch (error) {
                console.error('❌ 代理内部错误:', error.message);
                // 如果头还没发，发个 500；如果发了，就直接断开
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: error.message }));
                } else {
                    res.end();
                }
            }
        });
    } else {
        // 其他请求方法直接返回 404
        res.writeHead(404);
        res.end('Not Found');
    }
});

// 错误捕获：防止端口占用导致程序崩溃
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('❌ 启动失败！！端口 3000 已经被占用了。');
        console.error('👉 请先关闭旧的代理窗口，或者运行 taskkill /F /IM node.exe');
    } else {
        console.error('❌ 未知错误:', e);
    }
});

// 启动监听
server.listen(3000, () => {
    console.log('-------------------------------------------');
    console.log('🚀 Minimax 专用基站已启动！(端口: 3000)');
    console.log(`🤖 目标模型: ${FORCE_MODEL}`);
    console.log(`📡 远程地址: ${VERCEL_URL}`);
    console.log('-------------------------------------------');
});
