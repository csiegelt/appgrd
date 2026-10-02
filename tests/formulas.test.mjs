import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {compile}=createRequire(import.meta.url)('../js/cuantitativas-formulas.js');
test('formulas respect arithmetic precedence, powers, Spanish decimals and variables',()=>{
  assert.equal(compile('=2*X+5')({X:3}),11);
  assert.equal(compile('=-2^2')({}),-4);
  assert.equal(compile('=2^-2')({}),.25);
  assert.equal(compile('=2^3^2')({}),512);
  assert.equal(compile('=1,5*x + m*X+b')({x:2,m:3,b:4}),13);
  assert.equal(compile('=(O-E)^2/E')({O:36,E:29.6}),((36-29.6)**2)/29.6);
  assert.equal(compile('=PROMEDIO(2;4;6)+POTENCIA(2;3)+RAIZ(9)')({}),15);
  assert.equal(compile('=MAX(0;Y-5)')({Y:3}),0);
});
test('invalid formulas explain the problem without executing code or returning nonfinite data',()=>{
  for(const source of ['X.constructor','globalThis.alert(1)','=2X','=SUMA(1;)', '=2**3'])assert.throws(()=>compile(source)({X:1}));
  assert.throws(()=>compile('=A1')({}),/Variable A1/);
  assert.throws(()=>compile('=RAIZ(-1)')({}),/número finito/);
  assert.throws(()=>compile('=1/0')({}),/División por cero/);
  assert.throws(()=>compile('=LN(0)')({}),/número finito/);
  assert.throws(()=>compile('=EXP(10000)')({}),/número finito/);
  assert.throws(()=>compile('=POTENCIA(2)')({}),/2 argumento/);
  assert.throws(()=>compile('('.repeat(31)+'1'+')'.repeat(31)),/anidados/);
});
