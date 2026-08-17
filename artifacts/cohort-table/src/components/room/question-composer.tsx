import { useState, useEffect, useRef } from 'react';
import { useCreateQuestion } from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useDisplayName } from '@/hooks/use-display-name';
import { useParticipants } from '@/hooks/use-participants';
import { useToast } from '@/hooks/use-toast';
import { MentionInput } from './mention-input';
import { motion, AnimatePresence } from 'framer-motion';

interface SimilarQuestion { id: number; title: string }

export function QuestionComposer({ roomCode, onSuccess }: { roomCode: string, onSuccess: () => void }) {
  const deviceId = useDeviceId();
  const { name: authorName } = useDisplayName();
  const participants = useParticipants(roomCode);
  const { toast } = useToast();
  const createQuestion = useCreateQuestion();

  const [title, setTitle] = useState('');
  const [similar, setSimilar] = useState<SimilarQuestion[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced similarity check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (title.trim().length < 6) { setSimilar([]); setDismissed(false); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/similar-questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: title.trim() }),
        });
        if (res.ok) {
          const data: SimilarQuestion[] = await res.json();
          setSimilar(data);
          setDismissed(false);
        }
      } catch { /* ignore */ }
    }, 550);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, roomCode]);

  const showSimilar = similar.length > 0 && !dismissed;

  const submit = () => {
    if (!title.trim()) return;
    createQuestion.mutate({
      roomCode,
      data: { title: title.trim(), deviceId, isAnonymous: false, authorName },
    }, {
      onSuccess: () => {
        setTitle('');
        setSimilar([]);
        setDismissed(false);
        toast({ title: 'Your question landed on the table' });
        onSuccess();
      },
      onError: () => {
        toast({ title: 'Failed to post question', variant: 'destructive' });
      },
    });
  };

  return (
    <motion.form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      initial={{ opacity: 0, y: -85, rotate: -2, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 12, delay: 0.1 }}
      className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-destructive rounded-[5px_17px_17px_6px] composer-bg shadow-[0_24px_48px_rgba(61,55,41,0.15),0_4px_9px_rgba(61,55,41,0.08)] p-[26px_28px_23px] sm:p-[24px_18px_18px]"
    >
      <span className="absolute w-[95px] h-[24px] left-1/2 -top-[8px] -translate-x-1/2 -rotate-[1.4deg] bg-[rgba(211,195,152,0.69)] shadow-[0_1px_2px_rgba(70,59,41,0.1)]" aria-hidden="true" />

      <div className="flex items-center justify-between mb-[17px]">
        <span className="uppercase tracking-[0.15em] text-[#a9543e] text-[8px] font-black">Put a question on the table</span>
        <small className="text-muted-foreground text-[9px]">
          Asking as <span className="font-semibold text-foreground">{authorName}</span>
        </small>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-[10px] items-start">
        <MentionInput
          value={title}
          onChange={setTitle}
          participants={participants}
          placeholder="What are you stuck on?"
          onSubmit={submit}
          className="min-w-0 w-full border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent p-[10px_2px_12px] font-serif font-normal text-[20px] md:text-[24px] leading-[1.2] text-foreground outline-none placeholder-[rgba(23,49,58,0.36)]"
        />
        <button
          type="submit"
          disabled={createQuestion.isPending}
          className="dark-button py-3 md:py-0 h-full min-h-[44px] disabled:opacity-50"
        >
          Ask the room <b>→</b>
        </button>
      </div>

      {/* Similar questions panel */}
      <AnimatePresence>
        {showSimilar && (
          <motion.div
            key="similar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[rgba(65,55,40,0.12)]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[8px] uppercase tracking-[0.15em] font-black text-[#a9543e] flex items-center gap-1.5">
                  <span>⚠</span> Similar questions already on the table
                </span>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="text-[9px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
              <ul className="flex flex-col gap-1.5">
                {similar.map((q) => (
                  <li key={q.id}>
                    <span className="block text-[13px] font-serif text-foreground/80 leading-snug pl-2 border-l-2 border-[rgba(169,84,62,0.35)]">
                      {q.title}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[9px] text-muted-foreground">
                Vote or follow those instead — or post if your question is different.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
