/* =========================================================
   OMNISOLUTIONS — ADDONS MASTER (Enhanced v2)
   Includes:
   ✅ Admin PDF Export & Referral Leaderboard
   ✅ AI Service Tag Generator
   ✅ Smart Area Detector
   ✅ Chatbot improvements (human tone, stays open)
   ✅ Fixed plumber search logic
   ========================================================= */
(function(){
  const ls={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
  const keys={partners:"omni_partners",jobs:"omni_jobs",reviews:"omni_reviews",clients:"omni_clients"};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const HAS={
    index:!!document.querySelector("#catalog")||!!document.querySelector(".hero"),
    contractorShell:!!document.querySelector("#dashboard")||!!document.querySelector("#tab-settings"),
    adminModal:!!document.querySelector("#aBackdrop")
  };

  /* -----------------------------
     SMART AREA DETECTOR (2)
  ----------------------------- */
  const AREAS=["Cape Town","Durban","Johannesburg","Pretoria","Centurion","Sandton","Randburg","Umhlanga","Milnerton","Table View","Roodepoort"];
  function suggestArea(val){
    if(!val)return[];
    val=val.toLowerCase();
    return AREAS.filter(a=>a.toLowerCase().includes(val)).slice(0,3);
  }

  /* -----------------------------
     AI SERVICE TAG GENERATOR (4)
  ----------------------------- */
  if(HAS.index){
    const specInput=$("#specialty");
    if(specInput){
      specInput.addEventListener("blur",()=>{
        const txt=specInput.value.toLowerCase();
        if(txt.includes("geyser")||txt.includes("pipe")||txt.includes("leak"))$("#bizCategory").value="Property & Maintenance::Plumbing";
        if(txt.includes("roof"))$("#bizCategory").value="Property & Maintenance::Roofing";
        if(txt.includes("solar")||txt.includes("panel"))$("#bizCategory").value="Security, Energy & Tech::Solar Installation";
      });
    }
  }

  /* -----------------------------
     ADMIN PDF EXPORT & LEADERBOARD (3,5)
  ----------------------------- */
  function addAdminExtras(){
    if(!HAS.adminModal)return;
    const modal=$("#aBackdrop .modal");
    if(!modal)return;

    // PDF Export
    const btn=document.createElement("button");
    btn.className="btn"; btn.textContent="📄 Export Stats PDF";
    btn.onclick=()=>{
      if(!window.jspdf){const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s.onload=makePDF;document.body.appendChild(s);}else makePDF();
    };
    function makePDF(){
      const {jsPDF}=window.jspdf; const pdf=new jsPDF();
      const jobs=ls.get(keys.jobs,[]); const revs=ls.get(keys.reviews,[]);
      pdf.text("OmniSolutions Stats Report",20,20);
      pdf.text(`Total Jobs: ${jobs.length}`,20,30);
      pdf.text(`Total Reviews: ${revs.length}`,20,40);
      pdf.save("stats_report.pdf");
    }
    modal.querySelector("div[style*='gap']")?.appendChild(btn);

    // Referral Leaderboard
    const lb=document.createElement("button");
    lb.className="btn"; lb.textContent="🏆 Referral Leaderboard";
    lb.onclick=()=>{
      const list=ls.get(keys.partners,[]);
      const top=list.sort((a,b)=>(b.refCount||0)-(a.refCount||0)).slice(0,5);
      alert("Top Referrers:\n"+top.map((x,i)=>`${i+1}. ${x.business} – ${x.refCount||0} refs`).join("\n"));
    };
    modal.querySelector("div[style*='gap']")?.appendChild(lb);
  }

  /* -----------------------------
     CHATBOT IMPROVEMENTS + SEARCH (human tone)
  ----------------------------- */
  function enhanceChatbot(){
    const chat=$("#chat"); if(!chat)return;
    // add close button
    const head=chat.querySelector(".chat-head");
    if(head&&!head.querySelector(".closeChat")){
      const c=document.createElement("button");
      c.textContent="❌ Close Chat";
      c.className="btn secondary closeChat";
      c.style.fontSize="12px";
      c.onclick=()=>chat.style.display="none";
      head.appendChild(c);
    }

    // human tone overrides
    window.say=function(html,who="bot"){
      const chatLog=$("#chatLog");
      const d=document.createElement("div");
      d.className="msg "+(who==="bot"?"bot":"user");
      d.innerHTML=html;
      chatLog.appendChild(d);
      chatLog.scrollTop=chatLog.scrollHeight;
    };

    // typing indicator
    window.humanSay=function(text,delay=800){
      say("<i>OmniSolutions Assistant is typing…</i>");
      setTimeout(()=>{ $$("#chatLog .msg").pop()?.remove(); say(text,"bot"); },delay);
    };

    // replace finalize tone
    window.nextFinalize=function(){
      const id="J-"+Date.now();
      const CURRENT=window.CURRENT||{};
      const job={id,created:new Date().toISOString(),customerName:CURRENT.name,customerPhone:CURRENT.phone,area:CURRENT.area,category:CURRENT.category,service:CURRENT.service,notes:CURRENT.notes,status:"Pending",contractorPhone:CURRENT.chosen?CURRENT.chosen.phone:null};
      const js=ls.get(keys.jobs,[]); js.push(job); ls.set(keys.jobs,js);
      humanSay(`Awesome 👍 Your ${CURRENT.service} request is now logged under Job ID <b>${id}</b>. We’ll update you once assigned.`);
    };
  }

  /* -----------------------------
     FIX PLUMBER SEARCH LOGIC (area ignored)
  ----------------------------- */
  window.__omni_prepare_partner_options__=function(list,service,area){
    const refined=list.filter(p=>{
      // plumbers always appear regardless of area
      if((service||"").toLowerCase().includes("plumb"))return true;
      if(!area)return true;
      return (p.areas||"").toLowerCase().includes(area.toLowerCase());
    });
    // sort alphabetically
    return refined.sort((a,b)=>a.business.localeCompare(b.business));
  };

  /* -----------------------------
     RUN ON LOAD
  ----------------------------- */
  window.addEventListener("load",()=>{
    try{addAdminExtras();}catch(e){}
    try{enhanceChatbot();}catch(e){}
  });
})();
