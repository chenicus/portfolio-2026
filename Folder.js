const darkenColor = (hex, percent) => {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color
      .split('')
      .map(c => c + c)
      .join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

class Folder {
  constructor(container, options = {}) {
    this.container = container;
    this.color = options.color || '#5227FF';
    this.size = options.size || 1;
    this.items = options.items || [];
    this.className = options.className || '';

    this.open = false;
    this.paperOffsets = Array.from({ length: 3 }, () => ({ x: 0, y: 0 }));

    this.init();
  }

  init() {
    this.setupColors();
    this.render();
    this.attachEventListeners();
  }

  setupColors() {
    this.folderBackColor = darkenColor(this.color, 0.16);
    this.paper1 = darkenColor('#ffffff', 0.1);
    this.paper2 = darkenColor('#ffffff', 0.05);
    this.paper3 = '#ffffff';
  }

  render() {
    const wrapper = document.createElement('div');
    wrapper.style.transform = `scale(${this.size})`;
    wrapper.className = this.className;
    wrapper.style.transformOrigin = 'top left';

    const folder = document.createElement('div');
    folder.className = 'folder';
    folder.setAttribute('tabindex', '0');
    folder.setAttribute('role', 'button');
    folder.setAttribute('aria-label', 'Open folder');
    folder.style.setProperty('--folder-color', this.color);
    folder.style.setProperty('--folder-back-color', this.folderBackColor);
    folder.style.setProperty('--paper-1', this.paper1);
    folder.style.setProperty('--paper-2', this.paper2);
    folder.style.setProperty('--paper-3', this.paper3);

    const back = document.createElement('div');
    back.className = 'folder__back';

    // Create papers
    const papers = [...this.items].slice(0, 3);
    while (papers.length < 3) {
      papers.push(null);
    }

    papers.forEach((item, i) => {
      const paper = document.createElement('div');
      paper.className = `paper paper-${i + 1}`;
      paper.dataset.index = i;
      if (item && typeof item === 'object' && item.img) {
        paper.style.display = 'flex';
        paper.style.alignItems = 'center';
        paper.style.justifyContent = 'center';
        const img = document.createElement('img');
        img.src = item.img;
        img.alt = item.alt || '';
        img.style.cssText = 'width:52px;height:52px;object-fit:contain;pointer-events:none;';
        paper.appendChild(img);
      } else if (item) {
        paper.textContent = item;
      }
      back.appendChild(paper);
      this.paperElements = this.paperElements || [];
      this.paperElements[i] = paper;
    });

    const front = document.createElement('div');
    front.className = 'folder__front';

    const frontRight = document.createElement('div');
    frontRight.className = 'folder__front right';

    back.appendChild(front);
    back.appendChild(frontRight);
    folder.appendChild(back);
    wrapper.appendChild(folder);

    this.container.appendChild(wrapper);
    this.folderElement = folder;
    this.paperElements = this.paperElements || Array.from(back.querySelectorAll('.paper'));
  }

  attachEventListeners() {
    this.folderElement.addEventListener('click', () => this.toggleOpen());
    this.folderElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleOpen();
      }
    });

    this.paperElements.forEach((paper, index) => {
      paper.addEventListener('mousemove', (e) => this.handlePaperMouseMove(e, index));
      paper.addEventListener('mouseleave', (e) => this.handlePaperMouseLeave(e, index));
    });
  }

  toggleOpen() {
    this.open = !this.open;
    this.folderElement.classList.toggle('open');
    this.folderElement.setAttribute('aria-expanded', this.open);
    this.folderElement.setAttribute('aria-label', this.open ? 'Close folder' : 'Open folder');

    if (!this.open) {
      this.paperOffsets = Array.from({ length: 3 }, () => ({ x: 0, y: 0 }));
      this.paperElements.forEach(paper => {
        paper.style.setProperty('--magnet-x', '0px');
        paper.style.setProperty('--magnet-y', '0px');
      });
    }
  }

  handlePaperMouseMove(e, index) {
    if (!this.open) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) * 0.15;
    const offsetY = (e.clientY - centerY) * 0.15;

    this.paperOffsets[index] = { x: offsetX, y: offsetY };
    this.paperElements[index].style.setProperty('--magnet-x', `${offsetX}px`);
    this.paperElements[index].style.setProperty('--magnet-y', `${offsetY}px`);
  }

  handlePaperMouseLeave(e, index) {
    this.paperOffsets[index] = { x: 0, y: 0 };
    this.paperElements[index].style.setProperty('--magnet-x', '0px');
    this.paperElements[index].style.setProperty('--magnet-y', '0px');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Folder;
}
