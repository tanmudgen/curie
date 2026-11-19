import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useGetTaMe, 
  useGetTaDesk,
  useTaLogin,
  useTaLogout,
  useReleaseQuestion,
  useSendToLiveQueue,
  useClaimQuestion,
  getGetTaDeskQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TaDesk({ roomCode }: { roomCode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: taMe } = useGetTaMe();
  const { data: desk } = useGetTaDesk(roomCode, { 
    query: { 
      refetchInterval: 10000, 
      enabled: !!taMe?.loggedIn,
      queryKey: getGetTaDeskQueryKey(roomCode)
    } 
  });
  const login = useTaLogin();
  const logout = useTaLogout();
  const release = useReleaseQuestion();
  const claim = useClaimQuestion();
  const sendLive = useSendToLiveQueue();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ data: { name, password } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
        toast({ title: 'Logged in as TA' });
      },
      onError: () => {
        toast({ title: 'Login failed', variant: 'destructive' });
      }
    });
  };

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ta/me'] });
        toast({ title: 'Logged out' });
      }
    });
  };

  const isTa = taMe?.loggedIn;

  const refreshDesk = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomCode}/desk`] });
    queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomCode}/questions`] });
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        aria-label={isOpen ? "Close TA desk" : "Open TA desk"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-[15px] right-[15px] z-50 p-2 bg-foreground text-background rounded-full lg:hidden"
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-foreground/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className={`fixed top-0 right-0 h-full w-[280px] bg-popover border-l border-border z-40 p-6 pt-[80px] lg:pt-[8px] overflow-y-auto flex flex-col lg:relative lg:w-auto lg:h-auto lg:bg-transparent lg:border-l-0 lg:p-0 lg:z-auto transition-transform duration-300 lg:transform-none ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        <div>
          <span className="font-mono uppercase tracking-wider text-primary text-[11px] font-semibold">TA desk</span>
          <h2 className="font-sans font-semibold text-[25px] leading-none tracking-[-0.03em] my-[12px] mb-[10px]">
            Divide the swarm.
          </h2>
          <p className="text-sm leading-[1.55] text-muted-foreground hidden lg:block">
            Claiming a card tells the other TAs that someone is already working on it.
          </p>
        </div>

        {!isTa ? (
          <div className="mt-8 p-4 border border-border rounded-lg bg-card shadow-sm">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wide mb-4 text-primary">TA Login</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="TA Name" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-[12px] p-2 border-b border-input bg-transparent outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-[12px] p-2 border-b border-input bg-transparent outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <button type="submit" disabled={login.isPending} className="dark-button py-2 w-full mt-2">Sign In</button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-6 mt-6">
            <div className="flex justify-between items-center text-sm font-mono uppercase tracking-wide border-b border-border pb-2">
              <span className="text-muted-foreground">Desk: <b className="text-foreground">{taMe.taName}</b></span>
              <button onClick={handleLogout} className="text-destructive hover:text-destructive/80 font-bold">Logout</button>
            </div>

            <div className="grid gap-[9px]">
              <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground font-semibold">My Claims</span>
              {desk?.myClaims.map((q) => (
                <motion.article 
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-[14px] border border-border border-l-[4px] border-l-primary rounded-lg bg-card shadow-sm"
                >
                  <span className="text-[11px] font-mono uppercase tracking-wide text-primary font-semibold">Claimed by you</span>
                  <b className="block font-sans font-semibold text-[15px] leading-[1.2] my-[7px] line-clamp-2" title={q.title}>{q.title}</b>
                  <div className="flex gap-2">
                    <button 
                      className="w-full mt-[11px] p-[8px] border border-border rounded-full bg-transparent text-primary text-[11px] font-mono uppercase tracking-wide cursor-pointer hover:bg-card transition-colors"
                      onClick={() => release.mutate({ id: q.id }, { onSuccess: refreshDesk })}
                    >
                      Release
                    </button>
                    {!q.isInLiveQueue && (
                      <button 
                        className="w-full mt-[11px] p-[8px] border border-border rounded-full bg-foreground text-background text-[11px] font-mono uppercase tracking-wide cursor-pointer transition-colors"
                        onClick={() => sendLive.mutate({ id: q.id }, { onSuccess: () => { toast({title: "Sent to Live Queue"}); refreshDesk(); }})}
                      >
                        Send to Live
                      </button>
                    )}
                  </div>
                </motion.article>
              ))}
              {desk?.myClaims.length === 0 && (
                <div className="p-3 border border-dashed border-border rounded text-center text-xs font-mono uppercase tracking-wide text-muted-foreground">
                  No active claims
                </div>
              )}
            </div>

            <div className="grid gap-[9px]">
              <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground font-semibold mt-2">Needs a TA</span>
              {desk?.needsATa.slice(0, 3).map((q) => (
                <motion.article 
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-[14px] border border-border border-l-[4px] border-l-destructive rounded-lg bg-card shadow-sm"
                >
                  <span className="text-[11px] font-mono uppercase tracking-wide text-destructive font-semibold">Unanswered</span>
                  <b className="block font-sans font-semibold text-[15px] leading-[1.2] my-[7px] line-clamp-2" title={q.title}>{q.title}</b>
                  <div className="flex gap-2">
                    <button 
                      className="w-full mt-[11px] p-[8px] border border-border rounded-full bg-transparent text-primary text-[11px] font-mono uppercase tracking-wide cursor-pointer hover:bg-card transition-colors"
                      onClick={() => claim.mutate({ id: q.id }, { onSuccess: refreshDesk })}
                    >
                      Claim
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            {desk?.questionGroups && desk.questionGroups.length > 0 && (
              <div className="grid gap-[9px]">
                <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground font-semibold mt-2">Groups</span>
                {desk.questionGroups.map((g) => (
                  <div key={g.id} className="p-[14px] border border-border border-l-[4px] border-l-accent rounded-lg bg-card">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-accent-foreground font-semibold">{g.questionCount} Questions</span>
                    <b className="block font-sans font-semibold text-[15px] leading-[1.2] my-[7px] line-clamp-2">{g.title}</b>
                  </div>
                ))}
              </div>
            )}

            {desk?.liveQueue && desk.liveQueue.length > 0 && (
              <div className="mt-2 p-4 border border-dashed border-primary/30 rounded-lg text-center bg-accent/10">
                <strong className="block font-sans font-semibold text-[32px] text-primary">{desk.liveQueue.length}</strong>
                <span className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground font-semibold">In Live Queue</span>
              </div>
            )}
          </div>
        )}
      </motion.aside>
    </>
  );
}
