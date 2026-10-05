/**
 * Shared controls, ported from the voting site's src/components/ui.tsx so the admin panel
 * here and the admin panel there feel like one product. Trimmed to what this app uses,
 * and with the status chip (a voting-only concept) dropped.
 */
import type { ButtonHTMLAttributes, ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '../lib/cn';

export { cn };

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  busy?: boolean;
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'wood-bright text-carve border-night shadow-[inset_0_3px_0_rgba(255,244,200,0.6),0_5px_0_#000,0_0_26px_rgba(255,190,60,0.45)]',
  outline: 'bg-bark text-gold border-gold/70 shadow-[0_5px_0_#1e0c04]',
  ghost: 'bg-transparent text-cream-mute border-transparent hover:text-gold',
  danger: 'bg-bark text-[#ff8a72] border-[#ff5a46]/60 shadow-[0_5px_0_#1e0c04]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  busy = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'press inline-flex items-center justify-center gap-2 rounded-plank border-[3px] font-display',
        'disabled:cursor-not-allowed disabled:border-night disabled:bg-none disabled:bg-[#4a2e18]',
        'disabled:text-[#7a5a3a] disabled:shadow-none',
        size === 'lg' && 'min-h-14 px-7 text-[22px]',
        size === 'md' && 'min-h-11 px-5 text-[17px]',
        size === 'sm' && 'min-h-9 px-3 text-[14px]',
        VARIANTS[variant],
        className,
      )}
      disabled={disabled || busy}
      {...rest}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}

/* ── Form fields ─────────────────────────────────────────────────────────── */

// ComponentPropsWithRef, so React 19 can pass `ref` straight through as a prop.
type FieldProps = ComponentPropsWithRef<'input'> & {
  label: string;
  hint?: ReactNode;
};

export function Field({ label, hint, id, className, ...rest }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-extrabold text-cream-dim">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'min-h-12 w-full rounded-xl border-2 border-bark-line bg-[#2a1206] px-4 text-base font-bold text-cream',
          'placeholder:text-cream-mute/50 focus:border-gold focus:outline-none',
          className,
        )}
        {...rest}
      />
      {hint && <p className="text-xs font-semibold text-cream-mute">{hint}</p>}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-gold-bright"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-extrabold text-cream">{label}</span>
        {hint && <span className="text-xs font-semibold text-cream-mute">{hint}</span>}
      </span>
    </label>
  );
}

/* ── Notices ─────────────────────────────────────────────────────────────── */

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 rounded-xl border-2 border-[#ff5a46]/50 bg-[#3a1108] px-4 py-3 text-sm font-bold text-[#ffb3a3]"
    >
      {children}
    </p>
  );
}

export function WarnNote({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-xl border-2 border-gold/40 bg-[#33200a] px-4 py-3 text-sm font-bold text-gold">
      {children}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border-2 border-dashed border-gold/25 bg-night/70 px-6 py-12 text-center">
      <h2 className="font-display text-2xl text-gold">{title}</h2>
      {children && (
        <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-cream-dim">{children}</p>
      )}
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────
   Inline strokes rather than an icon package or emoji. */

type IconProps = { className?: string };

export const PlusIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const TrashIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CopyIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M15 5H6a1 1 0 00-1 1v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const DragIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <g fill="currentColor">
      <circle cx="9" cy="6" r="1.6" />
      <circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="15" cy="18" r="1.6" />
    </g>
  </svg>
);

export const CameraIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M4 8.5A2.5 2.5 0 016.5 6h.8a2 2 0 001.7-1l.4-.6A1 1 0 0110.3 4h3.4a1 1 0 01.9.5l.4.6a2 2 0 001.7 1h.8A2.5 2.5 0 0120 8.5v8A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5v-8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const WarnIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path
      d="M12 4l9 16H3l9-16z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1" fill="currentColor" />
  </svg>
);
