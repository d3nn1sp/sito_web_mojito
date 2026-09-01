/* ==========================================================================
   LIDO MOJITO - GLOBAL JAVASCRIPT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Preloader removal
  const preloader = document.getElementById("preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      preloader.style.opacity = "0";
      preloader.style.visibility = "hidden";
    });
    // Fallback if load event doesn't fire
    setTimeout(() => {
      preloader.style.opacity = "0";
      preloader.style.visibility = "hidden";
    }, 1500);
  }

  // Header Scroll Behavior
  const header = document.querySelector(".header");
  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add("header--scrolled");
    } else {
      header.classList.remove("header--scrolled");
    }
  };
  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Init on page load

  // Mobile Menu Toggling
  const menuBtn = document.querySelector(".menu-btn");
  const mobileMenu = document.querySelector(".mobile-menu");
  
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      menuBtn.classList.toggle("menu-btn--active");
      mobileMenu.classList.toggle("mobile-menu--active");
      document.body.classList.toggle("overflow-hidden");
    });

    // Close menu when clicking links
    const mobileLinks = mobileMenu.querySelectorAll("a");
    mobileLinks.forEach(link => {
      link.addEventListener("click", () => {
        menuBtn.classList.remove("menu-btn--active");
        mobileMenu.classList.remove("mobile-menu--active");
        document.body.classList.remove("overflow-hidden");
      });
    });
  }

  // Local Image Lightbox for Gallery
  const zoomableImages = document.querySelectorAll(".zoomable, .media-card img");
  if (zoomableImages.length > 0) {
    // Create lightbox element dynamically if it doesn't exist
    let lightbox = document.querySelector(".lightbox");
    if (!lightbox) {
      lightbox = document.createElement("div");
      lightbox.className = "lightbox";
      lightbox.innerHTML = `
        <div class="lightbox__close">&times;</div>
        <img class="lightbox__content" src="" alt="Zoomed view">
      `;
      document.body.appendChild(lightbox);
    }

    const lightboxImg = lightbox.querySelector(".lightbox__content");
    const lightboxClose = lightbox.querySelector(".lightbox__close");

    zoomableImages.forEach(img => {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", (e) => {
        e.preventDefault();
        const src = img.getAttribute("src");
        lightboxImg.setAttribute("src", src);
        lightbox.classList.add("lightbox--active");
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove("lightbox--active");
      setTimeout(() => {
        lightboxImg.setAttribute("src", "");
      }, 300);
    };

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target === lightboxClose) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("lightbox--active")) {
        closeLightbox();
      }
    });
  }

  // Scroll Animations Reveal (IntersectionObserver)
  const revealElements = document.querySelectorAll("[data-anim-reveal], .service-card, .atmos-card, .menu-item-card, .media-card");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animated");
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0) scale(1)";
          observer.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.08,
      rootMargin: "0px 0px -40px 0px"
    });

    revealElements.forEach((el, idx) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(28px) scale(0.98)";
      el.style.transition = `transform 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${(idx % 4) * 0.1}s, opacity 0.75s ease ${(idx % 4) * 0.1}s`;
      revealObserver.observe(el);
    });
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }

  // Interactive subtle 3D tilt for media and photos
  const tiltCards = document.querySelectorAll(".media-card, .atmos-card");
  tiltCards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      card.style.transform = `perspective(1000px) rotateY(${x * 0.02}deg) rotateX(${-y * 0.02}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0)";
    });
  });

  // Initialize Swiper.js Sliders
  if (typeof Swiper !== "undefined") {
    // Homepage Hero Slider
    new Swiper(".js-hero-slider", {
      slidesPerView: 1,
      spaceBetween: 0,
      loop: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
      speed: 1000,
      effect: "fade",
      fadeEffect: {
        crossFade: true
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      navigation: {
        nextEl: ".slider-next",
        prevEl: ".slider-prev",
      },
    });

    // Homepage Experience/Gallery Slider
    new Swiper(".js-experience-slider", {
      slidesPerView: 1,
      spaceBetween: 20,
      loop: true,
      autoplay: {
        delay: 4000,
        disableOnInteraction: false,
      },
      breakpoints: {
        480: { slidesPerView: 2, spaceBetween: 20 },
        768: { slidesPerView: 3, spaceBetween: 20 },
        1024: { slidesPerView: 4, spaceBetween: 30 }
      },
      pagination: {
        el: ".js-exp-pagination",
        clickable: true,
      }
    });

    // Homepage Testimonials Slider
    new Swiper(".js-testimonials-slider", {
      slidesPerView: 1,
      spaceBetween: 30,
      loop: true,
      autoplay: {
        delay: 6000,
        disableOnInteraction: false,
      },
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      }
    });

    // Menù Pages Sliders (Horizontal Open Source Menu Scroller)
    const menuSliders = document.querySelectorAll(".js-menu-slider");
    menuSliders.forEach((slider, idx) => {
      new Swiper(slider, {
        slidesPerView: 1,
        spaceBetween: 20,
        grabCursor: true,
        navigation: {
          nextEl: `.js-menu-next-${idx}`,
          prevEl: `.js-menu-prev-${idx}`,
        },
        breakpoints: {
          640: { slidesPerView: 1.5, spaceBetween: 20 },
          768: { slidesPerView: 2, spaceBetween: 25 },
          1024: { slidesPerView: 3, spaceBetween: 30 }
        }
      });
    });
  }

  // OpenStreetMap setup using Leaflet.js
  const mapElement = document.getElementById("osm-map");
  if (mapElement && typeof L !== "undefined") {
    // Lido Mojito Coordinates: 38.9038, 17.0989 (Spiaggia Grande di Capo Rizzuto)
    const caporizzutoCoords = [38.9038, 17.0989];
    
    // Initialize map
    const map = L.map("osm-map", {
      center: caporizzutoCoords,
      zoom: 15,
      scrollWheelZoom: false,
      dragging: !L.Browser.mobile,
      tap: !L.Browser.mobile
    });

    // OpenStreetMap tiles
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Apply custom dark/green container class to map pane
    const container = tileLayer.getContainer();
    if (container) {
      container.classList.add("osm-custom-tiles");
    }

    // Custom Golden-Sand Icon
    // Leaflet marker styling using raw CSS for customization
    const goldIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          background: #D5D1A4;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 50%;
          margin: -12px 0 0 -12px;
          border: 2px solid #1C351F;
          box-shadow: 0 0 10px rgba(0,0,0,0.4);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -30]
    });

    // Add marker
    const marker = L.marker(caporizzutoCoords, { icon: goldIcon }).addTo(map);
    
    // Add popup
    marker.bindPopup(`
      <div style="font-family: 'Jost', sans-serif; text-align: center; color: #1C351F;">
        <h4 style="margin-bottom: 5px; font-family: 'Cormorant Garamond', serif; font-size: 1.25rem;">Lido Mojito</h4>
        <p style="font-size: 0.85rem; margin: 0;">Bar Ristorante Pizzeria</p>
        <p style="font-size: 0.75rem; margin: 5px 0 0 0; color: #777345;">Capo Rizzuto (KR)</p>
      </div>
    `).openPopup();
  }

  // Work With Us: CV File Input Client-side validation & label update
  const cvFileInput = document.getElementById("cv-file");
  const fileLabelText = document.getElementById("file-label-text");
  if (cvFileInput && fileLabelText) {
    cvFileInput.addEventListener("change", () => {
      if (cvFileInput.files && cvFileInput.files.length > 0) {
        const file = cvFileInput.files[0];
        const maxBytes = 10 * 1024 * 1024; // 10MB
        
        // Verifica estensione e tipo
        const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
        
        if (!isPdf) {
          alert("Attenzione: è consentito caricare esclusivamente file in formato PDF.");
          cvFileInput.value = "";
          fileLabelText.textContent = "Clicca qui per allegare il tuo CV in PDF";
          fileLabelText.style.color = "var(--color-green-primary)";
          return;
        }

        if (file.size > maxBytes) {
          alert("Il file selezionato supera la dimensione massima consentita di 10MB. Scegli un file più leggero.");
          cvFileInput.value = "";
          fileLabelText.textContent = "Clicca qui per allegare il tuo CV in PDF";
          fileLabelText.style.color = "var(--color-green-primary)";
          return;
        }

        fileLabelText.textContent = `Documento allegato: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        fileLabelText.style.color = "#1C351F";
        fileLabelText.style.fontWeight = "600";
      }
    });
  }
});
