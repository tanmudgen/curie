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
    <div className="my-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter questions">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            aria-pressed={filter === tab.id}
            className={`whitespace-nowrap border rounded-full px-[12px] py-[8px] text-[11px] font-mono uppercase tracking-wide cursor-pointer transition-colors
              ${filter === tab.id 
                ? 'border-foreground bg-foreground text-primary-foreground'
                : 'border-border bg-card text-foreground hover:border-foreground'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <span className="hidden md:inline text-xs text-muted-foreground">
        Sorted by upvotes · oldest first
      </span>
    </div>
  );
}
