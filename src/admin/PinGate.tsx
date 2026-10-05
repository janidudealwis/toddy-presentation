import { useEffect, useState } from 'react';
import { Button, ErrorNote } from '../components/ui';

/**
 * An optional PIN on /admin, off by default.
 *
 * It is worth being blunt about what this is: the whole app is client-side, so the deck is
 * readable in devtools whatever this says. It stops someone walking past an unlocked laptop
 * from reordering the show, and nothing more. The UI says so rather than implying security it
 * does not have — a lock that overstates itself is worse than no lock.
 */

const PIN_KEY = 'toddy.admin.pin';
const UNLOCKED_KEY = 'toddy.admin.unlocked';

async function hash(pin: string) {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<string | null>(() => localStorage.getItem(PIN_KEY));
  // Per-tab, so closing the tab re-locks but navigating inside it does not re-prompt.
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCKED_KEY) === '1');

  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unlocked) sessionStorage.setItem(UNLOCKED_KEY, '1');
  }, [unlocked]);

  if (stored && !unlocked) {
    return (
      <div className="grid min-h-dvh place-items-center bg-night px-4">
        <form
          className="grid w-full max-w-sm gap-4 rounded-card border-2 border-bark-line bg-[#241005] p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              if ((await hash(entry)) === stored) {
                setUnlocked(true);
                setError(null);
              } else {
                setError('That PIN does not match.');
              }
              setEntry('');
            })();
          }}
        >
          <h1 className="font-display text-2xl text-gold">Admin PIN</h1>

          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="PIN"
            className="min-h-12 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-4 text-center text-xl font-bold tracking-[6px] text-cream placeholder:tracking-normal placeholder:text-cream-mute/50 focus:border-gold focus:outline-none"
          />

          {error && <ErrorNote>{error}</ErrorNote>}

          <Button type="submit" disabled={!entry}>
            Unlock
          </Button>

          <button
            type="button"
            onClick={() => {
              if (confirm('Remove the PIN? The admin panel will open without one.')) {
                localStorage.removeItem(PIN_KEY);
                setStored(null);
                setUnlocked(true);
              }
            }}
            className="text-xs font-bold text-cream-mute underline-offset-2 hover:text-gold hover:underline"
          >
            Forgotten it? Remove the PIN
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      {children}
      <PinSettings stored={stored} onChange={setStored} />
    </>
  );
}

function PinSettings({
  stored,
  onChange,
}: {
  stored: string | null;
  onChange: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');

  return (
    <div className="mx-auto max-w-[1600px] px-6 pb-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-bold text-cream-mute underline-offset-2 hover:text-gold hover:underline"
      >
        {stored ? 'PIN is on' : 'PIN is off'} — {open ? 'hide' : 'change'}
      </button>

      {open && (
        <div className="mt-3 grid max-w-md gap-3 rounded-2xl border-2 border-bark-line bg-[#241005] p-4">
          <p className="m-0 text-xs font-semibold leading-relaxed text-cream-mute">
            This only stops casual access. The app runs entirely in the browser, so anyone with
            the laptop and devtools can read the deck regardless.
          </p>

          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={stored ? 'New PIN' : 'Set a PIN'}
            className="min-h-11 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-3 font-bold text-cream placeholder:text-cream-mute/50 focus:border-gold focus:outline-none"
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pin.length < 4}
              onClick={() => {
                void (async () => {
                  localStorage.setItem(PIN_KEY, await hash(pin));
                  sessionStorage.setItem('toddy.admin.unlocked', '1');
                  onChange(await hash(pin));
                  setPin('');
                  setOpen(false);
                })();
              }}
            >
              {stored ? 'Change PIN' : 'Set PIN'}
            </Button>

            {stored && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  localStorage.removeItem(PIN_KEY);
                  onChange(null);
                }}
              >
                Turn off
              </Button>
            )}
          </div>
          <p className="m-0 text-xs font-semibold text-cream-mute">At least 4 characters.</p>
        </div>
      )}
    </div>
  );
}
