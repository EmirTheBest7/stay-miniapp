import { render } from 'preact';
import './styles.css';
import { App } from './app';
import { applyTheme, watchTheme } from './theme';
import { readyAndExpand } from './tg';
import { installFakeTelegram } from './dev/fakeTelegram';

const q = new URLSearchParams(location.search);
if (q.get('fake') && !window.Telegram?.WebApp?.initData) installFakeTelegram(q.get('fake') as string, q.get('theme') === 'dark' ? 'dark' : 'light');
else if (q.get('theme') === 'dark') document.documentElement.dataset.force = 'dark';

readyAndExpand();
applyTheme();
watchTheme();
render(<App />, document.getElementById('app')!);
