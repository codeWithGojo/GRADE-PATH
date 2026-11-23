/* Public landing illustration, study calendar and Study Pal shortcuts. */
(function () {
  "use strict";
  const { C, byId, state, commit, el, status, onChange, go } = GP;
  const art = byId("study-art"), ctx = art.getContext("2d");
  if (ctx) {
    ctx.scale(2, 2);
    const ink = "#181921", lilac = "#cbb3fb", mint = "#dbf3ad";
    function line(points, color, weight = 1, fill) {
      ctx.beginPath();
      points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
      if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
    }
    function ellipse(x,y,rx,ry,angle,color,fill) {
      ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,Math.PI*2);
      if (fill) {ctx.fillStyle=fill;ctx.fill();}
      ctx.strokeStyle=color;ctx.lineWidth=.9;ctx.stroke();
    }
    function sphere(x,y,r) {
      ellipse(x,y,r,r,0,"#d3d1da",ink);
      for (const k of [.3,.65]) ellipse(x,y,r*k,r,.15,"#9996aa");
      for (const k of [-.55,0,.55]) ellipse(x,y+k*r,r*Math.sqrt(1-k*k),r*.13,-.04,"#9996aa");
    }
    // Isometric graph paper, a lilac book and a lime orbital ring.
    for(let x=28;x<470;x+=18) line([[x,60],[x,374]],"#292a33",.7);
    for(let y=68;y<375;y+=18) line([[25,y],[465,y]],"#292a33",.7);
    ellipse(268,330,150,22,-.12,"#494653");
    const front=[[126,132],[279,86],[326,243],[170,294]];
    for(let i=10;i>=0;i--) line(front.map(([x,y])=>[x+i*.9,y+i*1.2]),i%2?"#595366":"#d1c9d6",1,i?"#eee7e7":lilac);
    line([[144,130],[188,287]],"#534960",2);
    ctx.save();ctx.transform(.98,-.31,.27,.95,174,180);
    ctx.font="italic 50px Georgia";ctx.fillStyle=ink;ctx.fillText("ƒ(x)",0,0);
    for(let i=0;i<4;i++)line([[3,31+i*8],[78-i*9,31+i*8]],"#5e5272",1);
    ctx.restore();
    ctx.save();ctx.translate(346,128);ctx.rotate(-.72);
    for(let t=14;t>=0;t--)ellipse(0,t,58,29,0,"#566747",mint);
    ellipse(0,0,33,14,0,ink,ink);ctx.restore();
    sphere(87,243,28);sphere(359,262,18);sphere(201,64,12);
    line([[65,113],[124,84],[155,92]],"#e8e5e4");line([[149,86],[155,92],[145,95]],"#e8e5e4");
    ctx.save();ctx.translate(286,321);ctx.rotate(-.12);ctx.fillStyle=mint;ctx.fillRect(0,0,90,34);
    ctx.fillStyle=ink;ctx.font="italic 18px Georgia";ctx.fillText("a² + b²",12,23);ctx.restore();
  }
  document.querySelector("[data-enter-university]").addEventListener("click", () => GP.setMode("university"));
  document.querySelector("[data-create-account]").addEventListener("click", () => window.dispatchEvent(new Event("gradepath-create")));
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
  for(const [id,delta] of [["cal-prev",-1],["cal-next",1]])byId(id).onclick=()=>{const d=dateOf(month+"-01");d.setMonth(d.getMonth()+delta);month=C.localDay(d);month=month.slice(0,7);day=month+"-01";selected=false;showForm(false);drawCalendar();};
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
