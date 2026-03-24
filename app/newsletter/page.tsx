"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Mail, Gift, Clock3, ShieldCheck, ArrowRight } from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  serverTimestamp,
} from "firebase/firestore";

const TOTAL_SPOTS = 50;

export default function MarryPlanNewsletterPage() {
  const [email, setEmail] = useState("");
  const [names, setNames] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [takenSpots, setTakenSpots] = useState(0);

  const remainingSpots = Math.max(TOTAL_SPOTS - takenSpots, 0);
  const progress = useMemo(
    () => Math.round((takenSpots / TOTAL_SPOTS) * 100),
    [takenSpots]
  );

  useEffect(() => {
    const fetchEarlyAccessCount = async () => {
      try {
        const signupQuery = query(collection(db, "earlyAccess"));
        const snapshot = await getDocs(signupQuery);
        setTakenSpots(snapshot.size);
      } catch (error) {
        console.error("Fehler beim Laden der Early-Access-Anmeldungen:", error);
      }
    };

    fetchEarlyAccessCount();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !names) return;

    try {
      setLoading(true);
      setSubmitMessage("");

      await addDoc(collection(db, "earlyAccess"), {
        email,
        names,
        weddingDate,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      setTakenSpots((current) => current + 1);
      setEmail("");
      setNames("");
      setWeddingDate("");
      setSubmitMessage("Ihr seid jetzt auf der Early-Access-Liste.");
    } catch (error) {
      console.error("Fehler beim Speichern der Early-Access-Anmeldung:", error);
      setSubmitMessage("Die Anmeldung hat leider nicht funktioniert.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5efe8] text-stone-900">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 sm:py-6">
        <section className="overflow-hidden rounded-[36px] border border-stone-200 bg-white">
          <div className="grid min-h-[78vh] gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-between p-7 md:p-10 xl:p-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f8f2eb] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-stone-600">
                  <Heart className="h-4 w-4" />
                  MarryPlan Early Access
                </div>

                <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] md:text-6xl">
                  Sichert euch jetzt einen der limitierten Plätze vor dem offiziellen Start.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-8 text-stone-600 md:text-lg">
                  Die MarryPlan hilft euch, eure Hochzeit entspannt und strukturiert zu planen.
                  Alle wichtigen Infos, Aufgaben und Erinnerungen sind an einem Ort. Kein Chaos aus Chats, Mails und Notizen mehr, sondern klare Übersicht und volle Kontrolle.
                  Damit ihr euch auf das konzentrieren könnt, was wirklich zählt.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[24px] bg-[#f8f3ed] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                      <Mail className="h-4 w-4" />
                      Early Access
                    </div>
                    <div className="mt-3 text-sm leading-6 text-stone-600">
                      Vorrangiger Zugang vor dem offiziellen Launch.
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-[#f8f3ed] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                      <Gift className="h-4 w-4" />
                      Spezialpreis
                    </div>
                    <div className="mt-3 text-sm leading-6 text-stone-600">
                      Die ersten 50 Paare erhalten den MarryPlan Zugang vergünstigt.
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-[#f8f3ed] p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                      <ShieldCheck className="h-4 w-4" />
                      Verlosung 🎁🎉
                    </div>
                    <div className="mt-3 text-sm leading-6 text-stone-600">
                      3 Brautpaare gewinnen kostenlosen Zugang der MarryPlan.
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-stone-200 bg-[#fcfaf7] p-6">
                  <div className="text-sm font-semibold text-stone-900">
                    Was die MarryPlan besonders macht
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] bg-white p-4 text-sm leading-6 text-stone-600">
                      <span className="font-semibold text-stone-900">Alles zentral an einem Ort:</span>{" "}
                      To-do Liste, Hochzeitskosten-Rechner, Sitzplan Generator, Musikplanung und Persönliche Dokumente in einer
                      klaren Oberfläche.
                    </div>
                    <div className="rounded-[20px] bg-white p-4 text-sm leading-6 text-stone-600">
                      <span className="font-semibold text-stone-900">Weniger Stress:</span>{" "}
                      Ihr behaltet alle wichtigen Details im Blick, ohne in Chats, Notizen
                      und Excel zu versinken.
                    </div>
                    <div className="rounded-[20px] bg-white p-4 text-sm leading-6 text-stone-600">
                      <span className="font-semibold text-stone-900">Mehr Überblick:</span>{" "}
                      Ihr seht sofort, was noch offen ist und wie weit eure Planung ist.
                    </div>
                    <div className="rounded-[20px] bg-white p-4 text-sm leading-6 text-stone-600">
                      <span className="font-semibold text-stone-900">Erinnerungen inklusive:</span>{" "}
                      Das Audio- und Foto-Gästebuch machen die MarryPlan emotional einzigartig.
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-stone-200 bg-white p-6">
                  <div className="text-sm font-semibold text-stone-900">
                    Was alles in der MarryPlan enthalten ist
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-stone-600">• Intelligentes Dashboard mit Überblick</div>
                    <div className="text-sm text-stone-600">• To-do Liste für eure komplette Planung</div>
                    <div className="text-sm text-stone-600">• Hochzeitskosten-Rechner</div>
                    <div className="text-sm text-stone-600">• Sitzplan Generator</div>
                    <div className="text-sm text-stone-600">• Musikplanung & Spotify Integration</div>
                    <div className="text-sm text-stone-600">• Dokumenten-Upload für Verträge und Angebote</div>
                    <div className="text-sm text-stone-600">• Audio Gästebuch für Sprachnachrichten</div>
                    <div className="text-sm text-stone-600">• Foto Gästebuch mit Foto-Aufgaben</div>
                    <div className="text-sm text-stone-600">• Fortschrittsanzeige eurer Planung</div>
                    <div className="text-sm text-stone-600">• Alles mobil und jederzeit verfügbar</div>
                  </div>
                </div>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-stone-500">Regulärer Preis</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">79€</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500">Early Access</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">limitiert</div>
                </div>
                <div>
                  <div className="text-sm text-stone-500">Status</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">
                    {takenSpots} / {TOTAL_SPOTS}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex items-center bg-[#fbf7f2] p-5 md:p-8 xl:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,154,108,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(121,104,73,0.08),transparent_28%)]" />

              <div className="relative z-10 w-full rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
                <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-stone-500">
                  Nur noch wenige Plätze frei
                </div>

                <div className="mt-4 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                      {remainingSpots}
                    </div>
                    <div className="mt-1 text-sm text-stone-600">
                      von {TOTAL_SPOTS} Early-Access-Plätzen frei
                    </div>
                  </div>

                  <div className="rounded-full bg-[#f8f3ed] px-4 py-2 text-sm font-medium text-stone-700">
                    {progress}% vergeben
                  </div>
                </div>

                <div className="mt-5 h-2 rounded-full bg-stone-200">
                  <div
                    className="h-2 rounded-full bg-stone-900 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-6 rounded-[24px] bg-[#f8f3ed] p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
                    <Clock3 className="h-4 w-4" />
                    Für Early Access registrieren
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Trag dich jetzt ein und sichere dir die Chance auf einen
                    vergünstigten Zugang und einen Platz in der Verlosung.
                  </p>
                </div>

                {submitted ? (
                  <div className="mt-6 rounded-[24px] border border-[#d9b38c] bg-[#fff8f2] p-5">
                    <div className="text-lg font-semibold text-stone-900">
                      Danke, ihr seid auf der Warteliste.
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Sobald MarryPlan startet, bekommt ihr alle Infos zuerst per Mail.
                    </p>
                    {submitMessage ? (
                      <div className="mt-3 text-sm text-stone-600">{submitMessage}</div>
                    ) : null}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        Namen des Brautpaars
                      </label>
                      <input
                        value={names}
                        onChange={(event) => setNames(event.target.value)}
                        className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                        placeholder="Zum Beispiel Lisa & Daniel"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        E-Mail Adresse
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                        placeholder="eure@email.de"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-stone-700">
                        Hochzeitsdatum
                      </label>
                      <input
                        type="date"
                        value={weddingDate}
                        onChange={(event) => setWeddingDate(event.target.value)}
                        className="w-full rounded-[20px] border border-stone-300 bg-[#fcfaf7] px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-300"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-stone-900 px-5 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {loading ? "Wird eingetragen..." : "Jetzt Early Access sichern"}
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="text-xs leading-5 text-stone-500">
                      Mit der Anmeldung sichert ihr euch die Chance auf einen
                      vergünstigten Startpreis. Unter allen Early-Access-Anmeldungen
                      verlosen wir 3 kostenlose Zugänge.
                    </p>

                    {submitMessage ? (
                      <div className="text-sm text-stone-600">{submitMessage}</div>
                    ) : null}
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}