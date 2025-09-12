/* script.js
   Purpose: mobile nav + safe contact-form submit (Formspree AJAX).
*/

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 1 day

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

    // Rate-limiter: 1 per day
    const lastSent = parseInt(localStorage.getItem('lastMessageSentTime') || '0', 10);
    const now = Date.now();
    if (lastSent && now - lastSent < RATE_LIMIT_MS) {
      showMessage('You can only send one message per day. Please try again later.', 'error');
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

    // Build FormData (works with Formspree when sending via fetch)
    const data = new FormData(form);

    // If you're using Formspree, they respect _gotcha to block bots.

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
        showMessage('Message sent successfully! Thank you.', 'success');
        form.reset();
        localStorage.setItem('lastMessageSentTime', now.toString());
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

});