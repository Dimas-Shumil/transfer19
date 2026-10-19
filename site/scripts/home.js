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


  // Доступное кастомное раскрытие: реальный <select> остаётся в форме и FormData.
  // Без JavaScript браузер показывает обычные select и форма продолжает работать.
  let openChoice = null;
  const enhanceBookingChoice = (select) => {
    const field = select.closest('.booking__field');
    const content = select.closest('.booking__field-content');
    if (!field || !content) return;

    const options = [...select.options].filter(option => !option.disabled && option.value);
    const wrapper = document.createElement('div');
    wrapper.className = 'booking__choice';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'booking__choice-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.name);

    const list = document.createElement('div');
    list.className = 'booking__choice-list';
    list.id = `booking-choice-${select.name}`;
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', select.getAttribute('aria-label') || select.name);
    trigger.setAttribute('aria-controls', list.id);
    const rows = options.map((option, index) => {
      const row = document.createElement('div');
      row.className = 'booking__choice-option';
      row.id = `${list.id}-option-${index}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(select.value === option.value));
      row.textContent = option.textContent;
      row.dataset.value = option.value;
      list.append(row);
      return row;
    });

    let activeIndex = Math.max(0, options.findIndex(option => option.value === select.value));
    let typing = '';
    let typingAt = 0;
    const sync = () => {
      const current = [...select.options].find(option => option.value === select.value);
      trigger.textContent = current?.textContent || 'Выберите направление';
      trigger.classList.toggle('is-placeholder', !select.value);
      rows.forEach((row, i) => row.setAttribute('aria-selected', String(options[i].value === select.value)));
    };
    const highlight = (index, scroll = true) => {
      activeIndex = (index + rows.length) % rows.length;
      rows.forEach((row, i) => row.classList.toggle('is-active', i === activeIndex));
      trigger.setAttribute('aria-activedescendant', rows[activeIndex].id);
      if (scroll) rows[activeIndex].scrollIntoView({ block: 'nearest' });
    };
    const close = () => {
      field.classList.remove('is-choice-open');
      list.classList.remove('is-open', 'is-above');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (openChoice === api) openChoice = null;
    };
    const open = () => {
      if (openChoice && openChoice !== api) openChoice.close();
      openChoice = api;
      field.classList.add('is-choice-open');
      list.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      // Внизу экрана раскрываем вверх, чтобы список не обрезался.
      const below = window.innerHeight - trigger.getBoundingClientRect().bottom;
      const above = trigger.getBoundingClientRect().top;
      const opensAbove = below < 240 && above > below;
      list.classList.toggle('is-above', opensAbove);
      list.style.maxHeight = `${Math.max(110, Math.min(340, (opensAbove ? above : below) - 32))}px`;
      highlight(Math.max(0, options.findIndex(option => option.value === select.value)));
    };
    const choose = (index) => {
      if (!rows[index]) return;
      select.value = options[index].value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      field.classList.remove('is-choice-invalid');
      close();
      trigger.focus({ preventScroll: true });
    };
    const api = { close };
    trigger.addEventListener('click', () => field.classList.contains('is-choice-open') ? close() : open());
    trigger.addEventListener('keydown', event => {
      const expanded = field.classList.contains('is-choice-open');
      if (event.key === 'Escape') { if (expanded) { event.preventDefault(); close(); } return; }
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (expanded) choose(activeIndex); else open();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (!expanded) open();
        else if (event.key === 'Home') highlight(0);
        else if (event.key === 'End') highlight(rows.length - 1);
        else highlight(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const now = Date.now();
        typing = now - typingAt < 700 ? typing + event.key.toLocaleLowerCase('ru') : event.key.toLocaleLowerCase('ru');
        typingAt = now;
        const found = options.findIndex(option => option.textContent.toLocaleLowerCase('ru').startsWith(typing));
        if (found !== -1) { event.preventDefault(); if (!expanded) open(); highlight(found); }
      }
    });
    rows.forEach((row, index) => {
      row.addEventListener('click', () => choose(index));
      row.addEventListener('pointerenter', () => highlight(index, false));
    });
    document.addEventListener('pointerdown', event => {
      if (openChoice === api && !wrapper.contains(event.target)) close();
    });
    select.addEventListener('change', () => {
      sync();
      field.classList.remove('is-choice-invalid');
      trigger.removeAttribute('aria-invalid');
    });
    select.addEventListener('invalid', event => {
      event.preventDefault();
      field.classList.add('is-choice-invalid');
      trigger.setAttribute('aria-invalid', 'true');
      open();
      trigger.focus({ preventScroll: true });
    });
    window.addEventListener('resize', () => { if (openChoice === api) close(); });
    wrapper.append(trigger, list);
    content.append(wrapper);
    // Помечаем скрытый select лишь после того, как кастомное меню готово.
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    field.classList.add('booking__field--has-choice');
    sync();
  };
  bookingForm.querySelectorAll('select[name="from"], select[name="to"], select[name="passengers"]').forEach(enhanceBookingChoice);

  const dateInput = bookingForm.elements.namedItem('date');
  if (dateInput) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Krasnoyarsk', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    dateInput.min = `${parts.year}-${parts.month}-${parts.day}`;
  }
  const choices = {
    'Honda Stepwgn (белый)': 'stepwgn-white',
    'Honda Stepwgn (тёмный)': 'stepwgn-dark',
    'Toyota Voxy': 'voxy-white'
  };
  const requestedCar = new URLSearchParams(window.location.search).get('vehicle');
  if (requestedCar && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedCar)) selectedCar.value = requestedCar;

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
    const sendButton = contactForm.querySelector('button[type=submit]');
    if (sendButton) { sendButton.disabled = false; sendButton.textContent = 'Отправить заявку'; }
    status.textContent = "Заполните контакты и время подачи, затем отправьте заявку.";
    if (typeof dialog.showModal === "function") dialog.showModal();
  });
  destination.addEventListener("change", () => destination.setCustomValidity(""));
  bookingForm.elements.namedItem("from").addEventListener("change", () => destination.setCustomValidity(""));

  function updateAndScroll(value, car = "") {
    if (value) {
      destination.value = value;
      destination.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (car) selectedCar.value = choices[car] || car;
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
  contactForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!contactForm.reportValidity() || !bookingForm.reportValidity()) return;
    const submit = contactForm.querySelector('button[type="submit"]');
    if (submit?.disabled) return;
    const trip = new FormData(bookingForm);
    const contact = new FormData(contactForm);
    const payload = {
      clientName: String(contact.get('name') || ''),
      phone: String(contact.get('phone') || ''),
      from: String(trip.get('from') || ''),
      to: String(trip.get('to') || ''),
      date: String(trip.get('date') || ''),
      time: String(contact.get('time') || ''),
      passengers: Number(trip.get('passengers')),
      luggage: String(contact.get('luggage') || ''),
      vehicleSlug: selectedCar.value,
      website: String(contact.get('website') || '')
    };
    if (submit) { submit.disabled = true; submit.textContent = 'Отправляем…'; }
    status.textContent = 'Отправляем заявку…';
    try {
      const response = await fetch('/api/requests', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (response.status !== 201 || !result.success) {
        throw new Error(result.message || 'Не удалось отправить заявку. Попробуйте ещё раз.');
      }
      status.textContent = result.message || 'Заявка отправлена. Мы свяжемся с вами.';
      bookingForm.reset();
      bookingForm.querySelectorAll('select').forEach(select => select.dispatchEvent(new Event('change', { bubbles: true })));
      contactForm.reset();
      selectedCar.value = '';
      if (submit) submit.textContent = 'Заявка отправлена';
    } catch (error) {
      status.textContent = error.message || 'Не удалось отправить заявку.';
      if (submit) { submit.disabled = false; submit.textContent = 'Отправить заявку'; }
    }
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
