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
  const visibleVideos = new Set();
  const nearbyVideos = new Set();
  let nativeFullscreenVideo = null;

  const hydrateVideo = (video) => {
    const source = video.querySelector("source[data-src]");
    if (!source) return;
    video.preload = "auto";
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
    video.load();
  };

  const fullscreenVideo = () => {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fullscreenElement) return nativeFullscreenVideo;
    if (fullscreenElement.matches?.("video")) return fullscreenElement;
    return fullscreenElement.querySelector?.("video") || null;
  };

  const playVideo = (video) => {
    hydrateVideo(video);
    video.play().catch(() => {});
  };

  const syncVideoPlayback = () => {
    const activeFullscreenVideo = fullscreenVideo();

    videos.forEach((video) => {
      const shouldPlay = !document.hidden && (
        activeFullscreenVideo
          ? video === activeFullscreenVideo
          : visibleVideos.has(video)
      );

      if (shouldPlay) {
        playVideo(video);
      } else {
        video.pause();
      }
    });
  };

  const distanceFromViewport = (video) => {
    const bounds = video.getBoundingClientRect();
    if (bounds.bottom < 0) return -bounds.bottom;
    if (bounds.top > window.innerHeight) return bounds.top - window.innerHeight;
    return 0;
  };

  const preloadNearestVideoGroup = () => {
    if (document.hidden || fullscreenVideo()) return;

    const visibleAreReady = [...visibleVideos].every(
      (video) => video.error || video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    );
    if (visibleVideos.size > 0 && !visibleAreReady) return;

    const candidates = [...nearbyVideos]
      .filter((video) => !visibleVideos.has(video) && video.querySelector("source[data-src]"))
      .sort((first, second) => distanceFromViewport(first) - distanceFromViewport(second));

    if (!candidates.length) return;

    const nearestDistance = distanceFromViewport(candidates[0]);
    candidates
      .filter((video) => distanceFromViewport(video) <= nearestDistance + 48)
      .slice(0, 3)
      .forEach(hydrateVideo);
  };

  const scheduleNearbyPreload = () => {
    window.requestAnimationFrame(preloadNearestVideoGroup);
  };

  videos.forEach((video) => {
    video.addEventListener("canplay", scheduleNearbyPreload);
    video.addEventListener("error", scheduleNearbyPreload);
    video.addEventListener("webkitbeginfullscreen", () => {
      nativeFullscreenVideo = video;
      syncVideoPlayback();
    });
    video.addEventListener("webkitendfullscreen", () => {
      nativeFullscreenVideo = null;
      syncVideoPlayback();
    });
  });

  if ("IntersectionObserver" in window) {
    const playbackObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          visibleVideos.add(video);
        } else {
          visibleVideos.delete(video);
        }
      });
      syncVideoPlayback();
      scheduleNearbyPreload();
    }, { rootMargin: "0px", threshold: 0.01 });

    const preloadObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          nearbyVideos.add(entry.target);
        } else {
          nearbyVideos.delete(entry.target);
        }
      });
      scheduleNearbyPreload();
    }, { rootMargin: "700px 0px", threshold: 0.01 });

    videos.forEach((video) => {
      playbackObserver.observe(video);
      preloadObserver.observe(video);
    });
  } else {
    const updateVisibleVideos = () => {
      videos.forEach((video) => {
        const bounds = video.getBoundingClientRect();
        const isVisible = bounds.bottom > 0
          && bounds.top < window.innerHeight
          && bounds.right > 0
          && bounds.left < window.innerWidth;
        if (isVisible) {
          visibleVideos.add(video);
        } else {
          visibleVideos.delete(video);
        }
      });
      syncVideoPlayback();
    };

    window.addEventListener("scroll", updateVisibleVideos, { passive: true });
    window.addEventListener("resize", updateVisibleVideos);
    updateVisibleVideos();
  }

  document.addEventListener("fullscreenchange", syncVideoPlayback);
  document.addEventListener("webkitfullscreenchange", syncVideoPlayback);
  document.addEventListener("visibilitychange", syncVideoPlayback);
});
