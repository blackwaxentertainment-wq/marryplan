"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const getErrorMessage = (error: any) => {
    switch (error?.code) {
      case "auth/invalid-email":
        return "Bitte gib eine gültige E-Mail-Adresse ein.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-Mail oder Passwort ist nicht korrekt.";
      case "auth/too-many-requests":
        return "Zu viele Versuche. Bitte probiere es später erneut.";
      default:
        return "Etwas ist schiefgelaufen. Bitte versuche es erneut.";
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!email || !password) {
    setAuthMessage("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    // ❗ E-Mail check
    if (!userCredential.user.emailVerified) {
      setAuthMessage("Bitte bestätigt zuerst eure E-Mail-Adresse.");
      return;
    }

    // ✅ HIER kommt der Redirect rein
    router.push("/dashboard");

  } catch (error: any) {
    setAuthMessage(getErrorMessage(error));
  }
};

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-6 lg:grid-cols-2">
        <div className="hidden lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">
            Marryplan
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-stone-900">
            Willkommen zurück
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-stone-600">
            Loggt euch ein und plant eure Hochzeit strukturiert, modern und gemeinsam an einem Ort.
          </p>
        </div>

        <div className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-stone-900">Einloggen</h2>
          <p className="mt-2 text-sm text-stone-500">
            Greift auf euer Marryplan Konto zu.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <button className="w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white">
              Einloggen
            </button>
          </form>

          {authMessage && (
            <p className="mt-4 text-sm text-stone-600">{authMessage}</p>
          )}

          <p className="mt-6 text-sm text-stone-600">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-medium text-stone-900 underline">
              Jetzt registrieren
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}