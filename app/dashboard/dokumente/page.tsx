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
import { FileText } from "lucide-react";

type DocumentType = {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
};

function formatFileSize(bytes: number) {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
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

export default function DokumentePage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.emailVerified) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
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
      } catch (error) {
        console.error("Fehler beim Laden der Dokumente:", error);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#f5efe8] p-6 text-stone-900">
        <div className="mx-auto max-w-[1380px] rounded-[32px] border border-stone-200 bg-white p-6">
          Dokumente werden geladen...
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[40px] border border-stone-200 bg-[linear-gradient(135deg,rgba(233,154,108,.18),rgba(255,255,255,.96))] p-7 shadow-[0_18px_45px_rgba(53,35,23,.10)] md:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <span className="inline-flex rounded-full border border-[rgba(233,154,108,.35)] bg-white px-3 py-2 text-[12px] font-extrabold uppercase tracking-[.04em] text-[#c97748]">
              Wedding Hub Tool
            </span>
            <h1 className="mt-4 text-[clamp(28px,4vw,50px)] font-semibold leading-[1.05]">
              Dokumente für eure Hochzeit
            </h1>
            <p className="mt-4 max-w-[700px] text-[15px] leading-7 text-stone-600">
              Ladet wichtige Unterlagen hoch und habt Ablaufpläne, Verträge, PDFs
              und Infos jederzeit griffbereit.
            </p>
          </div>

          <div className="rounded-[22px] border border-stone-200 bg-white/90 p-[18px] shadow-[0_10px_24px_rgba(53,35,23,.08)]">
            <div className="mb-2 text-[12px] font-extrabold uppercase tracking-[.04em] text-stone-500">
              Übersicht
            </div>
            <div className="text-[30px] font-black text-[#c97748]">
              {documents.length}
            </div>
            <div className="mt-1 text-[13px] leading-5 text-stone-500">
              hochgeladene Dokumente
            </div>
          </div>
        </div>
      </section>

      <SoftBlock className="p-7 md:p-8">
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
    </div>
  );
}