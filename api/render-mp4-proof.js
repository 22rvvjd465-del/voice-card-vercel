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
 const id=String(req.query?.id||'');const source=String(req.query?.source||'');
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
  await page.evaluate(async()=>{if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1800))]);const b=document.querySelector('#playBtn');if(b){b.setAttribute('aria-label','音声を一時停止');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';}}); 
  // Capture the ENTIRE card in the real playing state. This preserves the exact DOM coordinate system.
  // We will use only the central player patch from this card and overlay it at the SAME coordinates.
  const card=await page.$('.card');if(!card)throw new Error('card_not_found');
  const playing=path.join(tmp,'playing.png');await card.screenshot({type:'png',path:playing});
  await browser.close();browser=null;
  const out=path.join(tmp,'proof.mp4');
  // Card is 480x720 in both source MP4 and screenshot. Crop the original central button area
  // from the full-card playing screenshot, then overlay at the identical x/y.
  // No DOM/page coordinate conversion and no generated button artwork.
  const X=190,Y=422,W=100,H=100;
  const filter=`[1:v]crop=${W}:${H}:${X}:${Y}[patch];[0:v][patch]overlay=${X}:${Y}:enable='gte(t,0.10)':shortest=1[v]`;
  await run(ffmpegPath,['-y','-i',src,'-loop','1','-framerate','30','-i',playing,'-filter_complex',filter,'-map','[v]','-map','0:a?','-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p','-r','30','-c:a','copy','-t','3','-movflags','+faststart',out]);
  const bytes=await readFile(out);res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',String(bytes.length));res.setHeader('Cache-Control','no-store');res.setHeader('X-Koephoto-Proof','approved-v3-same-card-player-patch-v1');return res.status(200).send(bytes);
 }catch(e){return res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)})}finally{if(browser)await browser.close().catch(()=>{});if(tmp)await rm(tmp,{recursive:true,force:true}).catch(()=>{})}
}
