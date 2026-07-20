const app=document.querySelector("#app"),loading=document.querySelector("#loading"),toast=document.querySelector("#toast");
let content,currentLanguage;
const escapeHtml=(value="")=>String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const safeUrl=(value="")=>value.startsWith("/api/media/")||value.startsWith("/")||/^https:\/\//i.test(value)?value:"#";
const phoneHref=(type,phone)=>`${type}:${phone.replace(/[^+\d]/g,"")}`;
const showToast=(message)=>{toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200)};

function linkDetails(link,t,s){
  const map={text:[t.linkTextTitle,t.linkTextSubtitle,phoneHref("sms",s.phone)],estimate:[t.linkEstimateTitle,t.linkEstimateSubtitle,`mailto:${s.email}?subject=${encodeURIComponent(t.linkEstimateTitle)}`],email:[t.linkEmailTitle,t.linkEmailSubtitle,`mailto:${s.email}`]};
  const genericHref=link.type==="sms"?phoneHref("sms",s.phone):link.type==="tel"?phoneHref("tel",s.phone):link.type==="email"?`mailto:${s.email}`:safeUrl(link.url||"");
  return map[link.id]||[link.id.replace(/^custom-/,"Link "),link.url||genericHref,genericHref];
}
function render(){
  const s=content.settings,t=content.translations[currentLanguage]||content.translations[s.defaultLanguage];
  document.documentElement.lang=currentLanguage;document.documentElement.style.setProperty("--brand",s.brandColor);document.title=t.metaTitle;
  const languages=s.languages.map(code=>`<button class="lang ${code===currentLanguage?"active":""}" data-lang="${code}" type="button">${escapeHtml(code.toUpperCase())}</button>`).join("");
  const links=s.links.filter(item=>item.enabled).map((item,index)=>{const [title,subtitle,href]=linkDetails(item,t,s);return `<a class="link-card" href="${escapeHtml(href)}"><span class="icon">${index+1}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></span></a>`}).join("");
  const services=(t.services||[]).map((item,index)=>`<article class="service"><b>${String(index+1).padStart(2,"0")} · ${escapeHtml(item.title)}</b><p>${escapeHtml(item.description)}</p></article>`).join("");
  const socials=s.socials.filter(item=>item.url).map(item=>`<a class="social" href="${escapeHtml(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`).join("");
  app.innerHTML=`<header class="topbar"><div class="mini-brand">Petterson's Paint</div><nav class="languages" aria-label="Language">${languages}</nav></header>
  ${s.sections.hero?`<section class="hero"><img class="logo" src="${escapeHtml(safeUrl(s.logo))}" alt="${escapeHtml(t.metaTitle)}" width="470" height="220" fetchpriority="high"><div class="rule"></div><p class="eyebrow">${escapeHtml(t.eyebrow)}</p><h1 class="headline">${escapeHtml(t.headline)}</h1><p class="description">${escapeHtml(t.description)}</p><div class="actions"><a class="button primary" href="${phoneHref("sms",s.phone)}">${escapeHtml(t.textUs)}</a><a class="button" href="${phoneHref("tel",s.phone)}">${escapeHtml(t.callNow)}</a></div></section>`:""}
  ${s.sections.links?`<section class="section"><h2>${escapeHtml(t.linksTitle)}</h2><div class="cards">${links}</div></section>`:""}
  ${s.sections.services?`<section class="section"><h2>${escapeHtml(t.servicesTitle)}</h2><div class="services">${services}</div></section>`:""}
  ${s.sections.contact?`<section class="section"><h2>${escapeHtml(t.contactTitle)}</h2><div class="cards"><a class="contact-row" href="${phoneHref("tel",s.phone)}"><span class="icon">☎</span><span><strong>${escapeHtml(s.phone)}</strong><small>${escapeHtml(t.callNow)}</small></span></a><a class="contact-row" href="mailto:${escapeHtml(s.email)}"><span class="icon">@</span><span><strong>${escapeHtml(s.email)}</strong><small>Email</small></span></a><div class="contact-row"><span class="icon">◷</span><span><strong>${escapeHtml(t.hoursLabel)}</strong><small>${escapeHtml(t.hoursValue)}</small></span></div></div></section>`:""}
  ${s.sections.social&&socials?`<section class="section"><h2>${escapeHtml(t.socialTitle)}</h2><div class="socials">${socials}</div></section>`:""}
  <footer class="footer">© ${new Date().getFullYear()} <strong>Petterson's Paint Company</strong>. ${escapeHtml(t.footer)} · <a href="/admin/">Admin</a></footer>`;
  app.querySelectorAll("[data-lang]").forEach(button=>button.addEventListener("click",()=>{currentLanguage=button.dataset.lang;localStorage.setItem("pettersons-language",currentLanguage);render()}));
}
async function start(){try{const response=await fetch("/api/content");if(!response.ok)throw Error();content=await response.json();const saved=localStorage.getItem("pettersons-language");currentLanguage=content.settings.languages.includes(saved)?saved:content.settings.defaultLanguage;render();loading.remove();app.hidden=false}catch{loading.textContent="Unable to load this page. Please try again.";showToast("Connection error")}}
start();
