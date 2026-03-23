"use client";

import { useState } from "react";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const getErrorMessage = (error: any) => {
    switch (error?.code) {
      case "auth/invalid-email":
        return "Bitte gib eine gültige E-Mail-Adresse ein.";
      case "auth/email-already-in-use":
        return "Diese E-Mail ist bereits registriert.";
      case "auth/weak-password":
        return "Passwort sollte mindestens 6 Zeichen haben.";
      case "auth/too-many-requests":
        return "Zu viele Versuche. Bitte probiere es später erneut.";
      default:
        return "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      setAuthMessage("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        profile: {
          partnerOne: "",
          partnerTwo: "",
          weddingDate: "",
          guestCount: "",
          location: "",
          notes: "",
        },
        createdAt: new Date().toISOString(),
      });

      await sendEmailVerification(userCredential.user);

      setAuthMessage(
        "Konto erstellt. Bitte bestätige jetzt deine E-Mail-Adresse."
      );
      setEmail("");
      setPassword("");
    } catch (error: any) {
      setAuthMessage(getErrorMessage(error));
    }
  };

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">
            Marryplan
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-stone-900">
            Startet eure Hochzeitsplanung digital
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-stone-600">
            Erstellt euer Konto und organisiert Profil, Budget, Aufgaben,
            Dokumente und Musik an einem Ort.
          </p>
        </div>

        <div className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-900">
            Registrieren
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Erstellt euer Marryplan Konto.
          </p>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <input
  type="email"
  placeholder="E-Mail"
  autoComplete="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
/>

<input
  type="password"
  placeholder="Passwort"
  autoComplete="new-password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
/>
            <button className="w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white">
              Konto erstellen
            </button>
          </form>

          {authMessage && (
            <p className="mt-4 text-sm text-stone-600">{authMessage}</p>
          )}

          <p className="mt-6 text-sm text-stone-600">
            Bereits registriert?{" "}
            <Link href="/login" className="font-medium text-stone-900 underline">
              Zum Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}