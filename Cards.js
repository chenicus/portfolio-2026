class Cards {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    this.spring = options.spring || { duration: 0.6, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' };
    this.interaction = options.interaction || 'stack';
    this.variant = options.variant || 'default';
    this.activeScale = options.activeScale || 1.15;
    this.cardSpacing = options.cardSpacing || 180;
    this.spacing = this.cardSpacing;
    this.activeCard = null;
    this.rotationMultiplier = 1.0;
    this.stackDistance = 400;
    this.ySpread = 20;
    this.hoveredCard = null;
    this.soundOn = true;

    this.cards = options.cards || [
      {
        title: "Working Knowledge",
        description: "You have a basic understanding of the topic and can apply it to simple situations.",
        color: "orange",
        bgClass: "card-orange",
      },
      {
        title: "Practical Demonstration",
        description: "You can demonstrate the concept in practice with real-world examples.",
        color: "stone",
        bgClass: "card-stone",
      },
      {
        title: "Collaborate with AI",
        description: "You can effectively work alongside AI tools to enhance your workflow.",
        color: "blue",
        bgClass: "card-blue",
      },
      {
        title: "Means & Methods",
        description: "You understand the various approaches and techniques available.",
        color: "purple",
        bgClass: "card-purple",
      },
      {
        title: "Interface Kit",
        description: "You have the tools and components needed to build interfaces.",
        color: "dark",
        bgClass: "card-dark",
      },
    ];

    this.baseCardConfigs = [
      { y: -20, x: 0, rotate: -15, zIndex: 2 },
      { y: 20, x: 180, rotate: 8, zIndex: 3 },
      { y: -80, x: 360, rotate: -5, zIndex: 4 },
      { y: 20, x: 540, rotate: 12, zIndex: 5 },
      { y: 20, x: 720, rotate: -5, zIndex: 6 },
    ];
    this.cardConfigs = this.baseCardConfigs.map(c => ({ ...c }));

    this.init();
  }

  init() {
    this.render();
    this.setupSlideshows();
    this.setupVisibilityPause();
    this.updateSpacing();
    window.addEventListener('resize', () => this.updateSpacing());
    window.addEventListener('click', (e) => this.handleClickOutside(e));
  }

  // Stop video audio (pause + mute) and collapse the selection when the cards
  // scroll out of view, so sound never keeps playing off-screen.
  setupVisibilityPause() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio >= 0.25) return;
        this.container.querySelectorAll('.card-photo').forEach((cardEl) => {
          const v = cardEl.querySelector('video');
          if (v) {
            v.pause();
            v.muted = true;
            this.updateMuteButton(cardEl, v);
          }
        });
        if (this.activeCard !== null) {
          this.activeCard = null;
          this.updatePositions();
        }
      });
    }, { threshold: [0, 0.25, 0.6] });
    io.observe(this.container);
  }

  // Auto-transition between images for any media card given an `images` array.
  setupSlideshows(interval = 2600) {
    const shows = this.container.querySelectorAll('.card-media[data-slideshow="true"]');
    shows.forEach((show) => {
      const slides = show.querySelectorAll('.card-slide');
      if (slides.length < 2) return;
      let idx = 0;
      setInterval(() => {
        slides[idx].classList.remove('is-active');
        idx = (idx + 1) % slides.length;
        slides[idx].classList.add('is-active');
      }, interval);
    });
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.className = 'cards-wrapper';
    wrapper.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 1200px;
      height: 480px;
      margin: 0 auto;
    `;

    this.cards.forEach((card, index) => {
      const cardEl = document.createElement('button');
      cardEl.className = 'card' + (card.bgClass ? ` ${card.bgClass}` : '');
      cardEl.dataset.index = index;
      cardEl.style.cssText = `
        position: absolute;
        width: var(--card-width);
        height: var(--card-height);
        left: 50%;
        top: 50%;
        margin-left: calc(var(--card-width) / -2);
        margin-top: calc(var(--card-height) / -2);
        border: none;
        border-radius: 20px;
        padding: 16px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-start;
        overflow: hidden;
        transition: all ${this.spring.duration}s ${this.spring.easing};
        z-index: ${this.cardConfigs[index].zIndex};
      `;

      if (this.variant === 'photo') {
        // Media card: white frame, rounded media (image / auto-cycling images /
        // video) up top, tag + title + reveal-on-select description below.
        cardEl.classList.add('card-photo');
        // Override the base card's inline flex/padding so the media fills width.
        cardEl.style.padding = '12px';
        cardEl.style.justifyContent = 'flex-start';
        cardEl.style.alignItems = 'stretch';

        const media = document.createElement('div');
        media.className = 'card-media';

        if (card.video) {
          const video = document.createElement('video');
          video.className = 'card-media-el';
          video.src = card.video;
          // Paused at rest; plays muted on hover, with sound while selected.
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.preload = 'metadata';
          video.setAttribute('muted', '');
          video.setAttribute('playsinline', '');
          media.appendChild(video);

          // Sound toggle (Feather icon). Not a <button> to avoid nesting it
          // inside the card's own <button>.
          const muteBtn = document.createElement('div');
          muteBtn.className = 'card-mute';
          muteBtn.setAttribute('role', 'button');
          muteBtn.setAttribute('tabindex', '0');
          muteBtn.setAttribute('aria-label', 'Toggle sound');
          const toggleMute = (e) => {
            e.stopPropagation();
            video.muted = !video.muted;
            this.soundOn = !video.muted; // remember preference across all cards
            this.updateMuteButton(cardEl, video);
          };
          muteBtn.addEventListener('click', toggleMute);
          muteBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') toggleMute(e);
          });
          media.appendChild(muteBtn);
        } else if (Array.isArray(card.images) && card.images.length) {
          card.images.forEach((src, i) => {
            const slide = document.createElement('img');
            slide.className = 'card-media-el card-slide' + (i === 0 ? ' is-active' : '');
            slide.src = src;
            slide.alt = card.title || '';
            media.appendChild(slide);
          });
          media.dataset.slideshow = 'true';
        } else if (card.image) {
          const img = document.createElement('img');
          img.className = 'card-media-el';
          img.src = card.image;
          img.alt = card.title || '';
          media.appendChild(img);
        }

        const info = document.createElement('div');
        info.className = 'card-info';

        const tag = document.createElement('span');
        tag.className = 'card-tag';
        tag.textContent = card.tag || '';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = card.title;

        const description = document.createElement('p');
        description.className = 'card-description';
        description.textContent = card.description || '';

        info.appendChild(tag);
        info.appendChild(title);
        info.appendChild(description);
        cardEl.appendChild(media);
        cardEl.appendChild(info);
      } else {
        const skeleton = document.createElement('div');
        skeleton.className = 'card-skeleton';
        skeleton.style.cssText = `
          width: 100%;
          height: 120px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
        `;

        const content = document.createElement('div');
        content.style.marginTop = '20px';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = card.title;
        title.style.cssText = `
          font-size: 24px;
          font-weight: 600;
          color: inherit;
          margin: 0;
          max-width: 200px;
          text-align: left;
        `;

        const description = document.createElement('p');
        description.className = 'card-description';
        description.textContent = card.description;
        description.style.cssText = `
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          margin: 12px 0 0 0;
          max-width: 240px;
          text-align: left;
          opacity: 0;
          max-height: 0;
          overflow: hidden;
          transition: opacity ${this.spring.duration}s ${this.spring.easing}, max-height ${this.spring.duration}s ${this.spring.easing};
        `;

        content.appendChild(title);
        content.appendChild(description);
        cardEl.appendChild(skeleton);
        cardEl.appendChild(content);
      }

      cardEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeCard === index) {
          this.activeCard = null;
        } else {
          // Respect the user's sticky sound preference (this.soundOn) instead
          // of resetting it on every selection.
          this.setActive(cardEl, index);
        }
        this.updatePositions();
      });

      cardEl.addEventListener('mouseenter', () => {
        if (this.interaction !== 'shift') return;
        this.hoveredCard = index;
        this.updatePositions();
      });

      cardEl.addEventListener('mouseleave', () => {
        if (this.interaction !== 'shift') return;
        this.hoveredCard = null;
        this.updatePositions();
      });

      wrapper.appendChild(cardEl);
    });

    this.container.innerHTML = '';
    this.container.appendChild(wrapper);
    this.wrapper = wrapper;
    this.cardElements = wrapper.querySelectorAll('.card');
  }

  updateSpacing() {
    const mq = window.matchMedia('(min-width: 1024px)');
    this.spacing = mq.matches ? this.cardSpacing : Math.round(this.cardSpacing * 0.39);
    this.updatePositions();
  }

  setActive(cardEl, index) {
    this.activeCard = index;
    this.updatePositions();
  }

  handleClickOutside(e) {
    // Card and mute-button clicks call stopPropagation, so any click reaching
    // here is genuinely outside the cards — collapse the active card (which
    // also pauses its video).
    if (this.activeCard === null) return;
    this.activeCard = null;
    this.updatePositions();
  }

  updatePositions() {
    if (this.interaction === 'shift') {
      this.updatePositionsShift();
      return;
    }

    const middle = (this.cards.length - 1) / 2;
    const avgY = (this.baseCardConfigs.reduce((sum, cfg) => sum + cfg.y, 0) / this.baseCardConfigs.length);

    this.cardElements.forEach((cardEl, index) => {
      const config = this.cardConfigs[index];
      const offsetX = (index - middle) * this.spacing;
      const isActive = this.activeCard === index;
      const anyActive = this.activeCard !== null;

      let x, y, rotate, scale;

      if (isActive) {
        x = 0;
        y = -avgY;
        rotate = 0;
        scale = this.activeScale;
      } else if (anyActive) {
        x = offsetX * 0.4;
        y = this.stackDistance;
        rotate = 0.2 * config.rotate;
        scale = 0.7;
      } else {
        x = (index - middle) * this.spacing;
        y = config.y;
        rotate = config.rotate;
        scale = 0.75;
      }

      cardEl.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
      cardEl.style.zIndex = config.zIndex;

      // Show/hide description
      const description = cardEl.querySelector('.card-description');
      if (isActive) {
        description.style.opacity = '1';
        description.style.maxHeight = '100px';
      } else {
        description.style.opacity = '0';
        description.style.maxHeight = '0';
      }
    });
  }

  // Variant interaction: the selected card grows in place while its
  // neighbours slide left/right to open up room for it.
  updatePositionsShift() {
    const middle = (this.cards.length - 1) / 2;
    const avgY = (this.baseCardConfigs.reduce((sum, cfg) => sum + cfg.y, 0) / this.baseCardConfigs.length);
    const cardWidth = this.cardElements[0]?.offsetWidth || 300;
    // Extra half-width the expanded card claims, plus a small gap.
    const shiftAmount = (cardWidth * (this.activeScale - 0.75)) / 2 + 40;

    const isMobile = window.innerWidth < 760;
    // Match the container's content width so the card aligns with the 24px
    // page margins. Uses wrapper.offsetWidth (real layout width) rather than
    // window.innerWidth so centering is always correct regardless of DPR.
    const mobileActiveW = isMobile ? Math.max(this.wrapper ? this.wrapper.offsetWidth : window.innerWidth - 48, 260) : null;
    const mobileActiveH = isMobile ? Math.min(Math.round(window.innerHeight * 0.72), 580) : null;

    this.cardElements.forEach((cardEl, index) => {
      const config = this.cardConfigs[index];
      const baseX = (index - middle) * this.spacing;
      const isActive = this.activeCard === index;
      const anyActive = this.activeCard !== null;

      let x, y, rotate, scale;

      if (isActive) {
        if (isMobile) {
          // Override the CSS variables locally on the element — the inline
          // `width: var(--card-width)` and `margin-left: calc(var(--card-width)/-2)`
          // resolve against these, giving us 20px margins on each side.
          cardEl.style.setProperty('--card-width', mobileActiveW + 'px');
          cardEl.style.setProperty('--card-height', mobileActiveH + 'px');
          x = 0;
          y = 0;
          rotate = 0;
          scale = 1.0;
        } else {
          cardEl.style.removeProperty('--card-width');
          cardEl.style.removeProperty('--card-height');
          x = baseX;
          y = -avgY;
          rotate = 0;
          scale = this.activeScale;
        }
      } else {
        cardEl.style.removeProperty('--card-width');
        cardEl.style.removeProperty('--card-height');

        if (anyActive) {
          const dir = index < this.activeCard ? -1 : 1;
          x = baseX + dir * shiftAmount;
          y = config.y;
          rotate = config.rotate;
          scale = 0.7;
        } else {
          x = baseX;
          y = config.y;
          rotate = config.rotate;
          scale = 0.75;
        }
      }

      // Subtle lift on hover (skip the active card, which is already raised).
      if (this.hoveredCard === index && !isActive) {
        y -= 8;
      }

      cardEl.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
      cardEl.style.zIndex = isActive ? 10 : config.zIndex;

      const description = cardEl.querySelector('.card-description');
      if (isActive) {
        description.style.opacity = '1';
        description.style.maxHeight = '120px';
      } else {
        description.style.opacity = '0';
        description.style.maxHeight = '0';
      }

      // Video cards: muted preview on hover, full sound while selected.
      const video = cardEl.querySelector('video');
      if (video) {
        const isHovered = this.hoveredCard === index;
        if (isActive) {
          video.muted = !this.soundOn;
          if (video.paused) video.play().catch(() => {});
        } else if (isHovered) {
          video.muted = true;
          if (video.paused) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
        this.updateMuteButton(cardEl, video);
      }
    });

    // Keep the wrapper tall enough to contain the expanded card on mobile.
    if (this.wrapper) {
      if (isMobile && this.activeCard !== null && mobileActiveH) {
        this.wrapper.style.height = (mobileActiveH + 60) + 'px';
        this.container.style.minHeight = (mobileActiveH + 80) + 'px';
      } else if (isMobile) {
        this.wrapper.style.height = '380px';
        this.container.style.minHeight = '';
      }
    }
  }

  updateMuteButton(cardEl, video) {
    const btn = cardEl.querySelector('.card-mute');
    if (!btn || !window.feather) return;
    const name = video.muted ? 'volume-x' : 'volume-2';
    btn.dataset.state = video.muted ? 'muted' : 'on';
    btn.innerHTML = window.feather.icons[name].toSvg({ width: 18, height: 18 });
  }

  setRotationMultiplier(multiplier) {
    this.rotationMultiplier = multiplier;
    this.cardConfigs = this.baseCardConfigs.map(config => ({
      ...config,
      rotate: config.rotate * multiplier
    }));
    this.updatePositions();
  }

  setStackDistance(distance) {
    this.stackDistance = distance;
    this.updatePositions();
  }

  setActiveScale(scale) {
    this.activeScale = scale;
    this.updatePositions();
  }

  setDefaultSpacing(spacing) {
    this.cardSpacing = spacing;
    this.spacing = spacing;
    this.updatePositions();
  }

  setYSpread(spread) {
    this.ySpread = spread;
    const yValues = [-spread, spread, -spread * 4, spread, spread];
    this.baseCardConfigs = this.baseCardConfigs.map((config, i) => ({
      ...config,
      y: yValues[i] || 0
    }));
    this.cardConfigs = this.baseCardConfigs.map(c => ({
      ...c,
      rotate: c.rotate * this.rotationMultiplier
    }));
    this.updatePositions();
  }

  setBorderRadius(radius) {
    this.cardElements?.forEach(card => {
      card.style.borderRadius = radius + 'px';
    });
  }

  setShadowIntensity(intensity) {
    this.cardElements?.forEach(card => {
      card.style.boxShadow = `0 10px 30px rgba(0, 0, 0, ${0.2 * intensity})`;
    });
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Cards;
}
