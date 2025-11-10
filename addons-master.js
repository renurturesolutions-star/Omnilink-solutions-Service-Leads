/* =========================================================
   OMNISOLUTIONS — ADDONS MASTER (v3, Telegram Integrated)
   - Each contractor adds their own BOT TOKEN + CHAT ID
   - New jobs & admin messages auto-send Telegram notifications
   - Works client-side; no backend needed
   ========================================================= */

(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const F={
    load:(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d));}catch(e){return d;}},
    save:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
  };

  /* ================= TELEGRAM UNIVERSAL FUNCTION ================= */
  async function sendContractorTelegram(token, chatId, text){
    if(!token||!chatId) return console.warn("Missing Telegram token/chatId");
    try{
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({chat_id:chatId,text,parse_mode:"HTML"})
      });
      console.log("Telegram sent:",chatId);
    }catch(err){
      console.error("Telegram send failed:",err);
    }
  }
  window.sendContractorTelegram=sendContractorTelegram;

  /* ================= PARTNER SAVE/LOAD HELPERS ================= */
  const KEYS={partners:'omni_partners',jobs:'omni_jobs',reviews:'omni_reviews'};
  const loadPartners=()=>F.load(KEYS.partners,[]);
  const savePartners=v=>F.save(KEYS.partners,v);
  const jobs=()=>F.load(KEYS.jobs,[]);
  const saveJobs=v=>F.save(KEYS.jobs,v);

  /* ================== SIGN-UP TELEGRAM FIELDS ================== */
  window.populateCategorySelect=function(){
    const sel=$('#bizCategory');
    if(!sel) return;
    sel.innerHTML='';
    const cats={
      "Property & Maintenance":["Plumbing","Electrical","Painting","Roofing","Carpentry","Geysers","Leak Detection"],
      "Security & Tech":["CCTV Installation","Gate Motors","Solar Installation","Alarm Systems","Networking & Wi-Fi"],
      "Business Services":["Web Design","Branding/Printing","Cleaning","Marketing"]
    };
    for(const [cat,services] of Object.entries(cats)){
      const og=document.createElement('optgroup'); og.label=cat;
      services.forEach(s=>{
        const o=document.createElement('option'); o.value=`${cat}::${s}`; o.textContent=s; og.appendChild(o);
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
      o.value=p.id; o.textContent=`${p.name} — R${p.price}${p.nextPrice?` → R${p.nextPrice}/m`:''}`;
      sel.appendChild(o);
    });
  };

  const conBtn=$('#conSubmit');
  if(conBtn){
    conBtn.onclick=()=>{
      const name=$('#bizName').value.trim();
      const phone=$('#bizPhone').value.replace(/\D/g,'');
      const svcSel=$('#bizCategory').value;
      const pass=($('#setPass').value||'').trim();
      const areas=$('#areas').value.trim();
      const tgToken=($('#tgToken').value||'').trim();
      const tgChat=($('#tgChat').value||'').trim();
      if(!name||!phone||!svcSel||!pass||pass.length<6){alert("Fill required fields and 6+ char password.");return;}
      const [category,service]=svcSel.split('::');
      const list=loadPartners();
      if(list.find(p=>p.phone===phone)) return alert("Phone already exists");
      const now=Date.now();
      const planSel=$('#subPlanSel').value||'monthly_basic';
      const next=new Date(now+30*86400000).toISOString();
      list.push({
        id:'p_'+now,business:name,phone,category,service,areas,
        pass,created:new Date().toISOString(),
        tgToken,tgChat,subPlan:planSel,subStart:new Date().toISOString(),
        subNextBilling:next,subStatus:'Active',suspended:false
      });
      savePartners(list);
      alert("Contractor added ✓\nNow they can log in and receive Telegram alerts.");
    };
  }

  /* ================= JOB FINALIZATION (SEND TELEGRAM) ================= */
  window.nextFinalize=async function(){
    const C=window.CURRENT;
    const id="J-"+Date.now();
    const job={id,created:new Date().toISOString(),customerName:C.name,customerPhone:C.phone,
      area:C.area,category:C.category,service:C.service,notes:C.notes,status:"Pending",
      contractorPhone:C.chosen?C.chosen.phone:null,price:null};
    const js=jobs(); js.push(job); saveJobs(js);

    if(C.chosen){
      const p=loadPartners().find(x=>x.phone===C.chosen.phone);
      if(p && p.tgToken && p.tgChat){
        await sendContractorTelegram(
          p.tgToken,
          p.tgChat,
          `🧰 *NEW JOB ALERT*\nService: ${C.service}\nArea: ${C.area}\nClient: ${C.name}\nPhone: ${C.phone}\nNotes: ${C.notes}`
        );
      }
    }
    say(`✅ Thanks! Your request was logged. Your Job ID is <b>${id}</b>.`);
  };

  /* ================= ADMIN BROADCAST MESSAGES ================= */
  window.broadcastToAll=async function(text){
    if(!text) return alert("No message text");
    const list=loadPartners();
    for(const p of list){
      if(p.suspended) continue;
      if(p.tgToken && p.tgChat){
        await sendContractorTelegram(p.tgToken,p.tgChat,`📢 ADMIN NOTICE:\n${text}`);
      }
    }
    alert("Broadcast sent to all active contractors via Telegram ✓");
  };

})();
