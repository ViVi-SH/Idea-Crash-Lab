# Idea Crash Lab 网站

自定义前端通过服务端代理调用 Dify，API Key 不会进入浏览器。

## 部署到 Vercel

1. 将 `site` 目录上传到 GitHub 仓库。
2. 在 Vercel 导入仓库，并将 Root Directory 设为 `site`。
3. 在项目 Settings → Environment Variables 添加：
   - `DIFY_API_URL`：`https://api.dify.ai/v1`
   - `DIFY_API_KEY`：在 Dify 应用的“访问 API”页面创建的应用 API Key。
4. 重新部署。

不要把真实 API Key 写入 `.env.example`、网页源代码或 GitHub。
