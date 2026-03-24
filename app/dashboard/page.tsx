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
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  FolderOpen,
  Heart,
  LayoutDashboard,
  LogOut,
  Music4,
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

type DocumentType = {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
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

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
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

export default function DashboardPage() {
  const router = useRouter();

  const [hideSidebar, setHideSidebar] = useState(false);
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

          const docsQuery = query(
            collection(db, "users", user.uid, "documents"),
            orderBy("createdAt", "desc")
          );

          const docsSnapshot = await getDocs(docsQuery);

          setDocuments(
            docsSnapshot.docs.map((docItem) => ({
              id: docItem.id,
              ...(docItem.data() as Omit<DocumentType, "id">),
            }))
          );
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

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setUploadMessage("");
  };

  const handleUploadDocuments = async () => {
    if (!currentUser || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadMessage("");

      let uploadedCount = 0;
      const totalFiles = selectedFiles.length;

      for (const file of selectedFiles) {
        const filePath = `documents/${currentUser.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);

        await new Promise<void>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(storageRef, file);

          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const fileProgress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

              const overallProgress =
                ((uploadedCount + fileProgress / 100) / totalFiles) * 100;

              setUploadProgress(Math.round(overallProgress));
            },
            (error) => reject(error),
            async () => {
              try {
                const url = await getDownloadURL(uploadTask.snapshot.ref);

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

                setDocuments((current) => [
                  {
                    id: docRef.id,
                    name: file.name,
                    url,
                    path: filePath,
                    size: file.size,
                    contentType: file.type || "application/octet-stream",
                  },
                  ...current,
                ]);

                uploadedCount += 1;
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      }

      setUploadMessage("Dokument(e) erfolgreich hochgeladen.");
      setSelectedFiles([]);
      setUploadProgress(100);
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      setUploadMessage("Upload fehlgeschlagen.");
    } finally {
      setUploading(false);

      setTimeout(() => {
        setUploadProgress(0);
      }, 700);
    }
  };

  const handleDeleteDocument = async (documentItem: DocumentType) => {
    if (!currentUser) return;

    const ok = window.confirm("Datei wirklich löschen?");
    if (!ok) return;

    try {
      await deleteObject(ref(storage, documentItem.path));
      await deleteDoc(doc(db, "users", currentUser.uid, "documents", documentItem.id));

      setDocuments((current) =>
        current.filter((item) => item.id !== documentItem.id)
      );
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      setUploadMessage("Löschen fehlgeschlagen.");
    }
  };

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

  useEffect(() => {
  let lastScrollY = window.scrollY;

  const handleScroll = () => {
    if (window.scrollY > lastScrollY && window.scrollY > 100) {
      setHideSidebar(true);
    } else {
      setHideSidebar(false);
    }
    lastScrollY = window.scrollY;
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

  useEffect(() => {
    if (!saveMessage) return;

    const timeout = setTimeout(() => {
      setSaveMessage("");
    }, 2500);

    return () => clearTimeout(timeout);
  }, [saveMessage]);

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
      <div
        className="fixed left-0 top-0 z-50 h-full w-10"
        onMouseEnter={() => setHideSidebar(false)}
      />

      <aside
        className={`xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] transition-transform duration-300 ${
          hideSidebar ? "-translate-x-[85%]" : "translate-x-0"
        }`}
      >
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
                    <div>
                      <SectionLabel>Wedding Dashboard</SectionLabel>

                      <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-6xl">
                        {profile.partnerOne || "Eure Hochzeit"}
                        {profile.partnerTwo ? ` & ${profile.partnerTwo}` : ""}
                      </h1>

                      <p className="mt-5 max-w-lg text-base leading-8 text-stone-600 md:text-lg">
                        Behalte alle wichtigen Details eurer Hochzeit entspannt im Blick. ❤️
                      </p>
                    </div>
                  </div>

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

            <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr] items-stretch">
              <SoftBlock className="h-full p-5 md:p-6">
                <SectionLabel>Planungsstand</SectionLabel>

                <div className="mt-4">
                  <div className="h-2 rounded-full bg-stone-200">
                    <div
                      className="h-2 rounded-full bg-stone-900 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-5">
                  <div>
                    <div className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                      {progress}%
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {completedTodos} von {todos.length} Aufgaben erledigt.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] bg-[#f8f3ed] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                        <CalendarDays className="h-4 w-4" />
                        Countdown
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        {countdown === null ? "Kein Datum" : `${countdown} Tage`}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#f8f3ed] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                        <CheckCircle2 className="h-4 w-4" />
                        Offen
                      </div>
                      <div className="mt-2 text-xl font-semibold">
                        {openTodos.length} Aufgaben
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

            <section className="grid gap-6 lg:grid-cols-[0.8fr_0.8fr_1.4fr] items-stretch">
              <SoftBlock className="p-7 h-full">
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

              <SoftBlock className="p-7 h-full">
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

              <SoftBlock className="p-7 h-full">
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
                  Hier könnt ihr weitere Dokumente hochladen, zum Beispiel Ablaufplan,
                  Location-Infos oder wichtige Unterlagen.
                </p>

                <div className="mt-6 border-t border-[#796849]/30 pt-5">
                  <h3 className="text-base font-semibold text-[#796849]">Dokumente hochladen</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Nach dem Upload findet ihr sie sofort unten in euren hochgeladenen Dokumenten.
                  </p>

                  <div className="mt-4 flex flex-col gap-3">
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,.pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFilesSelected}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
                    />

                    <button
                      type="button"
                      onClick={handleUploadDocuments}
                      disabled={uploading || selectedFiles.length === 0}
                      className="w-full rounded-xl bg-[#e99a6c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d8895c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? "Lädt hoch..." : "Upload starten"}
                    </button>
                  </div>

                  {uploadProgress > 0 ? (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full border border-stone-200 bg-[#f2ede6]">
                        <div
                          className="h-full bg-[#796849] transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-xs font-semibold text-stone-500">
                        {uploadProgress}%
                      </div>
                    </div>
                  ) : null}

                  {uploadMessage ? (
                    <div className="mt-3 text-sm text-stone-600">{uploadMessage}</div>
                  ) : null}

                  <div className="mt-5 text-sm font-semibold text-[#796849]">
                    Eure hochgeladenen Dokumente:
                  </div>

                  <div className="mt-3 space-y-2">
                    {documents.length === 0 ? (
                      <div className="text-sm italic text-stone-500">
                        Noch keine Uploads vorhanden.
                      </div>
                    ) : (
                      documents.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-[14px] border border-stone-200 bg-white px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-stone-900">
                              {item.name}
                            </div>
                            <div className="text-xs text-stone-500">
                              {[item.contentType, formatFileSize(item.size)]
                                .filter(Boolean)
                                .join(" | ")}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-[#796849] hover:underline"
                            >
                              Öffnen
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(item)}
                              className="text-sm font-semibold text-red-700 hover:underline"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
          </div>
        </div>
      </div>
    </main>
  );
}