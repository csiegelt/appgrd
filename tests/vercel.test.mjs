import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createVercelHandler } from '../api/[...path].mjs';
import { sessionTokens } from '../lib/session-token.mjs';
import { serverConfig } from '../server.mjs';

const origin = 'https://appgrd.vercel.app', password = 'test-vercel-access-password';
const env = { APP_ORIGIN: origin, APP_PASSWORD: password, OPENAI_API_KEY: 'test-key-not-a-real-secret', OPENAI_MODEL: 'gpt-4.1-mini' };
const input = { model: env.OPENAI_MODEL, context: { name: 'Salud', lessons: [{ title: 'Tema', text: 'Material docente.' }] }, messages: [{ role: 'user', content: 'Explica el tema' }] };

async function instance(t, settings = env, fetchImpl = () => { throw Error('Unexpected provider request'); }, parsed = false) {
  const handler = createVercelHandler({ env: settings, fetchImpl });
  const server = createServer(async (req, res) => {
    // Vercel's Node handler can receive a parsed body and the original URL/Host.
    if (parsed && req.method === 'POST') { let data=''; for await (const chunk of req) data += chunk; try { req.body=JSON.parse(data); } catch { req.body=data; } }
    await handler(req,res);
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  t.after(()=>new Promise(done=>{server.close(done);server.closeAllConnections()}));
  return (path, body, cookie = '', extraHeaders = {}) => new Promise((done,fail)=>{
    const options={method:body===undefined?'GET':'POST',headers:{Host:new URL(origin).host,Cookie:cookie,...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...extraHeaders}};
    const req=request(`http://127.0.0.1:${server.address().port}${path}`,options,res=>{
      let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>done({status:res.statusCode,headers:res.headers,data:JSON.parse(data),cookie:res.headers['set-cookie']?.[0].split(';')[0]}));
    });req.on('error',fail);req.end(body===undefined?undefined:JSON.stringify(body));
  });
}

test('Vercel exposes a setup diagnosis while missing HTTPS origin blocks provider requests',async t=>{
  const call=await instance(t,{OPENAI_API_KEY:env.OPENAI_API_KEY,OPENAI_MODEL:env.OPENAI_MODEL});
  const response=await call('/api/session');assert.equal(response.status,200);assert.equal(response.data.available,true);assert.equal(response.data.connected,false);assert.match(response.data.setupError,/APP_ORIGIN.*HTTPS/);
  assert.equal((await call('/api/check',{})).status,503);assert.equal((await call('/api/tutor',input)).status,503);
  assert.ok(!JSON.stringify(response).includes(env.OPENAI_API_KEY));
  assert.throws(()=>serverConfig({VERCEL:'1',OPENAI_API_KEY:env.OPENAI_API_KEY}));
  assert.equal(serverConfig({VERCEL:'1',VERCEL_PROJECT_PRODUCTION_URL:'appgrd.vercel.app',APP_PASSWORD:password}).origin,origin);
});

test('Vercel routes work with parsed JSON and a login survives a different function instance',async t=>{
  let providerCalls=0;
  const provider=async(url,options)=>{
    providerCalls++;assert.equal(options.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);
    if(url.includes('/models/'))return Response.json({id:env.OPENAI_MODEL});
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',usage:{input_tokens:12,output_tokens:8,total_tokens:20},output:[{type:'message',content:[{type:'output_text',text:'Respuesta de prueba'}]}]}})+'\n\n');
  };
  const one=await instance(t,env,provider,true),two=await instance(t,env,provider,true);
  const start=await one('/api/session');assert.equal(start.status,200);assert.equal(start.data.authRequired,true);assert.equal(start.data.configured,true);
  assert.equal((await one('/api/login',{password:'wrong'},start.cookie)).status,401);
  const login=await one('/api/login',{password},start.cookie);assert.equal(login.status,200);assert.match(login.headers['set-cookie'][0],/HttpOnly; SameSite=Strict.*Secure/);
  assert.equal((await two('/api/session',undefined,login.cookie)).data.connected,true);
  assert.equal((await two('/api/check',{},login.cookie)).status,200);
  const tutor=await two('/api/tutor',input,login.cookie);assert.equal(tutor.status,200);assert.equal(tutor.data.text,'Respuesta de prueba');assert.equal(tutor.data.usage.totalTokens,20);
  const meter=await two('/api/usage',undefined,login.cookie);assert.equal(meter.data.totalTokens,20);assert.equal(meter.data.scope,'instance');assert.equal(meter.data.persistenceWarning,true);
  assert.equal((await two('/api/check',{},login.cookie,{Origin:'https://untrusted.invalid'})).status,403);
  assert.equal((await two('/api/session',undefined,login.cookie,{Host:'untrusted.invalid'})).status,403);
  const token=login.cookie.slice('appgrd-session='.length),claims=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString());
  assert.equal((await two('/api/check',{},'appgrd-session='+claims.id)).status,401,'A visible ID alone cannot impersonate the signed session');
  assert.equal((await two('/api/check',{},login.cookie+'bad')).status,401);
  assert.equal((await two('/api/tutor',{...input,messages:[{role:'user',content:'x'.repeat(310000)}]},login.cookie)).status,413);
  const rotated=await instance(t,{...env,APP_PASSWORD:password+'-rotated'},provider,true);
  assert.equal((await rotated('/api/session',undefined,login.cookie)).data.connected,false);
  const logout=await two('/api/logout',{},login.cookie);assert.match(logout.headers['set-cookie'][0],/Max-Age=0/);assert.equal((await two('/api/check',{},login.cookie)).status,401);
  assert.equal(providerCalls,2);
});

test('Vercel accepts short passwords and preserves authentication across function instances',async t=>{
  const shortEnv={...env,APP_PASSWORD:'1234'};
  const one=await instance(t,shortEnv),two=await instance(t,shortEnv);
  const start=await one('/api/session');
  assert.equal(start.data.authRequired,true);assert.equal(start.data.protected,true);
  assert.equal((await one('/api/login',{password:'wrong'},start.cookie)).status,401);
  const login=await one('/api/login',{password:shortEnv.APP_PASSWORD},start.cookie);
  assert.equal(login.status,200);
  const resumed=await two('/api/session',undefined,login.cookie);
  assert.equal(resumed.data.connected,true);assert.equal(resumed.data.authRequired,false);
  assert.equal((await two('/api/check',{})).status,401);
});

test('Vercel without a password opens the tutor directly, reuses anonymous sessions and retains request limits',async t=>{
  const publicEnv={...env};delete publicEnv.APP_PASSWORD;
  let providerCalls=0;
  const provider=async(url,options)=>{
    providerCalls++;assert.equal(options.headers.Authorization,'Bearer '+env.OPENAI_API_KEY);
    if(url.includes('/models/'))return Response.json({id:env.OPENAI_MODEL});
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',usage:{input_tokens:12,output_tokens:8,total_tokens:20},output:[{type:'message',content:[{type:'output_text',text:'Respuesta pública de prueba'}]}]}})+'\n\n');
  };
  const one=await instance(t,publicEnv,provider,true),two=await instance(t,{...publicEnv,APP_PASSWORD:''},provider,true);
  const start=await one('/api/session');
  assert.equal(start.status,200);assert.equal(start.data.connected,true);
  assert.equal(start.data.authRequired,false);assert.equal(start.data.protected,false);
  assert.equal(start.data.models[0].slug,env.OPENAI_MODEL);
  assert.match(start.headers['set-cookie'][0],/HttpOnly; SameSite=Strict.*Secure/);
  for(let i=0;i<3;i++){
    const repeat=await one('/api/session',undefined,start.cookie);
    assert.equal(repeat.data.connected,true);assert.equal(repeat.cookie,undefined,'An anonymous session is reused, not replaced on each request');
  }
  const other=await two('/api/session',undefined,start.cookie);
  assert.equal(other.data.connected,true);assert.equal(other.data.authRequired,false);
  assert.equal((await two('/api/session',undefined,other.cookie)).cookie,undefined);
  assert.equal((await two('/api/check',{},other.cookie)).status,200);
  assert.equal((await two('/api/check',{},other.cookie,{Origin:'https://untrusted.invalid'})).status,403);
  assert.equal((await two('/api/session',undefined,other.cookie,{Host:'untrusted.invalid'})).status,403);
  for(let i=0;i<20;i++){
    const tutor=await two('/api/tutor',input,other.cookie);
    assert.equal(tutor.status,200);assert.equal(tutor.data.text,'Respuesta pública de prueba');
  }
  assert.equal((await two('/api/tutor',input,other.cookie)).status,429);assert.equal(providerCalls,21);
  const meter=await two('/api/usage',undefined,other.cookie);
  assert.equal(meter.status,200);assert.equal(meter.data.totalTokens,400);
  assert.ok(!JSON.stringify([start.data,meter.data]).includes(env.OPENAI_API_KEY));
  const missingKey=await instance(t,{...publicEnv,OPENAI_API_KEY:''});
  const missing=await missingKey('/api/session');
  assert.equal(missing.data.configured,false);assert.equal(missing.data.connected,false);assert.equal(missing.data.authRequired,false);
  assert.equal((await missingKey('/api/check',{},missing.cookie)).status,503);
});

test('signed sessions reject expiry, altered claims, changed audience and malformed tokens',()=>{
  let now=Date.now();const options={secret:password,origin,now:()=>now},tokens=sessionTokens(options);
  const session={id:randomBytes(32).toString('base64url'),expires:now+1000};const token=tokens.issue(session);
  assert.deepEqual(tokens.verify(token),session);
  const parts=token.split('.');parts[0]=Buffer.from(JSON.stringify({...session,v:1,aud:origin,exp:now+999999})).toString('base64url');assert.equal(tokens.verify(parts.join('.')),null);
  assert.equal(sessionTokens({...options,origin:'https://another.example'}).verify(token),null);
  for(const value of ['',undefined,token+'.extra','x'.repeat(2048)])assert.equal(tokens.verify(value),null);
  now+=1001;assert.equal(tokens.verify(token),null);
});

test('Vercel build publishes teaching resources but excludes server sources, data and env files',async()=>{
  const root=fileURLToPath(new URL('..',import.meta.url));
  execFileSync(process.execPath,['scripts/build-vercel.mjs'],{cwd:root});
  assert.deepEqual((await readdir(new URL('../.vercel-static/',import.meta.url))).sort(),['css','index.html','js','manual','plantillas']);
  const html=await readFile(new URL('../.vercel-static/index.html',import.meta.url),'utf8');assert.match(html,/economia-lab.js/);
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));assert.equal(config.framework,null);assert.equal(config.functions['api/*.mjs'].maxDuration,240);
  assert.equal(config.outputDirectory,'.vercel-static');
});
