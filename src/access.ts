import { write } from './api';
import { requestWriteAccess } from './tg';

/** Telegram only lets the bot write first after the person allowed it: ask (native dialog), then tell the server. */
export async function ensureWriteAccess(): Promise<void> {
  if (await requestWriteAccess()) await write('me/write_access', {}).catch(() => {});
}
