"use client";

import { useEffect, useState, type ReactNode } from "react";
import { auth, db, storage } from "../../lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { FileText, UploadCloud } from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────

type DocumentType = {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
};

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

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

// ─── Hauptkomponente ───────────────────────────────────────────────────────────

export default function DokumentePage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  // ─── Auth & Daten laden ───────────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.emailVerified) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }
      setCurrentUser(user);
      try {
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
      } catch (err) {
        console.error("Fehler beim Laden der Dokumente:", err);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ─── Upload-Handler ───────────────────────────────────────────────────────

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
      await deleteDoc(doc(db, "users", currentUser.uid, "documents", item.id));
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
        <div className="grid lg:grid-cols-[1fr_380px]">

          {/* Textseite */}
          <div className="flex flex-col justify-between bg-gradient-to-br from-[#fdfaf6] via-white to-[#f9f5f0] p-8 md:p-12 xl:p-14">
            <div>
              <SectionLabel>Wedding Hub · Tool</SectionLabel>
              <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-stone-900 md:text-6xl">
                Eure
                <br />
                <span className="text-[#b08d6a]">Dokumente</span>
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-7 text-stone-400">
                Verträge, Ablaufpläne und wichtige Unterlagen — immer griffbereit an einem Ort.
              </p>
            </div>

            {/* Stat */}
            <div className="mt-10 flex flex-wrap gap-8 border-t border-stone-100 pt-8">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Hochgeladen
                </div>
                <div className="mt-1.5 text-3xl font-semibold tracking-tight text-stone-900">
                  {documents.length}
                  <span className="ml-1 text-base text-stone-300">
                    {documents.length === 1 ? "Datei" : "Dateien"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bildseite */}
          <div className="relative hidden min-h-[320px] lg:block">
            <img
              src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
              alt="Dokumente"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
              <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
                Alles an einem Ort
              </div>
              <div className="mt-2 text-lg font-semibold leading-snug tracking-tight">
                Kein Suchen mehr in Mails & Ordnern
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── UPLOAD + LISTE ───────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr] items-start">

        {/* Upload-Card */}
        <Card className="p-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-sm">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="mt-5">
            <SectionLabel>Upload</SectionLabel>
            <div className="mt-1.5 text-xl font-semibold text-stone-900">
              Dokument hinzufügen
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-stone-400">
            PDF, Word, JPG oder PNG — nach dem Upload sofort in der Liste verfügbar.
          </p>

          <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5">
            <div className="flex flex-col gap-3">
              <input
                type="file"
                multiple
                accept="application/pdf,.pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFilesSelected}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500 file:mr-3 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />

              {selectedFiles.length > 0 && (
                <div className="space-y-1">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-stone-500">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                      <span className="truncate">{f.name}</span>
                      <span className="ml-auto shrink-0 text-stone-300">
                        {formatFileSize(f.size)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
              <div className="mt-3 text-xs text-stone-500">{uploadMessage}</div>
            )}
          </div>
        </Card>

        {/* Dokumenten-Liste */}
        <Card className="p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <SectionLabel>Bibliothek</SectionLabel>
              <div className="mt-1.5 text-xl font-semibold text-stone-900">
                Hochgeladene Dokumente
              </div>
            </div>
            <div className="rounded-full border border-stone-100 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-400">
              {documents.length} {documents.length === 1 ? "Datei" : "Dateien"}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 py-14 text-center">
                <FileText className="h-8 w-8 text-stone-300" />
                <div className="mt-3 text-sm font-semibold text-stone-400">
                  Noch keine Dokumente vorhanden
                </div>
                <div className="mt-1 text-xs text-stone-300">
                  Lade links dein erstes Dokument hoch
                </div>
              </div>
            ) : (
              documents.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition group-hover:bg-stone-900 group-hover:text-white">
                    <FileText className="h-4 w-4" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-stone-800">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-stone-400">
                      {[item.contentType, formatFileSize(item.size)]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-[11px] font-semibold text-stone-600 transition hover:border-stone-300 hover:bg-white hover:text-stone-900"
                    >
                      Öffnen
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(item)}
                      className="rounded-lg border border-transparent px-3 py-1.5 text-[11px] font-semibold text-red-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}