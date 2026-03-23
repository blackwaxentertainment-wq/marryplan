"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  FolderOpen,
  Heart,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MapPin,
  Mic2,
  Music4,
  Pencil,
  PiggyBank,
  Users,
} from "lucide-react";

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

const starterTodos: TodoType[] = [
  { id: 1, text: "Hochzeitsprofil anlegen", done: true },
  { id: 2, text: "Budgetrahmen festlegen", done: false },
  { id: 3, text: "Gästeliste grob erfassen", done: false },
  { id: 4, text: "Musikwünsche vorbereiten", done: false },
  { id: 5, text: "wichtige Dokumente hochladen", done: false },
];

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
  icon: React.ElementType;
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

function SectionLabel({ children }: { children: React.ReactNode }) {
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[32px] border border-stone-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

function StatLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-stone-200 py-4 last:border-b-0">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-medium text-stone-900">{value}</div>
    </div>
  );
}

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

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const countdown = useMemo(() => daysUntil(profile.weddingDate), [profile.weddingDate]);
  const completedTodos = todos.filter((item) => item.done).length;
  const openTodos = todos.filter((item) => !item.done);
  const progress = todos.length ? Math.round((completedTodos / todos.length) * 100) : 0;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.emailVerified) {
  setCurrentUser(null);
  router.push("/login");
  return;
}

setCurrentUser(user);

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));

        if (snapshot.exists()) {
          const data = snapshot.data();

          if (data.profile) {
            setProfile({
              partnerOne: data.profile.partnerOne || "",
              partnerTwo: data.profile.partnerTwo || "",
              weddingDate: data.profile.weddingDate || "",
              guestCount: data.profile.guestCount || "",
              location: data.profile.location || "",
              notes: data.profile.notes || "",
            });
          }

          if (data.todos) {
            setTodos(data.todos);
          }

          if (data.music) {
            setMusic({
              mustPlay: data.music.mustPlay || "",
              noGo: data.music.noGo || "",
              spotify: data.music.spotify || "",
            });
          }
        }
      } catch (error) {
        console.error("Fehler beim Laden des Dashboards:", error);
    } finally {
  setAuthLoading(false);
  setInitialDataLoaded(true);
}
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

// 👉 AUTO SAVE HIER EINFÜGEN
useEffect(() => {
  if (authLoading) return;
  if (!initialDataLoaded) return;
  if (!currentUser) return;

  const timeout = setTimeout(async () => {
    try {
      setSaveMessage("Speichert...");

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          profile,
          todos,
          music,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaveMessage("Automatisch gespeichert");
    } catch (error) {
      console.error("Auto Save Fehler:", error);
      setSaveMessage("Automatisches Speichern fehlgeschlagen");
    }
  }, 800);

  return () => clearTimeout(timeout);
}, [profile, todos, music, authLoading, currentUser, initialDataLoaded]);

   if (authLoading) {
    return (
      <main className="min-h-screen bg-[#f5efe8] p-6 text-stone-900">
        <div className="mx-auto max-w-[1380px] rounded-[32px] border border-stone-200 bg-white p-6">
          Dashboard wird geladen...
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
                <MinimalNavItem href="/dashboard" label="Übersicht" icon={LayoutDashboard} active />
                <MinimalNavItem href="/dashboard/budget" label="Budgetplaner" icon={PiggyBank} />
                <MinimalNavItem href="/dashboard/sitzplan" label="Sitzplan" icon={Users} />
                <MinimalNavItem href="/dashboard" label="Musik" icon={Music4} />
                <MinimalNavItem href="/dashboard" label="Dokumente" icon={FolderOpen} />
              </div>

              <div className="mt-8 rounded-[28px] bg-stone-900 p-5 text-white">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">
                  Überblick
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight">
                  {countdown === null ? "Kein Datum" : `${countdown} Tage`}
                </div>
                <div className="mt-2 text-sm text-white/70">
                  Hochzeit am {formatWeddingDate(profile.weddingDate)}
                </div>
                <div className="mt-6 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-[#d9b38c]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-white/70">{progress}% erledigt</div>
              </div>

              <div className="mt-auto pt-6">
                <div className="mb-4 text-sm text-stone-500">{auth.currentUser?.email}</div>
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
            <section className="overflow-hidden rounded-[40px] border border-stone-200 bg-white">
              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="flex flex-col justify-between p-7 md:p-10 xl:p-12">
                  <div className="flex items-start justify-between gap-4">

  {/* LINKS */}
  <div>
    <SectionLabel>Wedding Dashboard</SectionLabel>

    <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-6xl">
      {profile.partnerOne || "Eure Hochzeit"}
      {profile.partnerTwo ? ` & ${profile.partnerTwo}` : ""}
    </h1>

    <p className="mt-5 max-w-lg text-base leading-8 text-stone-600 md:text-lg">
      Alle wichtigen Bereiche in einer ruhigen, klaren Startseite statt in einer zugepflasterten Dashboard-Ansicht.
    </p>
  </div>

</div>

{/* 👉 HIER DIREKT DRUNTER */}
{saveMessage && (
  <div className="mt-4 text-sm text-stone-600">
    {saveMessage}
  </div>
)}

                  <div className="mt-10 grid gap-6 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-stone-500">Datum</div>
                      <div className="mt-1 text-xl font-medium">{formatWeddingDate(profile.weddingDate)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-stone-500">Gäste</div>
                      <div className="mt-1 text-xl font-medium">{profile.guestCount || "noch offen"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-stone-500">Nächster Schritt</div>
                      <div className="mt-1 text-xl font-medium">
                        {openTodos[0]?.text || "Alles Wichtige erledigt"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative min-h-[420px] lg:min-h-full">
                  <img
                    src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80"
                    alt="Wedding inspiration"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/70">
                      Premium Planning
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight">
                      Klarer Überblick statt Karten-Chaos
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <SoftBlock className="p-6 md:p-7">
                <SectionLabel>Planungsstand</SectionLabel>
                <div className="mt-6 grid gap-6 md:grid-cols-2 items-center">
                  <div>
                    <div className="text-3xl font-semibold md:text-4xl">
                      {progress}%
                    </div>
                    <p className="mt-3 text-base leading-7 text-stone-600">
                      {completedTodos} von {todos.length} Aufgaben erledigt.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="mb-3 h-2 rounded-full bg-stone-200">
                        <div
                          className="h-2 rounded-full bg-stone-900 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[20px] bg-[#f8f3ed] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                          <CalendarDays className="h-4 w-4" />
                          Countdown
                        </div>
                        <div className="mt-3 text-2xl font-semibold">
                          {countdown === null ? "Kein Datum" : `${countdown} Tage`}
                        </div>
                      </div>
                      <div className="rounded-[20px] bg-[#f8f3ed] p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Offen
                        </div>
                        <div className="mt-3 text-2xl font-semibold">{openTodos.length} Aufgaben</div>
                      </div>
                    </div>
                  </div>
                </div>
              </SoftBlock>

              <SoftBlock className="overflow-hidden">
                <div className="grid h-full md:grid-cols-[0.95fr_1.05fr]">
                  <div className="min-h-[260px] md:min-h-full">
                    <img
                      src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80"
                      alt="Couple"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-7 md:p-8">
  <SectionLabel>Profil</SectionLabel>

  <div className="mt-6 grid gap-4">
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Partner 1
        </label>
        <input
          value={profile.partnerOne}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              partnerOne: event.target.value,
            }))
          }
          className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          placeholder="Name von Partner 1"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Partner 2
        </label>
        <input
          value={profile.partnerTwo}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              partnerTwo: event.target.value,
            }))
          }
          className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          placeholder="Name von Partner 2"
        />
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Hochzeitsdatum
        </label>
        <input
          type="date"
          value={profile.weddingDate}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              weddingDate: event.target.value,
            }))
          }
          className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Gästezahl
        </label>
        <input
          value={profile.guestCount}
          onChange={(event) =>
            setProfile((current) => ({
              ...current,
              guestCount: event.target.value,
            }))
          }
          className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
          placeholder="Zum Beispiel 80"
        />
      </div>
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium text-stone-700">
        Location
      </label>
      <input
        value={profile.location}
        onChange={(event) =>
          setProfile((current) => ({
            ...current,
            location: event.target.value,
          }))
        }
        className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        placeholder="Name oder Ort der Location"
      />
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium text-stone-700">
        Notizen
      </label>
      <textarea
        value={profile.notes}
        onChange={(event) =>
          setProfile((current) => ({
            ...current,
            notes: event.target.value,
          }))
        }
        className="min-h-[120px] w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
        placeholder="Wichtige Infos, Wünsche oder offene Gedanken"
      />
    </div>
  </div>
</div>
                </div>
              </SoftBlock>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <SoftBlock className="p-7 md:p-8 xl:p-10">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <SectionLabel>Aufgaben</SectionLabel>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                      To do Liste
                    </h2>
                  </div>
                  <Link
                    href="/dashboard"
                    className="hidden rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 transition hover:bg-stone-100 md:inline-flex"
                  >
                    Bereich öffnen
                  </Link>
                </div>

                <div className="mt-8 space-y-3">
                  {todos.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-4 rounded-[24px] border border-stone-200 px-5 py-4 transition hover:bg-stone-50"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          setTodos((current) =>
                            current.map((todo) =>
                              todo.id === item.id ? { ...todo, done: !todo.done } : todo
                            )
                          )
                        }
                        className="h-4 w-4 accent-stone-900"
                      />
                      <span className={item.done ? "text-stone-400 line-through" : "text-stone-800"}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </SoftBlock>

              <SoftBlock className="p-7 md:p-8 xl:p-10">
                <SectionLabel>Musik</SectionLabel>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                  Spotify & Musikwünsche
                </h2>

                <div className="mt-8 space-y-5">
                  <div>
                    <div className="mb-2 text-sm font-medium text-stone-700">Must Play</div>
                    <textarea
                      value={music.mustPlay}
                      onChange={(event) =>
                        setMusic((current) => ({
                          ...current,
                          mustPlay: event.target.value,
                        }))
                      }
                      className="min-h-[110px] w-full rounded-[24px] border border-stone-300 bg-[#fcfaf7] px-4 py-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                      placeholder="Songs, Momente oder Stimmungen, die unbedingt gespielt werden sollen"
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-stone-700">No Go</div>
                    <textarea
                      value={music.noGo}
                      onChange={(event) =>
                        setMusic((current) => ({
                          ...current,
                          noGo: event.target.value,
                        }))
                      }
                      className="min-h-[110px] w-full rounded-[24px] border border-stone-300 bg-[#fcfaf7] px-4 py-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                      placeholder="Lieder, Genres oder Vibes, die vermieden werden sollen"
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-stone-700">Spotify Playlist</div>
                    <input
                      value={music.spotify}
                      onChange={(event) =>
                        setMusic((current) => ({
                          ...current,
                          spotify: event.target.value,
                        }))
                      }
                      className="w-full rounded-[24px] border border-stone-300 bg-[#fcfaf7] px-4 py-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                      placeholder="Spotify Playlist Link"
                    />
                  </div>
                </div>
              </SoftBlock>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <SoftBlock className="p-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-stone-100 p-3 text-stone-800">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                  <div>
                    <SectionLabel>Tool</SectionLabel>
                    <div className="mt-1 text-xl font-semibold">Budgetplaner</div>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-stone-600">
                  Budgetrahmen, offene Kosten und Prioritäten in einem eigenen Bereich organisieren.
                </p>
                <Link
                  href="/dashboard/budget"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-stone-900"
                >
                  Öffnen <ArrowRight className="h-4 w-4" />
                </Link>
              </SoftBlock>

              <SoftBlock className="p-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-stone-100 p-3 text-stone-800">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <SectionLabel>Tool</SectionLabel>
                    <div className="mt-1 text-xl font-semibold">Sitzplan</div>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-stone-600">
                  Gäste, Tische und Gruppen strukturiert verwalten, ohne dass es die Startseite überlädt.
                </p>
                <Link
                  href="/dashboard/sitzplan"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-stone-900"
                >
                  Öffnen <ArrowRight className="h-4 w-4" />
                </Link>
              </SoftBlock>

              <SoftBlock className="p-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-stone-100 p-3 text-stone-800">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <SectionLabel>Tool</SectionLabel>
                    <div className="mt-1 text-xl font-semibold">Dokumente</div>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-stone-600">
                  Angebote, Ablaufpläne und Unterlagen zentral sammeln. Später mit echtem Upload-Bereich erweitern.
                </p>
                <div className="mt-6 rounded-[22px] border border-dashed border-stone-300 p-4 text-sm text-stone-500">
                  Dokumenten-Upload folgt mit Firebase Storage.
                </div>
              </SoftBlock>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
