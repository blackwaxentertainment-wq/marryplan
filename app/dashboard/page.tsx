"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { storage } from "../lib/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  PiggyBank,
  Users,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

type ProfileType = {
  partnerOne: string;
  partnerTwo: string;
  weddingDate: string;
  guestCount: string;
  location: string;
  notes: string;
};

type TodoType = {
  id: number;
  text: string;
  done: boolean;
};

type MusicType = {
  mustPlay: string;
  noGo: string;
  spotify: string;
};

type DocumentType = {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
};

// ─── Konstanten ───────────────────────────────────────────────────────────────

const starterTodos: TodoType[] = [
  { id: 1, text: "Hochzeitsprofil anlegen", done: true },
  { id: 2, text: "Budgetrahmen festlegen", done: false },
  { id: 3, text: "Gästeliste grob erfassen", done: false },
  { id: 4, text: "Musikwünsche vorbereiten", done: false },
  { id: 5, text: "wichtige Dokumente hochladen", done: false },
];

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

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

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

// ─── Design-Bausteine ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-400">
      {children}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-stone-100 bg-white shadow-[0_2px_16px_0_rgba(0,0,0,0.05)] ${className}`}
    >
      {children}
    </div>
  );
}

function StatChip({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ElementType;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-100 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          {label}
        </span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-stone-400">{sub}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 transition focus:border-stone-400 focus:bg-white focus:outline-none";

const textareaCls =
  "w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 transition focus:border-stone-400 focus:bg-white focus:outline-none";

// ─── Hauptkomponente ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileType>({
    partnerOne: "",
    partnerTwo: "",
    weddingDate: "",
    guestCount: "",
    location: "",
    notes: "",
  });
  const [todos, setTodos] = useState<TodoType[]>(starterTodos);
  const [music, setMusic] = useState<MusicType>({
    mustPlay: "",
    noGo: "",
    spotify: "",
  });

  const [saveMessage, setSaveMessage] = useState("");
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const countdown = useMemo(() => daysUntil(profile.weddingDate), [profile.weddingDate]);
  const completedTodos = todos.filter((t) => t.done).length;
  const openTodos = todos.filter((t) => !t.done);
  const progress = todos.length ? Math.round((completedTodos / todos.length) * 100) : 0;

  // ─── Auth & Daten laden ───────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.emailVerified) {
        setCurrentUser(null);
        setAuthLoading(false);
        router.push("/login");
        return;
      }
      setCurrentUser(user);
      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.profile)
            setProfile({
              partnerOne: "",
              partnerTwo: "",
              weddingDate: "",
              guestCount: "",
              location: "",
              notes: "",
              ...data.profile,
            });
          if (data.todos) setTodos(data.todos);
          if (data.music)
            setMusic({ mustPlay: "", noGo: "", spotify: "", ...data.music });
          const docsSnap = await getDocs(
            query(
              collection(db, "users", user.uid, "documents"),
              orderBy("createdAt", "desc")
            )
          );
          setDocuments(
            docsSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<DocumentType, "id">),
            }))
          );
        }
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      } finally {
        setAuthLoading(false);
        setInitialDataLoaded(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ─── Auto-Save ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !initialDataLoaded || !currentUser) return;
    const t = setTimeout(async () => {
      try {
        setSaveMessage("Speichert…");
        await setDoc(
          doc(db, "users", currentUser.uid),
          { profile, todos, music, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setSaveMessage("Gespeichert");
      } catch {
        setSaveMessage("Speichern fehlgeschlagen");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [profile, todos, music, authLoading, currentUser, initialDataLoaded]);

  useEffect(() => {
    if (!saveMessage) return;
    const t = setTimeout(() => setSaveMessage(""), 2500);
    return () => clearTimeout(t);
  }, [saveMessage]);

  // ─── Dokument-Handler ─────────────────────────────────────────────────────

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(e.target.files || []));
    setUploadMessage("");
  };

  const handleUploadDocuments = async () => {
    if (!currentUser || selectedFiles.length === 0) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      let uploaded = 0;
      for (const file of selectedFiles) {
        const filePath = `documents/${currentUser.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file);
          task.on(
            "state_changed",
            (snap) =>
              setUploadProgress(
                Math.round(
                  ((uploaded + snap.bytesTransferred / snap.totalBytes) /
                    selectedFiles.length) *
                    100
                )
              ),
            reject,
            async () => {
              try {
                const url = await getDownloadURL(task.snapshot.ref);
                const docRef = await addDoc(
                  collection(db, "users", currentUser.uid, "documents"),
                  {
                    name: file.name,
                    url,
                    path: filePath,
                    size: file.size,
                    contentType: file.type || "application/octet-stream",
                    createdAt: serverTimestamp(),
                  }
                );
                setDocuments((c) => [
                  {
                    id: docRef.id,
                    name: file.name,
                    url,
                    path: filePath,
                    size: file.size,
                    contentType: file.type || "application/octet-stream",
                  },
                  ...c,
                ]);
                uploaded++;
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      }
      setUploadMessage("Erfolgreich hochgeladen.");
      setSelectedFiles([]);
      setUploadProgress(100);
    } catch {
      setUploadMessage("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 700);
    }
  };

  const handleDeleteDocument = async (item: DocumentType) => {
    if (!currentUser || !window.confirm("Datei wirklich löschen?")) return;
    try {
      await deleteObject(ref(storage, item.path));
      await deleteDoc(
        doc(db, "users", currentUser.uid, "documents", item.id)
      );
      setDocuments((c) => c.filter((d) => d.id !== item.id));
    } catch {
      setUploadMessage("Löschen fehlgeschlagen.");
    }
  };

  // ─── Lade-Zustand ─────────────────────────────────────────────────────────

  if (authLoading) {
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
        <div className="grid lg:grid-cols-[1fr_480px]">

          {/* Textseite */}
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#fdfaf6] via-white to-[#f9f5f0] p-8 md:p-12 xl:p-14">
            <div>
              <SectionLabel>Wedding Dashboard</SectionLabel>
              <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-stone-900 md:text-6xl xl:text-7xl">
                {profile.partnerOne || "Eure"}
                {profile.partnerTwo ? (
                  <>
                    <br />
                    <span className="text-[#b08d6a]">&amp; {profile.partnerTwo}</span>
                  </>
                ) : (
                  <span className="text-[#b08d6a]"> Hochzeit</span>
                )}
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-stone-400">
                Alle Details auf einen Blick — entspannt und klar organisiert.
              </p>
            </div>

            {/* Quickstats */}
            <div className="mt-10 flex flex-wrap gap-8 border-t border-stone-100 pt-8">
              {[
                { label: "Datum", value: formatWeddingDate(profile.weddingDate) },
                { label: "Gäste", value: profile.guestCount || "—" },
                {
                  label: "Nächster Schritt",
                  value: openTodos[0]?.text || "Alles erledigt",
                },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                    {s.label}
                  </div>
                  <div className="mt-1.5 text-base font-semibold text-stone-800">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {saveMessage && (
              <div className="mt-5 text-xs text-stone-400">{saveMessage}</div>
            )}
          </div>

          {/* Bildseite */}
          <div className="relative min-h-[380px] lg:min-h-full">
            <img
              src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80"
              alt="Wedding inspiration"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Premium Planning
              </div>
              <div className="mt-2 text-xl font-semibold leading-snug tracking-tight">
                Klarer Überblick statt Chaos
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatChip
          label="Countdown"
          value={countdown === null ? "—" : `${countdown} Tage`}
          sub={`Hochzeit am ${formatWeddingDate(profile.weddingDate)}`}
          icon={CalendarDays}
        />
        <StatChip
          label="Fortschritt"
          value={`${progress} %`}
          sub={`${completedTodos} von ${todos.length} erledigt`}
          icon={CheckCircle2}
        />
        <StatChip
          label="Offene Aufgaben"
          value={`${openTodos.length}`}
          sub={openTodos[0]?.text || "Alles Wichtige erledigt"}
        />
      </div>

      {/* ── PLANUNGSSTAND + PROFIL ───────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[0.65fr_1.35fr] items-stretch">

        {/* Planungsstand */}
        <Card className="flex flex-col justify-between p-7 md:p-8">
          <div>
            <SectionLabel>Planungsstand</SectionLabel>
            <div className="mt-8 text-6xl font-semibold tracking-tight text-stone-900">
              {progress}
              <span className="text-3xl text-stone-300">%</span>
            </div>
            <p className="mt-2 text-sm text-stone-400">
              {completedTodos} von {todos.length} Aufgaben erledigt
            </p>
          </div>

          {/* Fortschrittsbalken */}
          <div className="mt-8">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-stone-800 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Mini-Chips */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                <CalendarDays className="h-3.5 w-3.5" />
                Countdown
              </div>
              <div className="mt-2 text-xl font-semibold text-stone-800">
                {countdown === null ? "—" : `${countdown}d`}
              </div>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Offen
              </div>
              <div className="mt-2 text-xl font-semibold text-stone-800">
                {openTodos.length}
              </div>
            </div>
          </div>
        </Card>

        {/* Profil */}
        <Card className="overflow-hidden">
          <div className="grid h-full md:grid-cols-[280px_1fr]">
            <div className="relative hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=800&q=80"
                alt="Couple"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="p-7 md:p-8">
              <SectionLabel>Euer Profil</SectionLabel>
              <div className="mt-6 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Partner 1">
                    <input
                      value={profile.partnerOne}
                      onChange={(e) =>
                        setProfile((c) => ({ ...c, partnerOne: e.target.value }))
                      }
                      className={inputCls}
                      placeholder="Name"
                    />
                  </Field>
                  <Field label="Partner 2">
                    <input
                      value={profile.partnerTwo}
                      onChange={(e) =>
                        setProfile((c) => ({ ...c, partnerTwo: e.target.value }))
                      }
                      className={inputCls}
                      placeholder="Name"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Hochzeitsdatum">
                    <input
                      type="date"
                      value={profile.weddingDate}
                      onChange={(e) =>
                        setProfile((c) => ({ ...c, weddingDate: e.target.value }))
                      }
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Gästezahl">
                    <input
                      value={profile.guestCount}
                      onChange={(e) =>
                        setProfile((c) => ({ ...c, guestCount: e.target.value }))
                      }
                      className={inputCls}
                      placeholder="z. B. 80"
                    />
                  </Field>
                </div>
                <Field label="Location">
                  <input
                    value={profile.location}
                    onChange={(e) =>
                      setProfile((c) => ({ ...c, location: e.target.value }))
                    }
                    className={inputCls}
                    placeholder="Name oder Ort der Location"
                  />
                </Field>
                <Field label="Notizen">
                  <textarea
                    value={profile.notes}
                    onChange={(e) =>
                      setProfile((c) => ({ ...c, notes: e.target.value }))
                    }
                    className={`${textareaCls} min-h-[100px]`}
                    placeholder="Wichtige Infos, Wünsche oder offene Gedanken …"
                  />
                </Field>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ── TOOLS: Budget / Sitzplan / Dokumente ─────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-3 items-stretch">

        {/* Budget */}
        <Card className="group flex flex-col p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm transition group-hover:scale-105 group-hover:shadow-md">
            <PiggyBank className="h-5 w-5" />
          </div>
          <div className="mt-5">
            <SectionLabel>Tool</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">Budgetplaner</div>
          </div>
          <p className="mt-3 flex-1 text-sm leading-7 text-stone-400">
            Budgetrahmen, offene Kosten und Prioritäten übersichtlich organisieren.
          </p>
          <Link
            href="/dashboard/budget"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 transition-all hover:gap-3 hover:text-stone-900"
          >
            Öffnen <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* Sitzplan */}
        <Card className="group flex flex-col p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm transition group-hover:scale-105 group-hover:shadow-md">
            <Users className="h-5 w-5" />
          </div>
          <div className="mt-5">
            <SectionLabel>Tool</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">Sitzplan</div>
          </div>
          <p className="mt-3 flex-1 text-sm leading-7 text-stone-400">
            Gäste, Tische und Gruppen strukturiert verwalten — ohne Überladen der Startseite.
          </p>
          <Link
            href="/dashboard/sitzplan"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 transition-all hover:gap-3 hover:text-stone-900"
          >
            Öffnen <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* Dokumente */}
        <Card className="flex flex-col p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div className="mt-5">
            <SectionLabel>Tool</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">Dokumente</div>
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-400">
            Ablaufplan, Location-Infos und wichtige Unterlagen griffbereit.
          </p>

          {/* Upload-Bereich */}
          <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5">
            <div className="flex flex-col gap-3">
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFilesSelected}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500 file:mr-3 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              <button
                type="button"
                onClick={handleUploadDocuments}
                disabled={uploading || selectedFiles.length === 0}
                className="w-full rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? "Lädt hoch…" : "Upload starten"}
              </button>
            </div>

            {uploadProgress > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full bg-stone-800 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-stone-400">
                  {uploadProgress}%
                </span>
              </div>
            )}

            {uploadMessage && (
              <div className="mt-2 text-xs text-stone-500">{uploadMessage}</div>
            )}
          </div>

          {/* Dateiliste */}
          <div className="mt-5 flex-1 space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Hochgeladen
            </div>
            {documents.length === 0 ? (
              <div className="text-xs italic text-stone-300">
                Noch keine Dateien vorhanden.
              </div>
            ) : (
              documents.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-stone-800">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-stone-400">
                      {formatFileSize(item.size)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 hover:underline"
                    >
                      Öffnen
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(item)}
                      className="text-[11px] font-semibold text-red-400 hover:text-red-600 hover:underline"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      {/* ── TODOS + MUSIK ─────────────────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-2 items-start">

        {/* To-do Liste */}
        <Card className="p-7 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <SectionLabel>Aufgaben</SectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                To-do Liste
              </h2>
            </div>
            <div className="rounded-full border border-stone-100 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-400">
              {completedTodos}/{todos.length}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {todos.map((item) => (
              <label
                key={item.id}
                className={`flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 transition ${
                  item.done
                    ? "border-stone-100 bg-stone-50"
                    : "border-stone-100 bg-white hover:bg-stone-50 hover:shadow-sm"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    setTodos((c) =>
                      c.map((t) =>
                        t.id === item.id ? { ...t, done: !t.done } : t
                      )
                    )
                  }
                  className="h-4 w-4 accent-stone-900"
                />
                <span
                  className={`text-sm ${
                    item.done
                      ? "text-stone-300 line-through"
                      : "text-stone-700"
                  }`}
                >
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </Card>

        {/* Musik */}
        <Card className="p-7 md:p-8">
          <SectionLabel>Musik</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
            Spotify &amp; Musikwünsche
          </h2>

          <div className="mt-6 space-y-5">
            <Field label="Must Play">
              <textarea
                value={music.mustPlay}
                onChange={(e) =>
                  setMusic((c) => ({ ...c, mustPlay: e.target.value }))
                }
                className={`${textareaCls} min-h-[100px]`}
                placeholder="Songs, Momente oder Stimmungen, die unbedingt gespielt werden sollen"
              />
            </Field>
            <Field label="No Go">
              <textarea
                value={music.noGo}
                onChange={(e) =>
                  setMusic((c) => ({ ...c, noGo: e.target.value }))
                }
                className={`${textareaCls} min-h-[100px]`}
                placeholder="Lieder, Genres oder Vibes, die vermieden werden sollen"
              />
            </Field>
            <Field label="Spotify Playlist">
              <input
                value={music.spotify}
                onChange={(e) =>
                  setMusic((c) => ({ ...c, spotify: e.target.value }))
                }
                className={inputCls}
                placeholder="Spotify Playlist Link"
              />
            </Field>
          </div>
        </Card>
      </section>
    </div>
  );
}