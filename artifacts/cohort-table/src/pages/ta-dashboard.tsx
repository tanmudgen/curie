import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, LogOut, RefreshCw } from 'lucide-react';
import { EntryHeader } from './entry-layout';
import { useGetTaMe, useTaLogout, getGetTaMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

function generateRoomCode() {
  const words = ['ALPHA', 'BETA', 'NOVA', 'ECHO', 'SIGMA', 'DELTA', 'GAMMA', 'OMEGA'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 12) + 1;
  return `${w}-W${n}`;
}

export function TaDashboardPage() {
  const [, setLocation] = useLocation();
  const { data: taMe, isLoading } = useGetTaMe({ query: { retry: false, queryKey: getGetTaMeQueryKey() } });
  const [joinCode, setJoinCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState(() => generateRoomCode());
  const logout = useTaLogout();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !taMe?.loggedIn) {
      setLocation('/');
    }
  }, [isLoading, taMe, setLocation]);

  if (isLoading || !taMe?.loggedIn) {
    return (
      <main className="entry-page grid place-items-center" aria-busy="true">
        <span className="sr-only">Loading TA desk</span>
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  const ensureRoom = async (code: string) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    await fetch(`${base}/api/ta/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roomCode: code }),
    });
  };

  const handleCreate = async () => {
    await ensureRoom(generatedCode);
    setLocation(`/ta/${generatedCode}`);
  };

  const handleGenerate = () => setGeneratedCode(generateRoomCode());

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    await ensureRoom(code);
    setLocation(`/ta/${code}`);
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
        setLocation('/');
      },
    });
  };

  return (
    <main className="entry-page">
      <EntryHeader action={
        <button type="button" onClick={handleLogout} className="entry-switch">
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      } />
      <div className="desk-layout">
        <header className="desk-heading">
          <p>TA desk</p>
          <h1>Welcome, {taMe.taName}.</h1>
          <span className="entry-pixels" aria-hidden="true" />
        </header>
        <div className="desk-cards">
          <section className="desk-card">
            <h2>New session</h2>
            <div className="entry-field">
              <label htmlFor="generated-room">Room code</label>
              <div className="desk-code">
                <output id="generated-room" aria-live="polite">{generatedCode}</output>
                <button type="button" onClick={handleGenerate} aria-label="Generate a new room code" title="Generate a new room code" className="desk-refresh">
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
            <button type="button" onClick={handleCreate} className="entry-submit">
              Open this room <ArrowRight aria-hidden="true" size={18} />
            </button>
          </section>
          <form onSubmit={handleJoin} className="desk-card">
            <h2>Existing room</h2>
            <div className="entry-field">
              <label htmlFor="existing-room">Room code</label>
              <input
                id="existing-room"
                type="text"
                className="entry-code-input"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. AGENTS-W4"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                required
              />
            </div>
            <button type="submit" disabled={!joinCode.trim()} className="entry-submit">
              Go to desk <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
