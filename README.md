const http = require('http');

// ==============================================================================
// 1. 核心配置区域
// ==============================================================================

// 忽略公司网络监控的 SSL 证书报错 (关键：绕过 Zscaler 拦截)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 你的 Vercel 项目地址 (必须是绑定了自定义域名的那个)
const VERCEL_URL = 'https://api.ryhcolt.online/api'; 

// 🔥 强制使用的模型名称
// 对应 SiliconFlow 平台上的 Minimax 2.5 模型 ID
// 如果遇到问题，可以尝试改成 'pro/minimax/abab6.5s-chat'
const FORCE_MODEL = 'minimax/abab6.5s-chat'; 

// ==============================================================================
// 2. 服务端逻辑
// ==============================================================================
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

    // 处理对话请求 (POST)
    if (req.method === 'POST') {
        let body = '';
        
        // 接收客户端 (Claude Code) 发来的数据
        req.on('data', chunk => body += chunk);
        
        req.on('end', async () => {
            try {
                const originalRequest = JSON.parse(body);
                
                // 打印日志：看看工具原本想要啥
                console.log(`🔌 拦截请求: ${originalRequest.model} -> 🚀 转发 SiliconFlow (${FORCE_MODEL})`);

                // 🛠️ 修改请求包：
                // 1. 强制开启流式传输 (防止 Vercel 超时)
                originalRequest.stream = true; 
                // 2. 偷梁换柱：把模型换成 Minimax 2.5
                originalRequest.model = FORCE_MODEL;

                // 📡 转发给 Vercel (伪装成 curl)
                const vercelResp = await fetch(VERCEL_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'User-Agent': 'curl/7.68.0' 
                    },
                    body: JSON.stringify(originalRequest)
                });

                // 🚨 处理 Vercel 或上游报错
                if (!vercelResp.ok) {
                    const errText = await vercelResp.text();
                    console.error(`❌ 上游报错 [${vercelResp.status}]:`, errText);
                    res.writeHead(vercelResp.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: errText }));
                    return;
                }

                // ✅ 建立流式管道 (Pipe)
                // 收到一个字，就立马转发给 Claude Code
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                });

                const reader = vercelResp.body.getReader();
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
        res.writeHead(404);
        res.end('Not Found');
    }
});

// ==============================================================================
// 3. 错误处理与启动
// ==============================================================================

// 防止端口占用导致程序崩溃
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('❌ 启动失败！！端口 3000 已经被占用了。');
        console.error('👉 请先关闭旧的代理窗口 (Ctrl+C)，或者运行 taskkill /F /IM node.exe');
    } else {
        console.error('❌ 未知错误:', e);
    }
});

// 启动监听
server.listen(3000, () => {
    console.log('-------------------------------------------');
    console.log('🚀 本地基站已启动！(端口: 3000)');
    console.log(`🤖 目标模型: ${FORCE_MODEL}`);
    console.log(`📡 远程通道: ${VERCEL_URL}`);
    console.log('-------------------------------------------');
});
