/* JT Drones — site behaviour. No dependencies. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Header ---------- */
  var header = $(".site-header");
  function onScroll() { header && header.classList.toggle("is-solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = $(".menu-toggle");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Menu";
    }
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
  $$(".mobile-nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setMenu(false); toggle.focus(); } });
  window.matchMedia("(min-width: 960px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });

  /* ---------- Dialog helpers ---------- */
  function openDialog(d) {
    if (!d || d.open) return;
    d.showModal();
    document.body.classList.add("modal-open");
  }
  $$("dialog").forEach(function (d) {
    d.addEventListener("close", function () { document.body.classList.remove("modal-open"); });
    d.addEventListener("click", function (e) { if (e.target === d && d.classList.contains("modal")) d.close(); }); // backdrop click
    $$("[data-close]", d).forEach(function (b) { b.addEventListener("click", function () { d.close(); }); });
  });

  /* ---------- Book a Call ---------- */
  var book = $("#book-dialog");
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-book]");
    if (!trigger || !book || !book.showModal) return; // no <dialog> support: link falls through to contact page
    e.preventDefault();
    setMenu(false);
    var service = trigger.getAttribute("data-service") || "";
    var field = $("[data-service-field]", book);
    var desc = $("#b-desc", book);
    if (field) field.value = service;
    if (service && desc && !desc.value.trim()) desc.value = "I'm interested in: " + service + "\n\n";
    openDialog(book);
    $("#b-name", book).focus();
  });
  if (location.hash === "#book" && book && book.showModal && !$("#contact-form")) openDialog(book);

  /* ---------- Forms ---------- */
  var V = window.JTValidate;
  var rules = { name: "name", email: "email", phone: "phone", description: "message", message: "message" };

  function fieldError(input, msg) {
    var err = document.getElementById((input.getAttribute("aria-describedby") || "").split(" ").pop());
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg;
    var up = input.closest("[data-upload]");
    if (up) up.classList.toggle("is-invalid", !!msg);
    return !msg;
  }
  function check(input) {
    if (input.type === "file") return fieldError(input, V.file(input.files && input.files[0]));
    var rule = rules[input.name];
    return rule ? fieldError(input, V[rule](input.value)) : true;
  }

  $$("form[data-validate]").forEach(function (form) {
    var inputs = $$("input.input, textarea.input, input[type=file]", form);
    var alertBox = $("[data-form-alert]", form);
    var submit = $("button[type=submit]", form);
    var next = $("input[name=_next]", form);
    // Return visitors to the thank-you page on whichever host served the form (live or a preview).
    if (next && /^https?:/.test(location.protocol)) next.value = location.origin + location.pathname.replace(/[^/]*$/, "") + "thanks.html";

    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { if (input.value) check(input); });
      input.addEventListener("input", function () { if (input.getAttribute("aria-invalid") === "true") check(input); });
    });

    // Upload preview
    var fileInput = $("input[type=file]", form);
    var preview = $("[data-upload-preview]", form);
    var zone = $("[data-upload]", form);
    function clearFile() {
      fileInput.value = "";
      preview.classList.remove("is-visible");
      zone.hidden = false;
      fieldError(fileInput, "");
    }
    if (fileInput && preview) {
      fileInput.addEventListener("change", function () {
        var f = fileInput.files[0];
        if (!f) return clearFile();
        if (!check(fileInput)) { fileInput.value = ""; return; }
        var thumb = $("[data-upload-thumb]", preview);
        if (thumb.src) URL.revokeObjectURL(thumb.src);
        thumb.src = URL.createObjectURL(f);
        $("[data-upload-name]", preview).textContent = f.name;
        $("[data-upload-size]", preview).textContent = (f.size / 1048576).toFixed(2) + " MB";
        preview.classList.add("is-visible");
        zone.hidden = true;
      });
      $("[data-upload-remove]", preview).addEventListener("click", function () { clearFile(); fileInput.focus(); });
    }

    form.addEventListener("submit", function (e) {
      var bad = inputs.filter(function (i) { return !check(i); });
      alertBox.hidden = true;
      if (bad.length) {
        e.preventDefault();
        alertBox.textContent = bad.length === 1 ? "Please fix the highlighted field and try again." : "Please fix the " + bad.length + " highlighted fields and try again.";
        alertBox.hidden = false;
        bad[0].focus();
        return;
      }
      if (!navigator.onLine) {
        e.preventDefault();
        alertBox.textContent = "You appear to be offline. Please check your connection and try again — nothing has been sent yet.";
        alertBox.hidden = false;
        return;
      }
      submit.dataset.label = submit.firstChild.textContent;
      submit.disabled = true;
      submit.firstChild.textContent = "Sending… ";
    });
  });
  // Re-enable buttons if the visitor comes back via the browser's back button.
  window.addEventListener("pageshow", function () {
    $$("form[data-validate] button[type=submit]").forEach(function (b) {
      b.disabled = false;
      if (b.dataset.label) b.firstChild.textContent = b.dataset.label;
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = $("#lightbox");
  var group = [], index = 0;
  function show(i) {
    index = (i + group.length) % group.length;
    var a = group[index], img = $("img", a);
    var lbImg = $("[data-lb-img]", lb);
    lbImg.src = a.href;
    lbImg.alt = img ? img.alt : "";
    $("[data-lb-caption]", lb).textContent = a.getAttribute("data-caption") || (img ? img.alt : "");
    $("[data-lb-count]", lb).textContent = (index + 1) + " / " + group.length;
    // Preload neighbours for instant prev/next
    [index + 1, index - 1].forEach(function (n) { new Image().src = group[(n + group.length) % group.length].href; });
  }
  if (lb && lb.showModal) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[data-lightbox]");
      if (!a) return;
      e.preventDefault();
      group = $$('a[data-lightbox="' + a.getAttribute("data-lightbox") + '"]').filter(function (x) { return !x.hidden; });
      show(group.indexOf(a));
      openDialog(lb);
    });
    $("[data-lb-prev]", lb).addEventListener("click", function () { show(index - 1); });
    $("[data-lb-next]", lb).addEventListener("click", function () { show(index + 1); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    $(".lightbox__stage", lb).addEventListener("click", function (e) { if (e.target === e.currentTarget) lb.close(); });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Gallery filters ---------- */
  $$("[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      $$("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      $$("[data-cat]").forEach(function (item) { item.hidden = f !== "all" && item.getAttribute("data-cat") !== f; });
    });
  });

  /* ---------- Hero video ---------- */
  var video = $(".hero video");
  var vt = $(".video-toggle");
  if (video) {
    if (reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
    if (vt) {
      var sync = function () {
        vt.setAttribute("aria-pressed", String(video.paused));
        vt.setAttribute("aria-label", video.paused ? "Play background video" : "Pause background video");
      };
      video.addEventListener("play", sync);
      video.addEventListener("pause", sync);
      vt.addEventListener("click", function () { if (video.paused) video.play(); else video.pause(); });
      sync();
    }
  }

  /* ---------- Reveal on scroll ---------- */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Cookie consent (GA4 loads only after opt-in) ---------- */
  var GA_ID = "G-VG5N6LJYTV"; // public measurement ID, not a secret
  var banner = $("#cookie-banner");
  function getConsent() { var m = document.cookie.match(/(?:^|; )cookie_consent=([^;]*)/); return m ? m[1] : ""; }
  function setConsent(v) { document.cookie = "cookie_consent=" + v + ";max-age=" + 60 * 60 * 24 * 180 + ";path=/;SameSite=Lax"; }
  function loadAnalytics() {
    if (window.gtag) return window.gtag("consent", "update", { analytics_storage: "granted" });
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { anonymize_ip: true });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
  }
  function removeAnalyticsCookies() {
    if (window.gtag) window.gtag("consent", "update", { analytics_storage: "denied" });
    var host = location.hostname.replace(/^www\./, "");
    document.cookie.split("; ").forEach(function (c) {
      var n = c.split("=")[0];
      if (/^_ga/.test(n)) ["", host, "." + host].forEach(function (d) {
        document.cookie = n + "=;max-age=0;path=/" + (d ? ";domain=" + d : "");
      });
    });
  }
  if (banner) {
    var consent = getConsent();
    if (consent === "true") loadAnalytics();
    else if (!consent) banner.hidden = false;
    $$("[data-cookie]", banner).forEach(function (b) {
      b.addEventListener("click", function () {
        var yes = b.getAttribute("data-cookie") === "accept";
        setConsent(String(yes));
        if (yes) loadAnalytics(); else removeAnalyticsCookies();
        banner.hidden = true;
      });
    });
    $$("[data-cookie-settings]").forEach(function (b) {
      b.addEventListener("click", function () { banner.hidden = false; $("[data-cookie]", banner).focus(); });
    });
  }
})();
