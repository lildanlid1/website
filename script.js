(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const video = $('#bg-video');
  const track = $('#background-track');
  const welcome = $('#welcome');
  const enter = $('#enter-button');
  const container = $('#profile-container');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  const soundButton = $('#sound-button');
  const soundIcon = $('#sound-icon');
  const volume = $('#volume-slider');
  const audioControl = $('#audio-control');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let activeTab = 'links';
  let targetTab = 'links';
  let stage = 'idle';
  let timer;
  let previousVolume = 0.45;
  let entered = false;

  function updateTime() {
    const now = new Date();
    const tz = 'Pacific/Auckland';
    $('#nz-time').textContent = new Intl.DateTimeFormat('en-NZ', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    $('#nz-date').textContent = new Intl.DateTimeFormat('en-NZ', { timeZone: tz, day: 'numeric', month: 'short', weekday: 'short' }).format(now) + ' · Auckland';
    const zone = new Intl.DateTimeFormat('en-NZ', { timeZone: tz, timeZoneName: 'short' }).formatToParts(now).find(part => part.type === 'timeZoneName');
    $('#nz-zone').textContent = zone?.value || 'NZ';
  }
  updateTime();
  setInterval(updateTime, 15000);

  const names = tabs.map(tab => tab.dataset.tab);
  const validTab = name => names.includes(name) ? name : 'links';
  function reveal(name) {
    panels.forEach(panel => { panel.hidden = panel.id !== `panel-${name}`; });
    container.classList.toggle('has-projects', name === 'projects');
    container.classList.toggle('has-discord', name === 'discord');
    activeTab = name;
  }
  function selectTab(name, options = {}) {
    name = validTab(name);
    targetTab = name;
    tabs.forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (options.updateHash !== false) {
      try { history.replaceState(null, '', `#${name}`); } catch (_) {}
    }
    if (options.instant || reduceMotion.matches) {
      clearTimeout(timer);
      container.classList.remove('is-closing', 'is-opening');
      stage = 'idle';
      reveal(name);
      return;
    }
    if (stage === 'closing' || (activeTab === name && stage === 'idle')) return;
    clearTimeout(timer);
    container.classList.remove('is-opening');
    void container.offsetWidth;
    container.classList.add('is-closing');
    stage = 'closing';
    timer = setTimeout(() => {
      reveal(targetTab);
      container.classList.remove('is-closing');
      container.classList.add('is-opening');
      stage = 'opening';
      timer = setTimeout(() => { container.classList.remove('is-opening'); stage = 'idle'; }, 390);
    }, 235);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      selectTab(tabs[next].dataset.tab);
    });
  });
  function readHash() {
    try { return decodeURIComponent(location.hash.slice(1)).toLowerCase(); } catch (_) { return 'links'; }
  }
  selectTab(readHash(), { updateHash: false, instant: true });
  addEventListener('hashchange', () => selectTab(readHash(), { updateHash: false }));

  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      card.classList.toggle('is-expanded');
    });
    card.addEventListener('keydown', event => {
      if (event.target !== card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.classList.toggle('is-expanded');
      }
    });
  });

  const audioFiles = Array.from({ length: 15 }, (_, i) => `assets/music/${String(i + 1).padStart(2, '0')}.part`);
  let musicReady = Promise.resolve(true);
  if (location.protocol !== 'file:') {
    track.removeAttribute('src');
    track.load();
    musicReady = Promise.all(audioFiles.map(async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Audio unavailable: ${response.status}`);
      return response.arrayBuffer();
    })).then(parts => {
      track.src = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }));
      track.load();
      return true;
    }).catch(() => {
      soundButton.title = 'Music failed to load';
      return false;
    });
  }

  video.muted = true;
  function setVolume(value) {
    const level = Math.max(0, Math.min(100, Number(value) || 0));
    track.volume = level / 100;
    track.muted = level === 0;
    if (level > 0) previousVolume = level / 100;
    volume.value = String(level);
    volume.style.setProperty('--level', `${level}%`);
    const muted = level === 0;
    soundIcon.setAttribute('href', muted ? '#icon-muted' : '#icon-volume');
    soundButton.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    soundButton.setAttribute('aria-pressed', String(!muted));
    if (entered && !muted && track.paused) track.play().catch(() => {});
  }
  setVolume(45);
  volume.addEventListener('input', () => setVolume(volume.value));
  soundButton.addEventListener('click', () => {
    if (matchMedia('(hover: none)').matches && !audioControl.classList.contains('is-expanded')) {
      audioControl.classList.add('is-expanded');
      return;
    }
    setVolume(track.muted ? Math.max(1, Math.round(previousVolume * 100)) : 0);
  });
  document.addEventListener('pointerdown', event => {
    if (!audioControl.contains(event.target)) audioControl.classList.remove('is-expanded');
  });
  audioControl.addEventListener('keydown', event => {
    if (event.key === 'Escape') { audioControl.classList.remove('is-expanded'); soundButton.focus(); }
  });
  track.addEventListener('error', () => {
    soundButton.title = 'Music file could not be loaded';
  });

  function dismissWelcome() {
    if (entered) return;
    entered = true;
    welcome.classList.add('is-gone');
    welcome.setAttribute('aria-hidden', 'true');
    setVolume(45);
    musicReady.then(ready => { if (ready && !track.muted) track.play().catch(() => {}); });
    video.play().catch(() => {});
    const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    selected?.focus({ preventScroll: true });
    setTimeout(() => { welcome.hidden = true; }, 470);
  }
  enter.addEventListener('click', dismissWelcome);
  welcome.addEventListener('click', event => { if (event.target === welcome) dismissWelcome(); });
})();
