import { ListQuestionsView } from '@workspace/api-client-react';

export function FilterTabs({ 
  filter, 
  setFilter 
}: { 
  filter: ListQuestionsView, 
  setFilter: (f: ListQuestionsView) => void 
}) {
  const tabs = [
    { id: ListQuestionsView.rising, label: 'Rising' },
    { id: ListQuestionsView.resolved, label: 'Resolved' },
    { id: ListQuestionsView.unanswered, label: 'Unanswered' },
    { id: ListQuestionsView.answered, label: 'Answered' },
    { id: ListQuestionsView.mine, label: 'My activity' },
  ] as const;

  return (
    <div className="flex justify-between items-center m-[25px_3px_13px]">
      <div className="flex gap-[6px] overflow-x-auto pb-2 md:pb-0" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`whitespace-nowrap border rounded-full px-[12px] py-[8px] text-[8px] uppercase tracking-[0.1em] cursor-pointer transition-colors
              ${filter === tab.id 
                ? 'bg-foreground border-foreground text-[#faf3e5]' 
                : 'border-border bg-[rgba(255,255,255,0.24)] text-muted-foreground hover:border-foreground/30'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <span className="hidden md:inline text-[9px] text-muted-foreground">
        Sorted by votes + waiting time
      </span>
    </div>
  );
}
