(function () {
  'use strict';

  var searchIndex = [];
  var overlay     = null;
  var inputEl     = null;
  var resultsEl   = null;
  var selectedIdx = -1;
  var currentRes  = [];
  var isOpen      = false;

  function buildIndex() {
    searchIndex = [];

    // Main Sections (Matches your 7 sidebar links)
    var sections = [
      { pageId: 'home',       elementId: 'page-home',       label: '~ Home',           sublabel: 'Start here -- who is Khalid',                 type: 'section' },
      { pageId: 'about',      elementId: 'page-about',      label: '01 >> About',      sublabel: 'Background, education, skills, contact',      type: 'section' },
      { pageId: 'projects',   elementId: 'page-projects',   label: '02 >> Projects',   sublabel: 'Things Khalid built -- C, systems, tools',    type: 'section' },
      { pageId: 'blog',       elementId: 'page-blog',       label: '03 >> Blog',       sublabel: 'Substack -- math, crypto, linux, philosophy', type: 'section' },
      { pageId: 'learning',   elementId: 'page-learning',   label: '04 >> Learning',   sublabel: 'Public repos used for studying and notes',    type: 'section' },
      { pageId: 'curriculum', elementId: 'page-curriculum', label: '05 >> Curriculum', sublabel: 'Practice projects built while learning',      type: 'section' },
      { pageId: 'lib',        elementId: 'page-lib',        label: '06 >> Lib',        sublabel: 'PDFs, papers, and resources worth keeping',   type: 'section' },
      { pageId: 'media',      elementId: 'page-media',      label: '07 >> Media',      sublabel: 'Gallery, events, and visual archives',        type: 'section' },
    ];

    // Deep-link items (Update these IDs in your HTML to match)
    var items = [
      { pageId: 'about',    elementId: 'tech-skills',    label: 'technical skills',   sublabel: 'C, C++, Python, Linux, Networking',         type: 'item' },
      { pageId: 'about',    elementId: 'edu-table',      label: 'education',          sublabel: 'Academic background',                       type: 'item' },
      { pageId: 'projects', elementId: 'proj-gc',        label: 'garbage-collector',  sublabel: 'Lightweight GC for C, C++, Python',         type: 'item' },
      { pageId: 'projects', elementId: 'proj-hash',      label: 'hash-map',           sublabel: 'Key-value store in C',                      type: 'item' },
      { pageId: 'projects', elementId: 'proj-tree',      label: 'xt3-tree',           sublabel: 'Tree command clone with colors in C',       type: 'item' },
      { pageId: 'learning', elementId: 'learn-net',      label: 'computer-networking',sublabel: 'Notes on networking fundamentals',          type: 'item' },
      { pageId: 'learning', elementId: 'learn-math',     label: 'math-quest',         sublabel: 'Mathematics roadmap project',               type: 'item' },
      { pageId: 'curriculum',elementId: 'curr-42',       label: '1337 / 42 Network',  sublabel: 'Peer-to-peer programming projects',         type: 'item' },
    ];

    for (var i = 0; i < sections.length; i++) searchIndex.push(sections[i]);
    for (var j = 0; j < items.length; j++)    searchIndex.push(items[j]);
  }

  function score(item, q) {
    if (!q) return item.type === 'section' ? 100 : 0;
    var label = item.label.toLowerCase();
    var sub   = item.sublabel.toLowerCase();
    var hay   = label + ' ' + sub;

    if (label === q)         return 1000;
    if (label.startsWith(q)) return 600;
    if (label.includes(q))   return 400;
    if (sub.includes(q))     return 200;
    if (hay.includes(q))     return 100;

    var ci = 0;
    for (var i = 0; i < label.length && ci < q.length; i++) {
      if (label[i] === q[ci]) ci++;
    }
    if (ci === q.length) return 40;

    return 0;
  }

  function doSearch(raw) {
    var q = raw.toLowerCase().trim();
    if (!q) {
      return searchIndex.filter(function(item) { return item.type === 'section'; });
    }
    var scored = [];
    for (var i = 0; i < searchIndex.length; i++) {
      var s = score(searchIndex[i], q);
      if (s > 0) scored.push({ item: searchIndex[i], s: s });
    }
    scored.sort(function(a, b) { return b.s - a.s; });
    return scored.slice(0, 10).map(function(r) { return r.item; });
  }

  function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(text, query) {
    if (!query.trim()) return text;
    try {
      var re = new RegExp('(' + query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return text.replace(re, '<mark>$1</mark>');
    } catch (e) {
      return text;
    }
  }

  function buildOverlay() {
    var el = document.createElement('div');
    el.id = 'lookup-overlay';
    el.innerHTML =
      '<div id="lookup-backdrop"></div>' +
      '<div id="lookup-modal">' +
        '<div id="lookup-header">' +
          '<span id="lookup-icon">&#9906;</span>' +
          '<input id="lookup-input" type="text" autocomplete="off" spellcheck="false" placeholder="type to search or use arrows...">' +
          '<span id="lookup-esc-tag">ESC</span>' +
        '</div>' +
        '<div id="lookup-results"></div>' +
        '<div id="lookup-footer">' +
          '<span class="lk-hint"><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navigate</span>' +
          '<span class="lk-hint"><kbd>&#8629;</kbd> jump to section</span>' +
          '<span class="lk-hint"><kbd>ESC</kbd> close</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(el);
    overlay   = el;
    inputEl   = document.getElementById('lookup-input');
    resultsEl = document.getElementById('lookup-results');

    document.getElementById('lookup-backdrop').addEventListener('click', closeOverlay);
    document.getElementById('lookup-esc-tag').addEventListener('click', closeOverlay);
    inputEl.addEventListener('input', function() { renderResults(doSearch(inputEl.value)); });
    inputEl.addEventListener('keydown', handleInputKey);
  }

  function renderResults(results) {
    currentRes  = results;
    selectedIdx = results.length > 0 ? 0 : -1;
    resultsEl.innerHTML = '';

    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="lk-empty">no results -- try something else</div>';
      return;
    }

    var qRaw = inputEl ? inputEl.value : '';

    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var el   = document.createElement('div');
      el.className = 'lk-result' + (i === 0 ? ' lk-selected' : '');
      
      el.innerHTML =
        '<span class="lk-tag lk-tag-' + item.type + '">' + esc(item.type) + '</span>' +
        '<div class="lk-text">' +
          '<div class="lk-label">' + highlight(esc(item.label), qRaw) + '</div>' +
          (item.sublabel ? '<div class="lk-sublabel">' + esc(item.sublabel) + '</div>' : '') +
        '</div>' +
        '<span class="lk-arrow">&#8594;</span>';

      (function(res) {
        el.addEventListener('click', function() { navigate(res.pageId, res.elementId); });
        el.addEventListener('mouseenter', function() { 
          selectedIdx = results.indexOf(res);
          updateSelectionVisuals();
        });
      })(item);

      resultsEl.appendChild(el);
    }
  }

  function updateSelectionVisuals() {
    var items = resultsEl.querySelectorAll('.lk-result');
    items.forEach(function(el, idx) {
      if (idx === selectedIdx) {
        el.classList.add('lk-selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('lk-selected');
      }
    });
  }

  function handleInputKey(e) {
    if (e.key === 'Escape')    { e.preventDefault(); closeOverlay(); }
    if (e.key === 'ArrowDown') { 
      e.preventDefault(); 
      selectedIdx = Math.min(selectedIdx + 1, currentRes.length - 1);
      updateSelectionVisuals();
    }
    if (e.key === 'ArrowUp')   { 
      e.preventDefault(); 
      selectedIdx = Math.max(selectedIdx - 1, 0);
      updateSelectionVisuals();
    }
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      var target = currentRes[selectedIdx];
      if (target) navigate(target.pageId, target.elementId); 
    }
  }

  function navigate(pageId, elementId) {
    closeOverlay();
    if (typeof showPage === 'function') {
      showPage(pageId, elementId);
    }
  }

  function openOverlay() {
    if (!overlay) buildOverlay();
    buildIndex();
    overlay.classList.add('active');
    isOpen = true;
    document.body.style.overflow = 'hidden';
    inputEl.value = '';
    renderResults(doSearch('')); 
    setTimeout(function() { inputEl.focus(); }, 50);
  }

  function closeOverlay() {
    if (overlay) overlay.classList.remove('active');
    isOpen = false;
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      isOpen ? closeOverlay() : openOverlay();
    }
    if (e.key === 'Escape' && isOpen) closeOverlay();
  });

  document.addEventListener('DOMContentLoaded', function() {
    var trigger = document.getElementById('search-trigger');
    if (trigger) trigger.addEventListener('click', openOverlay);
  });

  window.openLookupBar  = openOverlay;
  window.closeLookupBar = closeOverlay;

})();