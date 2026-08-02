/**
 * The dot canvases light up under the pointer.
 *
 * Every dot surface on the site paints the pool itself, in a ::after that
 * repeats its own grid in heavier ink and shows it through a soft circle. All
 * this file does is move that circle: it sets --pool-x / --pool-y on the
 * surface, in the surface's own coordinates, and toggles .is-lit as the pointer
 * crosses in and out. Nothing here knows what the grid looks like, so a surface
 * can restyle its dots without touching this.
 *
 * A surface opts in with data-dot-field, whose value names how to find the box
 * the pool is measured in — see BOXES. Shared by index.html and about/, which
 * is why it is a file rather than another inline block: the hero, the footer
 * band and the about page's full-page canvas all want the same behaviour and
 * only differ in where their canvas actually is.
 */
(function () {
  'use strict';

  /* Fine pointers only. There is no hover on a phone, and a pool left wherever
     the last tap landed is worse than no pool at all. Reduced motion opts out
     of the whole thing rather than just the fade — the point of it is something
     that chases the cursor. */
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const BOXES = {
    /* The element is the canvas — its own border box is what the pool is
       measured against. The footer band and the about page's body both work
       this way. */
    self(el) {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + window.scrollX,
        y: r.top + window.scrollY,
        w: r.width,
        h: r.height
      };
    },

    /* The hero's canvas is a pseudo-element deliberately inset outside its own
       frame: back up by the frame's top margin so it reaches the top of the
       page, out to both window edges, and down past the frame's bottom by
       --dots-extend. A pseudo-element has no rect to measure, so the box is
       rebuilt from the frame's own — which is also why --dots-extend is read
       from the root rather than assumed: a script sets it from the height of
       the terminal. */
    hero(el) {
      const r = el.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(el).marginTop) || 0;
      const extend = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--dots-extend')) || 0;
      return {
        x: r.left + window.scrollX + (r.width - window.innerWidth) / 2,
        y: r.top + window.scrollY - top,
        w: window.innerWidth,
        h: top + r.height + extend
      };
    }
  };

  let surfaces = [];

  /* Boxes are kept in document coordinates, so scrolling never invalidates
     them and the pool stays with the canvas rather than riding the viewport. */
  const measure = () => { surfaces.forEach(s => { s.rect = s.box(s.el); }); };

  /* A surface can change size with no resize behind it: the hero's canvas grows
     when the transcript rewraps, and the about page's body grows as its media
     loads. Rebuilt with the surfaces, since the elements it watches are
     replaced on a soft navigation. */
  const sizes = window.ResizeObserver ? new ResizeObserver(() => measure()) : null;

  const collect = () => {
    if (sizes) sizes.disconnect();
    surfaces = [];
    document.querySelectorAll('[data-dot-field]').forEach(el => {
      const box = BOXES[el.dataset.dotField];
      if (!box) return;
      surfaces.push({ el, box, rect: null, lit: false });
      if (sizes) sizes.observe(el);
    });
    measure();
  };

  let queued = false;
  let clientX = -1, clientY = -1;

  const settle = () => {
    queued = false;
    const docX = clientX + window.scrollX;
    const docY = clientY + window.scrollY;

    for (const s of surfaces) {
      const r = s.rect;
      if (!r) continue;
      const x = docX - r.x;
      const y = docY - r.y;
      const inside = x >= 0 && x <= r.w && y >= 0 && y <= r.h;
      if (inside) {
        s.el.style.setProperty('--pool-x', x + 'px');
        s.el.style.setProperty('--pool-y', y + 'px');
      }
      if (inside !== s.lit) {
        s.lit = inside;
        s.el.classList.toggle('is-lit', inside);
      }
    }
  };

  /* Coalesced into one frame: a fast mouse fires pointermove several times per
     paint, and every write here repaints a masked layer. */
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(settle);
  };

  window.addEventListener('pointermove', e => {
    clientX = e.clientX;
    clientY = e.clientY;
    queue();
  }, { passive: true });

  /* Scrolling moves a surface under a pointer that hasn't moved, so the pool
     has to keep up with it — otherwise the footer band slides up under a
     stationary cursor and stays dark. */
  window.addEventListener('scroll', () => {
    if (clientX >= 0) queue();
  }, { passive: true });

  /* Leaving through the edge of the window fires no further moves, so the pool
     would otherwise stay lit wherever it was abandoned. */
  document.addEventListener('pointerleave', () => {
    for (const s of surfaces) {
      if (!s.lit) continue;
      s.lit = false;
      s.el.classList.remove('is-lit');
    }
  });

  collect();
  window.addEventListener('resize', measure, { passive: true });

  /* Home and About swap in place rather than navigating, and the swap replaces
     the whole body — so every surface this is holding is detached the moment
     one happens, and the pool would quietly stop working from the first click
     onwards. The page's inline scripts handle this by re-running against each
     new body under a generation stamp, but an external file is fetched once
     and deliberately not re-executed, so there is nothing to re-run: it has to
     notice the new body itself and pick the surfaces up again. The listeners
     above are all on window or document, which outlive the swap. */
  new MutationObserver(records => {
    for (const r of records) {
      for (const node of r.addedNodes) {
        if (node.nodeName === 'BODY') { collect(); return; }
      }
    }
  }).observe(document.documentElement, { childList: true });
})();
