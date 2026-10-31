/* Bayt Prime Ventures Ltd — site behaviour (no dependencies) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WHATSAPP_NUMBER = '2349135001107';

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector('[data-header]');
  var toTop = document.querySelector('[data-to-top]');

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menu = document.querySelector('[data-menu]');
  var backdrop = document.querySelector('[data-menu-backdrop]');
  var openBtn = document.querySelector('[data-menu-open]');
  var closeBtn = document.querySelector('[data-menu-close]');
  var closeTimer;

  function focusables() {
    return menu.querySelectorAll('a[href], button:not([disabled])');
  }

  function openMenu() {
    clearTimeout(closeTimer);
    menu.hidden = false;
    backdrop.hidden = false;
    void menu.offsetWidth; // let the closed position apply before animating
    menu.classList.add('is-open');
    backdrop.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-locked');
    closeBtn.focus();
  }

  function closeMenu(returnFocus) {
    menu.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-locked');
    closeTimer = setTimeout(function () {
      menu.hidden = true;
      backdrop.hidden = true;
    }, reduceMotion ? 0 : 320);
    if (returnFocus) openBtn.focus();
  }

  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', function () { closeMenu(true); });
  backdrop.addEventListener('click', function () { closeMenu(true); });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (!menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      closeMenu(true);
    } else if (e.key === 'Tab') {
      var items = focusables();
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
    if (mq.matches && menu.classList.contains('is-open')) closeMenu(false);
  });

  /* ---------- Hero slideshow ---------- */
  var hero = document.querySelector('[data-hero]');
  if (hero) {
    var slides = hero.querySelectorAll('.hero-slide');
    var countEl = hero.querySelector('[data-hero-count]');
    var labelEl = hero.querySelector('[data-hero-label]');
    var progressEl = hero.querySelector('[data-hero-progress]');
    var pauseBtn = hero.querySelector('[data-hero-pause]');
    var pauseLabel = hero.querySelector('[data-hero-pause-label]');
    var DURATION = 6000;
    var index = 0;
    var timer = null;
    var startedAt = 0;
    var remaining = DURATION;
    // Reasons rotation is held: user pressed pause, pointer over, focus inside, off-screen, tab hidden
    var holds = { user: reduceMotion, hover: false, focus: false, offscreen: false, hidden: false };

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function isHeld() {
      return holds.user || holds.hover || holds.focus || holds.offscreen || holds.hidden;
    }

    function restartProgress() {
      progressEl.classList.remove('is-running');
      void progressEl.offsetWidth;
      progressEl.classList.add('is-running');
    }

    function show(i) {
      // Freeze the leaving photo at its current zoom while it fades out
      var leaving = slides[index];
      leaving.style.transform = getComputedStyle(leaving).transform;
      leaving.classList.remove('is-active');
      setTimeout(function () { leaving.style.transform = ''; }, 1300);
      index = (i + slides.length) % slides.length;
      slides[index].classList.add('is-active');
      countEl.textContent = pad(index + 1) + ' / ' + pad(slides.length);
      labelEl.textContent = slides[index].getAttribute('data-label');
      remaining = DURATION;
      restartProgress();
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      hero.classList.toggle('is-paused', isHeld());
      if (isHeld()) return;
      startedAt = Date.now();
      timer = setTimeout(function () { show(index + 1); }, remaining);
    }

    function setHold(key, value) {
      var wasHeld = isHeld();
      holds[key] = value;
      if (isHeld() && !wasHeld) {
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (Date.now() - startedAt));
      }
      schedule();
    }

    function syncPauseButton() {
      pauseBtn.setAttribute('aria-pressed', String(holds.user));
      pauseLabel.textContent = holds.user ? 'Play slideshow' : 'Pause slideshow';
    }

    hero.querySelector('[data-hero-prev]').addEventListener('click', function () { show(index - 1); });
    hero.querySelector('[data-hero-next]').addEventListener('click', function () { show(index + 1); });
    pauseBtn.addEventListener('click', function () {
      setHold('user', !holds.user);
      syncPauseButton();
    });

    hero.addEventListener('mouseenter', function () { setHold('hover', true); });
    hero.addEventListener('mouseleave', function () { setHold('hover', false); });
    hero.addEventListener('focusin', function () { setHold('focus', true); });
    hero.addEventListener('focusout', function (e) {
      if (!hero.contains(e.relatedTarget)) setHold('focus', false);
    });
    document.addEventListener('visibilitychange', function () { setHold('hidden', document.hidden); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        setHold('offscreen', !entries[0].isIntersecting);
      }, { threshold: 0.2 }).observe(hero);
    }

    // Swipe on touch screens
    var touchX = null;
    hero.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      touchX = null;
    });

    syncPauseButton();
    restartProgress();
    schedule();
  }

  /* ---------- Scrolling strips: stop when off-screen ---------- */
  var strips = document.querySelector('[data-strips]');
  if (strips && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      strips.classList.toggle('is-paused', !entries[0].isIntersecting);
    }).observe(strips);
  }

  /* ---------- Current section: gold underline + aria-current in both menus ---------- */
  var nav = document.querySelector('.nav');
  if (nav && 'IntersectionObserver' in window) {
    var indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.appendChild(indicator);

    var sectionToLink = { top: '#top', about: '#about', why: '#about', services: '#services', brands: '#brands', contact: '#contact' };
    var navLinks = document.querySelectorAll('.nav-list a, .mobile-menu-list a');
    var current = null;

    var placeIndicator = function () {
      var link = current && nav.querySelector('a[href="' + current + '"]');
      if (!link || !link.offsetWidth) { indicator.style.opacity = '0'; return; }
      var navBox = nav.getBoundingClientRect();
      var linkBox = link.getBoundingClientRect();
      var inset = 16; // matches the link's side padding, so the line sits under the text
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateX(' + (linkBox.left - navBox.left + inset) + 'px) scaleX(' + ((linkBox.width - inset * 2) / 100) + ')';
      // Turn on the sliding transition only after the first placement, so it doesn't slide in on load
      if (!nav.classList.contains('is-ready')) {
        requestAnimationFrame(function () { requestAnimationFrame(function () { nav.classList.add('is-ready'); }); });
      }
    };

    var setCurrent = function (href) {
      if (!href || href === current) return;
      current = href;
      navLinks.forEach(function (a) {
        if (a.getAttribute('href') === href) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      placeIndicator();
    };

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(sectionToLink[entry.target.id]);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(sectionToLink).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });

    window.addEventListener('resize', placeIndicator);
    if (document.fonts) document.fonts.ready.then(placeIndicator);
  }

  /* ---------- Floating buttons: hide over hero, contact and footer (they repeat what's there) ---------- */
  var floating = document.querySelector('[data-floating]');
  if (floating && 'IntersectionObserver' in window) {
    var covered = new Set();
    var coverObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) covered.add(entry.target); else covered.delete(entry.target);
      });
      floating.classList.toggle('is-hidden', covered.size > 0);
    }, { rootMargin: '0px 0px -30% 0px' });
    coverObserver.observe(document.getElementById('top'));
    coverObserver.observe(document.getElementById('contact'));
    coverObserver.observe(document.querySelector('.footer'));
  }

  /* ---------- Fade-in on first view ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      // Blocks that appear together come in one after another, 80ms apart (max 320ms)
      entries
        .filter(function (entry) { return entry.isIntersecting; })
        .forEach(function (entry, i) {
          var el = entry.target;
          var delay = Math.min(i, 4) * 80;
          el.style.transitionDelay = delay + 'ms';
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
          // Drop the delay afterwards so hover effects respond instantly
          setTimeout(function () { el.style.transitionDelay = ''; }, delay + 650);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Enquiry form ---------- */
  var form = document.querySelector('[data-form]');
  var serviceSelect = document.getElementById('f-service');

  // "Enquire" links pre-select the matching service
  document.querySelectorAll('[data-service]').forEach(function (link) {
    link.addEventListener('click', function () {
      serviceSelect.value = link.getAttribute('data-service');
    });
  });

  if (form) {
    var status = form.querySelector('[data-form-status]');
    var rules = {
      name: function (v) { return v.length >= 2 ? '' : 'Please enter your full name.'; },
      email: function (v) {
        if (!v) return 'Please enter your email address.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Enter an email address like name@company.com.';
      },
      phone: function (v) {
        if (!v) return '';
        return v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a full phone number, or leave this blank.';
      },
      message: function (v) { return v.length >= 10 ? '' : 'Please tell us a little about what you need (at least 10 characters).'; }
    };

    function validate(field) {
      var rule = rules[field.name];
      if (!rule) return true;
      var msg = rule(field.value.trim());
      var errorEl = document.getElementById(field.id + '-err');
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (errorEl) errorEl.textContent = msg;
      return !msg;
    }

    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      field.addEventListener('blur', function () {
        if (field.value.trim() || field.dataset.touched) validate(field);
        field.dataset.touched = 'true';
      });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validate(field);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(rules).forEach(function (name) {
        var field = form.elements[name];
        if (!validate(field) && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        status.textContent = 'Please check the highlighted fields.';
        firstInvalid.focus();
        return;
      }

      var d = new FormData(form);
      var lines = [
        'Hello Bayt Prime Ventures Ltd,',
        '',
        'Name: ' + d.get('name'),
        d.get('company') ? 'Company: ' + d.get('company') : null,
        'Email: ' + d.get('email'),
        d.get('phone') ? 'Phone: ' + d.get('phone') : null,
        'Enquiry: ' + d.get('service'),
        '',
        String(d.get('message')).trim()
      ].filter(function (line) { return line !== null; });
      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));

      status.textContent = 'Opening WhatsApp with your enquiry. Press send there to deliver it.';
      var win = window.open(url, '_blank');
      if (win) {
        win.opener = null;
      } else {
        window.location.href = url;
      }
    });
  }
})();
