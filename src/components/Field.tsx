import { ReactNode } from 'react';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-bold text-ink-900">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

const inputClass =
  'rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} bg-white ${props.className ?? ''}`} />;
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return <span className={`text-xs font-semibold ${over ? 'text-red-500' : 'text-ink-400'}`}>{value.length}/{max}</span>;
}

export function MultiToggle({
  options, values, onChange,
}: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? values.filter((v) => v !== o) : [...values, o])}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${active ? 'bg-mint-500 text-white' : 'border border-ink-200 text-ink-500 hover:bg-ink-50'}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
