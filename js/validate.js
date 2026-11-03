/* Pure validation rules for the enquiry forms. Tested by tests/validate.test.mjs. */
(function (root) {
  var MAX_FILE = 5 * 1024 * 1024; // FormSubmit attachment limit we design for
  var TYPES = ["image/jpeg", "image/png"];

  function name(v) {
    v = (v || "").trim();
    if (!v) return "Please enter your name.";
    if (v.length < 2) return "Please enter your full name.";
    return "";
  }
  function email(v) {
    v = (v || "").trim();
    if (!v) return "Please enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Please enter a valid email address, e.g. name@example.co.uk.";
    return "";
  }
  function phone(v) {
    v = (v || "").trim();
    if (!v) return "Please enter a phone number so we can arrange the call.";
    if (!/^[+\d\s().-]+$/.test(v)) return "Phone numbers can only contain digits, spaces and + ( ) -.";
    var digits = v.replace(/\D/g, "").length;
    if (digits < 10 || digits > 15) return "Please enter a full phone number, e.g. 07700 900123.";
    return "";
  }
  function message(v) {
    v = (v || "").trim();
    if (!v) return "Please tell us a little about the job.";
    if (v.length < 10) return "Please add a few more details (at least 10 characters).";
    return "";
  }
  function file(f) {
    if (!f) return "";
    var ext = /\.(jpe?g|png)$/i.test(f.name || "");
    if (TYPES.indexOf(f.type) === -1 && !ext) return "Please upload a JPEG or PNG image.";
    if (f.size > MAX_FILE) return "That image is " + (f.size / 1048576).toFixed(1) + " MB. Please choose one under 5 MB.";
    return "";
  }

  root.JTValidate = { name: name, email: email, phone: phone, message: message, file: file, MAX_FILE: MAX_FILE };
})(typeof window !== "undefined" ? window : globalThis);
