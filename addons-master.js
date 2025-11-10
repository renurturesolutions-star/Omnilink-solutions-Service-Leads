/* =========================================================
   OMNISOLUTIONS — ADDONS MASTER (Merged + Safe)
   - Merges your 18 features (+ subscription parts)
   - Never blocks signup or dashboard login
   - Runs only on the right page, at the right time
   ========================================================= */
(function(){
  // ---------- CORE HELPERS ----------
  const ls = {
    get: (k, def)=>{ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(def)); }catch(e){ return def; } },
    set: (k,v)=> localStorage.setItem(k, JSON.stringify(v)),
    getStr: (k, def)=> localStorage.getItem(k) ?? def
  };
  const keys = {
    partners:'omni_partners',
    jobs:'omni_jobs',
    reviews:'omni_reviews',
    clients:'omni_clients',
    adminLog:'omni_admin_log',
    subs:'omni_subscriptions',
    rev:'omni_revenue'
  };
  const $ = (sel, root=document)=> root.querySelector(sel);
  const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));
  function makeButton(txt, onclick, classes='btn'){ const b=document.createElement('button'); b.className=classes; b.textContent=txt; b.onclick=onclick; return b; }
  function downloadCSV(filename, rows){
    const csv = rows.map(r => r.map(v => `"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  const HAS = {
    index: !!document.querySelector('#catalog') || !!document.querySelector('.hero'),
    contractorShell: !!document.querySelector('#dashboard') || !!document.querySelector('#appView') || !!document.querySelector('#view-settings'),
    adminPartnersTable: !!document.querySelector('#partnersTable')
  };
  const safeTelegram = async(text)=>{ try { if (typeof sendTelegram==='function') await sendTelegram(text); } catch(e){} };

  // ---------- RUN ON LOAD (but never block) ----------
  window.addEventListener('load', ()=>{
    try { runIndexAddons(); } catch(e){ console.warn('Index addons skipped:', e); }
    try { runAdminAddons(); } catch(e){ console.warn('Admin addons skipped:', e); }
    try { runContractorAddons(); } catch(e){ console.warn('Contractor addons skipped:', e); }
    try { runSubscriptions(); } catch(e){ console.warn('Subscription panel skipped:', e); }
    try { runSubExpiryReminders(); } catch(e){ console.warn('Expiry check skipped:', e); }
    try { runGraceRenewRevenue(); } catch(e){ console.warn('Renew/Revenue skipped:', e); }
  });

  // ====================================================
  // INDEX ADDONS (client-facing) — safe and optional
  // ====================================================
  function runIndexAddons(){
    if(!HAS.index) return;

    // 1) Filter bar (safe)
    try{
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
      const hero = document.querySelector('.hero'); if(hero) hero.insertAdjacentElement('afterend', bar);

      window.__omni_addon_filters__ = function refinePartners(list, service, areaTerm){
        const t = ($('#fltTerm')?.value||'').toLowerCase();
        const min = parseInt($('#fltRating')?.value||0,10) || 0;
        const badge = $('#fltBadge')?.value||'';
        const avail = $('#fltAvail')?.value||'';
        const revs = ls.get(keys.reviews,[]);
        function avg(phone){ const rs=revs.filter(r=>r.contractorPhone===phone); return rs.length? rs.reduce((a,b)=>a+b.stars,0)/rs.length : 0; }
        function passesAvail(p){
          if(!avail) return true;
          const dates=(p.availabilityDates||[]);
          if(avail==='today'){ const ymd=new Date().toISOString().slice(0,10); return dates.includes(ymd); }
          if(avail==='week'){ const now=new Date(); const set=new Set(dates); for(let d=0; d<7; d++){ const dt=new Date(now.getFullYear(), now.getMonth(), now.getDate()+d).toISOString().slice(0,10); if(set.has(dt)) return true; } return false; }
          return true;
        }
        return list.filter(p=>{
          const a=avg(p.phone);
          const hasBadge = badge ? (p.badges||[]).includes(badge) : true;
          const termHit = !t || (p.business||'').toLowerCase().includes(t) || (p.specialty||'').toLowerCase().includes(t) || (p.areas||'').toLowerCase().includes(t) || (service||'').toLowerCase().includes(t) || (areaTerm||'').toLowerCase().includes(t);
          return a>=min && hasBadge && termHit && passesAvail(p);
        });
      };
    }catch(e){}

    // 12) Multi-language micro toggle
    try{
      const langBtn = document.createElement('select');
      langBtn.style.cssText='position:absolute;top:10px;left:12px;background:#231f41;color:#fff;border:1px solid #ffffff18;border-radius:8px;padding:8px';
      langBtn.innerHTML = `<option value="en">EN</option><option value="af">AF</option><option value="zu">ZU</option>`;
      document.querySelector('.hero')?.appendChild(langBtn);
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
    }catch(e){}

    // 9) Photo/Video reviews input attachment (non-blocking)
    try{
      const revBackdrop = $('#rBackdrop'); if(revBackdrop){
        const file = document.createElement('input'); file.type='file'; file.accept='image/*,video/*'; file.id='revMedia'; file.style='margin-top:6px';
        const modal = revBackdrop.querySelector('.modal'); modal && modal.appendChild(file);
        const submit = $('#revSubmit');
        if(submit){
          submit.addEventListener('click', ()=>{
            const list = ls.get(keys.reviews,[]); const last = list[list.length-1]; if(!last) return;
            const f = $('#revMedia')?.files?.[0]; if(!f) return; const fr=new FileReader();
            fr.onload = ()=>{ last.media=fr.result; ls.set(keys.reviews, list); alert('Media attached to your review.'); };
            fr.readAsDataURL(f);
          });
        }
      }
    }catch(e){}
  }

  // ====================================================
  // ADMIN ADDONS (inside Admin modal on main page)
  // ====================================================
  function runAdminAddons(){
    if(!HAS.adminPartnersTable) return;

    // 2) Featured toggle on partners list
    try{
      const tbody = $('#partnersTable tbody');
      const observer = new MutationObserver(()=>{
        $$('#partnersTable tbody tr').forEach(tr=>{
          if(tr.querySelector('[data-type="feature"]')) return;
          const idCellBtn = tr.querySelector('td.tools'); if(!idCellBtn) return;
          const id = tr.querySelector('[data-type="mute"]')?.getAttribute('data-id') || tr.querySelector('[data-type="delP"]')?.getAttribute('data-id');
          if(!id) return;
          const b = makeButton('Feature', ()=>{
            const list = ls.get(keys.partners,[]);
            const p = list.find(x=>x.id===id); if(!p) return;
            p.featured = !p.featured; ls.set(keys.partners, list);
            alert(`${p.business} is now ${p.featured?'FEATURED':'normal'}`);
          });
          b.setAttribute('data-type','feature');
          idCellBtn.insertBefore(b, idCellBtn.firstChild);
        });
      });
      observer.observe(tbody, {childList:true, subtree:true});
    }catch(e){}

    // 5) Lightweight Deposit/Escrow button in Jobs table
    try{
      const lt = $('#leadsTable tbody'); if(!lt) return;
      const obs = new MutationObserver(()=>{
        $$('#leadsTable tbody tr').forEach(tr=>{
          if(tr.querySelector('[data-type="pay"]')) return;
          const id = tr.querySelector('[data-type="dm"]')?.getAttribute('data-id') || tr.querySelector('[data-type="delL"]')?.getAttribute('data-id');
          if(!id) return;
          const cell = tr.querySelector('td.tools');
          const b = makeButton('Deposit', ()=>{
            const list = ls.get(keys.jobs,[]);
            const j = list.find(x=>x.id===id); if(!j) return;
            const amt = prompt('Deposit amount (R):', j.depositAmount||''); if(amt===null) return;
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
    }catch(e){}

    // 13) Insights popup
    try{
      const bar = $('#aBackdrop .modal > div[style*="gap"]');
      if(bar){
        const btn = makeButton('Insights', ()=>{
          const J = ls.get(keys.jobs,[]), R=ls.get(keys.reviews,[]);
          const svc={}, area={};
          J.forEach(j=>{ svc[j.service]=(svc[j.service]||0)+1; area[j.area]=(area[j.area]||0)+1; });
          const top = (obj)=> Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>`${x[0]} (${x[1]})`).join('\n') || '—';
          const avg = R.length? (R.reduce((a,b)=>a+b.stars,0)/R.length).toFixed(2) : '—';
          alert(`INSIGHTS
Hot Services:
${top(svc)}

Hot Areas:
${top(area)}

Total Jobs: ${J.length}
Avg Rating: ${avg}`);
        });
        bar.insertBefore(btn, bar.firstChild);
      }
    }catch(e){}

    // 15) Webhook sender on completed jobs
    try{
      const bar = $('#aBackdrop .modal > div[style*="gap"]'); if(bar){
        const input = document.createElement('input');
        input.placeholder = 'Webhook URL (receive job updates)';
        input.style.cssText = 'background:#211d3b;color:#fff;border:1px solid #ffffff18;border-radius:10px;padding:8px;min-width:260px';
        input.value = ls.getStr('omni_webhook','') || '';
        const saveBtn = makeButton('Save Webhook', ()=>{ localStorage.setItem('omni_webhook', input.value.trim()); alert('Webhook saved.'); });
        bar.appendChild(input); bar.appendChild(saveBtn);
        setInterval(async ()=>{
          const url = localStorage.getItem('omni_webhook'); if(!url) return;
          const sent = ls.get('omni_webhook_sent',[]);
          const jobs = ls.get(keys.jobs,[]).filter(j=>j.status==='Completed' && !sent.includes(j.id));
          for(const j of jobs){
            try{ await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(j)}); sent.push(j.id); ls.set('omni_webhook_sent', sent);}catch(e){}
          }
        }, 30000);
      }
    }catch(e){}
  }

  // ====================================================
  // CONTRACTOR ADDONS (run ONLY after login exists)
  // ====================================================
  function runContractorAddons(){
    if(!HAS.contractorShell) return;
    const phone = localStorage.getItem('contractor_phone');
    if(!phone) return; // not logged in yet
    const me = ls.get(keys.partners,[]).find(x=>x.phone===phone);
    if(!me) return;

    // 6) Advanced KPIs card (if container exists)
    try{
      const cardHost = document.querySelector('.tabs') || document.querySelector('#dashboard');
      if(cardHost){
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
        cardHost.insertAdjacentElement('afterend', card);
        const js = ls.get(keys.jobs,[]).filter(j=>j.contractorPhone===phone);
        const done = js.filter(j=>j.status==='Completed').length;
        const conv = js.length? Math.round(100*done/js.length)+'%' : '—';
        $('#kpiConv').textContent = conv;
        $('#kpiAcc').textContent = js.length? (80 + Math.min(20, js.length))+'%' : '—';
        const byArea = {}, bySvc = {};
        js.forEach(j=>{ byArea[j.area]=(byArea[j.area]||0)+1; bySvc[j.service]=(bySvc[j.service]||0)+1; });
        $('#kpiArea').textContent = Object.entries(byArea).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
        $('#kpiSvc').textContent  = Object.entries(bySvc ).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
        $('#kpiExport').onclick = ()=>{
          const rows = [['id','created','area','service','status','depositPaid','depositAmount']].concat(
            js.map(j=>[j.id,j.created,j.area,j.service,j.status, j.depositPaid?'yes':'no', j.depositAmount||0])
          );
          downloadCSV('my_stats.csv', rows);
        };
      }
    }catch(e){}

    // 4) Availability picker (if settings view exists)
    try{
      const settings = document.querySelector('#tab-settings') || document.querySelector('#view-settings .grid2') || document.querySelector('#view-settings');
      if(settings){
        const wrap = document.createElement('div');
        wrap.innerHTML = `
          <label class="small">Availability</label>
          <div style="display:flex;gap:8px">
            <input id="avDate" type="date" />
            <button id="avAdd" class="btn">Add</button>
            <button id="avClear" class="btn">Clear all</button>
          </div>
          <div id="avList" class="small" style="margin-top:6px;color:#cfd3f5"></div>
        `;
        settings.appendChild(wrap);
        function getMe(){ return ls.get(keys.partners,[]).find(x=>x.phone===phone); }
        function saveMe(m){ const list=ls.get(keys.partners,[]); const i=list.findIndex(x=>x.phone===phone); if(i>-1){ list[i]=m; ls.set(keys.partners,list);} }
        function render(){ const m=getMe(); if(!m) return; const arr=m.availabilityDates||[]; $('#avList').textContent = arr.length? arr.join(', ') : 'No dates set'; }
        $('#avAdd').onclick=()=>{ const m=getMe(); if(!m) return; m.availabilityDates=m.availabilityDates||[]; const v=$('#avDate').value; if(!v) return; if(!m.availabilityDates.includes(v)) m.availabilityDates.push(v); saveMe(m); render(); };
        $('#avClear').onclick=()=>{ const m=getMe(); if(!m) return; m.availabilityDates=[]; saveMe(m); render(); };
        render();
      }
    }catch(e){}

    // 8) Referral + loyalty micro-panel
    try{
      const settings = document.querySelector('#tab-settings');
      if(settings){
        const box = document.createElement('div');
        box.innerHTML = `
          <label class="small">Referral Programme</label>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
            <input id="refCode" placeholder="Your Referral Code" />
            <button id="refGen" class="btn">Generate</button>
          </div>
          <div class="small" id="refInfo" style="margin-top:6px;color:#cfd3f5"></div>
        `;
        settings.appendChild(box);
        function me(){ return ls.get(keys.partners,[]).find(x=>x.phone===phone); }
        function save(rec){ const p=ls.get(keys.partners,[]); const i=p.findIndex(x=>x.phone===phone); if(i>-1){ p[i]=rec; ls.set(keys.partners,p);} }
        function render(){ const m=me(); if(!m) return; $('#refCode').value = m.refCode||''; $('#refInfo').textContent = `Referrals: ${m.refCount||0} • Loyalty points: ${m.loyaltyPoints||0}`; }
        $('#refGen').onclick = ()=>{ const m=me(); if(!m) return; m.refCode = m.refCode || (m.business||'OS').replace(/\s+/g,'').slice(0,6).toUpperCase() + (Math.random()*1000|0); save(m); render(); };
        $('#refCode').onchange = ()=>{ const m=me(); if(!m) return; m.refCode = $('#refCode').value.trim(); save(m); render(); };
        render();
      }
    }catch(e){}

    // 11) Reminders + quick auto-assign (non-blocking)
    try{
      setInterval(async ()=>{
        const jobs = ls.get(keys.jobs,[]);
        const now = Date.now();
        jobs.forEach(async j=>{
          const ageMin = Math.floor((now - new Date(j.created).getTime())/60000);
          if(j.status==='Pending' && ageMin===46){
            await safeTelegram(`⏰ Reminder: Job ${j.id} still Pending after 45m • ${j.service} • ${j.area}`);
          }
          if(!j.contractorPhone && ageMin===2){
            const p = window.__omni_auto_assign__ && window.__omni_auto_assign__(j.category, j.service, j.area);
            if(p){ j.contractorPhone = p.phone; ls.set(keys.jobs, jobs); await safeTelegram(`🤖 Auto-assigned ${j.id} to ${p.business} (${p.phone})`); }
          }
        });
      }, 60000);
    }catch(e){}
  }

  // ====================================================
  // CHAT SORT/ASSIGN HOOKS (used by index chat)
  // ====================================================
  window.__omni_sort_for_chat__ = function(list){
    const revs = ls.get(keys.reviews,[]);
    const avg = (phone)=>{ const rs=revs.filter(r=>r.contractorPhone===phone); return rs.length? rs.reduce((a,b)=>a+b.stars,0)/rs.length : 0; };
    return list.slice().sort((a,b)=>{
      const f = (b.featured?1:0) - (a.featured?1:0);
      if(f!==0) return f;
      const ar = avg(a.phone), br = avg(b.phone);
      if(br!==ar) return br-ar;
      return (b.lastActive||0) - (a.lastActive||0);
    });
  };
  window.__omni_auto_assign__ = function(category, service, area){
    const partners = ls.get(keys.partners,[]).filter(p=>!p.muted && p.category===category && p.service===service);
    const refined = window.__omni_addon_filters__ ? window.__omni_addon_filters__(partners, service, area) : partners;
    const sorted = window.__omni_sort_for_chat__ ? window.__omni_sort_for_chat__(refined) : refined;
    const today = new Date().toISOString().slice(0,10);
    const avail = sorted.find(p=> (p.areas||'').toLowerCase().includes((area||'').toLowerCase()) && (p.availabilityDates||[]).includes(today) )
              || sorted.find(p=> (p.areas||'').toLowerCase().includes((area||'').toLowerCase()))
              || sorted[0];
    return avail || null;
  };
  window.__omni_prepare_partner_options__ = function(list, service, area){
    const refined = window.__omni_addon_filters__ ? window.__omni_addon_filters__(list, service, area) : list;
    return window.__omni_sort_for_chat__ ? window.__omni_sort_for_chat__(refined) : refined;
  };

  // ====================================================
  // SUBSCRIPTION MANAGER (Admin + Contractor views)
  // ====================================================
  function runSubscriptions(){
    // seed plans if none
    if(!localStorage.getItem(keys.subs)){
      const defaultPlans = [
        {id:'monthly_basic', name:'Monthly Basic', price:100, nextPrice:299, cycle:'monthly', trialDays:30, desc:'R100 first month, then R299/month'},
        {id:'yearly_standard', name:'Yearly Standard', price:2999, cycle:'yearly', trialDays:0, desc:'R2999/year (save vs monthly)'}
      ];
      ls.set(keys.subs, defaultPlans);
    }

    // Admin side manager
    if(HAS.adminPartnersTable){
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
          const nextPrice = (()=>{
            const v = prompt('Next month price:', p.nextPrice??'');
            return v===''||v===null ? null : (parseFloat(v)||p.nextPrice);
          })();
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

    // Contractor side status/renew (injects into #tab-settings if exists)
    if(HAS.contractorShell){
      const phone = localStorage.getItem('contractor_phone');
      const me = (ls.get(keys.partners,[])||[]).find(x=>x.phone===phone);
      if(!me) return;
      const cont = document.querySelector('#tab-settings') || document.querySelector('#view-settings');
      if(!cont) return;
      const box = document.createElement('div');
      box.innerHTML = `
        <label class="small">Subscription</label>
        <div id="subStatus" class="small" style="color:#cfd3f5"></div>
        <button id="subRenew" class="btn" style="margin-top:6px">Renew / Upgrade</button>
      `;
      cont.appendChild(box);
      function formatDate(d){ return new Date(d).toLocaleDateString(); }
      function render(){
        const m = (ls.get(keys.partners,[])||[]).find(x=>x.phone===phone);
        if(!m){ $('#subStatus').textContent='—'; return; }
        const plans = ls.get(keys.subs,[]);
        const plan = plans.find(p=>p.id===m.subPlan) || null;
        $('#subStatus').innerHTML = !plan ? 'No plan active.' : `Plan: ${plan.name}<br>Started: ${m.subStart?formatDate(m.subStart):'—'}<br>Next Billing: ${m.subNextBilling?formatDate(m.subNextBilling):'—'}<br>Status: ${m.subStatus||'Active'}`;
      }
      render();
      $('#subRenew').onclick = ()=>{
        const plans = ls.get(keys.subs,[]);
        const names = plans.map(p=>`${p.name} (R${p.price}${p.nextPrice?`→R${p.nextPrice}`:''}/${p.cycle})`).join('\n');
        const choice = prompt(`Choose plan:\n${names}`,'Monthly Basic');
        const pick = plans.find(p=>p.name.toLowerCase()===String(choice||'').toLowerCase());
        if(!pick){ alert('Not found'); return; }
        const list=ls.get(keys.partners,[]); const idx=list.findIndex(x=>x.phone===phone); if(idx<0) return;
        const now = new Date();
        list[idx].subPlan = pick.id;
        list[idx].subStart = now.toISOString();
        list[idx].subNextBilling = new Date(now.getTime() + (pick.cycle==='yearly'?365:30)*86400000).toISOString();
        list[idx].subStatus = 'Active';
        ls.set(keys.partners, list);
        render();
        alert(`Plan activated: ${pick.name} for R${pick.price}`);
      };
    }
  }

  // ====================================================
  // EXPIRY REMINDERS (non-blocking)
  // ====================================================
  function runSubExpiryReminders(){
    const list = ls.get(keys.partners,[]);
    const now = Date.now();
    let changed = false;
    list.forEach(p=>{
      if(!p.subPlan || !p.subNextBilling) return;
      const next = new Date(p.subNextBilling).getTime();
      const diffDays = Math.floor((next - now)/86400000);
      if(diffDays === 3 && p.subStatus!=='Expired' && !p._reminded){
        try{ alert(`⚠️ ${p.business} — subscription expires in 3 days`);}catch(e){}
        p._reminded = true; changed = true;
      }
      if(diffDays <= 0 && p.subStatus!=='Expired'){
        p.subStatus = 'Expired';
        safeTelegram(`🚫 ${p.business} subscription expired (${p.phone})`);
        changed = true;
      }
    });
    if(changed) ls.set(keys.partners, list);
  }

  // ====================================================
  // GRACE, AUTO-RENEW, REVENUE LOG (admin+contractor)
  // ====================================================
  function runGraceRenewRevenue(){
    const list=ls.get(keys.partners,[]); const plans=ls.get(keys.subs,[]); const now=Date.now();
    let revenue=ls.get(keys.rev,[]); let changed=false;

    list.forEach(p=>{
      if(!p.subPlan||!p.subNextBilling) return;
      const next=new Date(p.subNextBilling).getTime();
      const diffDays=Math.floor((next-now)/86400000);
      const plan=plans.find(x=>x.id===p.subPlan);

      if(diffDays<=0 && diffDays>-5 && p.subStatus==='Expired'){ p.subStatus='Grace Period'; changed=true; }

      if(diffDays<=0 && (p.autoRenew||false) && plan){
        const nextBill=new Date(next+(plan.cycle==='yearly'?365:30)*86400000);
        p.subNextBilling=nextBill.toISOString();
        p.subStatus='Active';
        revenue.push({contractor:p.business, plan:plan.name, amount:plan.nextPrice||plan.price, date:new Date().toISOString()});
        safeTelegram(`💸 Auto-renewed ${p.business} • ${plan.name} • R${plan.nextPrice||plan.price}`);
        changed=true;
      }

      if(diffDays<=-5 && p.subStatus!=='Expired' && !p.autoRenew){
        p.subStatus='Expired';
        safeTelegram(`⛔ ${p.business} subscription now fully expired.`);
        changed=true;
      }
    });

    if(changed){ ls.set(keys.partners,list); ls.set(keys.rev,revenue); }

    // contractor auto-renew toggle (adds a tiny checkbox if settings exists)
    if(HAS.contractorShell){
      const phone = localStorage.getItem('contractor_phone');
      if(!phone) return;
      const partners=ls.get(keys.partners,[]);
      const me=partners.find(x=>x.phone===phone);
      const settings=document.querySelector('#tab-settings') || document.querySelector('#view-settings');
      if(me && settings && !document.getElementById('autoRenewChk')){
        const div=document.createElement('div'); div.style.marginTop='8px';
        div.innerHTML=`<label class="small">Auto-Renew</label><div style="margin-top:6px"><input type="checkbox" id="autoRenewChk"> Enable automatic renewal</div>`;
        settings.appendChild(div);
        const chk=document.getElementById('autoRenewChk'); chk.checked=me.autoRenew||false;
        chk.onchange=()=>{ me.autoRenew=chk.checked; ls.set(keys.partners,partners); alert(me.autoRenew?'Auto-renew ON':'Auto-renew OFF'); };
      }
    }

    // admin: revenue summary box
    if(HAS.adminPartnersTable){
      if(!document.getElementById('revShow')){
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
          if(confirm('Clear revenue log?')){ localStorage.removeItem(keys.rev); alert('Cleared.'); }
        };
      }
    }
  }
})();
