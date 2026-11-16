import { UGC_CITIES, DEFAULTS, clone, normalize, evaluate, comparisonScenario } from './model.js';

const storageKey='ugc-atlas-ev-v7';
const $=s=>document.querySelector(s);
const n=(v,d=2)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(v);
const money=v=>(v<0?'−':'')+'$'+n(Math.abs(v)/1e6,2)+'m';
const people=v=>v>=1e6?n(v/1e6,2)+'m':n(v,0);
const pct=v=>n(v*100,4)+'%';
let state=clone(DEFAULTS);
let initialMessage='';
try {
  if(location.hash.startsWith('#s=')) state=normalize(JSON.parse(atob(decodeURIComponent(location.hash.slice(3)))));
  else {
    const saved=localStorage.getItem(storageKey);
    if(saved) state=normalize(JSON.parse(saved));
  }
} catch {initialMessage='Could not read the saved scenario. Showing defaults.';}

const defs={
  'grantM':['Atlas investment (upfront)',.1,5,.1,'$m','Build, validation, planned maintenance, and direct engagement.'],
  'implement':['Adopted reforms that deliver benefits',0,100,5,'%','Share of adopted reforms that produce benefits. Accounts for weak enforcement, incomplete implementation, or little response from builders and firms. Same rate for both channels.'],
  'direct.dataQuality':['Usable policy data',0,100,5,'%','Share of directly engaged cities with usable data after collection and validation.'],
  'open.dataQuality':['Usable policy data',0,100,5,'%','Share of the broader sample with usable data after collection and validation.'],
  'direct.count':['Cities with direct engagement',0,20,1,'cities','Excluded from the open-platform group.'],
  'direct.populationM':['Average city population',1,40,.5,'million','Assumed average for the selected Indian megacities.'],
  'direct.upliftPP':['Increase in adoption probability',0,20,.1,'pp','Among cities reached with a feasible reform and usable data. Five percentage points could mean 20% → 25%.'],
  'direct.retained':['Benefit size relative to benchmark',0,100,1,'%','Benefit per successful reform relative to the population- and GDP-scaled benchmark. 25% means one-quarter.'],
  'direct.gdpPerPerson':['GDP per resident',500,20000,500,'USD','Annual GDP per person in 2026 USD, at market exchange rates.'],
  'direct.eligible':['Cities with a feasible reform',0,100,5,'%','Requires binding restrictions and relevant transit. 100% assumes cities are screened in advance.'],
  'direct.reach':['Cities reached through engagement',0,100,5,'%','Share of eligible cities where the analysis reaches policymakers.'],
  'direct.delay':['Years before benefits begin',0,20,1,'years','A five-year delay means benefits start at the end of year six.'],
  'direct.policyCostM':['Cost per additional adoption',0,50,.5,'$m PV','Total present-value cost per additional adoption, including recurring costs and reforms that fail.'],
  'open.count':['Cities with policy documents',0,10000,1,'cities','Selected by population after excluding the direct-engagement cities.'],
  'open.eligible':['Cities with a feasible reform',0,100,1,'%','Share of cities with usable data that have binding restrictions and relevant transit.'],
  'open.upliftPP':['Increase in adoption probability',0,5,.1,'pp','Among cities with usable data and a feasible reform, the increase in adoption within five years caused by the Atlas.'],
  'open.retained':['Benefit size relative to benchmark',0,100,1,'%','Benefit per successful reform relative to the population- and GDP-scaled benchmark. 25% means one-quarter.'],
  'open.delay':['Years before benefits begin',0,25,1,'years','An eight-year delay means benefits start at the end of year nine.'],
  'open.policyCostM':['Cost per additional adoption',0,50,.5,'$m PV','Total present-value cost per additional adoption, including recurring costs and reforms that fail.'],
  'benchmarkPct':['Annual worker-benefit benchmark',0,.5,.001,'% GDP','Study estimate: 0.123% = 0.82 × 0.15% of city GDP.'],
  'duration':['Years of additional benefits',1,30,1,'years','Shorten if the same reform would happen later without the Atlas.'],
  'discountPct':['Annual discount rate',0,15,.5,'%','Real rate used to convert future benefits to present value.'],
  'otherCostsM':['Other expected costs or harms',0,50,.5,'$m PV','Expected present value of costs or harms omitted elsewhere.']
};
const get=(o,path)=>path.split('.').reduce((v,k)=>v[k],o);
const put=(o,path,v)=>{const keys=path.split('.');if(keys.length===1)o[keys[0]]=v;else o[keys[0]][keys[1]]=v;};
function controls(container,paths){
  const target=$(container);
  for(const path of paths){
    const [label,min,max,step,unit,help]=defs[path];
    const id=path.replaceAll('.','-');
    const el=document.createElement('div');el.className='control';
    const tooltip=`<span class="info-wrap"><button type="button" class="info-button" aria-label="About ${label}" aria-describedby="tip-${id}">i</button><span class="info-tooltip" id="tip-${id}" role="tooltip">${help}</span></span>`;
    el.innerHTML=`<div class="control-heading"><span class="control-label"><label for="range-${id}">${label}</label>${tooltip}</span><span class="value-entry"><input type="number" id="number-${id}" aria-label="${label}, ${unit}" min="${min}" max="${max}" step="${step}" data-path="${path}" data-kind="number" aria-describedby="tip-${id}"><span>${unit}</span></span></div><input type="range" id="range-${id}" min="${min}" max="${max}" step="${step}" data-path="${path}" data-kind="range" aria-describedby="tip-${id}">`;
    target.append(el);
  }
}
controls('#shared-controls',['grantM','implement']);
controls('#direct-controls',['direct.count','direct.dataQuality','direct.populationM','direct.upliftPP']);
controls('#direct-advanced',['direct.retained','direct.eligible','direct.reach','direct.gdpPerPerson','direct.delay','direct.policyCostM']);
controls('#open-controls',['open.count','open.dataQuality','open.eligible','open.upliftPP']);
controls('#open-advanced',['open.retained','open.delay','open.policyCostM']);
controls('#valuation-controls',['benchmarkPct','duration','discountPct','otherCostsM']);

function popInput(path,label,min,max,step){return `<input type="number" data-path="open.${path}" data-kind="population" aria-label="${label}" min="${min}" max="${max}" step="${step}">`;}
$('#population-inputs').innerHTML=`
<tr><th scope="row">Other megacities</th><td>${popInput('megaCount','Megacities available after direct engagement',0,10000,1)}</td><td id="mega-count" class="numeric"></td><td>${popInput('megaPopulationM','Population per other megacity, millions',.1,50,.1)}</td><td>${popInput('megaGdp','GDP per resident, other megacities',100,50000,100)}</td></tr>
<tr><th scope="row">Large cities</th><td>${popInput('largeCount','Large cities available after direct engagement',0,10000,1)}</td><td id="large-count" class="numeric"></td><td>${popInput('largePopulationM','Population per large city, millions',.1,50,.1)}</td><td>${popInput('largeGdp','GDP per resident, large cities',100,50000,100)}</td></tr>
<tr><th scope="row">Other cities</th><td id="other-available" class="numeric"></td><td id="other-count" class="numeric"></td><td>${popInput('otherPopulationM','Population per other city, millions',.1,50,.1)}</td><td>${popInput('otherGdp','GDP per resident, other cities',100,50000,100)}</td></tr>`;

function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{} }
function sync(){
  document.querySelectorAll('[data-path]').forEach(el=>{
    el.value=String(get(state,el.dataset.path));
    if(el.type==='range')el.setAttribute('aria-valuetext',n(get(state,el.dataset.path),3)+' '+defs[el.dataset.path][4]);
  });
  $('#direct-enabled').checked=state.direct.enabled;$('#open-enabled').checked=state.open.enabled;
}
function render(){
  const r=evaluate(state);state=r.state;
  const d=r.direct,o=r.open;
  $('#net').textContent=money(r.net);$('#net').classList.toggle('negative',r.net<0);
  $('#multiple').textContent=n(r.benefitMultiple,1)+'×';
  $('#implemented').textContent=n(r.implementations,2);
  $('header p').textContent=`UGC data: ${n(UGC_CITIES,0)} cities. Policy documents: ${n(state.policyCities,0)} cities.`;
  $('.channel.direct').classList.toggle('disabled',!state.direct.enabled);
  $('.channel.open').classList.toggle('disabled',!state.open.enabled);
  const maxContribution=Math.max(Math.abs(d.net),Math.abs(o.net),1);
  $('#contributions').innerHTML=[d,o].map((c,i)=>`<div class="contribution ${i?'open-bar':''}"><div class="contribution-top"><span>${c.name}</span><span>${money(c.net)} PV</span></div><div class="bar-track" aria-hidden="true"><div class="bar ${c.net<0?'negative-bar':''}" style="width:${Math.abs(c.net)/maxContribution*100}%"></div></div></div>`).join('');
  for(const [name,c] of [['direct',d],['open',o]])$('#'+name+'-summary').innerHTML=`<span><b>${n(c.count,0)}</b> cities · <b>${people(c.population)}</b> residents</span><span><b>${money(c.net)}</b> PV</span>`;
  ['mega','large','other'].forEach((band,i)=>$('#'+band+'-count').textContent=n(o.rows[i].count,0));
  $('#other-available').textContent=n(UGC_CITIES-state.direct.count-state.open.megaCount-state.open.largeCount,0);
  $('#population-total').textContent=`${people(o.population)} residents · ${n(o.population/Math.max(o.count,1)/1e6,2)}m per city on average.`;
  const rows=[
    ['Covered cities',n(d.count,0),n(o.count,0)],
    ['Covered population',people(d.population),people(o.population)],
    ['Cities with usable data and feasible reforms',n(d.qualified,2),n(o.qualified,2)],
    ['Of these, policymakers consider the Atlas',n(d.reached,2),n(o.reached,2)],
    ['Additional adoptions',n(d.adoptions,4),n(o.adoptions,4)],
    ['Expected number of additional successful reforms',n(d.implementations,4),n(o.implementations,4)],
    ['Chance of an additional implemented reform per city',pct(d.implementationProbability),pct(o.implementationProbability)],
    ['Expected residents in reform cities',people(d.exposedPopulation),people(o.exposedPopulation)]
  ];
  $('#funnel').innerHTML=rows.map(([label,a,b])=>`<tr><th scope="row">${label}</th><td class="numeric">${a}</td><td class="numeric">${b}</td></tr>`).join('');
  const audit=[
    ['Worker benefits (present value)',money(d.gross),money(o.gross),money(r.gross)],
    ['Extra policy costs',money(-d.costs),money(-o.costs),money(-r.policyCosts)],
    ['Other costs / harms','—','—',money(-r.otherCosts)],
    ['Benefits after policy costs',money(d.net),money(o.net),money(r.beforeGrant)],
    ['Atlas investment (counted once)','—','—',money(-r.grant)],
    ['Net expected benefit','—','—',money(r.net)]
  ];
  $('#audit').innerHTML=audit.map(([label,a,b,c],i)=>`<tr class="${i===5?'total-row':''}"><th scope="row">${label}</th><td class="numeric">${a}</td><td class="numeric">${b}</td><td class="numeric">${c}</td></tr>`).join('');
  const describe=(pp,enabled)=>!enabled?'channel disabled':pp===0?'0 pp — other channel covers costs':pp>100||!Number.isFinite(pp)?'not attainable':n(pp,3)+' percentage points';
  $('#break-even').textContent=`Break-even adoption increase: direct ${describe(r.directBreakEvenPP,state.direct.enabled)}; open ${describe(r.openBreakEvenPP,state.open.enabled)}. Benefit–cost ratio (all costs): ${n(r.conventionalBCR,2)}:1.`;
  sensitivity();
  coverageSensitivity();
  $('#annual-benefits').innerHTML=`<table><thead><tr><th>Annual flows</th><th class="numeric">Direct</th><th class="numeric">Open</th></tr></thead><tbody><tr><th>Expected annual benefit</th><td class="numeric">${money(d.annualExpected)}</td><td class="numeric">${money(o.annualExpected)}</td></tr><tr><th>Benefit years</th><td class="numeric">${state.direct.delay+1}–${state.direct.delay+state.duration}</td><td class="numeric">${state.open.delay+1}–${state.open.delay+state.duration}</td></tr></tbody></table><p class="note">Discount rate: ${n(state.discountPct)}% per year. Policy costs are total present-value allowances; the Atlas investment is upfront.</p>`;
  sync();
  return r;
}
function sensitivity(){
  const xs=[0,.1,.5,1,2,5],ys=[0,.5,1,2,5,10,20];
  $('#sensitivity').innerHTML='<caption class="sr-only">Net expected value in millions of dollars for additional adoption assumptions. Select a cell to apply its rates.</caption><thead><tr><th>Direct ↓ / Open →</th>'+xs.map(x=>'<th>'+n(x)+' pp</th>').join('')+'</tr></thead><tbody>'+ys.map(y=>'<tr><th>'+n(y)+' pp</th>'+xs.map(x=>{
    const s=clone(state);s.direct.upliftPP=y;s.open.upliftPP=x;const v=evaluate(s).net;
    const alpha=Math.min(.23,.04+Math.log1p(Math.abs(v)/1e6)*.045);
    const color=v>=0?`rgba(37,108,92,${alpha})`:`rgba(160,54,54,${alpha})`;
    return `<td><button class="${state.direct.upliftPP===y&&state.open.upliftPP===x?'current':''}" style="background:${color}" data-direct="${y}" data-open="${x}" aria-label="Direct ${y} percentage points, open ${x} percentage points: ${money(v)} net expected benefit">${money(v)}</button></td>`;
  }).join('')+'</tr>').join('')+'</tbody>';
}

function coverageSensitivity(){
  $('#coverage-comparison').innerHTML=[100,250,500,1000].map(count=>{
    const scenario=clone(state);scenario.open.count=count;const r=evaluate(scenario);
    return `<tr><th scope="row"><button data-coverage="${count}" aria-pressed="${state.open.count===count}">${n(count,0)} cities</button></th><td class="numeric">${n(r.state.policyCities,0)}</td><td class="numeric">${people(r.open.population)}</td><td class="numeric">${money(r.direct.net)}</td><td class="numeric">${money(r.open.net)}</td><td class="numeric">${money(r.net)}</td></tr>`;
  }).join('');
}
$('#coverage-comparison').addEventListener('click',event=>{
  const el=event.target.closest('[data-coverage]');if(!el)return;
  state.open.count=Number(el.dataset.coverage);render();persist();
});

function updateInput(el,commit=false){
  if(!el.matches('[data-path]'))return;
  if(el.value.trim()===''||!el.checkValidity()){
    if(commit){$('#status').textContent='Enter a value within the allowed range.';sync();}
    return;
  }
  const before=clone(state);put(state,el.dataset.path,Number(el.value));state=normalize(state);
  if(['open.megaCount','open.largeCount'].includes(el.dataset.path)){
    const proposed=Number(el.value)+(el.dataset.path==='open.megaCount'?before.open.largeCount:before.open.megaCount);
    if(proposed>UGC_CITIES-state.direct.count){state=before;$('#status').textContent='Available cities cannot exceed the remaining UGC cities.';sync();return;}
  }
  $('#status').textContent='';render();persist();
}
document.addEventListener('input',event=>updateInput(event.target));
document.addEventListener('change',event=>updateInput(event.target,true));
for(const key of ['direct','open'])$('#'+key+'-enabled').addEventListener('change',event=>{state[key].enabled=event.target.checked;render();persist();});
$('#sensitivity').addEventListener('click',event=>{
  const el=event.target.closest('[data-direct]');if(!el)return;
  state.direct.upliftPP=Number(el.dataset.direct);state.open.upliftPP=Number(el.dataset.open);render();persist();
});
function applyPreset(s){state=s;history.replaceState(null,'',location.pathname+location.search);render();persist();$('#status').textContent='Scenario applied.';}
$('#reset').addEventListener('click',()=>applyPreset(clone(DEFAULTS)));
$('#full-scale').addEventListener('click',()=>applyPreset(clone(DEFAULTS)));
$('#comparison').addEventListener('click',()=>applyPreset(comparisonScenario()));
$('#share').addEventListener('click',async()=>{
  const url=location.origin+location.pathname+'#s='+encodeURIComponent(btoa(JSON.stringify(state)));
  history.replaceState(null,'',url);
  try{await navigator.clipboard.writeText(url);$('#status').textContent='Scenario link copied.';}catch{$('#status').textContent='Scenario saved in the address bar. Copy the address to share these assumptions.';}
});
$('#download').addEventListener('click',()=>{
  const results=evaluate(state);
  const data={title:'UGC Policy Atlas expected value',modelVersion:7,createdAt:new Date().toISOString(),units:'Constant 2026 USD; probabilities in percent or percentage points as labeled',assumptions:state,results,sources:[...document.querySelectorAll('.evidence a')].map(a=>({title:a.textContent,url:a.href})),interpretation:'Results depend on the selected assumptions. Dollar benefits have not been converted to health or other welfare measures.'};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ugc-policy-atlas-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#status').textContent='Assumptions and calculated results exported.';
});
render();$('#status').textContent=initialMessage;
