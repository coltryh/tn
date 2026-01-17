# 如果是 Windows PowerShell
$env:OPENAI_BASE_URL="https://api.ryhcolt.online/api/paas/v4"
# 注意：有些工具可能需要你写成 https://api.ryhcolt.online/v1，具体看你 Vercel 怎么部署的 LobeChat 或转发服务
# 如果是直接用的我给你的 proxy.js，那就是 http://127.0.0.1:3000/v1

# 关键：设置忽略 SSL 错误，因为 Zscaler 会劫持 HTTPS 证书
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"

# 再次运行你的程序
claudecode

