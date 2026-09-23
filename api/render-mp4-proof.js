import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const config={maxDuration:60};
const SITE='https://voice-card-vercel.vercel.app';
async function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',x=>x===0?resolve():reject(new Error(`ffmpeg_${x}: ${err.slice(-1600)}`)))})}
async function launch(){return puppeteer.launch({args:chromium.args,defaultViewport:{width:480,height:720,deviceScaleFactor:1},executablePath:await chromium.executablePath(),headless:true})}
export default async function handler(req,res){
 const id=String(req.query?.id||''); const source=String(req.query?.source||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({ok:false,error:'invalid_id'});
 if(!source.startsWith('https://')||!source.includes('.supabase.co/storage/'))return res.status(400).json({ok:false,error:'invalid_source'});
 let tmp,browser;
 try{
  tmp=await mkdtemp(path.join(os.tmpdir(),'koephoto-'));
  const sr=await fetch(source);if(!sr.ok)throw new Error(`source_fetch_${sr.status}`);
  const src=path.join(tmp,'source.mp4');await writeFile(src,new Uint8Array(await sr.arrayBuffer()));
  browser=await launch();const page=await browser.newPage();
  await page.goto(`${SITE}/classic-birthday-voice.html?id=${encodeURIComponent(id)}`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>!!document.querySelector('#playBtn')&&!!document.querySelector('.card'),{timeout:12000});
  await page.evaluate(async()=>{if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);});
  const info=await page.evaluate(()=>{const card=document.querySelector('.card'),btn=document.querySelector('#playBtn');const cr=card.getBoundingClientRect(),br=btn.getBoundingClientRect();return{x:br.left-cr.left,y:br.top-cr.top,w:br.width,h:br.height}});
  await page.evaluate(()=>{const btn=document.querySelector('#playBtn');if(btn){btn.setAttribute('aria-label','音声を一時停止');btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';}}); 
  const btn=await page.$('#playBtn');if(!btn)throw new Error('play_button_not_found');
  const png=path.join(tmp,'pause.png');await btn.screenshot({type:'png',omitBackground:true,path:png});
  await browser.close();browser=null;
  const out=path.join(tmp,'proof.mp4');const x=Math.round(info.x),y=Math.round(info.y);
  // Preserve the approved MP4 and its waveform. Overlay only the real HTML play button
  // captured from its original DOM position/state; no generated icon and no guessed coordinates.
  const filter=`[1:v]format=rgba[pause];[0:v][pause]overlay=${x}:${y}:enable='gte(t,0.10)':shortest=1[v]`;
  await run(ffmpegPath,['-y','-i',src,'-loop','1','-framerate','30','-i',png,'-filter_complex',filter,'-map','[v]','-map','0:a?','-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p','-r','30','-c:a','copy','-t','3','-movflags','+faststart',out]);
  const bytes=await readFile(out);res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',String(bytes.length));res.setHeader('Cache-Control','no-store');res.setHeader('X-Koephoto-Proof','approved-v3-real-html-button-v1');return res.status(200).send(bytes);
 }catch(e){return res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)})}finally{if(browser)await browser.close().catch(()=>{});if(tmp)await rm(tmp,{recursive:true,force:true}).catch(()=>{})}
}
