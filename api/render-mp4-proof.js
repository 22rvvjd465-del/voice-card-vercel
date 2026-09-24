import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const config={maxDuration:60};
const SITE='https://voice-card-vercel.vercel.app';
async function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error(`ffmpeg_${c}: ${err.slice(-1600)}`)))})}
async function launch(){return puppeteer.launch({args:chromium.args,defaultViewport:{width:480,height:720,deviceScaleFactor:1},executablePath:await chromium.executablePath(),headless:true})}
export default async function handler(req,res){
 const id=String(req.query?.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({ok:false,error:'invalid_id'});
 let browser,tmp;
 try{
  tmp=await mkdtemp(path.join(os.tmpdir(),'koephoto-'));browser=await launch();const page=await browser.newPage();
  await page.goto(`${SITE}/classic-birthday-voice.html?id=${encodeURIComponent(id)}`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>{const a=document.querySelector('#audio');return !!(a?.src&&document.querySelector('.card')&&document.querySelectorAll('.bar').length===44&&document.querySelector('#playBtn'))},{timeout:12000});
  await page.evaluate(async()=>{if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);});
  const audioUrl=await page.$eval('#audio',a=>a.src);
  const rect=await page.$eval('.card',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}});
  const client=await page.createCDPSession();const frames=[];let accepting=true;
  client.on('Page.screencastFrame',async ev=>{try{if(accepting&&frames.length<120)frames.push({data:ev.data,ts:ev.metadata?.timestamp||0});}finally{await client.send('Page.screencastFrameAck',{sessionId:ev.sessionId}).catch(()=>{})}});
  await client.send('Page.startScreencast',{format:'jpeg',quality:82,maxWidth:480,maxHeight:720,everyNthFrame:1});
  await page.click('#playBtn');
  await new Promise(r=>setTimeout(r,3300));accepting=false;
  await client.send('Page.stopScreencast').catch(()=>{});
  if(frames.length<8)throw new Error(`too_few_screencast_frames_${frames.length}`);
  await browser.close();browser=null;
  const firstTs=frames[0].ts||0;const duration=Math.max(.1,(frames.at(-1).ts||firstTs)-firstTs);
  // Resample the browser screencast to exactly 90 frames. These are the REAL Web player frames:
  // same AudioContext analyser, same 44 bars, same play/pause icon, same CSS/glow.
  for(let i=0;i<90;i++){
    const target=(i/30);
    let best=frames[0],bestD=Infinity;
    for(const fr of frames){const t=(fr.ts||firstTs)-firstTs;const d=Math.abs(t-target);if(d<bestD){best=fr;bestD=d}}
    await writeFile(path.join(tmp,`frame-${String(i).padStart(3,'0')}.jpg`),Buffer.from(best.data,'base64'));
  }
  const ar=await fetch(audioUrl);if(!ar.ok)throw new Error(`audio_fetch_${ar.status}`);const audio=path.join(tmp,'audio.bin');await writeFile(audio,new Uint8Array(await ar.arrayBuffer()));
  const out=path.join(tmp,'proof.mp4');
  const crop=`crop=${Math.round(rect.w)}:${Math.round(rect.h)}:${Math.round(rect.x)}:${Math.round(rect.y)},scale=480:720`;
  await run(ffmpegPath,['-y','-framerate','30','-i',path.join(tmp,'frame-%03d.jpg'),'-i',audio,'-t','3','-vf',crop,'-map','0:v','-map','1:a?','-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','96k','-shortest','-movflags','+faststart',out]);
  const bytes=await readFile(out);res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',String(bytes.length));res.setHeader('Cache-Control','no-store');res.setHeader('X-Koephoto-Proof','real-web-player-screencast-v1');res.setHeader('X-Koephoto-Frames',String(frames.length));res.setHeader('X-Koephoto-Capture-Duration',duration.toFixed(3));return res.status(200).send(bytes);
 }catch(e){return res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)})}finally{if(browser)await browser.close().catch(()=>{});if(tmp)await rm(tmp,{recursive:true,force:true}).catch(()=>{})}
}
