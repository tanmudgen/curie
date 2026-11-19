import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { EntryHeader } from './entry-layout';

export default function NotFound() {
  return (
    <main className="entry-page">
      <EntryHeader />
      <div className="entry-status-wrap">
        <div className="entry-status">
          <p>404</p>
          <h1>Page not found</h1>
          <Link href="/" className="entry-submit"><ArrowLeft size={18} aria-hidden="true" /> Return to Cohort Table</Link>
        </div>
      </div>
    </main>
  );
}
