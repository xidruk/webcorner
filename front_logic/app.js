var savedTheme = localStorage.getItem('kb-theme') || 'dark';
if (savedTheme === 'light') {
  document.body.classList.add('light');
}

var switchWrap = document.getElementById('theme-switch-track');
if (switchWrap) {
  switchWrap.addEventListener('click', function() {
    var isLight = document.body.classList.toggle('light');
    localStorage.setItem('kb-theme', isLight ? 'light' : 'dark');
  });
}

function showPage(pageId, elementId) {
  var pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.add('hidden'));

  var target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
    
    if (elementId) {
      var el = document.getElementById(elementId);
      if (el) {
        window.scrollTo({
          top: el.offsetTop - 80,
          behavior: 'smooth'
        });
        
        el.classList.remove('jump-highlight');
        void el.offsetWidth;
        el.classList.add('jump-highlight');
      }
    } else {
      window.scrollTo(0, 0);
    }
  }

  document.querySelectorAll('.toc-nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('[data-page="' + pageId + '"]').forEach(l => l.classList.add('active'));
}

var clickables = document.querySelectorAll('[data-page]');
for (var c = 0; c < clickables.length; c++) {
  clickables[c].addEventListener('click', function() {
    showPage(this.getAttribute('data-page'));
  });
}

showPage('home');

var footerYear = document.getElementById('footer-year');
if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}
