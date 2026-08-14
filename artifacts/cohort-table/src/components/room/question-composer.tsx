import { useState } from 'react';
import { useCreateQuestion } from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export function QuestionComposer({ roomCode, onSuccess }: { roomCode: string, onSuccess: () => void }) {
  const deviceId = useDeviceId();
  const { toast } = useToast();
  const createQuestion = useCreateQuestion();
  
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!authorName.trim()) {
      toast({ title: 'Please enter your name before asking', variant: 'destructive' });
      return;
    }

    createQuestion.mutate({
      roomCode,
      data: {
        title: title.trim(),
        deviceId,
        isAnonymous: false,
        authorName: authorName.trim(),
      }
    }, {
      onSuccess: () => {
        setTitle('');
        setAuthorName('');
        setIsExpanded(false);
        toast({ title: 'Your question landed on the table' });
        onSuccess();
      },
      onError: () => {
        toast({ title: 'Failed to post question', variant: 'destructive' });
      }
    });
  };

  return (
    <motion.form 
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -85, rotate: -2, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 12, delay: 0.1 }}
      className="relative border border-[rgba(65,55,40,0.16)] border-l-[6px] border-l-destructive rounded-[5px_17px_17px_6px] composer-bg shadow-[0_24px_48px_rgba(61,55,41,0.15),0_4px_9px_rgba(61,55,41,0.08)] p-[26px_28px_23px] sm:p-[24px_18px_18px]"
    >
      <span className="absolute w-[95px] h-[24px] left-1/2 -top-[8px] -translate-x-1/2 -rotate-[1.4deg] bg-[rgba(211,195,152,0.69)] shadow-[0_1px_2px_rgba(70,59,41,0.1)]" aria-hidden="true" />
      
      <div className="flex items-center justify-between mb-[17px]">
        <span className="uppercase tracking-[0.15em] text-[#a9543e] text-[8px] font-black">Put a question on the table</span>
        <small className="text-muted-foreground text-[9px]">Visible to the whole cohort</small>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-[10px] items-start">
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.length > 5 && !isExpanded) setIsExpanded(true);
            }}
            placeholder="What are you stuck on?"
            autoComplete="off"
            className="min-w-0 border-0 border-b border-[rgba(33,49,43,0.24)] bg-transparent p-[10px_2px_12px] font-serif font-normal text-[20px] md:text-[24px] leading-[1.2] text-foreground outline-none placeholder-[rgba(23,49,58,0.36)]"
          />
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1"
              >
                <input 
                  type="text"
                  placeholder="Your name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  autoComplete="nickname"
                  className="text-[11px] border-b border-[rgba(33,49,43,0.24)] bg-transparent outline-none p-1 placeholder-[rgba(23,49,58,0.36)] w-48"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
