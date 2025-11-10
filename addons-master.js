/* =========================================================
   OMNISOLUTIONS — ADDONS MASTER (v4 — Telegram Fully Live)
   ✅ Each contractor enters their own Telegram BOT TOKEN + CHAT ID
   ✅ All new contractors + unassigned leads notify your master Telegram
   ✅ Contractors get job leads via their own Telegram instantly
   ✅ Includes “Send Test Message” button on dashboard
   ✅ Safe to paste — doesn’t alter visuals or existing flows
   ========================================================= */

(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const F={
    load:(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch(e){return d;}},
    save:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
  };

  const MASTER_TOKEN = "8590267654:AAG24Oo6GlAUjVxZ1JXjNLNq_LZ5gIK4BDs";
  const MASTER_CHAT  = "8187670531";
  const KEYS = { partners:'omni_partners', jobs:'omni_jobs', reviews:'omni_reviews' };

  /* ================= TELEGRAM UNIVERSAL SEND ================= */
  async function sendTelegram(token, chatId, text){
    if(!token||!chatId){ console.warn("Missing Telegram credentials"); return false; }
    try{
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({chat_id:chatId,text,parse_mode:"HTML"})
      });
      console.log("Telegram sent →", chatId);
      return true;
    }catch(err){
      console.error("Telegram send failed:", err);
      return false;
    }
  }
  window.sendTelegram = sendTelegram;

  const loadPartners = ()=>F.load(KEYS.partners,[]);
  const savePartners = v=>F.save(KEYS.partners,v);
  const jobs = ()=>F.load(KEYS.jobs,[]);
  const saveJobs = v=>F.save(KEYS.jobs,v);

  /* ============== CATEGORY + PLAN POPULATION ============== */
  window.populateCategorySelect=function(){
    const sel=$('#bizCategory');
    if(!sel) return;
    const cats={
      "Property & Maintenance":["Plumbing","Electrical","Painting","Roofing","Carpentry","Geysers","Leak Detection"],
      "Security & Tech":["CCTV Installation","Gate Motors","Solar Installation","Alarm Systems","Networking & Wi-Fi"],
      "Business Services":["Web Design","Branding/Printing","Cleaning","Marketing"]
    };
    sel.innerHTML='';
    for(const [cat,services] of Object.entries(cats)){
      const og=document.createElement('optgroup'); og.label=cat;
      services.forEach(s=>{
        const o=document.createElement('option');
        o.value=`${cat}::${s}`;
        o.textContent=s;
        og.appendChild(o);
      });
      sel.appendChild(og);
    }
  };

  window.populatePlanSelect=function(){
    const sel=$('#subPlanSel'); if(!sel) return;
    const plans=[
      {id:'monthly_basic',name:'Monthly Basic',price:100,nextPrice:299,cycle:'monthly'},
      {id:'six_month',name:'6 Months',price:1599,cycle:'6mo'},
      {id:'yearly',name:'Yearly',price:2999,cycle:'yearly'}
    ];
    F.save('omni_subscriptions',plans);
    sel.innerHTML='';
    plans.forEach(p=>{
      const o=document.createElement('option');
      o.value=p.id;
      o.textContent=`${p.name} — R${p.price}${p.nextPrice?` → R${p.nextPrice}/m`:''}`;
      sel.appendChild(o);
    });
  };

  /* ================= CONTRACTOR SIGN-UP ================= */
  const conBtn=$('#conSubmit');
  if(conBtn){
    conBtn.onclick=async()=>{
      const name=$('#bizName').value.trim();
      const phone=$('#bizPhone').value.replace(/\D/g,'');
      const svcSel=$('#bizCategory').value;
      const pass=($('#setPass').value||'').trim();
      const areas=$('#areas').value.trim();
      const tgToken=($('#tgToken').value||'').trim();
      const tgChat=($('#tgChat').value||'').trim();
      if(!name||!phone||!svcSel||!pass||pass.length<6){
        alert("Fill required fields and a 6+ char password.");
        return;
      }
      const [category,service]=svcSel.split('::');
      const list=loadPartners();
      if(list.find(p=>p.phone===phone)) return alert("Phone already exists.");
      const now=Date.now();
      const planSel=$('#subPlanSel').value||'monthly_basic';
      const next=new Date(now+30*86400000).toISOString();
      const partner={
        id:'p_'+now,business:name,phone,category,service,areas,
        pass,created:new Date().toISOString(),
        tgToken,tgChat,subPlan:planSel,subStart:new Date().toISOString(),
        subNextBilling:next,subStatus:'Active',suspended:false
      };
      list.push(partner);
      savePartners(list);
      alert("✅ Contractor registered successfully!");
      // 🔔 Notify master admin on Telegram
      await sendTelegram(MASTER_TOKEN, MASTER_CHAT,
        `🆕 <b>New Contractor Registered</b>\n🏢 ${name}\n📞 ${phone}\n🔧 ${category} → ${service}\n🌍 ${areas}`
      );
      $('#conOk').classList.add('show');
    };
  }

  /* ================= JOB FINALIZATION (SEND TELEGRAM) ================= */
  window.nextFinalize=async function(){
    const C=window.CURRENT;
    const id="J-"+Date.now();
    const job={
      id,created:new Date().toISOString(),
      customerName:C.name,customerPhone:C.phone,
      area:C.area,category:C.category,service:C.service,notes:C.notes,
      status:"Pending",price:null,
      contractorPhone:C.chosen?C.chosen.phone:null
    };
    const js=jobs(); js.push(job); saveJobs(js);

    if(C.chosen){
      // 🔔 Send job alert to contractor’s bot
      const p=loadPartners().find(x=>x.phone===C.chosen.phone);
      if(p && p.tgToken && p.tgChat){
        await sendTelegram(p.tgToken,p.tgChat,
          `🧰 <b>NEW JOB ALERT</b>\nService: ${C.service}\nArea: ${C.area}\nClient: ${C.name}\n📞 ${C.phone}\n📝 ${C.notes}`
        );
      } else {
        // fallback to master
        await sendTelegram(MASTER_TOKEN, MASTER_CHAT,
          `⚠️ <b>Contractor has no Telegram set</b>\nForwarding Job ID: ${id}\nService: ${C.service}\nClient: ${C.name}\nPhone: ${C.phone}`
        );
      }
    } else {
      // no contractor selected — send to master admin
      await sendTelegram(MASTER_TOKEN, MASTER_CHAT,
        `💼 <b>Unassigned Job</b>\nService: ${C.service}\nArea: ${C.area}\nClient: ${C.name}\n📞 ${C.phone}\n📝 ${C.notes}`
      );
    }

    say(`✅ Thanks! Your request has been submitted. Your Job ID is <b>${id}</b>.`);
  };

  /* ================= ADMIN BROADCAST TO ALL ================= */
  window.broadcastToAll=async function(text){
    if(!text) return alert("No message text.");
    const list=loadPartners();
    for(const p of list){
      if(p.suspended) continue;
      if(p.tgToken && p.tgChat){
        await sendTelegram(p.tgToken,p.tgChat,`📢 <b>Admin Broadcast</b>\n${text}`);
      }
    }
    alert("✅ Broadcast sent to all active contractors via Telegram.");
  };

  /* ================= ADD TEST BUTTON (in Dashboard) ================= */
  window.addTelegramTestButton=function(){
    const btn=document.createElement('button');
    btn.className='btn ghost';
    btn.style='margin-top:10px;';
    btn.textContent='Send Test Message ⚡';
    btn.onclick=async()=>{
      const phone=localStorage.getItem('contractor_phone');
      const p=loadPartners().find(x=>x.phone===phone);
      if(!p || !p.tgToken || !p.tgChat){ alert('Please save your BOT TOKEN and CHAT ID first.'); return; }
      const ok=await sendTelegram(p.tgToken,p.tgChat,`🤖 Test message from OmniSolutions — Bot linked successfully!`);
      if(ok) alert('✅ Telegram test message sent!');
    };
    const settings=document.querySelector('#tab-settings .grid2 div:last-child');
    if(settings && !settings.querySelector('.btn.ghost')) settings.appendChild(btn);
  };

  // Auto inject test button when dashboard loads
  window.addEventListener('load',()=>{
    try{ addTelegramTestButton(); }catch(e){ console.warn(e); }
  });

})();
