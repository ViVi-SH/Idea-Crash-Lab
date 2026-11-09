const form = document.querySelector('#chatForm');
const input = document.querySelector('#query');
const send = document.querySelector('#send');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
let conversationId = sessionStorage.getItem('icl_conversation') || '';
const userId = localStorage.getItem('icl_user') || `web-${crypto.randomUUID()}`;
localStorage.setItem('icl_user', userId);

function addMessage(role, content = '') {
  welcome?.remove();
  const row = document.createElement('div');
  row.className = `message ${role}`;
  if (role === 'assistant') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = '✦';
    row.append(avatar);
  }
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  row.append(bubble);
  messages.append(row);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function setBusy(busy) {
  send.disabled = busy;
  input.disabled = busy;
}

async function ask(query) {
  addMessage('user', query);
  const answer = addMessage('assistant');
  answer.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  setBusy(true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({query, conversation_id: conversationId, user: userId})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '请求失败');
    answer.textContent = data.answer || '本轮没有返回文本结果，请重试。';
    if (data.conversation_id) {
      conversationId = data.conversation_id;
      sessionStorage.setItem('icl_conversation', conversationId);
    }
  } catch (error) {
    answer.textContent = error.message === 'Failed to fetch'
      ? '暂时无法连接服务。请确认网站已经部署，并已配置 DIFY_API_KEY。'
      : `出现了一点问题：${error.message}`;
  } finally {
    setBusy(false);
    input.focus();
    messages.scrollTop = messages.scrollHeight;
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query || send.disabled) return;
  input.value = '';
  input.style.height = 'auto';
  ask(query);
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 150)}px`;
});
document.querySelectorAll('.prompt').forEach(button => button.addEventListener('click', () => ask(button.textContent)));
document.querySelector('#reset').addEventListener('click', () => {
  conversationId = '';
  sessionStorage.removeItem('icl_conversation');
  messages.innerHTML = '<div class="welcome" id="welcome"><div class="welcome-mark">✦</div><h3>新的碰撞已经准备好</h3><p>告诉我你的下一个产品想法吧。</p></div>';
});
document.querySelector('#fullscreen').addEventListener('click', () => {
  const element = document.querySelector('#chat');
  document.fullscreenElement ? document.exitFullscreen?.() : element.requestFullscreen?.();
});
