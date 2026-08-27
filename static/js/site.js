document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.querySelector(".carousel");

  if (carousel) {
    const viewport = carousel.querySelector(".carousel__viewport");
    const track = carousel.querySelector(".carousel__track");
    const slides = [...carousel.querySelectorAll(".carousel__slide")];
    const previous = carousel.querySelector(".carousel__button--previous");
    const next = carousel.querySelector(".carousel__button--next");
    const status = carousel.querySelector(".carousel__status");
    const cloneCount = 3;

    const cloneSlide = (slide) => {
      const clone = slide.cloneNode(true);
      clone.classList.add("carousel__slide--clone");
      clone.setAttribute("aria-hidden", "true");
      return clone;
    };

    const leadingClones = slides.slice(-cloneCount).map(cloneSlide);
    const trailingClones = slides.slice(0, cloneCount).map(cloneSlide);
    track.prepend(...leadingClones);
    track.append(...trailingClones);
    const renderedSlides = [...track.querySelectorAll(".carousel__slide")];

    const visibleCount = () => {
      const value = getComputedStyle(track).getPropertyValue("--slides-visible");
      return Number.parseInt(value, 10) || 1;
    };

    const slideStep = () => {
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      return renderedSlides[0].getBoundingClientRect().width + gap;
    };

    const physicalIndex = () => Math.round(viewport.scrollLeft / slideStep());
    const logicalIndex = (index) => ((index - cloneCount) % slides.length + slides.length) % slides.length;

    const setPosition = (index, instant = false) => {
      if (instant) viewport.classList.add("carousel__viewport--resetting");
      viewport.scrollTo({ left: index * slideStep(), behavior: instant ? "auto" : "smooth" });
      if (instant) {
        window.requestAnimationFrame(() => viewport.classList.remove("carousel__viewport--resetting"));
      }
    };

    const updateStatus = () => {
      const count = visibleCount();
      const start = logicalIndex(physicalIndex());
      const labels = Array.from({ length: count }, (_, offset) => ((start + offset) % slides.length) + 1);
      const sequential = labels.every((label, index) => index === 0 || label === labels[index - 1] + 1);
      status.textContent = sequential
        ? `Tasks ${labels[0]}–${labels[labels.length - 1]} of ${slides.length}`
        : `Tasks ${labels.join(", ")} of ${slides.length}`;
    };

    const normalizeLoop = () => {
      const index = physicalIndex();
      if (index >= cloneCount + slides.length) {
        setPosition(index - slides.length, true);
      } else if (index < cloneCount) {
        setPosition(index + slides.length, true);
      }
      updateStatus();
    };

    const goBy = (offset) => {
      let index = physicalIndex();
      if (index >= cloneCount + slides.length) index -= slides.length;
      if (index < cloneCount) index += slides.length;
      setPosition(index + offset);
      window.setTimeout(updateStatus, 260);
    };

    previous.addEventListener("click", () => goBy(-1));
    next.addEventListener("click", () => goBy(1));

    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBy(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goBy(1);
      }
    });

    let scrollTimer;
    viewport.addEventListener("scroll", () => {
      window.clearTimeout(scrollTimer);
      updateStatus();
      scrollTimer = window.setTimeout(normalizeLoop, 150);
    }, { passive: true });

    window.addEventListener("resize", () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        setPosition(cloneCount, true);
        updateStatus();
      }, 120);
    });

    setPosition(cloneCount, true);
    updateStatus();
  }

  document.querySelectorAll(".figure-carousel").forEach((figureCarousel) => {
    const viewport = figureCarousel.querySelector(".figure-carousel__viewport");
    const slides = [...figureCarousel.querySelectorAll(".figure-carousel__slide")];
    const previous = figureCarousel.querySelector(".figure-carousel__arrow--previous");
    const next = figureCarousel.querySelector(".figure-carousel__arrow--next");
    const tabs = [...figureCarousel.querySelectorAll("[role='tab']")];
    const status = figureCarousel.querySelector(".figure-carousel__status");
    const isAdaptive = figureCarousel.classList.contains("figure-carousel--adaptive");
    let activeIndex = 0;

    const syncFigureHeight = () => {
      if (!isAdaptive) return;
      window.requestAnimationFrame(() => {
        const height = slides[activeIndex].offsetHeight;
        if (height > 0) viewport.style.height = `${height}px`;
      });
    };

    const updateFigureCarousel = (index) => {
      activeIndex = Math.max(0, Math.min(index, slides.length - 1));
      previous.disabled = activeIndex === 0;
      next.disabled = activeIndex === slides.length - 1;
      tabs.forEach((tab, tabIndex) => {
        const selected = tabIndex === activeIndex;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      status.textContent = `Figure ${activeIndex + 1} of ${slides.length}`;
      syncFigureHeight();
    };

    const goToFigure = (index, behavior = "smooth") => {
      const targetIndex = Math.max(0, Math.min(index, slides.length - 1));
      viewport.scrollTo({ left: targetIndex * viewport.clientWidth, behavior });
      updateFigureCarousel(targetIndex);
    };

    previous.addEventListener("click", () => goToFigure(activeIndex - 1));
    next.addEventListener("click", () => goToFigure(activeIndex + 1));
    tabs.forEach((tab, index) => tab.addEventListener("click", () => goToFigure(index)));

    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToFigure(activeIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToFigure(activeIndex + 1);
      }
    });

    let figureScrollTimer;
    viewport.addEventListener("scroll", () => {
      window.clearTimeout(figureScrollTimer);
      figureScrollTimer = window.setTimeout(() => {
        updateFigureCarousel(Math.round(viewport.scrollLeft / viewport.clientWidth));
      }, 100);
    }, { passive: true });

    if (isAdaptive) {
      slides.forEach((slide) => {
        const image = slide.querySelector("img");
        if (!image.complete) image.addEventListener("load", syncFigureHeight, { once: true });
      });
    }

    window.addEventListener("resize", () => goToFigure(activeIndex, "auto"));
    updateFigureCarousel(0);
  });

  const videos = [...document.querySelectorAll("video")];

  const hydrateVideo = (video) => {
    const source = video.querySelector("source[data-src]");
    if (!source) return;
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
    video.load();
  };

  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          hydrateVideo(video);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: "220px 80px", threshold: 0.15 });

    videos.forEach((video) => videoObserver.observe(video));
  } else {
    videos.forEach((video) => {
      hydrateVideo(video);
      video.play().catch(() => {});
    });
  }
});
