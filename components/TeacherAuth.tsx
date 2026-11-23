'use client';

import { SignIn, SignUp, useSession } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';

const destination = '/portal.html';

export default function TeacherAuth({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [message, setMessage] = useState('');
  const checkServerSession = useCallback(async (showMessage = false) => {
    try {
      const response = await fetch('/api/me', { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) return;
      const account = await response.json();
      // /api/me verifies the Clerk session on the server; no access is granted by this UI.
      if (account.signedIn) window.location.replace(destination);
      else if (showMessage) setMessage('Sesi belum aktif. Selesaikan verifikasi pada formulir di atas.');
    } catch { /* Keep the verification form available during a temporary network error. */ }
  }, []);

  const { isLoaded, isSignedIn, session } = useSession();
  const ready = isLoaded && isSignedIn && session?.status === 'active' && !session.currentTask;

  useEffect(() => {
    // A full navigation also reloads the portal's server-side account information.
    // Never leave a verification flow while Clerk still requires a session task.
    if (ready) window.location.replace(destination);
  }, [ready]);

  useEffect(() => {
    // Recovery for a completed sign-in whose client-side redirect remains stuck.
    // Stop polling after ten minutes and leave a manual status check available.
    const deadline = Date.now() + 10 * 60 * 1000;
    let running = false;
    const check = async () => {
      if (running || document.visibilityState === 'hidden' || Date.now() > deadline) return;
      running = true;
      try { await checkServerSession(); } finally { running = false; }
    };
    void check();
    const timer = window.setInterval(() => {
      if (Date.now() > deadline) window.clearInterval(timer);
      else void check();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [checkServerSession]);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#eff0de', padding: 24, boxSizing: 'border-box' }}>
      <div>
        <img src="/branding/riskman-logo.png" alt="Riskman" style={{display:'block',width:260,maxWidth:'100%',margin:'0 auto 20px'}} />
        <p style={{ textAlign: 'center', fontFamily: 'Georgia, serif', color: '#294839' }} role="status">
          {ready ? 'Login berhasil. Membuka Riskman…' : 'Masuk ke ruang pengajar Riskman'}
        </p>
        {ready ? <p style={{ textAlign: 'center' }}><a href={destination}>Lanjut ke Riskman →</a></p> : mode === 'sign-in' ? (
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up"
            forceRedirectUrl={destination} signUpForceRedirectUrl={destination} />
        ) : (
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in"
            forceRedirectUrl={destination} signInForceRedirectUrl={destination} />
        )}
        {!ready && <div style={{ textAlign: 'center', marginTop: 20, fontFamily: 'sans-serif', maxWidth: 400 }}>
          <button type="button" onClick={() => void checkServerSession(true)} style={{ cursor: 'pointer', padding: '10px 16px' }}>Sudah verifikasi? Lanjut ke Riskman →</button>
          <p role="status" style={{ fontSize: 13, color: '#47613e' }}>{message}</p>
        </div>}
      </div>
    </main>
  );
}
