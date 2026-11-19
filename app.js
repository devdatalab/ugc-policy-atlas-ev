import { UGC_CITIES, DEFAULTS, clone, normalize, evaluate, scenarioPreset } from './model.js?v=13';

const storageKey='ugc-atlas-ev-v8';
const $=s=>document.querySelector(s);
const n=(v,d=2)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(v);
const money=v=>(v<0?'−':'')+'$'+n(Math.abs(v)/1e6,2)+'m';
const people=v=>v>=1e6?n(v/1e6,2)+'m':n(v,0);
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
  'implement':['Additional adoptions that deliver benefits',0,100,5,'%','Share of Atlas-attributable additional adoptions that produce benefits. “Additional” means beyond what would have happened without the Atlas. Accounts for weak enforcement, incomplete implementation, or little response from builders and firms. Same rate for both channels.'],
  'direct.dataQuality':['Usable policy data',0,100,5,'%','Share of directly engaged cities with usable data after collection and validation.'],
  'open.dataQuality':['Usable policy data',0,100,5,'%','Share of targeted cities with usable policy data.'],
  'direct.count':['Cities with direct engagement',0,20,1,'cities','Excluded from the open-platform group.'],
  'direct.populationM':['Average city population',1,40,.5,'million','Assumed average for the selected Indian megacities.'],
  'direct.upliftPP':['Increase in adoption probability',0,20,.1,'pp','Among cities reached with a feasible reform and usable data. Five percentage points could mean 20% → 25%.'],
  'direct.retained':['Benefit size relative to benchmark',0,100,1,'%','Benefit per successful reform relative to the population- and GDP-scaled benchmark. 25% means one-quarter.'],
  'direct.gdpPerPerson':['GDP per resident',500,20000,500,'USD','Annual GDP per person in 2026 USD, at market exchange rates.'],
  'direct.eligible':['Cities with a feasible reform',0,100,5,'%','Requires binding restrictions and relevant transit. 100% assumes cities are screened in advance.'],
  'direct.reach':['Cities reached through engagement',0,100,5,'%','Share of eligible cities where the analysis reaches policymakers.'],
  'direct.delay':['Years before benefits begin',0,20,1,'years','A five-year delay means benefits start at the end of year six.'],
  'direct.policyCostM':['Cost per additional adoption',0,50,.5,'$m PV','Total present-value cost per additional adoption, including recurring costs and reforms that fail.'],
  'open.count':['Cities targeted for inclusion in the platform',0,10000,1,'cities','Selected by population after excluding the direct-engagement cities.'],
  'open.eligible':['Cities with a feasible reform',0,100,1,'%','Share of cities with usable data that have binding restrictions and relevant transit.'],
  'open.relativeToDirect':['Platform uptake relative to direct',0,100,1,'%','The platform adoption effect as a share of the direct-engagement effect. 10% means a 0.5 percentage-point increase when direct engagement is 5 percentage points.'],
  'open.retained':['Benefit size relative to benchmark',0,100,1,'%','Benefit per successful reform relative to the population- and GDP-scaled benchmark. 25% means one-quarter.'],
  'open.delay':['Years before benefits begin',0,25,1,'years','An eight-year delay means benefits start at the end of year nine.'],
  'open.policyCostM':['Cost per additional adoption',0,50,.5,'$m PV','Total present-value cost per additional adoption, including recurring costs and reforms that fail.'],
  'benchmarkPct':['Annual worker-benefit benchmark',0,.5,.001,'% GDP','Study estimate: 0.123% = 0.82 × 0.15% of city GDP.'],
  'duration':['Years of additional benefits',1,30,1,'years','Shorten if the same reform would happen later without the Atlas.'],
  'discountPct':['Annual discount rate',0,15,.5,'%','Real rate used to convert future benefits to present value.'],
  'otherCostsM':['Other expected costs or harms',0,50,.5,'$m PV','Expected present value of costs or harms omitted elsewhere.']
};
const get=(o,path)=>path.split('.').reduce((v,k)=>v[k],o);
const presetNames=['pessimistic','median','optimistic'];
const presets=Object.fromEntries(presetNames.map(name=>[name,normalize(scenarioPreset(name))]));
const scenarioRows=[
  ['Usable policy data · platform','open.dataQuality','%'],
  ['Feasible reform · platform','open.eligible','%'],
  ['Adoption increase · direct','direct.upliftPP',' pp'],
  ['Platform uptake · share of direct','open.relativeToDirect','%'],
  ['Additional adoptions that deliver benefits','implement','%'],
  ['Benefit size relative to benchmark · both channels','direct.retained','%'],
  ['Delay before benefits · direct','direct.delay',' years'],
  ['Delay before benefits · platform','open.delay',' years']
];
$('#scenario-assumptions').innerHTML=scenarioRows.map(([label,path,unit])=>`<tr><th scope="row">${label}</th>${presetNames.map(name=>`<td class="numeric">${n(get(presets[name],path))}${unit}</td>`).join('')}</tr>`).join('');
$('.scenario-controls').addEventListener('click',event=>{
  const button=event.target.closest('[data-scenario]');if(!button)return;
  state=clone(presets[button.dataset.scenario]);$('#status').textContent='';render();persist();
});
const put=(o,path,v)=>{const keys=path.split('.');if(keys.length===1)o[keys[0]]=v;else o[keys[0]][keys[1]]=v;};
function controls(container,paths){
  const target=$(container);
  for(const path of paths){
    const [label,min,max,step,unit,help]=defs[path];
    const id=path.replaceAll('.','-');
    const el=document.createElement('div');el.className='control';
    const tooltip=path==='grantM'?'':`<span class="info-wrap"><button type="button" class="info-button" aria-label="About ${label}" aria-describedby="tip-${id}">i</button><span class="info-tooltip" id="tip-${id}" role="tooltip">${help}</span></span>`;
    const description=path==='grantM'?'':`aria-describedby="tip-${id}"`;
    el.innerHTML=`<div class="control-heading"><span class="control-label"><label for="range-${id}">${label}</label>${tooltip}</span><span class="value-entry"><input type="number" id="number-${id}" aria-label="${label}, ${unit}" min="${min}" max="${max}" step="${step}" data-path="${path}" data-kind="number" ${description}><span>${unit}</span></span></div><input type="range" id="range-${id}" min="${min}" max="${max}" step="${step}" data-path="${path}" data-kind="range" ${description}>`;
    target.append(el);
  }
}
controls('#shared-controls',['grantM','implement']);
controls('#direct-controls',['direct.count','direct.dataQuality','direct.populationM','direct.upliftPP']);
controls('#direct-advanced',['direct.retained','direct.eligible','direct.reach','direct.gdpPerPerson','direct.delay','direct.policyCostM']);
controls('#open-controls',['open.count','open.dataQuality','open.eligible','open.relativeToDirect']);
controls('#open-advanced',['open.retained','open.delay','open.policyCostM']);
controls('#valuation-controls',['benchmarkPct','duration','discountPct','otherCostsM']);
$('#range-direct-upliftPP').closest('.control').insertAdjacentHTML('beforeend','<p class="derived-probability" id="direct-benefit-chance" tabindex="-1"></p>');
$('#range-open-relativeToDirect').closest('.control').insertAdjacentHTML('beforeend','<p class="derived-probability" id="open-benefit-chance" tabindex="-1"></p>');

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
}
function render(){
  state.direct.enabled=true;state.open.enabled=true;
  const r=evaluate(state);state=r.state;
  const matched=presetNames.find(name=>JSON.stringify(state)===JSON.stringify(presets[name]));
  document.querySelectorAll('[data-scenario]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scenario===matched)));
  $('#custom-scenario').hidden=Boolean(matched);
  const d=r.direct,o=r.open;
  $('#net').textContent=money(r.net);$('#net').classList.toggle('negative',r.net<0);
  $('#multiple').textContent=n(r.benefitMultiple,1)+'×';
  $('#implemented').textContent=n(r.implementations,2);
  const additionalAdoptions=r.direct.adoptions+r.open.adoptions;
  const benefitChance=cfg=>`${n(cfg.upliftPP,2)} pp adoption × ${n(state.implement,0)}% delivering benefits = ${n(cfg.upliftPP*state.implement/100,2)} pp chance of benefit`;
  $('#direct-benefit-chance').textContent=benefitChance(state.direct);
  $('#open-benefit-chance').textContent=benefitChance(state.open);
  $('#implemented-calculation').innerHTML=`<span class="adoption-equation">Direct: ${n(state.direct.count,0)} × ${n(state.direct.dataQuality,0)}% × ${n(state.direct.eligible,0)}% × ${n(state.direct.upliftPP,2)} pp = <button type="button" class="calculation-link" data-jump="range-direct-upliftPP" aria-label="Direct ${n(r.direct.adoptions,2)} additional adoptions. Go to the direct adoption-effect slider.">${n(r.direct.adoptions,2)}</button></span><span class="adoption-equation">Open: ${n(state.open.count,0)} × ${n(state.open.dataQuality,0)}% × ${n(state.open.eligible,0)}% × ${n(state.open.upliftPP,2)} pp = <button type="button" class="calculation-link" data-jump="range-open-relativeToDirect" aria-label="Open ${n(r.open.adoptions,2)} additional adoptions. Go to the platform uptake slider.">${n(r.open.adoptions,2)}</button></span><span class="adoption-total">${n(additionalAdoptions,2)} additional adoptions × ${n(state.implement,0)}% = ${n(r.implementations,2)} delivering benefits</span>`;
  const annualPotential=channel=>channel.rows.reduce((total,row)=>total+row.annualIfReformed,0);
  const link=(text,target,label)=>`<button type="button" class="calculation-link" data-jump="${target}" aria-label="${label}">${text}</button>`;
  const benefitEquation=(label,channel,deliveryTarget)=>`<span>${label}: ${link(`${money(annualPotential(channel))} annual potential`,'range-benchmarkPct',`Go to the annual worker-benefit benchmark.`)} × ${link(`${n(channel.implementationProbability*100,2)} pp chance of benefit`,deliveryTarget,`Go to the ${label.toLowerCase()} adoption and delivery calculation.`)} × ${link(`discounted future benefits (${n(channel.factor,2)})`,'range-discountPct','Go to discounting controls.')} = <strong>${money(channel.gross)} <span class="definition-tooltip" tabindex="0">worker benefits<span role="tooltip">“Worker benefits” is the model’s name for the estimated economic gain to workers from a successful transit-and-land-use reform—primarily better access to jobs and the resulting productivity / earnings-related gains.</span></span></strong></span><span>${label} after policy costs: ${money(channel.gross)} − ${money(channel.costs)} = ${money(channel.net)}</span>`;
  const afterPolicyCosts=d.net+o.net;
  const otherCostsLine=r.otherCosts!==0?` − ${money(r.otherCosts)} other costs`:'';
  $('#multiple-calculation').innerHTML=`${benefitEquation('Direct',d,'direct-benefit-chance')}${benefitEquation('Open',o,'open-benefit-chance')}<span class="calculation-total">${money(d.net)} + ${money(o.net)} = ${money(afterPolicyCosts)} benefits after policy costs</span><span class="calculation-total">${money(afterPolicyCosts)}${otherCostsLine} − ${money(r.grant)} Atlas investment = ${money(r.net)} net expected benefit</span>`;
  $('#net-calculation').innerHTML=`<span>Worker benefits: ${money(d.gross)} + ${money(o.gross)} = ${money(r.gross)}</span><span>Less policy costs: ${money(-r.policyCosts)}</span>${r.otherCosts!==0?`<span>Less other costs: ${money(-r.otherCosts)}</span>`:''}<span>Less Atlas investment: ${money(-r.grant)}</span><strong>${money(r.net)} net expected benefit</strong>`;
  const maxContribution=Math.max(Math.abs(d.net),Math.abs(o.net),1);
  for(const [name,c] of [['direct',d],['open',o]]) {
    $('#'+name+'-summary').innerHTML=`<p class="channel-value"><b>${money(c.net)}</b> total estimated present value</p><div class="bar-track" aria-hidden="true"><div class="bar ${c.net<0?'negative-bar':''}" style="width:${Math.abs(c.net)/maxContribution*100}%"></div></div><div class="channel-population">${n(c.count,0)} cities · ${people(c.population)} residents</div>`;
  }
  $('#open-relative').innerHTML=`<span>Open-platform adoption probability</span><strong>${n(state.open.relativeToDirect,0)}% of direct DDL-led engagement</strong><small>${n(state.open.upliftPP,2)} pp, compared with ${n(state.direct.upliftPP,2)} pp</small>`;
  ['mega','large','other'].forEach((band,i)=>$('#'+band+'-count').textContent=n(o.rows[i].count,0));
  $('#other-available').textContent=n(UGC_CITIES-state.direct.count-state.open.megaCount-state.open.largeCount,0);
  $('#population-total').textContent=`${people(o.population)} residents · ${n(o.population/Math.max(o.count,1)/1e6,2)}m per city on average.`;
  const audit=[
    ['Worker benefits (present value)',money(d.gross),money(o.gross),money(r.gross)],
    ['Expected policy implementation costs',money(-d.costs),money(-o.costs),money(-r.policyCosts)],
    ...(r.otherCosts!==0?[['Other costs / harms','—','—',money(-r.otherCosts)]]:[]),
    ['Benefits after policy costs',money(d.net),money(o.net),money(r.beforeGrant)],
    ['Atlas investment (counted once)','—','—',money(-r.grant)],
    ['Net expected benefit','—','—',money(r.net)]
  ];
  $('#audit').innerHTML=audit.map(([label,a,b,c],i)=>`<tr class="${i===audit.length-1?'total-row':''}"><th scope="row">${label}</th><td class="numeric">${a}</td><td class="numeric">${b}</td><td class="numeric">${c}</td></tr>`).join('');
  sensitivity();
  coverageSensitivity();
  $('#annual-benefits').innerHTML=`<table><thead><tr><th>Annual flows</th><th class="numeric">Direct</th><th class="numeric">Open</th></tr></thead><tbody><tr><th>Expected annual benefit</th><td class="numeric">${money(d.annualExpected)}</td><td class="numeric">${money(o.annualExpected)}</td></tr><tr><th>Benefit years</th><td class="numeric">${state.direct.delay+1}–${state.direct.delay+state.duration}</td><td class="numeric">${state.open.delay+1}–${state.open.delay+state.duration}</td></tr></tbody></table><p class="note">Discount rate: ${n(state.discountPct)}% per year. Policy costs are total present-value allowances; the Atlas investment is upfront.</p>`;
  sync();
  return r;
}
function sensitivity(){
  const xs=[1,5,10,25,50,100],ys=[.5,1,2,5,10,20];
  $('#sensitivity').innerHTML='<caption class="sr-only">Net expected value in millions of dollars by direct-engagement adoption effect and platform uptake as a share of it. Select a cell to apply.</caption><thead><tr><th>Direct ↓ / Platform →</th>'+xs.map(x=>'<th>'+n(x)+'%</th>').join('')+'</tr></thead><tbody>'+ys.map(y=>'<tr><th>'+n(y)+' pp</th>'+xs.map(x=>{
    const s=clone(state);s.direct.upliftPP=y;s.open.relativeToDirect=x;const v=evaluate(s).net;
    const alpha=Math.min(.23,.04+Math.log1p(Math.abs(v)/1e6)*.045);
    const color=v>=0?`rgba(37,108,92,${alpha})`:`rgba(160,54,54,${alpha})`;
    return `<td><button class="${state.direct.upliftPP===y&&state.open.relativeToDirect===x?'current':''}" style="background:${color}" data-direct="${y}" data-relative="${x}" aria-label="Direct ${y} percentage points, platform at ${x} percent of direct: ${money(v)} net expected benefit">${money(v)}</button></td>`;
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
$('#sensitivity').addEventListener('click',event=>{
  const el=event.target.closest('[data-direct]');if(!el)return;
  state.direct.upliftPP=Number(el.dataset.direct);state.open.relativeToDirect=Number(el.dataset.relative);render();persist();
});
document.addEventListener('click',event=>{
  const link=event.target.closest('[data-jump]');if(!link)return;
  const control=document.getElementById(link.dataset.jump);if(!control)return;
  control.closest('details')?.setAttribute('open','');
  const card=control.closest('.control');
  control.scrollIntoView({behavior:'smooth',block:'center'});
  control.focus({preventScroll:true});
  card?.classList.remove('source-highlight');
  requestAnimationFrame(()=>card?.classList.add('source-highlight'));
  setTimeout(()=>card?.classList.remove('source-highlight'),1800);
});
render();$('#status').textContent=initialMessage;
