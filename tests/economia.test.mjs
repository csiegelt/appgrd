import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context=vm.createContext({structuredClone});
for(const name of ['economia-modelos.js','economia-contenido.js'])vm.runInContext(readFileSync(new URL('../js/'+name,import.meta.url),'utf8'),context);
const M=vm.runInContext('EconomiaModelos',context),I=vm.runInContext('EconomiaIntegracion',context),base=JSON.parse(vm.runInContext('JSON.stringify(ECONOMIA_ASIGNATURA)',context));
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('document market coordinates locate the actual intersection and both excesses',()=>{
  const s={rows:[[0,1800,300],[1,1500,500],[3,900,900],[5,500,1500],[7.5,0,2250]],price:900,demandShift:0,supplyShift:0};
  let r=M.market(s);close(r.eq.q,3);close(r.eq.p,900);close(r.gap,0);
  r=M.market({...s,price:1500});close(r.qd,1);close(r.qs,5);close(r.gap,-4);
  r=M.market({...s,price:500});close(r.qd,5);close(r.qs,1);close(r.gap,4);
  r=M.market({...s,demandShift:200});assert.ok(r.eq.q>3&&r.eq.p>900);
  r=M.market({...s,supplyShift:200});assert.ok(r.eq.q<3&&r.eq.p>900);
  assert.equal(M.market({...s,demandShift:-10000}).eq,null);
  assert.equal(M.market({...s,price:10000}).clipped,true);
  assert.throws(()=>M.market({...s,rows:[[0,100,0],[0,50,100]]}),/sin repetir/);
});
test('midpoint elasticity is symmetric and revenue identity holds',()=>{
  const a={p1:20000,p2:25000,q1:100,q2:90},r=M.elasticity(a);
  close(r.e,-0.47368421052631576);assert.equal(r.kind,'Inelástica');close(r.revenue2,2250000);
  close(M.elasticity({p1:a.p2,p2:a.p1,q1:a.q2,q2:a.q1}).e,r.e);
  assert.equal(M.elasticity({...a,q2:80}).kind,'Unitaria');
  assert.equal(M.elasticity({...a,p2:20000}).e,Infinity,'A horizontal ideal is supported explicitly');
  assert.throws(()=>M.elasticity({...a,q2:null}));
});
test('short-run fixed cost dilution is separate from long-run scale cases',()=>{
  const a={mode:'short',fixed:1000000,variable:5000,congestion:0,qa:100,qb:200};
  let r=M.costs(a);close(r.a.total,1500000);close(r.b.total,2000000);close(r.a.average,15000);close(r.b.average,10000);close(r.change,-100/3);close(r.marginal(100),5000);
  for(const alpha of [.8,1,1.2]){r=M.costs({mode:'long',c0:1500000,q0:100,alpha,qa:100,qb:200});close(r.b.total/r.a.total,2**alpha);assert.equal(Math.sign(r.b.average-r.a.average),Math.sign(alpha-1));}
  r=M.costs({...a,congestion:10});close(r.marginal(100),7000);
  assert.throws(()=>M.costs({...a,qa:0}));
  assert.equal(M.costs({...a,fixed:0,variable:0}).change,null);
});
test('monopoly uses MR=MC then price on demand, and a correct welfare triangle',()=>{
  const r=M.monopoly({a:1500,b:200,c:300,d:200});
  for(const [k,v] of Object.entries({qc:3,pc:900,qm:2,pm:1100,dwl:200}))close(r[k],v);
  assert.equal(M.monopoly({a:100,b:20,c:200,d:0}).trade,false);
  for(const [k,v] of Object.entries({consumer:400,producer:1200,consumerCompetitive:900,producerCompetitive:900,consumerLoss:500,producerGain:300}))close(r[k],v);
  for(const d of [0,25,200,1000]){
    const w=M.monopoly({a:1500,b:200,c:300,d});
    close(w.consumerLoss-w.producerGain,w.dwl);
    close(w.consumerCompetitive+w.producerCompetitive-w.consumer-w.producer,w.dwl);
    assert.ok(w.consumer>=0&&w.producer>=0&&w.consumerLoss>=0&&w.producerGain>=0);
  }
  const none=M.monopoly({a:100,b:20,c:200,d:0});
  for(const k of ['consumer','producer','consumerCompetitive','producerCompetitive','consumerLoss','producerGain','dwl'])close(none[k],0);
});

test('scale results reconcile monthly totals, per-unit costs, derivatives and percentage changes',()=>{
  const short={mode:'short',fixed:1000000,variable:5000,congestion:10,qa:100,qb:200};
  let r=M.costs(short);
  close(r.a.total,1600000);close(r.b.total,2400000);close(r.a.average,16000);close(r.b.average,12000);close(r.change,-25);close(r.marginal(100),7000);close(r.marginal(200),9000);
  r=M.costs({...short,fixed:0,variable:0,congestion:0});close(r.a.average,0);close(r.b.average,0);assert.equal(r.change,null);
  r=M.costs({...short,qb:100});close(r.change,0);
  for(const alpha of [.2,.8,1,1.2,2])for(const [qa,qb] of [[100,200],[200,100],[100,100]]){
    const v={mode:'long',c0:1500000,q0:100,alpha,qa,qb},w=M.costs(v);
    close(w.b.average/w.a.average,(qb/qa)**(alpha-1));
    close(w.change,((qb/qa)**(alpha-1)-1)*100);
    for(const p of [w.a,w.b]){
      close(p.average*p.q,p.total);close(w.marginal(p.q),alpha*p.average);
      const dq=.001,finiteDifference=(w.total(p.q+dq)-w.total(p.q-dq))/(2*dq);
      assert.ok(Math.abs(finiteDifference-w.marginal(p.q))<.001);
    }
  }
});
test('insurance spending reconciles and Grossman depreciates the evolving stock',()=>{
  let r=M.insurance({price:20000,intercept:150,slope:.005,copay:25});close(r.q,125);close(r.insurer,1875000);close(r.total,r.patient+r.insurer);
  r=M.insurance({price:20000,intercept:150,slope:.005,copay:0});close(r.patient,0);close(r.total,r.insurer);
  const rows=M.grossman({initial:80,delta:10,investment:12,years:2});close(rows[1][1],84);close(rows[2][1],87.6);close(rows[2][2],64.8);
  assert.throws(()=>M.grossman({initial:80,delta:10,investment:12,years:2.5}));
});
test('expanding the existing economics subject preserves its identity and every personal record',()=>{
  const existing={id:'custom-econ-original',name:' ECONOMÍA DE LA SALUD ',source:'Mis apuntes',lessons:[{id:'old-topic',title:'Mi tema',text:'Mis conceptos',questions:[{id:'old-question',prompt:'Mi pregunta'}]}],cases:[{id:'old-case',lesson:'old-topic',steps:[['A','B','C']]}]};
  const state={subjects:[existing],selected:existing.id,lesson:'old-topic',notes:{'custom-econ-original/old-topic':'Mi apunte'},progress:{'custom-econ-original/old-question':{known:true,attempts:2}},history:[{subject:existing.id,total:4}],caseSelection:{[existing.id]:'old-case'}};
  const next=I.enhance(state);assert.equal(next.subjects.length,1);assert.equal(next.subjects[0].id,existing.id);assert.deepEqual(next.subjects[0].lessons[0],existing.lessons[0]);assert.deepEqual(next.subjects[0].cases[0],existing.cases[0]);
  for(const k of ['selected','lesson','notes','progress','history','caseSelection'])assert.deepEqual(next[k],state[k]);
  assert.equal(next.subjects[0].lessons.length,12);assert.equal(I.enhance(next),null);assert.equal(state.subjects[0].lessons.length,1);
  assert.equal(I.enhance({subjects:[{...existing,name:'Economía aplicada'}]}),null);
});
test('economics guides, cards and cases are self-contained and refer to existing lessons',()=>{
  assert.equal(base.lessons.length,11);assert.equal(base.lessons.flatMap(l=>l.questions).length,33);
  assert.equal(new Set(base.lessons.flatMap(l=>l.questions).map(q=>q.id)).size,33);
  for(const l of base.lessons){assert.equal(l.materialStatus,'provided');assert.ok(l.summary.length>=3&&l.text.length>500&&l.questions.every(q=>q.answer&&q.explanation));}
  for(const c of base.cases){assert.equal(c.fictional,true);assert.ok(base.lessons.some(l=>l.id===c.lesson));assert.ok(c.steps.every(step=>step.length===3));}
});
