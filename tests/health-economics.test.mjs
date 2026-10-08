import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {tutorPayload} from '../lib/tutor.mjs';
const context=vm.createContext({structuredClone});
for(const file of ['economia-salud.js','economia-contenido.js','economia-banco.js'])vm.runInContext(readFileSync(new URL('../js/'+file,import.meta.url),'utf8'),context);
const [M,S,I,B]=vm.runInContext('[EconomiaSalud,ECONOMIA_ASIGNATURA,EconomiaIntegracion,BANCO_ECONOMIA]',context);
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('health total and exact increments agree with finite differences, marginal falls',()=>{
 for(const k of [.01,.35,2])for(const m of [0,2,15,30]){
  const v={...M.defaults.production,k,m},r=M.production(v),eps=1e-5;
  close(r.pm,(r.health(m+eps)-r.health(m-eps))/(2*eps),1e-6);
  close(r.second,(r.marginal(m+eps)-r.marginal(m-eps))/(2*eps),1e-6);
  close(r.gain,r.health(m+v.extra)-r.health(m));assert.ok(r.gain<=r.pm*v.extra+1e-10);assert.ok(r.pm>=0&&r.second<=0);
 }
 const r=M.production({...M.defaults.production,m:2});close(r.h,50.34146962085905);close(r.gain,14.664755468025);
});
test('isocost tangency meets target and beats neighboring feasible mixes',()=>{
 for(const pm of [.1,1,3,20])for(const px of [.1,1,20]){
  const v={...M.defaults.inputs,pm,px},r=M.inputs(v);
  close(v.a*Math.sqrt(r.m*r.x),v.h);close(r.x/r.m,pm/px);close(r.cost,pm*r.m+px*r.x);
  for(const factor of [.5,.99,1.01,2])assert.ok(pm*r.m*factor+px*r.iso(r.m*factor)>r.cost);
  close((r.iso(r.m+1e-5)-r.iso(r.m-1e-5))/2e-5,-pm/px,1e-5);
 }
});
test('private effort is a constrained maximum and target-income is a separate hypothesis',()=>{
 for(const alpha of [0,2,10])for(const floor of [0,5,20]){
  const v={...M.defaults.physician,alpha,floor},r=M.physician(v);
  assert.ok(r.ffs>=r.cap&&r.cap>=floor);
  for(const e of [floor,r.cap,r.ffs,r.ffs+1,100]){
   assert.ok(r.utility(e,v.p*e)<=r.ffsU+1e-8);
   assert.ok(r.utility(e,v.y0)<=r.capU+1e-8);
  }
 }
 const v=M.defaults.physician,r=M.physician(v);close(r.ffs,6);close(r.cap,4);close(r.target,10);
 const lower=M.physician({...v,p:2});assert.ok(lower.target>r.target&&lower.ffs<r.ffs);
 close(M.physician({...v,y0:80}).cap,r.cap);
});
test('altruism choices lie on frontier, indifferences pass through choices and tangent inside',()=>{
 let previous=0;
 for(const alpha of [0,.1,.5,1,2,10,50]){
  const v={...M.defaults.altruism,alpha},r=M.altruism(v),z=v.ymax/v.hmax**2;
  assert.ok(r.h>=previous&&r.h<=v.hmax&&r.y>=0);previous=r.h;
  close(r.indifference(r.h),r.y);close(r.income(r.h),r.y);
  if(r.interior)close(2*z*r.h,alpha*(1+r.y));
  for(let h=0;h<=v.hmax;h+=.05)assert.ok(Math.log1p(r.income(h))+alpha*h<=r.u+1e-8);
 }
 const r=M.altruism(M.defaults.altruism);close(r.h,Math.sqrt(102)-1);close(r.y,17.199009876724155);
 close(M.altruism({...M.defaults.altruism,alpha:50}).h,10);
});
test('incremental evaluation handles all quadrants, ties, zero denominator and threshold',()=>{
 const v=M.defaults.evaluation;
 close(M.evaluation(v).icer,60);close(M.evaluation(v).nmb,20);
 for(const [cb,eb,status] of [[80,3,'B domina'],[160,1,'B está dominada'],[100,2,'Mismos'],[80,2,'B domina'],[160,2,'B está dominada']]){
  const r=M.evaluation({...v,cb,eb});assert.ok(r.status.startsWith(status));if(eb===2)assert.equal(r.icer,null);
 }
 const saved=M.evaluation({...v,cb:80,eb:1});close(saved.icer,20);close(saved.nmb,-60);
});
test('invalid controls fail visibly instead of generating invalid plots',()=>{
 for(const tab of Object.keys(M.defaults))for(const key of Object.keys(M.defaults[tab]))for(const value of [null,NaN,Infinity,-1,'2'])assert.throws(()=>M[tab]({...M.defaults[tab],[key]:value}));
});
test('version-one migration preserves personal material, progress, notes and attempts without duplicates',()=>{
 const personal={...structuredClone(S),economiaVersion:1};personal.lessons=personal.lessons.slice(0,11);personal.lessons[0].text='Apunte personal sintético';
 const state={subjects:[personal],notes:{x:'nota sintética'},progress:{x:{read:true}},history:[{type:'exam',grade:6}],examAttempts:{test:{answers:[1,null]}}};
 const before=structuredClone(state),next=I.enhance(state);assert.deepEqual(state,before);assert.equal(next.subjects[0].lessons.length,16);
 assert.deepEqual(next.subjects[0].lessons.slice(0,11),personal.lessons);
 for(const key of ['notes','progress','history','examAttempts'])assert.deepEqual(next[key],state[key]);assert.equal(I.enhance(next),null);
 for(const [, ,lesson] of M.tabs)assert.equal(B.filter(q=>q.lesson===lesson).length,8);
});
test('AI tutor, practice and exam receive full new lessons with worked formulas',()=>{
 const models=[{slug:'synthetic'}],base={model:'synthetic',context:S,messages:[{role:'user',content:'Explica las fórmulas paso a paso'}]};
 for(const mode of [{},{generate:true},{generateExam:true,examSize:15}]){
  const payload=tutorPayload({...base,...mode},models),text=JSON.stringify(payload);
  for(const [,,id] of M.tabs){const lesson=S.lessons.find(l=>l.id===id);assert.ok(text.includes(lesson.title));assert.ok(payload.input[0].content.includes(lesson.text.split('\n').at(-1)));}
  assert.match(text,/p\+αb/);assert.match(text,/PMM\/pM=PMX\/pX/);
 }
});
