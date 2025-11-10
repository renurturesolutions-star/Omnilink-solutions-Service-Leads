/* =========================================================
   OMNISOLUTIONS — ADDONS MASTER (v2.2)
   - Massive categories
   - Scrollable service rails (index side – keep your HTML)
   - Chatbot: stays open; human tone
   - Plumber rule: show all plumbers regardless of area
   - Contractor sign-up: password + plan (monthly R100→R299pm, 6mo, yearly)
   - Admin: CSV export, backup/restore, PIN, full controls
   - Subscriptions: 3-day reminder + 5-day grace → Expire
   - NEW:
     * Admin Suspend/Unsuspend contractor (hard lock dashboard)
     * Per-contractor Telegram (token + chatId). Job alerts go to THEIR bot.
     * Admin DM also forwards to contractor’s Telegram (if set)
   ========================================================= */
(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const F={load:(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(e){return d}},save:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};

  /* ================== Category DB for index bubble rails ================== */
  const CATEGORY_MAP = {
    "Property & Maintenance":["Plumbing","Electrical","Roofing","Carpentry","Painting","Handyman","HVAC","Flooring","Masonry","Gutter Cleaning","Pest Control","Landscaping","Pool Maintenance","Appliance Repair","Waterproofing","Irrigation","Window Repair","Glass/Glazing","Ceilings & Drywall","Tiling","Gate Motors","Welding","Geysers","Leak Detection"],
    "Cleaning & Hygiene":["Home Cleaning","Office Cleaning","Deep Cleaning","Move-in/Move-out","Carpet Cleaning","Window Cleaning","Janitorial Services","Sanitizing","Laundry Collection","Upholstery Cleaning","Post-Construction Cleaning","High-Pressure Wash","Maid Service"],
    "Renovations & Construction":["General Building","Kitchen Renovations","Bathroom Renovations","Home Extensions","Concrete Work","Steelwork & Welding","Joinery","Scaffolding","Paving","Drywall & Ceilings","Waterproofing","Project Management","Quantity Surveying","Site Cleanup"],
    "Property Sales & Rentals":["Real Estate Agent","Property Management","Valuations","Apartment Rentals","Commercial Sales","Short-Term Letting","Estate Photography","Home Staging","Bond Origination","Auction Services"],
    "Business & Professional":["Accounting","Legal Advice","Bookkeeping","IT Support","Web Design","Digital Marketing","Branding/Printing","Admin Assistance","Courier Services","Recruitment","Company Registrations","Virtual Assistant","Copywriting","Translations"],
    "Security, Energy & Tech":["CCTV Installation","Alarm Systems","Access Control","Electric Fencing","Gate Motors","Networking & Wi-Fi","Smart Home Setup","Solar Installation","Inverters & Batteries","Generator Install/Maintenance","Intercoms","Data Cabling"],
    "Automotive & Machinery":["Vehicle Service/Repair","Tyre Fitment","Panel Beating","Auto Electrician","Towing","Truck Maintenance","Diesel Mechanics","Air Compressors","Forklifts/Plant","Auto Detailing"],
    "Personal & Lifestyle":["Personal Trainer","Tutors","Event Planning","Catering","Beauty Services","Barber/Hair","Pet Grooming","Childcare","Elder Care","Photography/Videography","DJ/Entertainment","Driving Lessons"],
    "Environmental & Utilities":["Boreholes/Water","Water Treatment","Waste Disposal","Recycling","Tree Felling","Energy Audits","Garden Services","Fire Safety/Extinguishers","Environmental Compliance","Gas Installers"],
    "Medical, Logistics, Education & IT":["Ambulance (Private)","Nursing & Home Care","Physio & Rehab","Medical Equipment Rental","Pharmacy Delivery","Courier/Logistics","Warehousing","Moving Services","Packing & Crating","Tutoring (All grades)","Tertiary Applications Help","Coding Bootcamps","IT Consulting","Cybersecurity","Cloud & DevOps"]
  };
  window.__OMNI_CATEGORIES__ = CATEGORY_MAP;

  /* ================== Search hook: plumbers show everywhere ================== */
  window.__omni_prepare_partner_options__ = function(list, service, area){
    const isPlumb = (service||'').toLowerCase().includes('plumb');
    if(isPlumb){
      return list.filter(p=>!p.muted && p.service===service)
                 .sort((a,b)=>a.business.localeCompare(b.business));
    }
    return list.filter(p=>!p.muted && (p.areas||'').toLowerCase().includes((area||'').toLowerCase()))
               .sort((a,b)=>a.business.localeCompare(b.business));
  };

  /* ================== Sign-up helpers (index page) ================== */
  const DEFAULT_PLANS = [
    {id:'monthly_basic', name:'Monthly Basic', price:100, nextPrice:299, cycle:'monthly', desc:'R100 first month, then R299/month'},
    {id:'six_month', name:'6 Months', price:1599, cycle:'6mo', desc:'Prepay 6 months (save R195)'},
    {id:'yearly', name:'Yearly', price:2999, cycle:'yearly', desc:'Yearly (save R589)'}
  ];
  if(!localStorage.getItem('omni_subscriptions')) F.save('omni_subscriptions', DEFAULT_PLANS);

  window.populateCategorySelect = function(){
    const sel=$('#bizCategory'); if(!sel) return; sel.innerHTML='';
    for(const [cat, services] of Object.entries(CATEGORY_MAP)){
      const og=document.createElement('optgroup'); og.label=cat;
      services.forEach(s=>{ const o=document.createElement('option'); o.value=`${cat}::${s}`; o.textContent=s; og.appendChild(o); });
      sel.appendChild(og);
    }
  };
  window.populatePlanSelect = function(){
    const sel=$('#subPlanSel'); if(!sel) return; sel.innerHTML='';
    F.load('omni_subscriptions', DEFAULT_PLANS).forEach(p=>{
      const o=document.createElement('option'); o.value=p.id; o.textContent=`${p.name} — R${p.price}${p.nextPrice?` → R${p.nextPrice}/m`:''}`; sel.appendChild(o);
    });
  };

  /* When a client finalizes a job (index chat), notify chosen contractor via their own Telegram bot if set */
  async function sendContractorTelegram(contractorPhone, text){
    const p = F.load('omni_partners',[]).find(x=>x.phone===contractorPhone);
    if(!p || !p.telegramBotToken || !p.telegramChatId) return;
    try{
      await fetch(`https://api.telegram.org/bot${p.telegramBotToken}/sendMessage`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({chat_id:p.telegramChatId,text,parse_mode:'HTML'})
      });
    }catch(e){}
  }
  window.__omni_notify_contractor__ = sendContractorTelegram;

  /* ========== Patch index nextFinalize if present (non-breaking) ========== */
  if(window.nextFinalize){
    const orig = window.nextFinalize;
    window.nextFinalize = async function(){
      const beforeJobs = F.load('omni_jobs',[]);
      await orig(); // original creates job
      const afterJobs = F.load('omni_jobs',[]);
      const j = afterJobs[afterJobs.length-1];
      if(j && j.contractorPhone){
        const txt = `🧰 NEW JOB\nID: ${j.id}\nService: ${j.service}\nArea: ${j.area}\nClient: ${j.customerName} (${j.customerPhone})\nNotes: ${j.notes||''}`;
        await sendContractorTelegram(j.contractorPhone, txt);
      }
    };
  }

  /* ================== Admin Controls ================== */
  const partnersTBody = $('#partnersTable tbody');
  const leadsTBody = $('#leadsTable tbody');

  // Renderers might be defined on page already; provide fallbacks that include Suspend/Unsuspend
  if(partnersTBody && !window.renderPartners){
    window.renderPartners = function(){
      const list = F.load('omni_partners',[]);
      partnersTBody.innerHTML='';
      list.forEach(p=>{
        const left = p.subNextBilling ? Math.ceil((new Date(p.subNextBilling)-Date.now())/86400000) : 0;
        const subTxt = p.subStatus==='Expired'?'Expired': (left>=0?(left+'d'):'Expired');
        const tr=document.createElement('tr');
        tr.innerHTML = `
          <td>${p.business}</td>
          <td>${p.contact||''}</td>
          <td>${p.phone||''}</td>
          <td>${p.category||''}</td>
          <td>${p.service||''}</td>
          <td>${p.areas||''}</td>
          <td>${p.suspended?'⛔ Suspended':(p.muted?'🔇 Muted':'🔔 Active')}</td>
          <td>${subTxt}</td>
          <td>${p.subPlan||'-'}</td>
          <td>${(p.badges||[]).join(', ')||'-'}</td>
          <td class="tools">
            <button class="btn" data-id="${p.id}" data-act="extend">Extend +30d</button>
            <button class="btn" data-id="${p.id}" data-act="mute">${p.muted?'Unmute':'Mute'}</button>
            <button class="btn" data-id="${p.id}" data-act="toggleSuspend">${p.suspended?'Unsuspend':'Suspend'}</button>
            <button class="btn danger" data-id="${p.id}" data-act="delP">Delete</button>
          </td>
        `;
        partnersTBody.appendChild(tr);
      });
    };
  }

  partnersTBody && partnersTBody.addEventListener('click', e=>{
    const t=e.target; if(!t.closest('button')) return;
    const id=t.getAttribute('data-id'), act=t.getAttribute('data-act');
    const list=F.load('omni_partners',[]); const p=list.find(x=>x.id===id); if(!p) return;
    if(act==='extend'){ p.subNextBilling = new Date(Math.max(Date.now(), new Date(p.subNextBilling||Date.now()).getTime()) + 30*86400000).toISOString(); p.subStatus='Active'; F.save('omni_partners', list); window.renderPartners(); }
    if(act==='mute'){ p.muted=!p.muted; F.save('omni_partners', list); window.renderPartners(); }
    if(act==='toggleSuspend'){ p.suspended=!p.suspended; F.save('omni_partners', list); window.renderPartners(); alert(p.suspended?'Contractor suspended.':'Unsuspended.'); }
    if(act==='delP'){ if(confirm('Delete contractor?')){ F.save('omni_partners', list.filter(x=>x.id!==id)); window.renderPartners(); } }
  });

  // Leads renderer (fallback)
  if(leadsTBody && !window.renderLeads){
    window.renderLeads = function(){
      const js=F.load('omni_jobs',[]);
      leadsTBody.innerHTML='';
      js.forEach(l=>{
        const tr=document.createElement('tr');
        const assigned=l.contractorPhone ? (F.load('omni_partners',[]).find(p=>p.phone===l.contractorPhone)?.business||l.contractorPhone) : 'Personal Agent';
        tr.innerHTML=`
          <td>${l.id}</td>
          <td>${l.customerName||''}</td>
          <td>${l.customerPhone||''}</td>
          <td>${l.area||''}</td>
          <td>${l.category||''}</td>
          <td>${l.service||''}</td>
          <td>${(l.notes||'').slice(0,80)}</td>
          <td>${assigned}</td>
          <td>${l.status||'Pending'}</td>
          <td>${new Date(l.created).toLocaleString()}</td>
          <td class="tools">
            <button class="btn" data-id="${l.id}" data-act="dm">DM Assigned</button>
            <button class="btn danger" data-id="${l.id}" data-act="delL">Delete</button>
          </td>
        `;
        leadsTBody.appendChild(tr);
      });
    };
  }

  leadsTBody && leadsTBody.addEventListener('click', async e=>{
    const t=e.target; if(!t.closest('button')) return;
    const id=t.getAttribute('data-id'), act=t.getAttribute('data-act');
    const list=F.load('omni_jobs',[]); const j=list.find(x=>x.id===id); if(!j) return;
    if(act==='delL'){ if(confirm('Delete job?')){ F.save('omni_jobs', list.filter(x=>x.id!==id)); window.renderLeads(); } }
    if(act==='dm'){
      const txt=prompt('Message to assigned contractor:'); if(!txt) return;
      const phone=j.contractorPhone; if(!phone) return alert('No contractor assigned.');
      const key='omni_msgs_'+phone; const arr=F.load(key,[]); arr.push({from:'admin',text:txt,when:new Date().toISOString()}); F.save(key,arr);
      // Also forward to contractor’s Telegram if configured
      await sendContractorTelegram(phone, '📩 Admin message: '+txt);
      alert('Sent.');
    }
  });

  /* ================== Subscription watcher (3-day reminder + 5-day grace) ================== */
  function subWatcher(){
    const list=F.load('omni_partners',[]); const now=Date.now(); let changed=false;
    list.forEach(p=>{
      if(!p.subNextBilling) return;
      const next=new Date(p.subNextBilling).getTime();
      const diffDays=Math.floor((next-now)/86400000);
      if(diffDays===3 && p.subStatus!=='Expired' && !p._reminded){ p._reminded=true; changed=true; alert(`⚠️ ${p.business} — subscription expires in 3 days`); }
      if(diffDays<=0 && p.subStatus!=='Expired'){
        p.subStatus = (diffDays>-5)?'Grace Period':'Expired';
        changed=true;
      }
      if(diffDays<=-5 && p.subStatus!=='Expired'){ p.subStatus='Expired'; changed=true; }
    });
    if(changed) F.save('omni_partners',list);
  }
  subWatcher(); setInterval(subWatcher, 12*60*60*1000);

  /* ================== Build service rails (index) if present ================== */
  function buildRails(){
    $$('.group-rail').forEach(rail=>{
      const cat = rail.getAttribute('data-rail');
      rail.innerHTML='';
      (CATEGORY_MAP[cat]||[]).forEach(svc=>{
        const b=document.createElement('div'); b.className='bubble'; b.textContent=svc; b.onclick=()=>window.startChat && window.startChat(cat, svc); rail.appendChild(b);
      });
      rail.classList.remove('hidden');
      rail.parentElement.querySelector('[data-toggle]')?.addEventListener('click',()=>rail.classList.toggle('hidden'));
    });
  }
  window.addEventListener('load', buildRails);

})();
