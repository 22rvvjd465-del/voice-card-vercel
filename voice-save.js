const frame=document.getElementById('voiceFrame');
frame.src='classic-birthday-voice.html'+location.search+location.hash;
function fit(){try{const d=frame.contentDocument,p=d&&d.querySelector('.page');if(p)frame.style.height=Math.ceil(p.getBoundingClientRect().height+8)+'px'}catch(e){}}
frame.addEventListener('load',()=>{
 const d=frame.contentDocument;if(!d)return;const footer=d.querySelector('.brand');if(!footer)return;
 const st=d.createElement('style');
 st.textContent='.route-save-area{width:var(--card-w);padding:27px 18px 4px;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif}.route-save-panel{border-top:1px solid #e7e7e4;padding-top:22px;text-align:center}.route-save-btn{display:inline-flex;align-items:center;justify-content:center;gap:11px;width:min(82%,310px);min-height:46px;padding:0 20px;border:1px solid #203b63;border-radius:999px;background:#203b63;color:#fff;font:500 12px -apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;letter-spacing:.07em;box-shadow:0 3px 12px rgba(24,44,75,.10);cursor:pointer;transition:background .2s,transform .2s}.route-save-btn:active{background:#152d50;transform:scale(.99)}.route-save-btn svg{width:15px;height:15px;flex:none;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.route-save-btn:disabled{opacity:.55}.route-save-status{min-height:18px;margin:10px 0 0;font-size:9.5px;line-height:1.7;color:#888}';
 d.head.appendChild(st);
 const area=d.createElement('div');area.className='route-save-area';
 area.innerHTML='<div class="route-save-panel"><button class="route-save-btn" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3"/></svg><span>写真と声を保存</span></button><p class="route-save-status" aria-live="polite"></p></div>';
 footer.parentNode.insertBefore(area,footer);
 const btn=area.querySelector('.route-save-btn'),status=area.querySelector('.route-save-status');
 btn.onclick=async()=>{
  const id=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('public_id')||'';
  if(!/^[0-9a-f-]{36}$/i.test(id)){status.textContent='保存する写真と声の情報が見つかりませんでした。';return}
  btn.disabled=true;btn.querySelector('span').textContent='動画を準備しています…';status.textContent='少し時間がかかる場合があります。';
  try{
   const r=await fetch('api/render-video-save?id='+encodeURIComponent(id));
   const raw=await r.text();let data={};try{data=JSON.parse(raw)}catch(_){}
   const videoUrl=data.video_url||data.url||data.signed_url||'';
   if(!r.ok||!videoUrl)throw new Error((data&&data.error)||('render_failed:'+raw.slice(0,120)));
   status.textContent='動画を開きます。iPhoneでは共有ボタンから「ビデオを保存」を選んでください。';
   window.top.location.href=videoUrl;
   return;
  }catch(e){console.error(e);status.textContent='エラー：'+(e&&e.message?e.message:String(e));btn.disabled=false;btn.querySelector('span').textContent='写真と声を保存'}
 };
 fit();setTimeout(fit,500);new ResizeObserver(fit).observe(d.documentElement);
});
window.addEventListener('resize',fit);
