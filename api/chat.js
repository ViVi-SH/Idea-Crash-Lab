const TRANSIENT_ERROR = /ChunkedEncodingError|Response ended prematurely|ProtocolError|connection|timeout|timed out|temporarily unavailable|rate.?limit/i;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function publicError(message = '') {
  if (TRANSIENT_ERROR.test(message)) return '模型服务的连接在生成过程中临时中断，请重新尝试本次操作。';
  if (/quota|balance|insufficient/i.test(message)) return '模型服务额度不足，请检查 Dify 中的模型账户。';
  const requestId = message.match(/req_id[:：]\s*([\w-]+)/i)?.[1];
  const errorType = message.match(/(?:error_type|type)["']?\s*[:=]\s*["']?([\w-]+)/i)?.[1];
  if (requestId || errorType) return `Dify 工作流执行失败${errorType ? `（${errorType}）` : ''}${requestId ? `，请求编号：${requestId}` : ''}。请在 Dify 日志中定位该运行记录。`;
  return message && message.length < 240 ? message : 'Dify 工作流执行失败，请在 Dify 日志中查看对应运行记录。';
}

function extractError(data, fallback = '') {
  if (typeof data === 'string') return data;
  return String(data?.message || data?.error?.message || data?.error || data?.detail || data?.code || fallback || 'Dify 调用失败');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  if (!process.env.DIFY_API_KEY) return res.status(500).json({error: '服务器尚未配置 DIFY_API_KEY'});

  const {query, conversation_id = '', user = 'anonymous'} = req.body || {};
  if (typeof query !== 'string' || !query.trim()) return res.status(400).json({error: '请输入产品创意'});
  if (query.length > 12000) return res.status(400).json({error: '本次输入内容过长'});

  let lastMessage = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
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
    if (!upstream.ok) {
      lastMessage = extractError(data, `Dify 调用失败（HTTP ${upstream.status}）`);
      console.error('Dify upstream error', {status: upstream.status, message: lastMessage.slice(0, 1200)});
      if (attempt === 0 && TRANSIENT_ERROR.test(lastMessage)) { await wait(1400); continue; }
      return res.status(TRANSIENT_ERROR.test(lastMessage) ? 503 : upstream.status).json({error: publicError(lastMessage), retryable: TRANSIENT_ERROR.test(lastMessage)});
    }
    const answer = String(data.answer || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/<!--[\s\S]*?dify-deepseek-reasoning[\s\S]*?-->/gi, '')
      .trim();
    return res.status(200).json({answer, conversation_id: data.conversation_id, message_id: data.message_id});
   } catch (error) {
    lastMessage = String(error?.message || error);
    if (attempt === 0) { await wait(1400); continue; }
   }
  }
  return res.status(503).json({error: publicError(lastMessage), retryable: true});
}
