import { useState } from 'preact/hooks';
import { write } from '../api';
import { useCtx, useT } from '../ctx';
import { errText } from '../err';
import { haptic, openInvoice } from '../tg';
import { Sheet } from '../ui/Sheet';

/** Shown ONLY after the server answers 402 payment_required, which it never does while the payments flag is off. Stars only (Telegram's rule for digital services). */
export default function PaySheet({ listingId, price, onPaid, onClose }: { listingId: number; price: string; onPaid(): void; onClose(): void }) {
  const t = useT();
  const { toast } = useCtx();
  const [busy, setBusy] = useState(false);
  const pay = async (): Promise<void> => {
    setBusy(true);
    try {
      const o = await write<{ invoice_link: string | null }>('order/create', { provider: 'stars', listing_id: listingId });
      if (!o.invoice_link) { toast(t('pay.failed')); setBusy(false); return; }
      const r = await openInvoice(o.invoice_link);
      if (r === 'paid') { haptic.success(); onPaid(); } else { if (r !== 'cancelled') toast(t('pay.failed')); setBusy(false); }
    } catch (e) { toast(errText(t, e)); setBusy(false); }
  };
  return (
    <Sheet title={t('pay.title')} onClose={onClose} footer={<div class="foot"><button class="btn primary grow" disabled={busy} onClick={pay}>{t('pay.stars')}</button></div>}>
      <div class="ct">
        <p><b>{t('pay.price', { n: price })}</b></p>
        <p class="hint">{t('pay.consent')}</p>
        <p class="hint">{t('pay.agency')}</p>
      </div>
    </Sheet>
  );
}
