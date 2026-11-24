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
  const searchInput = document.getElementById("scholarship-search");
  const searchClear = document.getElementById("search-clear");
  const filterStatus = document.getElementById("filter-status");
  const filterStatusText = document.getElementById("filter-status-text");
  const filterResetBtn = document.getElementById("filter-reset-btn");
  const categoryCards = document.querySelectorAll(".category-card");
  const yearSpan = document.getElementById("year");

  /* ---------- Set Current Year ---------- */
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ---------- State Management ---------- */
  // Load initial fallback data so it works offline and directly from file:///
  let scholarships = Array.isArray(window.PK_SCHOLARSHIPS_DATA)
    ? [...window.PK_SCHOLARSHIPS_DATA]
    : [];

  let currentTypeFilter = "all";
  let currentCategoryFilter = "all";
  let currentSearchQuery = "";

  /* ---------- Helper: Days Remaining ---------- */
  function getDeadlineInfo(dateStr) {
    if (!dateStr) return { text: "Open", badgeClass: "deadline-badge--normal" };
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Deadline Passed", badgeClass: "deadline-badge--expired" };
    }
    if (diffDays === 0) {
      return { text: "⏳ Ends Today!", badgeClass: "deadline-badge--urgent" };
    }
    if (diffDays <= 30) {
      return { text: `⏳ ${diffDays} days left`, badgeClass: "deadline-badge--urgent" };
    }
    return { text: `📅 ${diffDays} days left`, badgeClass: "deadline-badge--normal" };
  }

  /* ---------- Format Date ---------- */
  function formatDate(dateStr) {
    if (!dateStr) return "Ongoing";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /* ---------- Filter & Render Cards ---------- */
  function renderScholarships() {
    newsGrid.innerHTML = "";

    // Apply Filters
    const filtered = scholarships.filter((s) => {
      // 1. Type filter
      if (currentTypeFilter !== "all" && s.type !== currentTypeFilter) {
        return false;
      }

      // 2. Category filter
      if (currentCategoryFilter !== "all") {
        const cat = (s.category || "").toLowerCase();
        const targetCat = currentCategoryFilter.toLowerCase();
        if (!cat.includes(targetCat) && !targetCat.includes(cat)) {
          return false;
        }
      }

      // 3. Search query
      if (currentSearchQuery) {
        const q = currentSearchQuery.toLowerCase();
        const inTitle = (s.title || "").toLowerCase().includes(q);
        const inUni = (s.university || "").toLowerCase().includes(q);
        const inExcerpt = (s.excerpt || "").toLowerCase().includes(q);
        const inCat = (s.category || "").toLowerCase().includes(q);
        const inType = (s.type || "").toLowerCase().includes(q);
        if (!inTitle && !inUni && !inExcerpt && !inCat && !inType) {
          return false;
        }
      }

      return true;
    });

    // Update Counter
    const statEl = document.getElementById("stat-scholarships");
    if (statEl) statEl.textContent = scholarships.length;

    // Filter Status Pill
    if (currentCategoryFilter !== "all" || currentSearchQuery) {
      filterStatus.style.display = "flex";
      let statusMsg = `Showing ${filtered.length} results`;
      if (currentCategoryFilter !== "all") {
        statusMsg += ` for category "${currentCategoryFilter}"`;
      }
      if (currentSearchQuery) {
        statusMsg += ` matching "${currentSearchQuery}"`;
      }
      filterStatusText.textContent = statusMsg;
    } else {
      filterStatus.style.display = "none";
    }

    // Empty State Check
    if (filtered.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    const tagLabel = {
      "fully-funded": "Fully Funded",
      partial: "Partial",
      merit: "Merit-Based",
      need: "Need-Based",
    };

    filtered.forEach((s) => {
      const card = document.createElement("article");
      card.className = "scholarship-card";
      card.setAttribute("data-type", s.type);

      const deadlineInfo = getDeadlineInfo(s.deadline);
      const verifiedBadge =
        s.verified !== false
          ? `<span class="scholarship-card__verified" title="Verified by AI & official sources">✓ Verified</span>`
          : "";

      const categoryPill = s.category
        ? `<span class="scholarship-card__category">${s.category}</span>`
        : "";

      card.innerHTML = `
        <div class="scholarship-card__body">
          <div class="scholarship-card__top">
            <div class="scholarship-card__tags">
              <span class="scholarship-card__tag scholarship-card__tag--${s.type}">
                ${tagLabel[s.type] || s.type}
              </span>
              ${categoryPill}
            </div>
            ${verifiedBadge}
          </div>

          <h3 class="scholarship-card__title">${s.title}</h3>

          <div class="scholarship-card__meta">
            <span class="scholarship-card__uni">🏫 <strong>${s.university}</strong></span>
            <span class="scholarship-card__deadline ${deadlineInfo.badgeClass}">
              ${deadlineInfo.text} (${formatDate(s.deadline)})
            </span>
          </div>

          <p class="scholarship-card__excerpt">${s.excerpt}</p>

          <div class="scholarship-card__footer">
            <a href="${s.link}" class="scholarship-card__btn" target="_blank" rel="noopener">
              Official Details & Application ↗
            </a>
          </div>
        </div>
      `;

      newsGrid.appendChild(card);
    });
  }

  /* ---------- Fetch Data from JSON (Online Update) ---------- */
  async function loadScholarships() {
    try {
      const res = await fetch("./data/scholarships.json?t=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          scholarships = data;
        }
      }
    } catch (err) {
      // In local file:/// protocol, fetch might be blocked by CORS;
      // In that case, window.PK_SCHOLARSHIPS_DATA is already loaded!
      console.log("Using bundled scholarship data.");
    }
    renderScholarships();
  }

  /* ---------- Type Filter Buttons ---------- */
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTypeFilter = btn.dataset.filter || "all";
      renderScholarships();
    });
  });

  /* ---------- Live Search Input ---------- */
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.trim();
      if (searchClear) {
        searchClear.style.display = currentSearchQuery ? "block" : "none";
      }
      renderScholarships();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      currentSearchQuery = "";
      searchClear.style.display = "none";
      renderScholarships();
      searchInput.focus();
    });
  }

  /* ---------- Category Cards Interaction ---------- */
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      const cat = card.getAttribute("data-category");
      if (cat) {
        currentCategoryFilter = cat;
        // Reset type filter to all
        filterBtns.forEach((b) => b.classList.remove("active"));
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) allBtn.classList.add("active");
        currentTypeFilter = "all";

        const latestSection = document.getElementById("latest");
        if (latestSection) {
          latestSection.scrollIntoView({ behavior: "smooth" });
        }
        renderScholarships();
      }
    });

    // Keyboard accessibility for card buttons
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  /* ---------- Reset Filters Button ---------- */
  if (filterResetBtn) {
    filterResetBtn.addEventListener("click", () => {
      currentCategoryFilter = "all";
      currentTypeFilter = "all";
      currentSearchQuery = "";
      if (searchInput) searchInput.value = "";
      if (searchClear) searchClear.style.display = "none";
      filterBtns.forEach((b) => b.classList.remove("active"));
      const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
      if (allBtn) allBtn.classList.add("active");
      renderScholarships();
    });
  }

  /* ---------- Mobile Nav Toggle ---------- */
  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      nav.classList.toggle("open");
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (hamburger && nav) {
        hamburger.classList.remove("active");
        nav.classList.remove("open");
      }
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
    if (header) {
      if (window.scrollY > 10) {
        header.classList.add("header--scrolled");
      } else {
        header.classList.remove("header--scrolled");
      }
    }

    if (backToTop) {
      if (window.scrollY > 400) {
        backToTop.classList.add("visible");
      } else {
        backToTop.classList.remove("visible");
      }
    }

    highlightNav();
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  if (backToTop) {
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Newsletter Form ---------- */
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("🎉 Thank you for subscribing! You will receive daily Pakistan university scholarship news alerts.");
      newsletterForm.reset();
    });
  }

  /* ---------- Contact Form ---------- */
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("✅ Thank you for your message! Our team will get back to you shortly.");
      contactForm.reset();
    });
  }

  /* ---------- Initial Load ---------- */
  loadScholarships();
});
