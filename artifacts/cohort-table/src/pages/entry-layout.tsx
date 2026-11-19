import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import './entry.css';

export function EntryHeader({ action, showCurie = false }: { action?: ReactNode; showCurie?: boolean }) {
  return (
    <header className={showCurie ? 'entry-header entry-header-curie' : 'entry-header'}>
      <div className="entry-identity">
        <BrandLogo className="entry-logo" />
        {!showCurie && <span className="entry-product">Cohort Table</span>}
      </div>
      {showCurie && <span className="entry-curie"><span>/curie</span></span>}
      {action}
    </header>
  );
}

export function EntryCover({ ta = false }: { ta?: boolean }) {
  return (
    <div className="entry-cover">
      <h1 className={ta ? 'entry-ta-title' : undefined}>
        {ta ? <>TA <span>sign-in.</span></> : <>Pull up<br /><span>a chair.</span></>}
      </h1>
      <div className="entry-cover-art" aria-hidden="true">
        <div className="entry-chat">
          <span /><span /><span />
        </div>
        <div className="entry-pixels" />
        <img className="entry-ting" src={`${import.meta.env.BASE_URL}brand/ting.png`} alt="" />
      </div>
    </div>
  );
}
