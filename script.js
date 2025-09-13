/* script.js
   Purpose: mobile nav + safe contact-form submit (Formspree AJAX)
   + global scroll-triggered fade-in animation (IntersectionObserver)
*/

const MAX_MESSAGES_PER_DAY = 5;
const MESSAGE_STORAGE_KEY = 'messageDataV1';

// --- CONFIG
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xkgvejwq';

/* small helper to show messages in #formMessage div */
function showMessage(text, type = 'success') {
  const msgDiv = document.getElementById('formMessage');
  if (!msgDiv) return;
  msgDiv.textContent = text;
  msgDiv.className = 'form-message ' + type;
  msgDiv.style.display = 'block';
  msgDiv.style.opacity = '1';

  // hide after 5s
  setTimeout(() => {
    msgDiv.style.opacity = '0';
    setTimeout(() => {
      msgDiv.style.display = 'none';
    }, 300);
  }, 5000);
}

/* Helpers for message data in localStorage */
function readMessageData() {
  try {
    const raw = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse messageData from localStorage', e);
    return null;
  }
}

function writeMessageData(obj) {
  try {
    localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to write messageData to localStorage', e);
  }
}

/* Wait until DOM is ready */
document.addEventListener('DOMContentLoaded', () => {

  // NAV (hamburger) logic
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        document.body.classList.add('menu-open');
        // lock scroll on mobile when menu open
        document.body.style.overflow = 'hidden';
      } else {
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    });

    // close mobile menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLinks.classList.contains('open')) return;
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    });

    // close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      }
    });
  }

  // Header "scrolled" class
  const header = document.querySelector('header');
  const onScroll = () => {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll);

  // CONTACT FORM submission (AJAX to Formspree)
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // --- DAILY RATE LIMIT CHECK (5 per day)
    const today = new Date().toDateString();
    let messageData = readMessageData();

    if (!messageData || typeof messageData !== 'object') {
      messageData = { date: today, count: 0, timestamps: [] };
    }

    // Reset at new day
    if (messageData.date !== today) {
      messageData.date = today;
      messageData.count = 0;
      messageData.timestamps = [];
    }

    if (messageData.count >= MAX_MESSAGES_PER_DAY) {
      showMessage(`You can only send ${MAX_MESSAGES_PER_DAY} messages per day. Please try again tomorrow.`, 'error');
      return;
    }

    // Basic client-side validation
    const name = document.getElementById('name')?.value?.trim() || '';
    const email = document.getElementById('email')?.value?.trim() || '';
    const subject = document.getElementById('subject')?.value?.trim() || '';
    const message = document.getElementById('message')?.value?.trim() || '';

    if (!name || !email || !message) {
      showMessage('Please fill in name, email and message.', 'error');
      return;
    }

    // Build FormData
    const data = new FormData(form);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          // Formspree wants Accept: application/json for json response
          'Accept': 'application/json'
        },
        body: data
      });

      if (res.ok) {
        // Only increment the daily count AFTER successful send
        messageData.count = (messageData.count || 0) + 1;
        const now = Date.now();
        messageData.timestamps = messageData.timestamps || [];
        messageData.timestamps.push(now);
        // Keep only last 20 message timestamps
        if (messageData.timestamps.length > 20) messageData.timestamps.shift();
        writeMessageData(messageData);

        // success UI
        const remaining = Math.max(0, MAX_MESSAGES_PER_DAY - messageData.count);
        if (remaining > 0) {
          showMessage(`Message sent successfully! You have ${remaining} message(s) left today.`, 'success');
        } else {
          showMessage('Message sent successfully! You have reached your daily limit.', 'success');
        }

        form.reset();
      } else {
        // try to get JSON error body
        let errText = '';
        try { const j = await res.json(); errText = j?.error || JSON.stringify(j); } catch (e) { errText = await res.text().catch(()=>'<no-body>'); }
        console.error('Form submit failed', res.status, errText);
        showMessage('Failed to send message. Please try again later.', 'error');
      }
    } catch (err) {
      console.error('Network/JS error sending form', err);
      showMessage('Network error while sending the message.', 'error');
    }
  });


  /* === START: FADE-IN ON SCROLL === */

  (function setupScrollFadeIns() {
    const selector = [
      'section',
      '.project-card',
      '.skill-category',
      '.project-info',
      '.hero-text',
      '.project-image',
      '.contact-info',
      '.contact-form',
      '.resume-wrap',
      '.btn'
    ].join(',');

    const ioOptions = {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.12
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-active');
          entry.target.classList.remove('fade-in-init');
          // animate once only
          obs.unobserve(entry.target);
        }
      });
    }, ioOptions);

    document.querySelectorAll(selector).forEach(el => {
      // skip if the element is small or already visible
      if (el.offsetParent === null) return; // hidden elements ignored
      el.classList.add('fade-in-init');
      observer.observe(el);
    });
  })();

  /* === END: FADE-IN ON SCROLL === */


});