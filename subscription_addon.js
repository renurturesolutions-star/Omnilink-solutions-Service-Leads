/* ============================================
   OMNI SUBSCRIPTION ADD-ON
   Works with index.html + contractor.html + addons.js
   ============================================ */
(function(){
  const ls = {
    get: (k, def)=>{ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(def)); }catch(e){ return def; } },
    set: (k,v)=> localStorage.setItem(k, JSON.stringify(v)),
  };

  const keys = { partners:'omni_partners', subs:'omni_subscriptions' };

  // default plans
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
     CONTRACTOR SIDE: Plan status + billing
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
        $('#subStatus').innerHTML = 'No plan active.';
      } else {
        $('#subStatus').innerHTML = `
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
})();
