"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, PiggyBank, TrendingUp, AlertCircle } from "lucide-react";

// ─── Konstanten ───────────────────────────────────────────────────────────────

const categories = [
  "Location & Miete",
  "Catering & Getränke",
  "Hochzeitstorte & Desserts",
  "DJ & Musik",
  "Live-Entertainment",
  "Foto & Video",
  "Deko & Floristik",
  "Brautmode",
  "Bräutigammode",
  "Styling & Beauty",
  "Trauung & Papeterie",
  "Freier Redner",
  "Ringe & Schmuck",
  "Transport & Shuttle",
  "Unterkunft",
  "Kinderbetreuung",
  "Gastgeschenke",
  "Wedding Planner",
  "Technik & Beleuchtung",
  "Sonstiges",
] as const;

const recommendationRules: Record<string, { min: number; max: number }> = {
  "Location & Miete": { min: 18, max: 28 },
  "Catering & Getränke": { min: 22, max: 32 },
  "Hochzeitstorte & Desserts": { min: 2, max: 5 },
  "DJ & Musik": { min: 5, max: 10 },
  "Live-Entertainment": { min: 2, max: 8 },
  "Foto & Video": { min: 8, max: 14 },
  "Deko & Floristik": { min: 4, max: 9 },
  Brautmode: { min: 4, max: 8 },
  Bräutigammode: { min: 2, max: 5 },
  "Styling & Beauty": { min: 2, max: 5 },
  "Trauung & Papeterie": { min: 2, max: 5 },
  "Freier Redner": { min: 2, max: 5 },
  "Ringe & Schmuck": { min: 3, max: 8 },
  "Transport & Shuttle": { min: 2, max: 6 },
  Unterkunft: { min: 2, max: 6 },
  Kinderbetreuung: { min: 1, max: 3 },
  Gastgeschenke: { min: 1, max: 3 },
  "Wedding Planner": { min: 5, max: 12 },
  "Technik & Beleuchtung": { min: 2, max: 6 },
  Sonstiges: { min: 4, max: 8 },
};

const chartColors = [
  "#e99a6c", "#f2b28e", "#c97748", "#b8865c", "#d8a27a",
  "#8e6b57", "#f6c7ad", "#9b7d68", "#c6a287", "#ead2c1",
];

// ─── Typen ────────────────────────────────────────────────────────────────────

type BudgetItemStatus = "angefragt" | "gebucht" | "bezahlt";

type BudgetItem = {
  id: string;
  name: string;
  category: string;
  amount: number;
  status: BudgetItemStatus;
};

type PlannerState = {
  goal: number;
  items: BudgetItem[];
};

type SaveStateType = "ok" | "warn" | "err";

type SaveState = {
  type: SaveStateType;
  label: string;
  text: string;
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

function normalizeStatus(value: unknown): BudgetItemStatus {
  const valid: BudgetItemStatus[] = ["angefragt", "gebucht", "bezahlt"];
  return valid.includes(String(value) as BudgetItemStatus)
    ? (String(value) as BudgetItemStatus)
    : "angefragt";
}

function statusLabel(value: unknown) {
  const map: Record<BudgetItemStatus, string> = {
    angefragt: "Angefragt",
    gebucht: "Gebucht",
    bezahlt: "Bezahlt",
  };
  return map[normalizeStatus(value)];
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatEuro(value: number) {
  return (
    new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(
      Number(value || 0)
    ) + " €"
  );
}

function formatCompactEuro(value: number) {
  const n = Number(value || 0);
  if (n >= 1000)
    return (
      new Intl.NumberFormat("de-DE", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }).format(n / 1000) + "k €"
    );
  return formatEuro(n);
}

function getPlannedTotal(items: BudgetItem[]) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getCategoryTotals(items: BudgetItem[]) {
  return categories
    .map((category) => ({
      category,
      total: items
        .filter((i) => i.category === category)
        .reduce((sum, i) => sum + Number(i.amount || 0), 0),
    }))
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total);
}

function getRelevantRecommendationCategories(items: BudgetItem[]) {
  const used = categories.filter((c) => items.some((i) => i.category === c));
  const defaults = ["Location & Miete", "Catering & Getränke", "DJ & Musik", "Foto & Video"];
  return [...new Set([...used, ...defaults])].filter((c) => c in recommendationRules);
}

function buildExportText(state: PlannerState) {
  const planned = getPlannedTotal(state.items);
  const lines = [
    "Budgetplan Hochzeit",
    `Gesamtbudget: ${formatEuro(state.goal)}`,
    `Verplant: ${formatEuro(planned)}`,
    `Verfügbar: ${formatEuro(state.goal - planned)}`,
    "",
    "Positionen:",
  ];
  state.items.forEach((item) =>
    lines.push(`- ${item.name} | ${item.category} | ${formatEuro(item.amount)} | ${statusLabel(item.status)}`)
  );
  return lines.join("\n");
}

function drawEmptyChart(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 100, 0, Math.PI * 2);
  ctx.fillStyle = "#f2ebe4";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 58, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.fillStyle = "#a8998f";
  ctx.font = "600 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Noch keine", cx, cy - 6);
  ctx.fillText("Daten", cx, cy + 12);
}

// ─── Design-Bausteine ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-400">
      {children}
    </div>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-stone-100 bg-white shadow-[0_2px_16px_0_rgba(0,0,0,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 transition focus:border-stone-400 focus:bg-white focus:outline-none";

const selectCls =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 transition focus:border-stone-400 focus:bg-white focus:outline-none";

// ─── Status-Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BudgetItemStatus }) {
  const map: Record<BudgetItemStatus, string> = {
    bezahlt: "border-emerald-200 bg-emerald-50 text-emerald-700",
    gebucht: "border-amber-200 bg-amber-50 text-amber-700",
    angefragt: "border-blue-200 bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

// ─── Hauptkomponente ───────────────────────────────────────────────────────────

export default function BudgetPage() {
  const router = useRouter();
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [plannerState, setPlannerState] = useState<PlannerState>({ goal: 0, items: [] });
  const [goalInput, setGoalInput] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState<string>(categories[0]);
  const [itemAmount, setItemAmount] = useState("");
  const [itemStatus, setItemStatus] = useState<BudgetItemStatus>("angefragt");
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({
    type: "warn",
    label: "Verbinden…",
    text: "Nutzer wird geprüft.",
  });

  const planned = useMemo(() => getPlannedTotal(plannerState.items), [plannerState.items]);
  const remaining = plannerState.goal - planned;
  const utilization = plannerState.goal > 0 ? Math.round((planned / plannerState.goal) * 100) : 0;
  const progressPercent = Math.max(0, Math.min(utilization, 100));
  const categoryTotals = useMemo(() => getCategoryTotals(plannerState.items), [plannerState.items]);
  const recommendationCategories = useMemo(
    () => getRelevantRecommendationCategories(plannerState.items).slice(0, 6),
    [plannerState.items]
  );

  // ─── Auth & Daten laden ───────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.emailVerified) {
        setCurrentUser(null);
        setAuthLoading(false);
        setPageLoading(false);
        router.push("/login");
        return;
      }
      setCurrentUser(user);
      try {
        const budgetSnap = await (async () => {
          const [, b] = await Promise.all([
            getDoc(doc(db, "users", user.uid)),
            getDoc(doc(db, "users", user.uid, "tools", "budgetPlanner")),
          ]);
          return b;
        })();

        if (budgetSnap.exists()) {
          const data = budgetSnap.data() || {};
          const nextState: PlannerState = {
            goal: Number(data.goal || 0),
            items: Array.isArray(data.items)
              ? data.items.map((item: any) => ({
                  id: String(item.id || createId()),
                  name: String(item.name || ""),
                  category: String(item.category || "Sonstiges"),
                  amount: Number(item.amount || 0),
                  status: normalizeStatus(item.status),
                }))
              : [],
          };
          setPlannerState(nextState);
          setGoalInput(nextState.goal ? String(nextState.goal) : "");
        }
        setIsInitialized(true);
        setSaveState({ type: "ok", label: "Verbunden", text: `Gespeichert für ${user.email || user.uid}` });
      } catch (err) {
        console.error(err);
        setSaveState({ type: "err", label: "Fehler", text: "Budget konnte nicht geladen werden." });
      } finally {
        setAuthLoading(false);
        setPageLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ─── Auto-Save ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser || !isInitialized) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState({ type: "warn", label: "Speichert…", text: "" });
        await setDoc(
          doc(db, "users", currentUser.uid, "tools", "budgetPlanner"),
          {
            goal: Number(plannerState.goal || 0),
            items: plannerState.items.map((item) => ({
              id: String(item.id),
              name: String(item.name),
              category: String(item.category),
              amount: Number(item.amount || 0),
              status: normalizeStatus(item.status),
            })),
            updatedAt: serverTimestamp(),
            userId: currentUser.uid,
          },
          { merge: true }
        );
        setSaveState({ type: "ok", label: "Gespeichert", text: `Für ${currentUser.email || currentUser.uid}` });
      } catch {
        setSaveState({ type: "err", label: "Fehler", text: "Änderungen konnten nicht gespeichert werden." });
      }
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [plannerState, currentUser, isInitialized]);

  // ─── Donut-Chart ──────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!categoryTotals.length || planned <= 0) {
      drawEmptyChart(ctx, canvas.width, canvas.height);
      return;
    }

    const limited = categoryTotals.slice(0, 6);
    const shownTotal = limited.reduce((s, e) => s + e.total, 0);
    const chartData = [...limited];
    if (planned - shownTotal > 0) chartData.push({ category: "Weitere", total: planned - shownTotal });

    const cx = canvas.width / 2, cy = canvas.height / 2;
    let angle = -Math.PI / 2;

    chartData.forEach((entry, i) => {
      const slice = (entry.total / planned) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 100, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = chartColors[i % chartColors.length];
      ctx.fill();
      angle += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.fillStyle = "#a8998f";
    ctx.font = "600 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Verplant", cx, cy - 8);
    ctx.fillStyle = "#2f241d";
    ctx.font = "700 18px system-ui";
    ctx.fillText(formatCompactEuro(planned), cx, cy + 14);
  }, [categoryTotals, planned]);

  // ─── Warnungen ────────────────────────────────────────────────────────────

  const warnings = useMemo(() => {
    const entries: { cls: "good" | "warn" | "err"; title: string; text: string }[] = [];

    if (plannerState.goal <= 0) {
      entries.push({ cls: "warn", title: "Gesamtbudget fehlt", text: "Legt zuerst euer Gesamtbudget fest." });
    } else if (remaining < 0) {
      entries.push({ cls: "err", title: "Budget überschritten", text: `Ihr liegt ${formatEuro(Math.abs(remaining))} über eurem Budgetrahmen.` });
    } else if (remaining / plannerState.goal <= 0.15) {
      entries.push({ cls: "warn", title: "Reserve wird knapp", text: `Nur noch ${formatEuro(Math.max(remaining, 0))} verfügbar.` });
    } else {
      entries.push({ cls: "good", title: "Budget im grünen Bereich", text: `Noch ${formatEuro(remaining)} frei.` });
    }

    const paid = plannerState.items.filter((i) => normalizeStatus(i.status) === "bezahlt").length;
    const booked = plannerState.items.filter((i) => normalizeStatus(i.status) === "gebucht").length;
    const requested = plannerState.items.filter((i) => normalizeStatus(i.status) === "angefragt").length;
    entries.push({
      cls: booked > 0 || paid > 0 ? "good" : "warn",
      title: "Status-Überblick",
      text: `${requested} angefragt · ${booked} gebucht · ${paid} bezahlt`,
    });

    if (categoryTotals[0] && planned > 0) {
      const share = Math.round((categoryTotals[0].total / planned) * 100);
      entries.push({
        cls: share >= 45 ? "warn" : "good",
        title: "Größter Kostenblock",
        text: `${categoryTotals[0].category} macht ${share}% des verplanten Budgets aus.`,
      });
    }

    return entries;
  }, [plannerState, remaining, categoryTotals, planned]);

  const budgetBadge = useMemo(() => {
    if (plannerState.goal <= 0) return { cls: "warn", label: "Kein Budget gesetzt" };
    if (remaining < 0) return { cls: "err", label: "Überschritten" };
    if (utilization >= 85) return { cls: "warn", label: "Fast ausgeschöpft" };
    return { cls: "good", label: "Im Rahmen" };
  }, [plannerState.goal, remaining, utilization]);

  // ─── Handler ─────────────────────────────────────────────────────────────

  function handleSaveGoal() {
    const goal = Number(goalInput || 0);
    if (goal < 0) { window.alert("Bitte ein gültiges Budget eingeben."); return; }
    setPlannerState((c) => ({ ...c, goal }));
  }

  function handleAddItem() {
    const name = itemName.trim();
    const amount = Number(itemAmount || 0);
    if (!name) { window.alert("Bitte eine Bezeichnung eingeben."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { window.alert("Bitte einen gültigen Betrag eingeben."); return; }
    setPlannerState((c) => ({
      ...c,
      items: [{ id: createId(), name, category: itemCategory, amount, status: itemStatus }, ...c.items],
    }));
    setItemName(""); setItemAmount(""); setItemStatus("angefragt");
  }

  function handleLoadSample() {
    const s: PlannerState = {
      goal: 25000,
      items: [
        { id: createId(), name: "Location Schlossgarten", category: "Location & Miete", amount: 6500, status: "gebucht" },
        { id: createId(), name: "Catering Genusswerk", category: "Catering & Getränke", amount: 7200, status: "angefragt" },
        { id: createId(), name: "DJ Sven", category: "DJ & Musik", amount: 1600, status: "gebucht" },
        { id: createId(), name: "Fotograf", category: "Foto & Video", amount: 2200, status: "angefragt" },
        { id: createId(), name: "Floristik", category: "Deko & Floristik", amount: 1400, status: "bezahlt" },
        { id: createId(), name: "Brautkleid", category: "Brautmode", amount: 1800, status: "gebucht" },
        { id: createId(), name: "Anzug", category: "Bräutigammode", amount: 700, status: "gebucht" },
        { id: createId(), name: "Papeterie", category: "Trauung & Papeterie", amount: 700, status: "bezahlt" },
      ],
    };
    setPlannerState(s);
    setGoalInput(String(s.goal));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildExportText(plannerState));
      window.alert("Budget in Zwischenablage kopiert.");
    } catch { window.alert("Kopieren nicht möglich."); }
  }

  function handleReset() {
    if (!window.confirm("Alle Budgetdaten wirklich löschen?")) return;
    setPlannerState({ goal: 0, items: [] });
    setGoalInput(""); setItemName(""); setItemAmount("");
    setItemStatus("angefragt"); setItemCategory(categories[0]);
  }

  function removeItem(id: string) {
    setPlannerState((c) => ({ ...c, items: c.items.filter((e) => e.id !== id) }));
  }

  // ─── Lade-Zustand ─────────────────────────────────────────────────────────

  if (authLoading || pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4f0]">
        <div className="text-sm text-stone-400">Wird geladen…</div>
      </main>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-[0_2px_24px_0_rgba(0,0,0,0.06)]">
        <div className="grid lg:grid-cols-[1fr_380px]">

          {/* Textseite */}
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#fdfaf6] via-white to-[#f9f5f0] p-8 md:p-12 xl:p-14">
            <div>
              <SectionLabel>Wedding Hub · Tool</SectionLabel>
              <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-stone-900 md:text-6xl">
                Euer
                <br />
                <span className="text-[#b08d6a]">Budgetplaner</span>
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-stone-400">
                Kosten erfassen, Kategorien im Blick behalten und das Gesamtbudget nie aus den Augen verlieren.
              </p>
            </div>

            {/* Quickstats */}
            <div className="mt-10 flex flex-wrap gap-8 border-t border-stone-100 pt-8">
              {[
                { label: "Gesamtbudget", value: plannerState.goal > 0 ? formatEuro(plannerState.goal) : "—" },
                { label: "Verplant", value: formatEuro(planned) },
                { label: "Auslastung", value: plannerState.goal > 0 ? `${utilization} %` : "—" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{s.label}</div>
                  <div className="mt-1.5 text-base font-semibold text-stone-800">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bildseite */}
          <div className="relative hidden min-h-[320px] lg:block">
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80"
              alt="Budget"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            {/* Speicher-Status */}
            <div className="absolute bottom-0 left-0 right-0 p-7">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Speicherstatus
              </div>
              <div
                className={`mt-2 inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                  saveState.type === "ok"
                    ? "border-emerald-400/30 bg-emerald-900/40 text-emerald-300"
                    : saveState.type === "err"
                    ? "border-red-400/30 bg-red-900/40 text-red-300"
                    : "border-amber-400/30 bg-amber-900/40 text-amber-300"
                }`}
              >
                {saveState.label}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Gesamtbudget", value: plannerState.goal > 0 ? formatEuro(plannerState.goal) : "—", sub: "Euer Budgetrahmen" },
          { label: "Verplant", value: formatEuro(planned), sub: "Alle Positionen" },
          {
            label: "Verfügbar",
            value: formatEuro(remaining),
            sub: remaining < 0 ? "Überschritten" : "Noch frei",
            color: remaining < 0 ? "text-red-600" : plannerState.goal > 0 && remaining / plannerState.goal <= 0.15 ? "text-amber-600" : "text-emerald-700",
          },
          { label: "Positionen", value: String(plannerState.items.length), sub: "Einträge gesamt" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-stone-100 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">{s.label}</div>
            <div className={`mt-3 text-3xl font-semibold tracking-tight ${(s as any).color ?? "text-stone-900"}`}>
              {s.value}
            </div>
            <div className="mt-1 text-xs text-stone-400">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── FORTSCHRITTSBALKEN ───────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel>Budgetauslastung</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">{utilization} % genutzt</div>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
              budgetBadge.cls === "good"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : budgetBadge.cls === "err"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {budgetBadge.label}
          </span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              remaining < 0 ? "bg-red-500" : utilization >= 85 ? "bg-amber-500" : "bg-stone-800"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* ── HAUPTBEREICH: Planer + Sidebar ───────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1fr_360px] items-start">

        {/* Linke Spalte */}
        <div className="space-y-5">

          {/* Gesamtbudget setzen */}
          <Card className="p-7">
            <SectionLabel>Schritt 1</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">Gesamtbudget festlegen</div>
            <p className="mt-2 text-sm text-stone-400">
              Setzt euren Budgetrahmen — danach erscheinen Empfehlungen und Warnungen automatisch.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <Field label="Gesamtbudget in Euro">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="z. B. 20000"
                    className={inputCls}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={handleSaveGoal}
                className="rounded-xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Beispiel laden
              </button>
            </div>
          </Card>

          {/* Kostenpunkt hinzufügen */}
          <Card className="p-7">
            <SectionLabel>Schritt 2</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">Kostenpunkt hinzufügen</div>
            <p className="mt-2 text-sm text-stone-400">
              DJ, Catering, Fotografie, Deko — tragt einzelne Ausgaben hier ein.
            </p>

            <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Bezeichnung">
                  <input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="z. B. DJ Sven"
                    className={inputCls}
                  />
                </Field>
                <Field label="Kategorie">
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className={selectCls}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Betrag in Euro">
                  <input
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="z. B. 1500"
                    className={inputCls}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={itemStatus}
                    onChange={(e) => setItemStatus(normalizeStatus(e.target.value))}
                    className={selectCls}
                  >
                    <option value="angefragt">Angefragt</option>
                    <option value="gebucht">Gebucht</option>
                    <option value="bezahlt">Bezahlt</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          </Card>

          {/* Positions-Liste */}
          <Card className="p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <SectionLabel>Positionen</SectionLabel>
                <div className="mt-1.5 text-xl font-semibold text-stone-900">Alle Einträge</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] font-semibold text-stone-600 transition hover:bg-white"
                >
                  Kopieren
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-red-100"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {plannerState.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-14 text-center">
                  <PiggyBank className="h-8 w-8 text-stone-300" />
                  <div className="mt-3 text-sm font-semibold text-stone-400">Noch keine Einträge</div>
                  <div className="mt-1 text-xs text-stone-300">Fügt oben euren ersten Kostenpunkt hinzu</div>
                </div>
              ) : (
                plannerState.items.map((item) => {
                  const share = planned > 0 ? Math.round((item.amount / planned) * 100) : 0;
                  return (
                    <div
                      key={item.id}
                      className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-stone-800">{item.name}</div>
                        <div className="mt-0.5 text-[11px] text-stone-400">{item.category} · {share} % des Plans</div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-semibold text-stone-900">{formatEuro(item.amount)}</div>
                      </div>

                      <StatusBadge status={item.status} />

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg border border-transparent px-3 py-1.5 text-[11px] font-semibold text-red-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                      >
                        Entfernen
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Rechte Sidebar */}
        <div className="space-y-5">

          {/* Hinweise */}
          <Card className="p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="mt-5">
              <SectionLabel>Analyse</SectionLabel>
              <div className="mt-1.5 text-xl font-semibold text-stone-900">Budget-Hinweise</div>
            </div>
            <div className="mt-5 space-y-2">
              {warnings.map((entry, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 ${
                    entry.cls === "good"
                      ? "border-emerald-100 bg-emerald-50"
                      : entry.cls === "err"
                      ? "border-red-100 bg-red-50"
                      : "border-amber-100 bg-amber-50"
                  }`}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wider ${
                    entry.cls === "good" ? "text-emerald-700" : entry.cls === "err" ? "text-red-700" : "text-amber-700"
                  }`}>
                    {entry.title}
                  </div>
                  <div className="mt-1 text-sm text-stone-600">{entry.text}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Empfehlungen */}
          <Card className="p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="mt-5">
              <SectionLabel>Orientierung</SectionLabel>
              <div className="mt-1.5 text-xl font-semibold text-stone-900">Empfohlene Rahmen</div>
            </div>

            {plannerState.goal <= 0 ? (
              <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-10 text-center">
                <div className="text-sm text-stone-400">Erst Gesamtbudget setzen</div>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {recommendationCategories.map((category) => {
                  const rule = recommendationRules[category];
                  const spent = plannerState.items
                    .filter((i) => i.category === category)
                    .reduce((s, i) => s + i.amount, 0);
                  const minVal = Math.round(plannerState.goal * (rule.min / 100));
                  const maxVal = Math.round(plannerState.goal * (rule.max / 100));
                  const cls =
                    spent === 0 || spent < minVal ? "warn" : spent > maxVal ? "err" : "good";

                  return (
                    <div key={category} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-stone-700">{category}</span>
                        <span className="text-xs font-semibold text-stone-900">{formatEuro(spent)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-stone-400">
                        {formatEuro(minVal)} – {formatEuro(maxVal)}
                      </div>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                          cls === "good"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : cls === "err"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {spent === 0 ? "Noch offen" : cls === "good" ? "Im Rahmen" : cls === "err" ? "Zu hoch" : "Zu niedrig"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* ── DIAGRAMM ─────────────────────────────────────────────────────── */}
      <Card className="p-7">
        <SectionLabel>Visualisierung</SectionLabel>
        <div className="mt-1.5 text-xl font-semibold text-stone-900">Budget-Diagramm</div>
        <p className="mt-2 text-sm text-stone-400">
          Welche Kategorien haben aktuell den größten Anteil?
        </p>

        <div className="mt-6 grid gap-8 xl:grid-cols-[280px_1fr] xl:items-center">
          <div className="flex justify-center">
            <canvas
              ref={chartRef}
              width={280}
              height={280}
              className="h-[240px] w-[240px]"
            />
          </div>

          {!categoryTotals.length || planned <= 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-14 text-center">
              <div className="text-sm text-stone-400">Positionen erfassen, um das Diagramm zu sehen</div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(() => {
                const limited = categoryTotals.slice(0, 6);
                const shownTotal = limited.reduce((s, e) => s + e.total, 0);
                const chartData = [...limited];
                if (planned - shownTotal > 0) chartData.push({ category: "Weitere", total: planned - shownTotal });
                return chartData.map((entry, i) => (
                  <div
                    key={entry.category}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                      <span className="truncate text-xs font-semibold text-stone-700">{entry.category}</span>
                    </div>
                    <div className="text-right text-[11px] font-semibold text-stone-400 shrink-0">
                      {Math.round((entry.total / planned) * 100)} %
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </Card>

      {/* ── KATEGORIEN-AUSWERTUNG ─────────────────────────────────────────── */}
      {categoryTotals.length > 0 && (
        <Card className="p-7">
          <SectionLabel>Auswertung</SectionLabel>
          <div className="mt-1.5 text-xl font-semibold text-stone-900">Kategorien im Überblick</div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categoryTotals.slice(0, 6).map((entry) => {
              const share = planned > 0 ? Math.round((entry.total / planned) * 100) : 0;
              return (
                <div key={entry.category} className="rounded-2xl border border-stone-100 bg-stone-50 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-700">{entry.category}</span>
                    <span className="text-sm font-semibold text-stone-900">{formatEuro(entry.total)}</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
                    <div className="h-full rounded-full bg-stone-700" style={{ width: `${share}%` }} />
                  </div>
                  <div className="mt-1.5 text-[11px] text-stone-400">{share} % des verplanten Budgets</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── NAVIGATION ───────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Übersicht
        </Link>
      </div>
    </div>
  );
}