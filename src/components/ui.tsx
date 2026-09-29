import { AnimatePresence, motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Composants de base du design system (maquette §3).

type GlassProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  radius?: number;
  padding?: number | string;
  onClick?: () => void;
  as?: 'div' | 'button' | 'section';
  ariaLabel?: string;
  disabled?: boolean;
};

export function GlassCard({ children, className = '', style, radius, padding, onClick, as = 'div', ariaLabel, disabled }: GlassProps) {
  const s: CSSProperties = { ...style };
  if (radius !== undefined) s.borderRadius = radius;
  if (padding !== undefined) s.padding = padding;
  const Tag = as;
  return (
    <Tag
      className={`glass ${className}`}
      style={s}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={as === 'button' ? disabled : undefined}
      type={as === 'button' ? 'button' : undefined}
    >
      {children}
    </Tag>
  );
}

export function LargeHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <header className="large-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="large-title">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export interface HaloSpec {
  size: number;
  color: string;
  top: number;
  left?: number;
  right?: number;
}

export function BackgroundGlow({ halos }: { halos: HaloSpec[] }) {
  return (
    <div className="halos" aria-hidden>
      {halos.map((h, i) => (
        <div
          key={i}
          className="halo"
          style={{
            width: h.size,
            height: h.size,
            top: h.top,
            left: h.left,
            right: h.right,
            background: `radial-gradient(circle, ${h.color} 0%, transparent 69%)`,
          }}
        />
      ))}
    </div>
  );
}

export function SegmentedGlass<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);
  const idx = options.findIndex((o) => o.value === value);
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelectorAll('button')[idx] as HTMLButtonElement | undefined;
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [idx, options.length]);
  return (
    <div ref={ref} className="glass segmented" role="tablist" aria-label={ariaLabel}>
      {ind && <div className="segmented-indicator" style={{ left: ind.left, width: ind.width }} />}
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'is-active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
  small,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <button type="button" className={`chip ${small ? 'sm' : ''} ${active ? 'is-active' : ''}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  );
}

export function ProgressBar({
  value,
  color,
  gradient,
  large,
  glow,
}: {
  value: number;
  color?: string;
  gradient?: boolean;
  large?: boolean;
  glow?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`progress ${large ? 'lg' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`progress-fill ${gradient ? 'gradient' : ''}`}
        style={{
          width: `${pct}%`,
          background: gradient ? undefined : color,
          boxShadow: glow ? `0 0 10px ${glow}` : undefined,
        }}
      />
    </div>
  );
}

export function Alert({ level = 'info', children, icon }: { level?: 'info' | 'warning' | 'danger'; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className={`alert ${level}`} role={level === 'danger' ? 'alert' : undefined}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

// ---------- Feuille (bottom sheet) ----------

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  full,
  headerRight,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  full?: boolean;
  headerRight?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className={`sheet ${full ? 'full' : ''}`}
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            <SheetGrabber />
            <div className="sheet-header">
              <div className="h2-large">{title}</div>
              <div className="row">
                {headerRight}
                <button className="round-btn" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="sheet-body">{children}</div>
            {footer && <div className="sheet-footer">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SheetGrabber() {
  return <div className="sheet-grabber" aria-hidden />;
}

// ---------- Toasts ----------

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string } | null>(null);
  const show = useCallback((text: string) => setMsg({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {createPortal(
        <AnimatePresence>
          {msg && (
            <motion.div
              key={msg.id}
              className="glass toast"
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              role="status"
            >
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

// ---------- Champs numériques ----------

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 'any',
  min,
  max,
  placeholder,
  inputMode = 'decimal',
}: {
  label?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  step?: number | 'any';
  min?: number;
  max?: number;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric';
}) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value).replace('.', ','));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value === null || value === undefined ? '' : String(value).replace('.', ','));
    }
  }, [value]);
  const input = (
    <div className="input-group">
      <input
        className="input num"
        inputMode={inputMode}
        value={text}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        aria-label={label}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,-]/g, '');
          setText(t);
          const n = Number(t.replace(',', '.'));
          const v = t.trim() === '' || Number.isNaN(n) ? null : n;
          last.current = v;
          onChange(v);
        }}
        onFocus={(e) => e.target.select()}
      />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
  );
  if (!label) return input;
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {input}
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function useConfirm() {
  return useCallback((message: string) => window.confirm(message), []);
}
