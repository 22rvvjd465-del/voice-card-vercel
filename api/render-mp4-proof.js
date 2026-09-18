import ffmpegPath from 'ffmpeg-static';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
export const config={maxDuration:60};
async function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c===0?resolve():reject(new Error(`ffmpeg_${c}: ${err.slice(-1600)}`)))})}
export default async function handler(req,res){
 const id=String(req.query?.id||''); const source=String(req.query?.source||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({ok:false,error:'invalid_id'});
 if(!source.startsWith('https://')||!source.includes('.supabase.co/storage/'))return res.status(400).json({ok:false,error:'invalid_source'});
 let tmp;
 try{
  tmp=await mkdtemp(path.join(os.tmpdir(),'koephoto-'));
  const sr=await fetch(source); if(!sr.ok)throw new Error(`source_fetch_${sr.status}`);
  const sourceMp4=path.join(tmp,'source.mp4'); await writeFile(sourceMp4,new Uint8Array(await sr.arrayBuffer()));
  const out=path.join(tmp,'proof.mp4');
  // Keep the approved video/waveform untouched. Build only the pause symbol in FFmpeg,
  // just like the waveform overlay pipeline: transparent circular center + two white bars.
  const filter="[1:v]format=rgba,geq=r=221:g=184:b=79:a='if(lte((X-25)*(X-25)+(Y-25)*(Y-25),576),255,0)',drawbox=x=15:y=11:w=7:h=28:color=white:t=fill,drawbox=x=28:y=11:w=7:h=28:color=white:t=fill[pause];[0:v][pause]overlay=215:438:enable='gte(t,0.10)':shortest=1[v]";
  await run(ffmpegPath,['-y','-i',sourceMp4,'-f','lavfi','-i','color=c=black@0.0:s=50x50:r=30','-filter_complex',filter,'-map','[v]','-map','0:a?','-c:v','libx264','-preset','ultrafast','-crf','27','-pix_fmt','yuv420p','-r','30','-c:a','copy','-t','3','-movflags','+faststart',out]);
  const bytes=await readFile(out);
  res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',String(bytes.length));res.setHeader('Cache-Control','no-store');res.setHeader('X-Koephoto-Proof','approved-v3-ffmpeg-pause-overlay-v1');return res.status(200).send(bytes);
 }catch(e){return res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)})}finally{if(tmp)await rm(tmp,{recursive:true,force:true}).catch(()=>{})}
}
