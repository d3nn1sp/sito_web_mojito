/* ==========================================================================
   LIDO MOJITO - BOOKING ENGINE LOGIC (MODALITÀ RICHIESTA DISPONIBILITÀ)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Elementi DOM
  const checkinInput = document.getElementById("booking-checkin");
  const checkoutInput = document.getElementById("booking-checkout");
  const umbrellasInput = document.getElementById("booking-umbrellas");
  const adultsInput = document.getElementById("booking-adults");
  const childrenInput = document.getElementById("booking-children");
  const dateTriggerText = document.getElementById("date-trigger-text");
  
  const umbrellaCountVal = document.getElementById("count-umbrellas");
  const adultCountVal = document.getElementById("count-adulti");
  const childCountVal = document.getElementById("count-bambini");
  
  const summaryDates = document.getElementById("summary-dates");
  const summaryDetails = document.getElementById("summary-details");
  
  const bookingForm = document.getElementById("lido-booking-form");

  let checkinDate = null;
  let checkoutDate = null;
  let numUmbrellas = 1;
  let numAdulti = 2;
  let numBambini = 0;

  // 1. Inizializzazione Flatpickr Locale (Tema Italiano & Personalizzato)
  if (typeof flatpickr !== "undefined") {
    // Configura lingua italiana se disponibile
    const localeIt = window.flatpickr.l10ns.it || {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
        longhand: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]
      },
      months: {
        shorthand: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
        longhand: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
      }
    };
    
    const fp = flatpickr("#datepicker-trigger", {
      mode: "range",
      minDate: "today",
      dateFormat: "Y-m-d",
      locale: localeIt,
      animate: true,
      monthSelectorType: "dropdown",
      showMonths: 1,
      onReady: function(selectedDates, dateStr, instance) {
        initYearSelectDropdown(instance);
      },
      onMonthChange: function(selectedDates, dateStr, instance) {
        initYearSelectDropdown(instance);
      },
      onYearChange: function(selectedDates, dateStr, instance) {
        initYearSelectDropdown(instance);
      },
      onClose: function(selectedDates) {
        if (selectedDates.length === 2) {
          checkinDate = selectedDates[0];
          checkoutDate = selectedDates[1];
          
          const yyyymmddIn = formatDate(checkinDate);
          const yyyymmddOut = formatDate(checkoutDate);
          
          if (checkinInput) checkinInput.value = yyyymmddIn;
          if (checkoutInput) checkoutInput.value = yyyymmddOut;
          
          const formattedText = `${formatDisplayDate(checkinDate)} – ${formatDisplayDate(checkoutDate)}`;
          if (dateTriggerText) {
            dateTriggerText.textContent = formattedText;
            dateTriggerText.style.color = "#1C351F";
            dateTriggerText.style.fontWeight = "600";
          }
        } else {
          if (checkinInput) checkinInput.value = "";
          if (checkoutInput) checkoutInput.value = "";
          if (dateTriggerText) {
            dateTriggerText.textContent = "Scegli date (Check-in – Check-out)";
            dateTriggerText.style.fontWeight = "normal";
          }
          checkinDate = null;
          checkoutDate = null;
        }
        updateBookingSummary();
      }
    });

    // Reset date trigger
    const resetBtn = document.getElementById("datepicker-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fp.clear();
        if (checkinInput) checkinInput.value = "";
        if (checkoutInput) checkoutInput.value = "";
        if (dateTriggerText) {
          dateTriggerText.textContent = "Scegli date (Check-in – Check-out)";
          dateTriggerText.style.fontWeight = "normal";
        }
        checkinDate = null;
        checkoutDate = null;
        updateBookingSummary();
      });
    }

    // Helper per sostituire l'input numerico dell'anno con un vero select dropdown
    function initYearSelectDropdown(instance) {
      if (!instance || !instance.calendarContainer) return;
      const currentMonthEl = instance.calendarContainer.querySelector(".flatpickr-current-month");
      if (!currentMonthEl) return;

      // Rimuovi dal DOM il vecchio input numerico
      const numWrapper = currentMonthEl.querySelector(".numInputWrapper");
      if (numWrapper) {
        numWrapper.remove();
      }

      // Rimuovi eventuali select duplicati
      const allYearSelects = currentMonthEl.querySelectorAll(".custom-year-dropdown");
      if (allYearSelects.length > 1) {
        for (let i = 1; i < allYearSelects.length; i++) {
          allYearSelects[i].remove();
        }
      }

      let yearSelect = currentMonthEl.querySelector(".custom-year-dropdown");
      if (!yearSelect) {
        yearSelect = document.createElement("select");
        yearSelect.className = "custom-year-dropdown";
        yearSelect.setAttribute("aria-label", "Seleziona Anno");

        const startYear = new Date().getFullYear();
        for (let y = startYear; y <= 2050; y++) {
          const opt = document.createElement("option");
          opt.value = y;
          opt.textContent = y;
          yearSelect.appendChild(opt);
        }

        yearSelect.addEventListener("change", (e) => {
          e.stopPropagation();
          instance.changeYear(parseInt(e.target.value, 10));
        });

        currentMonthEl.appendChild(yearSelect);
      }

      if (yearSelect && instance.currentYear) {
        yearSelect.value = instance.currentYear;
      }
    }
  }

  // Helper date formatters
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  // 2. Logica Contatori (Increment/Decrement)
  const setupCounter = (btnMinusId, btnPlusId, valEl, currentVal, minVal, maxVal, onChange) => {
    const btnMinus = document.getElementById(btnMinusId);
    const btnPlus = document.getElementById(btnPlusId);

    if (btnMinus && btnPlus && valEl) {
      btnMinus.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentVal > minVal) {
          currentVal--;
          valEl.textContent = currentVal;
          onChange(currentVal);
        }
      });

      btnPlus.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentVal < maxVal) {
          currentVal++;
          valEl.textContent = currentVal;
          onChange(currentVal);
        }
      });
    }
  };

  // Setup Ombrelloni
  setupCounter("minus-umbrellas", "plus-umbrellas", umbrellaCountVal, numUmbrellas, 1, 10, (val) => {
    numUmbrellas = val;
    if (umbrellasInput) umbrellasInput.value = val;
    updateBookingSummary();
  });

  // Setup Adulti
  setupCounter("minus-adulti", "plus-adulti", adultCountVal, numAdulti, 1, 20, (val) => {
    numAdulti = val;
    if (adultsInput) adultsInput.value = val;
    updateBookingSummary();
  });

  // Setup Bambini
  setupCounter("minus-bambini", "plus-bambini", childCountVal, numBambini, 0, 20, (val) => {
    numBambini = val;
    if (childrenInput) childrenInput.value = val;
    updateBookingSummary();
  });

  // 3. Aggiornamento Riepilogo
  function updateBookingSummary() {
    let days = 0;
    
    if (checkinDate && checkoutDate) {
      const timeDiff = checkoutDate.getTime() - checkinDate.getTime();
      days = Math.ceil(timeDiff / (1000 * 3600 * 24));
      if (days <= 0) days = 1;
    }

    if (summaryDates) {
      if (checkinDate && checkoutDate) {
        summaryDates.textContent = `${formatDisplayDate(checkinDate)} – ${formatDisplayDate(checkoutDate)} (${days} ${days === 1 ? 'giorno' : 'giorni'})`;
      } else {
        summaryDates.textContent = "Nessuna data selezionata";
      }
    }

    if (summaryDetails) {
      const guestText = `${numAdulti} ${numAdulti === 1 ? 'Adulto' : 'Adulti'}${numBambini > 0 ? `, ${numBambini} ${numBambini === 1 ? 'Bambino' : 'Bambini'}` : ''}`;
      summaryDetails.textContent = `Ombrelloni: ${numUmbrellas} (con ${numUmbrellas * 2} lettini) | Ospiti: ${guestText}`;
    }
  }

  updateBookingSummary();

  // 4. Validazione Form Prima dell'Invio
  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      if (!checkinInput.value || !checkoutInput.value || !checkinDate || !checkoutDate) {
        e.preventDefault();
        alert("Per favore seleziona le date di Arrivo e Partenza prima di inviare la richiesta.");
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkinDate < today) {
        e.preventDefault();
        alert("La data di arrivo non può essere precedente ad oggi.");
        return false;
      }

      if (checkoutDate <= checkinDate) {
        e.preventDefault();
        alert("La data di partenza deve essere successiva alla data di arrivo.");
        return false;
      }
      
      const name = document.getElementById("full_name").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const terms = document.getElementById("terms").checked;
      const privacy = document.getElementById("privacy").checked;

      if (!name || !email || !phone || !terms || !privacy) {
        e.preventDefault();
        alert("Completa tutti i campi obbligatori e accetta i termini e la privacy policy.");
        return false;
      }
    });
  }
});
