'use strict';
const plans=[
 {day:'SEG',label:'Segunda',name:'Superior A',focus:'Peito e costas',cardio:'Esteira inclinada ou bicicleta',ex:[
 ['Supino inclinado com halteres',3,'6–10'],['Remada baixa com triângulo',3,'8–12'],['Puxada alta na frente',2,'8–12'],['Elevação lateral com halteres',2,'10–15'],['Tríceps na polia',2,'10–15'],['Rosca direta ou alternada',2,'10–15']]},
 {day:'TER',label:'Terça',name:'Inferior A',focus:'Quadríceps e glúteos',cardio:'Caminhada ou bicicleta leve',ex:[
 ['Agachamento no Smith ou livre',3,'6–10'],['Leg press 45°',3,'10–12'],['Cadeira extensora',2,'10–15'],['Mesa ou cadeira flexora',2,'10–15'],['Panturrilha em pé ou sentado',3,'10–15'],['Prancha abdominal',2,'30–45','s']]},
 {day:'QUI',label:'Quinta',name:'Superior B',focus:'Costas, peito e ombros',cardio:'Elíptico ou esteira',ex:[
 ['Barra fixa assistida ou puxada alta',3,'6–10'],['Supino reto com barra ou halteres',3,'6–10'],['Remada articulada ou unilateral',2,'8–12'],['Desenvolvimento com halteres',2,'8–12'],['Elevação lateral com halteres',2,'12–15'],['Rosca inclinada',2,'10–12'],['Tríceps acima da cabeça na polia',2,'10–12']]},
 {day:'SEX',label:'Sexta',name:'Inferior B',focus:'Posterior e glúteos',cardio:'Bicicleta ou caminhada leve',ex:[
 ['Levantamento terra romeno (stiff)',3,'8–10'],['Afundo reverso ou búlgaro',2,'8–10','/ perna'],['Cadeira flexora',3,'10–12'],['Hip thrust ou elevação pélvica',3,'8–12'],['Cadeira abdutora',2,'12–15'],['Abdominal na polia ou crunch',2,'10–15']]}
];
const KEY='diario-treino.v1', $=s=>document.querySelector(s);
const units=['kg','kg/lado','kg/halter','placas','sem carga','kg assistência'];
const initial=()=>({theme:'auto',drafts:{},history:{}});
let state=initial(), storageProblem=false;
const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let day=({1:0,2:1,4:2,5:3})[new Date().getDay()]??0,date=localDate(),view='workout';
const opened=new Set();
const key=()=>date+'|'+day;
const safeDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const keyOk=k=>/^\d{4}-\d{2}-\d{2}\|[0-3]$/.test(k)&&safeDate(k.slice(0,10));
const number=(v,max,whole=false)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max&&(!whole||Number.isInteger(v));
function parse(data){
 if(!data||!['auto','light','dark'].includes(data.theme))throw Error('Tema inválido');
 const out={theme:data.theme,drafts:{},history:{}};
 for(const cat of ['drafts','history']){
  if(!data[cat]||typeof data[cat]!=='object'||Array.isArray(data[cat]))throw Error('Registros inválidos');
  for(const [k,s] of Object.entries(data[cat])){
   if(!keyOk(k)||!s||!Array.isArray(s.ex)||s.ex.length!==plans[Number(k.at(-1))].ex.length||!s.cardio||typeof s.cardio.done!=='boolean'||!(s.cardio.minutes===null||number(s.cardio.minutes,600,true)))throw Error('Sessão inválida');
   const ex=s.ex.map(e=>{
    if(!e||!units.includes(e.unit)||!Array.isArray(e.sets)||!e.sets.length||e.sets.length>20)throw Error('Exercício inválido');
    return {unit:e.unit,sets:e.sets.map(t=>{
     if(!t||typeof t.done!=='boolean'||!(t.reps===null||number(t.reps,3600,true))||!(t.load===null||number(t.load,3000)))throw Error('Série inválida');
     return {done:t.done,reps:t.reps,load:t.load};
    })};
   });
   out[cat][k]={ex,cardio:{done:s.cardio.done,minutes:s.cardio.minutes}};
  }
 }
 return out;
}
function copy(v){return JSON.parse(JSON.stringify(v))}
function makeSession(){
 const last=Object.keys(state.history).filter(k=>k.endsWith('|'+day)&&k.slice(0,10)<date).sort().at(-1);
 if(last){const s=copy(state.history[last]);s.ex.forEach(e=>e.sets.forEach(t=>t.done=false));s.cardio.done=false;return s;}
 return {ex:plans[day].ex.map(([,n,range,unit])=>({unit:unit==='s'?'sem carga':'kg',sets:Array.from({length:n},()=>({reps:null,load:null,done:false}))})),cardio:{done:false,minutes:null}};
}
function current(){return state.drafts[key()]??state.history[key()]??makeSession()}
function edit(fn){const s=state.drafts[key()]??copy(current());fn(s);state.drafts[key()]=s;persist()}
function say(t){$('#status').textContent=t}
function persist(){try{if(storageProblem)return false;localStorage.setItem(KEY,JSON.stringify(state));return true}catch{say('Não foi possível salvar neste aparelho. Exporte um backup antes de sair.');return false}}
function theme(){if(state.theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=state.theme;$('#theme').textContent=({auto:'Automático',light:'Claro',dark:'Escuro'})[state.theme];$('#theme').setAttribute('aria-label','Tema: '+$('#theme').textContent+'. Alterar tema')}
function inputVal(v){return v??''}
const readable=d=>d.slice(0,10).split('-').reverse().join('/');
function counts(s){const all=s.ex.flatMap(e=>e.sets);return [all.filter(t=>t.done).length,all.length]}
function updateProgress(s){const [done,total]=counts(s);$('#progressText').textContent=done+' / '+total+' séries';$('#bar').style.width=(done/total*100)+'%';$('#meter').setAttribute('aria-valuenow',Math.round(done/total*100))}
function render(){
 $('#workoutTab').setAttribute('aria-pressed',String(view==='workout'));$('#historyTab').setAttribute('aria-pressed',String(view==='history'));
 if(storageProblem){say('Não consegui carregar os dados salvos. Use um backup na aba Histórico antes de registrar novos dados.')}
 if(view==='history'){history();return}
 const p=plans[day],s=current();
 $('#panel').innerHTML=`<section class="hero"><span class="eyebrow">Ficha · ${p.label}</span><h1>${p.name}</h1><p>${p.focus}</p><div class="progress-row"><div class="progress" id="meter" role="progressbar" aria-label="Progresso das séries" aria-valuemin="0" aria-valuemax="100"><div id="bar"></div></div><strong id="progressText"></strong></div></section>
 <nav class="days" aria-label="Ficha do treino">${plans.map((p,i)=>`<button data-day="${i}" aria-pressed="${i===day}" aria-label="${p.label}">${p.day}</button>`).join('')}</nav>
 <div class="card date"><label>Data da sessão <input id="date" type="date" value="${date}"></label></div>
 <div class="cards">${p.ex.map(([name,n,range,q],i)=>{const e=s.ex[i],d=e.sets.filter(t=>t.done).length;return `<details class="card history-item ${d===e.sets.length?'done':''}" data-ex="${i}" ${opened.has(i)?'open':''}><summary>${name}<span class="sub">Meta: ${n} × ${range}${q?' '+q:''} · <span id="done-${i}">${d}/${e.sets.length} feitas</span></span></summary>
 ${q==='s'?'':`<div class="tools"><label class="field">Unidade da carga <select data-unit="${i}">${units.map(u=>`<option ${u===e.unit?'selected':''}>${u}</option>`).join('')}</select></label></div>`}
 ${e.sets.map((t,j)=>`<div class="set" data-i="${i}" data-j="${j}"><span class="sub">${j+1}ª</span><label>${q==='s'?'Segundos':'Reps'+(q?' / perna':'')}<input data-val="reps" type="number" inputmode="numeric" min="0" max="3600" step="1" value="${inputVal(t.reps)}"></label><label>${e.unit==='sem carga'?'Sem carga':'Carga'}<input data-val="load" type="text" inputmode="decimal" value="${inputVal(t.load)}" ${e.unit==='sem carga'?'disabled':''}></label><button data-check aria-pressed="${t.done}" aria-label="Série ${j+1} concluída">✓</button></div>`).join('')}
 <div class="tools"><button data-add="${i}" ${e.sets.length>=20?'disabled':''}>+ Série</button><button data-minus="${i}" ${e.sets.length<=1?'disabled':''}>− Última</button></div></details>`}).join('')}</div>
 <section class="card"><div class="row"><div><h2>Aeróbico ao final</h2><span class="sub">Meta: 10–15 min · ${p.cardio}</span></div><button id="cardioDone" aria-pressed="${s.cardio.done}" aria-label="Aeróbico concluído">✓</button></div><div class="tools"><label class="field">Minutos feitos <input id="minutes" type="number" inputmode="numeric" min="0" max="600" value="${inputVal(s.cardio.minutes)}"></label></div></section>
 <div class="action"><button id="save" class="primary full">${state.history[key()]?'Atualizar registro':'Salvar sessão no histórico'}</button><p class="note">Os ajustes ficam salvos como rascunho. Marque as séries concluídas e salve a sessão quando terminar.</p></div>`;
 updateProgress(s);
 for(const d of document.querySelectorAll('details[data-ex]'))d.addEventListener('toggle',()=>{if(d.open)opened.add(+d.dataset.ex);else opened.delete(+d.dataset.ex)});
}
function history(){
 const items=Object.entries(state.history).sort(([a],[b])=>b.localeCompare(a));
 $('#panel').innerHTML=`<h1 class="history-intro">Histórico</h1><p class="note">Acompanhe séries, repetições e cargas salvas. As próximas sessões da mesma ficha puxam os valores do último treino anterior.</p><div class="cards">${items.length?items.map(([k,s])=>{const p=plans[+k.at(-1)], [done,total]=counts(s);return `<details class="card history-item"><summary>${p.name}<span class="sub">${readable(k)} · ${done}/${total} séries feitas</span></summary><ul>${p.ex.map(([n,,,q],i)=>`<li><strong>${n}</strong><br><span class="note">${s.ex[i].sets.map(t=>`${t.done?'✓':'○'} ${t.reps===null?'sem registro':t.reps+(q?' '+q:' reps')}${t.load===null||s.ex[i].unit==='sem carga'?'':' · '+t.load.toLocaleString('pt-BR')+' '+s.ex[i].unit}`).join(' | ')}</span></li>`).join('')}</ul><p class="note">Aeróbico: ${s.cardio.done?'feito':'não marcado'}${s.cardio.minutes===null?'':' · '+s.cardio.minutes+' min'}</p><button data-load="${k}">Abrir sessão</button></details>`}).join(''):'<div class="card">Nenhum treino salvo ainda.</div>'}</div><section class="card"><div class="row"><h2>Seus dados</h2></div><p class="note">O backup inclui sessões, rascunhos e tema. A importação substitui os dados deste aparelho.</p><div class="tools"><button id="export">Exportar backup</button><button id="import">Importar backup</button><input hidden id="file" type="file" accept=".json,application/json"></div></section>`;
}
function value(raw,max,whole){if(raw.trim()==='')return null;const n=Number(raw.trim().replace(',','.'));return number(n,max,whole)?n:undefined}
$('#panel').addEventListener('input',e=>{
 const t=e.target, row=t.closest('.set');
 if(t.matches('[data-val]')&&row){
  const r=t.dataset.val==='reps',v=value(t.value,r?3600:3000,r);
  t.setCustomValidity(v===undefined?'Digite um valor válido.':'');
  if(v!==undefined)edit(s=>s.ex[+row.dataset.i].sets[+row.dataset.j][t.dataset.val]=v);
 }else if(t.id==='minutes'){const v=value(t.value,600,true);t.setCustomValidity(v===undefined?'Digite minutos entre 0 e 600.':'');if(v!==undefined)edit(s=>s.cardio.minutes=v)}
});
$('#panel').addEventListener('change',async e=>{
 const t=e.target;
 if(t.id==='date'&&safeDate(t.value)){date=t.value;render()}
 if(t.matches('[data-unit]')&&units.includes(t.value)){edit(s=>s.ex[+t.dataset.unit].unit=t.value);render()}
 if(t.id==='file'&&t.files[0]){
  try{
   if(t.files[0].size>15000000)throw Error('Limite');
   const json=JSON.parse(await t.files[0].text());
   if(json.app!=='diario-treino'||json.version!==1)throw Error('Formato');
   const next=parse(json.data);
   if(!confirm('Substituir os registros deste aparelho pelo conteúdo do backup?'))return;
   const old=state,problem=storageProblem;state=next;storageProblem=false;
   if(!persist()){state=old;storageProblem=problem;return}
   theme();render();say('Backup restaurado.');
  }catch{say('Não consegui ler esse backup do Diário Treino. Nenhum dado foi substituído.')}
  finally{t.value=''}
 }
});
$('#panel').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.matches('[data-day]')){day=+b.dataset.day;opened.clear();render();return}
 if(b.matches('[data-check]')){const row=b.closest('.set'),i=+row.dataset.i,j=+row.dataset.j;edit(s=>s.ex[i].sets[j].done=!s.ex[i].sets[j].done);const s=current(),ex=s.ex[i],d=ex.sets.filter(t=>t.done).length;b.setAttribute('aria-pressed',String(ex.sets[j].done));$('#done-'+i).textContent=d+'/'+ex.sets.length+' feitas';b.closest('details').classList.toggle('done',d===ex.sets.length);updateProgress(s);return}
 if(b.matches('[data-add],[data-minus]')){const j=+(b.dataset.add??b.dataset.minus);const last=current().ex[j].sets.at(-1);if(b.hasAttribute('data-minus')&&(last.done||last.load!==null||last.reps!==null)&&!confirm('Remover a última série e seus valores?'))return;edit(s=>{const a=s.ex[j].sets;if(b.hasAttribute('data-add'))a.push({reps:last.reps,load:last.load,done:false});else a.pop()});render();return}
 if(b.id==='cardioDone'){edit(s=>s.cardio.done=!s.cardio.done);b.setAttribute('aria-pressed',String(current().cardio.done))}
 if(b.id==='save'){const invalid=$('#panel input:invalid');if(invalid){invalid.closest('details')?.setAttribute('open','');invalid.reportValidity();return}const s=copy(current());if(!counts(s)[0]&&!s.cardio.done&&!confirm('Salvar a sessão sem marcar nenhuma atividade como feita?'))return;const k=key(),prev=state.history[k],draft=state.drafts[k];state.history[k]=s;delete state.drafts[k];if(persist()){render();say('Sessão salva no histórico.')}else{if(prev)state.history[k]=prev;else delete state.history[k];if(draft)state.drafts[k]=draft;say('Não consegui salvar. Confira o armazenamento ou importe um backup válido.')}return}
 if(b.matches('[data-load]')){const k=b.dataset.load;day=+k.at(-1);date=k.slice(0,10);view='workout';opened.clear();render();return}
 if(b.id==='import')$('#file').click();
 if(b.id==='export'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify({app:'diario-treino',version:1,data:state},null,2)],{type:'application/json'}));a.href=url;a.download='diario-treino-'+localDate()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
});
$('#workoutTab').onclick=()=>{view='workout';say('');render()};$('#historyTab').onclick=()=>{view='history';say('');render()};
$('#theme').onclick=()=>{state.theme=({auto:'light',light:'dark',dark:'auto'})[state.theme];theme();persist()};
try{const raw=localStorage.getItem(KEY);if(raw)state=parse(JSON.parse(raw));}catch{storageProblem=true}
theme();render();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
