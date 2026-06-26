const STORE_KEY = "aura.v0.1.state";

const demoItems = [
  { id: uid(), name: "Navy Blazer", category: "Outerwear", color: "Navy", season: "All", occasion: "Business", style: "Quiet Luxury", wears: 18, confidence: 95, image: "" },
  { id: uid(), name: "White Oxford Shirt", category: "Top", color: "White", season: "All", occasion: "Business", style: "Classic", wears: 24, confidence: 92, image: "" },
  { id: uid(), name: "Beige Chinos", category: "Bottom", color: "Beige", season: "Summer", occasion: "Smart Casual", style: "Minimal", wears: 16, confidence: 88, image: "" },
  { id: uid(), name: "Brown Loafers", category: "Shoes", color: "Brown", season: "All", occasion: "Business", style: "Timeless", wears: 21, confidence: 94, image: "" },
  { id: uid(), name: "White Sneakers", category: "Shoes", color: "White", season: "All", occasion: "Casual", style: "Clean", wears: 30, confidence: 82, image: "" },
  { id: uid(), name: "Camel Overshirt", category: "Outerwear", color: "Camel", season: "Winter", occasion: "Casual", style: "Quiet Luxury", wears: 7, confidence: 89, image: "" },
  { id: uid(), name: "Grey Wool Trousers", category: "Bottom", color: "Grey", season: "Winter", occasion: "Business", style: "Classic", wears: 12, confidence: 90, image: "" },
  { id: uid(), name: "Rolex GMT", category: "Watch", color: "Steel", season: "All", occasion: "Business", style: "Luxury", wears: 44, confidence: 96, image: "" },
  { id: uid(), name: "Oud Wood", category: "Fragrance", color: "Amber", season: "Winter", occasion: "Evening", style: "Luxury", wears: 14, confidence: 93, image: "" }
];

let state = loadState();

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultState() {
  return {
    user: {
      name: "Gillio",
      city: "Dubai",
      temperature: 34,
      occasion: "Business Meeting",
      styleGoal: "Quiet Luxury",
      budget: 1000
    },
    wardrobe: [],
    inspirations: [],
    outfits: [],
    orders: [],
    stylistBookings: [],
    feedback: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

function scoreClass(score) {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

function setView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  const target = document.getElementById(`view-${view}`);
  target.classList.add("active");
  document.getElementById("pageTitle").textContent = {
    home: "Daily Briefing",
    wardrobe: "Wardrobe",
    inspiration: "AI Inspiration",
    packing: "Packing",
    stylist: "Stylist Network",
    analytics: "Analytics",
    settings: "Settings"
  }[view] || "AURA";
  render();
}

function itemCard(item) {
  const image = item.image
    ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />`
    : `<div class="image-placeholder">${escapeHtml(item.category || "Item")}</div>`;
  return `<article class="item-card">
    ${image}
    <div class="body">
      <h3>${escapeHtml(item.name)}</h3>
      <div class="meta">${escapeHtml(item.color)} · ${escapeHtml(item.category)}<br>${escapeHtml(item.occasion)} · ${escapeHtml(item.style)}</div>
      <div class="tags">
        <span class="tag">${escapeHtml(item.season)}</span>
        <span class="tag">${Number(item.confidence || 75)}% confidence</span>
      </div>
    </div>
  </article>`;
}

function getItemsByCategory(category) {
  return state.wardrobe.filter(i => i.category === category);
}

function pickBestOutfit() {
  const context = state.user;
  const top = [...getItemsByCategory("Top")].sort((a,b) => scoreItem(b, context) - scoreItem(a, context))[0];
  const bottom = [...getItemsByCategory("Bottom")].sort((a,b) => scoreItem(b, context) - scoreItem(a, context))[0];
  const shoes = [...getItemsByCategory("Shoes")].sort((a,b) => scoreItem(b, context) - scoreItem(a, context))[0];
  const outer = [...getItemsByCategory("Outerwear")].sort((a,b) => scoreItem(b, context) - scoreItem(a, context))[0];
  const accessory = [...state.wardrobe.filter(i => ["Watch", "Fragrance", "Accessory"].includes(i.category))]
    .sort((a,b) => scoreItem(b, context) - scoreItem(a, context))[0];

  const items = [top, bottom, shoes, outer, accessory].filter(Boolean);
  const score = items.length ? Math.round(items.reduce((sum, item) => sum + scoreItem(item, context), 0) / items.length) : 0;
  return { items, score };
}

function scoreItem(item, context) {
  let score = 50;
  const occasion = (context.occasion || "").toLowerCase();
  const temp = Number(context.temperature || 25);
  if ((item.occasion || "").toLowerCase().includes("business") && occasion.includes("business")) score += 18;
  if ((item.occasion || "").toLowerCase().includes("casual") && occasion.includes("casual")) score += 12;
  if ((item.style || "").toLowerCase().includes((context.styleGoal || "").toLowerCase().split(" ")[0])) score += 14;
  if (temp >= 30 && ["Summer", "All"].includes(item.season)) score += 8;
  if (temp < 22 && ["Winter", "All"].includes(item.season)) score += 8;
  score += Math.min(Number(item.confidence || 75) / 10, 10);
  score -= Math.min(Number(item.wears || 0) / 20, 6);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function renderHome() {
  const outfit = pickBestOutfit();
  const hasItems = state.wardrobe.length > 0;
  const outfitHtml = hasItems ? outfit.items.map(i => `<span class="pill">${escapeHtml(i.name)}</span>`).join("") : `<span class="pill">Load demo wardrobe or add clothes</span>`;
  const score = hasItems ? outfit.score : 0;

  document.getElementById("view-home").innerHTML = `
    <div class="hero">
      <div class="briefing">
        <p class="eyebrow">AURA Daily Briefing</p>
        <h2>Good day, ${escapeHtml(state.user.name)}.</h2>
        <p>${escapeHtml(state.user.city)} · ${escapeHtml(state.user.temperature)}°C · ${escapeHtml(state.user.occasion)}</p>
        <div class="recommendation">
          <div>
            <span class="pill">Recommendation confidence: ${score}%</span>
            <span class="pill">Style goal: ${escapeHtml(state.user.styleGoal)}</span>
          </div>
          <div>${outfitHtml}</div>
          <p>${hasItems ? explainOutfit(outfit) : "AURA needs wardrobe items before it can recommend an outfit."}</p>
        </div>
      </div>
      <div class="card">
        <p class="eyebrow">Today’s AI Reasoning</p>
        <h2>Why this works</h2>
        <ul class="report-list">
          <li>Weather and occasion are weighted before style aesthetics.</li>
          <li>Items with strong confidence history are prioritized.</li>
          <li>Recently overused items are slightly penalized to avoid repetition.</li>
          <li>User can accept, edit, or reject to train Style DNA.</li>
        </ul>
        <button class="primary full" id="acceptRecommendation">Accept Recommendation</button>
      </div>
    </div>

    <div class="grid four" style="margin-top:18px">
      <div class="card kpi"><span>Wardrobe Items</span><strong>${state.wardrobe.length}</strong></div>
      <div class="card kpi"><span>Inspirations</span><strong>${state.inspirations.length}</strong></div>
      <div class="card kpi"><span>Orders</span><strong>${state.orders.length}</strong></div>
      <div class="card kpi"><span>Style Confidence</span><strong>${avgConfidence()}%</strong></div>
    </div>
  `;

  document.getElementById("acceptRecommendation")?.addEventListener("click", () => {
    state.feedback.push({ id: uid(), type: "daily_outfit_accept", score, at: new Date().toISOString() });
    outfit.items.forEach(item => item.wears = Number(item.wears || 0) + 1);
    saveState();
    toast("Outfit accepted. AURA learned from this.");
    render();
  });
}

function explainOutfit(outfit) {
  if (!outfit.items.length) return "Add clothes to receive recommendations.";
  return `AURA selected this combination because it best matches your ${state.user.styleGoal} goal, today's ${state.user.occasion}, and your confidence history.`;
}

function renderWardrobe() {
  const content = state.wardrobe.length
    ? `<div class="item-grid">${state.wardrobe.map(itemCard).join("")}</div>`
    : `<div class="card flat"><h2>Your wardrobe is empty.</h2><p>Add your first item or load the demo wardrobe.</p></div>`;

  document.getElementById("view-wardrobe").innerHTML = `
    <div class="grid two">
      <div class="card">
        <p class="eyebrow">Add Item</p>
        <h2>Build your digital wardrobe</h2>
        <form class="form" id="itemForm">
          <label>Name <input name="name" required placeholder="Navy blazer"></label>
          <label>Category
            <select name="category">
              <option>Top</option><option>Bottom</option><option>Shoes</option><option>Outerwear</option>
              <option>Accessory</option><option>Watch</option><option>Fragrance</option>
            </select>
          </label>
          <label>Color <input name="color" placeholder="Navy"></label>
          <label>Season <select name="season"><option>All</option><option>Summer</option><option>Winter</option></select></label>
          <label>Occasion <select name="occasion"><option>Business</option><option>Smart Casual</option><option>Casual</option><option>Evening</option><option>Travel</option></select></label>
          <label>Style <input name="style" placeholder="Quiet Luxury"></label>
          <label>Image <input name="image" type="file" accept="image/*"></label>
          <button class="primary" type="submit">Add to Wardrobe</button>
        </form>
      </div>
      <div class="card">
        <p class="eyebrow">Closet Intelligence</p>
        <h2>Wardrobe</h2>
        ${content}
      </div>
    </div>
  `;
  document.getElementById("itemForm").addEventListener("submit", handleItemSubmit);
}

function fileToDataURL(file) {
  return new Promise(resolve => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function handleItemSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const image = await fileToDataURL(form.get("image"));
  const item = {
    id: uid(),
    name: form.get("name"),
    category: form.get("category"),
    color: form.get("color") || "Neutral",
    season: form.get("season"),
    occasion: form.get("occasion"),
    style: form.get("style") || state.user.styleGoal,
    wears: 0,
    confidence: 78,
    image
  };
  state.wardrobe.push(item);
  saveState();
  toast("Item added. AI tagging simulated locally.");
  renderWardrobe();
}

function analyzeInspiration({ name, category, color, style, price }) {
  const duplicateCount = state.wardrobe.filter(i =>
    i.category === category && (i.color || "").toLowerCase() === (color || "").toLowerCase()
  ).length;
  const styleMatch = (style || "").toLowerCase().includes((state.user.styleGoal || "").toLowerCase().split(" ")[0]) ? 92 : 72;
  const wardrobeImpact = Math.max(18, 85 - duplicateCount * 22);
  const budgetFit = Number(price || 0) <= Number(state.user.budget || 1000) ? 90 : 48;
  const score = Math.round(styleMatch * .35 + wardrobeImpact * .35 + budgetFit * .20 + (duplicateCount ? 50 : 85) * .10);
  const decision = score >= 82 ? "BUY" : score >= 62 ? "WAIT" : "SKIP";
  return { duplicateCount, styleMatch, wardrobeImpact, budgetFit, score, decision };
}

function renderInspiration() {
  const last = state.inspirations.at(-1);
  document.getElementById("view-inspiration").innerHTML = `
    <div class="grid two">
      <div class="card">
        <p class="eyebrow">AI Inspiration</p>
        <h2>I found this. Should I buy it?</h2>
        <form class="form" id="inspirationForm">
          <label>Item name <input name="name" required placeholder="Camel suede jacket"></label>
          <label>Category <select name="category"><option>Outerwear</option><option>Top</option><option>Bottom</option><option>Shoes</option><option>Accessory</option><option>Watch</option><option>Fragrance</option></select></label>
          <label>Color <input name="color" placeholder="Camel"></label>
          <label>Style <input name="style" placeholder="Quiet Luxury"></label>
          <label>Estimated price <input name="price" type="number" min="0" placeholder="320"></label>
          <label>Upload inspiration image <input name="image" type="file" accept="image/*"></label>
          <button class="primary" type="submit">Analyze Compatibility</button>
        </form>
      </div>
      <div class="card" id="inspirationReport">
        ${last ? inspirationReportHtml(last) : `<p class="eyebrow">Decision Engine</p><h2>No inspiration analyzed yet.</h2><p>Upload a clothing item, screenshot, or outfit idea. AURA will return a compatibility score, wardrobe impact, and Buy / Wait / Skip guidance.</p>`}
      </div>
    </div>
  `;
  document.getElementById("inspirationForm").addEventListener("submit", handleInspirationSubmit);
  bindInspirationButtons();
}

async function handleInspirationSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const image = await fileToDataURL(form.get("image"));
  const item = {
    id: uid(),
    name: form.get("name"),
    category: form.get("category"),
    color: form.get("color") || "Neutral",
    style: form.get("style") || state.user.styleGoal,
    price: Number(form.get("price") || 0),
    image
  };
  const report = analyzeInspiration(item);
  const inspiration = { ...item, report, createdAt: new Date().toISOString() };
  state.inspirations.push(inspiration);
  saveState();
  toast("AURA analysis complete.");
  renderInspiration();
}

function inspirationReportHtml(item) {
  const score = item.report.score;
  return `<p class="eyebrow">Compatibility Report</p>
    <h2>${escapeHtml(item.name)}</h2>
    ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" style="width:100%;max-height:260px;object-fit:cover;border-radius:20px;margin-bottom:14px">` : ""}
    <div class="score ${scoreClass(score)}">${score}%</div>
    <h3>Decision: ${escapeHtml(item.report.decision)}</h3>
    <ul class="report-list">
      <li>Style match: ${item.report.styleMatch}%</li>
      <li>Wardrobe impact: ${item.report.wardrobeImpact}%</li>
      <li>Budget fit: ${item.report.budgetFit}%</li>
      <li>Similar owned items: ${item.report.duplicateCount}</li>
      <li>Why: ${inspirationReason(item)}</li>
    </ul>
    <div class="top-actions" style="margin-top:14px">
      <button class="primary" id="orderInspired">Order Mock</button>
      <button class="secondary" id="saveInspired">Add to Wardrobe</button>
    </div>`;
}

function inspirationReason(item) {
  if (item.report.decision === "BUY") return "It fits your Style DNA and adds meaningful wardrobe value.";
  if (item.report.decision === "WAIT") return "It may work, but AURA suggests checking alternatives or price timing.";
  return "It overlaps too much or adds low wardrobe value.";
}

function bindInspirationButtons() {
  document.getElementById("orderInspired")?.addEventListener("click", () => {
    const item = state.inspirations.at(-1);
    state.orders.push({
      id: uid(),
      itemName: item.name,
      price: item.price,
      status: "Mock order created",
      createdAt: new Date().toISOString()
    });
    saveState();
    toast("Mock order created. Real checkout connects in production.");
    render();
  });

  document.getElementById("saveInspired")?.addEventListener("click", () => {
    const item = state.inspirations.at(-1);
    state.wardrobe.push({
      id: uid(),
      name: item.name,
      category: item.category,
      color: item.color,
      season: "All",
      occasion: "Smart Casual",
      style: item.style,
      wears: 0,
      confidence: item.report.score,
      image: item.image
    });
    saveState();
    toast("Inspiration item added to wardrobe.");
    render();
  });
}

function renderPacking() {
  document.getElementById("view-packing").innerHTML = `
    <div class="grid two">
      <div class="card">
        <p class="eyebrow">Travel Intelligence</p>
        <h2>Generate Packing Plan</h2>
        <form class="form" id="packingForm">
          <label>Destination <input name="destination" value="Beirut"></label>
          <label>Days <input name="days" type="number" min="1" max="30" value="4"></label>
          <label>Trip type <select name="type"><option>Business</option><option>Vacation</option><option>Wedding</option><option>Family</option></select></label>
          <button class="primary">Create Packing Plan</button>
        </form>
      </div>
      <div class="card" id="packingResult">
        <p class="eyebrow">Packing Confidence</p>
        <h2>Ready when you are.</h2>
        <p>AURA will reuse wardrobe items intelligently instead of overpacking.</p>
      </div>
    </div>
  `;
  document.getElementById("packingForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const plan = generatePackingPlan(form.get("destination"), Number(form.get("days")), form.get("type"));
    document.getElementById("packingResult").innerHTML = plan;
  });
}

function generatePackingPlan(destination, days, type) {
  const tops = getItemsByCategory("Top").slice(0, Math.min(days, 4));
  const bottoms = getItemsByCategory("Bottom").slice(0, Math.min(Math.ceil(days / 2), 3));
  const shoes = getItemsByCategory("Shoes").slice(0, 2);
  const outer = getItemsByCategory("Outerwear").slice(0, 1);
  const items = [...tops, ...bottoms, ...shoes, ...outer];
  return `<p class="eyebrow">Packing Plan</p>
    <h2>${escapeHtml(days)} days in ${escapeHtml(destination)}</h2>
    <p>Trip type: ${escapeHtml(type)}. AURA recommends ${items.length} wardrobe items and ${Math.max(days, 3)} outfit combinations.</p>
    <ul class="report-list">
      ${items.map(i => `<li>${escapeHtml(i.name)} · ${escapeHtml(i.category)}</li>`).join("") || "<li>Add wardrobe items first.</li>"}
    </ul>`;
}

function renderStylist() {
  const match = stylistMatch();
  document.getElementById("view-stylist").innerHTML = `
    <div class="grid two">
      <div class="card">
        <p class="eyebrow">Human Expertise</p>
        <h2>Recommended Stylist</h2>
        <div class="score ${scoreClass(match.score)}">${match.score}%</div>
        <h3>${match.name}</h3>
        <p>${match.reason}</p>
        <ul class="report-list">
          <li>Specialty: ${match.specialty}</li>
          <li>Budget fit: ${match.budgetFit}%</li>
          <li>Trust score: ${match.trust}%</li>
          <li>Best for: ${escapeHtml(state.user.styleGoal)} evolution</li>
        </ul>
        <button class="primary" id="bookStylist">Book Mock Session</button>
      </div>
      <div class="card">
        <p class="eyebrow">AI Brief</p>
        <h2>Prepared for stylist</h2>
        <p>AURA prepares your Style DNA, goals, wardrobe gaps, and current recommendations so the stylist starts with context.</p>
        <ul class="report-list">
          <li>Goal: ${escapeHtml(state.user.styleGoal)}</li>
          <li>Wardrobe items: ${state.wardrobe.length}</li>
          <li>Average confidence: ${avgConfidence()}%</li>
          <li>Known gap: ${wardrobeGap()}</li>
        </ul>
      </div>
    </div>
  `;
  document.getElementById("bookStylist").addEventListener("click", () => {
    state.stylistBookings.push({ id: uid(), stylist: match.name, at: new Date().toISOString(), status: "Mock booking requested" });
    saveState();
    toast("Mock stylist session booked.");
  });
}

function stylistMatch() {
  const goal = state.user.styleGoal || "Quiet Luxury";
  const base = goal.toLowerCase().includes("luxury") ? 96 : 88;
  return {
    name: "Sarah M. — Executive Style Specialist",
    score: base,
    specialty: "Quiet Luxury, Business Executive, Travel Capsule",
    budgetFit: Number(state.user.budget || 0) >= 500 ? 92 : 72,
    trust: 97,
    reason: `Sarah is recommended because your Style DNA is moving toward ${goal}, and her strongest client outcomes are in that exact area.`
  };
}

function renderAnalytics() {
  const categories = {};
  state.wardrobe.forEach(i => categories[i.category] = (categories[i.category] || 0) + 1);
  const rows = Object.entries(categories).map(([k,v]) => `<tr><td>${escapeHtml(k)}</td><td>${v}</td></tr>`).join("");
  document.getElementById("view-analytics").innerHTML = `
    <div class="grid three">
      <div class="card kpi"><span>Average Confidence</span><strong>${avgConfidence()}%</strong></div>
      <div class="card kpi"><span>Most Worn</span><strong>${escapeHtml(mostWorn())}</strong></div>
      <div class="card kpi"><span>Main Gap</span><strong>${escapeHtml(wardrobeGap())}</strong></div>
    </div>
    <div class="card" style="margin-top:18px">
      <p class="eyebrow">Wardrobe Health</p>
      <h2>Category Coverage</h2>
      <table class="table"><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>${rows || "<tr><td>No items</td><td>0</td></tr>"}</tbody></table>
    </div>
  `;
}

function avgConfidence() {
  if (!state.wardrobe.length) return 0;
  return Math.round(state.wardrobe.reduce((s,i) => s + Number(i.confidence || 75), 0) / state.wardrobe.length);
}

function mostWorn() {
  if (!state.wardrobe.length) return "None";
  return [...state.wardrobe].sort((a,b) => Number(b.wears||0) - Number(a.wears||0))[0].name;
}

function wardrobeGap() {
  const required = ["Top", "Bottom", "Shoes", "Outerwear"];
  const missing = required.find(cat => !state.wardrobe.some(i => i.category === cat));
  return missing || "Balanced";
}

function renderSettings() {
  document.getElementById("view-settings").innerHTML = `
    <div class="card">
      <p class="eyebrow">Settings</p>
      <h2>Style Context</h2>
      <form class="form" id="settingsForm">
        <label>Name <input name="name" value="${escapeHtml(state.user.name)}"></label>
        <label>City <input name="city" value="${escapeHtml(state.user.city)}"></label>
        <label>Temperature °C <input name="temperature" type="number" value="${escapeHtml(state.user.temperature)}"></label>
        <label>Today's occasion <input name="occasion" value="${escapeHtml(state.user.occasion)}"></label>
        <label>Style goal <input name="styleGoal" value="${escapeHtml(state.user.styleGoal)}"></label>
        <label>Monthly style budget <input name="budget" type="number" value="${escapeHtml(state.user.budget)}"></label>
        <button class="primary">Save Settings</button>
      </form>
    </div>
  `;
  document.getElementById("settingsForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.user = {
      name: form.get("name"),
      city: form.get("city"),
      temperature: Number(form.get("temperature")),
      occasion: form.get("occasion"),
      styleGoal: form.get("styleGoal"),
      budget: Number(form.get("budget"))
    };
    saveState();
    toast("Settings saved.");
    render();
  });
}

function render() {
  const active = document.querySelector(".view.active")?.id?.replace("view-", "") || "home";
  if (active === "home") renderHome();
  if (active === "wardrobe") renderWardrobe();
  if (active === "inspiration") renderInspiration();
  if (active === "packing") renderPacking();
  if (active === "stylist") renderStylist();
  if (active === "analytics") renderAnalytics();
  if (active === "settings") renderSettings();
}

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

document.getElementById("seedBtn").addEventListener("click", () => {
  state.wardrobe = JSON.parse(JSON.stringify(demoItems));
  saveState();
  toast("Demo wardrobe loaded.");
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset AURA local data?")) return;
  localStorage.removeItem(STORE_KEY);
  state = defaultState();
  toast("AURA reset.");
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
