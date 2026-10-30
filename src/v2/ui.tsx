import { useEffect, useRef, type ReactNode } from 'react';
import { IconX, IconUsers, IconArrowRight } from '@tabler/icons-react';

export type Tone = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'gray';
export function StatusBadge({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`v2-badge ${tone}`}>{children}</span>;
}
export function Avatar({ name, color = 'blue', small = false }: { name: string; color?: string; small?: boolean }) {
  return <span className={`v2-avatar ${color} ${small ? 'small' : ''}`} aria-hidden="true">{name.slice(-2)}</span>;
}
export function PageHeader({ title, description, eyebrow, actions }: { title: string; description?: string; eyebrow?: string; actions?: ReactNode }) {
  return <header className="v2-page-header"><div>{eyebrow && <p className="v2-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="v2-header-actions">{actions}</div>}</header>;
}
export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: { label: string; onClick: () => void }; icon?: ReactNode }) {
  return <div className="v2-empty"><span className="v2-empty-icon">{icon || <IconUsers size={26} />}</span><h3>{title}</h3><p>{description}</p>{action && <button className="v2-button secondary" onClick={action.onClick}>{action.label}<IconArrowRight size={16} /></button>}</div>;
}
export function Dialog({ title, label, description, onClose, children, error }: { title: string; label?: string; description?: string; onClose: () => void; children: ReactNode; error?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
  return <dialog ref={ref} className="v2-dialog" aria-label={label || title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button className="v2-icon-button" aria-label="关闭弹窗" onClick={onClose}><IconX size={20} /></button></header><div className="v2-dialog-body">{children}{error && <p className="v2-form-error" role="alert">{error}</p>}</div></dialog>;
}
export function HighlightText({ text, quote }: { text: string; quote?: string }) {
  const index = quote ? text.indexOf(quote) : -1;
  if (!quote || index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark className="v2-highlight">{quote}</mark>{text.slice(index + quote.length)}</>;
}
