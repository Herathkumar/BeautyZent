document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const navMobile = document.querySelector(".nav-mobile");
  const siteHeader = document.querySelector(".site-header");

  // Backdrop behind mobile menu
  let backdrop = document.querySelector(".menu-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "menu-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);
  }

  function closeMenu() {
    if (!navMobile || !menuToggle) return;
    navMobile.classList.remove("open");
    backdrop.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  function openMenu() {
    if (!navMobile || !menuToggle) return;
    navMobile.classList.add("open");
    backdrop.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  if (menuToggle && navMobile) {
    // Ensure toggle has open/close icons
    if (!menuToggle.querySelector(".icon-open")) {
      menuToggle.innerHTML = `
        <svg class="icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18"/>
        </svg>
      `;
    }

    // Keep mobile menu attached to header (not stuck under fixed height)
    if (siteHeader && !siteHeader.contains(navMobile)) {
      siteHeader.appendChild(navMobile);
    }

    menuToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (navMobile.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    backdrop.addEventListener("click", closeMenu);

    navMobile.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) closeMenu();
    });
  }

  document.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".faq-item");
      const isOpen = item.classList.contains("open");

      document.querySelectorAll(".faq-item").forEach((faq) => faq.classList.remove("open"));

      if (!isOpen) {
        item.classList.add("open");
      }
    });
  });

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const success = document.querySelector(".form-success");
      if (success) {
        success.classList.add("show");
      }

      contactForm.reset();

      setTimeout(() => {
        if (success) success.classList.remove("show");
      }, 6000);
    });
  }
});
