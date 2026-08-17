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
  const { data: taMe, isLoading } = useGetTaMe({ query: { retry: false } });
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
      <main className="min-h-[100dvh] bg-[#0b0b0b] flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-[#2c725d] border-t-transparent rounded-full" />
      </main>
    );
  }

  const handleCreate = () => {
    setLocation(`/ta/${generatedCode}`);
  };

  const handleGenerate = () => {
    setGeneratedCode(generateRoomCode());
  };

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

  const displayCode = generatedCode ?? generateRoomCode();
  if (!generatedCode) setGeneratedCode(displayCode);

  return (
    <main className="min-h-[100dvh] bg-[#0b0b0b] text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-[850] text-white/60">
          <span className="w-[7px] h-[7px] rounded-full bg-[#2c725d] shadow-[0_0_0_2px_#0b0b0b,0_0_0_3px_#2c725d]" />
          Cohort Table · TA
        </div>
        <button
          onClick={handleLogout}
          className="text-[8px] uppercase tracking-widest text-white/30 hover:text-white/70 transition-colors"
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
          className="w-full max-w-lg"
        >
          {/* Greeting */}
          <div className="mb-12">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[#2c725d] font-bold mb-3">
              TA Desk
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-white leading-tight">
              Welcome, {taMe.taName}.
            </h1>
          </div>

          <div className="border-t border-white/8 pt-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* ── New room ── */}
            <div className="flex flex-col gap-3">
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/35 font-bold">
                New session
              </p>

              {/* Generated code preview */}
              <div className="flex items-center justify-between bg-white/5 border border-white/8 rounded-md px-4 py-3">
                <span className="font-mono text-[13px] tracking-widest text-[#2c725d]">
                  {displayCode}
                </span>
                <button
                  onClick={handleGenerate}
                  title="Generate new code"
                  className="text-white/30 hover:text-white/70 transition-colors text-[11px]"
                >
                  ↻
                </button>
              </div>

              <button
                onClick={handleCreate}
                className="group flex items-center justify-between bg-[#2c725d] text-white rounded-md py-3 px-5 hover:bg-[#3a8f73] transition-colors"
              >
                <span className="text-[9px] uppercase tracking-[0.15em] font-bold">Open this room</span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>

            {/* ── Join existing ── */}
            <div className="flex flex-col gap-3">
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/35 font-bold">
                Existing room
              </p>

              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  autoComplete="off"
                  className="bg-white/5 border border-white/8 rounded-md px-4 py-3 font-mono text-[13px] text-white placeholder:text-white/20 outline-none focus:border-[#2c725d]/60 transition-colors tracking-widest uppercase"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="flex items-center justify-between border border-white/12 text-white rounded-md py-3 px-5 hover:bg-white/6 hover:border-white/25 transition-colors disabled:opacity-30"
                >
                  <span className="text-[9px] uppercase tracking-[0.15em] font-bold">Go to desk</span>
                  <span className="text-lg">→</span>
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/5">
        <p className="text-center text-[8px] uppercase tracking-widest text-white/20">
          Students join at cohort-table.replit.app · share the room code to get started
        </p>
      </div>
    </main>
  );
}
