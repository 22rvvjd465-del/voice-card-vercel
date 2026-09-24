const frame=document.getElementById('voiceFrame');
frame.src='classic-birthday-voice.html'+location.search+location.hash;
function fit(){try{const d=frame.contentDocument,p=d&&d.querySelector('.page');if(p)frame.style.height=Math.ceil(p.getBoundingClientRect().height+8)+'px'}catch(e){}}
frame.addEventListener('load',()=>{
 const d=frame.contentDocument;if(!d)return;const footer=d.querySelector('.brand');if(!footer)return;
 const st=d.createElement('style');
 st.textContent='.route-save-area{width:var(--card-w);padding:28px 18px 10px;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif}.route-save-panel{border-top:1px solid #e7e7e4;padding-top:24px;text-align:center}.route-save-kicker{font-size:9px;letter-spacing:.22em;color:#999;margin-bottom:8px}.route-save-title{font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-size:20px;font-weight:500;letter-spacing:.03em;color:#242525;margin-bottom:7px}.route-save-copy{font-size:10px;line-height:1.8;color:#777;margin:0 auto 17px}.route-save-btn{width:min(100%,390px);min-height:52px;border:1px solid #2c2d2d;border-radius:999px;background:#2c2d2d;color:#fff;font:700 12px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;letter-spacing:.02em}.route-save-btn:disabled{opacity:.55}.route-save-status{min-height:18px;margin:10px 0 0;font-size:9.5px;line-height:1.7;color:#888}';
 d.head.appendChild(st);
 const area=d.createElement('div');area.className='route-save-area';
 area.innerHTML='<div class="route-save-panel"><div class="route-save-kicker">SAVE</div><div class="route-save-title">ボイスページを保存</div><p class="route-save-copy">写真と声を、動画として手元に残せます。</p><button class="route-save-btn" type="button">ボイスページを動画で保存</button><p class="route-save-status" aria-live="polite"></p></div>';
 footer.parentNode.insertBefore(area,footer);
 const btn=area.querySelector('.route-save-btn'),status=area.querySelector('.route-save-status');
 btn.onclick=async()=>{
  const id=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('public_id')||'';
  if(!/^[0-9a-f-]{36}$/i.test(id)){status.textContent='保存するボイスページの情報が見つかりませんでした。';return}
  btn.disabled=true;btn.textContent='動画を準備しています…';status.textContent='少し時間がかかる場合があります。';
  try{
   const r=await fetch('https://qbutohdqtgzjejnwdqcx.supabase.co/functions/v1/render-video-proof?id='+encodeURIComponent(id));
   const raw=await r.text();let data={};try{data=JSON.parse(raw)}catch(_){}
   const videoUrl=data.video_url||data.url||data.signed_url||'';
   if(!r.ok||!videoUrl)throw new Error((data&&data.error)||('render_failed:'+raw.slice(0,120)));
   status.textContent='動画を開きます。iPhoneでは共有ボタンから「ビデオを保存」を選んでください。';
   window.top.location.href=videoUrl;
   return;
  }catch(e){console.error(e);status.textContent='動画を準備できませんでした。時間をおいてもう一度お試しください。';btn.disabled=false;btn.textContent='ボイスページを動画で保存'}
 };
 fit();setTimeout(fit,500);new ResizeObserver(fit).observe(d.documentElement);
});
window.addEventListener('resize',fit);
