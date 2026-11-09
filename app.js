const $ = selector => document.querySelector(selector);
const heroLead = document.querySelector('.hero-copy > p');
if (heroLead) heroLead.textContent = '好创意不怕被质疑。让不同的评审从不同立场审视你的想法，在观点碰撞中发现盲点，让每一次产品决策都更有依据。';
const stages = ['entry','guide','summary','confirm','review','report'];
const stepStages = ['entry','guide','summary','review','report'];
const store = {
  conversationId: sessionStorage.getItem('icl_conversation') || '',
  userId: localStorage.getItem('icl_user') || `web-${crypto.randomUUID()}`,
  rounds: Number(sessionStorage.getItem('icl_rounds') || 0),
  initialIdea: sessionStorage.getItem('icl_idea') || '',
  summary: sessionStorage.getItem('icl_summary') || '',
  report: sessionStorage.getItem('icl_report') || ''
};
localStorage.setItem('icl_user', store.userId);

function show(stage) {
  stages.forEach(name => $(`#screen-${name}`)?.classList.toggle('active', name === stage));
  const visibleStep = stage === 'confirm' ? 'summary' : stage;
  const current = stepStages.indexOf(visibleStep);
  document.querySelectorAll('.step').forEach((item,index) => {
    item.classList.toggle('active', index === current);
    item.classList.toggle('done', index < current);
  });
  $('#appShell').scrollIntoView({behavior:'smooth',block:'start'});
}

function clean(text='') {
  return text.replace(/<think>[\s\S]*?<\/think>/gi,'')
    .replace(/<!--[\s\S]*?dify-deepseek-reasoning[\s\S]*?-->/gi,'')
    .trim();
}

function escapeHtml(value='') {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function inlineMarkdown(value='') {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/__([^_]+)__/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>');
}

function renderMarkdown(source='') {
  const lines=clean(source).replace(/\r/g,'').split('\n');
  const html=[];
  let i=0;
  while(i<lines.length) {
    const line=lines[i].trim();
    if(!line){i++;continue;}
    if(line.includes('|') && i+1<lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i+1])) {
      const rows=[];
      const cells=value=>value.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim());
      const headers=cells(lines[i]); i+=2;
      while(i<lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(cells(lines[i])); i++; }
      html.push(`<div class="md-table-wrap"><table><thead><tr>${headers.map(cell=>`<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${headers.map((_,index)=>`<td>${inlineMarkdown(row[index]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const heading=line.match(/^(#{1,4})\s+(.+)$/);
    if(heading){const level=Math.min(heading[1].length+1,4);html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);i++;continue;}
    if(/^---+$/.test(line)){html.push('<hr>');i++;continue;}
    if(/^>\s?/.test(line)){html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/,''))}</blockquote>`);i++;continue;}
    if(/^[-*•]\s+/.test(line)) {
      const items=[]; while(i<lines.length && /^\s*[-*•]\s+/.test(lines[i])) {items.push(lines[i].replace(/^\s*[-*•]\s+/,''));i++;}
      html.push(`<ul>${items.map(item=>`<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);continue;
    }
    if(/^\d+[.、]\s+/.test(line)) {
      const items=[]; while(i<lines.length && /^\s*\d+[.、]\s+/.test(lines[i])) {items.push(lines[i].replace(/^\s*\d+[.、]\s+/,''));i++;}
      html.push(`<ol>${items.map(item=>`<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`);continue;
    }
    const paragraph=[line]; i++;
    while(i<lines.length && lines[i].trim() && !/^(#{1,4})\s|^[-*•]\s+|^\d+[.、]\s+|^>\s?|^---+$/.test(lines[i].trim()) && !(lines[i].includes('|') && i+1<lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i+1]))) {paragraph.push(lines[i].trim());i++;}
    html.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`);
  }
  return `<div class="md">${html.join('')}</div>`;
}

function setMarkdown(element,text) {
  element.innerHTML=renderMarkdown(text);
}

async function callDify(query, {fresh = false} = {}) {
  const response = await fetch('/api/chat', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({query,conversation_id:fresh ? '' : store.conversationId,user:store.userId})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  if (data.conversation_id) {
    store.conversationId = data.conversation_id;
    sessionStorage.setItem('icl_conversation',store.conversationId);
  }
  return clean(data.answer || '');
}

function addMessage(role,text,loading=false) {
  const row=document.createElement('div'); row.className=`msg ${role}`;
  const bubble=document.createElement('div'); bubble.className='bubble';
  if(loading) bubble.textContent='正在分析你的创意…';
  else if(role==='assistant') {bubble.classList.add('md');setMarkdown(bubble,text);}
  else bubble.textContent=text;
  if(loading) bubble.classList.add('loading');
  row.append(bubble); $('#messages').append(row); $('#messages').scrollTop=$('#messages').scrollHeight;
  return bubble;
}

function setBusy(busy) {
  $('#send').disabled=busy; $('#summarizeNow').disabled=busy; $('#query').disabled=busy;
}

function inferFacts(text) {
  const all = `${store.initialIdea}\n${text}`;
  const facts = {
    positioning: /系统|平台|工具|应用|产品/.test(all) ? all.split(/[。\n]/).find(x=>/系统|平台|工具|应用|产品/.test(x)) : '',
    users: all.match(/(?:面向|用户|员工|学生|行政人员|管理者)[^。\n]{0,45}/)?.[0] || '',
    problem: all.match(/(?:问题|痛点|目前|存在)[^。\n]{0,70}/)?.[0] || '',
    scenario: all.match(/(?:场景|当|需要|使用)[^。\n]{0,65}/)?.[0] || '',
    value: all.match(/(?:帮助|提升|减少|解决|价值)[^。\n]{0,65}/)?.[0] || '',
    solution: all.match(/(?:功能|方案|系统|实现)[^。\n]{0,75}/)?.[0] || ''
  };
  Object.entries(facts).forEach(([key,value])=>{if(value) $(`.fact[data-key="${key}"] span`).textContent=value.trim()});
  const count=Object.values(facts).filter(Boolean).length;
  $('#recognisedStatus').textContent=count>=5?'基本明确':count>=3?'梳理中':'信息不足';
}

async function sendGuide(query) {
  show('guide'); addMessage('user',query); const bubble=addMessage('assistant','',true); setBusy(true);
  try {
    const answer=await callDify(query); bubble.classList.remove('loading'); bubble.classList.add('md'); setMarkdown(bubble,answer);
    store.rounds=Math.min(store.rounds+1,3); sessionStorage.setItem('icl_rounds',store.rounds); $('#rounds').textContent=`追问 ${store.rounds} / 3`;
    inferFacts(answer);
    if(store.rounds>=3 || /信息完整|足以进入|可以进入.*评审|结构化需求摘要/.test(answer)) $('#summarizeNow').classList.add('btn-dark');
  } catch(error) { bubble.classList.remove('loading'); bubble.textContent=`请求失败：${error.message}`; }
  finally { setBusy(false); $('#query').focus(); }
}

function extractSection(text, patterns) {
  const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
  const index=lines.findIndex(line=>patterns.some(pattern=>pattern.test(line)));
  if(index<0) return '';
  const cleaned=lines[index].replace(/^#{1,4}\s*/,'').replace(/\*\*/g,'');
  const inline=cleaned.match(/^[^：:]{1,18}[：:]\s*(.+)$/)?.[1]?.trim();
  const collected=inline?[inline]:[];
  for(let i=index+1;i<lines.length;i++) {
    const next=lines[i].replace(/\*\*/g,'');
    if(/^#{1,4}\s|^\d+[.、]\s*|^(产品定位|目标用户|用户痛点|核心问题|使用场景|核心价值|核心需求|产品初步方案|初步功能|功能方向|待验证假设|尚未明确|下一步建议)[:：]/.test(next)) break;
    collected.push(next.replace(/^[-*•]\s*/,''));
    if(collected.join('\n').length>500) break;
  }
  return collected.join('\n');
}

function populateConfirm(summary) {
  $('#confirmUsers').value=extractSection(summary,[/目标用户/]) || $('.fact[data-key="users"] span').textContent.replace('待确认','');
  $('#confirmProblem').value=extractSection(summary,[/核心问题/,/用户痛点/]) || $('.fact[data-key="problem"] span').textContent.replace('待确认','');
  $('#confirmNeed').value=extractSection(summary,[/核心需求/,/核心价值/]) || $('.fact[data-key="value"] span').textContent.replace('待确认','');
  $('#confirmSolution').value=extractSection(summary,[/初步功能/,/产品初步方案/,/功能方向/]) || $('.fact[data-key="solution"] span').textContent.replace('待确认','');
  $('#confirmAssumptions').value=extractSection(summary,[/尚未明确/,/待验证假设/]);
}

async function makeSummary() {
  show('summary'); $('#summaryText').textContent='正在生成结构化需求摘要…';
  try {
    const answer=await callDify('【模式：需求摘要】现在结束提问。请只根据当前完整对话整理结构化需求摘要，必须清晰列出：产品定位、目标用户、用户痛点、使用场景、核心价值、核心需求、产品初步方案、待验证假设（每行一条）和下一步建议。只输出需求摘要，不执行任何后续分析，也不要输出风险报告。');
    store.summary=answer; sessionStorage.setItem('icl_summary',answer); setMarkdown($('#summaryText'),answer); populateConfirm(answer);
  } catch(error) { $('#summaryText').textContent=`摘要生成失败：${error.message}`; }
}

function confirmedRequirement() {
  return `目标用户：\n${$('#confirmUsers').value.trim()}\n\n用户痛点：\n${$('#confirmProblem').value.trim()}\n\n核心需求：\n${$('#confirmNeed').value.trim()}\n\n产品初步方案：\n${$('#confirmSolution').value.trim()}\n\n待验证假设：\n${$('#confirmAssumptions').value.trim()}`;
}

function roleExcerpt(report, role, nextRoles) {
  const escaped=role.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const next=nextRoles.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const pattern=new RegExp(`(?:#{1,4}\\s*)?(?:\\d+(?:\\.\\d+)?[.、]?\\s*)?${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n(?:#{1,4}\\s*)?(?:\\d+(?:\\.\\d+)?[.、]?\\s*)?(?:${next})|$)`,'i');
  return report.match(pattern)?.[1]?.trim().slice(0,1800) || '';
}

function displayRoles(report) {
  const pm=roleExcerpt(report,'产品经理',['模拟用户','真实用户','反方评审','观点碰撞','核心争议']);
  const user=roleExcerpt(report,'模拟用户',['真实用户','反方评审','观点碰撞','核心争议']) || roleExcerpt(report,'真实用户',['反方评审','观点碰撞','核心争议']);
  const critic=roleExcerpt(report,'反方评审',['观点碰撞','核心争议','潜在问题','风险评估']);
  const invalid=value=>!value || value.length<80 || /未收到|未提供|材料缺失|无具体产品|评审材料.*未提供/.test(value);
  $('#rolePm').classList.remove('loading'); setMarkdown($('#rolePm'),pm || '未能从结果中识别产品经理的独立评审。');
  $('#roleUser').classList.remove('loading'); setMarkdown($('#roleUser'),user || '未能从结果中识别模拟用户的独立评审。');
  $('#roleCritic').classList.remove('loading'); setMarkdown($('#roleCritic'),critic || '未能从结果中识别反方评审官的独立评审。');
  if([pm,user,critic].some(invalid)) {
    $('#reviewStatus').textContent='检测到角色评审未正确读取已确认需求。请检查 Dify 三个角色节点的用户消息是否引用了 sys.query；本次结果不会生成报告。';
    $('#generateReport').classList.add('hidden');
    return false;
  }
  $('#reviewStatus').textContent='三角色评审与交叉讨论已完成，可以生成压力测试报告了。'; $('#generateReport').classList.remove('hidden'); return true;
}

async function runReview() {
  show('review'); $('#generateReport').classList.add('hidden'); $('#retryReview')?.classList.add('hidden'); $('#reviewStatus').textContent='三角色评审与交叉讨论正在进行，请稍候。';
  ['#rolePm','#roleUser','#roleCritic'].forEach((id,i)=>{$(id).classList.add('loading');$(id).textContent=['正在检查产品逻辑与 MVP 边界…','正在模拟使用场景与放弃原因…','正在寻找关键假设与失败路径…'][i]});
  const requirement=confirmedRequirement();
  const prompt=`开始评审\n\n【已确认需求材料】\n${requirement}\n\n以上材料是本次评审唯一依据。请运行产品经理、模拟用户、反方评审官的独立评审和交叉讨论，并生成完整压力测试报告。三个角色必须引用材料中的具体用户、痛点、场景和方案，不得输出通用模板，也不得声称没有收到材料。报告必须明确包含“产品经理评审”“模拟用户评审”“反方评审”三个独立标题，以及核心争议、风险、改进建议、MVP 功能建议和最终结论。不要输出内部思考过程。`;
  try { store.report=await callDify(prompt,{fresh:true}); sessionStorage.setItem('icl_report',store.report); displayRoles(store.report); }
  catch(error) {
    $('#reviewStatus').textContent=`评审暂时中断：${error.message}`;
    let retry=$('#retryReview');
    if(!retry){retry=document.createElement('button');retry.id='retryReview';retry.className='btn';retry.textContent='重新尝试评审';retry.addEventListener('click',runReview);$('#generateReport').before(retry);}
    retry.classList.remove('hidden');
  }
}

function resetAll() {
  ['icl_conversation','icl_rounds','icl_idea','icl_summary','icl_report'].forEach(key=>sessionStorage.removeItem(key));
  Object.assign(store,{conversationId:'',rounds:0,initialIdea:'',summary:'',report:''});
  $('#messages').innerHTML=''; $('#productName').value=''; $('#ideaDescription').value=''; $('#rounds').textContent='追问 0 / 3';
  document.querySelectorAll('.fact span').forEach(x=>x.textContent='待确认'); $('#recognisedStatus').textContent='等待开始'; show('entry');
}

$('#ideaForm').addEventListener('submit',event=>{event.preventDefault();const name=$('#productName').value.trim();const desc=$('#ideaDescription').value.trim();store.initialIdea=`${name?`产品名称：${name}\n`:''}产品创意：${desc}`;sessionStorage.setItem('icl_idea',store.initialIdea);$('#messages').innerHTML='';sendGuide(store.initialIdea)});
$('#chatForm').addEventListener('submit',event=>{event.preventDefault();const value=$('#query').value.trim();if(!value||$('#send').disabled)return;$('#query').value='';sendGuide(value)});
$('#skipQuestion').addEventListener('click',()=>sendGuide('跳过这个问题。请基于现有信息继续判断；如果信息已经足够，请提示可以生成结构化需求摘要。'));
$('#summarizeNow').addEventListener('click',makeSummary);
$('#backToGuide').addEventListener('click',()=>show('guide'));
$('#enterConfirm').addEventListener('click',()=>{populateConfirm(store.summary);show('confirm')});
$('#editGuide').addEventListener('click',()=>show('guide'));
$('#startReview').addEventListener('click',runReview);
$('#generateReport').addEventListener('click',()=>{setMarkdown($('#reportText'),store.report);show('report')});
$('#rerunReview').addEventListener('click',runReview);
$('#downloadReport').addEventListener('click',async event=>{event.target.disabled=true;event.target.textContent='正在生成 Word…';try{const response=await fetch('/api/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Idea Crash Lab 产品创意压力测试报告',report:store.report,requirement:confirmedRequirement()})});if(!response.ok)throw new Error((await response.json()).error||'生成失败');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Idea-Crash-Lab-压力测试报告-${new Date().toISOString().slice(0,10)}.docx`;a.click();URL.revokeObjectURL(url)}catch(error){alert(error.message)}finally{event.target.disabled=false;event.target.textContent='保存 / 打印报告'}});
$('#restartGuide').addEventListener('click',resetAll);$('#resetTop').addEventListener('click',resetAll);$('#fullscreen').addEventListener('click',()=>document.fullscreenElement?document.exitFullscreen():$('#appShell').requestFullscreen());
if(store.report){displayRoles(store.report);show('review')}else if(store.summary){setMarkdown($('#summaryText'),store.summary);populateConfirm(store.summary);show('summary')}
