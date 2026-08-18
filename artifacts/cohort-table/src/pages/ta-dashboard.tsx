import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useGetTaMe, useTaLogout } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

function generateRoomCode() {
  const words = ['ALPHA', 'BETA', 'NOVA', 'ECHO', 'SIGMA', 'DELTA', 'GAMMA', 'OMEGA'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(Math.random() * 12) + 1;
  return `${w}-W${n}`;
}

export function TaDashboardPage() {
  const [, setLocation] = useLocation();
  const { data: taMe, isLoading } = useGetTaMe({ query: { retry: false, queryKey: [] } });
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
      <main className="world min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      </main>
    );
  }

  const handleCreate = () => setLocation(`/ta/${generatedCode}`);
  const handleGenerate = () => setGeneratedCode(generateRoomCode());

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
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
    <main className="world min-h-[100dvh] flex flex-col">
      {/* Header — same style as room header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-2 uppercase tracking-[0.18em] text-[9px] font-[850]">
          <span className="w-[8px] h-[8px] rounded-full bg-primary shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary))]" />
          /Curie
        </div>
        <button
          onClick={handleLogout}
          className="text-[8px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Center */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.18, 0.75, 0.2, 1] }}
          className="w-full max-w-md"
        >
          {/* Greeting */}
          <div className="mb-10 text-center">
            <span className="inline-block uppercase tracking-[0.15em] text-[9px] font-black text-primary mb-3">
              TA Desk
            </span>
            <h1 className="font-serif text-3xl md:text-4xl tracking-tight">
              Welcome, {taMe.taName}.
            </h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* ── New room ── */}
            <div className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-primary rounded-[5px_17px_17px_6px] composer-bg shadow-[0_17px_30px_rgba(58,55,43,0.12),0_3px_7px_rgba(58,55,43,0.07)] p-5 flex flex-col gap-3">
              <span className="text-[8px] uppercase tracking-[0.15em] text-primary font-black">New session</span>

              {/* Generated code */}
              <div className="flex items-center justify-between border border-[rgba(33,49,43,0.14)] rounded-full px-4 py-2 bg-[rgba(255,255,255,0.35)]">
                <span className="font-mono text-[13px] tracking-widest text-foreground font-bold">
                  {generatedCode}
                </span>
                <button
                  onClick={handleGenerate}
                  title="Generate new code"
                  className="text-muted-foreground hover:text-foreground transition-colors text-[13px] ml-2"
                >
                  ↻
                </button>
              </div>

              <button
                onClick={handleCreate}
                className="dark-button py-3 w-full"
              >
                Open this room →
              </button>
            </div>

            {/* ── Join existing ── */}
            <div className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-destructive rounded-[5px_17px_17px_6px] composer-bg shadow-[0_17px_30px_rgba(58,55,43,0.12),0_3px_7px_rgba(58,55,43,0.07)] p-5 flex flex-col gap-3">
              <span className="text-[8px] uppercase tracking-[0.15em] text-[#a9543e] font-black">Existing room</span>

              <form onSubmit={handleJoin} className="flex flex-col gap-3 flex-1">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  autoComplete="off"
                  className="w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent py-2 px-1 font-serif text-xl outline-none placeholder:text-[rgba(23,49,58,0.28)] uppercase tracking-widest"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="dark-button py-3 w-full disabled:opacity-40"
                >
                  Go to desk →
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
