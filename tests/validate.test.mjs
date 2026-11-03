// Run: node tests/validate.test.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const ctx = { window: {} };
vm.runInNewContext(readFileSync(new URL("../js/validate.js", import.meta.url), "utf8"), ctx);
const V = ctx.window.JTValidate;

assert.ok(V.name(""));
assert.equal(V.name("Jo Smith"), "");
assert.ok(V.email("bad@"));
assert.ok(V.email("a@b.c"));
assert.equal(V.email("name@example.co.uk"), "");
assert.ok(V.phone(""));
assert.ok(V.phone("12345"));
assert.ok(V.phone("07700 abc 123"));
assert.equal(V.phone("07700 900123"), "");
assert.equal(V.phone("+44 (0)7700 900-123"), "");
assert.ok(V.message("hi"));
assert.equal(V.message("Roof check for a semi-detached house"), "");
assert.equal(V.file(undefined), "");
assert.equal(V.file({ name: "a.jpg", type: "image/jpeg", size: 1000 }), "");
assert.equal(V.file({ name: "a.PNG", type: "", size: 1000 }), "");
assert.ok(V.file({ name: "a.gif", type: "image/gif", size: 1000 }));
assert.ok(V.file({ name: "a.jpg", type: "image/jpeg", size: V.MAX_FILE + 1 }));
console.log("validate.js: all checks passed");
