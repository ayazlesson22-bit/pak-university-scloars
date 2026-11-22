/* ============================================
   PK Scholarships — Main JavaScript
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Elements ---------- */
  const header = document.getElementById("header");
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("nav");
  const navLinks = document.querySelectorAll(".nav__link");
  const backToTop = document.getElementById("back-to-top");
  const newsGrid = document.getElementById("news-grid");
  const emptyState = document.getElementById("empty-state");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const yearSpan = document.getElementById("year");

  /* ---------- Set current year ---------- */
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ---------- Dynamic Scholarships Data ---------- */
  let scholarships = [];

  /* ---------- Render Cards ---------- */
  function renderScholarships(filter = "all") {
    newsGrid.innerHTML = "";

    const filtered =
      filter === "all"
        ? scholarships
        : scholarships.filter((s) => s.type === filter);

    // Update stat counter
    const statEl = document.getElementById("stat-scholarships");
    if (statEl) statEl.textContent = scholarships.length;

    if (filtered.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    filtered.forEach((s) => {
      const card = document.createElement("article");
      card.className = "scholarship-card";
      card.setAttribute("data-type", s.type);

      const tagLabel = {
        "fully-funded": "Fully Funded",
        partial: "Partial",
        merit: "Merit-Based",
        need: "Need-Based",
      };

      const verifiedBadge = s.verified !== false ? `<span class="scholarship-card__verified" title="Verified by AI & official sources">✓ Verified</span>` : "";

      card.innerHTML = `
        <div class="scholarship-card__body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span class="scholarship-card__tag scholarship-card__tag--${s.type}">
              ${tagLabel[s.type] || s.type}
            </span>
            ${verifiedBadge}
          </div>
          <h3 class="scholarship-card__title">${s.title}</h3>
          <div class="scholarship-card__meta">
            <span>🏫 ${s.university}</span>
            <span>📅 Deadline: ${formatDate(s.deadline)}</span>
          </div>
          <p class="scholarship-card__excerpt">${s.excerpt}</p>
          <a href="${s.link}" class="scholarship-card__link" target="_blank" rel="noopener">
            View Official Details →
          </a>
        </div>
      `;

      newsGrid.appendChild(card);
    });
  }

  /* ---------- Fetch Data from JSON ---------- */
  async function loadScholarships() {
    try {
      const res = await fetch("./data/scholarships.json?t=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          scholarships = data;
        }
      }
    } catch (err) {
      console.warn("Could not load scholarships.json:", err);
    }
    renderScholarships();
  }

  /* ---------- Format Date ---------- */
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /* ---------- Filter Buttons ---------- */
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderScholarships(btn.dataset.filter);
    });
  });

  /* ---------- Mobile Nav Toggle ---------- */
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    nav.classList.toggle("open");
  });

  // Close mobile nav on link click
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      nav.classList.remove("open");
    });
  });

  /* ---------- Active Nav on Scroll ---------- */
  const sections = document.querySelectorAll("section[id]");

  function highlightNav() {
    const scrollY = window.scrollY + 100;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");
      const link = document.querySelector(`.nav__link[href="#${id}"]`);
      if (link) {
        if (scrollY >= top && scrollY < top + height) {
          navLinks.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      }
    });
  }

  /* ---------- Header Shadow & Back-to-Top ---------- */
  function onScroll() {
    // Header shadow
    if (window.scrollY > 10) {
      header.classList.add("header--scrolled");
    } else {
      header.classList.remove("header--scrolled");
    }

    // Back to top
    if (window.scrollY > 400) {
      backToTop.classList.add("visible");
    } else {
      backToTop.classList.remove("visible");
    }

    highlightNav();
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- Newsletter Form ---------- */
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Thank you for subscribing! You will receive scholarship alerts via email.");
      newsletterForm.reset();
    });
  }

  /* ---------- Contact Form ---------- */
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Thank you for your message! We will get back to you soon.");
      contactForm.reset();
    });
  }

  /* ---------- Initial Load ---------- */
  loadScholarships();
});
