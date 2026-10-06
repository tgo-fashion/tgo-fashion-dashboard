const C = window.TGO_CONFIG;
const state = { stock:[], incoming:[], sales:[], profit:[], charts:{} };

const $ = (id)=>document.getElementById(id);
const num = v => {
  if(v===null || v===undefined || v==="") return 0;
  if(typeof v==="number") return v;
  const n = Number(String(v).replace(/,/g,"").replace(/[^\d.-]/g,""));
  return Number.isFinite(n) ? n : 0;
};
const money = n => `${Math.round(num(n)).toLocaleString("en-US")} Ks`;
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const dateOnly = v => {
  if(!v) return "";
  if(typeof v==="string"){
    const m=v.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
    if(m) return `${m[1]}-${String(+m[2]+1).padStart(2,"0")}-${String(+m[3]).padStart(2,"0")}`;
  }
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toISOString().slice(0,10);
};
function showToast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2400); }

function parseGviz(text){
  const start=text.indexOf("{");
  const end=text.lastIndexOf("}");
  const obj=JSON.parse(text.slice(start,end+1));
  const cols=(obj.table.cols||[]).map(c=>c.label||c.id||"");
  return (obj.table.rows||[]).map(r=>{
    const o={};
    cols.forEach((c,i)=>o[c]=r.c?.[i]?.v ?? "");
    return o;
  });
}
async function fetchSheet(sheet){
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(C.spreadsheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
  const res=await fetch(url,{cache:"no-store"});
  if(!res.ok) throw new Error(`Google Sheets ${res.status}`);
  return parseGviz(await res.text());
}

async function loadData(){
if(!localStorage.getItem("tgo_customer_login")) return;  setConnection(false,"ချိတ်ဆက်နေသည်…");
  try{
    const [stock,incoming,sales,profit] = await Promise.all([
      fetchSheet(C.sheetNames.stock),
      fetchSheet(C.sheetNames.incoming),
      fetchSheet(C.sheetNames.sales),
      fetchSheet(C.sheetNames.profit)
    ]);
    state.stock=stock; state.incoming=incoming; state.sales=sales; state.profit=profit;
    renderAll();
    setConnection(true,"Google Sheets ချိတ်ဆက်ပြီး");
    $("lastUpdated").textContent = `Updated ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}`;
  }catch(err){
    console.error(err);
    setConnection(false,"Google Sheets မဖတ်နိုင်ပါ");
    showToast("Google Sheets ကို public/published access ပေးထားဖို့လိုပါတယ်");
    renderAll();
  }
}
function setConnection(ok,text){
  $("connectionText").textContent=text;
  $("connectionDot").parentElement.classList.toggle("ok",ok);
}

function renderAll(){
  renderMetrics(); renderCharts(); renderTopProducts(); renderLowStock(); renderStock(); renderSales(); renderIncoming(); renderProfit();
}
function renderMetrics(){
  const products=state.stock.filter(r=>String(r["ပစ္စည်းအမည်"]||"").trim()).length;
  const stock=state.stock.reduce((s,r)=>s+num(r["လက်ကျန်"]),0);
  const revenue=state.sales.reduce((s,r)=>s+num(r["စုစုပေါင်းရောင်းရငွေ"]),0);
  const profit=state.sales.reduce((s,r)=>s+num(r["အမြတ်"]),0);
  const low=state.stock.filter(r=>{const q=num(r["လက်ကျန်"]), m=num(r["အနည်းဆုံးလက်ကျန်"]); return q<=m && String(r["ပစ္စည်းအမည်"]||"").trim();}).length;
  $("metricProducts").textContent=products.toLocaleString();
  $("metricStock").textContent=stock.toLocaleString();
  $("metricRevenue").textContent=money(revenue);
  $("metricProfit").textContent=money(profit);
  $("metricLow").textContent=low.toLocaleString();
  $("profitRevenue").textContent=money(revenue);
  $("profitTotal").textContent=money(profit);
  $("profitCost").textContent=money(revenue-profit);
}

function renderCharts(){
  const validSales=state.sales.filter(r=>String(r["ရက်စွဲ"]||"").trim() && num(r["စုစုပေါင်းရောင်းရငွ"])!==0);
  const byDay={};
  validSales.forEach(r=>{const d=dateOnly(r["ရက်စွဲ"]); byDay[d]=(byDay[d]||0)+num(r["စုစုပေါင်းရောင်းရငွ"]);});
  const days=Object.keys(byDay).sort();
  const period=Number($("salesPeriod").value||30);
  const sliced=days.slice(-period);
  if(state.charts.sales) state.charts.sales.destroy();
  state.charts.sales=new Chart($("salesChart"),{type:"line",data:{labels:sliced,datasets:[{label:"ရောင်းရငွေ",data:sliced.map(d=>byDay[d]),tension:.3,borderWidth:2,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>Number(v).toLocaleString()}}}}});

  const byCat={};
  validSales.forEach(r=>{const c=String(r["အမျိုးအစား"]||"မသတ်မှတ်ရသေး"); byCat[c]=(byCat[c]||0)+num(r["စုစုပေါင်းရောင်းရငွ"]);});
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(state.charts.cat) state.charts.cat.destroy();
  state.charts.cat=new Chart($("categoryChart"),{type:"doughnut",data:{labels:cats.map(x=>x[0]),datasets:[{data:cats.map(x=>x[1])}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:10}}}}}});
}

function renderTopProducts(){
  const by={};
  state.sales.forEach(r=>{const p=String(r["ပစ္စည်းအမည်"]||"").trim(); if(p) by[p]=(by[p]||0)+num(r["အရေအတွက်"]);});
  const arr=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,6);
  $("topProducts").innerHTML=arr.length?arr.map(([p,q],i)=>`<div class="rank-item"><div class="rank-no">${i+1}</div><div class="rank-main"><div class="rank-name">${esc(p)}</div><div class="rank-meta">ရောင်းထားသောအရေအတွက်</div></div><div class="rank-value">${q.toLocaleString()}</div></div>`).join(""):`<div class="empty">အရောင်းဒေတာ မရှိသေးပါ</div>`;
}
function statusBadge(r){
  const q=num(r["လက်ကျန်"]), m=num(r["အနည်းဆုံးလက်ကျန်"]);
  if(q<=0) return `<span class="badge out">ကုန်</span>`;
  if(q<=m) return `<span class="badge low">ပစ္စည်းနည်း</span>`;
  return `<span class="badge ok">အဆင်ပြေ</span>`;
}
function renderLowStock(){
  const rows=state.stock.filter(r=>String(r["ပစ္စည်းအမည်"]||"").trim()).filter(r=>num(r["လက်ကျန်"])<=num(r["အနည်းဆုံးလက်ကျန်"])).slice(0,12);
  $("lowStockTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(r["ပစ္စည်းအမည်"])}</td><td>${num(r["လက်ကျန်"]).toLocaleString()}</td><td>${statusBadge(r)}</td></tr>`).join(""):`<tr><td colspan="3" class="empty">Stock သတိပေးချက် မရှိပါ</td></tr>`;
}
function renderStock(){
  const q=($("stockSearch").value||"").toLowerCase();
  const cat=$("stockCategory").value||"";
  const rows=state.stock.filter(r=>String(r["ပစ္စည်းအမည်"]||"").trim()).filter(r=>(!q||JSON.stringify(r).toLowerCase().includes(q))&&(!cat||String(r["အမျိုးအစား"]||"")===cat));
  $("stockCount").textContent=rows.length;
  const cats=[...new Set(state.stock.map(r=>String(r["အမျိုးအစား"]||"").trim()).filter(Boolean))].sort();
  const current=$("stockCategory").value;
  $("stockCategory").innerHTML=`<option value="">အမျိုးအစားအားလုံး</option>`+cats.map(c=>`<option ${c===current?"selected":""}>${esc(c)}</option>`).join("");
  $("stockTable").innerHTML=rows.length?rows.map((r,i)=>`<tr><td>${esc(r["စဉ်"]||i+1)}</td><td>${esc(r["ပစ္စည်းအမည်"])}</td><td>${esc(r["အမျိုးအစား"])}</td><td>${esc(r["အရွယ်အစား"])}</td><td>${esc(r["အရောင်"])}</td><td>${money(r["ဝယ်ဈေး"])}</td><td>${num(r["လက်ကျန်"]).toLocaleString()}</td><td>${money(r["ရောင်းဈေး"])}</td><td>${num(r["အနည်းဆုံးလက်ကျန်"]).toLocaleString()}</td><td>${statusBadge(r)}</td></tr>`).join(""):`<tr><td colspan="10" class="empty">ဒေတာ မရှိသေးပါ</td></tr>`;
}
function renderSales(){
  const q=($("salesSearch").value||"").toLowerCase(), from=$("salesFrom").value, to=$("salesTo").value;
  const rows=state.sales.filter(r=>String(r["ပစ္စည်းအမည်"]||"").trim()||String(r["ရက်စွဲ"]||"").trim()).filter(r=>{
    const d=dateOnly(r["ရက်စွဲ"]); return (!q||JSON.stringify(r).toLowerCase().includes(q))&&(!from||d>=from)&&(!to||d<=to);
  });
  $("salesCount").textContent=rows.length;
  $("salesTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(dateOnly(r["ရက်စွဲ"]))}</td><td>${esc(r["Costumer Name"])}</td><td>${esc(r["ပစ္စည်းအမည်"])}</td><td>${esc(r["အမျိုးအစား"])}</td><td>${esc(r["အရွယ်အစား"])}</td><td>${esc(r["အရောင်"])}</td><td>${money(r["ရောင်းဈေး"])}</td><td>${num(r["အရေအတွက်"]).toLocaleString()}</td><td>${money(r["စုစုပေါင်းရောင်းရငွ"])}</td><td>${money(r["အမြတ်"])}</td><td>${esc(r["ဝယ်သူ / မှတ်ချက်"])}</td></tr>`).join(""):`<tr><td colspan="11" class="empty">အရောင်းဒေတာ မရှိသေးပါ</td></tr>`;
}
function renderIncoming(){
  const q=($("incomingSearch").value||"").toLowerCase();
  const rows=state.incoming.filter(r=>String(r["ပစ္စည်းအမည်"]||"").trim()).filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q));
  $("incomingCount").textContent=rows.length;
  $("incomingTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(dateOnly(r["ရက်စွဲ"]))}</td><td>${esc(r["ပစ္စည်းအမည်"])}</td><td>${esc(r["အမျိုးအစား"])}</td><td>${esc(r["အရွယ်အစား"])}</td><td>${esc(r["အရောင်"])}</td><td>${num(r["အရေအတွက်"]).toLocaleString()}</td><td>${money(r["၀ယ်ဈေး"])}</td><td>${money(r["စုစုပေါင်းကုန်ကျစရိတ်"])}</td><td>${esc(r["ပေးသွင်းသူ / မှတ်ချက်"])}</td></tr>`).join(""):`<tr><td colspan="9" class="empty">ပစ္စည်းအဝင်ဒေတာ မရှိသေးပါ</td></tr>`;
}
function renderProfit(){
  const rows=state.profit.filter(r=>String(r["ပစ္စည်းအမည်"]||"").trim()||String(r["ရက်စွဲ"]||"").trim());
  $("profitTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${esc(dateOnly(r["ရက်စွဲ"]))}</td><td>${esc(r["ပစ္စည်းအမည်"])}</td><td>${money(r["ရောင်းရငွေ"])}</td><td>${money(r["အရင်း"])}</td><td>${money(r["အမြတ်"])}</td></tr>`).join(""):`<tr><td colspan="5" class="empty">အမြတ်ဒေတာ မရှိသေးပါ</td></tr>`;
}

function setup(){
  const titles={dashboard:"Dashboard",stock:"ပစ္စည်းစာရင်း",sales:"အရောင်းစာရင်း",incoming:"ပစ္စည်းအဝင်",profit:"အမြတ်စာရင်း"};
  document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>{
    const view=btn.dataset.view;
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b===btn));
    document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${view}`));
    $("pageTitle").textContent=titles[view];
    $("sidebar").classList.remove("open");
  }));
  $("refreshBtn").onclick=loadData; $("refreshTop").onclick=loadData;
  $("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
  ["stockSearch","stockCategory","salesSearch","salesFrom","salesTo","incomingSearch","salesPeriod"].forEach(id=>$(id).addEventListener("input",renderAll));
  loadData(); setInterval(loadData,C.refreshMs||60000);
}
document.addEventListener("DOMContentLoaded",setup);
// ===== TGO CUSTOMER LOGIN =====

const TGO_AUTH_API = "https://script.google.com/macros/s/AKfycbxZp-5Ddxzvevy-vDRtmO6sJSB3TODo8wceRLAlaf9eK33QazCMfnItp7sxXTVI2UJs7w/exec";

function tgoLoginBox() {
  if (document.getElementById("tgo-login-box")) return;

  const box = document.createElement("div");
  box.id = "tgo-login-box";

  box.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:#f5f6fa;
      z-index:99999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    ">
      <div style="
        width:100%;
        max-width:400px;
        background:white;
        padding:30px 24px;
        border-radius:20px;
        box-shadow:0 10px 40px rgba(0,0,0,.12);
      ">
        <div style="text-align:center;font-size:30px;font-weight:800;margin-bottom:8px;">
          TGO FASHION
        </div>

        <div style="text-align:center;color:#777;margin-bottom:25px;">
          Customer Login
        </div>

        <input id="tgo-email"
          type="email"
          placeholder="Email"
          style="width:100%;box-sizing:border-box;padding:15px;margin-bottom:12px;border:1px solid #ddd;border-radius:12px;font-size:16px;">

        <input id="tgo-password"
          type="password"
          placeholder="Password"
          style="width:100%;box-sizing:border-box;padding:15px;margin-bottom:15px;border:1px solid #ddd;border-radius:12px;font-size:16px;">

        <button id="tgo-login-btn"
          style="width:100%;padding:15px;border:0;border-radius:12px;background:#111827;color:white;font-size:17px;font-weight:700;">
          Login
        </button>

        <div id="tgo-login-msg"
          style="text-align:center;margin-top:15px;color:#d00;font-size:14px;">
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(box);

  document.getElementById("tgo-login-btn").onclick = tgoDoLogin;

  document.getElementById("tgo-password").addEventListener("keydown", e => {
    if (e.key === "Enter") tgoDoLogin();
  });
}

function tgoGetExpiryDate(value) {
  if (!value) return null;

  const s = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,m,d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
  }

  return new Date(s);
}

async function tgoDoLogin() {
  const email = document.getElementById("tgo-email").value.trim();
  const password = document.getElementById("tgo-password").value;
  const msg = document.getElementById("tgo-login-msg");
  const btn = document.getElementById("tgo-login-btn");

  if (!email || !password) {
    msg.textContent = "Email နဲ့ Password ထည့်ပါ";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Logging in...";
  msg.textContent = "";

  try {
    const url =
      TGO_AUTH_API +
      "?action=login" +
      "&email=" + encodeURIComponent(email) +
      "&password=" + encodeURIComponent(password);

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!data.success) {
      msg.textContent = data.message || "Login မအောင်မြင်ပါ";
      btn.disabled = false;
      btn.textContent = "Login";
      return;
    }

    localStorage.setItem("tgo_customer_login", "true");
    localStorage.setItem("tgo_customer_email", email);
    localStorage.setItem("tgo_customer_expiry", data.expiry || "");
localStorage.setItem("tgo_customer_password", password);
    document.getElementById("tgo-login-box").remove();

    loadData();

    tgoStartExpiryCheck();

  } catch (err) {
    console.error(err);
    msg.textContent = "Server ချိတ်ဆက်မရပါ";
    btn.disabled = false;
    btn.textContent = "Login";
  }
}

function tgoLockDashboard() {
  localStorage.removeItem("tgo_customer_login");
  localStorage.removeItem("tgo_customer_email");
  localStorage.removeItem("tgo_customer_expiry");

  location.reload();
}

function tgoStartExpiryCheck() {
  setInterval(() => {
    const expiry = localStorage.getItem("tgo_customer_expiry");
    const d = tgoGetExpiryDate(expiry);

    if (d && new Date() > d) {
      alert("သင့် Account သက်တမ်းကုန်ဆုံးသွားပါပြီ။");
      tgoLockDashboard();
    }
  }, 60000);
}

document.addEventListener("DOMContentLoaded", () => {
  const loggedIn = localStorage.getItem("tgo_customer_login");
  const expiry = localStorage.getItem("tgo_customer_expiry");

  if (!loggedIn) {
    tgoLoginBox();
    return;
  }

  const d = tgoGetExpiryDate(expiry);

  if (d && new Date() > d) {
    tgoLockDashboard();
    return;
  }

  tgoStartExpiryCheck();
});
// ===== CUSTOMER DATA ENTRY =====

function tgoCustomerEntry() {

  if (document.getElementById("tgoEntryBox")) return;

  const box = document.createElement("div");

  box.id = "tgoEntryBox";

  box.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.55);
      z-index:9999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    ">

      <div style="
        background:white;
        width:100%;
        max-width:450px;
        border-radius:16px;
        padding:20px;
        box-sizing:border-box;
      ">

        <h2 style="margin-top:0">
          ပစ္စည်းအဝင်ထည့်ရန်
        </h2>

        <input id="tgoProductName"
          placeholder="ပစ္စည်းအမည်"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <input id="tgoCategory"
          placeholder="အမျိုးအစား"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <input id="tgoSize"
          placeholder="အရွယ်အစား"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <input id="tgoColor"
          placeholder="အရောင်"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <input id="tgoQty"
          type="number"
          placeholder="အရေအတွက်"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <input id="tgoBuyPrice"
          type="number"
          placeholder="ဝယ်ဈေး"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <input id="tgoSellPrice"
          type="number"
          placeholder="ရောင်းဈေး"
          style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box">

        <button
          onclick="tgoSaveIncoming()"
          style="
            width:100%;
            padding:13px;
            margin-top:10px;
            border:0;
            border-radius:10px;
            background:#111;
            color:white;
            font-size:16px;
          ">
          သိမ်းမည်
        </button>

        <button
          onclick="document.getElementById('tgoEntryBox').remove()"
          style="
            width:100%;
            padding:12px;
            margin-top:8px;
            border:1px solid #ccc;
            border-radius:10px;
            background:white;
          ">
          ပိတ်မည်
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(box);
}


async function tgoSaveIncoming() {

  const email = localStorage.getItem("tgo_customer_email") || "";
const password = localStorage.getItem("tgo_customer_password") || "";
  const productName =
    document.getElementById("tgoProductName").value.trim();

  const category =
    document.getElementById("tgoCategory").value.trim();

  const size =
    document.getElementById("tgoSize").value.trim();

  const color =
    document.getElementById("tgoColor").value.trim();

  const qty =
    document.getElementById("tgoQty").value;

  const buyPrice =
    document.getElementById("tgoBuyPrice").value;

  const sellPrice =
    document.getElementById("tgoSellPrice").value;


  if (!productName || !qty) {
    alert("ပစ္စည်းအမည်နဲ့ အရေအတွက် ထည့်ပါ");
    return;
  }


  const api =
    "https://script.google.com/macros/s/AKfycbxZp-5Ddxzvevy-vDRtmO6sJSB3TODo8wceRLAlaf9eK33QazCMfnItp7sxXTVI2UJs7w/exec";


  const password =
  localStorage.getItem("tgo_customer_password") || "";

try {

  const res = await fetch(api, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "addIncoming",
      email: email,
      password: password,
      productName: productName,
      category: category,
      size: size,
      color: color,
      qty: qty,
      buyPrice: buyPrice,
      sellPrice: sellPrice
    }),
    cache: "no-store"
  });

    const result = await res.json();

    if (result.success) {

      alert("ပစ္စည်းအဝင် သိမ်းပြီးပါပြီ ✅");

      document.getElementById("tgoEntryBox").remove();

      loadData();

    } else {

      alert(result.message || "သိမ်းမရပါ");

    }

  } catch (err) {

    console.error(err);

    alert("Server နဲ့ ချိတ်မရပါ");

  }
}
