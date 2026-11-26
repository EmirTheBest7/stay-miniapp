import { useRef, useState } from 'preact/hooks';
import { lphoto } from '../data/photos';
import type { Listing } from '../data/types';

/** Swipeable photo strip (CSS scroll-snap), dots, lazy images. */
export function Carousel({ l, count, onTap, eager = false }: { l: Listing; count: number; onTap?: (idx: number) => void; eager?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div class="carousel">
      <div class="strip" ref={ref} onScroll={onScroll}>
        {Array.from({ length: count }, (_, k) => (
          <img key={k} src={lphoto(l, k, 640)} alt="" width={640} height={480} loading={eager || k === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} onClick={() => onTap?.(k)} />
        ))}
      </div>
      {count > 1 && (
        <div class="dots" aria-hidden="true">
          {Array.from({ length: Math.min(count, 5) }, (_, k) => (
            <i key={k} class={k === i ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}
