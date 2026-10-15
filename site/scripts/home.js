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
