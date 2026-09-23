/* Vista Suites — shared header, footer, chat widget, animations, image fallbacks */
(function () {
  const NAV = [
    ['index.html', 'Home'],
    ['booking.html', 'Booking'],
    ['gallery.html', 'Gallery'],
    ['contact.html', 'Contact'],
  ];
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  /* ---------- Header ---------- */
  const links = NAV.map(([href, label]) =>
    `<a href="${href}" class="nav-link text-white ${current === href ? 'active' : ''}">${label}</a>`).join('');
  const mobileLinks = NAV.map(([href, label]) =>
    `<a href="${href}" class="block py-3 border-b border-white/15 ${current === href ? 'text-white' : 'text-white/70'}">${label}</a>`).join('');

  const header = document.getElementById('site-header');
  if (header) header.innerHTML = `
  <header id="hdr" class="fixed inset-x-0 top-0 z-50 text-white">
    <a href="index.html" class="logo block text-center text-sm md:text-base leading-tight tracking-[.18em] uppercase" aria-label="Bespoke Hospitality — home">
      Bespoke<br>Hospitality
    </a>
    <div class="border-t border-white/40">
      <div class="mx-auto max-w-7xl px-6 h-12 flex items-center justify-between text-sm">
        <span class="hidden md:block text-white/90">Grand City</span>
        <nav class="hidden md:flex gap-10" aria-label="Main">${links}</nav>
        <a href="booking.html" class="hidden md:inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-white">
          Book your stay
          <svg class="arrow w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 12h16M14 6l6 6-6 6"/></svg>
        </a>
        <span class="md:hidden text-white/90">Grand City</span>
        <button id="burger" class="md:hidden p-2 -mr-2 text-white" aria-label="Menu" aria-expanded="false">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 8h18M3 16h18"/></svg>
        </button>
      </div>
      <nav id="mobileNav" class="md:hidden px-6 bg-ink/95 text-base" aria-label="Mobile">
        ${mobileLinks}
        <a href="booking.html" class="block py-4 text-xs font-bold tracking-wider uppercase text-white">Book your stay</a>
      </nav>
    </div>
  </header>`;

  /* ---------- Footer ---------- */
  const footer = document.getElementById('site-footer');
  if (footer) footer.innerHTML = `
  <div class="relative overflow-hidden text-white">
    <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1800&q=70" data-seed="mountains" alt="" class="absolute inset-0 h-full w-full object-cover">
    <div class="absolute inset-0 bg-ink/85"></div>
    <div class="relative mx-auto max-w-6xl px-6 pt-24 pb-16 text-center">
      <p class="tracking-[.18em] uppercase leading-tight text-lg md:text-xl text-white" data-reveal>Bespoke<br>Hospitality</p>
      <div class="my-12 border-t border-white/50" data-reveal="fade"></div>
      <div class="grid gap-12 md:grid-cols-4 text-sm text-white/85" data-stagger>
        <div>
          <h4 class="text-xl uppercase tracking-wide mb-5 text-white">Location</h4>
          <p>123 Skyline Avenue, Grand City<br>Tel: +1 (234) 567-890<br><a class="underline underline-offset-4 decoration-white/40 hover:decoration-white" href="mailto:hello@vistasuites.com">hello@vistasuites.com</a></p>
        </div>
        <div>
          <h4 class="text-xl uppercase tracking-wide mb-5 text-white">Business hours</h4>
          <ul class="space-y-1.5">
            <li>Monday: 8am – 7pm</li><li>Tuesday: 8am – 5pm</li><li>Wednesday: 8am – 5pm</li><li>Thursday: 8am – 7pm</li><li>Friday: 8am – 5pm</li>
          </ul>
        </div>
        <div>
          <h4 class="text-xl uppercase tracking-wide mb-5 text-white">Explore</h4>
          <ul class="space-y-1.5">
            <li><a class="hover:text-white" href="booking.html">Booking</a></li>
            <li><a class="hover:text-white" href="gallery.html">Gallery</a></li>
            <li><a class="hover:text-white" href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-xl uppercase tracking-wide mb-5 text-white">Get social</h4>
          <div class="flex justify-center gap-3">
            <a href="#" aria-label="Tumblr" class="grid place-items-center w-9 h-9 rounded-full border border-white/70 font-bold text-sm transition hover:bg-white hover:text-ink">t</a>
            <a href="#" aria-label="Messenger" class="grid place-items-center w-9 h-9 rounded-full border border-white/70 transition hover:bg-white hover:text-ink">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3C7 3 3 6.8 3 11.5c0 2.6 1.3 4.9 3.3 6.4V21l3-1.7c.9.3 1.7.4 2.7.4 5 0 9-3.800 9-8.200S17 3 12 3z"/><path d="m7 13.500 3.500-3.700 2.500 2.300 4-2.300"/></svg>
            </a>
          </div>
        </div>
      </div>
      <p class="mt-16 text-xs text-white/50">© ${new Date().getFullYear()} Vista Suites by Bespoke Hospitality</p>
    </div>
  </div>`;

  /* ---------- Image fallback chain: Unsplash → Picsum → inline SVG ---------- */
  const svgFallback = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4457"/><stop offset="1" stop-color="#1b212b"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><g fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="6"><rect x="250" y="270" width="300" height="90" rx="10"/><path d="M230 400V260M570 400V260M250 330h300"/></g></svg>`);
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    const step = +(t.dataset.fb || 0);
    if (step === 0) {
      t.dataset.fb = 1;
      t.src = `https://picsum.photos/seed/${encodeURIComponent(t.dataset.seed || 'hotel')}/1400/900`;
    } else if (step === 1) {
      t.dataset.fb = 2;
      t.src = svgFallback;
    }
  }, true);

  /* ---------- Scroll reveal ---------- */
  document.querySelectorAll('[data-stagger]').forEach((box) => {
    [...box.children].forEach((kid, i) => {
      if (!kid.hasAttribute('data-reveal')) kid.setAttribute('data-reveal', '');
      kid.style.setProperty('--d', i * 130 + 'ms');
    });
  });
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;
  function reveal(root = document) {
    root.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => io ? io.observe(el) : el.classList.add('in'));
  }
  reveal();

  /* ---------- Header behaviour, mobile menu, parallax ---------- */
  const hdr = document.getElementById('hdr');
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const onScroll = () => {
    const y = window.scrollY;
    if (hdr) hdr.classList.toggle('scrolled', y > 40);
    parallax.forEach((el) => { el.style.transform = `translate3d(0,${Math.min(y, 1400) * parseFloat(el.dataset.parallax)}px,0)`; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = document.getElementById('burger');
  const mnav = document.getElementById('mobileNav');
  if (burger && mnav) burger.addEventListener('click', () => {
    const open = mnav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });

  /* ---------- Page transitions between pages ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
    const href = a.getAttribute('href');
    if (!/^[\w-]+\.html$/.test(href)) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = href; }, 250);
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('leaving'); });

  /* ============================================================
     CHAT WIDGET — floating button on every page, opens a panel,
     posts each message to CHAT_API_URL. If the request fails,
     times out, or the endpoint isn't wired up yet, a fallback
     reply is shown instead so the widget never looks broken.
     Point CHAT_API_URL at your backend. Expected POST body:
       { message: "...", history: [{role,content}, ...] }
     Expected response JSON: { reply: "..." }  (or { message })
     ============================================================ */
  const CHAT_API_URL = 'https://api.example.com/v1/chat';
  const FALLBACK_REPLIES = [
    "Thanks for reaching out — our live assistant isn't connected yet, but you can reach the front desk at +1 (234) 567-890 or hello@vistasuites.com.",
    "I can't reach our chat service right now. For anything urgent, please call +1 (234) 567-890 and our concierge will help directly.",
    "Our assistant is offline at the moment. Try the contact page, or email hello@vistasuites.com and we'll reply shortly.",
  ];

  const chatHost = document.createElement('div');
  chatHost.id = 'chatWidget';
  chatHost.innerHTML = `
    <button id="chatToggle" aria-haspopup="dialog" aria-expanded="false" aria-controls="chatPanel"
      class="fixed bottom-6 right-6 z-[70] grid place-items-center w-16 h-16 rounded-full bg-white text-ink shadow-2xl transition hover:scale-105 hover:shadow-[0_0_0_8px_rgba(255,255,255,.12)]">
      <svg id="chatIconOpen" class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <svg id="chatIconClose" class="hidden w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>

    <section id="chatPanel" role="dialog" aria-modal="false" aria-label="Chat with Vista Suites"
      class="fixed z-[70] bottom-24 right-6 w-[92vw] max-w-sm h-[65vh] max-h-[560px] bg-ink border border-white/25 shadow-2xl flex flex-col text-white opacity-0 translate-y-4 pointer-events-none transition duration-300">
      <header class="flex items-center justify-between px-5 py-4 border-b border-white/20">
        <div>
          <p class="text-sm font-bold uppercase tracking-wide">Vista Suites</p>
          <p class="text-xs text-white/60">Usually replies within a few minutes</p>
        </div>
        <button id="chatClose" aria-label="Close chat" class="p-1 text-white/70 hover:text-white">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </header>
      <div id="chatMessages" class="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm"></div>
      <form id="chatForm" class="flex items-center gap-2 border-t border-white/20 p-3">
        <label for="chatInput" class="sr-only">Message</label>
        <input id="chatInput" name="message" type="text" autocomplete="off" placeholder="Ask about rooms, dates, rates…"
          class="flex-1 bg-white/10 border border-white/25 px-4 py-2.5 text-sm text-white placeholder-white/45 focus:outline-none focus:border-white">
        <button type="submit" aria-label="Send message" class="grid place-items-center w-10 h-10 shrink-0 bg-white text-ink transition hover:bg-white/85">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h16M14 6l6 6-6 6"/></svg>
        </button>
      </form>
    </section>`;
  document.body.appendChild(chatHost);

  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const iconOpen = document.getElementById('chatIconOpen');
  const iconClose = document.getElementById('chatIconClose');
  const messages = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');

  let history = [];
  let greeted = false;

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = role === 'user'
      ? 'ml-auto max-w-[85%] bg-white text-ink px-4 py-2.5 rounded-2xl rounded-br-sm'
      : 'mr-auto max-w-[85%] bg-white/10 border border-white/15 px-4 py-2.5 rounded-2xl rounded-bl-sm';
    bubble.style.animation = 'pagein .35s ease both';
    bubble.textContent = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTyping() {
    const t = document.createElement('div');
    t.id = 'chatTyping';
    t.className = 'mr-auto max-w-[60%] bg-white/10 border border-white/15 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1';
    t.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style="animation-delay:0ms"></span><span class="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style="animation-delay:120ms"></span><span class="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style="animation-delay:240ms"></span>';
    messages.appendChild(t);
    messages.scrollTop = messages.scrollHeight;
  }
  function removeTyping() { document.getElementById('chatTyping')?.remove(); }

  async function sendToChatApi(message) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data.reply || data.message || data.text;
      if (!reply) throw new Error('Empty reply');
      return reply;
    } catch (e) {
      console.warn('Chat API unavailable, using fallback reply:', e.message);
      return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
    } finally { clearTimeout(timer); }
  }

  function openChat() {
    panel.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toggle.setAttribute('aria-expanded', 'true');
    iconOpen.classList.add('hidden'); iconClose.classList.remove('hidden');
    if (!greeted) { greeted = true; addMessage('bot', "Hi! I'm the Vista Suites assistant. Ask me about rooms, rates or your booking."); }
    setTimeout(() => input.focus(), 150);
  }
  function closeChat() {
    panel.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    toggle.setAttribute('aria-expanded', 'false');
    iconOpen.classList.remove('hidden'); iconClose.classList.add('hidden');
  }
  toggle.addEventListener('click', () => panel.classList.contains('pointer-events-none') ? openChat() : closeChat());
  document.getElementById('chatClose').addEventListener('click', closeChat);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChat(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.disabled = true;
    addTyping();
    const reply = await sendToChatApi(text);
    removeTyping();
    addMessage('bot', reply);
    history.push({ role: 'assistant', content: reply });
    input.disabled = false;
    input.focus();
  });

  window.Site = { reveal };
})();
