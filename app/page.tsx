import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Heart,
  ListTodo,
  Mic2,
  Camera,
  PiggyBank,
  Sparkles,
  FileText,
  Users,
} from "lucide-react";

const content = {
  heroTitle: "Marryplan",
  heroSubtitle:
    "Euer digitaler Hochzeitsplaner mit klarer Struktur, echten Planungshilfen und Platz für alles Wichtige.",
  faq: [
    {
      q: "Ist Marryplan direkt nach der Registrierung nutzbar?",
      a: "Nach der Registrierung bestätigt ihr zuerst eure E-Mail-Adresse und könnt danach direkt mit eurer Planung starten.",
    },
    {
      q: "Können wir eigene Dokumente hochladen?",
      a: "Ja. Ihr könnt persönliche Unterlagen wie Ablaufplan, Angebote oder Notizen zentral ablegen.",
    },
    {
      q: "Ist der Sitzplan auch für größere Hochzeiten geeignet?",
      a: "Ja. Die Gästeanzahl aus eurem Profil kann als Grundlage für den Sitzplan genutzt werden.",
    },
  ],
  tips: [
    "Plant den groben Tagesablauf früh, damit alle Dienstleister dieselbe Richtung haben.",
    "Legt Must Play und No Go Songs rechtzeitig fest, damit die Party später leichter vorbereitet werden kann.",
    "Pflegt eure Dokumente zentral, damit ihr kurz vor der Hochzeit nicht lange suchen müsst.",
  ],
  products: [
    {
      title: "Audio-Gästebuch",
      text: "Persönliche Sprachnachrichten eurer Gäste als emotionale Erinnerung an euren Tag.",
    },
    {
      title: "Foto-Gästebuch",
      text: "Ein interaktives Extra für spontane Bilder, Erinnerungen und echte Stimmung vom Abend.",
    },
  ],
};

function SectionHeading({
  badge,
  title,
  text,
}: {
  badge?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="max-w-2xl">
      {badge && (
        <div className="inline-flex rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
          {badge}
        </div>
      )}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-900">
        {title}
      </h2>
      {text && (
        <p className="mt-4 text-base leading-7 text-stone-600">{text}</p>
      )}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="inline-flex rounded-2xl bg-stone-100 p-3 text-stone-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-stone-300">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-stone-100 text-stone-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[32px] border border-stone-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold text-stone-900">
                Marryplan
              </div>
              <div className="text-sm text-stone-500">
                Digitaler Hochzeitsplaner
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
            >
              Einloggen
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Jetzt starten
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mb-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[36px] border border-stone-200 bg-white p-8 shadow-sm md:p-10">
            <div className="inline-flex rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
              Wedding Planning SaaS
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-900 md:text-6xl">
              Hochzeit planen.
              <br />
              Klar, modern und gemeinsam.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
              {content.heroSubtitle}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Hochzeitsprofil zentral verwalten",
                "To dos, Budget und Musik an einem Ort",
                "Schneller Start nach Registrierung",
                "Strukturiert statt Zettelchaos",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700"
                >
                  <CheckCircle2 className="h-4 w-4 text-rose-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
              >
                Kostenlos starten
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-2xl bg-stone-100 px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
              >
                Bereits registriert
              </Link>
            </div>
          </div>

          <div className="rounded-[36px] border border-stone-200 bg-stone-900 p-6 text-white shadow-sm md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-stone-300">
                  Live Vorschau
                </div>
                <h2 className="mt-2 text-2xl font-semibold">
                  Euer Planungscockpit
                </h2>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-stone-100">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MiniStat label="Countdown" value="128 Tage" />
              <MiniStat label="Budget" value="12.450 €" />
              <MiniStat label="Aufgaben" value="18 offen" />
              <MiniStat label="Gäste" value="74 geplant" />
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Hochzeitsübersicht</div>
                  <div className="text-sm text-stone-300">
                    Alle wichtigen Daten im Blick
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  "Profil mit Datum, Gästen und Location",
                  "Aufgabenliste mit Fortschritt",
                  "Budgetplanung nach Kategorien",
                  "Musikwünsche und Dokumente zentral",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-stone-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm md:p-10">
          <SectionHeading
            badge="Funktionen"
            title="Alles für eure Planung an einem Ort"
            text="Marryplan bündelt die wichtigsten Bereiche eurer Hochzeitsplanung in einer klaren und modernen Oberfläche."
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <FeatureCard
              icon={Heart}
              title="Hochzeitsprofil"
              text="Partnernamen, Datum, Gästezahl, Location und Notizen sauber hinterlegt."
            />
            <FeatureCard
              icon={ListTodo}
              title="To dos"
              text="Offene Aufgaben festhalten, abhaken und den Überblick behalten."
            />
            <FeatureCard
              icon={PiggyBank}
              title="Budget"
              text="Kosten strukturieren und Budgets nach Kategorien planen."
            />
            <FeatureCard
              icon={FileText}
              title="Dokumente"
              text="Ablaufpläne, Angebote und wichtige Unterlagen zentral sammeln."
            />
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm">
            <SectionHeading
              badge="Planungstipps"
              title="Kleine Dinge mit großer Wirkung"
              text="Diese Tipps helfen euch, ruhiger und strukturierter zu planen."
            />

            <div className="mt-6 space-y-3">
              {content.tips.map((tip) => (
                <div
                  key={tip}
                  className="rounded-2xl bg-stone-50 p-4 text-sm leading-6 text-stone-700"
                >
                  {tip}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm">
            <SectionHeading
              badge="Zusatzprodukte"
              title="Erweiterungen für besondere Erinnerungen"
              text="Neben der Planung könnt ihr auch emotionale Extras rund um euren Hochzeitstag integrieren."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {content.products.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[28px] border border-stone-200 p-5"
                >
                  <div className="inline-flex rounded-2xl bg-stone-100 p-3 text-stone-700">
                    {item.title.includes("Audio") ? (
                      <Mic2 className="h-5 w-5" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm">
          <SectionHeading
            badge="Für Brautpaare gemacht"
            title="Warum Marryplan im Alltag hilft"
            text="Statt Informationen auf WhatsApp, in Notizen, PDFs und Tabellen zu verteilen, bringt ihr alles in eine gemeinsame Struktur."
          />

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <FeatureCard
              icon={Users}
              title="Gemeinsam planen"
              text="Beide behalten denselben Stand und können die Hochzeit zusammen organisieren."
            />
            <FeatureCard
              icon={CalendarDays}
              title="Klarer Überblick"
              text="Datum, Fortschritt und Prioritäten sind sofort sichtbar statt irgendwo versteckt."
            />
            <FeatureCard
              icon={Sparkles}
              title="Mehr Ruhe"
              text="Weniger Chaos, weniger Suchen und mehr Fokus auf die schönen Entscheidungen."
            />
          </div>
        </section>

        <section className="mb-6 rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm">
          <SectionHeading
            badge="FAQ"
            title="Häufige Fragen"
            text="Die wichtigsten Antworten für euren Start mit Marryplan."
          />

          <div className="mt-6 space-y-3">
            {content.faq.map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-stone-200 px-4 py-4"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-stone-800">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-6 text-stone-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-stone-200 bg-stone-900 p-8 text-white shadow-sm md:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-stone-200">
              <Heart className="h-4 w-4" />
              Für eure Hochzeitsplanung
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
              Startet jetzt mit Marryplan
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
              Erstellt euer Konto und organisiert eure Hochzeit digital, klar
              und gemeinsam.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100"
              >
                Registrierung starten
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Zum Login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}