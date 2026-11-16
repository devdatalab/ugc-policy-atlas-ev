export const UGC_CITIES = 10000;
export const DEFAULTS = {
  version: 7,
  grantM: 1,
  otherCostsM: 0,
  implement: 55,
  benchmarkPct: 0.123,
  discountPct: 5,
  duration: 10,
  direct: { enabled: true, dataQuality: 100, count: 5, populationM: 18, gdpPerPerson: 5000, eligible: 100, reach: 100, upliftPP: 5, retained: 25, delay: 5, policyCostM: 1 },
  open: { enabled: true, dataQuality: 70, count: 1000, eligible: 50, reach: 100, upliftPP: 2.5, retained: 25, delay: 8, policyCostM: 1,
    megaCount: 25, megaPopulationM: 15, megaGdp: 6000,
    largeCount: 170, largePopulationM: 4, largeGdp: 4000,
    otherPopulationM: 1, otherGdp: 2500 }
};

export const clone = value => JSON.parse(JSON.stringify(value));
export function scenarioPreset(name) {
  const s=clone(DEFAULTS);
  if(name==='pessimistic') {
    s.implement=35;
    Object.assign(s.direct,{upliftPP:2,retained:10,delay:7});
    Object.assign(s.open,{dataQuality:50,eligible:25,upliftPP:.5,retained:10,delay:10});
  } else if(name==='optimistic') {
    s.implement=75;
    Object.assign(s.direct,{upliftPP:8,retained:40,delay:3});
    Object.assign(s.open,{dataQuality:85,eligible:65,upliftPP:4,retained:40,delay:5});
  } else if(name!=='median') throw new Error('Unknown scenario');
  return s;
}
export function comparisonScenario() {
  const s=clone(DEFAULTS);
  s.open.count=250;s.open.eligible=20;
  s.implement=50;s.open.dataQuality=80;
  return s;
}
export function annuity(delay, duration, ratePct) {
  let value = 0;
  for (let t = delay + 1; t <= delay + duration; t++) value += (1 + ratePct / 100) ** -t;
  return value;
}

export function normalize(input = {}) {
  input = clone(input);
  for(const key of ['direct','open']) {
    input[key] ??= {};
    if(input[key].dataQuality===undefined && Number.isFinite(input.dataQuality)) input[key].dataQuality=input.dataQuality;
  }
  if(input.implement===undefined && Number.isFinite(input.direct.implement) && input.direct.implement===input.open.implement) input.implement=input.direct.implement;
  // Preserve old size estimates while switching to the ranked-city model.
  const legacyRemaining = Math.max(1, 1000 - (input.direct?.count ?? 5));
  for (const band of ['mega', 'large']) {
    if (input.open?.[band+'Count'] === undefined && Number.isFinite(input.open?.[band+'Share'])) {
      input.open[band+'Count'] = Math.round(input.open[band+'Share'] / 100 * legacyRemaining);
    }
  }
  const result = clone(DEFAULTS);
  const ranges = {
    grantM:[.1,20],otherCostsM:[0,100],implement:[0,100],benchmarkPct:[0,.5],discountPct:[0,20],duration:[1,30],
    'direct.dataQuality':[0,100],'direct.count':[0,25],'direct.populationM':[.1,50],'direct.gdpPerPerson':[100,50000],
    'direct.eligible':[0,100],'direct.reach':[0,100],'direct.upliftPP':[0,100],'direct.retained':[0,100],'direct.delay':[0,30],'direct.policyCostM':[0,100],
    'open.dataQuality':[0,100],'open.count':[0,UGC_CITIES],'open.eligible':[0,100],'open.upliftPP':[0,100],'open.retained':[0,100],'open.delay':[0,30],'open.policyCostM':[0,100],
    'open.megaCount':[0,UGC_CITIES],'open.megaPopulationM':[.1,50],'open.megaGdp':[100,50000],
    'open.largeCount':[0,UGC_CITIES],'open.largePopulationM':[.1,50],'open.largeGdp':[100,50000],
    'open.otherPopulationM':[.1,50],'open.otherGdp':[100,50000]
  };
  for (const [path,[min,max]] of Object.entries(ranges)) {
    const keys=path.split('.');
    const v=keys.length===1?input[keys[0]]:input[keys[0]]?.[keys[1]];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    let n=Math.max(min,Math.min(max,v));
    if (/count$/i.test(path)||['duration','direct.delay','open.delay'].includes(path)) n=Math.round(n);
    if(keys.length===1)result[keys[0]]=n; else result[keys[0]][keys[1]]=n;
  }
  for(const key of ['direct','open']) if(typeof input[key]?.enabled==='boolean') result[key].enabled=input[key].enabled;
  const remaining=UGC_CITIES-result.direct.count;
  result.open.count=Math.min(result.open.count,remaining);
  result.open.megaCount=Math.min(result.open.megaCount,remaining);
  result.open.largeCount=Math.min(result.open.largeCount,remaining-result.open.megaCount);
  result.policyCities=result.direct.count+result.open.count;
  // Consideration is fixed at 100%, including for older saved scenarios.
  result.open.reach=100;
  return result;
}

export function cityCounts(s) {
  const mega=Math.min(s.open.count,s.open.megaCount);
  const large=Math.min(s.open.count-mega,s.open.largeCount);
  return [mega,large,s.open.count-mega-large];
}

function channel(s, cfg, bands, name) {
  const factor=annuity(cfg.delay,s.duration,s.discountPct);
  const enabled=cfg.enabled?1:0;
  const qualifiedProbability=enabled*cfg.dataQuality/100*cfg.eligible/100;
  const useProbability=qualifiedProbability*cfg.reach/100;
  const adoptionProbability=useProbability*cfg.upliftPP/100;
  const implementationProbability=adoptionProbability*s.implement/100;
  const effect=s.benchmarkPct/100*cfg.retained/100;
  const rows=bands.map(b=>{
    const population=b.count*b.populationM*1e6;
    const gdp=population*b.gdpPerPerson;
    const annualIfReformed=gdp*effect;
    const gross=annualIfReformed*implementationProbability*factor;
    const adoptions=b.count*adoptionProbability;
    const costs=adoptions*cfg.policyCostM*1e6;
    return {...b,population,gdp,adoptions,implementations:b.count*implementationProbability,
      exposedPopulation:population*implementationProbability,annualIfReformed,
      annualExpected:annualIfReformed*implementationProbability,gross,costs,net:gross-costs};
  });
  const sum=key=>rows.reduce((a,b)=>a+b[key],0);
  const count=rows.reduce((a,b)=>a+b.count,0);
  return {name,enabled:cfg.enabled,rows,count,factor,qualified:count*qualifiedProbability,reached:count*useProbability,
    adoptionProbability,implementationProbability,adoptions:sum('adoptions'),implementations:sum('implementations'),
    population:sum('population'),gdp:sum('gdp'),exposedPopulation:sum('exposedPopulation'),
    annualExpected:sum('annualExpected'),annualPerReformedCity:count?sum('annualIfReformed')/count:0,
    gross:sum('gross'),costs:sum('costs'),net:sum('net')};
}

export function evaluate(input) {
  const s=normalize(input), o=s.open;
  const counts=cityCounts(s);
  const direct=channel(s,s.direct,[{label:'Engaged megacities',count:s.direct.count,populationM:s.direct.populationM,gdpPerPerson:s.direct.gdpPerPerson}],'Direct engagement');
  const open=channel(s,o,[
    {label:'Other megacities',count:counts[0],populationM:o.megaPopulationM,gdpPerPerson:o.megaGdp},
    {label:'Large cities',count:counts[1],populationM:o.largePopulationM,gdpPerPerson:o.largeGdp},
    {label:'Other cities',count:counts[2],populationM:o.otherPopulationM,gdpPerPerson:o.otherGdp}
  ],'Open platform');
  const gross=direct.gross+open.gross;
  const policyCosts=direct.costs+open.costs;
  const grant=s.grantM*1e6,otherCosts=s.otherCostsM*1e6;
  const beforeGrant=gross-policyCosts-otherCosts;
  const net=beforeGrant-grant;
  const breakEven=(key,other)=>{
    const scenario=clone(s);scenario[key].upliftPP=1;
    const cfg=scenario[key];
    const bands=(key==='direct'?direct:open).rows;
    const onePoint=channel(scenario,cfg,bands,key).net;
    const required=grant+otherCosts-other.net;
    return required<=0?0:(onePoint>0?required/onePoint:Infinity);
  };
  return {state:s,direct,open,gross,policyCosts,grant,otherCosts,beforeGrant,net,
    benefitMultiple:beforeGrant/grant,conventionalBCR:gross/(grant+policyCosts+otherCosts),
    implementations:direct.implementations+open.implementations,
    exposedPopulation:direct.exposedPopulation+open.exposedPopulation,
    directBreakEvenPP:breakEven('direct',open),openBreakEvenPP:breakEven('open',direct)};
}
