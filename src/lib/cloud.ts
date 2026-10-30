import { exportSettings, useOS } from "../store/os";
import { useFs } from "../store/fs";
import type { Nodes } from "../store/fs";

function firebaseConfig() {
  const env = import.meta.env;
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value?.trim())
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Konfigurasi Firebase belum lengkap: ${missing.join(", ")}. Atur environment VITE_FIREBASE_* lalu build ulang.`);
  }
  return config;
}

export function isFirebaseConfigured(): boolean {
  const env = import.meta.env;
  return Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID);
}

export function cloudErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "permission-denied"
  ) {
    return "Firestore menolak akses. Pastikan Rules mengizinkan pengguna yang login membaca dan menulis /dapos/{uid} hanya jika request.auth.uid == uid, lalu Publish rules.";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("client is offline")
  ) {
    return "Akun berhasil diverifikasi, tetapi Firestore sedang tidak dapat dijangkau. Periksa koneksi internet, pastikan Firestore Database sudah dibuat pada proyek Firebase yang sama, lalu coba sinkronkan lagi.";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/configuration-not-found"
  ) {
    return "Firebase Authentication belum disiapkan untuk proyek ini. Aktifkan Authentication di Firebase Console dan pastikan konfigurasi aplikasi memakai project yang sama.";
  }
  return error instanceof Error ? error.message : String(error);
}

async function getFb() {
  const cfg = firebaseConfig();
  const { getApps, initializeApp } = await import("firebase/app");
  const { getAuth } = await import("firebase/auth");
  const { getFirestore } = await import("firebase/firestore");
  const app = getApps().find((a) => a.name === "dapos") ?? initializeApp(cfg, "dapos");
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function cloudStatus(): Promise<string | null> {
  const { auth } = await getFb();
  await auth.authStateReady();
  return auth.currentUser?.email ?? null;
}

export async function cloudSignIn(email: string, password: string, create: boolean): Promise<string> {
  const { auth } = await getFb();
  const m = await import("firebase/auth");
  const cred = create
    ? await m.createUserWithEmailAndPassword(auth, email, password)
    : await m.signInWithEmailAndPassword(auth, email, password);
  return cred.user.email ?? email;
}

export async function cloudSignOut(): Promise<void> {
  const { auth } = await getFb();
  await auth.signOut();
}

export async function cloudPush(): Promise<number> {
  const { auth, db } = await getFb();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Belum masuk ke akun cloud.");
  const payload = JSON.stringify({ v: 1, fs: useFs.getState().nodes, settings: exportSettings() });
  if (payload.length > 900_000) throw new Error("Data terlalu besar untuk satu dokumen Firestore (batas 1 MB). Hapus gambar atau rekaman besar dulu.");
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "dapos", user.uid), { data: payload, updatedAt: Date.now() });
  return payload.length;
}

export async function cloudPull(): Promise<number | null> {
  const { auth, db } = await getFb();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Belum masuk ke akun cloud.");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "dapos", user.uid));
  if (!snap.exists()) return null;
  const raw = snap.data()["data"];
  if (typeof raw !== "string") throw new Error("Format data di cloud tidak dikenali.");
  const parsed = JSON.parse(raw) as { fs?: Nodes; settings?: Record<string, unknown> };
  if (parsed.fs) useFs.getState().replaceAll(parsed.fs);
  if (parsed.settings) useOS.getState().importSettings(parsed.settings);
  const at = snap.data()["updatedAt"];
  return typeof at === "number" ? at : Date.now();
}

export async function cloudHasData(): Promise<boolean> {
  const { auth, db } = await getFb();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Belum masuk ke akun cloud.");
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "dapos", user.uid));
  return snap.exists();
}

let stopAutoSync: (() => void) | null = null;

export function stopCloudAutoSync(): void {
  stopAutoSync?.();
  stopAutoSync = null;
}

export function startCloudAutoSync(onError: (message: string) => void): void {
  stopCloudAutoSync();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let reportedError = false;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void cloudPush()
        .then(() => {
          reportedError = false;
        })
        .catch((error: unknown) => {
          if (reportedError) return;
          reportedError = true;
          onError(error instanceof Error ? error.message : String(error));
        });
    }, 1200);
  };
  const unsubscribeOS = useOS.subscribe(schedule);
  const unsubscribeFs = useFs.subscribe(schedule);
  stopAutoSync = () => {
    if (timer) clearTimeout(timer);
    unsubscribeOS();
    unsubscribeFs();
  };
}
