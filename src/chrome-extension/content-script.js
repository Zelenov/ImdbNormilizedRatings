(function() {
  function insertNormalized(div, avg) {
    const clone = div.cloneNode(true);
    clone.dataset.testid = 'hero-rating-bar__aggregate-rating__normalized';
    const labelEl = clone.querySelector('.ioCFan'); if (labelEl) labelEl.textContent = 'NORMALIZED';
    const scoreEl = clone.querySelector('.imUuxf'); if (scoreEl) scoreEl.textContent = avg.toFixed(1);
    const linkEl = clone.querySelector('a.ipc-btn'); if (linkEl) linkEl.removeAttribute('href');
    const starEl = clone.querySelector('svg.ipc-icon--star'); if (starEl) starEl.setAttribute('fill', '#00cc66');
    div.parentNode.insertBefore(clone, div.nextSibling);
  }
  function fetchRating(id, cb) {
    // send full 'tt...' id to background
    chrome.runtime.sendMessage({ type: 'GET_RATING', tconst: id }, response => cb(response));
  }
  document.querySelectorAll('[data-testid="hero-rating-bar__aggregate-rating"]').forEach(div => {
    if (!div.nextElementSibling || div.nextElementSibling.dataset.testid !== 'hero-rating-bar__aggregate-rating__normalized') {
      const m = location.pathname.match(/title\/(tt\d+)/);
      if (m) fetchRating(m[1], r => { if (r != null) insertNormalized(div, r.r); });
    }
  });
})();