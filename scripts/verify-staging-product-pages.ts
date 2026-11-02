const base = process.env.TEST_BASE_URL;
const password = process.env.TEST_ACCOUNT_PASSWORD;
if (!base || !password) throw new Error("TEST_BASE_URL and TEST_ACCOUNT_PASSWORD are required.");

async function main() {
  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "customer@karamebay.rw",
      password,
      audience: "customer",
      portal: "customer",
    }),
  });
  if (!login.ok) throw new Error(`Customer sign in failed: ${login.status}`);
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Customer session cookie missing.");

  const storePath = "/stores/java-house-kigali-heights";
  const store = await fetch(base + storePath, { headers: { cookie } });
  const storeHtml = await store.text();
  if (!store.ok || !storeHtml.includes("Java House Kigali Heights"))
    throw new Error(`Restaurant page failed: ${store.status}`);

  const productPaths = [...new Set(
    [...storeHtml.matchAll(/\/stores\/java-house-kigali-heights\/products\/[a-z0-9]+/gi)]
      .map((match) => match[0]),
  )].slice(0, 10);
  if (productPaths.length < 3) throw new Error("Restaurant product links were not rendered.");

  for (const path of productPaths) {
    const product = await fetch(base + path, { headers: { cookie } });
    const html = await product.text();
    if (!product.ok || html.includes("This page couldn’t load") || !html.includes("Loading basket") || !html.includes("menu-engine-title"))
      throw new Error(`Product page failed: ${path} (${product.status})`);
  }
  console.log(JSON.stringify({ result: "PASS", store: storePath, productPages: productPaths.length }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
