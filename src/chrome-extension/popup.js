(function(){
  const movieCountEl = document.getElementById('movieCount');
  const spinnerEl = document.getElementById('spinner');
  const compareBtn = document.getElementById('compareBtn');

  // Update progress
  chrome.runtime.sendMessage({ type: 'GET_PROGRESS' }, response => {
    if (response) {
      movieCountEl.textContent = response.r.toLocaleString();
      spinnerEl.style.display = (response.r >= response.total ? 'none' : 'inline-block');
    }
  });

  // Listen for seeding messages
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'SEED_PROGRESS') {
      movieCountEl.textContent = msg.done.toLocaleString();
      spinnerEl.style.display = 'inline-block';
    } else if (msg.type === 'SEED_COMPLETE') {
      movieCountEl.textContent = msg.done.toLocaleString();
      spinnerEl.style.display = 'none';
    } else if (msg.type === 'SEED_ERROR') {
      movieCountEl.textContent = 'Error';
      spinnerEl.style.display = 'none';
    }
  });

  // Request background to pick a random movie
  chrome.runtime.sendMessage({ type: 'GET_RANDOM' }, response => {
    if (response && response.tconst) {
      compareBtn.href = `https://www.imdb.com/title/${response.tconst}/`;
    }
  });
})();
