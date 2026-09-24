import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const config={maxDuration:60};
const SITE='https://voice-card-vercel.vercel.app';
async function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error(`ffmpeg_${c}: ${err.slice(-1400)}`)))})}
async function launchBrowser(){return puppeteer.launch({args:chromium.args,defaultViewport:{width:480,height:720,deviceScaleFactor:1},executablePath:await chromium.executablePath(),headless:true})}
export default async function handler(req,res){
 const id=String(req.query?.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({ok:false,error:'invalid_id'});
 let browser,tmp;
 try{
  tmp=await mkdtemp(path.join(os.tmpdir(),'koephoto-'));browser=await launchBrowser();const page=await browser.newPage();
  await page.goto(`${SITE}/classic-birthday-voice.html?id=${encodeURIComponent(id)}`,{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForFunction(()=>{const a=document.querySelector('#audio');return !!(a?.src&&document.querySelector('.card')&&document.querySelectorAll('.bar').length&&document.querySelector('#playBtn'))},{timeout:12000});
  await page.evaluate(async()=>{if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);document.querySelector('.player')?.classList.add('playing');});
  const audioUrl=await page.$eval('#audio',a=>a.src);const card=await page.$('.card');if(!card)throw new Error('card_not_found');
  const play=path.join(tmp,'play.png');await card.screenshot({type:'png',path:play});
  await page.evaluate(()=>{const b=document.querySelector('#playBtn');if(b){b.setAttribute('aria-label','音声を一時停止');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';}});
  const pause=path.join(tmp,'pause.png');await card.screenshot({type:'png',path:pause});
  await browser.close();browser=null;
  const ar=await fetch(audioUrl);if(!ar.ok)throw new Error(`audio_fetch_${ar.status}`);const audio=path.join(tmp,'audio.bin');await writeFile(audio,new Uint8Array(await ar.arrayBuffer()));
  const mp4=path.join(tmp,'proof.mp4');const W=480,H=720;const waveY=438,waveH=58,leftX=60,rightX=300,waveW=120;
  // The complete player (button + both waveform sides) comes from the real HTML card.
  // Do not rebuild or overlay the waveform separately.
  const filter=`[0:v]scale=${W}:${H}[play];[1:v]scale=${W}:${H}[pause];[play][pause]overlay=0:0:enable='gte(t,0.10)'[v]`;
  await run(ffmpegPath,['-y','-loop','1','-framerate','30','-i',play,'-loop','1','-framerate','30','-i',pause,'-i',audio,'-t','3','-filter_complex',filter,'-map','[v]','-map','2:a?','-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','96k','-shortest','-movflags','+faststart',mp4]);
  const bytes=await readFile(mp4);res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',String(bytes.length));res.setHeader('Cache-Control','no-store');res.setHeader('X-Koephoto-Proof','html-player-single-source-v1');return res.status(200).send(bytes);
 }catch(e){return res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)})}finally{if(browser)await browser.close().catch(()=>{});if(tmp)await rm(tmp,{recursive:true,force:true}).catch(()=>{})}
}
