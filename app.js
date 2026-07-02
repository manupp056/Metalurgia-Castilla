// ===================== Mobile nav toggle =====================
(function () {
  const toggle = document.getElementById('navToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('navOverlay');

  function closeNav() {
    sidebar.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    overlay.classList.remove('visible');
  }

  function openNav() {
    sidebar.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    overlay.classList.add('visible');
  }

  toggle.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  overlay.addEventListener('click', closeNav);

  document.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });
})();

// ===================== Active section highlight =====================
(function () {
  const sections = Array.from(document.querySelectorAll('.section'));
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle('active', link.dataset.section === id);
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(function (section) { observer.observe(section); });
  }

  // Set initial active link
  setActive(sections.length ? sections[0].id : 'inicio');
})();

// ===================== Dashboard chart =====================
(function () {
  const canvas = document.getElementById('statusChart');
  if (!canvas || typeof Chart === 'undefined') return;

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Normal', 'Aviso', 'Crítico'],
      datasets: [{
        data: [33, 5, 2],
        backgroundColor: ['#1e8e5a', '#b7791f', '#c0392b'],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 14, padding: 16, font: { size: 13 } }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.label + ': ' + ctx.parsed + ' máquinas';
            }
          }
        }
      }
    }
  });
})();
