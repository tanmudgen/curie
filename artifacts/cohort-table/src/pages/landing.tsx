import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, LogIn } from 'lucide-react';
import { useTaLogin, getGetTaMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDisplayName } from '@/hooks/use-display-name';
import { EntryCover, EntryHeader } from './entry-layout';

export function LandingPage() {
  const [, setLocation] = useLocation();
  const { name, setName } = useDisplayName();
  const [roomCode, setRoomCode] = useState(() =>
    (new URLSearchParams(window.location.search).get('room') ?? '').toUpperCase(),
  );
  const [taMode, setTaMode] = useState(false);
  const [taName, setTaName] = useState('');
  const [taPassword, setTaPassword] = useState('');
  const [taError, setTaError] = useState('');
  const login = useTaLogin();
  const queryClient = useQueryClient();

  const submitStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = roomCode.trim().toUpperCase();
    if (!target || !name.trim()) return;
    setName(name.trim());
    setLocation(`/room/${encodeURIComponent(target)}`);
  };

  const submitTa = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTaError('');
    login.mutate({ data: { name: taName, password: taPassword } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTaMeQueryKey() });
        setLocation('/ta');
      },
      onError: error => setTaError(error.data?.error || 'Unable to sign in. Check your details and try again.'),
    });
  };

  return (
    <main className="entry-page">
      <EntryHeader showCurie action={
        <button
          className="entry-switch"
          type="button"
          onClick={() => { setTaMode(!taMode); setTaError(''); }}
        >
          {taMode ? <ArrowLeft aria-hidden="true" size={16} /> : <LogIn aria-hidden="true" size={16} />}
          {taMode ? 'Back to student join' : 'Sign in as TA'}
        </button>
      } />

      <section className="entry-grid">
        <EntryCover ta={taMode} />
        <div className="entry-form-panel">
          <div className="entry-form-inner">
            <form onSubmit={submitTa} className="entry-form" inert={!taMode}>
              <h2>Sign in to the TA desk</h2>
              <div className="entry-field">
                <label htmlFor="ta-name">Your name</label>
                <input id="ta-name" type="text" value={taName} autoComplete="name" placeholder="Enter your name" onChange={e => setTaName(e.target.value)} required />
              </div>
              <div className="entry-field">
                <label htmlFor="ta-password">TA password</label>
                <input id="ta-password" type="password" value={taPassword} autoComplete="current-password" placeholder="Enter your password" onChange={e => setTaPassword(e.target.value)} required />
              </div>
              {taError && <p role="alert" className="entry-error">{taError}</p>}
              <button className="entry-submit" disabled={login.isPending || !taName.trim() || !taPassword.trim()}>
                {login.isPending ? 'Signing in…' : 'Sign in to TA desk'} <ArrowRight aria-hidden="true" size={18} />
              </button>
            </form>
            <form onSubmit={submitStudent} className="entry-form entry-student-form" inert={taMode}>
              <h2>Join a room</h2>
              <div className="entry-field">
                <label htmlFor="student-name">Your full name</label>
                <input id="student-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" aria-describedby="name-help" autoComplete="name" required />
                <p id="name-help">Your name appears on your questions.</p>
              </div>
              <div className="entry-field">
                <label htmlFor="student-room">Room code</label>
                <input id="student-room" className="entry-code-input" type="text" value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="e.g. AGENTS-W4" autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
              </div>
              <button className="entry-submit" disabled={!roomCode.trim() || !name.trim()}>
                Join the table <ArrowRight aria-hidden="true" size={18} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
