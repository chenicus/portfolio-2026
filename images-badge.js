class ImagesBadge {
  constructor(container, options = {}) {
    this.container = container;
    this.text = options.text || '';
    this.images = options.images || [];
    this.href = options.href || null;
    this.target = options.target || null;
    this.folderSize = options.folderSize || { width: 32, height: 24 };
    this.teaserImageSize = options.teaserImageSize || { width: 20, height: 14 };
    this.hoverImageSize = options.hoverImageSize || { width: 48, height: 32 };
    this.hoverTranslateY = options.hoverTranslateY || -35;
    this.hoverSpread = options.hoverSpread || 20;
    this.hoverRotation = options.hoverRotation || 15;

    this.isHovered = false;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const displayImages = this.images.slice(0, 3);
    const tabWidth = this.folderSize.width * 0.375;
    const tabHeight = this.folderSize.height * 0.25;

    const wrapper = document.createElement(this.href ? 'a' : 'div');
    wrapper.className = 'images-badge-wrapper';
    if (this.href) {
      wrapper.href = this.href;
      if (this.target) wrapper.target = this.target;
      if (this.target === '_blank') wrapper.rel = 'noopener noreferrer';
    }

    // Folder Container
    const folderContainer = document.createElement('div');
    folderContainer.className = 'images-badge-folder-container';
    folderContainer.style.width = this.folderSize.width + 'px';
    folderContainer.style.height = this.folderSize.height + 'px';

    // Folder Back
    const folderBack = document.createElement('div');
    folderBack.className = 'images-badge-folder-back';

    // Folder Tab
    const folderTab = document.createElement('div');
    folderTab.className = 'images-badge-folder-tab';
    folderTab.style.width = tabWidth + 'px';
    folderTab.style.height = tabHeight + 'px';
    folderBack.appendChild(folderTab);

    // Folder Front
    const folderFront = document.createElement('div');
    folderFront.className = 'images-badge-folder-front';

    // Folder line detail
    const folderLine = document.createElement('div');
    folderLine.className = 'images-badge-folder-line';
    folderFront.appendChild(folderLine);

    // Images
    displayImages.forEach((image, index) => {
      const imageEl = document.createElement('div');
      imageEl.className = 'images-badge-image';
      imageEl.setAttribute('data-index', index);
      imageEl.style.backgroundImage = `url('${image}')`;
      folderContainer.appendChild(imageEl);
    });

    folderContainer.appendChild(folderBack);
    folderContainer.appendChild(folderFront);

    // Text
    const text = document.createElement('span');
    text.className = 'images-badge-text';
    text.textContent = this.text;

    wrapper.appendChild(folderContainer);
    wrapper.appendChild(text);
    this.container.appendChild(wrapper);

    this.wrapper = wrapper;
    this.images_elements = folderContainer.querySelectorAll('.images-badge-image');
  }

  attachEventListeners() {
    this.wrapper.addEventListener('mouseenter', () => this.handleHover(true));
    this.wrapper.addEventListener('mouseleave', () => this.handleHover(false));
  }

  handleHover(isHovered) {
    this.isHovered = isHovered;
    const displayImages = this.images.slice(0, 3);
    const totalImages = displayImages.length;

    this.images_elements.forEach((imgEl, index) => {
      const baseRotation =
        totalImages === 1
          ? 0
          : totalImages === 2
            ? (index - 0.5) * this.hoverRotation
            : (index - 1) * this.hoverRotation;

      const hoverY = this.hoverTranslateY - (totalImages - 1 - index) * 3;
      const hoverX =
        totalImages === 1
          ? 0
          : totalImages === 2
            ? (index - 0.5) * this.hoverSpread
            : (index - 1) * this.hoverSpread;

      const teaseY = -20 - (totalImages - 1 - index) * 1;
      const teaseRotation =
        totalImages === 1 ? 0 : totalImages === 2 ? (index - 0.5) * 3 : (index - 1) * 3;

      if (isHovered) {
        imgEl.style.width = this.hoverImageSize.width + 'px';
        imgEl.style.height = this.hoverImageSize.height + 'px';
        imgEl.style.transform = `translate(calc(-50% + ${hoverX}px), ${hoverY}px) rotate(${baseRotation}deg)`;
      } else {
        imgEl.style.width = this.teaserImageSize.width + 'px';
        imgEl.style.height = this.teaserImageSize.height + 'px';
        imgEl.style.transform = `translate(-50%, ${teaseY}px) rotate(${teaseRotation}deg)`;
      }
    });

    const folderFront = this.wrapper.querySelector('.images-badge-folder-front');
    if (isHovered) {
      folderFront.classList.add('hovered');
    } else {
      folderFront.classList.remove('hovered');
    }
  }
}
