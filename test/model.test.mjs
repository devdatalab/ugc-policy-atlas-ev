import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,clone,evaluate,annuity,normalize,comparisonScenario} from '../model.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<Math.max(1e-6,Math.abs(b)*1e-10),`${a} != ${b}`);

test('portfolio groups are disjoint and population-weighted',()=>{
  const r=evaluate(DEFAULTS);
  assert.equal(r.direct.count,5);assert.equal(r.open.count,1000);
  assert.equal(r.direct.population,90e6);assert.equal(r.open.population,1860e6);
  assert.equal(r.open.gdp,6982.5e9);
  close(r.direct.adoptions,.25);close(r.direct.implementations,.1375);
  close(r.open.adoptions,8.75);close(r.open.implementations,4.8125);
  close(r.direct.gross,90e6*5000*.00123*.25*.0275*annuity(5,10,5));
  close(r.open.gross,6982.5e9*.00123*.25*.0048125*annuity(8,10,5));
  close(r.net,r.direct.gross+r.open.gross-9000000-1e6);
});
test('zero causal influence yields no policy benefit or policy cost',()=>{
  const s=clone(DEFAULTS);s.direct.upliftPP=0;s.open.upliftPP=0;
  const r=evaluate(s);assert.equal(r.gross,0);assert.equal(r.policyCosts,0);assert.equal(r.net,-1e6);
});
test('implementation failure retains costs of induced adoption',()=>{
  const s=clone(DEFAULTS);s.implement=0;s.open.enabled=false;
  const r=evaluate(s);assert.equal(r.gross,0);close(r.policyCosts,250000);close(r.net,-1250000);
});
test('population scales benefit and exposure once, not adoption counts',()=>{
  const a=evaluate(DEFAULTS),s=clone(DEFAULTS);s.direct.populationM*=2;
  const b=evaluate(s);close(b.direct.gross,2*a.direct.gross);close(b.direct.exposedPopulation,2*a.direct.exposedPopulation);close(b.direct.adoptions,a.direct.adoptions);close(b.direct.costs,a.direct.costs);
});
test('turning off direct engagement does not add its cities to passive adoption',()=>{
  const s=clone(DEFAULTS);s.direct.enabled=false;const r=evaluate(s);
  assert.equal(r.direct.net,0);assert.equal(r.open.count,1000);close(r.open.net,evaluate(DEFAULTS).open.net);
});
test('timing and zero discounting use end-of-year flows',()=>{
  close(annuity(5,10,5),6.050181367549772);assert.equal(annuity(8,10,0),10);
  assert.ok(annuity(8,10,5)<annuity(5,10,5));
});
test('break-even uplift produces zero net expected value',()=>{
  const s=clone(DEFAULTS);s.open.enabled=false;const r=evaluate(s);
  s.direct.upliftPP=r.directBreakEvenPP;close(evaluate(s).net,0);
});
test('normalization prevents overlapping cities and invalid numeric state',()=>{
  const s=normalize({direct:{count:5},open:{count:10000,megaCount:9990,largeCount:9990},grantM:NaN,dataQuality:-3});
  assert.equal(s.open.megaCount+s.open.largeCount,9995);assert.equal(s.grantM,1);assert.equal(s.direct.dataQuality,0);assert.equal(s.open.dataQuality,0);
  const r=evaluate(s);assert.equal(r.open.rows.reduce((sum,row)=>sum+row.count,0)+r.direct.count,10000);
});
test('extra expected harms are subtracted once',()=>{
  const a=evaluate(DEFAULTS),s=clone(DEFAULTS);s.otherCostsM=3;
  close(evaluate(s).net,a.net-3e6);
});


test('default covers the 1000 largest remaining cities plus five engaged cities',()=>{
  const r=evaluate(DEFAULTS);
  assert.equal(r.direct.count,5);assert.equal(r.open.count,1000);assert.equal(r.state.policyCities,1005);
  assert.deepEqual(r.open.rows.map(row=>row.count),[25,170,805]);
});
test('expanding coverage adds smaller cities while direct engagement stays fixed',()=>{
  const s=clone(DEFAULTS);s.open.count=250;const a=evaluate(s),b=evaluate(DEFAULTS);
  assert.deepEqual(b.open.rows.map(row=>row.count),[25,170,805]);
  close(a.direct.net,b.direct.net);
  assert.ok(b.open.population/b.open.count<a.open.population/a.open.count);
  assert.ok(b.open.population>a.open.population);
});
test('coverage respects the UGC universe and keeps the groups disjoint',()=>{
  for (const count of [0,1,5,100,1000,10000,20000]) {
    const s=clone(DEFAULTS);s.open.count=count;const r=evaluate(s);
    assert.equal(r.direct.count+r.open.count,Math.min(count+5,10000));
    assert.ok(r.open.rows.every(row=>row.count>=0&&Number.isInteger(row.count)));
  }
  const s=clone(DEFAULTS);s.open.count=0;s.direct.count=0;
  assert.equal(evaluate(s).net,-1e6);
});
test('consideration is fixed at 100% even in saved scenarios',()=>{
  for(const reach of [0,10,100]) {
    const s=clone(DEFAULTS);s.open.reach=reach;const r=evaluate(s);
    assert.equal(r.state.open.reach,100);close(r.open.reached,r.open.qualified);
    close(r.open.adoptions,r.open.qualified*.025);
  }
});
test('legacy scenarios use the new ranked coverage default and preserve other inputs',()=>{
  const old=clone(DEFAULTS);old.version=2;old.policyCities=100;old.grantM=2;
  delete old.open.count;delete old.open.megaCount;delete old.open.largeCount;
  old.open.megaShare=2.5;old.open.largeShare=17.1;old.open.reach=10;
  const r=evaluate(old);assert.equal(r.state.version,7);assert.equal(r.state.policyCities,1005);
  assert.deepEqual(r.open.rows.map(row=>row.count),[25,170,805]);assert.equal(r.state.grantM,2);
  assert.equal(r.state.open.reach,100);
});
test('benefit size changes dollars without changing reform probabilities or costs',()=>{
  const a=evaluate(DEFAULTS),s=clone(DEFAULTS);s.open.retained=100;const b=evaluate(s);
  close(b.open.gross,4*a.open.gross);close(b.open.implementations,a.open.implementations);close(b.open.costs,a.open.costs);
});


test('full-scale scenario yields about five reforms with one shared implementation rate',()=>{
  const r=evaluate(DEFAULTS);close(r.implementations,4.95);
  assert.equal(DEFAULTS.direct.dataQuality,100);assert.equal(DEFAULTS.open.dataQuality,70);
  close(r.direct.implementations/r.direct.adoptions,.55);
  close(r.open.implementations/r.open.adoptions,.55);
  const s=comparisonScenario();assert.equal(s.open.dataQuality,80);
  assert.equal(s.open.count,250);close(evaluate(s).implementations,.625);
});
