import { LISTINGS } from '../data/mock';
import { LANGS, type Lang } from '../i18n';
import { useCtx, useT } from '../ctx';
import { addToHomeScreen, inTelegram } from '../tg';
import { Card } from '../ui/Card';
import { Chip, Empty } from '../ui/bits';
import { Icon } from '../ui/icons';

export function Favs() {
  const { favs, toast } = useCtx();
  const t = useT();
  const items = LISTINGS.filter((l) => favs.includes(l.id));
  return (
    <div class="scroll">
      <h1 class="pg">{t('fav.title')}</h1>
      {items.length === 0 ? <Empty title={t('fav.empty')} sub={t('fav.empty.sub')} icon="heart" /> : (
        <>
          <button class="btn ghost wide" onClick={() => toast('🔔 ' + t('fav.alert'))}><Icon n="chat" size={16} /> {t('fav.alert')}</button>
          {items.map((l) => <Card key={l.id} l={l} eager />)}
        </>
      )}
    </div>
  );
}

export function Messages() {
  const t = useT();
  return <div class="scroll"><h1 class="pg">{t('m.title')}</h1><Empty title={t('m.empty')} sub={t('m.empty.sub')} icon="chat" /></div>;
}

export function Profile() {
  const { lang, setLang } = useCtx();
  const t = useT();
  const names: Record<Lang, string> = { ru: 'Русский', cs: 'Čeština', en: 'English', uk: 'Українська' };
  return (
    <div class="scroll">
      <h1 class="pg">{t('p.title')}</h1>
      <section class="grp"><h4>{t('p.lang')}</h4><div class="chips wrap">{LANGS.map((l) => <Chip key={l} on={l === lang} onClick={() => setLang(l)}>{names[l]}</Chip>)}</div></section>
      <section class="grp list">
        <button class="lrow"><span>{t('p.data')}</span><Icon n="right" size={18} /></button>
        <button class="lrow"><span>{t('p.privacy')}</span><Icon n="right" size={18} /></button>
        {inTelegram() && <button class="lrow" onClick={addToHomeScreen}><span>{t('p.home')}</span><Icon n="right" size={18} /></button>}
      </section>
      <p class="hint center">{t('proto')} · {__BUILD_ID__.slice(0, 7)}</p>
    </div>
  );
}
