import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { Icon } from './icons';

/** Bottom sheet with a dimmed backdrop; the page below stays put. Esc and a backdrop tap close it. */
export function Sheet({ title, onClose, children, footer, tall }: { title: string; onClose(): void; children: ComponentChildren; footer?: ComponentChildren; tall?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div class="scrim" onClick={onClose}>
      <section class={'sheet' + (tall ? ' tall' : '')} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header>
          <span class="grab" />
          <b>{title}</b>
          <button class="icon" aria-label="×" onClick={onClose}><Icon n="close" size={20} /></button>
        </header>
        <div class="body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}
