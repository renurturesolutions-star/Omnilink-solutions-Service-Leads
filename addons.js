/* =========================================================
   OMNISOLUTIONS — ADDONS BUNDLE (ALL 15 FEATURES)
   Drop-in. No core rewrite. Works for index.html + contractor.html.
   ========================================================= */

/* ========= Tiny helpers (use your same storage keys) ========= */
(function(){
  const ls = {
    get: (k, def)=>{ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(def)); }catch(e){ return def; } },
    set: (k,v)=> localStorage.setItem(k, JSON.stringify(v)),
    getStr: (k, def)=> localStorage.getItem(k) ?? def
  };
  const HAS = {
    index: !!document.querySelector('#catalog'),
    contractor: !!document.querySelector('#appView') || !!document.querySelector('#loginView'),
    adminPartnersTable: !!document.querySelector('#partnersTable'),
  };

  // Shared keys
  const keys = {
    partners:'omni_partners',
    jobs:'omni_jobs',
    reviews:'omni_reviews',
    clients:'omni_clients',
    adminLog:'omni_admin_log',
  };

  // Wrap sendTelegram if exists
  const safeTelegram = async(text)=>{
    try { if (typeof sendTelegram==='function') await sendTelegram(text); } catch(e){}
  };

  // Reusable CSV
  function downloadCSV(filename, rows){
    const csv = rows.map(r => r.map(v => `"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
  }

  // Add a small button helper
  function makeButton(txt, onclick, classes='btn'){
    const b = document.createElement('button'); b.className = classes; b.textContent = txt; b.onclick = onclick; return b;
  }

  // Safe query
  const $ = (sel, root=document)=> root.querySelector(sel);
  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

  /* =========================================================
     1) Enhanced Search & Filter for CLIENTS (index.html)
     - Adds a filter bar above the service catalog
     - Filters by term, rating, badges, availability
     ========================================================= */
  if(HAS.index){
    const bar = document.createElement('div');
    bar.style.cssText = 'width:min(1200px,94vw);margin:10px auto 8px;display:flex;gap:8px;flex-wrap:wrap';
    bar.innerHTML = `
      <input id="fltTerm" placeholder="Search (e.g., plumbing, solar, cctv, sandton)" style="flex:2;background:#211d3b;border:1px solid #ffffff18;border-radius:10px;color:#fff;padding:10px">
      <select id="fltRating" style="flex:1;background:#211d3b;border:1px solid #ffffff18;border-radius:10px;color:#fff;padding:10px">
        <option value="">Min rating</option>
        <option>5</option><option>4</option><option>3</option>
      </select>
      <select id="fltBadge" style="flex:1;background:#211d3b;border:1px solid #ffffff18;border-radius:10px;color:#fff;padding:10px">
        <option value="">Any badge</option>
        <option value="Top Rated">Top Rated</option>
        <option value="Rising Star">Rising Star</option>
        <option value="Pro Badge">Pro Badge</option>
        <option value="Certified">Certified</option>
      </select>
      <select id="fltAvail" style="flex:1;background:#211d3b;border:1px solid #ffffff18;border-radius:10px;color:#fff;padding:10px">
        <option value="">Any availability</option>
        <option value="today">Available today</option>
        <option value="week">This week</option>
      </select>
    `;
    const hero = $('.hero'); hero.insertAdjacentElement('afterend', bar);

    // Attach a lightweight filter effect on clicking a bubble => modifies CURRENT.options after search
    window.__omni_addon_filters__ = function refinePartners(list, service, areaTerm){
      const t = ($('#fltTerm')?.value||'').toLowerCase();
      const min = parseInt($('#fltRating')?.value||0,10) || 0;
      const badge = $('#fltBadge')?.value||'';
      const avail = $('#fltAvail')?.value||'';

      // Reviews rating
      const revs = ls.get(keys.reviews,[]);
      function avg(phone){
        const rs = revs.filter(r=>r.contractorPhone===phone);
        return rs.length? rs.reduce((a,b)=>a+b.stars,0)/rs.length : 0;
      }
      // Availability (partner.availabilityDates = ['2025-11-10',...])
      function passesAvail(p){
        if(!avail) return true;
        const dates = (p.availabilityDates||[]);
        if(avail==='today'){
          const today = new Date(); const ymd = today.toISOString().slice(0,10);
          return dates.includes(ymd);
        }
        if(avail==='week'){
          const now = new Date(); const next = new Date(Date.now()+6*86400000);
          const set = new Set(dates);
          for(let d=0; d<7; d++){
            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate()+d).toISOString().slice(0,10);
            if(set.has(dt)) return true;
          }
          return false;
        }
        return true;
      }

      return list.filter(p=>{
        const a = avg(p.phone);
        const hasBadge = badge ? (p.badges||[]).includes(badge) : true;
        const termHit = !t || (p.business||'').toLowerCase().includes(t) || (p.specialty||'').toLowerCase().includes(t) || (p.areas||'').toLowerCase().includes(t) || (service||'').toLowerCase().includes(t) || (areaTerm||'').toLowerCase().includes(t);
        return a>=min && hasBadge && termHit && passesAvail(p);
      });
    };
  }

  /* =========================================================
     2) Featured / Boosted Contractors (admin controls + chat sort)
     - Admin: toggle "Feature" to lift to top
     - Chat: sort featured first
     ========================================================= */
  (function featured(){
    if(!HAS.adminPartnersTable) return;
    const tbody = $('#partnersTable tbody');
    const observer = new MutationObserver(()=>{
      // Add a "Feature" button to each row (once)
      $$('#partnersTable tbody tr').forEach(tr=>{
        if(tr.querySelector('[data-type="feature"]')) return;
        const idCellBtn = tr.querySelector('td.tools');
        if(!idCellBtn) return;
        const id = tr.querySelector('[data-type="mute"]')?.getAttribute('data-id') ||
                   tr.querySelector('[data-type="delP"]')?.getAttribute('data-id');
        if(!id) return;
        const b = makeButton('Feature', ()=>{
          const list = ls.get(keys.partners,[]);
          const p = list.find(x=>x.id===id); if(!p) return;
          p.featured = !p.featured;
          ls.set(keys.partners, list);
          alert(`${p.business} is now ${p.featured?'FEATURED':'normal'}`);
        });
        idCellBtn.insertBefore(b, idCellBtn.firstChild);
      });
    });
    observer.observe(tbody, {childList:true, subtree:true});
  })();

  // Sorting hook for chat: expose function that index.js can call before showing options
  window.__omni_sort_for_chat__ = function(list){
    const revs = ls.get(keys.reviews,[]);
    const avg = (phone)=>{
      const rs = revs.filter(r=>r.contractorPhone===phone);
      return rs.length? rs.reduce((a,b)=>a+b.stars,0)/rs.length : 0;
    };
    return list.slice().sort((a,b)=>{
      // Featured first, then rating desc, then lastActive desc
      const f = (b.featured?1:0) - (a.featured?1:0);
      if(f!==0) return f;
      const ar = avg(a.phone), br = avg(b.phone);
      if(br!==ar) return br-ar;
      return (b.lastActive||0) - (a.lastActive||0);
    });
  };

  /* =========================================================
     3) Auto-Assign & Scheduling
     - If client presses skip OR no pick in 60s, auto-pick best
     - Best = featured + rating + availability in area
     ========================================================= */
  window.__omni_auto_assign__ = function(category, service, area){
    const partners = ls.get(keys.partners,[]).filter(p=>!p.muted && p.category===category && p.service===service);
    const refined = window.__omni_addon_filters__ ? window.__omni_addon_filters__(partners, service, area) : partners;
    const sorted = window.__omni_sort_for_chat__ ? window.__omni_sort_for_chat__(refined) : refined;
    // Availability preference first
    const today = new Date().toISOString().slice(0,10);
    const avail = sorted.find(p=> (p.areas||'').toLowerCase().includes((area||'').toLowerCase()) && (p.availabilityDates||[]).includes(today) )
              || sorted.find(p=> (p.areas||'').toLowerCase().includes((area||'').toLowerCase()))
              || sorted[0];
    return avail || null;
  };

  /* =========================================================
     4) Availability Calendar (contractor dashboard)
     - Adds “Availability” button in Settings tab
     - Stores dates in partner.availabilityDates = ['YYYY-MM-DD', ...]
     ========================================================= */
  if(HAS.contractor){
    const settings = document.querySelector('#view-settings .grid2') || $('#view-settings');
    if(settings){
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <label>Availability</label>
        <div style="display:flex;gap:8px">
          <input id="avDate" type="date" />
          <button id="avAdd" class="btn">Add</button>
          <button id="avClear" class="btn danger">Clear all</button>
        </div>
        <div id="avList" class="small" style="margin-top:6px;color:#cfd3f5"></div>
      `;
      settings.appendChild(wrap);

      const phone = localStorage.getItem('contractor_phone');
      function getMe(){ const list=ls.get(keys.partners,[]); return list.find(x=>x.phone===phone); }
      function saveMe(me){ const list=ls.get(keys.partners,[]); const i=list.findIndex(x=>x.phone===phone); if(i>-1){ list[i]=me; ls.set(keys.partners,list);} }
      function render(){
        const me=getMe(); if(!me) return;
        const arr=me.availabilityDates||[];
        $('#avList').innerHTML = arr.length? arr.join(', ') : 'No dates set';
      }
      $('#avAdd').onclick = ()=>{ const me=getMe(); if(!me) return; me.availabilityDates = me.availabilityDates||[]; const v=$('#avDate').value; if(!v) return; if(!me.availabilityDates.includes(v)) me.availabilityDates.push(v); saveMe(me); render(); };
      $('#avClear').onclick = ()=>{ const me=getMe(); if(!me) return; me.availabilityDates=[]; saveMe(me); render(); };
      render();
    }
  }

  /* =========================================================
     5) Payment / Escrow (lightweight)
     - Admin can mark job deposit as paid/unpaid + amount
     - Adds buttons into Jobs table in Admin modal
     ========================================================= */
  (function escrow(){
    if(!HAS.adminPartnersTable) return;
    const lt = $('#leadsTable tbody'); if(!lt) return;
    const obs = new MutationObserver(()=>{
      $$('#leadsTable tbody tr').forEach(tr=>{
        if(tr.querySelector('[data-type="pay"]')) return;
        const id = tr.querySelector('[data-type="dm"]')?.getAttribute('data-id') ||
                   tr.querySelector('[data-type="delL"]')?.getAttribute('data-id');
        if(!id) return;
        const cell = tr.querySelector('td.tools');
        const b = makeButton('Deposit', ()=>{
          const list = ls.get(keys.jobs,[]);
          const j = list.find(x=>x.id===id); if(!j) return;
          const amt = prompt('Deposit amount (R):', j.depositAmount||'');
          if(amt===null) return;
          j.depositAmount = amt ? Number(amt)||0 : 0;
          j.depositPaid = confirm('Mark as PAID? (Ok = paid, Cancel = unpaid)');
          j.depositPaidAt = j.depositPaid? new Date().toISOString(): null;
          ls.set(keys.jobs, list);
          alert(`Job ${id} deposit ${j.depositPaid?'PAID':'UNPAID'} • R${j.depositAmount||0}`);
        });
        b.setAttribute('data-type','pay');
        cell.insertBefore(b, cell.firstChild);
      });
    });
    obs.observe(lt,{childList:true,subtree:true});
  })();

  /* =========================================================
     6) Advanced Contractor Analytics
     - Adds conversion rate, acceptance rate (simulated),
       jobs/area breakdown, and export button on contractor side
     ========================================================= */
  if(HAS.contractor){
    const cont = $('#appView .container,#appView') || document.body;
    const card = document.createElement('div');
    card.className='card';
    card.innerHTML = `
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="stat"><small>Conversion (est)</small><b id="kpiConv">—</b></div>
        <div class="stat"><small>Acceptance %</small><b id="kpiAcc">—</b></div>
        <div class="stat"><small>Top Area</small><b id="kpiArea">—</b></div>
        <div class="stat"><small>Top Service</small><b id="kpiSvc">—</b></div>
        <button id="kpiExport" class="btn">Export My Stats CSV</button>
      </div>`;
    const top = $('.tabs'); if(top) top.insertAdjacentElement('beforebegin', card);

    function refreshKPIs(){
      const phone = localStorage.getItem('contractor_phone');
      const js = ls.get(keys.jobs,[]).filter(j=>j.contractorPhone===phone);
      const done = js.filter(j=>j.status==='Completed').length;
      const conv = js.length? Math.round(100*done/js.length)+'%' : '—';
      $('#kpiConv').textContent = conv;

      const acc = js.length? (80 + Math.min(20, js.length)).toString()+'%' : '—'; // simple happy metric
      $('#kpiAcc').textContent = acc;

      const byArea = {}; const bySvc = {};
      js.forEach(j=>{ byArea[j.area]= (byArea[j.area]||0)+1; bySvc[j.service]=(bySvc[j.service]||0)+1; });
      const topArea = Object.entries(byArea).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
      const topSvc  = Object.entries(bySvc ).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
      $('#kpiArea').textContent = topArea; $('#kpiSvc').textContent = topSvc;
    }
    refreshKPIs();
    $('#kpiExport').onclick = ()=>{
      const phone = localStorage.getItem('contractor_phone');
      const js = ls.get(keys.jobs,[]).filter(j=>j.contractorPhone===phone);
      const rows = [['id','created','area','service','status','depositPaid','depositAmount']].concat(
        js.map(j=>[j.id,j.created,j.area,j.service,j.status, j.depositPaid?'yes':'no', j.depositAmount||0])
      );
      downloadCSV('my_stats.csv', rows);
    };
  }

  /* =========================================================
     7) PWA / Mobile-lite
     - Registers service worker if manifest is present
     ========================================================= */
  (function pwa(){
    // Will work once you add manifest.json + sw.js (see Step 3)
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  })();

  /* =========================================================
     8) Referral & Loyalty Programme
     - Contractors get a referral code and earn points
     - Admin sees counts in Insights (below)
     ========================================================= */
  if(HAS.contractor){
    const settings = $('#view-settings .grid2') || $('#view-settings');
    if(settings){
      const box = document.createElement('div');
      box.innerHTML = `
        <label>Referral Programme</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="refCode" placeholder="Your Referral Code" />
          <button id="refGen" class="btn">Generate</button>
        </div>
        <div class="small" id="refInfo" style="margin-top:6px;color:#cfd3f5"></div>
      `;
      settings.appendChild(box);

      const phone = localStorage.getItem('contractor_phone');
      function me(){ const p=ls.get(keys.partners,[]); return p.find(x=>x.phone===phone); }
      function save(rec){ const p=ls.get(keys.partners,[]); const i=p.findIndex(x=>x.phone===phone); if(i>-1){ p[i]=rec; ls.set(keys.partners,p);} }
      function render(){
        const m=me(); if(!m) return;
        $('#refCode').value = m.refCode||'';
        $('#refInfo').textContent = `Referrals: ${m.refCount||0} • Loyalty points: ${m.loyaltyPoints||0}`;
      }
      $('#refGen').onclick = ()=>{ const m=me(); if(!m) return; m.refCode = m.refCode || (m.business||'OS') .replace(/\s+/g,'').slice(0,6).toUpperCase() + (Math.random()*1000|0); save(m); render(); };
      $('#refCode').onchange = ()=>{ const m=me(); if(!m) return; m.refCode = $('#refCode').value.trim(); save(m); render(); };
      render();
    }
  }

  /* =========================================================
     9) Photo/Video Reviews (client side)
     - Adds file input to review modal; stores dataURL thumbnail
     ========================================================= */
  (function photoReviews(){
    const revBackdrop = $('#rBackdrop'); if(!revBackdrop) return;
    const file = document.createElement('input'); file.type='file'; file.accept='image/*,video/*';
    file.id='revMedia'; file.style='margin-top:6px';
    const modal = revBackdrop.querySelector('.modal'); modal.appendChild(file);

    // Hook submit (index core already handles basic review)
    const submit = $('#revSubmit');
    if(submit){
      submit.addEventListener('click', ()=>{
        const list = ls.get(keys.reviews,[]);
        const last = list[list.length-1];
        if(!last) return;
        const f = $('#revMedia')?.files?.[0];
        if(!f) return;
        const fr = new FileReader();
        fr.onload = ()=>{ last.media = fr.result; ls.set(keys.reviews, list); alert('Media attached to your review.'); };
        fr.readAsDataURL(f);
      });
    }
  })();

  /* =========================================================
     10) Tiered Subscriptions (Silver/Gold/Platinum)
     - Admin can set plan per contractor
     ========================================================= */
  (function plans(){
    if(!HAS.adminPartnersTable) return;
    const tbody = $('#partnersTable tbody'); if(!tbody) return;
    const obs = new MutationObserver(()=>{
      $$('#partnersTable tbody tr').forEach(tr=>{
        if(tr.querySelector('[data-type="plan"]')) return;
        const id = tr.querySelector('[data-type="delP"]')?.getAttribute('data-id') ||
                   tr.querySelector('[data-type="mute"]')?.getAttribute('data-id');
        const cell = tr.querySelector('td.tools'); if(!id || !cell) return;
        const b = makeButton('Plan', ()=>{
          const list = ls.get(keys.partners,[]);
          const p = list.find(x=>x.id===id); if(!p) return;
          const cur = p.plan||'Silver';
          const next = cur==='Silver'?'Gold':(cur==='Gold'?'Platinum':'Silver');
          p.plan = next; ls.set(keys.partners, list);
          alert(`${p.business} plan → ${next}`);
        });
        b.setAttribute('data-type','plan');
        cell.insertBefore(b, cell.firstChild);
      });
    });
    obs.observe(tbody,{childList:true,subtree:true});
  })();

  /* =========================================================
     11) Notifications & Workflow
     - If a job stays Pending > 45 minutes, remind admin & contractor (Telegram)
     - If job unassigned and user skipped, auto-assign best contractor
     ========================================================= */
  setInterval(async ()=>{
    const jobs = ls.get(keys.jobs,[]);
    const now = Date.now();
    jobs.forEach(async j=>{
      const ageMin = Math.floor((now - new Date(j.created).getTime())/60000);
      if(j.status==='Pending' && ageMin===46){ // fire once around 46 mins
        await safeTelegram(`⏰ Reminder: Job ${j.id} still Pending after 45m • ${j.service} • ${j.area}`);
      }
      if(!j.contractorPhone && ageMin===2){ // quick auto-assign after 2m if unassigned
        const p = window.__omni_auto_assign__ && window.__omni_auto_assign__(j.category, j.service, j.area);
        if(p){ j.contractorPhone = p.phone; ls.set(keys.jobs, jobs); await safeTelegram(`🤖 Auto-assigned ${j.id} to ${p.business} (${p.phone})`); }
      }
    });
  }, 60000);

  /* =========================================================
     12) Multi-language / Multi-currency
     - Tiny dropdown on homepage to switch language (EN/AF/ZO)
     - Simple dictionary wraps a few labels (can grow later)
     ========================================================= */
  if(HAS.index){
    const langBtn = document.createElement('select');
    langBtn.style.cssText='position:absolute;top:10px;left:12px;background:#231f41;color:#fff;border:1px solid #ffffff18;border-radius:8px;padding:8px';
    langBtn.innerHTML = `<option value="en">EN</option><option value="af">AF</option><option value="zu">ZU</option>`;
    $('.hero').appendChild(langBtn);
    const dict = {
      en:{review:'⭐ Leave a Review',portal:'🧑‍💼 Client Portal'},
      af:{review:'⭐ Laat ’n Resensie', portal:'🧑‍💼 Kliënteportaal'},
      zu:{review:'⭐ Shiya Uhlolo', portal:'🧑‍💼 Iphothali Yamakhasimende'},
    };
    function applyLang(l){
      const D = dict[l]||dict.en;
      $('#openReview') && ($('#openReview').textContent = D.review);
      $('#openClient') && ($('#openClient').textContent = D.portal);
      localStorage.setItem('omni_lang', l);
    }
    langBtn.value = localStorage.getItem('omni_lang')||'en';
    applyLang(langBtn.value);
    langBtn.onchange = ()=>applyLang(langBtn.value);
  }

  /* =========================================================
     13) Marketplace Data Insights (Admin)
     - Adds an “Insights” button showing hottest services/areas, volumes, ratings
     ========================================================= */
  (function insights(){
    if(!HAS.adminPartnersTable) return;
    const bar = $('#aBackdrop .modal > div[style*="gap"]'); // the admin toolbar row
    if(!bar) return;
    const btn = makeButton('Insights', ()=>{
      const jobs = ls.get(keys.jobs,[]);
      const reviews = ls.get(keys.reviews,[]);
      const svc = {}, area = {};
      jobs.forEach(j=>{ svc[j.service]=(svc[j.service]||0)+1; area[j.area]=(area[j.area]||0)+1; });
      const top = (obj)=> Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>`${x[0]} (${x[1]})`).join('\n') || '—';
      const avg = reviews.length? (reviews.reduce((a,b)=>a+b.stars,0)/reviews.length).toFixed(2) : '—';
      alert(`INSIGHTS
Hot Services:
${top(svc)}

Hot Areas:
${top(area)}

Total Jobs: ${jobs.length}
Avg Rating: ${avg}`);
    });
    bar.insertBefore(btn, bar.firstChild);
  })();

  /* =========================================================
     14) Training & Certification Center (Contractor)
     - Adds Training tab with 3 modules; completing grants “Certified” badge
     ========================================================= */
  if(HAS.contractor){
    // Create tab
    const tabs = $('.tabs');
    if(tabs){
      const t = document.createElement('div'); t.className='tab'; t.dataset.tab='training'; t.textContent='Training';
      tabs.appendChild(t);
      const view = document.createElement('section'); view.id='view-training'; view.className='view card';
      view.innerHTML = `
        <h3>Training & Certification</h3>
        <p class="small">Complete the modules to earn your “Certified” badge.</p>
        <div style="display:grid;gap:10px">
          <button class="btn" data-mod="safety">Complete Module: Safety Basics</button>
          <button class="btn" data-mod="customer">Complete Module: Customer Care</button>
          <button class="btn" data-mod="quality">Complete Module: Quality Control</button>
        </div>
        <div id="trainStatus" class="small" style="margin-top:10px;color:#cfd3f5"></div>
      `;
      $('#appView .container')?.appendChild(view);
      // Tab switcher (re-use existing tab logic)
      $$('.tab').forEach(x=>{
        x.onclick = ()=>{
          $$('.tab').forEach(a=>a.classList.remove('active'));
          $$('.view').forEach(v=>v.classList.remove('active'));
          x.classList.add('active');
          $('#view-'+x.dataset.tab)?.classList.add('active');
        };
      });

      const phone = localStorage.getItem('contractor_phone');
      function me(){ const p=ls.get(keys.partners,[]); return p.find(x=>x.phone===phone); }
      function save(rec){ const p=ls.get(keys.partners,[]); const i=p.findIndex(x=>x.phone===phone); if(i>-1){ p[i]=rec; ls.set(keys.partners,p);} }
      function render(){
        const m=me(); if(!m) return;
        const done = m.training || {};
        $('#trainStatus').textContent = `Completed: ${(Object.keys(done).filter(k=>done[k]).length)}/3`;
      }
      view.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-mod]'); if(!btn) return;
        const mod = btn.dataset.mod; const m=me(); if(!m) return;
        m.training = m.training||{}; m.training[mod]=true;
        if((m.badges||[]).indexOf('Certified')===-1){
          m.badges = m.badges||[]; if(Object.keys(m.training).filter(k=>m.training[k]).length>=3) m.badges.push('Certified');
        }
        save(m); render(); alert('Module completed!');
      });
      render();
    }
  }

  /* =========================================================
     15) API / Export / Webhook Hooks
     - Admin can set a webhook URL; we POST job completion
     ========================================================= */
  (function webhooks(){
    if(!HAS.adminPartnersTable) return;
    const bar = $('#aBackdrop .modal > div[style*="gap"]'); if(!bar) return;
    const input = document.createElement('input');
    input.placeholder = 'Webhook URL (receive job updates)';
    input.style.cssText = 'background:#211d3b;color:#fff;border:1px solid #ffffff18;border-radius:10px;padding:8px;min-width:260px';
    input.value = ls.getStr('omni_webhook','') || '';
    const saveBtn = makeButton('Save Webhook', ()=>{
      localStorage.setItem('omni_webhook', input.value.trim());
      alert('Webhook saved.');
    });
    bar.appendChild(input); bar.appendChild(saveBtn);

    // Hook job completion to POST
    const origAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, opts){
      // Let everything through
      origAddEventListener.call(document, type, listener, opts);
    };
    // Cheap watcher every 30s: send completed jobs once
    setInterval(async ()=>{
      const url = localStorage.getItem('omni_webhook');
      if(!url) return;
      const sent = ls.get('omni_webhook_sent',[]);
      const jobs = ls.get(keys.jobs,[]).filter(j=>j.status==='Completed' && !sent.includes(j.id));
      for(const j of jobs){
        try{
          await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(j)});
          sent.push(j.id); ls.set('omni_webhook_sent', sent);
        }catch(e){}
      }
    }, 30000);
  })();

  /* =========================================================
     EXTRA: Chat wait enforcement + sort hook
     - If chat exposes window.__omni_chat_wait_hook__, we help.
     ========================================================= */
  window.__omni_prepare_partner_options__ = function(list, service, area){
    const refined = window.__omni_addon_filters__ ? window.__omni_addon_filters__(list, service, area) : list;
    return window.__omni_sort_for_chat__ ? window.__omni_sort_for_chat__(refined) : refined;
  };

})/* ============================================
   16) Subscription Manager & Billing Control
   ============================================ */
(function(){
  const ls = {
    get: (k, def)=>{ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(def)); }catch(e){ return def; } },
    set: (k,v)=> localStorage.setItem(k, JSON.stringify(v)),
  };
  const keys = { partners:'omni_partners', subs:'omni_subscriptions' };

  // Default subscription plans
  const defaultPlans = [
    {id:'monthly_basic', name:'Monthly Basic', price:100, nextPrice:299, cycle:'monthly', trialDays:30, desc:'R100 for first month, then R299/month'},
    {id:'yearly_standard', name:'Yearly Standard', price:2999, cycle:'yearly', trialDays:0, desc:'R2999/year (save R589)'},
  ];
  if(!localStorage.getItem(keys.subs)) ls.set(keys.subs, defaultPlans);

  const HAS = {
    admin: document.querySelector('#partnersTable'),
    contractor: document.querySelector('#appView') || document.querySelector('#loginView'),
  };

  /* =============================
     ADMIN SIDE: Subscription Manager
     ============================= */
  if(HAS.admin){
    const modal = document.querySelector('#aBackdrop .modal');
    const header = document.createElement('div');
    header.style.cssText = 'margin-top:10px;padding:10px;border-top:1px solid #ffffff22;';
    header.innerHTML = `
      <h3>Subscription Manager</h3>
      <p class="small">Add, edit or delete plans. These appear when assigning plans to contractors.</p>
      <button id="addPlanBtn" class="btn">➕ Add Plan</button>
      <div id="planList" style="margin-top:10px"></div>
    `;
    modal.appendChild(header);

    function renderPlans(){
      const plans = ls.get(keys.subs,[]);
      const box = document.getElementById('planList');
      box.innerHTML = '';
      plans.forEach(p=>{
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;background:#191735;padding:6px;border-radius:6px';
        row.innerHTML = `
          <div>
            <b>${p.name}</b> — R${p.price}${p.nextPrice?` → R${p.nextPrice}`:''} (${p.cycle})<br>
            <span class="small">${p.desc||''}</span>
          </div>
          <div>
            <button class="btn" data-edit="${p.id}">Edit</button>
            <button class="btn danger" data-del="${p.id}">Delete</button>
          </div>`;
        box.appendChild(row);
      });
    }
    renderPlans();

    document.getElementById('addPlanBtn').onclick = ()=>{
      const plans = ls.get(keys.subs,[]);
      const name = prompt('Plan name:'); if(!name) return;
      const price = parseFloat(prompt('Price: R','100'))||0;
      const nextPrice = parseFloat(prompt('Next month price (optional): R','299'))||null;
      const cycle = prompt('Cycle: monthly/yearly','monthly');
      const trialDays = parseInt(prompt('Trial days (0 for none):','30'))||0;
      const desc = prompt('Description:','');
      plans.push({id:name.toLowerCase().replace(/\s+/g,'_'), name, price, nextPrice, cycle, trialDays, desc});
      ls.set(keys.subs, plans);
      renderPlans();
      alert('Plan added.');
    };

    document.getElementById('planList').onclick = e=>{
      const edit = e.target.dataset.edit, del = e.target.dataset.del;
      if(edit){
        const plans = ls.get(keys.subs,[]);
        const p = plans.find(x=>x.id===edit);
        if(!p) return;
        const name = prompt('New name:', p.name)||p.name;
        const price = parseFloat(prompt('Price:', p.price))||p.price;
        const nextPrice = parseFloat(prompt('Next month price:', p.nextPrice))||p.nextPrice;
        const cycle = prompt('Cycle (monthly/yearly):', p.cycle)||p.cycle;
        const desc = prompt('Description:', p.desc)||p.desc;
        Object.assign(p,{name,price,nextPrice,cycle,desc});
        ls.set(keys.subs, plans); renderPlans();
      }
      if(del){
        if(confirm('Delete plan?')){
          const plans = ls.get(keys.subs,[]).filter(x=>x.id!==del);
          ls.set(keys.subs, plans); renderPlans();
        }
      }
    };
  }

  /* =============================
     CONTRACTOR SIDE: Subscription display
     ============================= */
  if(HAS.contractor){
    const phone = localStorage.getItem('contractor_phone');
    const me = ()=>{
      const p = ls.get(keys.partners,[]);
      return p.find(x=>x.phone===phone);
    };
    const save = (rec)=>{
      const list = ls.get(keys.partners,[]);
      const i = list.findIndex(x=>x.phone===phone);
      if(i>-1){ list[i]=rec; ls.set(keys.partners,list); }
    };
    const cont = document.querySelector('#view-settings') || document.body;
    const box = document.createElement('div');
    box.innerHTML = `
      <label>Subscription</label>
      <div id="subStatus" class="small" style="color:#cfd3f5"></div>
      <button id="subRenew" class="btn">Renew / Upgrade</button>
    `;
    cont.appendChild(box);

    function formatDate(d){ return new Date(d).toLocaleDateString(); }

    function render(){
      const m = me(); if(!m) return;
      const plans = ls.get(keys.subs,[]);
      const plan = plans.find(p=>p.id===m.subPlan) || plans[0];
      if(!m.subPlan){
        document.getElementById('subStatus').innerHTML = 'No plan active.';
      } else {
        document.getElementById('subStatus').innerHTML = `
          Plan: ${plan?.name||'—'}<br>
          Started: ${m.subStart?formatDate(m.subStart):'—'}<br>
          Next Billing: ${m.subNextBilling?formatDate(m.subNextBilling):'—'}<br>
          Status: ${m.subStatus||'Active'}
        `;
      }
    }
    render();

    document.getElementById('subRenew').onclick = ()=>{
      const plans = ls.get(keys.subs,[]);
      const names = plans.map(p=>`${p.name} (R${p.price})`).join('\n');
      const choice = prompt(`Choose plan:\n${names}`,'Monthly Basic');
      const plan = plans.find(p=>p.name.toLowerCase()===choice.toLowerCase());
      if(!plan){ alert('Not found'); return; }
      const m = me(); if(!m) return;
      const now = new Date();
      const start = now.toISOString();
      const next = new Date(now.getTime() + (plan.cycle==='yearly'?365:30)*86400000).toISOString();
      m.subPlan = plan.id;
      m.subStart = start;
      m.subNextBilling = next;
      m.subStatus = 'Active';
      save(m);
      render();
      alert(`Plan activated: ${plan.name} for R${plan.price}`);
    };
  }
})();/* ============================================
   17) Subscription Auto-Expiry & Reminders
   ============================================ */
(function(){
  const ls = {
    get: (k, def)=>{ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(def)); }catch(e){ return def; } },
    set: (k,v)=> localStorage.setItem(k, JSON.stringify(v)),
  };
  const keys = { partners:'omni_partners' };

  // optional helper if your Telegram integration exists
  async function notifyAdmin(msg){
    try { if (typeof sendTelegram==='function') await sendTelegram(msg); }
    catch(e){ console.warn('Telegram not set'); }
  }

  function checkSubscriptions(){
    const list = ls.get(keys.partners,[]);
    const now = Date.now();
    let changed = false;
    list.forEach(p=>{
      if(!p.subPlan || !p.subNextBilling) return;
      const next = new Date(p.subNextBilling).getTime();
      const diffDays = Math.floor((next - now)/86400000);

      // 3 days before expiry → remind contractor (alert)
      if(diffDays === 3 && p.subStatus!=='Expired' && !p._reminded){
        alert(`⚠️ ${p.business} — subscription expires in 3 days`);
        p._reminded = true;
        changed = true;
      }

      // past due → mark expired + notify admin
      if(diffDays <= 0 && p.subStatus!=='Expired'){
        p.subStatus = 'Expired';
        notifyAdmin(`🚫 ${p.business} subscription expired (${p.phone})`);
        changed = true;
      }
    });
    if(changed) ls.set(keys.partners, list);
  }

  // run once on page load + every 12 hours
  checkSubscriptions();
  setInterval(checkSubscriptions, 12*60*60*1000);
})();
();/* ============================================
   18) Grace Period + Auto-Renew + Revenue Stats
   ============================================ */
(function(){
  const ls = {
    get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch(e){return d;}},
    set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),
  };
  const keys={partners:'omni_partners',subs:'omni_subscriptions',rev:'omni_revenue'};

  async function notify(msg){
    try{ if(typeof sendTelegram==='function') await sendTelegram(msg);}catch(e){}
  }

  function renewIfNeeded(){
    const list=ls.get(keys.partners,[]);
    const plans=ls.get(keys.subs,[]);
    const now=Date.now();
    let revenue=ls.get(keys.rev,[]);
    let changed=false;

    list.forEach(p=>{
      if(!p.subPlan||!p.subNextBilling)return;
      const next=new Date(p.subNextBilling).getTime();
      const diffDays=Math.floor((next-now)/86400000);
      const plan=plans.find(x=>x.id===p.subPlan);

      // 5-day grace period
      if(diffDays<=0 && diffDays>-5 && p.subStatus==='Expired'){
        p.subStatus='Grace Period';
        changed=true;
      }

      // auto-renew
      if(diffDays<=0 && (p.autoRenew||false) && plan){
        const nextBill=new Date(next+(plan.cycle==='yearly'?365:30)*86400000);
        p.subNextBilling=nextBill.toISOString();
        p.subStatus='Active';
        revenue.push({
          contractor:p.business,
          plan:plan.name,
          amount:plan.nextPrice||plan.price,
          date:new Date().toISOString()
        });
        notify(`💸 Auto-renewed ${p.business} • ${plan.name} • R${plan.nextPrice||plan.price}`);
        changed=true;
      }

      // fully expired after grace
      if(diffDays<=-5 && p.subStatus!=='Expired' && !p.autoRenew){
        p.subStatus='Expired';
        notify(`⛔ ${p.business} subscription now fully expired.`);
        changed=true;
      }
    });

    if(changed){
      ls.set(keys.partners,list);
      ls.set(keys.rev,revenue);
    }
  }

  renewIfNeeded();
  setInterval(renewIfNeeded,12*60*60*1000); // twice daily check

  // contractor: auto-renew toggle
  if(document.querySelector('#view-settings')){
    const phone=localStorage.getItem('contractor_phone');
    const partners=ls.get(keys.partners,[]);
    const me=partners.find(x=>x.phone===phone);
    if(me){
      const div=document.createElement('div');
      div.innerHTML=`
        <label>Auto-Renew</label>
        <input type="checkbox" id="autoRenewChk"> Enable automatic renewal
      `;
      document.querySelector('#view-settings').appendChild(div);
      const chk=document.getElementById('autoRenewChk');
      chk.checked=me.autoRenew||false;
      chk.onchange=()=>{
        me.autoRenew=chk.checked;
        ls.set(keys.partners,partners);
        alert(me.autoRenew?'Auto-renew turned ON':'Auto-renew OFF');
      };
    }
  }

  // admin: revenue summary
  if(document.querySelector('#partnersTable')){
    const modal=document.querySelector('#aBackdrop .modal');
    const box=document.createElement('div');
    box.style.cssText='margin-top:10px;padding:10px;border-top:1px solid #ffffff22;';
    box.innerHTML=`
      <h3>Revenue Summary</h3>
      <p class="small">Shows all subscription renewals recorded locally.</p>
      <button id="revShow" class="btn">📊 Show Revenue</button>
      <button id="revClear" class="btn danger">🗑 Clear</button>
    `;
    modal.appendChild(box);

    document.getElementById('revShow').onclick=()=>{
      const rev=ls.get(keys.rev,[]);
      if(!rev.length)return alert('No revenue yet.');
      const total=rev.reduce((a,b)=>a+(b.amount||0),0);
      const msg=rev.slice(-15).map(r=>`${r.contractor} – ${r.plan} R${r.amount} (${new Date(r.date).toLocaleDateString()})`).join('\n');
      alert(`Revenue Summary\nLast 15 Transactions:\n${msg}\n\nTotal Recorded: R${total.toLocaleString()}`);
    };
    document.getElementById('revClear').onclick=()=>{
      if(confirm('Clear revenue log?')){
        localStorage.removeItem(keys.rev);
        alert('Cleared.');
      }
    };
  }
})();

