/* Study calendar, Study Pal shortcuts and touch feedback. (Landing behaviour: landing.js.) */
(function () {
  "use strict";
  const { C, byId, state, commit, el, status, onChange } = GP;
  document.addEventListener("click", e => {
    if (e.isTrusted && e.target.closest("button:enabled, .button") && navigator.vibrate && matchMedia("(pointer:coarse)").matches) navigator.vibrate(8);
  });
  for (const button of document.querySelectorAll("[data-pal]")) button.addEventListener("click", () => {
    const mode = {"Explain a concept":"explain","Plan my revision":"revision","Review my code":"code"}[button.dataset.pal];
    byId("tutor-mode").value = mode;
    byId("tutor-mode").dispatchEvent(new Event("change"));
    byId("pal-options").open = mode === "code";
    byId("tutor-question").focus();
  });

  let day = C.localDay(), month = day.slice(0,7), selected = false;
  const dayFormat = new Intl.DateTimeFormat(undefined, { month:"long", day:"numeric", weekday:"short" });
  const monthFormat = new Intl.DateTimeFormat(undefined, { month:"long", year:"numeric" });
  function dateOf(key) { return new Date(key+"T12:00:00"); }
  function entries() {
    return [...state.tasks.map(t=>({day:t.date,title:t.title,type:"Revision",info:t.minutes+" min",done:t.completed})),
      ...state.profiles.filter(p=>p.date).map(p=>({day:p.date,title:p.name || p.code,type:"Assessment",info:p.code})),
      ...Object.entries(state.exams).filter(([,p])=>p.date).map(([exam,p])=>({day:p.date,title:exam,type:"Exam",info:"Exam preparation"}))];
  }
  function drawCalendar() {
    const first = dateOf(month+"-01"), events=entries();
    byId("cal-month").textContent=monthFormat.format(first);
    const start=C.shiftDay(-((first.getDay()+6)%7),month+"-01");
    const days=[];
    const weeks=Math.ceil((((first.getDay()+6)%7)+new Date(first.getFullYear(),first.getMonth()+1,0).getDate())/7);
    for(let i=0;i<weeks*7;i++) {
      const key=C.shiftDay(i,start), matches=events.filter(e=>e.day===key);
      const b=el("button",undefined,"cal-cell");b.type="button";b.dataset.day=key;
      b.dataset.outside=String(!key.startsWith(month));b.setAttribute("aria-pressed",String(selected && day===key));
      b.setAttribute("aria-label",dayFormat.format(dateOf(key))+", "+matches.length+" events");
      if(key===C.localDay())b.setAttribute("aria-current","date");
      b.append(el("span",String(dateOf(key).getDate()),"cal-number"));
      for(const item of matches.slice(0,2)) {const pill=el("small",item.title);pill.dataset.kind=item.type;b.append(pill);}
      days.push(b);
    }
    byId("cal-days").replaceChildren(...days);
    byId("cal-day-title").textContent=selected?dayFormat.format(dateOf(day)):"Coming up";
    const list=selected?events.filter(e=>e.day===day):events.filter(e=>e.day>=C.localDay() && e.day.startsWith(month));
    byId("cal-agenda").replaceChildren(...list.sort((a,b)=>a.day.localeCompare(b.day)).map(item=>{
      const box=el("article",undefined,"cal-event");box.dataset.kind=item.type;
      box.append(el("small",item.type+" · "+dayFormat.format(dateOf(item.day))),el("strong",item.title),el("span",item.done?"Completed":item.info));return box;
    }));
    if(!list.length)byId("cal-agenda").append(el("p",selected?"This day is open. Add a session when you’re ready.":"Your upcoming sessions and assessments will appear here.","help"));
  }
  function showForm(open) {byId("cal-form").hidden=!open;byId("cal-add").hidden=open;if(open)byId("cal-title").focus();}
  byId("cal-days").addEventListener("click",e=>{const cell=e.target.closest("[data-day]");if(!cell)return;day=cell.dataset.day;month=day.slice(0,7);selected=true;showForm(false);drawCalendar();byId("cal-days").querySelector('[aria-pressed="true"]').focus();});
  function turn(direction) {
    const grid = byId("cal-days");
    grid.classList.remove("cal-turn-next", "cal-turn-prev");
    void grid.offsetWidth; // restart the month-change animation
    grid.classList.add(direction > 0 ? "cal-turn-next" : "cal-turn-prev");
  }
  for(const [id,delta] of [["cal-prev",-1],["cal-next",1]])byId(id).onclick=()=>{const d=dateOf(month+"-01");d.setMonth(d.getMonth()+delta);month=C.localDay(d);month=month.slice(0,7);day=month+"-01";selected=false;showForm(false);drawCalendar();turn(delta);};
  byId("cal-today").onclick=()=>{day=C.localDay();month=day.slice(0,7);selected=true;drawCalendar();};
  byId("cal-add").onclick=()=>{selected=true;drawCalendar();showForm(true);};
  byId("cal-cancel").onclick=()=>{showForm(false);byId("cal-add").focus();};
  byId("cal-form").onsubmit=e=>{
    e.preventDefault();const title=byId("cal-title").value.trim();
    if(!title || state.tasks.length>=400){status("cal-status","Enter a title or remove an old study task to make room.","error");return;}
    state.tasks.push({id:C.id(),title,course:"",date:day,minutes:byId("cal-minutes").valueAsNumber,completed:""});
    const saved=commit();e.target.reset();showForm(false);byId("cal-add").focus();status("cal-status",saved?"Session saved.":"Export your work before closing this tab.",saved?"success":"error");
  };
  onChange(drawCalendar);
})();
