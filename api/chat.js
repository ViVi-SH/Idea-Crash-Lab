export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  if (!process.env.DIFY_API_KEY) return res.status(500).json({error: '服务器尚未配置 DIFY_API_KEY'});

  const {query, conversation_id = '', user = 'anonymous'} = req.body || {};
  if (typeof query !== 'string' || !query.trim()) return res.status(400).json({error: '请输入产品创意'});
  if (query.length > 8000) return res.status(400).json({error: '本次输入内容过长'});

  try {
    const upstream = await fetch(`${process.env.DIFY_API_URL || 'https://api.dify.ai/v1'}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {},
        query: query.trim(),
        response_mode: 'blocking',
        conversation_id,
        user
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(upstream.status).json({error: data.message || data.code || 'Dify 调用失败'});
    return res.status(200).json({answer: data.answer, conversation_id: data.conversation_id, message_id: data.message_id});
  } catch {
    return res.status(502).json({error: '无法连接 Dify 服务'});
  }
}
