(function () {
  const triggers = document.querySelectorAll(
    '.case-figure .case-shot img, .case-shot-scroll img'
  );
  if (!triggers.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.innerHTML =
    '<button class="lightbox-close" aria-label="Close">×</button><img alt="" />';
  document.body.appendChild(overlay);

  const lbImg = overlay.querySelector('img');

  function open(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  triggers.forEach((img) => {
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      open(img.currentSrc || img.src, img.alt);
    });
  });

  overlay.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
})();
