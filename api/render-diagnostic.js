import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const config={maxDuration:60};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=()=>Date.now();
const SB='https://qbutohdqtgzjejnwdqcx.supabase.co';
async function launchBrowser(){let last;for(let i=0;i<3;i++){try{return await puppeteer.launch({args:chromium.args,defaultViewport:{width:360,height:540,deviceScaleFactor:1},executablePath:await chromium.executablePath(),headless:true})}catch(e){last=e;const m=String(e?.message||e);if(!m.includes('EBUSY')&&!m.includes('ETXTBSY'))throw e;await sleep(250*(i+1))}}throw last}
function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error(`ffmpeg_${c}: ${err.slice(-800)}`)))})}
async function persist(cardId,runId,stage,ok,elapsed,details={}){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return false;try{const r=await fetch(`${SB}/rest/v1/render_diagnostics`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({card_public_id:cardId,run_id:runId,stage,ok,elapsed_ms:elapsed,details})});return r.ok}catch{return false}}
export default async function handler(req,res){
 const id=String(req.query?.id||''); const stop=String(req.query?.stop||'ffmpeg');
 if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({ok:false,error:'invalid_id'});
 const runId=crypto.randomUUID(),stages=[]; let browser,tmp; const t0=now();
 const mark=async(name,extra={},ok=true)=>{const ms=now()-t0;const saved=await persist(id,runId,name,ok,ms,extra);stages.push({name,ms,saved,...extra});};
 try{
  await mark('start',{ffmpeg:!!ffmpegPath,service_key:!!process.env.SUPABASE_SERVICE_ROLE_KEY}); if(stop==='start')return res.json({ok:true,runId,stages});
  const ep=await chromium.executablePath(); await mark('chromium_path',{present:!!ep}); if(stop==='chromium_path')return res.json({ok:true,runId,stages});
  browser=await launchBrowser(); await mark('browser_launched'); if(stop==='browser')return res.json({ok:true,runId,stages});
  const page=await browser.newPage(); await page.setViewport({width:360,height:540,deviceScaleFactor:1});
  const response=await page.goto(`https://voice-card-vercel.vercel.app/classic-birthday-voice.html?id=${encodeURIComponent(id)}`,{waitUntil:'networkidle0',timeout:30000});
  await mark('page_loaded',{status:response?.status()||0}); if(stop==='page')return res.json({ok:true,runId,stages});
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready;});
  const state=await page.evaluate(()=>({card:!!document.querySelector('.card'),play:!!document.querySelector('#playBtn'),bars:document.querySelectorAll('.bar').length,audio:!!document.querySelector('#audio')?.src})); await mark('dom_ready',state); if(stop==='dom')return res.json({ok:true,runId,stages});
  await page.click('#playBtn'); const card=await page.$('.card'); if(!card)throw new Error('card_not_found');
  tmp=await mkdtemp(path.join(os.tmpdir(),'diag-')); for(let i=0;i<3;i++){const time=i*33;await page.evaluate(t=>{document.querySelector('.player')?.classList.add('playing');for(const el of document.querySelectorAll('.bar,.ripple,.disc,.play,.sparkles *'))for(const a of el.getAnimations({subtree:false})){try{a.pause();a.currentTime=t}catch{}}},time);await card.screenshot({type:'jpeg',quality:70,path:path.join(tmp,`frame-${String(i).padStart(3,'0')}.jpg`)});} await mark('frames_captured',{frames:3}); if(stop==='frames')return res.json({ok:true,runId,stages});
  await browser.close();browser=null; const mp4=path.join(tmp,'diag.mp4'); await run(ffmpegPath,['-y','-framerate','30','-i',path.join(tmp,'frame-%03d.jpg'),'-c:v','libx264','-preset','ultrafast','-crf','30','-pix_fmt','yuv420p','-movflags','+faststart',mp4]); await mark('ffmpeg_complete');
  return res.json({ok:true,runId,stages});
 }catch(e){await mark('failed',{error:e instanceof Error?e.message:String(e)},false);return res.status(500).json({ok:false,runId,stages});}
 finally{if(browser)await browser.close().catch(()=>{});if(tmp)await rm(tmp,{recursive:true,force:true}).catch(()=>{});}
}
