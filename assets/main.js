/* Northbridge Logistics — shared behavior */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile navigation ---------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    var closeNav = function () {
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("open");
    };
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".site-header")) closeNav();
    });
  }

  /* ---------- sticky header shadow ---------- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- scroll reveal ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && "IntersectionObserver" in window && !prefersReduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("revealed"); });
  }

  /* ---------- animated counters (stats) ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && !prefersReduced && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count"));
        var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1400, start = null;
        var step = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals) + (p === 1 ? suffix : "");
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target.toFixed(decimals) + suffix;
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------- FAQ accordion ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".accordion-trigger"), function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".accordion-item");
      var open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- form helpers ---------- */
  function setInvalid(field, on) {
    field.classList.toggle("invalid", on);
  }
  function errNode(field) {
    return field.querySelector(".error-msg");
  }

  /* ---------- quote wizard ---------- */
  var wizard = document.getElementById("quote-wizard");
  if (wizard) {
    var panes = Array.prototype.slice.call(wizard.querySelectorAll(".wizard-pane"));
    var headSteps = Array.prototype.slice.call(wizard.querySelectorAll(".wizard-step"));
    var summary = wizard.querySelector("#summary-body");
    var SAMPLE_RATE = 2000; /* placeholder per-mile base for demo */
    var cost = null;
    var current = 0;

    function showPane(i, noScroll) {
      current = i;
      panes.forEach(function (p, idx) {
        p.classList.toggle("active", idx === i);
        p.setAttribute("hidden", idx !== i);
      });
      headSteps.forEach(function (s, idx) {
        s.classList.toggle("active", idx === i);
        s.classList.toggle("done", idx < i);
      });
      var back = wizard.querySelector("[data-step='back']");
      var next = wizard.querySelector("[data-step='next']");
      if (back) back.hidden = i === 0;
      if (next) {
        next.hidden = false;
        next.textContent = i === panes.length - 1 ? "Request my quote" : (i === panes.length - 2 ? "Review quote" : "Continue");
      }
      if (!noScroll) {
        var pane = panes[i];
        if (pane) pane.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      }
    }

    function paneValid(i) {
      var fields = panes[i].querySelectorAll("[data-required]");
      var summaryBox = panes[i].querySelector(".form-errors-summary");
      var firstBad = null;
      var count = 0;
      fields.forEach(function (ctrl) {
        var wrap = ctrl.closest(".field");
        var ok = ctrl.checkValidity();
        if (wrap) setInvalid(wrap, !ok);
        if (!ok) { count++; if (!firstBad) firstBad = ctrl; }
      });
      if (summaryBox) {
        summaryBox.classList.toggle("show", count > 0);
        if (count > 0 && firstBad) {
          var target = firstBad;
          if (!target.id && firstBad.closest(".field")) {
            target = firstBad.closest(".field").querySelector("input,select,textarea") || firstBad;
          }
          var link = (target && target.id)
            ? '<a href="#' + target.id + '">Review the highlighted fields</a>.'
            : "Please correct the highlighted fields.";
          summaryBox.innerHTML =
            "<strong>" + count + " required field" + (count > 1 ? "s need" : " needs") +
            " attention.</strong> " + link;
        }
      }
      return count === 0;
    }

    var nextBtn = wizard.querySelector("[data-step='next']");
    var backBtn = wizard.querySelector("[data-step='back']");
    if (backBtn) backBtn.addEventListener("click", function () { if (current > 0) showPane(current - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (!paneValid(current)) return;
      if (current < panes.length - 1) { showPane(current + 1); return; }
      submitQuote(wizard.querySelector("#quote-form"));
    });

    showPane(0, true);

    var measure = document.getElementById("field-measure");
    var serviceRadios = Array.prototype.slice.call(wizard.querySelectorAll('input[name="service"]'));
    function syncMeasure() {
      var svc = (wizard.querySelector('input[name="service"]:checked') || {}).value;
      if (measure) measure.hidden = !(svc === "Full Truckload" || svc === "Expedited");
    }
    serviceRadios.forEach(function (r) { r.addEventListener("change", syncMeasure); });
    syncMeasure();
  }

  function submitQuote(form) {
    var fd = new FormData(form);
    var d = {};
    fd.forEach(function (v, k) { d[k] = v; });
    var base = { "Full Truckload": 420, "Less-than-truckload": 260, Warehousing: 180, "Expedited": 590, "Last-mile": 210 }[d.service] || 300;
    var weight = Math.max(1, parseFloat(d.weight) || 1);
    var miles = 540;
    cost = Math.round(base + (weight / 1000) * SAMPLE_RATE * 1.4 + miles * 1.1);
    var origin = d.origin || "";
    var dest = d.destination || "";
    var originCity = origin.split(",")[0].trim() || "Origin";
    var destCity = dest.split(",")[0].trim() || "Destination";
    var when = d.pickup ? " " + d.pickup : " as soon as possible";

    summary.innerHTML =
      "<div class='quote-summary-rows'>" +
      row("Service", serviceName(d.service)) +
      row("Shipment", quantityLabel(d)) +
      row("Route", originCity + " → " + destCity) +
      row("Pickup", d.pickup || "As soon as possible") +
      row("Contact", d.fname + " " + d.lname + " · " + d.email) +
      "</div>" +
      "<div class='quote-price'><span>Estimated freight charge</span><strong>$" +
      cost.toLocaleString("en-US") + "</strong></div>" +
      "<p class='muted small-note'>Estimate is indicative only. A dispatcher will confirm the binding rate and schedule within 2 business hours.</p>";

    wizard.querySelector("#quote-form").hidden = true;
    wizard.querySelector(".wizard-head").hidden = true;
    var success = document.getElementById("quote-success");
    if (success) success.style.display = "block";
    success.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  function serviceName(v) {
    return { "Full Truckload": "Full Truckload (FTL)", "Less-than-truckload": "Less-than-truckload (LTL)", Warehousing: "Warehousing & storage", Expedited: "Expedited delivery", "Last-mile": "Last-mile delivery" }[v] || v;
  }
  function quantityLabel(d) {
    if (d.service === "Full Truckload") return "One full trailer";
    if (d.service === "Less-than-truckload") return d.pallets ? d.pallets + " pallet" + (d.pallets > 1 ? "s" : "") : "Partial load";
    if (d.service === "Warehousing") return d.months ? d.months + " month" + (d.months > 1 ? "s" : "") + " storage" : "Storage";
    if (d.service === "Expedited") return d.load ? d.load : "Expedited";
    return d.vans ? d.vans + " van order" + (d.vans > 1 ? "s" : "") : "Delivery";
  }
  function row(k, v) {
    return "<div class='qs-row'><span>" + k + "</span><strong>" + v + "</strong></div>";
  }

  /* ---------- generic form validation (contact + quote step fields) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("form[data-validate]"), function (form) {
    var button = form.querySelector("button[type='submit']");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll("[data-required]");
      var count = 0, firstBad = null;
      fields.forEach(function (ctrl) {
        var wrap = ctrl.closest(".field");
        var ok = ctrl.checkValidity();
        if (wrap) setInvalid(wrap, !ok);
        if (!ok) { count++; if (!firstBad) firstBad = ctrl; }
      });
      var summaryBox = form.querySelector(".form-errors-summary");
      if (summaryBox) {
        summaryBox.classList.toggle("show", count > 0);
        if (count > 0 && firstBad) {
          summaryBox.innerHTML =
            "<strong>" + count + " required field" + (count > 1 ? "s need" : " needs") +
            " attention.</strong> " +
            '<a href="#' + firstBad.id + '">Review the highlighted fields</a>.';
        }
      }
      if (count > 0) return;
      var btn = button;
      var orig = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      var success = document.getElementById("contact-success");
      window.setTimeout(function () {
        if (success) {
          if (form) form.hidden = true;
          success.style.display = "block";
        }
        if (btn) { btn.disabled = false; btn.textContent = orig; }
        if (success) {
          success.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
        }
      }, 700);
    });
  });

  /* live revalidation on blur */
  Array.prototype.forEach.call(document.querySelectorAll("[data-required]"), function (ctrl) {
    var field = ctrl.closest(".field");
    ctrl.addEventListener("blur", function () {
      if (field && !ctrl.validity.valid) setInvalid(field, true);
    });
    ctrl.addEventListener("input", function () {
      if (field && ctrl.validity.valid) setInvalid(field, false);
    });
  });

  /* ---------- footer year ---------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();