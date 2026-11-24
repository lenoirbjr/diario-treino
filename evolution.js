/* Diário Treino — independent stats; no writes and no dependency on app state. */
(function expose(global) {
 'use strict';
 const LOADED=new Set(['kg','kg/lado','kg/halter','placas','kg assistência']);
 const MS_DAY=86400000, WEEK_COUNT=8;
 const fmt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6});
 const groupCollator=new Intl.Collator('pt-BR',{sensitivity:'base',numeric:true});
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tidy=x=>typeof x==='string'?x.trim().replace(/\s+/g,' '):'';
 const normalize=x=>tidy(x).normalize('NFC').toLocaleLowerCase('pt-BR');
 const asUTC=d=>Date.parse(d+'T00:00:00Z');
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(asUTC(d))&&new Date(asUTC(d)).toISOString().slice(0,10)===d;
 const localDate=()=>{const d=new Date(),p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;};
 const shift=(d,n)=>new Date(asUTC(d)+n*MS_DAY).toISOString().slice(0,10);
 const monday=date=>shift(date,-((new Date(asUTC(date)).getUTCDay()+6)%7));
 const shortDate=d=>d.slice(8,10)+'/'+d.slice(5,7);
 const fullDate=d=>shortDate(d)+'/'+d.slice(0,4);
 const labelFor=p=>tidy(p?.name)||'Ficha';
 function isPerformed(session){
  return Boolean(session?.cardio?.done===true||session?.ex?.some?.(entry=>entry?.sets?.some?.(set=>set?.done===true)));
 }
 function daysText(days){
  if(days===0)return 'Hoje';
  return days===1?'1 dia':`${fmt.format(days)} dias`;
 }
 function weeksEndingAt(today){const cur=monday(today);return Array.from({length:WEEK_COUNT},(_,i)=>shift(cur,(i-WEEK_COUNT+1)*7));}
 function collect(plans,history,today=localDate()){
  const now=validDate(today)?today:localDate(),weeks=weeksEndingAt(now);
  const stats=plans.map((p,i)=>({i,title:labelFor(p),dates:new Set()}));
  const series=new Map();
  for(const [key,s] of Object.entries(history||{})){
   const m=/^(\d{4}-\d{2}-\d{2})\|(\d+)$/.exec(key);
   if(!m||!validDate(m[1])||m[1]>now||!isPerformed(s))continue;
   const date=m[1], i=Number(m[2]), plan=plans[i];
   if(!plan||!Array.isArray(plan.ex))continue;
   stats[i].dates.add(date);
   const week=monday(date);
   for(let slot=0;slot<plan.ex.length;slot++){
    const item=s.ex?.[slot],def=plan.ex[slot];
    if(!item||item.custom===true||!Array.isArray(def)||def[3]==='s'||!LOADED.has(item.unit))continue;
    const actual=tidy(item.nameOverride)||tidy(def[0]);
    if(!actual)continue;
    const used=(item.sets||[]).filter(t=>t?.done===true&&typeof t.load==='number'&&Number.isFinite(t.load)&&t.load>=0).map(t=>t.load);
    if(!used.length)continue;
    const id=JSON.stringify([i,slot,normalize(actual),item.unit]);
    if(!series.has(id))series.set(id,{id,i,slot,name:actual,unit:item.unit,title:labelFor(plan),measurements:new Map(),latest:date});
    const group=series.get(id);
    if(date>group.latest){group.latest=date;group.name=actual;}
    if(week<weeks[0])continue;
    const prev=group.measurements.get(week),value=Math.max(...used);
    group.measurements.set(week,{value:Math.max(value,prev?.value??0),sets:used.length+(prev?.sets??0)});
   }
  }
  return {
   now,weeks,
   stats:stats.map(s=>{
    const dates=[...s.dates].sort();
    const first=dates[0]||null,last=dates.at(-1)||null;
    return {i:s.i,title:s.title,count:dates.length,first,last,days:first?Math.round((asUTC(now)-asUTC(first))/MS_DAY):null};
   }),
   series:[...series.values()].sort((a,b)=>b.latest.localeCompare(a.latest)||groupCollator.compare(a.name,b.name)||a.i-b.i||a.slot-b.slot||groupCollator.compare(a.unit,b.unit))
  };
 }
 const unitText=unit=>unit==='kg assistência'?'kg de assistência':unit;
 function interval(week,now){const end=shift(week,6),endLabel=end>now?now:end;return shortDate(week)+'–'+shortDate(endLabel);}
 function delta(current,previous,unit){
  if(!current||!previous)return 'Sem comparação: falta carga registrada nesta semana ou na anterior.';
  const d=current.value-previous.value;
  if(d===0)return `Sem variação vs. semana anterior (${fmt.format(current.value)} ${unitText(unit)}).`;
  return `${d>0?'+':'−'}${fmt.format(Math.abs(d))} ${unitText(unit)} vs. semana anterior.`;
 }
 function graphic(weeks,entries){
  const height=102,base=88,max=Math.max(0,...entries.map(v=>v?.value??0));
  const graph=entries.map((v,i)=>v?{x:18+i*46,y:base-(max===0?0:v.value/max*73)}:null);
  let lines='',dots='';
  for(let i=0;i<graph.length;i++){
   const p=graph[i],a=graph[i-1];if(!p)continue;
   if(a)lines+=`<line x1="${a.x}" y1="${a.y.toFixed(3)}" x2="${p.x}" y2="${p.y.toFixed(3)}"/>`;
   dots+=`<circle cx="${p.x}" cy="${p.y.toFixed(3)}" r="4"/>`;
  }
  const grid=weeks.map((_,i)=>`M${18+i*46} 9V88`).join(' ');
  return `<svg class="evo-svg" viewBox="0 0 358 ${height}" focusable="false" aria-hidden="true"><path class="evo-grid-lines" d="M18 88H340 ${grid}"/><g class="evo-plot-lines">${lines}</g><g class="evo-plot-dots">${dots}</g></svg>`;
 }
 function trendHTML(model,seriesId){
  const option=model.series.find(x=>x.id===seriesId);
  if(!option)return '<p class="evo-empty note">Nenhuma carga de série concluída foi registrada ainda. Depois de salvar um treino com carga, a evolução aparece aqui.</p>';
  const values=model.weeks.map(week=>option.measurements.get(week)||null),unit=unitText(option.unit);
  return `<p class="evo-delta">${esc(delta(values.at(-1),values.at(-2),option.unit))}</p>${option.unit==='kg assistência'?'<p class="note evo-assistance">Aqui o valor é o peso de assistência registrado. Um número maior não significa mais força.</p>':''}
   ${values.some(x=>x!==null)?graphic(model.weeks,values):'<p class="evo-empty note">Sem carga registrada para esta variação nas últimas 8 semanas.</p>'}
   <ul class="evo-weeks" aria-label="Máximo de carga por semana">${model.weeks.map((week,i)=>{
    const value=values[i],latest=i===model.weeks.length-1;
    return `<li><span><time datetime="${week}">${interval(week,model.now)}</time>${latest?'<small>Semana atual</small>':''}</span><strong class="${value?'':'evo-gap'}">${value?`${fmt.format(value.value)} ${esc(unit)}`:'Sem registro'}</strong></li>`;
   }).join('')}</ul>`;
 }
 let chosen=null;
 function renderEvolution(plans,history,today){
  const model=collect(plans,history,today);
  if(!model.series.some(x=>x.id===chosen))chosen=model.series[0]?.id??null;
  return `<div class="evolution" data-evolution><div class="evo-intro"><span class="eyebrow">ACOMPANHAMENTO</span><h1 class="history-intro">Evolução</h1><p class="note">Veja há quanto tempo você treina cada ficha e acompanhe as cargas que registrou.</p></div>
   <section aria-labelledby="evo-workouts"><h2 id="evo-workouts">Tempo na ficha</h2><div class="evo-workouts">${model.stats.map(s=>`<article class="card evo-workout"><h3>${esc(s.title)}</h3><p class="evo-time">${s.days===null?'—':daysText(s.days)}</p><p class="note evo-count">${s.count===1?'1 sessão feita':`${fmt.format(s.count)} sessões feitas`}</p>${s.first?`<p class="note evo-first">Desde <time datetime="${s.first}">${fullDate(s.first)}</time></p>`:'<p class="note evo-first">Nenhuma sessão feita salva</p>'}</article>`).join('')}</div>
   <p class="note evo-footnote">O tempo conta desde a primeira sessão salva com pelo menos uma série ou um aeróbico marcado como feito.</p></section>
   <section class="card evo-load" aria-labelledby="evo-load-title"><h2 id="evo-load-title">Carga por semana</h2><p class="note">Maior carga registrada em uma série concluída de segunda a domingo. Compara só a mesma ficha, exercício e unidade. Exercícios substitutos aparecem separados.</p>
   ${model.series.length?`<label class="evo-field" for="evo-select">Exercício e unidade</label><select id="evo-select" data-evolution-series>${model.series.map(x=>`<option value="${esc(x.id)}"${x.id===chosen?' selected':''}>${esc(x.name)} · ${esc(x.title)} · ${esc(unitText(x.unit))}</option>`).join('')}</select>`:''}
   <div data-evolution-trend>${trendHTML(model,chosen)}</div><p class="evo-sr" data-evolution-announcer role="status" aria-live="polite"></p></section></div>`;
 }
 function handleEvolutionChange(event,plans,history,today){
  const target=event.target;
  if(!target?.matches?.('[data-evolution-series]'))return false;
  const host=target.closest('[data-evolution]'),region=host?.querySelector('[data-evolution-trend]');
  if(!region)return false;
  const model=collect(plans,history,today),id=target.value;
  if(!model.series.some(x=>x.id===id))return true;
  chosen=id;region.innerHTML=trendHTML(model,id);
  const label=host.querySelector('[data-evolution-announcer]');
  if(label){const item=model.series.find(x=>x.id===id);label.textContent=`Evolução atualizada para ${item.name}, em ${unitText(item.unit)}.`;}
  return true;
 }
 global.TreinoEvolution=Object.freeze({renderEvolution,handleEvolutionChange,collect});
 global.renderEvolution=renderEvolution;
})(globalThis);
