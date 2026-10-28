import assert from "node:assert/strict";
import { bookRequestStatus, decodeBookField, safeDecode } from "@/lib/safe-decode";

assert.equal(safeDecode("%E0%A4%A"), null);
assert.equal(safeDecode("%"), null);
assert.equal(safeDecode("%E0%A4"), null);
assert.equal(safeDecode("galveston"), "galveston");
assert.equal(safeDecode("galveston%20bay"), "galveston bay");
assert.equal(safeDecode("%25"), "%");

assert.equal(bookRequestStatus("/book/%E0%A4%A", ""), "not-found");
assert.equal(bookRequestStatus("/book/%", ""), "not-found");
assert.equal(bookRequestStatus("/book", "?area=%E0%A4%A"), "not-found");
assert.equal(bookRequestStatus("/book", "?a=%"), "not-found");
assert.equal(bookRequestStatus("/book", "?area=%E0%A4%A&activity=wade"), "not-found");
// Node rewrites invalid UTF-8 to U+FFFD before the app sees the URL.
assert.equal(bookRequestStatus("/book", "?area=%EF%BF%BD%25A"), "not-found");
assert.equal(bookRequestStatus("/book", "?area=%EF%BF%BD"), "not-found");

assert.equal(bookRequestStatus("/book", ""), "ok");
assert.equal(bookRequestStatus("/book", "?area=galveston&activity=wade&theater=gulf"), "ok");
assert.equal(bookRequestStatus("/book", "?area=galveston%20bay"), "ok");
assert.equal(bookRequestStatus("/book", "?area=galveston+bay"), "ok");
assert.equal(bookRequestStatus("/book", "?area=%25"), "ok");
assert.equal(bookRequestStatus("/morning/%E0%A4%A", ""), "ok");

assert.equal(decodeBookField(undefined), undefined);
assert.equal(decodeBookField("galveston"), "galveston");
assert.equal(decodeBookField("galveston%20bay"), "galveston bay");
assert.equal(decodeBookField("%"), "%");
assert.equal(decodeBookField("100%"), "100%");
assert.equal(decodeBookField("\uFFFD%A"), null);
assert.equal(decodeBookField("%E0%A4%A"), null);

console.log("ok safe decode");
