import assert from "node:assert/strict";

const staff = process.env.STAFF_TEST_URL ?? "http://127.0.0.1:3110";
const customer = process.env.CUSTOMER_TEST_URL ?? "http://127.0.0.1:3111";
async function main() {
  for (const path of ["/staff", "/partner", "/partner/login", "/partner/register", "/partner/forgot-password", "/partner/reset-password", "/partner/verify-email", "/api/partner/products?storeId=anything", "/api/auth/verify-email?role=PARTNER"]) {
    const response = await fetch(customer + path, { redirect: "manual" });
    assert.equal(response.status, 404, `Customer must not expose ${path}`);
  }
  for (const [path, body] of [["/api/auth/register", { accountType: "partner" }], ["/api/auth/login", { email: "partner@example.invalid", password: "test", audience: "partner", portal: "partner" }]] as const) {
    const response = await fetch(customer + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(response.status, 404, `Customer must not accept partner accounts through ${path}`);
  }
  const landing = await fetch(staff + "/", { redirect: "manual" });
  assert.equal(landing.status, 307);
  assert.equal(new URL(landing.headers.get("location")!, staff).pathname, "/staff");
  const chooser = await fetch(staff + "/staff");
  assert.equal(chooser.status, 200);
  const html = await chooser.text();
  assert.ok(html.includes('href="/admin/login"') && html.includes('href="/partner/login"') && html.includes('href="/partner/register"') && html.includes('href="/rider/login"'));
  for (const path of ["/admin/login", "/partner/login"]) {
    const response = await fetch(staff + path);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(text.includes('aria-label="Sign-in account type"') && text.includes('href="/admin/login"') && text.includes('href="/partner/login"'), `${path} should offer Admin and Partner choices`);
  }
  assert.equal((await fetch(staff + "/partner/register")).status, 200);
  assert.equal((await fetch(staff + "/api/partner/products?storeId=anything")).status, 401);
  const customerLogin = await fetch(customer + "/customer/login");
  assert.equal(customerLogin.status, 200);
  assert.ok(!(await customerLogin.text()).includes('href="/partner/'));
  console.log("PASS: Staff Admin/Partner sign-in choices, partner self-registration access, driver link, and customer route/API isolation.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
