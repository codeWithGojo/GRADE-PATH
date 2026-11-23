/* Capture one-time fragments before the workspace router starts. */
(function () {
  "use strict";
  const match = /^#(verify|reset|email)=([A-Za-z0-9_-]{43})$/.exec(location.hash);
  let intent = match ? { purpose: match[1], token: match[2] } : null;
  if (intent) history.replaceState(null, "", location.pathname + location.search + "#account");

  document.addEventListener("DOMContentLoaded", () => {
    const { byId, el, C, state, go, setMode } = GP;
    const stage = byId("lifecycle-stage"), account = byId("account"), nav = byId("account-nav");
    let session = GP.online.session(), screen = "", pending = false, register = false, draft = {}, recoveryEmail = "";
    const subjects = { university:["Computer Science","Engineering","Business Administration","Education","Mathematics"],
      secondary:["Mathematics","English Language","Biology","Physics","Chemistry","Economics"] };
    const api = GP.online.api;
    const esc = s => String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    const label = (title, control) => '<label class="field">'+title+control+'</label>';
    const input = (name, attrs) => '<input name="'+name+'" '+attrs+'>';
    const action = (name, text, primary=false) => '<button type="button" data-flow="'+name+'" class="'+(primary?'primary':'link-action')+'">'+text+'</button>';
    const form = (body, submit) => '<form id="flow-form">'+body+'<button class="primary" type="submit">'+submit+'</button></form>';
    const feedback = '<p class="status" id="flow-status" role="status" aria-live="polite"></p>';
    const progress = n => '<p class="flow-progress">Set up your workspace · '+n+' of 2</p><progress max="2" value="'+n+'" aria-label="Setup progress"></progress>';
    function draftKey() { return "gradepath-onboarding-"+session.account?.id; }
    function readDraft() {
      try { draft=JSON.parse(sessionStorage.getItem(draftKey()) || "null") || {...session.account?.studyProfile}; } catch { draft={}; }
      draft.mode ||= state.mode;
    }
    function persist() { try {sessionStorage.setItem(draftKey(), JSON.stringify(draft));} catch {} }
    function focusStage() { if(location.hash==="#account") (stage.hidden ? byId("account-heading") : stage.querySelector("h2"))?.focus({preventScroll:true}); }
    function configureAuth() {
      const primary=byId("auth-primary");
      primary.value=register?"register":"login"; primary.textContent=register?"Create account":"Sign in";
      byId("auth-switch").textContent=register?"Already have an account? Sign in":"Create an account";
      byId("auth-forgot").hidden=register;
      byId("auth-password").autocomplete=register?"new-password":"current-password";
      byId("auth-form").querySelector(".help").hidden=!register;
      byId("account-heading").textContent=register?"Create your account":"Welcome back";
      byId("flow-subtitle").textContent=register?"Take your workspace with you.":"Sign in to pick up where you left off.";
    }
    function render(next, focus=true) {
      screen=next;account.dataset.screen=next;stage.hidden=["auth","settings","sync","benchmark","plus"].includes(next);
      byId("account-loading").hidden=true;
      const signed=Boolean(session.account);
      nav.hidden=!signed || ["welcome","path","course","ready","verify","reset","email-confirm"].includes(next);
      nav.replaceChildren();
      if (!nav.hidden) for (const [key,title] of [["settings","Account"],["security","Security"],["sync","Cloud sync"],["benchmark","Benchmark"],["plus","Plus"]]) {
        if(key==="benchmark" && state.mode!=="university")continue;
        const button=el("button",title);button.type="button";button.dataset.flow=key;
        button.setAttribute("aria-current",key===next?"page":"false");nav.append(button);
      }
      byId("account-heading").textContent= signed?"Account settings":"Your account";
      byId("flow-subtitle").textContent=signed?session.account.email:"Your study space, across devices.";
      if(next==="auth"){configureAuth();if(focus)focusStage();return;}
      if(next==="settings" || next==="sync" || next==="benchmark" || next==="plus"){if(focus)focusStage();return;}
      let title="", body="";
      switch(next){
        case "offline": title="Your device workspace is ready";body="<p>Account services are offline. You can still study and save work here.</p>"+action("retry","Reconnect",true)+action("workspace","Open workspace");break;
        case "welcome": title="You’re in.";body='<div class="flow-tick" aria-hidden="true">✓</div><p>Set up your study path. Your existing grades stay right where you saved them.</p>'+action("path","Choose my study path",true)+action("settings","Later");break;
        case "path": title="Where are you studying?";body=progress(1)+form('<fieldset class="path-options"><legend>Study path</legend>'+["university","secondary"].map(k=>'<label><input type="radio" name="mode" value="'+k+'" '+(draft.mode===k?'checked':'')+'><span>'+ (k==="university"?"University":"Secondary school")+'</span></label>').join("")+'</fieldset>'+label("School (optional)",input("school",'maxlength="90" autocomplete="organization" value="'+esc(draft.school)+'"')), "Continue");break;
        case "course": title=draft.mode==="secondary"?"Choose your first subject":"Choose your course";body=progress(2)+form(label(draft.mode==="secondary"?"Subject":"Programme or course",input("course",'list="flow-courses" required maxlength="80" value="'+esc(draft.course)+'" placeholder="Choose or type your own"'))+'<datalist id="flow-courses">'+subjects[draft.mode].map(s=>'<option>'+s+'</option>').join("")+'</datalist>',"Save study path")+action("path","Back");break;
        case "ready":title="Your study space is ready";body='<div class="flow-tick" aria-hidden="true">✓</div><p>'+esc(session.account?.studyProfile?.course || "Your study path")+' is saved to your profile.</p>'+action("workspace","Open workspace",true)+action("settings","Account settings");break;
        case "forgot":title="Reset your password";body=session.mailConfigured?form(label("Account email",input("email",'type="email" required autocomplete="email" maxlength="120" value="'+esc(recoveryEmail || byId("auth-email").value)+'"')),"Send reset link"):'<p>Email recovery is unavailable right now. Try again when email delivery is connected.</p>'+action("retry","Check connection",true);body+=action("auth","Back to sign in");break;
        case "sent":title="Check your inbox";body='<div class="flow-tick" aria-hidden="true">✓</div><p>If an account uses '+esc(recoveryEmail)+', a reset link will arrive there. Check your spam folder too.</p>'+action("auth","Return to sign in",true)+action("forgot","Try another address");break;
        case "reset":title="Choose a new password";body=form(label("New password",input("password",'type="password" minlength="10" maxlength="128" autocomplete="new-password" required'))+label("Confirm password",input("confirm",'type="password" minlength="10" maxlength="128" autocomplete="new-password" required')),"Save new password")+action("forgot","Request a fresh link");break;
        case "security":title="Account security";body='<p>'+ (session.account?.emailVerified?"Your email is verified.":"Verify your email to confirm it belongs to you.")+'</p>'+(session.account?.emailVerified?'':action("resend","Send verification email",true))+action("email-change","Change email")+action("data","Export or delete account");break;
        case "email-change":title="Change your email";body=session.mailConfigured?form(label("New email",input("email",'type="email" autocomplete="email" required maxlength="120"'))+label("Current password",input("password",'type="password" autocomplete="current-password" required')),"Send confirmation link"):'<p>Email delivery is unavailable. Your current address still works.</p>';body+=action("security","Back to security");break;
        case "data":title="Your account data";body='<p>Download your profile, cloud workspace and payment history. The file includes your private study records.</p>'+action("export","Download my data",true)+action("delete","Delete account");break;
        case "delete":title="Delete your account?";body='<p>Your cloud workspace and sign-in will be erased. This browser keeps its local copy. Cancel any active subscription first.</p>'+form(label("Confirm with your password",input("password",'type="password" autocomplete="current-password" required'))+'<label class="check"><input type="checkbox" name="confirm" required> I understand deletion is permanent.</label>',"Permanently delete account")+action("data","Keep my account");break;
        case "deleted":title="Account deleted";body='<p>Your cloud data has been removed. Your device workspace is still available.</p>'+action("workspace","Open local workspace",true);break;
        case "verify":case "email-confirm":title="Confirming your email";body='<div class="flow-skeleton" aria-label="Checking your link"></div>';break;
        case "verified":title="Email confirmed";body='<div class="flow-tick" aria-hidden="true">✓</div><p>Your email is verified. Continue to your study space.</p>'+action(signed?"settings":"auth",signed?"Open account":"Sign in",true);break;
        case "reset-done":title="Password updated";body='<div class="flow-tick" aria-hidden="true">✓</div><p>Sign in with your new password.</p>'+action("auth","Sign in",true);break;
        case "link-error":title="This link needs another try";body='<p>Your link may have expired or already been used.</p>'+action(signed?"security":"auth",signed?"Open security":"Sign in",true)+action("forgot","Recover password");break;
      }
      stage.innerHTML='<h2 tabindex="-1">'+title+'</h2>'+body+feedback;
      if(focus)focusStage();
    }
    async function perform(task) {
      if(pending)return;pending=true;
      const busy=stage;busy.setAttribute("aria-busy","true");busy.classList.add("flow-busy");
      const controls=[...busy.querySelectorAll("button")];controls.forEach(b=>b.disabled=true);
      try{await task();}catch(error){const p=byId("flow-status");if(p){p.setAttribute("role","alert");p.dataset.tone="error";p.textContent=error.message+" You can try again.";}}
      finally{pending=false;busy.removeAttribute("aria-busy");busy.classList.remove("flow-busy");controls.forEach(b=>b.disabled=false);}
    }
    function note(text){const p=byId("flow-status");if(p){p.textContent=text;p.dataset.tone="success";}}
    function handleAction(next) {
      if(next==="workspace"){go("overview");return;}
      if(next==="retry"){perform(async()=>{await GP.online.refresh();session=GP.online.session();render(session.online?(session.account?"settings":screen==="forgot"?"forgot":"auth"):"offline");});return;}
      if(next==="resend"){perform(async()=>{await api("/account/verify/request","POST",{});note("Verification email requested. Open the link in your inbox.");});return;}
      if(next==="export"){perform(async()=>{const data=await api("/account/export");GP.download("gradepath-account.json",new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));note("Download ready. Keep your copy somewhere private.");});return;}
      if(next==="path" && screen!=="course")readDraft();
      if(next==="auth")register=false;
      render(next);
    }
    account.addEventListener("click",e=>{const b=e.target.closest("[data-flow]");if(b)handleAction(b.dataset.flow);});
    stage.addEventListener("input",e=>{if(["path","course"].includes(screen)&&e.target.name){draft[e.target.name]=e.target.value;persist();}});
    stage.addEventListener("submit",e=>{
      e.preventDefault();const f=new FormData(e.target);
      perform(async()=>{
        if(screen==="path"){draft.mode=f.get("mode");draft.school=f.get("school").trim();persist();render("course");return;}
        if(screen==="course"){draft.course=f.get("course").trim();if(!draft.course)throw Error("Enter your course or subject.");persist();
          await api("/account/study-profile","PUT",draft);setMode(draft.mode);await GP.online.refresh();session=GP.online.session();render("ready");return;}
        if(screen==="forgot"){recoveryEmail=f.get("email");await api("/password/forgot","POST",{email:recoveryEmail});render("sent");return;}
        if(screen==="reset"){if(f.get("password")!==f.get("confirm"))throw Error("The two passwords must match.");await api("/password/reset","POST",{token:intent.token,password:f.get("password")});intent=null;await GP.online.refresh();render("reset-done");return;}
        if(screen==="email-change"){await api("/account/email","POST",{email:f.get("email"),password:f.get("password")});e.target.reset();render("security");note("Open the confirmation link at your new address. Your current email works until then.");return;}
        if(screen==="delete"){const id=session.account.id;await api("/account","DELETE",{password:f.get("password"),confirm:f.has("confirm")});try{localStorage.removeItem("gradepath-chat-"+id);sessionStorage.removeItem(draftKey());}catch{}await GP.online.refresh();render("deleted");}
      });
    });
    byId("auth-switch").onclick=()=>{register=!register;configureAuth();byId("auth-email").focus();};
    byId("auth-forgot").onclick=()=>render("forgot");
    window.addEventListener("gradepath-create",()=>{register=true;if(screen==="auth")configureAuth();});
    window.addEventListener("gradepath-session",e=>{
      const old=session.account?.id;session=e.detail;
      if(intent)return;
      if(!screen || old!==session.account?.id || screen==="offline")render(session.online?(session.account?"settings":"auth"):"offline",false);
    });
    window.addEventListener("gradepath-login",e=>{readDraft();render(e.detail==="register"?"welcome":session.account?.studyProfile?.mode?"settings":"welcome");});
    byId("auth-form").addEventListener("submit",()=>byId("auth-form").classList.add("flow-busy"));
    new MutationObserver(()=>{if(!byId("auth-primary").disabled)byId("auth-form").classList.remove("flow-busy");}).observe(byId("auth-primary"),{attributes:true,attributeFilter:["disabled"]});
    async function start(){
      await GP.online.refresh();session=GP.online.session();
      if(!intent){if(!screen)render(session.online?(session.account?"settings":"auth"):"offline",false);return;}
      if(intent.purpose==="reset"){render("reset");return;}
      render(intent.purpose==="verify"?"verify":"email-confirm");
      try{await api(intent.purpose==="verify"?"/account/verify":"/account/email/confirm","POST",{token:intent.token});intent=null;await GP.online.refresh();render("verified");}
      catch{intent=null;render("link-error");}
    }
    window.addEventListener("hashchange", () => {
      const link = /^#(verify|reset|email)=([A-Za-z0-9_-]{43})$/.exec(location.hash);
      if (!link) return;
      intent = { purpose: link[1], token: link[2] };
      history.replaceState(null, "", location.pathname + location.search + "#account");
      start();
    }, { capture: true });
    start();
  });
})();
