const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const accounts = [
  {
    email: "customer@karamebay.rw",
    audience: "customer",
    role: "CUSTOMER",
    cookie: "karame_customer_session",
    redirectTo: "/customer/account",
  },
  {
    email: "admin@karamebay.rw",
    audience: "staff",
    role: "ADMIN",
    cookie: "karame_admin_session",
    redirectTo: "/admin",
  },
  {
    email: "rider@karamebay.rw",
    audience: "staff",
    role: "RIDER",
    cookie: "karame_rider_session",
    redirectTo: "/rider",
  },
] as const;

async function main() {
  const results = [];
  for (const account of accounts) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: account.email,
        password: "Karame@2026",
        audience: account.audience,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(`${account.role} login failed: ${data.error ?? response.status}`);
    const setCookie = response.headers.get("set-cookie") ?? "";
    if (!setCookie.includes(`${account.cookie}=`))
      throw new Error(`${account.role} did not receive its isolated session cookie`);
    if (data.user?.role !== account.role || data.user?.redirectTo !== account.redirectTo)
      throw new Error(`${account.role} received an incorrect login destination`);
    results.push({ role: account.role, redirectTo: data.user.redirectTo, isolated: true });
  }
  console.log(JSON.stringify({ result: "PASS", logins: results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
