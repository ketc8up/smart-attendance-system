import { useState } from "react";

// ── Dummy data (swap with Firebase calls later) ──────────────────────────────
const STUDENT = {
  name: "Aanya Sharma",
  rollNo: "22CS047",
  branch: "Computer Science & Engineering",
  semester: "4th Semester",
  section: "A",
};

const SEMESTER_MONTHS = [
  { month: "January",  present: 25, working: 28, absents: ["Jan 8", "Jan 15", "Jan 22"] },
  { month: "February", present: 22, working: 24, absents: ["Feb 6", "Feb 19"] },
  { month: "March",    present: 20, working: 26, absents: ["Mar 3", "Mar 12", "Mar 17", "Mar 24", "Mar 28", "Mar 31"] },
  { month: "April",    present: 19, working: 22, absents: ["Apr 2", "Apr 9", "Apr 23"] },
  { month: "May",      present: 14, working: 16, absents: ["May 8", "May 14"] },
];

// Log — most recent first. Absent rows have no entry/exit times.
const ATTENDANCE_LOG = [
  { id: 1,  date: "Wed, 22 Apr 2026", entry: "09:07 AM", exit: "03:45 PM", status: "present" },
  { id: 2,  date: "Tue, 21 Apr 2026", entry: "09:15 AM", exit: "03:50 PM", status: "present" },
  { id: 3,  date: "Mon, 20 Apr 2026", entry: null,        exit: null,        status: "absent"  },
  { id: 4,  date: "Fri, 18 Apr 2026", entry: "09:02 AM", exit: "03:40 PM", status: "present" },
  { id: 5,  date: "Thu, 17 Apr 2026", entry: "09:22 AM", exit: "03:55 PM", status: "present" },
  { id: 6,  date: "Wed, 16 Apr 2026", entry: null,        exit: null,        status: "absent"  },
  { id: 7,  date: "Tue, 15 Apr 2026", entry: "09:10 AM", exit: "04:00 PM", status: "present" },
  { id: 8,  date: "Mon, 14 Apr 2026", entry: "09:18 AM", exit: "03:48 PM", status: "present" },
  { id: 9,  date: "Fri, 11 Apr 2026", entry: "08:58 AM", exit: "03:42 PM", status: "present" },
  { id: 10, date: "Thu, 10 Apr 2026", entry: null,        exit: null,        status: "absent"  },
  { id: 11, date: "Wed, 09 Apr 2026", entry: "09:05 AM", exit: "03:38 PM", status: "present" },
  { id: 12, date: "Tue, 08 Apr 2026", entry: "09:30 AM", exit: "03:50 PM", status: "present" },
];

const LOGS_PER_PAGE   = 7;
const OVERALL_PRESENT = SEMESTER_MONTHS.reduce((s, m) => s + m.present, 0);
const OVERALL_WORKING = SEMESTER_MONTHS.reduce((s, m) => s + m.working, 0);
const OVERALL_PCT     = Math.round((OVERALL_PRESENT / OVERALL_WORKING) * 100);

const MONTH_PALETTES = [
  { bg: "#F5EDE3", accent: "#C17F5B", dot: "#E8C4A2" },
  { bg: "#EAF0E8", accent: "#6A8F6A", dot: "#B7D1B7" },
  { bg: "#F0EAF5", accent: "#9B7BB8", dot: "#D4BFE8" },
  { bg: "#F5EDEA", accent: "#C16B6B", dot: "#E8BEBE" },
  { bg: "#EAF0F5", accent: "#5B87A8", dot: "#B2CFE3" },
];

function pctColor(pct) {
  if (pct >= 85) return "#6A8F6A";
  if (pct >= 75) return "#C17F5B";
  return "#C16B6B";
}

function RadialProgress({ pct, size = 90, stroke = 8, color }) {
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8DDD4" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

export default function AttendanceDashboard() {
  const [tab,           setTab]           = useState("overview");
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [logPage,       setLogPage]       = useState(1);

  const totalLogPages = Math.ceil(ATTENDANCE_LOG.length / LOGS_PER_PAGE);
  const pagedLog      = ATTENDANCE_LOG.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F7F1EB; min-height: 100vh; color: #3A2E27; }
        .page { max-width: 820px; margin: 0 auto; padding: 32px 20px 60px; }

        /* header */
        .header { display:flex; align-items:center; gap:20px; margin-bottom:26px; position:relative; }
        .header::after { content:''; position:absolute; bottom:-10px; left:0; width:100%; height:1px; background:linear-gradient(90deg,#C17F5B33,transparent); }
        .avatar { width:68px; height:68px; border-radius:50%; background:linear-gradient(135deg,#E8C4A2,#C17F5B); display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:24px; color:#fff; flex-shrink:0; box-shadow:0 4px 18px #C17F5B30; }
        .htext h1 { font-family:'Playfair Display',serif; font-size:22px; font-weight:700; line-height:1.2; }
        .htext p  { font-size:12.5px; color:#8C7B6E; margin-top:3px; font-weight:300; }
        .badge { display:inline-block; background:#F0E6DC; color:#C17F5B; border-radius:20px; padding:3px 12px; font-size:11px; font-weight:500; margin-top:6px; }

        /* tabs */
        .tabs { display:flex; gap:4px; background:#EDE5DC; border-radius:14px; padding:4px; margin:20px 0 26px; width:fit-content; }
        .tab-btn { border:none; cursor:pointer; border-radius:10px; padding:8px 22px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; background:transparent; color:#8C7B6E; transition:all .2s; letter-spacing:.3px; }
        .tab-btn.active { background:#3A2E27; color:#F7F1EB; box-shadow:0 2px 8px #3A2E2730; }
        .tab-btn:hover:not(.active) { background:#E0D5CC; color:#3A2E27; }

        /* overall card */
        .overall-card { background:linear-gradient(135deg,#3A2E27 55%,#5C4033); border-radius:24px; padding:26px 28px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; gap:20px; box-shadow:0 8px 32px #3A2E2740; position:relative; overflow:hidden; }
        .overall-card::before { content:''; position:absolute; top:-40px; right:-40px; width:180px; height:180px; border-radius:50%; background:#C17F5B18; }
        .overall-left h2 { font-family:'Playfair Display',serif; font-size:12px; font-weight:500; color:#C9B9AC; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px; }
        .big-num { font-size:38px; font-weight:700; color:#fff; line-height:1; }
        .big-num span { font-size:16px; color:#C9B9AC; font-weight:300; }
        .overall-sub { font-size:11px; color:#9C8C80; margin-top:8px; }
        .radial-wrap { position:relative; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .radial-label { position:absolute; font-size:16px; font-weight:700; color:#fff; text-align:center; line-height:1; }
        .radial-label .sl { font-size:9px; color:#C9B9AC; display:block; margin-top:2px; }

        /* chips */
        .chip-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:24px; }
        .chip { border-radius:14px; padding:12px 16px; flex:1; min-width:90px; background:#fff; box-shadow:0 2px 10px #3A2E2710; display:flex; flex-direction:column; gap:4px; }
        .chip .cl { font-size:10px; color:#8C7B6E; text-transform:uppercase; letter-spacing:.6px; font-weight:500; }
        .chip .cv { font-size:22px; font-weight:700; }

        /* section title */
        .stitle { font-family:'Playfair Display',serif; font-size:19px; font-weight:700; margin-bottom:14px; display:flex; align-items:center; gap:10px; }
        .stitle::after { content:''; flex:1; height:1px; background:#E0D5CC; }

        /* month cards */
        .month-grid { display:flex; flex-direction:column; gap:12px; }
        .month-card { border-radius:18px; overflow:hidden; box-shadow:0 2px 12px #3A2E2710; cursor:pointer; transition:box-shadow .22s, transform .22s; }
        .month-card:hover { box-shadow:0 6px 22px #3A2E2720; transform:translateY(-2px); }
        .mhdr { display:flex; align-items:center; padding:16px 20px; gap:14px; }
        .micon { width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; }
        .minfo { flex:1; }
        .mname { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; }
        .mfrac { font-size:11.5px; color:#8C7B6E; font-weight:300; margin-top:2px; }
        .mbar-wrap { flex:1; max-width:150px; display:flex; flex-direction:column; gap:4px; }
        .bar-bg { height:5px; border-radius:99px; background:#E8DDD4; overflow:hidden; }
        .bar-fill { height:100%; border-radius:99px; transition:width .8s cubic-bezier(.4,0,.2,1); }
        .bar-pct { font-size:11px; font-weight:500; text-align:right; }
        .arrow { font-size:13px; margin-left:6px; flex-shrink:0; transition:transform .2s; }
        .absent-list { padding:0 20px 16px; display:flex; flex-wrap:wrap; gap:7px; animation:fadeIn .22s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }
        .a-chip { border-radius:99px; padding:4px 13px; font-size:11.5px; font-weight:500; border:1px solid; }
        .no-abs { font-size:12px; color:#6A8F6A; padding:0 20px 16px; font-style:italic; }

        /* log */
        .log-wrap { background:#fff; border-radius:22px; box-shadow:0 2px 16px #3A2E2712; overflow:hidden; }
        .log-head { padding:22px 24px 14px; border-bottom:1px solid #F0E8E0; }
        .log-head h2 { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; }
        .log-head p { font-size:12px; color:#B0A097; margin-top:4px; }

        .log-cols { display:grid; grid-template-columns:1.8fr 1fr 1fr 0.85fr; padding:10px 24px; background:#FAF6F2; border-bottom:1px solid #F0E8E0; }
        .lcol { font-size:10px; font-weight:600; color:#B0A097; text-transform:uppercase; letter-spacing:.8px; }

        .log-row { display:grid; grid-template-columns:1.8fr 1fr 1fr 0.85fr; padding:15px 24px; align-items:center; border-bottom:1px solid #F7F2EE; transition:background .15s; }
        .log-row:last-child { border-bottom:none; }
        .log-row:hover { background:#FAF6F2; }
        .log-row.ab { background:#FDF9F8; }

        .ldate { font-size:13px; font-weight:500; color:#3A2E27; }
        .tval { font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; color:#3A2E27; letter-spacing:.3px; }
        .tdash { font-size:13px; color:#D0C4BB; }

        .pill { display:inline-flex; align-items:center; justify-content:center; border-radius:99px; padding:4px 13px; font-size:11px; font-weight:600; letter-spacing:.4px; width:fit-content; }
        .pill.p { background:#EAF3EA; color:#4E8A4E; }
        .pill.a { background:#FCEAEA; color:#B85454; }

        /* pagination */
        .paging { display:flex; justify-content:flex-end; align-items:center; gap:6px; padding:14px 24px; border-top:1px solid #F0E8E0; }
        .pbtn { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; cursor:pointer; font-size:13px; font-weight:600; background:#F0E8E0; color:#8C7B6E; transition:all .18s; }
        .pbtn.on { background:#3A2E27; color:#fff; }
        .pbtn:hover:not(.on) { background:#E0D5CC; }

        .fnote { margin-top:26px; text-align:center; font-size:11px; color:#B0A097; font-style:italic; }

        @media(max-width:540px){
          .overall-card{flex-direction:column;align-items:flex-start;}
          .mbar-wrap{max-width:100px;}
          .log-cols,.log-row{grid-template-columns:1.5fr 1fr 1fr 0.7fr;padding:12px 14px;}
          .ldate,.tval{font-size:11.5px;}
        }
      `}</style>

      <div className="page">

        {/* Profile */}
        <div className="header">
          <div className="avatar">{STUDENT.name.split(" ").map(w=>w[0]).join("")}</div>
          <div className="htext">
            <h1>{STUDENT.name}</h1>
            <p>{STUDENT.branch} · {STUDENT.semester}</p>
            <span className="badge">Roll No: {STUDENT.rollNo} &nbsp;·&nbsp; Sec {STUDENT.section}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[["overview","Overview"],["monthly","Monthly"],["log","Log"]].map(([k,l])=>(
            <button key={k} className={`tab-btn${tab===k?" active":""}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview" && <>
          <div className="overall-card">
            <div className="overall-left">
              <h2>Semester Attendance</h2>
              <div className="big-num">{OVERALL_PRESENT} <span>/ {OVERALL_WORKING} days</span></div>
              <p className="overall-sub">Jan – May 2025 · Sundays & holidays excluded</p>
            </div>
            <div className="radial-wrap">
              <RadialProgress pct={OVERALL_PCT} color={pctColor(OVERALL_PCT)} />
              <div className="radial-label">{OVERALL_PCT}%<span className="sl">Overall</span></div>
            </div>
          </div>

          <div className="chip-row">
            <div className="chip"><span className="cl">Days Present</span><span className="cv" style={{color:"#6A8F6A"}}>{OVERALL_PRESENT}</span></div>
            <div className="chip"><span className="cl">Days Absent</span><span className="cv" style={{color:"#C16B6B"}}>{OVERALL_WORKING-OVERALL_PRESENT}</span></div>
            <div className="chip"><span className="cl">Working Days</span><span className="cv">{OVERALL_WORKING}</span></div>
            <div className="chip"><span className="cl">Status</span><span className="cv" style={{color:pctColor(OVERALL_PCT),fontSize:15}}>{OVERALL_PCT>=85?"✓ Good":OVERALL_PCT>=75?"⚠ Ok":"✗ Low"}</span></div>
          </div>
          <p className="fnote">Data synced from IoT attendance system · Sundays & public holidays not counted</p>
        </>}

        {/* ── MONTHLY ── */}
        {tab==="monthly" && <>
          <div className="stitle">Monthly Breakdown</div>
          <div className="month-grid">
            {SEMESTER_MONTHS.map((m,i)=>{
              const pct=Math.round((m.present/m.working)*100);
              const pal=MONTH_PALETTES[i];
              const isOpen=expandedMonth===i;
              return (
                <div key={m.month} className="month-card" style={{background:pal.bg}} onClick={()=>setExpandedMonth(isOpen?null:i)}>
                  <div className="mhdr">
                    <div className="micon" style={{background:pal.dot,color:pal.accent}}>{m.month.slice(0,3).toUpperCase()}</div>
                    <div className="minfo">
                      <div className="mname">{m.month}</div>
                      <div className="mfrac">{m.present} / {m.working} working days</div>
                    </div>
                    <div className="mbar-wrap">
                      <div className="bar-bg"><div className="bar-fill" style={{width:`${pct}%`,background:pal.accent}}/></div>
                      <div className="bar-pct" style={{color:pal.accent}}>{pct}%</div>
                    </div>
                    <div className="arrow" style={{color:pal.accent,transform:isOpen?"rotate(180deg)":"none"}}>▾</div>
                  </div>
                  {isOpen && (m.absents.length===0
                    ? <p className="no-abs">🎉 No absences this month!</p>
                    : <div className="absent-list">
                        <span style={{fontSize:10.5,color:"#8C7B6E",width:"100%",marginBottom:2}}>Absent on:</span>
                        {m.absents.map(d=>(
                          <span key={d} className="a-chip" style={{background:`${pal.accent}15`,borderColor:`${pal.accent}40`,color:pal.accent}}>{d}</span>
                        ))}
                      </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="fnote" style={{marginTop:18}}>Tap a month to see absent dates</p>
        </>}

        {/* ── LOG ── */}
        {tab==="log" && <>
          <div className="log-wrap">
            <div className="log-head">
              <h2>Attendance Log</h2>
              <p>RFID scan history — most recent first</p>
            </div>

            <div className="log-cols">
              <span className="lcol">Date</span>
              <span className="lcol">Entry</span>
              <span className="lcol">Exit</span>
              <span className="lcol">Status</span>
            </div>

            {pagedLog.map(row=>(
              <div key={row.id} className={`log-row${row.status==="absent"?" ab":""}`}>
                <span className="ldate">{row.date}</span>
                <span>{row.entry ? <span className="tval">{row.entry}</span> : <span className="tdash">—</span>}</span>
                <span>{row.exit  ? <span className="tval">{row.exit}</span>  : <span className="tdash">—</span>}</span>
                <span className={`pill ${row.status==="present"?"p":"a"}`}>{row.status==="present"?"Present":"Absent"}</span>
              </div>
            ))}

            <div className="paging">
              {Array.from({length:totalLogPages},(_,i)=>i+1).map(p=>(
                <button key={p} className={`pbtn${logPage===p?" on":""}`} onClick={()=>setLogPage(p)}>{p}</button>
              ))}
            </div>
          </div>
          <p className="fnote">Recorded via RFID scan at classroom entry gate</p>
        </>}

      </div>
    </>
  );
}
