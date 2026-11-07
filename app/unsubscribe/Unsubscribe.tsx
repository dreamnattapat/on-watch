'use client';

import { useState, useTransition } from 'react';
import { unsubscribeAction } from '@/app/email-actions';

export function Unsubscribe({ token, kind }: { token: string; kind: 'user' | 'sub' }) {
  const [done, setDone] = useState<null | boolean>(null);
  const [pending, start] = useTransition();
  if (done === true) return <p className="lede" role="status">Done. You won’t get the daily brief any more. {kind === 'user' && 'You can switch it back on in Settings.'}</p>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="lede">You’ll stop getting the morning email. {kind === 'user' ? 'Your account and stocks stay as they are.' : ''}</p>
      {done === false && <p role="alert" className="error">That link didn’t work. It may have been copied incompletely.</p>}
      <button type="button" className="btn solid big" style={{ alignSelf: 'flex-start' }} disabled={pending}
        onClick={() => start(async () => setDone((await unsubscribeAction(token, kind)).ok))}>
        {pending ? 'Unsubscribing…' : 'Yes, unsubscribe'}
      </button>
    </div>
  );
}
