import {DEFAULTS,clone,evaluate} from './model.js?v=8';
const $=s=>document.querySelector(s), n=(v,d=2)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(v), money=v=>(v<0?'−':'')+'$'+n(Math.abs(v)/1e6,2)+'m';
const storageKey='ugc-atlas-distributional-v1';
const groups=[
  {name:'Bottom 40%',consumption:3473},{name:'Middle 40%',consumption:6265},{name:'Top 20%',consumption:13132}
];
const scenarios={neutral:[40,40,20],worker:[60,35,5],regressive:[25,45,30]};
let state={scenario:'worker',eta:1,benefitsM:null,policyCostsM:null};
try{Object.assign(state,JSON.parse(localStorage.getItem(storageKey)||'{}'))}catch{}
const control=(key,label,min,max,step,unit,help)=>`<div class="control"><div class="control-heading"><label for="range-${key}">${label}</label><span class="value-entry"><input id="number-${key}" type="number" min="${min}" max="${max}" step="${step}" data-key="${key}"><span>${unit}</span></span></div><input id="range-${key}" type="range" min="${min}" max="${max}" step="${step}" data-key="${key}"><p class="note">${help}</p></div>`;
$('#controls').innerHTML=control('eta','Inequality aversion (η)',0,2,.1,'','0 gives every dollar equal value; 1 is the central case; larger values place more weight on lower-consumption groups.')+control('benefitsM','Direct worker benefits',0,100,.1,'$m PV','Defaults to the direct-engagement gross present value in the expected-value model. Set a different value only for a transparent sensitivity test.')+control('policyCostsM','Direct policy costs',0,100,.1,'$m PV','Deducted dollar-for-dollar, without a distributional weight.');
let dashboardState=clone(DEFAULTS);
try{dashboardState=JSON.parse(localStorage.getItem('ugc-atlas-ev-v8')||JSON.stringify(DEFAULTS))}catch{}
const base=evaluate(dashboardState);
if(!Number.isFinite(state.benefitsM))state.benefitsM=base.direct.gross/1e6;
if(!Number.isFinite(state.policyCostsM))state.policyCostsM=base.direct.costs/1e6;
function render(){
  const shares=scenarios[state.scenario], median=6265, benefit=state.benefitsM*1e6;
  const weights=groups.map(g=>(median/g.consumption)**state.eta);
  const values=groups.map((g,i)=>benefit*shares[i]/100*weights[i]);
  const weighted=values.reduce((a,b)=>a+b,0), afterCosts=weighted-state.policyCostsM*1e6;
  $('#direct-benefit').textContent=money(benefit);$('#weighted-value').textContent=money(weighted);$('#weighted-multiple').textContent=n(weighted/benefit,2)+'× the unweighted value';$('#after-costs').textContent=money(afterCosts);
  $('#groups').innerHTML=groups.map((g,i)=>`<tr><th>${g.name}</th><td class="numeric">₹${n(g.consumption,0)}</td><td class="numeric">${n(shares[i],0)}%</td><td class="numeric">${n(weights[i],2)}×</td><td class="numeric">${money(values[i])}</td></tr>`).join('');
  document.querySelectorAll('[data-key]').forEach(el=>el.value=state[el.dataset.key]);
  document.querySelectorAll('[data-scenario]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.scenario===state.scenario)));
  try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{}
}
document.addEventListener('input',e=>{if(e.target.dataset.key){const v=Number(e.target.value);if(Number.isFinite(v)){state[e.target.dataset.key]=v;render()}}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-scenario]');if(b){state.scenario=b.dataset.scenario;render()}});
$('#use-dashboard').addEventListener('click',()=>{state.benefitsM=base.direct.gross/1e6;state.policyCostsM=base.direct.costs/1e6;render()});
render();
