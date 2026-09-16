import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = { maxDuration: 60 };

export default async function handler(req,res){
 const id=String(req.query?.id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ok:false,error:'invalid_id'});
 let browser;
 try{
  browser=await puppeteer.launch({args:chromium.args,defaultViewport:{width:720,height:1080,deviceScaleFactor:1},executablePath:await chromium.executablePath(),headless:true});
  const page=await browser.newPage(); await page.setViewport({width:720,height:1080,deviceScaleFactor:1});
  const target=`https://voice-card-vercel.vercel.app/classic-birthday-voice.html?id=${encodeURIComponent(id)}`;
  await page.goto(target,{waitUntil:'networkidle0',timeout:45000});
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready; const p=document.querySelector('.player'); if(p)p.style.visibility='hidden';});
  await new Promise(r=>setTimeout(r,700));
  const card=await page.$('.card'); if(!card)throw new Error('card_not_found');
  const png=await card.screenshot({type:'png'}); res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','no-store');return res.status(200).send(png);
 }catch(e){return res.status(500).json({ok:false,error:e instanceof Error?e.message:String(e)});}finally{if(browser)await browser.close().catch(()=>{});}
}
