"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { auth, db } from "../../lib/firebase";

// ─── Design-Bausteine ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-400">
      {children}
    </div>
  );
}

// ─── Styles (Scope: nur diese Seite) ─────────────────────────────────────────

const STYLES = `
  .seat-page-root {
    --brown:#796849;
    --apricot:#e99a6c;
    --bg:#f7f3ee;
    --card:#ffffff;
    --border:#e7e0d7;
    --text:#1f1f1f;
    --muted:#6b6b6b;
    --shadow2:0 10px 24px rgba(0,0,0,.06);
    --danger:#b23b3b;
  }
  .seat-page-root * { box-sizing:border-box; }

  .seat-wrap {
    height: calc(100vh - 220px);
    min-height: 560px;
    display:grid;
    grid-template-columns:3.5fr 1fr;
    grid-template-areas:"plan guests";
    gap:14px;
    align-items:stretch;
  }
  @media(max-width:1250px){
    .seat-wrap{ grid-template-columns:1fr; grid-template-areas:"plan" "guests"; }
  }

  .planpanel{ grid-area:plan; }
  .guestpanel{ grid-area:guests; }

  .seat-panel{
    background:var(--card);
    border:1px solid var(--border);
    border-radius:18px;
    box-shadow:var(--shadow2);
    overflow:hidden;
    min-width:0;
    display:flex;
    flex-direction:column;
    height:100%;
  }
  .seat-head{
    padding:14px 16px;
    border-bottom:1px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    flex-wrap:wrap;
  }
  .seat-title{ font-weight:900; font-size:16px; color:var(--brown); }
  .seat-sub{ font-size:11px; color:var(--muted); margin-top:2px; }
  .pad{ padding:14px 14px 16px; flex:1; min-height:0; overflow:auto; }

  .btn{
    border:1px solid rgba(121,104,73,.22);
    background:linear-gradient(180deg,#fff,#fbf7f3);
    color:var(--brown);
    padding:10px 12px;
    border-radius:14px;
    font-weight:900;
    cursor:pointer;
    box-shadow:0 8px 18px rgba(0,0,0,.06);
    transition:transform .12s ease,box-shadow .12s ease;
    user-select:none;
    white-space:nowrap;
  }
  .btn:hover{ transform:translateY(-1px); border-color:rgba(233,154,108,.55); }
  .btn:disabled{ opacity:.55; cursor:not-allowed; transform:none; }
  .btn-on{ border-color:rgba(233,154,108,.80); background:linear-gradient(180deg,#fff,rgba(233,154,108,.12)); }

  .input{
    width:100%;
    border:1px solid var(--border);
    border-radius:14px;
    padding:9px 10px;
    outline:none;
    font-size:13px;
    background:#fff;
  }
  .input:focus{ border-color:rgba(233,154,108,.75); box-shadow:0 0 0 3px rgba(233,154,108,.18); }

  .row{ display:flex; gap:10px; align-items:center; }
  .row > *{ flex:1; }

  .callout{
    margin-top:10px;
    border-radius:14px;
    border:1px dashed rgba(121,104,73,.30);
    padding:10px 12px;
    background:rgba(255,255,255,.65);
    font-size:12px;
    color:var(--muted);
  }

  .guest-list{ margin-top:12px; display:grid; gap:10px; }

  .guest-pill{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    padding:10px 12px;
    border:1px solid var(--border);
    border-radius:14px;
    background:#fff;
    box-shadow:0 6px 16px rgba(0,0,0,.05);
    cursor:grab;
    user-select:none;
    transition:transform .12s ease,box-shadow .12s ease;
    min-width:0;
  }
  .guest-pill:hover{ transform:translateY(-1px); border-color:rgba(233,154,108,.55); }
  .guest-pill.dragging{ opacity:.55; transform:scale(.98); cursor:grabbing; }

  .guest-left{ display:flex; align-items:center; gap:10px; min-width:0; flex:1; }
  .guest-dot{
    width:26px; height:26px; border-radius:50%;
    display:grid; place-items:center;
    background:rgba(233,154,108,.18);
    color:var(--brown); font-size:11px; font-weight:900; flex:0 0 auto;
  }
  .gname-row{ display:flex; align-items:center; gap:8px; min-width:0; }
  .guest-name{ font-weight:900; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .guest-meta{ font-size:12px; color:var(--muted); margin-top:2px; }
  .gcolor-dot{
    width:12px; height:12px; border-radius:999px;
    border:1px solid rgba(121,104,73,.22); flex:0 0 auto; cursor:pointer;
  }
  .guest-del{
    flex:0 0 auto; width:34px; height:34px; border-radius:12px;
    border:1px solid rgba(178,59,59,.22); background:rgba(178,59,59,.06);
    color:var(--danger); font-weight:900; cursor:pointer;
    display:grid; place-items:center; box-shadow:0 8px 18px rgba(0,0,0,.06);
    transition:transform .12s;
  }
  .guest-del:hover{ transform:translateY(-1px); border-color:rgba(178,59,59,.55); }

  .planpanel .canvas-wrap{
    position:relative;
    flex:1;
    min-height:0;
    background:
      linear-gradient(to right,rgba(121,104,73,.075) 1px,transparent 1px),
      linear-gradient(to bottom,rgba(121,104,73,.075) 1px,transparent 1px);
    background-size:28px 28px;
    background-color:var(--bg);
    overflow:hidden;
  }
  @media(max-width:700px){ .planpanel .canvas-wrap{ min-height:560px; } }

  .canvas-wrap svg{ width:100%; height:100%; display:block; }

  .table-label{ font-weight:900; fill:var(--brown); user-select:none; }
  .table-meta{ font-size:12px; fill:#6b6b6b; user-select:none; }
  .table-outline{ fill:rgba(255,255,255,0); stroke:rgba(121,104,73,.65); stroke-width:2; }
  .table-selected{ stroke:rgba(233,154,108,.95) !important; stroke-width:2.6 !important; }
  .chair-outline{ fill:transparent; stroke:rgba(121,104,73,.35); stroke-width:2; stroke-dasharray:4 4; }
  .chair-occupied{ fill:rgba(233,154,108,.22); stroke:rgba(121,104,73,.55); stroke-dasharray:0; }
  .seat-badge{ fill:#fff; stroke:rgba(121,104,73,.30); stroke-width:1.5; cursor:pointer; }
  .seat-badge-text{ font-size:12px; font-weight:900; fill:var(--brown); user-select:none; }

  .toast{
    position:absolute; left:14px; bottom:14px;
    background:rgba(255,255,255,.92);
    border:1px solid var(--border);
    border-radius:14px;
    box-shadow:var(--shadow2);
    padding:10px 12px;
    font-size:13px;
    color:var(--text);
    max-width:760px;
    display:none;
    z-index:20;
  }

  /* Head Actions */
  .head-actions{ display:flex; align-items:center; justify-content:flex-end; gap:10px; flex-wrap:wrap; }
  .btn-group{ display:flex; gap:8px; padding-left:10px; border-left:1px solid var(--border); }
  .btn-group:first-child{ border-left:none; padding-left:0; }
  .hbtn{
    border:1px solid var(--border);
    background:#fff;
    color:var(--brown);
    padding:8px 10px;
    border-radius:12px;
    font-weight:900;
    font-size:12px;
    cursor:pointer;
    box-shadow:0 6px 16px rgba(0,0,0,.05);
    transition:transform .12s,box-shadow .12s;
    white-space:nowrap;
  }
  .hbtn:hover{ transform:translateY(-1px); border-color:rgba(233,154,108,.55); }
  .hbtn:disabled{ opacity:.45; cursor:not-allowed; transform:none; }
  .hbtn-primary{ border-color:rgba(233,154,108,.75); background:rgba(233,154,108,.12); }
  .hbtn-danger{ border-color:rgba(178,59,59,.30); background:rgba(178,59,59,.06); color:var(--danger); }
  .hbtn-ghost{ background:rgba(247,243,238,.65); }

  /* Table Editor */
  .table-editor{
    position:absolute; top:12px; right:12px; z-index:25;
    width:270px; max-width:calc(100% - 24px);
    background:rgba(255,255,255,.92);
    border:1px solid var(--border);
    border-radius:16px;
    box-shadow:var(--shadow2);
    backdrop-filter:blur(6px);
    padding:10px;
    display:none;
  }
  .te-title{ font-weight:900; color:var(--brown); font-size:13px; margin-bottom:8px; }
  .te-row{ display:flex; gap:8px; align-items:center; margin-top:8px; }
  .te-row label{ flex:1; font-size:12px; color:var(--muted); }
  .te-stepper{ display:flex; gap:6px; align-items:center; justify-content:flex-end; }
  .te-val{ min-width:56px; text-align:center; font-weight:900; color:var(--brown); font-size:12px; padding:6px 8px; border:1px solid var(--border); border-radius:12px; background:#fff; }
  .te-mini{ border:1px solid var(--border); background:#fff; color:var(--brown); width:34px; height:34px; border-radius:12px; font-weight:900; cursor:pointer; }
  .te-mini:disabled{ opacity:.45; cursor:not-allowed; }
  .te-input{ width:100%; border:1px solid var(--border); border-radius:12px; padding:8px 10px; outline:none; font-size:13px; background:#fff; }
  .te-input:focus{ border-color:rgba(233,154,108,.75); box-shadow:0 0 0 3px rgba(233,154,108,.18); }
  .te-sub{ font-size:11px; color:var(--muted); margin-top:6px; line-height:1.35; }

  /* Setup Overlay */
  .setup-overlay{
    position:fixed; inset:0;
    background:rgba(20,16,12,.42);
    backdrop-filter:blur(10px);
    display:flex;
    align-items:flex-start;
    justify-content:center;
    z-index:9999;
    padding:16px;
    padding-top:calc(env(safe-area-inset-top) + 12px);
    overflow-y:auto;
  }
  .setup-shell{
    width:min(720px,100%);
    background:rgba(255,255,255,.92);
    border:1px solid rgba(231,224,215,.85);
    border-radius:26px;
    box-shadow:0 30px 90px rgba(0,0,0,.22);
    overflow:hidden;
    max-height:calc(100dvh - 24px);
  }
  .setup-head{
    padding:18px 18px 10px;
    border-bottom:1px solid rgba(231,224,215,.85);
    display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
  }
  .setup-head-center{ flex:1; text-align:center; padding-top:2px; }
  .setup-stepline{ font-size:12px; color:var(--muted); }
  .setup-progress{ margin:12px auto 0; width:min(420px,90%); height:10px; border-radius:999px; background:rgba(121,104,73,.12); overflow:hidden; }
  .setup-progress > div{ height:100%; width:25%; border-radius:999px; background:linear-gradient(90deg,rgba(233,154,108,.85),rgba(121,104,73,.85)); transition:width .25s ease; }
  .setup-dots{ display:none; }
  .setup-title{ margin-top:14px; font-weight:900; font-size:34px; color:var(--brown); font-family:Georgia,serif; }
  .setup-sub{ margin-top:6px; font-size:13px; color:var(--muted); }
  .setup-x{ width:40px; height:40px; border-radius:14px; border:1px solid rgba(231,224,215,.95); background:rgba(255,255,255,.9); cursor:pointer; font-size:20px; }
  .setup-body{ padding:16px; display:grid; gap:12px; max-height:calc(100dvh - 220px); overflow-y:auto; }
  .setup-block{ border:1px solid rgba(231,224,215,.95); border-radius:20px; padding:14px; background:rgba(255,255,255,.92); box-shadow:0 14px 30px rgba(0,0,0,.06); }
  .blk-title{ font-weight:900; color:var(--brown); margin-bottom:10px; font-size:13px; }
  .setup-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media(max-width:700px){ .setup-grid2{ grid-template-columns:1fr; } }

  .pick-card{
    display:flex; align-items:center; gap:12px;
    border:1px solid rgba(231,224,215,.95); background:rgba(255,255,255,.92);
    border-radius:22px; padding:16px; cursor:pointer;
    box-shadow:0 14px 30px rgba(0,0,0,.06);
    transition:transform .12s,border-color .12s; text-align:left;
  }
  .pick-card:hover{ transform:translateY(-1px); border-color:rgba(233,154,108,.55); }
  .pick-ic{ width:52px; height:52px; border-radius:18px; display:grid; place-items:center; background:rgba(233,154,108,.16); border:1px solid rgba(233,154,108,.20); font-size:20px; }
  .pick-title{ font-weight:900; color:var(--brown); }
  .pick-sub{ font-size:12px; color:var(--muted); margin-top:4px; line-height:1.35; }
  .pick-go{ margin-left:auto; font-size:22px; color:rgba(121,104,73,.75); }
  .pick-bullets{ margin:10px 0 0; padding-left:16px; color:var(--muted); font-size:12px; line-height:1.45; }
  .pick-bullets li{ margin:4px 0; }

  .big-stepper{ display:flex; align-items:center; justify-content:center; gap:18px; padding:12px 0 2px; }
  .big-btn{ width:54px; height:54px; border-radius:999px; border:1px solid rgba(231,224,215,.95); background:rgba(255,255,255,.92); color:rgba(121,104,73,.85); font-weight:900; cursor:pointer; }
  .big-value{ min-width:120px; text-align:center; font-size:54px; font-weight:900; color:var(--brown); font-family:Georgia,serif; }

  .pill,.chip{ border:1px solid rgba(231,224,215,.95); background:rgba(255,255,255,.92); border-radius:999px; padding:10px 14px; cursor:pointer; font-weight:900; font-size:12px; color:rgba(121,104,73,.88); }
  .pill.on,.chip.on{ border-color:rgba(233,154,108,.65); background:rgba(233,154,108,.14); }
  .pill-row,.chip-row{ display:flex; flex-wrap:wrap; gap:10px; }

  .setup-note{ border:1px solid rgba(231,224,215,.95); background:rgba(247,243,238,.75); border-radius:18px; padding:12px; color:var(--muted); font-size:12px; line-height:1.45; }
  .setup-tip{ margin-top:12px; border-radius:16px; border:1px dashed rgba(121,104,73,.25); padding:10px 12px; background:rgba(255,255,255,.70); font-size:12px; color:var(--muted); line-height:1.45; }
  .setup-mini{ font-size:12px; color:var(--muted); line-height:1.45; }

  .setup-row2{ display:grid; grid-template-columns:1.2fr .8fr; gap:12px; align-items:start; }
  @media(max-width:700px){ .setup-row2{ grid-template-columns:1fr; } }
  .setup-presets{ display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
  .preset{ border:1px solid rgba(231,224,215,.95); background:rgba(255,255,255,.92); border-radius:999px; padding:8px 12px; cursor:pointer; font-weight:900; font-size:12px; color:rgba(121,104,73,.88); }
  .preset:hover{ border-color:rgba(233,154,108,.55); }
  .setup-hintline{ margin-top:10px; font-size:12px; color:var(--muted); }

  .setup-subtitle{ font-weight:900; color:var(--brown); font-size:13px; margin-bottom:10px; }
  .setup-subtitle2{ font-weight:900; color:rgba(121,104,73,.85); font-size:12px; margin:10px 0 8px; }
  .setup-shape-row{ display:flex; gap:10px; flex-wrap:wrap; }
  .shape-btn{ display:flex; align-items:center; gap:8px; padding:10px 12px; }
  .shape-ic{ width:22px; height:22px; display:grid; place-items:center; border-radius:10px; background:rgba(233,154,108,.12); border:1px solid rgba(233,154,108,.20); }

  .setup-hero{ display:flex; gap:12px; align-items:flex-start; padding:14px; border:1px solid rgba(231,224,215,.95); border-radius:22px; background:rgba(247,243,238,.60); }
  .setup-hero-ic{ width:52px; height:52px; border-radius:18px; display:grid; place-items:center; background:rgba(233,154,108,.16); border:1px solid rgba(233,154,108,.20); font-size:22px; flex:0 0 auto; }
  .setup-hero-title{ font-weight:900; color:var(--brown); font-size:16px; }
  .setup-hero-sub{ margin-top:4px; font-size:12px; color:var(--muted); line-height:1.45; }

  .summary{ display:grid; gap:10px; margin-top:10px; }
  .sum-row{ display:flex; justify-content:space-between; gap:10px; padding:10px 12px; border:1px solid rgba(231,224,215,.95); border-radius:16px; background:rgba(255,255,255,.92); }
  .sum-row span{ color:var(--muted); font-size:12px; }
  .sum-row b{ color:var(--brown); font-size:12px; font-weight:900; }

  .setup-footer{
    display:flex; justify-content:space-between; align-items:center;
    padding:12px 16px 14px; border-top:1px solid rgba(231,224,215,.7);
    position:sticky; bottom:0;
    background:rgba(255,255,255,.92); backdrop-filter:blur(10px);
  }
  .setup-footer-right{ display:flex; gap:10px; align-items:center; }

  body.guests-hidden .seat-wrap{ grid-template-columns:1fr !important; }
  body.guests-hidden .guestpanel{ display:none !important; }

  #guestToggleBtn{
    position:fixed; right:14px; bottom:calc(env(safe-area-inset-bottom,0px) + 14px);
    z-index:9999; padding:12px 14px; border-radius:999px;
    border:1px solid #e7e0d7; background:rgba(255,255,255,.96);
    font-weight:900; cursor:pointer; box-shadow:0 18px 40px rgba(0,0,0,.18);
    font-size:13px;
  }
  @media(max-width:700px){
    #guestToggleBtn{ left:50%; right:auto; transform:translateX(-50%); bottom:calc(env(safe-area-inset-bottom,0px) + 74px); }
  }
`;

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function SitzplanPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ── Firebase-Referenzen aus bestehendem Setup ─────────────────────────
    const { onAuthStateChanged } = require("firebase/auth") as typeof import("firebase/auth");
    const {
      doc, getDoc, setDoc, serverTimestamp, onSnapshot,
    } = require("firebase/firestore") as typeof import("firebase/firestore");

    // ── Konstanten & Hilfsfunktionen ──────────────────────────────────────
    const STORAGE_KEY = "weddinghub_seatplan_v2_cloud";

    let cloud: any = {
      ready: false, inviteId: null, docRef: null,
      unsub: null, suppressNext: false, lastRemoteUpdatedAt: 0
    };
    let cloudSaveTimer: any = null;

    let guests: any[] = [];
    let tables: any[] = [];
    let settings: any = {
      totalGuests: 80, brideShape: "oval", brideSeats: 10,
      guestShape: "round", guestSeats: 8, layoutCols: 3,
      layoutPreset: "grid", groupColors: {}
    };

    const svg = document.getElementById("planSvg") as any;
    const guestListEl = document.getElementById("guestList") as HTMLElement;
    const searchInput = document.getElementById("searchInput") as HTMLInputElement;
    const planSub = document.getElementById("planSub") as HTMLElement;
    const toast = document.getElementById("toast") as HTMLElement;
    const guestNameInput = document.getElementById("guestNameInput") as HTMLInputElement;
    const guestGroupInput = document.getElementById("guestGroupInput") as HTMLSelectElement;
    const addGuestBtn = document.getElementById("addGuestBtn") as HTMLButtonElement;
    const exportBtn = document.getElementById("exportChip") as HTMLButtonElement;
    const importBtn = document.getElementById("importChip") as HTMLButtonElement;
    const importFile = document.getElementById("importFile") as HTMLInputElement;
    const pdfBtn = document.getElementById("pdfChip") as HTMLButtonElement;
    const addTableBtn = document.getElementById("addTableBtn") as HTMLButtonElement;
    const seatMinusBtn = document.getElementById("seatMinusBtn") as HTMLButtonElement;
    const seatPlusBtn = document.getElementById("seatPlusBtn") as HTMLButtonElement;
    const deleteTableBtn = document.getElementById("deleteTableBtn") as HTMLButtonElement;
    const csvImportBtn = document.getElementById("csvImportBtn") as HTMLButtonElement;
    const csvFile = document.getElementById("csvFile") as HTMLInputElement;
    const tableEditor = document.getElementById("tableEditor") as HTMLElement;
    const teName = document.getElementById("teName") as HTMLInputElement;
    const teRowLen = document.getElementById("teRowLen") as HTMLElement;
    const teRowDep = document.getElementById("teRowDep") as HTMLElement;
    const teLenMinus = document.getElementById("teLenMinus") as HTMLButtonElement;
    const teLenPlus = document.getElementById("teLenPlus") as HTMLButtonElement;
    const teDepMinus = document.getElementById("teDepMinus") as HTMLButtonElement;
    const teDepPlus = document.getElementById("teDepPlus") as HTMLButtonElement;
    const teRotate = document.getElementById("teRotate") as HTMLButtonElement;
    const teLenVal = document.getElementById("teLenVal") as HTMLElement;
    const teDepVal = document.getElementById("teDepVal") as HTMLElement;
    const teHint = document.getElementById("teHint") as HTMLElement;

    if (!svg) return;

    let vb = { x: 0, y: 0, w: 1600, h: 1000 };

    function applyViewBox(skipSave = false) {
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      if (!skipSave) saveState();
    }

    function zoom(f: number) {
      const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
      vb.w = Math.max(700, Math.min(3800, vb.w * f));
      vb.h = Math.max(450, Math.min(2600, vb.h * f));
      vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2;
      applyViewBox(true);
    }

    function uid(prefix: string) { return prefix + Math.random().toString(16).slice(2, 10); }
    function clampInt(v: any, a: number, b: number) {
      v = parseInt(v, 10);
      if (Number.isNaN(v)) v = a;
      return Math.max(a, Math.min(b, v));
    }
    function elNS(name: string) { return document.createElementNS("http://www.w3.org/2000/svg", name); }

    function setSvgTitle(el: Element | null, text: string | null) {
      if (!el) return;
      let t = el.querySelector("title") as Element | null;
      if (!text) { if (t) t.remove(); return; }
      if (!t) { t = document.createElementNS("http://www.w3.org/2000/svg", "title") as Element; el.appendChild(t); }
      t.textContent = text;
    }

    function normGroupKey(s: string) {
      return String(s || "Sonstiges").trim().toLowerCase().replace(/\s+/g, " ");
    }

    function groupColor(group: string) {
      const key = normGroupKey(group);
      if (settings?.groupColors?.[key]) return settings.groupColors[key];
      const map: Record<string, string> = {
        "familie": "#8b5cf6", "familie braut": "#8b5cf6", "familie bräutigam": "#8b5cf6",
        "freunde": "#06b6d4", "freunde braut": "#06b6d4", "freunde bräutigam": "#06b6d4",
        "arbeitskollege": "#f59e0b", "arbeitskollegin": "#f59e0b",
        "nachbarn": "#22c55e", "kinder": "#fb7185", "großeltern": "#64748b",
        "paten": "#a3e635", "trauzeuge braut": "#ec4899", "trauzeuge bräutigam": "#3b82f6",
        "dienstleister": "#ef4444", "sonstiges": "#94a3b8"
      };
      if (map[key]) return map[key];
      let h = 0;
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
      return `hsl(${h % 360} 70% 55%)`;
    }

    function getTableById(id: string) { return tables.find((t: any) => t.id === id) || null; }
    function countPlaced() { return guests.filter((g: any) => g.tableId).length; }
    function tableSeatCount(tableId: string) { return guests.filter((g: any) => g.tableId === tableId).length; }
    function seatOccupant(tableId: string, seatIndex: number) {
      return guests.find((g: any) => g.tableId === tableId && g.seatIndex === seatIndex) || null;
    }
    function initials(name: string) {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0] || "";
      const b = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0]?.[1] || "");
      return (a + b).toUpperCase();
    }

    function showToast(msg: string) {
      if (!toast) return;
      toast.textContent = msg;
      toast.style.display = "block";
      clearTimeout((showToast as any)._t);
      (showToast as any)._t = setTimeout(() => toast.style.display = "none", 2200);
    }

    function updateHeaderActions() {
      const hasSel = !!selectedTableId;
      if (deleteTableBtn) deleteTableBtn.disabled = !hasSel;
      if (seatMinusBtn) seatMinusBtn.disabled = !hasSel;
      if (seatPlusBtn) seatPlusBtn.disabled = !hasSel;
      const info = document.getElementById("selectedInfo");
      if (info) {
        if (!hasSel) { info.textContent = "Kein Tisch ausgewählt"; }
        else {
          const t = getTableById(selectedTableId!);
          if (t) info.textContent = `Ausgewählt: ${t.name} (${tableSeatCount(t.id)}/${t.capacity})`;
        }
      }
    }

    // ── Storage ────────────────────────────────────────────────────────────
    function localSave() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ guests, tables, vb, settings })); } catch (_) {}
    }

    function localLoad() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const p = JSON.parse(raw);
        if (p && Array.isArray(p.guests) && Array.isArray(p.tables)) {
          guests = p.guests; tables = p.tables;
          if (p.vb) vb = p.vb;
          if (p.settings) settings = { ...settings, ...p.settings };
          return true;
        }
      } catch (_) {}
      return false;
    }

    function cloudSave() {
      if (!cloud.ready || !cloud.docRef) return;
      clearTimeout(cloudSaveTimer);
      cloudSaveTimer = setTimeout(() => cloudSaveNow(), 450);
    }

    async function cloudSaveNow() {
      if (!cloud.ready || !cloud.docRef) return;
      try {
        cloud.suppressNext = true;
        await setDoc(cloud.docRef, {
          tables, guests, vb, settings,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser ? auth.currentUser.uid : null
        }, { merge: true });
      } catch (_) { localSave(); }
    }

    async function initCloud() {
      return new Promise<void>((resolve) => {
        onAuthStateChanged(auth, async (user: any) => {
          if (!user) { cloud.ready = false; resolve(); return; }
          try {
            const usnap = await getDoc(doc(db, "users", user.uid));
            const inviteId = usnap.exists() ? (usnap.data().inviteId || "") : "";
            if (!inviteId) { cloud.ready = false; resolve(); return; }

            cloud.inviteId = inviteId;
            cloud.docRef = doc(db, "invites", inviteId, "seatplan", "main");
            cloud.ready = true;

            if (cloud.unsub) cloud.unsub();
            cloud.unsub = onSnapshot(cloud.docRef, (snap: any) => {
              if (!snap.exists()) return;
              const data = snap.data() || {};
              if (data.updatedBy && auth.currentUser && data.updatedBy === auth.currentUser.uid) return;
              const remoteUpdated = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0;
              if (remoteUpdated && remoteUpdated <= cloud.lastRemoteUpdatedAt) return;
              cloud.lastRemoteUpdatedAt = remoteUpdated;
              if (cloud.suppressNext) { cloud.suppressNext = false; return; }
              if (Array.isArray(data.tables) && Array.isArray(data.guests)) {
                tables = data.tables; guests = data.guests;
                if (data.vb) vb = data.vb;
                if (data.settings) settings = { ...settings, ...data.settings };
                renderGuestList(); buildPlan();
                if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
                localSave();
              }
            });

            const docSnap = await getDoc(cloud.docRef);
            if (docSnap.exists()) {
              const data = docSnap.data() || {} as any;
              if (Array.isArray(data.tables) && Array.isArray(data.guests)) {
                tables = data.tables; guests = data.guests;
                if (data.vb) vb = data.vb;
                if (data.settings) settings = { ...settings, ...data.settings };
                localSave();
              }
            } else { await cloudSaveNow(); }
            resolve();
          } catch (_) { cloud.ready = false; resolve(); }
        });
      });
    }

    function saveState() { localSave(); cloudSave(); }

    // ── SVG helpers ────────────────────────────────────────────────────────
    function getSvgPointFromClient(clientX: number, clientY: number) {
      const pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const p = pt.matrixTransform(ctm.inverse());
      return { x: p.x, y: p.y };
    }

    // ── Chair Geometry ─────────────────────────────────────────────────────
    const PAD = 34;

    function chairPositionFromParam(table: any, t: number) {
      const chairR = 16;
      if (table.shape === "round") {
        const r = (table.r ?? 70) + PAD;
        const a = (Math.PI * 2) * t - Math.PI / 2;
        return { x: table.x + Math.cos(a) * r, y: table.y + Math.sin(a) * r, r: chairR };
      }
      if (table.shape === "oval") {
        const rx = (table.rx ?? 120) + PAD, ry = (table.ry ?? 70) + PAD;
        const a = (Math.PI * 2) * t - Math.PI / 2;
        return { x: table.x + Math.cos(a) * rx, y: table.y + Math.sin(a) * ry, r: chairR };
      }
      const w = table.w ?? 240, h = table.h ?? 110;
      const left = table.x - w / 2 - PAD, right = table.x + w / 2 + PAD;
      const top = table.y - h / 2 - PAD, bottom = table.y + h / 2 + PAD;
      const topLen = right - left, rightLen = bottom - top;
      const per = 2 * (topLen + rightLen);
      let d = t * per, x, y;
      if (d <= topLen) { x = left + d; y = top; }
      else if (d <= topLen + rightLen) { d -= topLen; x = right; y = top + d; }
      else if (d <= topLen + rightLen + topLen) { d -= (topLen + rightLen); x = right - d; y = bottom; }
      else { d -= (topLen + rightLen + topLen); x = left; y = bottom - d; }
      return { x, y, r: chairR };
    }

    function norm01(t: number) { t = t % 1; if (t < 0) t += 1; return t; }

    function rotPoint(px: number, py: number, cx: number, cy: number, deg: number) {
      const a = (deg * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a);
      return { x: (px - cx) * c - (py - cy) * s + cx, y: (px - cx) * s + (py - cy) * c + cy };
    }

    function unrotatePoint(px: number, py: number, table: any) {
      const rot = table?.rotation || 0;
      if (!rot) return { x: px, y: py };
      return rotPoint(px, py, table.x, table.y, -rot);
    }

    function chairParamFromPoint(table: any, px: number, py: number) {
      const p2 = unrotatePoint(px, py, table);
      px = p2.x; py = p2.y;
      if (table.shape === "round") {
        return norm01((Math.atan2(py - table.y, px - table.x) + Math.PI / 2) / (Math.PI * 2));
      }
      if (table.shape === "oval") {
        const rx = (table.rx ?? 120) + PAD, ry = (table.ry ?? 70) + PAD;
        return norm01((Math.atan2((py - table.y) / ry, (px - table.x) / rx) + Math.PI / 2) / (Math.PI * 2));
      }
      const w = (table.w ?? 240) + PAD * 2, h = (table.h ?? 110) + PAD * 2;
      const left = table.x - w / 2, right = table.x + w / 2;
      const top = table.y - h / 2, bottom = table.y + h / 2;
      let x = Math.max(left, Math.min(right, px)), y = Math.max(top, Math.min(bottom, py));
      const dL = Math.abs(x - left), dR = Math.abs(right - x), dT = Math.abs(y - top), dB = Math.abs(bottom - y);
      const minD = Math.min(dL, dR, dT, dB);
      if (minD === dT) y = top;
      else if (minD === dR) x = right;
      else if (minD === dB) y = bottom;
      else x = left;
      const topLen = right - left, rightLen = bottom - top, per = 2 * (topLen + rightLen);
      let dist = 0;
      if (y === top) dist = x - left;
      else if (x === right) dist = topLen + (y - top);
      else if (y === bottom) dist = topLen + rightLen + (right - x);
      else dist = topLen + rightLen + topLen + (bottom - y);
      return norm01(dist / per);
    }

    function ensureChairParams(table: any) {
      if (!Array.isArray(table.chairParams)) table.chairParams = [];
      const cap = table.capacity ?? 0;
      if (cap <= 0) { table.chairParams = []; return; }
      if (table.chairParams.length !== cap) {
        const arr = [];
        for (let i = 0; i < cap; i++) arr.push(table.chairParams[i] ?? (i / cap));
        table.chairParams = arr;
      }
    }

    // ── Color Picker ───────────────────────────────────────────────────────
    const globalColorPicker = document.createElement("input");
    globalColorPicker.type = "color";
    globalColorPicker.style.cssText = "position:fixed;left:12px;bottom:12px;width:42px;height:34px;opacity:0;pointer-events:none;z-index:999999;";
    document.body.appendChild(globalColorPicker);
    let _pendingGroupKey: string | null = null;

    function openColorPickerForGroup(groupName: string) {
      _pendingGroupKey = normGroupKey(groupName || "Sonstiges");
      globalColorPicker.value = groupColor(groupName || "Sonstiges");
      globalColorPicker.style.opacity = "1";
      globalColorPicker.style.pointerEvents = "auto";
      if (typeof (globalColorPicker as any).showPicker === "function") (globalColorPicker as any).showPicker();
      else globalColorPicker.click();
    }

    globalColorPicker.addEventListener("input", () => {
      if (!_pendingGroupKey) return;
      settings.groupColors[_pendingGroupKey] = globalColorPicker.value;
      renderGuestList(); buildPlan(); saveState();
    });
    globalColorPicker.addEventListener("change", () => {
      globalColorPicker.style.opacity = "0";
      globalColorPicker.style.pointerEvents = "none";
    });

    // ── SVG Nodes Map ──────────────────────────────────────────────────────
    const uiMap: { bg: any; tables: Map<string, any> } = { bg: null, tables: new Map() };

    function clearSvg() { svg.innerHTML = ""; uiMap.tables.clear(); uiMap.bg = null; }

    // ── Drag State ─────────────────────────────────────────────────────────
    let selectedTableId: string | null = null;
    let drag: any = { mode: null, pointerId: null, tableId: null, chairIndex: null, startX: 0, startY: 0, origX: 0, origY: 0 };

    function isDragging() { return drag.mode !== null; }
    function endDrag() { drag.mode = null; drag.pointerId = null; drag.tableId = null; drag.chairIndex = null; }

    function getSelectedTable() { if (!selectedTableId) return null; return getTableById(selectedTableId); }

    svg.addEventListener("pointermove", (e: PointerEvent) => {
      if (!isDragging() || drag.pointerId !== e.pointerId) return;
      const t = getTableById(drag.tableId);
      if (!t) return;
      const p = getSvgPointFromClient(e.clientX, e.clientY);
      if (drag.mode === "table") {
        t.x = drag.origX + (p.x - drag.startX);
        t.y = drag.origY + (p.y - drag.startY);
        updateTableGraphics(t); updateSelectionStyles();
        if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
        saveState();
      } else if (drag.mode === "chair") {
        ensureChairParams(t);
        if (drag.chairIndex != null) {
          t.chairParams[drag.chairIndex] = chairParamFromPoint(t, p.x, p.y);
          updateTableGraphics(t);
          if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
          saveState();
        }
      }
    });
    svg.addEventListener("pointerup", (e: PointerEvent) => { if (isDragging() && drag.pointerId === e.pointerId) endDrag(); });
    svg.addEventListener("pointercancel", (e: PointerEvent) => { if (isDragging() && drag.pointerId === e.pointerId) endDrag(); });

    function startTableDrag(e: PointerEvent, table: any) {
      e.preventDefault(); e.stopPropagation();
      if (selectedTableId !== table.id) { selectedTableId = table.id; updateSelectionStyles(); }
      const p = getSvgPointFromClient(e.clientX, e.clientY);
      drag = { mode: "table", pointerId: e.pointerId, tableId: table.id, chairIndex: null, startX: p.x, startY: p.y, origX: table.x, origY: table.y };
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch (_) {}
    }

    function startChairDrag(e: PointerEvent, table: any, chairIndex: number) {
      e.preventDefault(); e.stopPropagation();
      selectedTableId = table.id; updateSelectionStyles();
      drag = { mode: "chair", pointerId: e.pointerId, tableId: table.id, chairIndex };
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch (_) {}
    }

    // ── Build Plan ─────────────────────────────────────────────────────────
    function buildPlan() {
      clearSvg();
      const bg = elNS("rect");
      bg.setAttribute("x", "-5000"); bg.setAttribute("y", "-5000");
      bg.setAttribute("width", "10000"); bg.setAttribute("height", "10000");
      bg.setAttribute("fill", "transparent"); (bg as any).style.pointerEvents = "all";
      bg.addEventListener("pointerdown", () => { if (isDragging()) return; selectedTableId = null; updateSelectionStyles(); });
      svg.appendChild(bg); uiMap.bg = bg;

      for (const t of tables) {
        ensureChairParams(t);
        const g = elNS("g"); svg.appendChild(g);
        let shape: any;
        if (t.shape === "round") { shape = elNS("circle"); }
        else if (t.shape === "oval") { shape = elNS("ellipse"); }
        else { shape = elNS("rect"); shape.setAttribute("rx", "0"); }
        g.appendChild(shape);

        const clickHandler = (e: Event) => { if (isDragging()) return; e.stopPropagation(); selectedTableId = t.id; updateSelectionStyles(); };
        shape.addEventListener("pointerdown", (e: PointerEvent) => startTableDrag(e, t));
        shape.addEventListener("click", clickHandler);

        const label = elNS("text");
        label.setAttribute("text-anchor", "middle"); label.setAttribute("class", "table-label");
        label.addEventListener("pointerdown", (e: PointerEvent) => startTableDrag(e, t));
        label.addEventListener("click", clickHandler);
        g.appendChild(label);

        const meta = elNS("text");
        meta.setAttribute("text-anchor", "middle"); meta.setAttribute("class", "table-meta");
        meta.addEventListener("pointerdown", (e: PointerEvent) => startTableDrag(e, t));
        meta.addEventListener("click", clickHandler);
        g.appendChild(meta);

        const chairEls: any[] = [], badgeEls: any[] = [], badgeTextEls: any[] = [];

        for (let i = 0; i < t.capacity; i++) {
          const chair = elNS("circle"); chairEls.push(chair); g.appendChild(chair);
          chair.addEventListener("pointerdown", (e: PointerEvent) => startChairDrag(e, t, i));
          chair.addEventListener("dragover", (e: Event) => e.preventDefault());
          chair.addEventListener("drop", (e: any) => {
            e.preventDefault();
            const guestId = e.dataTransfer.getData("text/plain");
            if (!guestId || seatOccupant(t.id, i)) return;
            const gGuest = guests.find((x: any) => x.id === guestId);
            if (!gGuest) return;
            gGuest.tableId = t.id; gGuest.seatIndex = i;
            saveState(); renderGuestList(); updateTableGraphics(t);
            if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
          });

          const badge = elNS("circle"); badgeEls.push(badge); g.appendChild(badge);
          const bt = elNS("text"); badgeTextEls.push(bt); g.appendChild(bt);

          badge.addEventListener("click", (e: Event) => {
            e.stopPropagation();
            const occ = seatOccupant(t.id, i);
            if (!occ) return;
            occ.tableId = null; occ.seatIndex = null;
            saveState(); renderGuestList(); updateTableGraphics(t);
            if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
          });
        }

        uiMap.tables.set(t.id, { group: g, shape, label, meta, chairs: chairEls, badges: badgeEls, badgeTexts: badgeTextEls });
        updateTableGraphics(t);
      }

      updateSelectionStyles();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      applyViewBox(true);
    }

    function updateSelectionStyles() {
      for (const t of tables) {
        const node = uiMap.tables.get(t.id);
        if (!node) continue;
        node.shape.setAttribute("class", "table-outline" + (t.id === selectedTableId ? " table-selected" : ""));
      }
      updateHeaderActions();
      syncTableEditor();
    }

    function updateTableGraphics(t: any) {
      const node = uiMap.tables.get(t.id);
      if (!node) return;
      node.group.setAttribute("transform", `rotate(${t.rotation || 0}, ${t.x}, ${t.y})`);
      if (t.shape === "round") {
        node.shape.setAttribute("cx", t.x); node.shape.setAttribute("cy", t.y); node.shape.setAttribute("r", t.r ?? 70);
      } else if (t.shape === "oval") {
        node.shape.setAttribute("cx", t.x); node.shape.setAttribute("cy", t.y);
        node.shape.setAttribute("rx", t.rx ?? 120); node.shape.setAttribute("ry", t.ry ?? 70);
      } else {
        const w = t.w ?? 240, h = t.h ?? 110;
        node.shape.setAttribute("x", t.x - w / 2); node.shape.setAttribute("y", t.y - h / 2);
        node.shape.setAttribute("width", w); node.shape.setAttribute("height", h); node.shape.setAttribute("rx", "0");
      }
      node.label.setAttribute("x", t.x); node.label.setAttribute("y", t.y - 10); node.label.textContent = t.name;
      node.meta.setAttribute("x", t.x); node.meta.setAttribute("y", t.y + 16); node.meta.textContent = `${tableSeatCount(t.id)}/${t.capacity}`;
      ensureChairParams(t);
      for (let i = 0; i < t.capacity; i++) {
        const chair = node.chairs[i], badge = node.badges[i], bt = node.badgeTexts[i];
        const occ = seatOccupant(t.id, i);
        const pos = chairPositionFromParam(t, t.chairParams[i]);
        chair.setAttribute("cx", pos.x); chair.setAttribute("cy", pos.y); chair.setAttribute("r", pos.r);
        chair.setAttribute("class", occ ? "chair-outline chair-occupied" : "chair-outline");
        if (occ) {
          badge.style.display = ""; bt.style.display = "";
          badge.setAttribute("cx", pos.x); badge.setAttribute("cy", pos.y); badge.setAttribute("r", "15");
          badge.setAttribute("class", "seat-badge"); badge.style.fill = groupColor(occ.group);
          bt.setAttribute("x", pos.x); bt.setAttribute("y", pos.y + 4);
          bt.setAttribute("text-anchor", "middle"); bt.setAttribute("class", "seat-badge-text");
          bt.textContent = initials(occ.name);
          const tip = `${occ.name} (${occ.group || "Sonstiges"})`;
          setSvgTitle(badge, tip); setSvgTitle(bt, tip); setSvgTitle(chair, tip);
        } else {
          badge.style.display = "none"; bt.style.display = "none"; badge.style.fill = "";
          setSvgTitle(badge, null); setSvgTitle(bt, null); setSvgTitle(chair, null);
        }
      }
    }

    // ── Table Editor Sync ──────────────────────────────────────────────────
    function syncTableEditor() {
      if (!tableEditor) return;
      const t = getSelectedTable();
      tableEditor.style.display = t ? "block" : "none";
      if (!t) return;
      if (teName) teName.value = t.name || "";
      if (t.shape === "round") {
        if (teRowLen) teRowLen.style.display = "flex"; if (teRowDep) teRowDep.style.display = "none";
        if (teLenVal) teLenVal.textContent = String(t.r ?? 70);
        if (teHint) teHint.textContent = "Rund: Größe steuert den Radius.";
      } else if (t.shape === "oval") {
        if (teRowLen) teRowLen.style.display = "flex"; if (teRowDep) teRowDep.style.display = "flex";
        if (teLenVal) teLenVal.textContent = String(t.rx ?? 120);
        if (teDepVal) teDepVal.textContent = String(t.ry ?? 70);
        if (teHint) teHint.textContent = "Oval: Länge und Tiefe getrennt.";
      } else {
        if (teRowLen) teRowLen.style.display = "flex"; if (teRowDep) teRowDep.style.display = "flex";
        if (teLenVal) teLenVal.textContent = String(t.w ?? 240);
        if (teDepVal) teDepVal.textContent = String(t.h ?? 110);
        if (teHint) teHint.textContent = "Eckig: Länge und Tiefe getrennt.";
      }
    }

    function applyTableEdit() {
      const t = getSelectedTable(); if (!t) return;
      ensureChairParams(t); saveState(); updateTableGraphics(t); updateSelectionStyles();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
    }

    function changeSelectedDims(dLen: number, dDep: number) {
      const t = getSelectedTable(); if (!t) return;
      if (t.shape === "round") t.r = clampInt((t.r ?? 70) + dLen * 10, 40, 160);
      else if (t.shape === "oval") {
        t.rx = clampInt((t.rx ?? 120) + dLen * 10, 70, 260);
        t.ry = clampInt((t.ry ?? 70) + dDep * 10, 45, 180);
      } else {
        t.w = clampInt((t.w ?? 240) + dLen * 20, 140, 800);
        t.h = clampInt((t.h ?? 110) + dDep * 12, 70, 360);
      }
      applyTableEdit(); syncTableEditor();
    }

    teName?.addEventListener("input", () => { const t = getSelectedTable(); if (!t) return; t.name = String(teName.value || "").trim(); applyTableEdit(); syncTableEditor(); });
    teLenMinus?.addEventListener("click", () => changeSelectedDims(-1, 0));
    teLenPlus?.addEventListener("click", () => changeSelectedDims(+1, 0));
    teDepMinus?.addEventListener("click", () => changeSelectedDims(0, -1));
    teDepPlus?.addEventListener("click", () => changeSelectedDims(0, +1));
    teRotate?.addEventListener("click", () => {
      const t = getSelectedTable(); if (!t) return;
      t.rotation = ((t.rotation || 0) + 90) % 360;
      saveState(); updateTableGraphics(t); showToast("Tisch gedreht.");
    });

    // ── Table Helpers ──────────────────────────────────────────────────────
    function makeTableObject({ id, name, shape, capacity, x, y }: any) {
      const base: any = { id, name, shape, capacity, x, y, chairParams: null, rotation: 0 };
      if (shape === "round") base.r = 70;
      if (shape === "oval") { base.rx = 120; base.ry = 70; }
      if (shape === "rect") { base.w = 240; base.h = 110; }
      return base;
    }

    function changeSelectedTableSeats(delta: number) {
      const t = getSelectedTable();
      if (!t) { showToast("Bitte erst einen Tisch anklicken."); return; }
      const newCap = clampInt((t.capacity ?? 0) + delta, 0, 24);
      if (newCap === t.capacity) return;
      if (newCap < t.capacity) {
        for (const g of guests) {
          if (g.tableId === t.id && (g.seatIndex ?? 9999) >= newCap) { g.tableId = null; g.seatIndex = null; }
        }
      }
      t.capacity = newCap; ensureChairParams(t);
      saveState(); selectedTableId = t.id; buildPlan(); renderGuestList();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      showToast("Sitzplätze angepasst.");
    }

    function spawnPointForNewTable() {
      let x = 220, y = 220;
      while (tables.some((t: any) => Math.hypot(t.x - x, t.y - y) < 180)) y += 180;
      return { x, y };
    }

    function addTableInteractive() {
      const { x, y } = spawnPointForNewTable();
      const name = window.prompt("Name für den neuen Tisch:", `Tisch ${tables.length + 1}`);
      if (name == null) return;
      const shape = window.prompt("Form (round, oval, rect):", settings.guestShape || "round");
      if (shape == null) return;
      let seats: any = window.prompt("Wie viele Sitzplätze?", String(settings.guestSeats || 8));
      if (seats == null) return;
      seats = clampInt(seats, 2, 24);
      const t = makeTableObject({ id: uid("t"), name: String(name || `Tisch ${tables.length + 1}`).trim(), shape: String(shape).trim() || "round", capacity: seats, x: Math.round(x), y: Math.round(y) });
      ensureChairParams(t); tables.push(t); selectedTableId = t.id;
      saveState(); buildPlan(); renderGuestList(); showToast("Tisch hinzugefügt.");
    }

    function deleteSelectedTable() {
      const t = getSelectedTable();
      if (!t) { showToast("Bitte erst einen Tisch anklicken."); return; }
      if (!window.confirm(`Diesen Tisch wirklich löschen?\n\n${t.name}`)) return;
      for (const g of guests) { if (g.tableId === t.id) { g.tableId = null; g.seatIndex = null; } }
      tables = tables.filter((x: any) => x.id !== t.id);
      selectedTableId = tables[0]?.id || null;
      saveState(); buildPlan(); renderGuestList();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      showToast("Tisch gelöscht.");
    }

    // ── Guests ─────────────────────────────────────────────────────────────
    function setCircleDragPreview(e: DragEvent, guestName: string) {
      const ghost = document.createElement("div");
      Object.assign(ghost.style, { width: "44px", height: "44px", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: "900", color: "var(--brown)", background: "rgba(233,154,108,.22)", position: "fixed", left: "-9999px", top: "-9999px" });
      ghost.textContent = initials(guestName);
      document.body.appendChild(ghost);
      e.dataTransfer!.setDragImage(ghost, 22, 22);
      setTimeout(() => ghost.remove(), 0);
    }

    function deleteGuest(guestId: string) {
      const idx = guests.findIndex((g: any) => g.id === guestId);
      if (idx === -1) return;
      guests.splice(idx, 1);
      saveState(); renderGuestList(); buildPlan();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      showToast("Gast gelöscht.");
    }

    function renderGuestList() {
      if (!guestListEl) return;
      const q = String(searchInput?.value || "").toLowerCase().trim();
      const filtered = guests.filter((g: any) => !g.tableId).filter((g: any) => !q || g.name.toLowerCase().includes(q) || (g.group || "").toLowerCase().includes(q));
      guestListEl.innerHTML = "";
      if (filtered.length === 0) {
        const div = document.createElement("div"); div.className = "callout";
        div.textContent = "Keine unzugewiesenen Gäste gefunden."; guestListEl.appendChild(div); return;
      }
      filtered.forEach((g: any) => {
        const el = document.createElement("div"); el.className = "guest-pill"; el.draggable = true;
        const left = document.createElement("div"); left.className = "guest-left";
        left.innerHTML = `<div class="guest-dot">${initials(g.name)}</div><div style="min-width:0;flex:1;"><div class="gname-row"><div class="guest-name">${g.name}</div><div class="gcolor-dot" style="background:${groupColor(g.group || "Sonstiges")}"></div></div><div class="guest-meta">${g.group || "Sonstiges"}</div></div>`;
        const dot = left.querySelector(".gcolor-dot");
        if (dot) {
          dot.setAttribute("title", "Gruppenfarbe ändern");
          dot.addEventListener("pointerdown", (e: Event) => { e.preventDefault(); e.stopPropagation(); el.draggable = false; openColorPickerForGroup(g.group || "Sonstiges"); setTimeout(() => { el.draggable = true; }, 0); });
        }
        const del = document.createElement("button"); del.type = "button"; del.className = "guest-del"; del.textContent = "×";
        del.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); deleteGuest(g.id); });
        el.appendChild(left); el.appendChild(del);
        el.addEventListener("dragstart", (e: DragEvent) => { el.classList.add("dragging"); e.dataTransfer!.setData("text/plain", g.id); e.dataTransfer!.effectAllowed = "move"; setCircleDragPreview(e, g.name); });
        el.addEventListener("dragend", () => el.classList.remove("dragging"));
        guestListEl.appendChild(el);
      });
    }

    searchInput?.addEventListener("input", renderGuestList);

    addGuestBtn?.addEventListener("click", () => {
      const name = String(guestNameInput?.value || "").trim();
      const group = String(guestGroupInput?.value || "Sonstiges").trim();
      if (!name) { showToast("Bitte einen Namen eingeben."); return; }
      guests.unshift({ id: uid("g"), name, group, tableId: null, seatIndex: null });
      if (guestNameInput) guestNameInput.value = "";
      saveState(); renderGuestList();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      showToast("Gast hinzugefügt.");
    });

    guestNameInput?.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") addGuestBtn?.click(); });

    // ── Plan Tool Buttons ──────────────────────────────────────────────────
    document.getElementById("clearBtn")?.addEventListener("click", () => { guests.forEach((g: any) => { g.tableId = null; g.seatIndex = null; }); saveState(); renderGuestList(); buildPlan(); showToast("Alles zurückgesetzt."); });
    document.getElementById("zoomInBtn")?.addEventListener("click", () => zoom(0.85));
    document.getElementById("zoomOutBtn")?.addEventListener("click", () => zoom(1.15));
    document.getElementById("autoLayoutBtn")?.addEventListener("click", () => {
      tables.forEach((t: any, idx: number) => { t.x = 420 + (idx % 3) * 520; t.y = 260 + Math.floor(idx / 3) * 420; });
      saveState(); buildPlan(); showToast("Tische automatisch angeordnet.");
    });
    document.getElementById("deleteAllTablesBtn")?.addEventListener("click", () => {
      if (!window.confirm("Wirklich alle Tische löschen?\nGäste bleiben erhalten.")) return;
      guests.forEach((g: any) => { g.tableId = null; g.seatIndex = null; });
      tables = []; selectedTableId = null;
      saveState(); buildPlan(); renderGuestList();
      if (planSub) planSub.textContent = "0 Gäste platziert";
      showToast("Alle Tische gelöscht.");
    });

    addTableBtn?.addEventListener("click", () => addTableInteractive());
    seatMinusBtn?.addEventListener("click", () => changeSelectedTableSeats(-1));
    seatPlusBtn?.addEventListener("click", () => changeSelectedTableSeats(+1));
    deleteTableBtn?.addEventListener("click", () => deleteSelectedTable());

    // ── Export / Import ────────────────────────────────────────────────────
    function downloadJson(filename: string, obj: any) {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
      document.body.appendChild(a); a.click(); a.remove();
    }

    exportBtn?.addEventListener("click", () => { downloadJson("sitzplan-export.json", { guests, tables, vb, settings }); showToast("Export erstellt."); });
    importBtn?.addEventListener("click", () => { if (importFile) { importFile.value = ""; importFile.click(); } });
    importFile?.addEventListener("change", async () => {
      const file = importFile.files?.[0]; if (!file) return;
      try {
        const p = JSON.parse(await file.text());
        if (!p || !Array.isArray(p.guests) || !Array.isArray(p.tables)) { showToast("Ungültige Datei."); return; }
        guests = p.guests; tables = p.tables;
        if (p.vb) vb = p.vb; if (p.settings) settings = { ...settings, ...p.settings };
        selectedTableId = tables[0]?.id || null;
        saveState(); renderGuestList(); buildPlan(); showToast("Import erfolgreich.");
      } catch (_) { showToast("Import fehlgeschlagen."); }
    });

    // ── CSV Import ─────────────────────────────────────────────────────────
    function parseCsv(text: string) {
      const delim = (text.match(/;/g) || []).length >= (text.match(/,/g) || []).length ? ";" : ",";
      return text.replace(/\uFEFF/g, "").split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        .filter(l => !l.toLowerCase().startsWith("name") && !l.toLowerCase().startsWith("gast"))
        .map(line => {
          const cols = line.split(delim).map(c => c.replace(/^"|"$/g, "").trim());
          return cols[0] ? { name: cols[0], group: cols[1] || "Sonstiges" } : null;
        }).filter(Boolean) as any[];
    }

    csvImportBtn?.addEventListener("click", () => { if (csvFile) { csvFile.value = ""; csvFile.click(); } });
    csvFile?.addEventListener("change", async () => {
      const file = csvFile.files?.[0]; if (!file) return;
      try {
        const parsed = parseCsv(await file.text());
        if (!parsed.length) { showToast("Keine Gäste gefunden."); return; }
        const existing = new Set(guests.map((g: any) => g.name.toLowerCase().trim()));
        let added = 0;
        for (const p of parsed) {
          if (!p.name || existing.has(p.name.toLowerCase().trim())) continue;
          guests.unshift({ id: uid("g"), name: p.name, group: p.group || "Sonstiges", tableId: null, seatIndex: null });
          existing.add(p.name.toLowerCase().trim()); added++;
        }
        saveState(); renderGuestList();
        if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
        showToast(`${added} Gäste importiert.`);
      } catch (_) { showToast("CSV Import fehlgeschlagen."); }
    });

    // ── PDF ────────────────────────────────────────────────────────────────
    pdfBtn?.addEventListener("click", () => showToast("PDF: Fügt jsPDF-Script im Layout ein für volle Funktion."));

    // ── Table Generators ───────────────────────────────────────────────────
    function generateTablesFromAssistant() {
      const total = clampInt(settings.totalGuests, 1, 400);
      const bSeats = clampInt(settings.brideSeats, 2, 24);
      const gSeats = clampInt(settings.guestSeats, 2, 24);
      const cols = clampInt(settings.layoutCols, 2, 6);
      const remaining = Math.max(0, total - bSeats);
      const guestTableCount = remaining === 0 ? 0 : Math.ceil(remaining / gSeats);
      const centerX = 800, brideY = 20, firstRowY = 250, gapX = 520, gapY = 260;
      const gridW = (Math.max(1, cols) - 1) * gapX, startX = centerX - gridW / 2;
      const newTables: any[] = [];
      newTables.push(makeTableObject({ id: uid("t"), name: "Brauttisch", shape: settings.brideShape, capacity: bSeats, x: Math.round(centerX), y: Math.round(brideY) }));
      for (let i = 0; i < guestTableCount; i++) {
        const isLast = i === guestTableCount - 1;
        const cap = isLast ? (remaining - gSeats * (guestTableCount - 1)) : gSeats;
        newTables.push(makeTableObject({ id: uid("t"), name: `Tisch ${i + 1}`, shape: settings.guestShape, capacity: cap, x: Math.round(startX + (i % cols) * gapX), y: Math.round(firstRowY + Math.floor(i / cols) * gapY) }));
      }
      return newTables;
    }

    function generateTablesFromPreset(preset: string) {
      if (preset === "grid" || !preset) return generateTablesFromAssistant();
      const total = clampInt(settings.totalGuests, 1, 400);
      const bSeats = clampInt(settings.brideSeats, 2, 24);
      const gSeats = clampInt(settings.guestSeats, 2, 24);
      const remaining = Math.max(0, total - bSeats);
      const guestTableCount = remaining === 0 ? 0 : Math.ceil(remaining / gSeats);
      const centerX = 800, newTables: any[] = [];
      newTables.push(makeTableObject({ id: uid("t"), name: "Brauttisch", shape: settings.brideShape, capacity: bSeats, x: centerX, y: 40 }));
      const addGT = (name: string, x: number, y: number, cap: number) => newTables.push(makeTableObject({ id: uid("t"), name, shape: "rect", capacity: cap, x: Math.round(x), y: Math.round(y) }));
      if (preset === "tafel") {
        const startX = centerX - (guestTableCount * 170) / 2;
        for (let i = 0; i < guestTableCount; i++) addGT(`Tafel ${i + 1}`, startX + i * 170, 260, i === guestTableCount - 1 ? remaining - gSeats * (guestTableCount - 1) : gSeats);
      } else if (preset === "uform") {
        const yTop = 260, xLeft = centerX - 360, xRight = centerX + 360;
        let i = 0;
        for (let k = 0; k < Math.min(3, guestTableCount); k++, i++) addGT(`Tisch ${i + 1}`, centerX - 240 + k * 240, yTop, i === guestTableCount - 1 ? remaining - gSeats * (guestTableCount - 1) : gSeats);
        let row = 1;
        while (i < guestTableCount) { addGT(`Tisch ${i + 1}`, xLeft, yTop + row * 190, i === guestTableCount - 1 ? remaining - gSeats * (guestTableCount - 1) : gSeats); i++; if (i < guestTableCount) { addGT(`Tisch ${i + 1}`, xRight, yTop + row * 190, i === guestTableCount - 1 ? remaining - gSeats * (guestTableCount - 1) : gSeats); i++; } row++; }
      }
      return newTables;
    }

    // ── Setup Wizard ───────────────────────────────────────────────────────
    const setupOverlay = document.getElementById("setupOverlay");
    const setupClose = document.getElementById("setupClose");
    const sBack = document.getElementById("sBack");
    const sNext = document.getElementById("sNext");
    const setupGo = document.getElementById("setupGo");
    const setupGoManual = document.getElementById("setupGoManual");
    const panels = Array.from(document.querySelectorAll(".setup-panel"));
    const sGuestValueEl = document.getElementById("sGuestValue");

    let setupStep = 1, setupMode = "assist";

    function showSetup(open: boolean) { if (setupOverlay) setupOverlay.style.display = open ? "flex" : "none"; }

    function syncWizardSelections() {
      const setOn = (containerId: string, cls: string, val: any) => {
        document.getElementById(containerId)?.querySelectorAll("." + cls).forEach((b: any) => b.classList.toggle("on", String(b.dataset.val) === String(val)));
      };
      setOn("sBrideShape", "pill", settings.brideShape); setOn("sGuestShape", "pill", settings.guestShape);
      setOn("sBrideSeats", "chip", settings.brideSeats); setOn("sGuestSeats", "chip", settings.guestSeats);
      setOn("sCols", "chip", settings.layoutCols); setOn("sPreset", "chip", settings.layoutPreset);
    }

    function syncGuestValue() { if (sGuestValueEl) sGuestValueEl.textContent = String(settings.totalGuests); }

    function syncSummary() {
      const m = document.getElementById("sumMode"), g = document.getElementById("sumGuests");
      const b = document.getElementById("sumBride"), gt = document.getElementById("sumGuest");
      const c = document.getElementById("sumCols"), p = document.getElementById("sumPreset");
      const presetLabel: Record<string, string> = { grid: "Raster", tafel: "Tafel", uform: "U-Form", eform: "E-Form" };
      if (m) m.textContent = setupMode === "assist" ? "Assistent" : "Manuell";
      if (g) g.textContent = String(settings.totalGuests);
      if (b) b.textContent = `${settings.brideShape}, ${settings.brideSeats} Plätze`;
      if (gt) gt.textContent = `${settings.guestShape}, ${settings.guestSeats} Plätze`;
      if (c) c.textContent = String(settings.layoutCols);
      if (p) p.textContent = presetLabel[settings.layoutPreset] || "Raster";
    }

    function setStep(n: number) {
      setupStep = Math.max(1, Math.min(4, n));
      panels.forEach((p: any) => p.style.display = (Number(p.dataset.panel) === setupStep) ? "block" : "none");
      if (sBack) (sBack as any).style.visibility = setupStep === 1 ? "hidden" : "visible";
      if (sNext) (sNext as HTMLElement).style.display = setupStep === 4 ? "none" : "inline-flex";
      if (setupGo) (setupGo as HTMLElement).style.display = setupStep === 4 ? "inline-flex" : "none";
      if (setupGoManual) (setupGoManual as HTMLElement).style.display = setupStep === 4 ? "inline-flex" : "none";
      const info = document.getElementById("setupStepInfo");
      if (info) info.textContent = `Schritt ${setupStep} von 4`;
      const t = document.getElementById("setupTitle"), s = document.getElementById("setupSub");
      if (t && s) {
        const map: Record<number, [string, string]> = {
          1: ["Sitzplan Generator", "Wählt zuerst, wie ihr starten möchtet."],
          2: ["Wie viele Gäste?", "Ihr könnt später jederzeit Gäste hinzufügen."],
          3: ["Tische einrichten", "Wählt Form und Größe für Braut- und Gästetische."],
          4: ["Anordnung", "Legt fest, wie der Plan aufgebaut wird."]
        };
        [t.textContent, s.textContent] = map[setupStep];
      }
      const bar = document.getElementById("setupProgressBar");
      if (bar) (bar as HTMLElement).style.width = (setupStep / 4 * 100) + "%";
      syncWizardSelections(); syncGuestValue(); syncSummary();
    }

    function wireChoice(containerId: string, cls: string, onPick: (v: string) => void) {
      document.getElementById(containerId)?.addEventListener("click", (e: Event) => {
        const btn = (e.target as Element).closest("." + cls) as any;
        if (!btn) return;
        document.getElementById(containerId)!.querySelectorAll("." + cls).forEach((b: any) => b.classList.remove("on"));
        btn.classList.add("on"); onPick(btn.dataset.val); syncSummary();
      });
    }

    document.querySelectorAll(".preset").forEach((btn: any) => {
      btn.addEventListener("click", () => { settings.totalGuests = clampInt(btn.dataset.val, 1, 400); syncGuestValue(); syncSummary(); });
    });

    document.getElementById("startAssist")?.addEventListener("click", () => { setupMode = "assist"; setStep(2); });
    document.getElementById("startManual")?.addEventListener("click", () => { setupMode = "manual"; setStep(2); });
    document.getElementById("sGuestMinus")?.addEventListener("click", () => { settings.totalGuests = clampInt(settings.totalGuests - 1, 1, 400); syncGuestValue(); syncSummary(); });
    document.getElementById("sGuestPlus")?.addEventListener("click", () => { settings.totalGuests = clampInt(settings.totalGuests + 1, 1, 400); syncGuestValue(); syncSummary(); });

    wireChoice("sBrideShape", "pill", v => settings.brideShape = v);
    wireChoice("sGuestShape", "pill", v => settings.guestShape = v);
    wireChoice("sBrideSeats", "chip", v => settings.brideSeats = clampInt(v, 2, 24));
    wireChoice("sGuestSeats", "chip", v => settings.guestSeats = clampInt(v, 2, 24));
    wireChoice("sCols", "chip", v => settings.layoutCols = clampInt(v, 2, 6));
    wireChoice("sPreset", "chip", v => settings.layoutPreset = v);

    sBack?.addEventListener("click", () => setStep(setupStep - 1));
    sNext?.addEventListener("click", () => setStep(setupStep + 1));
    setupClose?.addEventListener("click", () => showSetup(false));

    setupGo?.addEventListener("click", () => {
      showSetup(false);
      if (setupMode === "assist") {
        if (!window.confirm("Sollen die Tische automatisch erstellt werden?\nVorhandene Tische werden ersetzt.")) return;
        guests.forEach((g: any) => { g.tableId = null; g.seatIndex = null; });
        vb = { x: 0, y: 0, w: 1600, h: 1000 }; applyViewBox(true);
        tables = generateTablesFromPreset(settings.layoutPreset || "grid");
        selectedTableId = tables.find((t: any) => t.name.toLowerCase().includes("braut"))?.id || tables[0]?.id || null;
        renderGuestList(); buildPlan();
        const bride = selectedTableId ? getTableById(selectedTableId) : null;
        vb = { x: Math.round((bride?.x ?? 800) - 800), y: 0, w: 1600, h: 1000 };
        applyViewBox(true); saveState(); showToast("Tische erstellt.");
      }
    });

    setupGoManual?.addEventListener("click", () => { showSetup(false); showToast("Manueller Modus aktiv."); });

    function createNewPlan() {
      if (!window.confirm("Neuen Plan anlegen?\nTische und Platzierungen werden zurückgesetzt.")) return;
      guests.forEach((g: any) => { g.tableId = null; g.seatIndex = null; });
      tables = []; selectedTableId = null;
      settings = { totalGuests: 80, brideShape: "oval", brideSeats: 10, guestShape: "round", guestSeats: 8, layoutCols: 3, layoutPreset: "grid", groupColors: settings.groupColors || {} };
      vb = { x: 0, y: 0, w: 1600, h: 1000 }; applyViewBox(true);
      saveState(); renderGuestList(); buildPlan();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      setupMode = "assist"; setStep(1); syncWizardSelections(); syncGuestValue(); syncSummary(); showSetup(true);
      showToast("Neuer Plan gestartet.");
    }

    document.getElementById("newPlanBtn")?.addEventListener("click", createNewPlan);

    // ── Gäste Toggle Button ────────────────────────────────────────────────
    let guestsHidden = false;
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "guestToggleBtn"; toggleBtn.textContent = "👥 Gäste ausblenden";
    toggleBtn.addEventListener("click", () => {
      guestsHidden = !guestsHidden;
      document.body.classList.toggle("guests-hidden", guestsHidden);
      toggleBtn.textContent = guestsHidden ? "👥 Gäste einblenden" : "👥 Gäste ausblenden";
    });
    document.body.appendChild(toggleBtn);

    // ── Init ───────────────────────────────────────────────────────────────
    (async () => {
      const hadLocal = localLoad();
      await initCloud();
      applyViewBox(true);
      renderGuestList();
      if (!hadLocal && tables.length === 0) {
        tables = [makeTableObject({ id: uid("t"), name: "Brauttisch", shape: "oval", capacity: 10, x: 900, y: 260 })];
      }
      buildPlan();
      if (planSub) planSub.textContent = `${countPlaced()} Gäste platziert`;
      setStep(1); showSetup(true);
    })();

    return () => {
      toggleBtn.remove();
      globalColorPicker.remove();
      if (cloud.unsub) cloud.unsub();
      clearTimeout(cloudSaveTimer);
    };
  }, []);

  return (
    <div className="seat-page-root space-y-4">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-[0_2px_24px_0_rgba(0,0,0,0.06)]">
        <div className="grid lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#fdfaf6] via-white to-[#f9f5f0] p-8 md:p-12 xl:p-14">
            <div>
              <SectionLabel>MarryPlan · Tool</SectionLabel>
              <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-stone-900 md:text-6xl">
                Euer
                <br />
                <span className="text-[#b08d6a]">Sitzplan</span>
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-stone-400">
                Tische anlegen, Gäste per Drag & Drop platzieren und den perfekten Sitzplan erstellen.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 border-t border-stone-100 pt-8">
              {[
                { label: "Tipp", value: "Am besten am Desktop nutzen" },
                { label: "Drag & Drop", value: "Gäste direkt auf Stühle ziehen" },
                { label: "Export", value: "Als JSON oder PDF sichern" },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{s.label}</div>
                  <div className="mt-1.5 text-sm font-semibold text-stone-800">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden min-h-[320px] lg:block">
            <img
              src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80"
              alt="Sitzplan"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">Automatisch gespeichert</div>
              <div className="mt-2 text-lg font-semibold leading-snug tracking-tight">Immer aktuell auf allen Geräten</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SITZPLAN TOOL ────────────────────────────────────────────────── */}
      <div className="seat-wrap">

        {/* Plan Panel */}
        <div className="seat-panel planpanel">
          <div className="seat-head">
            <div>
              <div className="seat-title">Plan</div>
              <div className="seat-sub" id="planSub">0 Gäste platziert</div>
              <div className="seat-sub" id="selectedInfo" style={{ marginTop: 3 }}>Kein Tisch ausgewählt</div>
            </div>
            <div className="head-actions">
              <div className="btn-group">
                <button className="hbtn hbtn-primary" id="newPlanBtn" type="button">Neuen Plan erstellen</button>
                <button className="hbtn" id="zoomOutBtn" type="button">🔎−</button>
                <button className="hbtn" id="zoomInBtn" type="button">🔎+</button>
                <button className="hbtn" id="autoLayoutBtn" type="button">✨ Auto</button>
              </div>
              <div className="btn-group">
                <button className="hbtn hbtn-primary" id="addTableBtn" type="button">＋ Tisch</button>
                <button className="hbtn hbtn-danger" id="deleteTableBtn" type="button" disabled>🗑 Tisch</button>
              </div>
              <div className="btn-group">
                <button className="hbtn" id="seatMinusBtn" type="button" disabled>− Stuhl</button>
                <button className="hbtn" id="seatPlusBtn" type="button" disabled>＋ Stuhl</button>
              </div>
              <div className="btn-group">
                <button className="hbtn" id="exportChip" type="button">Export</button>
                <button className="hbtn" id="importChip" type="button">Import</button>
                <button className="hbtn hbtn-primary" id="pdfChip" type="button">PDF</button>
                <input id="importFile" type="file" accept="application/json" style={{ display: "none" }} />
              </div>
              <div className="btn-group">
                <button className="hbtn hbtn-ghost" id="clearBtn" type="button">Reset</button>
                <button className="hbtn hbtn-danger" id="deleteAllTablesBtn" type="button">Alle löschen</button>
              </div>
            </div>
          </div>

          <div className="canvas-wrap">
            <div id="tableEditor" className="table-editor">
              <div className="te-title">Tisch bearbeiten</div>
              <input id="teName" className="te-input" placeholder="Tischname" />
              <div className="te-row" id="teRowLen">
                <label>Länge</label>
                <div className="te-stepper">
                  <button id="teLenMinus" className="te-mini" type="button">−</button>
                  <div id="teLenVal" className="te-val">0</div>
                  <button id="teLenPlus" className="te-mini" type="button">+</button>
                </div>
              </div>
              <div className="te-row" id="teRowDep">
                <label>Tiefe</label>
                <div className="te-stepper">
                  <button id="teDepMinus" className="te-mini" type="button">−</button>
                  <div id="teDepVal" className="te-val">0</div>
                  <button id="teDepPlus" className="te-mini" type="button">+</button>
                </div>
              </div>
              <div className="te-row">
                <label>Drehen</label>
                <div className="te-stepper">
                  <button id="teRotate" className="te-mini" type="button">⟳</button>
                </div>
              </div>
              <div className="te-sub" id="teHint"></div>
            </div>

            <svg id="planSvg" viewBox="0 0 1600 1000" />
            <div id="toast" className="toast"></div>
          </div>
        </div>

        {/* Guests Panel */}
        <div className="seat-panel guestpanel">
          <div className="seat-head">
            <div>
              <div className="seat-title">Gäste</div>
              <div className="seat-sub">Farbe anklicken ändert Gruppe</div>
            </div>
          </div>
          <div className="pad">
            <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 14, background: "#fff", boxShadow: "0 6px 16px rgba(0,0,0,.05)", display: "grid", gap: 10 }}>
              <input id="guestNameInput" className="input" placeholder="Gastname" />
              <div className="row">
                <select id="guestGroupInput" className="input" style={{ cursor: "pointer" }}>
                  {["Braut","Bräutigam","Eltern Braut","Eltern Bräutigam","Geschwister Braut","Geschwister Bräutigam","Großeltern","Paten","Kinder","Trauzeuge Braut","Trauzeuge Bräutigam","Trauzeugen Partner","Familie Braut","Familie Bräutigam","Familie","Freunde Braut","Freunde Bräutigam","Freunde","Arbeitskollegin","Arbeitskollege","Studienfreunde","Nachbarn","Verein","Dienstleister","Kinderbetreuung","Sonstiges"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <button className="btn" id="addGuestBtn" type="button">Hinzufügen</button>
              </div>
              <button className="btn" id="csvImportBtn" type="button" style={{ padding: "8px 10px", fontSize: 13, borderRadius: 12 }}>CSV importieren</button>
              <input id="csvFile" type="file" accept=".csv" style={{ display: "none" }} />
              <input id="searchInput" className="input" placeholder="Gäste suchen..." />
            </div>
            <div id="guestList" className="guest-list"></div>
          </div>
        </div>
      </div>

      {/* ── SETUP WIZARD ─────────────────────────────────────────────────── */}
      <div id="setupOverlay" className="setup-overlay" style={{ display: "none" }}>
        <div className="setup-shell">
          <div className="setup-head">
            <div className="setup-head-center">
              <div id="setupStepInfo" className="setup-stepline">Schritt 1 von 4</div>
              <div className="setup-progress"><div id="setupProgressBar" /></div>
              <div className="setup-dots" />
              <div id="setupTitle" className="setup-title">Sitzplan Generator</div>
              <div id="setupSub" className="setup-sub">In wenigen Schritten zu eurem perfekten Sitzplan.</div>
            </div>
            <button id="setupClose" className="setup-x" type="button">×</button>
          </div>

          <div className="setup-body">
            {/* Step 1 */}
            <section className="setup-panel" data-panel="1">
              <div className="setup-hero">
                <div className="setup-hero-ic">🪑</div>
                <div>
                  <div className="setup-hero-title">Sitzplan Setup</div>
                  <div className="setup-hero-sub">In wenigen Schritten zum perfekten Start. Danach könnt ihr alles frei bearbeiten.</div>
                </div>
              </div>
              <div className="setup-grid2" style={{ marginTop: 12 }}>
                <button id="startAssist" className="pick-card" type="button">
                  <div className="pick-ic">✨</div>
                  <div className="pick-txt">
                    <div className="pick-title">Assistent</div>
                    <div className="pick-sub">Wir erstellen automatisch Tische und eine saubere Grund-Anordnung.</div>
                    <ul className="pick-bullets"><li>Brauttisch + passende Gästetische</li><li>Gute Start-Positionen, danach frei anpassbar</li></ul>
                  </div>
                  <div className="pick-go">›</div>
                </button>
                <button id="startManual" className="pick-card" type="button">
                  <div className="pick-ic">🧩</div>
                  <div className="pick-txt">
                    <div className="pick-title">Manuell</div>
                    <div className="pick-sub">Ihr importiert zuerst nur die Gäste. Tische setzt ihr später selbst.</div>
                    <ul className="pick-bullets"><li>Gäste zuerst, Tische später</li><li>Maximale Kontrolle</li></ul>
                  </div>
                  <div className="pick-go">›</div>
                </button>
              </div>
              <div className="setup-note"><strong>Tipp: Am besten am PC oder Laptop nutzen — deutlich mehr Platz und einfacher zu bedienen.</strong></div>
            </section>

            {/* Step 2 */}
            <section className="setup-panel" data-panel="2" style={{ display: "none" }}>
              <div className="setup-block">
                <div className="blk-title">Wie viele Gäste plant ihr ungefähr?</div>
                <div className="setup-row2">
                  <div className="setup-mini">Diese Zahl hilft dem Assistenten, die richtige Anzahl an Tischen vorzubereiten.</div>
                  <div className="setup-presets">
                    {[20, 40, 60, 80, 100, 120].map(v => <button key={v} className="chip preset" type="button" data-val={v}>{v}</button>)}
                  </div>
                </div>
                <div className="big-stepper">
                  <button id="sGuestMinus" className="big-btn" type="button">-</button>
                  <div className="big-value" id="sGuestValue">80</div>
                  <button id="sGuestPlus" className="big-btn" type="button">+</button>
                </div>
                <div className="setup-hintline">Empfehlung: lieber etwas großzügig planen.</div>
              </div>
            </section>

            {/* Step 3 */}
            <section className="setup-panel" data-panel="3" style={{ display: "none" }}>
              <div className="setup-block">
                <div className="blk-title">Tische festlegen</div>
                <div className="setup-mini">Wählt Form und Sitzplätze.</div>
              </div>
              <div className="setup-grid2">
                <div className="setup-block">
                  <div className="setup-subtitle">Brauttisch</div>
                  <div className="setup-shape-row" id="sBrideShape">
                    {[["oval","⬭","Oval"],["round","●","Rund"],["rect","▭","Eckig"]].map(([v,ic,label]) => <button key={v} className="shape-btn pill" data-val={v} type="button"><span className="shape-ic">{ic}</span><span>{label}</span></button>)}
                  </div>
                  <div className="setup-subtitle2">Sitzplätze</div>
                  <div className="chip-row" id="sBrideSeats">
                    {[4,6,8,10,12].map(v => <button key={v} className="chip" data-val={v} type="button">{v}</button>)}
                  </div>
                  <div className="setup-tip">Tipp: Der Brauttisch wirkt schöner, wenn er etwas breiter ist.</div>
                </div>
                <div className="setup-block">
                  <div className="setup-subtitle">Gästetische</div>
                  <div className="setup-shape-row" id="sGuestShape">
                    {[["round","●","Rund"],["oval","⬭","Oval"],["rect","▭","Eckig"]].map(([v,ic,label]) => <button key={v} className="shape-btn pill" data-val={v} type="button"><span className="shape-ic">{ic}</span><span>{label}</span></button>)}
                  </div>
                  <div className="setup-subtitle2">Sitzplätze pro Tisch</div>
                  <div className="chip-row" id="sGuestSeats">
                    {[6,8,10,12].map(v => <button key={v} className="chip" data-val={v} type="button">{v}</button>)}
                  </div>
                  <div className="setup-tip">Tipp: 8er Tische sind oft der beste Mix.</div>
                </div>
              </div>
              <div className="setup-note">Hinweis: Der Assistent ersetzt vorhandene Tische. Gäste bleiben erhalten.</div>
            </section>

            {/* Step 4 */}
            <section className="setup-panel" data-panel="4" style={{ display: "none" }}>
              <div className="setup-grid2">
                <div className="setup-block">
                  <div className="blk-title">Anordnung</div>
                  <div className="setup-mini">Wie breit soll das Raster sein?</div>
                  <div className="chip-row" id="sCols">
                    {[2,3,4,5,6].map(v => <button key={v} className="chip" data-val={v} type="button">{v} Spalten</button>)}
                  </div>
                  <div className="setup-tip">Empfehlung: 3 Spalten ist fast immer ein guter Start.</div>
                  <div className="setup-block" style={{ marginTop: 14 }}>
                    <div className="setup-subtitle">Tisch-Anordnung Preset</div>
                    <div className="chip-row" id="sPreset" style={{ marginTop: 10 }}>
                      {[["grid","Raster"],["tafel","Tafel"],["uform","U-Form"],["eform","E-Form"]].map(([v,l]) => <button key={v} className="chip" data-val={v} type="button">{l}</button>)}
                    </div>
                    <div className="setup-tip">Tipp: U-Form ist super für den Brauttisch.</div>
                  </div>
                </div>
                <div className="setup-block">
                  <div className="blk-title">Zusammenfassung</div>
                  <div className="summary">
                    <div className="sum-row"><span>Modus</span><b id="sumMode">Assistent</b></div>
                    <div className="sum-row"><span>Gäste</span><b id="sumGuests">80</b></div>
                    <div className="sum-row"><span>Brauttisch</span><b id="sumBride">oval, 10 Plätze</b></div>
                    <div className="sum-row"><span>Gästetische</span><b id="sumGuest">round, 8 Plätze</b></div>
                    <div className="sum-row"><span>Spalten</span><b id="sumCols">3</b></div>
                    <div className="sum-row"><span>Preset</span><b id="sumPreset">Raster</b></div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="setup-footer">
            <button id="sBack" className="btn" type="button">Zurück</button>
            <div className="setup-footer-right">
              <button id="setupGo" className="btn btn-on" type="button" style={{ display: "none" }}>Weiter zum Sitzplan</button>
              <button id="setupGoManual" className="btn" type="button" style={{ display: "none" }}>Manuell starten</button>
              <button id="sNext" className="btn btn-on" type="button">Weiter</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}