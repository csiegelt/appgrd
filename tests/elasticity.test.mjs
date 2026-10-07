import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context=vm.createContext({structuredClone});
for(const file of ['economia-modelos.js','economia-elasticidad.js'])vm.runInContext(readFileSync(new URL('../js/'+file,import.meta.url),'utf8'),context);
const M=vm.runInContext('EconomiaModelos',context),UI=vm.runInContext('EconomiaElasticidad',context);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('demand revenue rectangles match the supplied 4-to-5 examples and reverse direction',()=>{
  for(const [q2,elasticity,revenue] of [[90,-9/19,450],[70,-27/17,350],[80,-1,400],[100,0,500]]){
    const v={p1:4,p2:5,q1:100,q2},r=M.elasticity(v);
    close(r.e,elasticity);close(r.revenue1,400);close(r.revenue2,revenue);
    close(r.priceEffect,q2);close(r.quantityEffect,4*(q2-100));
    close(r.priceEffect+r.quantityEffect,revenue-400);
    const reverse=M.elasticity({p1:5,p2:4,q1:q2,q2:100});
    close(reverse.e,r.e);close(reverse.revenueChange,-r.revenueChange);
    close(reverse.priceEffect,-r.priceEffect);close(reverse.quantityEffect,-r.quantityEffect);
    close(reverse.priceEffect+reverse.quantityEffect,reverse.revenueChange);
  }
});
test('all five supply cases have correct midpoint elasticities; null is distinct from infinity',()=>{
  for(const [q2,e,kind] of [[100,0,'Perfectamente inelástica'],[110,3/7,'Inelástica'],[125,1,'Unitaria'],[200,3,'Elástica']]){
    const r=M.elasticity({p1:4,p2:5,q1:100,q2});close(r.e,e);assert.equal(r.kind,kind);
  }
  assert.equal(M.elasticity({p1:4,p2:4,q1:100,q2:140}).kind,'Perfectamente elástica');
  for(const v of [{p1:4,p2:4,q1:100,q2:100},{p1:0,p2:0,q1:100,q2:140},{p1:4,p2:5,q1:0,q2:0}])assert.equal(M.elasticity(v).e,null);
  close(M.elasticity({p1:7,p2:6,q1:0,q2:2}).e,-13);
  for(const bad of [null,-1,NaN,Infinity,'4'])assert.throws(()=>M.elasticity({p1:bad,p2:5,q1:100,q2:90}));
});
test('linear demand reproduces the reference table and separates arc, point and exact maximum revenue',()=>{
  const r=M.linearElasticity({intercept:7,quantity:14,segments:7,segment:3});
  assert.deepEqual(Array.from(r.rows,x=>x.revenue),[0,12,20,24,24,20,12,0]);
  for(const [i,expected] of [13,11/3,9/5,1,5/9,3/11,1/13].entries())close(r.rows[i].arc.magnitude,expected);
  close(r.selected.e,-1);close(r.maximumRevenue,24.5);close(r.unit.q,7);close(r.unit.p,3.5);close(r.slope,-.5);
  assert.equal(r.rows[0].point,Infinity);close(r.rows.at(-1).point,0);assert.equal(r.rows.at(-1).arc,null);
  const scaled=M.linearElasticity({intercept:7000,quantity:140,segments:7,segment:3});close(scaled.selected.e,-1);
  for(const change of [{intercept:0},{quantity:-1},{segments:2.5},{segment:7}])assert.throws(()=>M.linearElasticity({intercept:7,quantity:14,segments:7,segment:3,...change}));
});
test('wheat and oil shifts preserve demand and apply the same horizontal supply change',()=>{
  const wheat=M.elasticityShift({p0:3,q0:100,ed:.3,es:.3,shift:20});
  close(wheat.p,2);close(wheat.q,110);close(wheat.revenue0,300);close(wheat.revenue,220);
  const short=M.elasticityShift({p0:50,q0:100,ed:.2,es:.2,shift:-10});
  const long=M.elasticityShift({p0:50,q0:100,ed:1,es:1,shift:-10});
  close(short.p,62.5);close(long.p,52.5);close(short.delta,long.delta);
  for(const r of [wheat,short,long]){close(r.demand(r.q),r.p);close(r.shifted(r.q),r.p);close(r.supply(r.q-r.delta),r.shifted(r.q));}
  assert.throws(()=>M.elasticityShift({p0:3,q0:100,ed:.01,es:.01,shift:80}),/tramo/);
});
test('presets preserve independent editors and classify only the selected scenario',()=>{
  const saved={p1:20000,p2:25000,q1:100,q2:90,supply:{},linear:{intercept:7},shift:{},compare:{a:{q2:91}},other:{mode:'income'}};
  UI.preset(saved,'supply:elastic');assert.equal(saved.supply.q2,200);assert.equal(saved.p1,20000);assert.equal(saved.compare.a.q2,91);
  UI.preset(saved,'demand:infinite');assert.equal(saved.p2,saved.p1);assert.equal(M.elasticity(saved).e,Infinity);
  UI.preset(saved,'shift:wheat');close(M.elasticityShift({...saved.shift,shift:saved.shift.change}).revenue,220);
  assert.equal(saved.linear.intercept,7);assert.equal(saved.other.mode,'income');
});
