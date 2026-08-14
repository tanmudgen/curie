import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Question, 
  useVoteQuestion, 
  useUnvoteQuestion,
  useFollowQuestion,
  useUnfollowQuestion,
  useBlockQuestion,
  useUnblockQuestion,
  useClaimQuestion,
  useGetQuestion,
  useCreateReply,
  useMarkReplyHelpful,
  getGetQuestionQueryKey
} from '@workspace/api-client-react';
import { useDeviceId } from '@/hooks/use-device-id';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

export function QuestionCard({ question, index, roomCode }: { question: Question, index: number, roomCode: string }) {
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();
  
  const vote = useVoteQuestion();
  const unvote = useUnvoteQuestion();
  const follow = useFollowQuestion();
  const unfollow = useUnfollowQuestion();
  const block = useBlockQuestion();
  const unblock = useUnblockQuestion();
  const claim = useClaimQuestion();

  // Optimistic UI state
  const [optVote, setOptVote] = useState({ voted: !!question.viewerVoted, count: question.voteCount });
  const [optFollow, setOptFollow] = useState({ followed: !!question.viewerFollows, count: question.followCount });
  const [optBlock, setOptBlock] = useState({ blocked: !!question.viewerBlocked, count: question.blockedCount });
  
  const [showReplies, setShowReplies] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  // Sync optimistic state with props if they change significantly
  if (question.voteCount !== optVote.count && !vote.isPending && !unvote.isPending) {
    setOptVote({ voted: !!question.viewerVoted, count: question.voteCount });
  }

  const { data: detail } = useGetQuestion(question.id, { deviceId }, { 
    query: { 
      enabled: showReplies,
      queryKey: getGetQuestionQueryKey(question.id, { deviceId })
    } 
  });

  const createReply = useCreateReply();
  const markHelpful = useMarkReplyHelpful();

  let accentColor = 'var(--coral)'; // default unanswered
  if (question.status === 'answered') accentColor = 'var(--green)';
  else if (question.risingScore && question.risingScore > 10) accentColor = 'var(--gold)';

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optVote.voted) {
      setOptVote(prev => ({ voted: false, count: prev.count - 1 }));
      unvote.mutate({ id: question.id, data: { deviceId } });
    } else {
      setOptVote(prev => ({ voted: true, count: prev.count + 1 }));
      vote.mutate({ id: question.id, data: { deviceId } });
    }
  };

  const handleFollow = () => {
    if (optFollow.followed) {
      setOptFollow(prev => ({ followed: false, count: prev.count - 1 }));
      unfollow.mutate({ id: question.id, data: { deviceId } });
    } else {
      setOptFollow(prev => ({ followed: true, count: prev.count + 1 }));
      follow.mutate({ id: question.id, data: { deviceId } });
    }
  };

  const handleBlock = () => {
    if (optBlock.blocked) {
      setOptBlock(prev => ({ blocked: false, count: prev.count - 1 }));
      unblock.mutate({ id: question.id, data: { deviceId } });
    } else {
      setOptBlock(prev => ({ blocked: true, count: prev.count + 1 }));
      block.mutate({ id: question.id, data: { deviceId } });
    }
  };

  const submitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    createReply.mutate({ id: question.id, data: { body: replyBody, deviceId } }, {
      onSuccess: () => {
        setReplyBody('');
        setShowReplyForm(false);
        queryClient.invalidateQueries({ queryKey: [`/api/questions/${question.id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomCode}/questions`] });
      }
    });
  };

  const handleClaim = () => {
    claim.mutate({ id: question.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/rooms/${roomCode}/questions`] })
    });
  };

  const timeAgo = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });

  return (
    <motion.article 
      initial={{ opacity: 0, y: -100, rotate: -3, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ 
        type: "spring", stiffness: 100, damping: 15, mass: 1.2,
        delay: Math.min(index * 0.07, 1) 
      }}
      className="card-bg grid grid-cols-[54px_1fr] md:grid-cols-[76px_1fr] border border-[rgba(23,49,58,0.18)] rounded-[9px_17px_15px_7px] shadow-[0_17px_30px_rgba(58,55,43,0.12),0_3px_7px_rgba(58,55,43,0.07)] overflow-hidden transition-all duration-300 hover:-translate-y-[3px] hover:shadow-[0_24px_38px_rgba(58,55,43,0.15),0_4px_9px_rgba(58,55,43,0.08)]"
      style={{ '--accent': accentColor } as any}
    >
      <div className="border-r border-border bg-[rgba(222,213,195,0.38)] flex flex-col items-center justify-center p-[7px] md:p-[12px]">
        <motion.button 
          onClick={handleVote}
          whileTap={{ scale: 0.9 }}
          className={`w-[39px] h-[52px] md:w-[46px] md:h-[58px] border rounded-[50%_50%_8px_8px] flex flex-col items-center justify-center shadow-[0_5px_9px_rgba(58,55,43,0.08)] transition-colors
            ${optVote.voted 
              ? 'bg-primary text-[#fff8e9] border-primary' 
              : 'bg-[#faf4e6] text-primary border-[rgba(44,114,93,0.28)]'
            }`}
          aria-label="Upvote question"
        >
          <span className="text-[14px] leading-none mb-1">↑</span>
          <strong className="font-serif font-normal text-[20px] leading-none">{optVote.count}</strong>
        </motion.button>
        <small className="mt-[8px] text-[7px] uppercase tracking-[0.09em] text-muted-foreground">votes</small>
      </div>
      
      <div className="p-[15px_14px] md:p-[18px_20px_17px] border-t-[4px]" style={{ borderColor: accentColor }}>
        <div className="flex justify-between gap-[12px] text-muted-foreground text-[8px] uppercase tracking-[0.09em] mb-2">
          <span>
            {question.status === 'answered' ? <b style={{color: accentColor}}>Answered</b> : <b style={{color: accentColor}}>{question.risingScore && question.risingScore > 10 ? 'Rising' : 'Unanswered'}</b>}
            {' · '}asked by {question.authorLabel}
            {question.viewerAsked && <span className="ml-2 px-1 border border-border rounded bg-[rgba(0,0,0,0.05)] text-[7px]">You</span>}
          </span>
          <span className="hidden sm:inline">{timeAgo}</span>
        </div>
        
        <h3 className="font-serif font-normal text-[21px] md:text-[24px] leading-[1.1] tracking-[-0.025em] m-[14px_0_9px]">
          {question.title}
        </h3>
        
        {question.body && (
          <p className="text-[11px] leading-[1.5] text-muted-foreground m-[0_0_14px]">
            {question.body}
          </p>
        )}

        {question.tags && question.tags.length > 0 && (
          <div className="flex gap-[6px] flex-wrap mb-4">
            {question.tags.map(tag => (
              <span key={tag} className="border border-border rounded-full px-[8px] py-[5px] text-[7px] uppercase tracking-[0.08em] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-[9px] md:gap-[13px] mt-[15px] pt-[13px] border-t border-border flex-wrap">
          <button onClick={handleFollow} className={`border-0 bg-transparent p-0 text-[8px] uppercase tracking-[0.08em] cursor-pointer hover:text-primary transition-colors ${optFollow.followed ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
            Follow · {optFollow.count}
          </button>
          
          <button onClick={handleBlock} className={`border-0 bg-transparent p-0 text-[8px] uppercase tracking-[0.08em] cursor-pointer hover:text-destructive transition-colors ${optBlock.blocked ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
            I'm blocked · {optBlock.count}
          </button>

          <button onClick={() => setShowReplyForm(!showReplyForm)} className="border-0 bg-transparent p-0 text-[8px] uppercase tracking-[0.08em] cursor-pointer text-muted-foreground hover:text-primary transition-colors">
            Reply
          </button>

          {question.replyCount > 0 && (
            <button onClick={() => setShowReplies(!showReplies)} className="border-0 bg-transparent p-0 text-[8px] uppercase tracking-[0.08em] cursor-pointer text-muted-foreground hover:text-primary transition-colors">
              {showReplies ? 'Hide replies' : `Show ${question.replyCount} replies`}
            </button>
          )}

          {question.claimedByTa && (
            <span className="ml-auto font-black text-[8px] uppercase tracking-[0.08em] text-destructive p-[5px_8px] border border-destructive rounded-[2px] transform -rotate-2 shadow-sm select-none">
              {question.status === 'answered' ? 'Resolved' : `Claimed by ${question.claimedByTa}`}
            </span>
          )}
        </div>

        {/* Reply Form */}
        <AnimatePresence>
          {showReplyForm && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 overflow-hidden"
              onSubmit={submitReply}
            >
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Add an answer or context..." 
                  className="flex-1 bg-[rgba(255,255,255,0.5)] border border-border rounded-md px-3 py-2 text-[11px] outline-none focus:border-primary"
                />
                <button type="submit" disabled={createReply.isPending} className="dark-button text-[8px] py-1 px-3 min-h-0">
                  Send
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Replies List */}
        <AnimatePresence>
          {showReplies && detail && detail.replies && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
                {detail.groupReply && (
                  <div className="p-[14px_15px] border-l-[3px] border-l-primary bg-[rgba(44,114,93,0.065)] rounded-[2px_8px_8px_2px]">
                    <span className="flex items-center gap-[7px] text-primary text-[7px] uppercase tracking-[0.1em] font-black">
                      ✓ Group context · TA
                    </span>
                    <p className="text-[10px] leading-[1.55] text-foreground m-[8px_0_0]">
                      {detail.groupReply.body}
                    </p>
                  </div>
                )}
                {detail.replies.map(reply => (
                  <div key={reply.id} className={`p-3 rounded-md bg-[rgba(255,255,255,0.4)] border ${reply.isTa ? 'border-primary/20' : 'border-border/50'}`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[8px] uppercase tracking-[0.1em] font-bold flex items-center gap-1">
                        {reply.authorLabel} {reply.isTa && <span className="bg-primary text-primary-foreground px-1 rounded-[2px] text-[6px]">TA</span>}
                      </span>
                      <button 
                        onClick={() => {
                          markHelpful.mutate({ id: reply.id, data: { deviceId } }, {
                            onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/questions/${question.id}`] })
                          });
                        }}
                        className={`text-[8px] uppercase tracking-[0.1em] ${reply.viewerMarkedHelpful ? 'text-primary font-black' : 'text-muted-foreground'}`}
                      >
                        Helpful · {reply.helpfulCount}
                      </button>
                    </div>
                    <p className="text-[11px] leading-[1.5] text-foreground">{reply.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.article>
  );
}
