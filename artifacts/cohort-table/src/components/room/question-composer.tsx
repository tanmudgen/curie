import { useState } from 'react';
import { useCreateQuestion } from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useDisplayName } from '@/hooks/use-display-name';
import { useParticipants } from '@/hooks/use-participants';
import { useToast } from '@/hooks/use-toast';
import { MentionInput } from './mention-input';
import { motion } from 'framer-motion';

export function QuestionComposer({ roomCode, onSuccess }: { roomCode: string, onSuccess: () => void }) {
  const deviceId = useDeviceId();
  const { name: authorName } = useDisplayName();
  const participants = useParticipants(roomCode);
  const { toast } = useToast();
  const createQuestion = useCreateQuestion();

  const [title, setTitle] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    createQuestion.mutate({
      roomCode,
      data: { title: title.trim(), deviceId, isAnonymous: false, authorName },
    }, {
      onSuccess: () => {
        setTitle('');
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
    </motion.form>
  );
}
