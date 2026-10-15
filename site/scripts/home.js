"use strict";

(() => {
  const bookingForm = document.querySelector("[data-booking-form]");
  const dialog = document.querySelector("[data-lead-dialog]");
  const contactForm = document.querySelector("[data-contact-form]");
  const summary = document.querySelector("[data-lead-summary]");
  const status = document.querySelector("[data-contact-status]");
  const destination = bookingForm?.elements.namedItem("to");
  const selectedCar = { value: "" };
  if (!bookingForm || !dialog || !contactForm || !destination) return;

  // No fake order confirmation: this is a frontend-only UI until the API is adapted.
  const dateInput = bookingForm.elements.namedItem("date");
  if (dateInput) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    dateInput.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;
    if (bookingForm.elements.namedItem("from").value === destination.value) {
      destination.setCustomValidity("Укажите другое место назначения");
      destination.reportValidity();
      return;
    }
    const values = new FormData(bookingForm);
    const date = String(values.get("date") || "");
    const readableDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}` : date;
    summary.textContent = [
      `${values.get("from")} — ${values.get("to")}`,
      readableDate,
      `${values.get("passengers")} пасс.`,
      selectedCar.value
    ].filter(Boolean).join(" · ");
    contactForm.reset();
    status.textContent = "Демонстрационная версия: отправка заявок будет подключена на этапе backend. Данные никуда не передаются.";
    if (typeof dialog.showModal === "function") dialog.showModal();
  });
  destination.addEventListener("change", () => destination.setCustomValidity(""));
  bookingForm.elements.namedItem("from").addEventListener("change", () => destination.setCustomValidity(""));

  function updateAndScroll(value, car = "") {
    if (value) destination.value = value;
    if (car) selectedCar.value = car;
    destination.setCustomValidity("");
    document.getElementById("booking")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    bookingForm.classList.remove("booking__form--attention");
    void bookingForm.offsetWidth;
    bookingForm.classList.add("booking__form--attention");
  }

  document.querySelectorAll("[data-select-car]").forEach((button) => {
    button.addEventListener("click", () => updateAndScroll("", button.dataset.selectCar || ""));
  });
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => updateAndScroll(button.dataset.route || ""));
  });

  // Форматы поездок: плавный crossfade между двумя слоями изображения.
  const tripSection = document.querySelector("[data-trip-formats]");
  if (tripSection) {
    const options = [...tripSection.querySelectorAll("[data-trip-option]")];
    const photo = tripSection.querySelector("[data-trip-photo]");
    const photoNext = tripSection.querySelector("[data-trip-photo-next]");
    const photoLabel = tripSection.querySelector("[data-trip-photo-label]");
    const photoTitle = tripSection.querySelector("[data-trip-photo-title]");
    const photoDescription = tripSection.querySelector("[data-trip-photo-description]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fadeDuration = 850; // Соответствует transition opacity в home.scss.
    let selectedOption = options.find((option) => option.closest(".trip-format")?.classList.contains("is-active")) || options[0];
    let displayedSrc = photo?.getAttribute("src") || "";
    let isSwitching = false;

    function updateText(option) {
      photoLabel.textContent = option.dataset.photoLabel || "";
      photoTitle.textContent = option.dataset.photoTitle || "";
      photoDescription.textContent = option.dataset.photoDescription || "";
    }

    function crossfadeToSelection() {
      if (isSwitching || !photo || !photoNext || !selectedOption) return;
      const option = selectedOption;
      const nextSrc = option.dataset.photoSrc;
      if (!nextSrc || nextSrc === displayedSrc) return;
      isSwitching = true;

      // Сначала загружаем новую фотографию, чтобы исключить белый кадр.
      const preload = new Image();
      preload.onload = () => {
        if (option !== selectedOption) {
          isSwitching = false;
          crossfadeToSelection();
          return;
        }
        photoNext.classList.remove("is-visible");
        photoNext.src = nextSrc;
        photoNext.alt = option.dataset.photoAlt || "";
        if (reduceMotion.matches) {
          photo.src = nextSrc;
          photo.alt = photoNext.alt;
          displayedSrc = nextSrc;
          photoNext.alt = "";
          isSwitching = false;
          if (selectedOption !== option) crossfadeToSelection();
          return;
        }

        // Два кадра позволяют старому снимку плавно уйти под новым.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          photoNext.classList.add("is-visible");
          window.setTimeout(() => {
            photo.src = nextSrc;
            photo.alt = photoNext.alt;
            displayedSrc = nextSrc;
            photoNext.classList.remove("is-visible");
            photoNext.alt = "";
            isSwitching = false;
            if (selectedOption !== option) crossfadeToSelection();
          }, fadeDuration);
        }));
      };
      preload.onerror = () => {
        isSwitching = false;
        // При проблеме с изображением не показываем сломанный кадр.
      };
      preload.src = nextSrc;
    }

    function selectTrip(option) {
      if (!option || option === selectedOption) return;
      selectedOption = option;
      options.forEach((entry) => {
        const active = entry === option;
        entry.closest(".trip-format")?.classList.toggle("is-active", active);
        entry.setAttribute("aria-pressed", String(active));
      });
      updateText(option);
      crossfadeToSelection();
    }

    options.forEach((option) => {
      option.addEventListener("click", () => selectTrip(option));
      option.addEventListener("mouseenter", () => selectTrip(option));
    });
    tripSection.querySelector("[data-trip-booking]")?.addEventListener("click", (event) => {
      event.preventDefault();
      updateAndScroll(selectedOption?.dataset.destination || "");
    });
  }

  dialog.querySelector("[data-dialog-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    status.textContent = "Форма пока не отправляет заявки. На этапе backend подключим API и уведомления, а сейчас сведения остались только в вашем браузере.";
  });

  const reveals = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -30px 0px", threshold: 0.08 });
  document.documentElement.classList.add("has-motion");
  reveals.forEach((node) => observer.observe(node));
})();
