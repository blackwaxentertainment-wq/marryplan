"use client";

import {
  type ElementType,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Heart,
  LayoutDashboard,
  LogOut,
  Music4,
  PiggyBank,
  Users,
} from "lucide-react";

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
  "#e99a6c",
  "#f2b28e",
  "#c97748",
  "#b8865c",
  "#d8a27a",
  "#8e6b57",
  "#f6c7ad",
  "#9b7d68",
  "#c6a287",
  "#ead2c1",
];

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

type DashboardProfile = {
  partnerOne: string;
  partnerTwo: string;
  weddingDate: string;
};

function daysUntil(dateString: string) {
  if (!dateString) return null;
  const today = new Date();
  const target = new Date(dateString);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function formatWeddingDate(dateString: string) {
  if (!dateString) return "noch offen";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "noch offen";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function MinimalNavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ElementType;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-full px-4 py-3 text-sm transition ${
        active
          ? "bg-stone-900 text-white"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-60" />
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">
      {children}
    </div>
  );
}

function SoftBlock({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[32px] border border-stone-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

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
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatEuro(value: number) {
  return (
    new Intl.NumberFormat("de-DE", {
      maximumFractionDigits: 0,
    }).format(Number(value || 0)) + "€"
  );
}

function formatCompactEuro(value: number) {
  const number = Number(value || 0);
  if (number >= 1000) {
    return (
      new Intl.NumberFormat("de-DE", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }).format(number / 1000) + "k€"
    );
  }
  return formatEuro(number);
}

function getPlannedTotal(items: BudgetItem[]) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getCategoryTotals(items: BudgetItem[]) {
  return categories
    .map((category) => {
      const total = items
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return { category, total };
    })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
}

function getRelevantRecommendationCategories(items: BudgetItem[]) {
  const used = categories.filter((category) =>
    items.some((item) => item.category === category)
  );

  const defaults = [
    "Location & Miete",
    "Catering & Getränke",
    "DJ & Musik",
    "Foto & Video",
  ];

  return [...new Set([...used, ...defaults])].filter(
    (category) => category in recommendationRules
  );
}

function buildExportText(state: PlannerState) {
  const planned = getPlannedTotal(state.items);
  const remaining = state.goal - planned;

  const lines = [
    "Budgetplan Hochzeit",
    `Gesamtbudget: ${formatEuro(state.goal)}`,
    `Verplant: ${formatEuro(planned)}`,
    `Verfügbar: ${formatEuro(remaining)}`,
    "",
    "Positionen:",
  ];

  state.items.forEach((item) => {
    lines.push(
      `- ${item.name} | ${item.category} | ${formatEuro(item.amount)} | ${statusLabel(item.status)}`
    );
  });

  lines.push("");
  lines.push("Empfohlene Budgetrahmen:");

  if (state.goal > 0) {
    getRelevantRecommendationCategories(state.items)
      .slice(0, 6)
      .forEach((category) => {
        const rule = recommendationRules[category];
        if (!rule) return;
        const minValue = Math.round(state.goal * (rule.min / 100));
        const maxValue = Math.round(state.goal * (rule.max / 100));
        lines.push(
          `- ${category}: ${formatEuro(minValue)} bis ${formatEuro(maxValue)}`
        );
      });
  }

  return lines.join("\n");
}

function drawEmptyChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
  ctx.fillStyle = "#f2ebe4";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 58, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.fillStyle = "#7b6c60";
  ctx.font = "700 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Noch", centerX, centerY - 8);
  ctx.fillText("keine Daten", centerX, centerY + 12);
}

export default function BudgetPage() {
  const router = useRouter();
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [dashboardProfile, setDashboardProfile] = useState<DashboardProfile>({
    partnerOne: "",
    partnerTwo: "",
    weddingDate: "",
  });
  const [plannerState, setPlannerState] = useState<PlannerState>({
    goal: 0,
    items: [],
  });
  const [goalInput, setGoalInput] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState<string>(categories[0]);
  const [itemAmount, setItemAmount] = useState("");
  const [itemStatus, setItemStatus] =
    useState<BudgetItemStatus>("angefragt");
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({
    type: "warn",
    label: "Noch nicht verbunden",
    text: "Es wird geprüft, ob ein Nutzer angemeldet ist.",
  });

  const countdown = useMemo(
    () => daysUntil(dashboardProfile.weddingDate),
    [dashboardProfile.weddingDate]
  );

  const planned = useMemo(
    () => getPlannedTotal(plannerState.items),
    [plannerState.items]
  );
  const remaining = plannerState.goal - planned;
  const utilization =
    plannerState.goal > 0 ? Math.round((planned / plannerState.goal) * 100) : 0;
  const progressPercent = Math.max(0, Math.min(utilization, 100));
  const categoryTotals = useMemo(
    () => getCategoryTotals(plannerState.items),
    [plannerState.items]
  );
  const recommendationCategories = useMemo(
    () =>
      getRelevantRecommendationCategories(plannerState.items)
        .filter((category) => category in recommendationRules)
        .slice(0, 6),
    [plannerState.items]
  );

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
      setSaveState({
        type: "warn",
        label: "Wird geladen",
        text: `Angemeldet als ${user.email || user.uid}`,
      });

      try {
        const userDocRef = doc(db, "users", user.uid);
        const budgetDocRef = doc(db, "users", user.uid, "tools", "budgetPlanner");

        const [userSnap, budgetSnap] = await Promise.all([
          getDoc(userDocRef),
          getDoc(budgetDocRef),
        ]);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setDashboardProfile({
            partnerOne: data?.profile?.partnerOne || "",
            partnerTwo: data?.profile?.partnerTwo || "",
            weddingDate: data?.profile?.weddingDate || "",
          });
        }

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
        } else {
          setPlannerState({ goal: 0, items: [] });
          setGoalInput("");
        }

        setIsInitialized(true);
        setSaveState({
          type: "ok",
          label: "Verbunden",
          text: `Budget wird für ${user.email || user.uid} gespeichert.`,
        });
      } catch (error) {
        console.error("Fehler beim Laden des Budgets:", error);
        setSaveState({
          type: "err",
          label: "Fehler",
          text: "Budget konnte nicht aus Firebase geladen werden.",
        });
      } finally {
        setAuthLoading(false);
        setPageLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

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

    const limitedTotals = categoryTotals.slice(0, 6);
    const shownTotal = limitedTotals.reduce((sum, entry) => sum + entry.total, 0);
    const otherTotal = planned - shownTotal;
    const chartData: { category: string; total: number }[] = [...limitedTotals];

    if (otherTotal > 0) {
      chartData.push({ category: "Weitere", total: otherTotal });
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    const innerRadius = 58;
    let startAngle = -Math.PI / 2;

    chartData.forEach((entry, index) => {
      const slice = (entry.total / planned) * Math.PI * 2;
      const endAngle = startAngle + slice;
      const color = chartColors[index % chartColors.length];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      startAngle = endAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    ctx.fillStyle = "#7b6c60";
    ctx.font = "700 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Verplant", centerX, centerY - 10);

    ctx.fillStyle = "#2f241d";
    ctx.font = "700 20px Arial";
    ctx.fillText(formatCompactEuro(planned), centerX, centerY + 18);
  }, [categoryTotals, planned]);

  useEffect(() => {
    if (!currentUser) return;
    if (!isInitialized) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState({
          type: "warn",
          label: "Speichert ...",
          text: `Budget wird für ${currentUser.email || currentUser.uid} aktualisiert.`,
        });

        const budgetDocRef = doc(db, "users", currentUser.uid, "tools", "budgetPlanner");

        await setDoc(
          budgetDocRef,
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

        setSaveState({
          type: "ok",
          label: "Gespeichert",
          text: `Zuletzt aktualisiert für ${currentUser.email || currentUser.uid}.`,
        });
      } catch (error) {
        console.error("Fehler beim Speichern:", error);
        setSaveState({
          type: "err",
          label: "Speicherfehler",
          text: "Änderungen konnten nicht gespeichert werden.",
        });
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [plannerState, currentUser, isInitialized]);

  const warnings = useMemo(() => {
    const entries: {
      cls: "good" | "warn" | "err";
      title: string;
      text: string;
    }[] = [];

    if (plannerState.goal <= 0) {
      entries.push({
        cls: "warn",
        title: "Gesamtbudget fehlt",
        text: "Legt zuerst euer Gesamtbudget fest, damit Empfehlungen und Warnungen richtig funktionieren.",
      });
    }

    if (plannerState.goal > 0 && remaining < 0) {
      entries.push({
        cls: "err",
        title: "Budget überschritten",
        text: `Ihr liegt aktuell ${formatEuro(Math.abs(remaining))} über eurem Gesamtbudget.`,
      });
    } else if (
      plannerState.goal > 0 &&
      remaining / plannerState.goal <= 0.15
    ) {
      entries.push({
        cls: "warn",
        title: "Reserve wird knapp",
        text: `Es sind nur noch ${formatEuro(Math.max(remaining, 0))} frei. Plant jetzt besonders vorsichtig.`,
      });
    } else if (plannerState.goal > 0) {
      entries.push({
        cls: "good",
        title: "Budget im grünen Bereich",
        text: `Aktuell stehen noch ${formatEuro(remaining)} zur Verfügung.`,
      });
    }

    const paidCount = plannerState.items.filter(
      (item) => normalizeStatus(item.status) === "bezahlt"
    ).length;
    const bookedCount = plannerState.items.filter(
      (item) => normalizeStatus(item.status) === "gebucht"
    ).length;
    const requestedCount = plannerState.items.filter(
      (item) => normalizeStatus(item.status) === "angefragt"
    ).length;

    entries.push({
      cls: bookedCount > 0 || paidCount > 0 ? "good" : "warn",
      title: "Status-Überblick",
      text: `${requestedCount} angefragt, ${bookedCount} gebucht, ${paidCount} bezahlt.`,
    });

    const heavyCategory = categoryTotals[0];
    if (heavyCategory && planned > 0) {
      const share = Math.round((heavyCategory.total / planned) * 100);
      entries.push({
        cls: share >= 45 ? "warn" : "good",
        title: "Größter Kostenblock",
        text: `${heavyCategory.category} macht aktuell ${share}% des verplanten Budgets aus.`,
      });
    }

    return entries;
  }, [plannerState.goal, plannerState.items, remaining, categoryTotals, planned]);

  const budgetBadge = useMemo(() => {
    if (plannerState.goal <= 0) {
      return {
        cls: "orange",
        label: "Noch kein Budget gesetzt",
        hint: "Legt zuerst euer Gesamtbudget fest.",
        gradient: "linear-gradient(90deg, #d97706, #f7c97d)",
      };
    }

    if (remaining < 0) {
      return {
        cls: "red",
        label: "Budget überschritten",
        hint: `${formatEuro(Math.abs(remaining))} über dem geplanten Budget.`,
        gradient: "linear-gradient(90deg, #bf5d4f, #f1a09a)",
      };
    }

    if (utilization >= 85) {
      return {
        cls: "orange",
        label: "Fast ausgeschöpft",
        hint: `${formatEuro(remaining)} sind aktuell noch verfügbar.`,
        gradient: "linear-gradient(90deg, #d97706, #f7c97d)",
      };
    }

    return {
      cls: "green",
      label: "Alles im Rahmen",
      hint: `${formatEuro(remaining)} stehen aktuell noch zur Verfügung.`,
      gradient: "linear-gradient(90deg, #2f8f4e, #91d2a7)",
    };
  }, [plannerState.goal, remaining, utilization]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  function handleSaveGoal() {
    const goal = Number(goalInput || 0);

    if (goal < 0) {
      window.alert("Bitte ein gültiges Gesamtbudget eingeben.");
      return;
    }

    setPlannerState((current) => ({
      ...current,
      goal,
    }));
  }

  function handleAddItem() {
    const name = String(itemName || "").trim();
    const category = String(itemCategory || "").trim();
    const amount = Number(itemAmount || 0);
    const status = String(itemStatus || "angefragt");

    if (!name) {
      window.alert("Bitte eine Bezeichnung eingeben.");
      return;
    }

    if (!category) {
      window.alert("Bitte eine Kategorie auswählen.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("Bitte einen gültigen Betrag eingeben.");
      return;
    }

    setPlannerState((current) => ({
      ...current,
      items: [
        {
          id: createId(),
          name,
          category,
          amount,
          status: normalizeStatus(status),
        },
        ...current.items,
      ],
    }));

    setItemName("");
    setItemAmount("");
    setItemStatus("angefragt");
  }

  function handleLoadSample() {
    const sampleState: PlannerState = {
      goal: 25000,
      items: [
        {
          id: createId(),
          name: "Location Schlossgarten",
          category: "Location & Miete",
          amount: 6500,
          status: "gebucht",
        },
        {
          id: createId(),
          name: "Catering Genusswerk",
          category: "Catering & Getränke",
          amount: 7200,
          status: "angefragt",
        },
        {
          id: createId(),
          name: "DJ Sven",
          category: "DJ & Musik",
          amount: 1600,
          status: "gebucht",
        },
        {
          id: createId(),
          name: "Fotograf",
          category: "Foto & Video",
          amount: 2200,
          status: "angefragt",
        },
        {
          id: createId(),
          name: "Floristik",
          category: "Deko & Floristik",
          amount: 1400,
          status: "bezahlt",
        },
        {
          id: createId(),
          name: "Brautkleid",
          category: "Brautmode",
          amount: 1800,
          status: "gebucht",
        },
        {
          id: createId(),
          name: "Anzug",
          category: "Bräutigammode",
          amount: 700,
          status: "gebucht",
        },
        {
          id: createId(),
          name: "Papeterie",
          category: "Trauung & Papeterie",
          amount: 700,
          status: "bezahlt",
        },
      ],
    };

    setPlannerState(sampleState);
    setGoalInput(String(sampleState.goal));
  }

  async function handleCopy() {
    const text = buildExportText(plannerState);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      window.alert("Budget wurde in die Zwischenablage kopiert.");
    } catch (error) {
      console.error(error);
      window.alert("Kopieren war leider nicht möglich.");
    }
  }

  function handleReset() {
    const confirmReset = window.confirm(
      "Möchtet ihr wirklich alle Budgetdaten löschen?"
    );
    if (!confirmReset) return;

    setPlannerState({ goal: 0, items: [] });
    setGoalInput("");
    setItemName("");
    setItemAmount("");
    setItemStatus("angefragt");
    setItemCategory(categories[0]);
  }

  function removeItem(id: string) {
    setPlannerState((current) => ({
      ...current,
      items: current.items.filter((entry) => entry.id !== id),
    }));
  }

  if (authLoading || pageLoading) {
    return (
      <main className="min-h-screen bg-[#f5efe8] p-6 text-stone-900">
        <div className="mx-auto max-w-[1380px] rounded-[32px] border border-stone-200 bg-white p-6">
          Budgetplaner wird geladen ...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5efe8] text-stone-900">
      <div className="mx-auto max-w-[1380px] px-4 py-4 md:px-6 md:py-6">
        <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
            <div className="flex h-full flex-col rounded-[34px] border border-stone-200 bg-[#fbf7f2] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Marryplan</div>
                  <div className="text-sm text-stone-500">Wedding Dashboard</div>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <MinimalNavItem
                  href="/dashboard"
                  label="Übersicht"
                  icon={LayoutDashboard}
                />
                <MinimalNavItem
                  href="/dashboard/budget"
                  label="Budgetplaner"
                  icon={PiggyBank}
                  active
                />
                <MinimalNavItem
                  href="/dashboard/sitzplan"
                  label="Sitzplan"
                  icon={Users}
                />
                <MinimalNavItem href="/dashboard" label="Musik" icon={Music4} />
                <MinimalNavItem
                  href="/dashboard"
                  label="Dokumente"
                  icon={FolderOpen}
                />
              </div>

              <div className="mt-8 rounded-[28px] bg-stone-900 p-5 text-white">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">
                  Überblick
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight">
                  {countdown === null ? "Kein Datum" : `${countdown} Tage`}
                </div>
                <div className="mt-2 text-sm text-white/70">
                  Hochzeit am {formatWeddingDate(dashboardProfile.weddingDate)}
                </div>
                <div className="mt-6 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-[#d9b38c]"
                    style={{
                      width: `${Math.max(0, Math.min(utilization, 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-white/70">
                  {utilization}% Budget genutzt
                </div>
              </div>

              <div className="mt-auto pt-6">
                <div className="mb-4 text-sm text-stone-500">
                  {auth.currentUser?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  <LogOut className="h-4 w-4" />
                  Ausloggen
                </button>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[40px] border border-stone-200 bg-[linear-gradient(135deg,rgba(233,154,108,.18),rgba(255,255,255,.96))] p-7 shadow-[0_18px_45px_rgba(53,35,23,.10)] md:p-10">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                <div>
                  <span className="inline-flex rounded-full border border-[rgba(233,154,108,.35)] bg-white px-3 py-2 text-[12px] font-extrabold uppercase tracking-[.04em] text-[#c97748]">
                    Wedding Hub Tool
                  </span>
                  <h1 className="mt-4 text-[clamp(28px,4vw,50px)] font-semibold leading-[1.05]">
                    Budgetplaner für eure Hochzeit
                  </h1>
                  <p className="mt-4 max-w-[700px] text-[15px] leading-7 text-stone-600">
                    Plant euer Hochzeitsbudget klar, professionell und ohne
                    Überraschungen. Das Budget wird automatisch in Firebase
                    gespeichert und steht eurem Brautpaar-Account auf allen
                    Geräten zur Verfügung.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-[22px] border border-stone-200 bg-white/90 p-[18px] shadow-[0_10px_24px_rgba(53,35,23,.08)]">
                    <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                      Auslastung
                    </div>
                    <div className="text-[30px] font-black text-[#c97748]">
                      {utilization}%
                    </div>
                    <div className="mt-1 text-[13px] leading-5 text-stone-500">
                      Euer Budgetstatus in Echtzeit
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-stone-200 bg-white/90 p-[18px] shadow-[0_10px_24px_rgba(53,35,23,.08)]">
                    <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                      Speicherstatus
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-[14px] py-[10px] text-[13px] font-extrabold ${
                        saveState.type === "ok"
                          ? "border-[rgba(47,143,78,.22)] bg-[#f3fff7] text-[#2f8f4e]"
                          : saveState.type === "err"
                            ? "border-[rgba(191,93,79,.22)] bg-[#fff4f2] text-[#bf5d4f]"
                            : "border-[rgba(217,119,6,.22)] bg-[#fff8ef] text-[#d97706]"
                      }`}
                    >
                      {saveState.label}
                    </div>
                    <div className="mt-2 text-[13px] leading-5 text-stone-500">
                      {saveState.text}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,.82fr)]">
              <SoftBlock className="p-6 shadow-[0_10px_24px_rgba(53,35,23,.08)]">
                <h2 className="text-[22px] font-semibold">Budgetübersicht</h2>
                <div className="mt-2 text-sm leading-6 text-stone-500">
                  Legt zuerst euer Gesamtbudget fest und ergänzt danach eure
                  einzelnen Ausgaben.
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                  <label className="flex min-w-0 flex-col gap-2">
                    <span className="text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                      Gesamtbudget in Euro
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={goalInput}
                      onChange={(event) => setGoalInput(event.target.value)}
                      placeholder="z. B. 20000"
                      className="w-full rounded-[14px] border border-stone-200 bg-white px-4 py-3 outline-none ring-0 focus:border-[#e99a6c] focus:shadow-[0_0_0_4px_rgba(233,154,108,.15)]"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    className="rounded-[14px] bg-[linear-gradient(135deg,#e99a6c,#f2b28e)] px-4 py-3 font-extrabold text-white shadow-[0_10px_24px_rgba(201,119,72,.24)]"
                  >
                    Budget speichern
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="rounded-[14px] border border-stone-200 bg-white px-4 py-3 font-extrabold text-stone-900"
                  >
                    Beispielbudget laden
                  </button>
                </div>

                <div className="mt-[18px] grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[18px] border border-stone-200 bg-[#fffaf6] p-4">
                    <div className="text-[12px] font-bold uppercase tracking-[.04em] text-stone-500">
                      Gesamtbudget
                    </div>
                    <div className="mt-2 break-words text-[clamp(20px,2.2vw,28px)] font-extrabold leading-none">
                      {formatEuro(plannerState.goal)}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-stone-500">
                      Euer gesetzter Budgetrahmen
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-stone-200 bg-[#fffaf6] p-4">
                    <div className="text-[12px] font-bold uppercase tracking-[.04em] text-stone-500">
                      Verplant
                    </div>
                    <div className="mt-2 break-words text-[clamp(20px,2.2vw,28px)] font-extrabold leading-none">
                      {formatEuro(planned)}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-stone-500">
                      Summe aller eingetragenen Positionen
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-stone-200 bg-[#fffaf6] p-4">
                    <div className="text-[12px] font-bold uppercase tracking-[.04em] text-stone-500">
                      Verfügbar
                    </div>
                    <div
                      className={`mt-2 break-words text-[clamp(20px,2.2vw,28px)] font-extrabold leading-none ${
                        remaining < 0
                          ? "text-[#bf5d4f]"
                          : plannerState.goal > 0 &&
                              remaining / plannerState.goal <= 0.15
                            ? "text-[#d97706]"
                            : "text-[#2f8f4e]"
                      }`}
                    >
                      {formatEuro(remaining)}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-stone-500">
                      Noch frei für weitere Planung
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-stone-200 bg-[#fffaf6] p-4">
                    <div className="text-[12px] font-bold uppercase tracking-[.04em] text-stone-500">
                      Positionen
                    </div>
                    <div className="mt-2 break-words text-[clamp(20px,2.2vw,28px)] font-extrabold leading-none">
                      {plannerState.items.length}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-stone-500">
                      Aktuell gespeicherte Einträge
                    </div>
                  </div>
                </div>

                <div className="mt-[18px] rounded-[20px] border border-stone-200 bg-[linear-gradient(180deg,#fff,#fff8f3)] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <strong>{utilization}% genutzt</strong>
                    <span
                      className={`inline-flex rounded-full border px-[14px] py-[10px] text-[13px] font-extrabold ${
                        budgetBadge.cls === "green"
                          ? "border-[rgba(47,143,78,.2)] bg-[#f3fff7] text-[#2f8f4e]"
                          : budgetBadge.cls === "red"
                            ? "border-[rgba(191,93,79,.2)] bg-[#fff4f2] text-[#bf5d4f]"
                            : "border-[rgba(217,119,6,.2)] bg-[#fff8ef] text-[#d97706]"
                      }`}
                    >
                      {budgetBadge.label}
                    </span>
                  </div>

                  <div className="h-4 overflow-hidden rounded-full bg-[#f0e7de]">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${progressPercent}%`,
                        background: budgetBadge.gradient,
                      }}
                    />
                  </div>

                  <div className="mt-[10px] text-xs leading-5 text-stone-500">
                    {budgetBadge.hint}
                  </div>
                </div>

                <h2 className="mt-7 text-[22px] font-semibold">
                  Kostenpunkt hinzufügen
                </h2>
                <div className="mt-2 text-sm leading-6 text-stone-500">
                  Ergänzt einzelne Ausgaben wie DJ, Catering, Fotografie, Deko
                  oder Location.
                </div>

                <div className="mt-[18px] rounded-[20px] border border-stone-200 bg-[linear-gradient(180deg,#fff,#fffaf6)] p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="flex min-w-0 flex-col gap-2">
                      <span className="text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                        Bezeichnung
                      </span>
                      <input
                        value={itemName}
                        onChange={(event) => setItemName(event.target.value)}
                        type="text"
                        placeholder="z. B. DJ Sven"
                        className="w-full rounded-[14px] border border-stone-200 bg-white px-4 py-3 outline-none focus:border-[#e99a6c] focus:shadow-[0_0_0_4px_rgba(233,154,108,.15)]"
                      />
                    </label>

                    <label className="flex min-w-0 flex-col gap-2">
                      <span className="text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                        Kategorie
                      </span>
                      <select
                        value={itemCategory}
                        onChange={(event) => setItemCategory(event.target.value)}
                        className="w-full rounded-[14px] border border-stone-200 bg-white px-4 py-3 outline-none focus:border-[#e99a6c] focus:shadow-[0_0_0_4px_rgba(233,154,108,.15)]"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex min-w-0 flex-col gap-2">
                      <span className="text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                        Betrag in Euro
                      </span>
                      <input
                        value={itemAmount}
                        onChange={(event) => setItemAmount(event.target.value)}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="z. B. 1500"
                        className="w-full rounded-[14px] border border-stone-200 bg-white px-4 py-3 outline-none focus:border-[#e99a6c] focus:shadow-[0_0_0_4px_rgba(233,154,108,.15)]"
                      />
                    </label>

                    <label className="flex min-w-0 flex-col gap-2">
                      <span className="text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
                        Status
                      </span>
                      <select
                        value={itemStatus}
                        onChange={(event) =>
                          setItemStatus(normalizeStatus(event.target.value))
                        }
                        className="w-full rounded-[14px] border border-stone-200 bg-white px-4 py-3 outline-none focus:border-[#e99a6c] focus:shadow-[0_0_0_4px_rgba(233,154,108,.15)]"
                      >
                        <option value="angefragt">Angefragt</option>
                        <option value="gebucht">Gebucht</option>
                        <option value="bezahlt">Bezahlt</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex justify-start max-sm:justify-stretch">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="min-h-[54px] min-w-[220px] rounded-[16px] bg-[linear-gradient(135deg,#e99a6c,#f2b28e)] px-6 py-4 text-base font-extrabold text-white shadow-[0_10px_24px_rgba(201,119,72,.24)] max-sm:w-full max-sm:min-w-0"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 max-sm:flex-col">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-[14px] border border-stone-200 bg-white px-4 py-3 font-extrabold text-stone-900 max-sm:w-full"
                  >
                    Budget kopieren
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-[14px] border border-[rgba(191,93,79,.22)] bg-[#fff3f1] px-4 py-3 font-extrabold text-[#bf5d4f] max-sm:w-full"
                  >
                    Alles zurücksetzen
                  </button>
                </div>

                {plannerState.items.length === 0 ? (
                  <div className="mt-[18px] rounded-[18px] border border-dashed border-stone-200 bg-[#fffdfb] px-6 py-5 text-center leading-7 text-stone-500">
                    Noch keine Budget-Positionen vorhanden. Startet mit eurem
                    ersten Eintrag.
                  </div>
                ) : null}

                <div className="mt-[18px] grid gap-3">
                  {plannerState.items.map((item) => {
                    const share =
                      planned > 0 ? Math.round((item.amount / planned) * 100) : 0;

                    return (
                      <div
                        key={item.id}
                        className="grid items-center gap-3 rounded-[18px] border border-stone-200 bg-white p-[14px] xl:grid-cols-[1.1fr_.7fr_.65fr_.6fr_auto]"
                      >
                        <div>
                          <div className="font-extrabold text-stone-900">
                            {item.name}
                          </div>
                          <div className="mt-1 text-[13px] leading-5 text-stone-500">
                            {item.category}
                          </div>
                        </div>

                        <div className="text-left text-[13px] text-stone-500 xl:text-right">
                          Anteil am verplanten Budget
                          <br />
                          <strong>{share}%</strong>
                        </div>

                        <div className="text-left text-[20px] font-black text-[#c97748] xl:text-right">
                          {formatEuro(item.amount)}
                        </div>

                        <div>
                          <span
                            className={`inline-flex min-w-[112px] items-center justify-center rounded-full border px-3 py-2 text-xs font-extrabold ${
                              item.status === "bezahlt"
                                ? "border-[rgba(47,143,78,.22)] bg-[#f3fff7] text-[#2f8f4e]"
                                : item.status === "gebucht"
                                  ? "border-[rgba(217,119,6,.22)] bg-[#fff8ef] text-[#d97706]"
                                  : "border-[rgba(110,127,216,.22)] bg-[#f5f7ff] text-[#6e7fd8]"
                            }`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="rounded-[14px] border border-[rgba(191,93,79,.22)] bg-[#fff3f1] px-4 py-3 font-extrabold text-[#bf5d4f]"
                        >
                          Entfernen
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-[18px] text-xs leading-5 text-stone-500">
                  Die Daten werden automatisch in Firebase Firestore gespeichert,
                  sobald ein Nutzer in der Wedding Hub eingeloggt ist.
                </div>
              </SoftBlock>

              <div className="flex min-w-0 flex-col gap-6">
                <SoftBlock className="p-6 shadow-[0_10px_24px_rgba(53,35,23,.08)]">
                  <h2 className="text-[22px] font-semibold">Budget-Hinweise</h2>
                  <div className="mt-2 text-sm leading-6 text-stone-500">
                    Automatische Hinweise helfen euch, Risiken schneller zu
                    erkennen.
                  </div>

                  <div className="mt-4 grid gap-3">
                    {warnings.map((entry, index) => (
                      <div
                        key={`${entry.title}-${index}`}
                        className={`rounded-[16px] border p-[14px] ${
                          entry.cls === "good"
                            ? "border-[rgba(47,143,78,.22)] bg-[#f3fff7]"
                            : entry.cls === "err"
                              ? "border-[rgba(191,93,79,.22)] bg-[#fff4f2]"
                              : "border-[rgba(217,119,6,.22)] bg-[#fff8ef]"
                        }`}
                      >
                        <strong>{entry.title}</strong>
                        <div className="mt-1 text-[13px] leading-6 text-stone-500">
                          {entry.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </SoftBlock>

                <SoftBlock className="p-6 shadow-[0_10px_24px_rgba(53,35,23,.08)]">
                  <h2 className="text-[22px] font-semibold">
                    Empfohlenes Budget
                  </h2>
                  <div className="mt-2 text-sm leading-6 text-stone-500">
                    Der Planer zeigt euch pro Kategorie einen sinnvollen Rahmen
                    auf Basis eures Gesamtbudgets.
                  </div>

                  {plannerState.goal <= 0 ? (
                    <div className="mt-4 rounded-[18px] border border-dashed border-stone-200 bg-[#fffdfb] px-6 py-5 text-center leading-7 text-stone-500">
                      Sobald ein Gesamtbudget gesetzt ist, erscheinen hier eure
                      empfohlenen Budgetrahmen.
                    </div>
                  ) : recommendationCategories.length === 0 ? (
                    <div className="mt-4 rounded-[18px] border border-dashed border-stone-200 bg-[#fffdfb] px-6 py-5 text-center leading-7 text-stone-500">
                      Für die vorhandenen Kategorien sind aktuell keine
                      Budgetempfehlungen hinterlegt.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {recommendationCategories.map((category) => {
                        const rule = recommendationRules[category];
                        const spent = plannerState.items
                          .filter((item) => item.category === category)
                          .reduce((sum, item) => sum + item.amount, 0);

                        const minValue = Math.round(
                          plannerState.goal * (rule.min / 100)
                        );
                        const maxValue = Math.round(
                          plannerState.goal * (rule.max / 100)
                        );

                        let statusClass = "good";
                        let statusText = "Im empfohlenen Rahmen";

                        if (spent === 0) {
                          statusClass = "low";
                          statusText = "Noch nichts eingeplant";
                        } else if (spent < minValue) {
                          statusClass = "low";
                          statusText = "Unter dem empfohlenen Rahmen";
                        } else if (spent > maxValue) {
                          statusClass = "high";
                          statusText = "Über dem empfohlenen Rahmen";
                        }

                        return (
                          <div
                            key={category}
                            className="rounded-[16px] border border-stone-200 bg-[#fffaf6] p-[14px]"
                          >
                            <div className="flex items-start justify-between gap-3 font-extrabold">
                              <span>{category}</span>
                              <span>{formatEuro(spent)}</span>
                            </div>
                            <div className="mt-1 text-[13px] leading-6 text-stone-500">
                              Empfohlen: {formatEuro(minValue)} bis{" "}
                              {formatEuro(maxValue)}
                            </div>
                            <div
                              className={`mt-3 inline-flex rounded-full border px-3 py-2 text-xs font-extrabold ${
                                statusClass === "good"
                                  ? "border-[rgba(47,143,78,.22)] bg-[#f3fff7] text-[#2f8f4e]"
                                  : statusClass === "high"
                                    ? "border-[rgba(191,93,79,.22)] bg-[#fff4f2] text-[#bf5d4f]"
                                    : "border-[rgba(217,119,6,.22)] bg-[#fff8ef] text-[#d97706]"
                              }`}
                            >
                              {statusText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SoftBlock>
              </div>
            </section>

            <SoftBlock className="p-6 shadow-[0_10px_24px_rgba(53,35,23,.08)]">
              <h2 className="text-[22px] font-semibold">Budget-Diagramm</h2>
              <div className="mt-2 text-sm leading-6 text-stone-500">
                So seht ihr auf einen Blick, welche Kategorien aktuell den
                größten Anteil an eurem Budget haben.
              </div>

              <div className="mt-4 grid gap-6 xl:grid-cols-[320px_1fr] xl:items-center">
                <div className="flex min-h-[280px] items-center justify-center max-xl:min-h-0">
                  <canvas
                    ref={chartRef}
                    width={280}
                    height={280}
                    className="h-[280px] w-[280px] max-w-full max-sm:h-[220px] max-sm:w-[220px]"
                  />
                </div>

                {!categoryTotals.length || planned <= 0 ? (
                  <div className="rounded-[18px] border border-dashed border-stone-200 bg-[#fffdfb] px-6 py-5 text-center leading-7 text-stone-500">
                    Sobald ihr Positionen erfasst, erscheint hier euer Diagramm.
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-3">
                    {(() => {
                      const limitedTotals = categoryTotals.slice(0, 6);
                      const shownTotal = limitedTotals.reduce(
                        (sum, entry) => sum + entry.total,
                        0
                      );
                      const otherTotal = planned - shownTotal;
                      const chartData: { category: string; total: number }[] = [
                        ...limitedTotals,
                      ];

                      if (otherTotal > 0) {
                        chartData.push({ category: "Weitere", total: otherTotal });
                      }

                      return chartData.map((entry, index) => {
                        const color = chartColors[index % chartColors.length];

                        return (
                          <div
                            key={entry.category}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-[14px] border border-stone-200 bg-white px-3 py-[10px]"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ background: color }}
                              />
                              <span className="truncate text-[13px] font-bold text-stone-900">
                                {entry.category}
                              </span>
                            </div>
                            <div className="text-right text-[13px] font-bold text-stone-500">
                              {formatEuro(entry.total)} ·{" "}
                              {Math.round((entry.total / planned) * 100)}%
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </SoftBlock>

            <SoftBlock className="p-6 shadow-[0_10px_24px_rgba(53,35,23,.08)]">
              <h2 className="text-[22px] font-semibold">
                Kategorien-Auswertung
              </h2>
              <div className="mt-2 text-sm leading-6 text-stone-500">
                So erkennt ihr sofort, welche Bereiche aktuell den größten
                Anteil am Budget haben.
              </div>

              {categoryTotals.length === 0 ? (
                <div className="mt-4 rounded-[18px] border border-dashed border-stone-200 bg-[#fffdfb] px-6 py-5 text-center leading-7 text-stone-500">
                  Sobald ihr Positionen erfasst, erscheint hier eure
                  Kategorien-Auswertung.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {categoryTotals.slice(0, 6).map((entry) => {
                    const share =
                      planned > 0 ? Math.round((entry.total / planned) * 100) : 0;

                    return (
                      <div
                        key={entry.category}
                        className="rounded-[16px] border border-stone-200 bg-[#fffaf6] p-[14px]"
                      >
                        <div className="flex items-start justify-between gap-3 font-extrabold">
                          <span>{entry.category}</span>
                          <span>{formatEuro(entry.total)}</span>
                        </div>
                        <div className="mt-1 text-[13px] leading-6 text-stone-500">
                          {share}% des aktuell verplanten Budgets
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SoftBlock>

            <div className="flex items-center justify-between gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-3 text-sm text-stone-700 transition hover:bg-stone-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Zur Übersicht
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}