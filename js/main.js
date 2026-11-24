/* ==========================================================================
   Jack Hardman – site scripts
   1. Fit-text  – sizes the big JACK HARDMAN headings to fill their width
   2. Slider    – looping, auto-playing, swipeable image strip
   ========================================================================== */

/* --- 1. Fit text ----------------------------------------------------------- */
(function () {
  const items = document.querySelectorAll('.fit-text');

  function fit(el) {
    const inner = el.firstElementChild;
    const target = el.clientWidth;
    if (!inner || !target) return;
    el.style.fontSize = '100px';
    const natural = inner.getBoundingClientRect().width;
    if (natural) el.style.fontSize = (target / natural) * 100 + 'px';
  }

  function fitAll() { items.forEach(fit); }

  fitAll();
  window.addEventListener('resize', fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
})();


/* --- 2. Slider ------------------------------------------------------------- */
(function () {
  const DRAG_THRESHOLD = 40;   // px of horizontal drag needed to change slide

  class Slider {
    constructor(root) {
      this.root = root;
      this.track = root.querySelector('.slider__track');
      this.delay = parseInt(root.dataset.autoplay, 10) || 4000;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const originals = Array.from(this.track.children);
      this.count = originals.length;

      // Three copies of the slides (before / real / after) so the strip can loop forever.
      const before = originals.map(img => this.clone(img));
      const after  = originals.map(img => this.clone(img));
      this.track.prepend(...before);
      this.track.append(...after);
      this.slides = Array.from(this.track.children);

      this.index = this.count;   // first real slide
      this.timer = null;
      this.startX = null;
      this.dragX = 0;

      this.bind();
      this.render(false);
      this.play();
    }

    clone(img) {
      const copy = img.cloneNode(true);
      copy.alt = '';
      copy.setAttribute('aria-hidden', 'true');
      return copy;
    }

    /* Move the strip so the active slide sits in the middle of the viewport */
    offsetFor(index) {
      const slide = this.slides[index];
      return this.root.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
    }

    render(animate = true, extra = 0) {
      this.track.classList.toggle('no-transition', !animate);
      this.track.style.transform = `translate3d(${this.offsetFor(this.index) + extra}px,0,0)`;
      if (!animate) void this.track.offsetWidth;   // flush so the next change can animate
    }

    go(step) {
      this.index += step;
      this.render(true);
    }

    /* After a slide finishes, jump back into the middle copy without animating */
    settle() {
      if (this.index >= this.count * 2) this.index -= this.count;
      else if (this.index < this.count)  this.index += this.count;
      else return;
      this.render(false);
    }

    play() {
      if (this.reduceMotion) return;
      this.stop();
      this.timer = setInterval(() => this.go(1), this.delay);
    }

    stop() { clearInterval(this.timer); this.timer = null; }

    bind() {
      const root = this.root;

      this.track.addEventListener('transitionend', e => {
        if (e.target === this.track) this.settle();
      });

      window.addEventListener('resize', () => { this.settle(); this.render(false); });

      // Pause while the pointer is over the slider or it has keyboard focus
      root.addEventListener('mouseenter', () => this.stop());
      root.addEventListener('mouseleave', () => { if (this.startX === null) this.play(); });
      root.addEventListener('focusin', () => this.stop());
      root.addEventListener('focusout', () => this.play());

      // Don't animate in background tabs
      document.addEventListener('visibilitychange', () => {
        document.hidden ? this.stop() : this.play();
      });

      // Keyboard
      root.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.go(1); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); this.go(-1); }
      });

      // Drag / swipe (mouse, touch and pen)
      root.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        this.settle();
        this.startX = e.clientX;
        this.dragX = 0;
        this.moved = false;
        this.stop();
      });

      root.addEventListener('pointermove', e => {
        if (this.startX === null) return;
        this.dragX = e.clientX - this.startX;
        if (Math.abs(this.dragX) > 5 && !this.moved) {
          this.moved = true;
          root.classList.add('is-dragging');
          root.setPointerCapture(e.pointerId);
        }
        if (this.moved) this.render(false, this.dragX);
      });

      const end = () => {
        if (this.startX === null) return;
        const dx = this.dragX;
        this.startX = null;
        root.classList.remove('is-dragging');
        if (this.moved) {
          if (dx <= -DRAG_THRESHOLD)     this.go(1);
          else if (dx >= DRAG_THRESHOLD) this.go(-1);
          else                           this.render(true);
        }
        if (!root.matches(':hover') && !root.matches(':focus-within')) this.play();
      };
      root.addEventListener('pointerup', end);
      root.addEventListener('pointercancel', end);

      // Click a neighbouring image to bring it to the centre
      this.track.addEventListener('click', e => {
        if (this.moved) { this.moved = false; return; }
        const slide = e.target.closest('img');
        if (!slide) return;
        const i = this.slides.indexOf(slide);
        if (i !== this.index) { this.index = i; this.render(true); }
      });
    }
  }

  document.querySelectorAll('.slider').forEach(el => new Slider(el));
})();
