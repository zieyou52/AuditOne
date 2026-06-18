import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) throw error;
      }
      nav('/orgs');
    } catch (e: any) {
      setErr(e.message ?? '오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-7">
        <div className="text-xl font-medium">AuditOne</div>
        <div className="mt-1 text-sm text-neutral-500">학생 단체 회계·감사 플랫폼</div>
        <div className="mt-6 flex flex-col gap-3">
          <input className="rounded-md border border-neutral-300 px-3 py-2 text-sm" placeholder="이메일"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="rounded-md border border-neutral-300 px-3 py-2 text-sm" type="password" placeholder="비밀번호"
            value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <div className="text-xs text-red-600">{err}</div>}
          <button disabled={busy} onClick={submit}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50">
            {busy ? '처리 중…' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-xs text-neutral-500">
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
