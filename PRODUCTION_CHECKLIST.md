# Karame Bay Production Checklist

## A. Architecture

- [ ] Customer Website separated from Staff Portal or domain controls verified.
- [ ] Backend API configured.
- [ ] One PostgreSQL production database configured.
- [x] Prisma provider converted to PostgreSQL.
- [ ] PostgreSQL migrations tested against a live empty PostgreSQL database.
- [ ] Catalog-only production export imported into PostgreSQL.
- [ ] Dynamic store types working.
- [ ] Restaurant Menu Engine working.
- [ ] Retail Catalog Engine working.
- [ ] Parcel delivery working.
- [ ] No customer-visible Admin or staff links.

## B. Data preservation

- [ ] Java House Kigali Heights preserved.
- [ ] Karame Bay Market preserved.
- [ ] Existing store types preserved.
- [ ] Existing categories preserved.
- [ ] Existing products preserved.
- [ ] Existing prices preserved.
- [ ] Existing images preserved.
- [ ] Existing local image references migrated to Cloudinary.
- [x] New parcel proof uploads use Cloudinary instead of local disk.
- [ ] Add-ons and choice groups preserved.
- [x] Fresh-launch operational records cleaned from source database.
- [ ] Production PostgreSQL confirmed with zero customers.
- [ ] Production PostgreSQL confirmed with zero riders.
- [ ] Production PostgreSQL confirmed with zero orders.
- [ ] Production PostgreSQL confirmed with zero notifications.
- [ ] No destructive reset or seed operation used.

## C. Customer testing

- [ ] Registration works.
- [ ] Required phone number works.
- [ ] Rwanda phone normalization works.
- [ ] Email verification works.
- [ ] Login and logout work.
- [ ] Store browsing works.
- [ ] Explore page reads dynamic store types.
- [ ] Search works.
- [ ] Restaurant customization works.
- [ ] Retail quantity and stock work.
- [ ] Cart works.
- [ ] One-store-per-cart rule works.
- [ ] Checkout works.
- [ ] MoMo instructions work.
- [ ] Order history works.
- [ ] Customer notifications work.
- [ ] Customer receives email only when order is accepted.
- [ ] Customer receives email only when order is delivered.
- [ ] Parcel booking works.
- [ ] Reviews work after completed orders.

## D. Admin testing

- [ ] Admin login works.
- [ ] Admin dashboard works.
- [ ] Admin can create unlimited store types.
- [ ] Admin can assign an engine to a store type.
- [ ] Admin can create stores.
- [ ] Admin can edit stores.
- [ ] Admin can archive/delete stores safely.
- [ ] Admin can manage restaurant menus.
- [ ] Admin can manage retail catalogs.
- [ ] Admin can manage products.
- [ ] Admin can manage images.
- [ ] Admin can manage inventory.
- [ ] Admin can manage customers.
- [ ] Admin can manage riders.
- [ ] Admin can accept orders.
- [ ] Admin can reject orders.
- [ ] Admin can verify payments.
- [ ] Admin can manually assign riders.
- [ ] No automatic rider assignment exists.
- [ ] Reports and filters work.
- [ ] Price import approval progress works.
- [ ] Tuma250 import can target retail stores only.

## E. Rider testing

- [ ] Rider login works.
- [ ] Rider receives assignments.
- [ ] Rider can accept an assignment.
- [ ] Rider can update delivery status.
- [ ] Rider can upload parcel proof photos where required.
- [ ] Rider cannot access Admin-only functions.
- [ ] Delivered status updates the order correctly.
- [ ] Customer tracking updates after rider status changes.

## F. Security

- [ ] No secrets committed to Git.
- [ ] No secrets exposed in frontend bundles.
- [ ] Production CORS configured if API is split.
- [ ] Secure cookies configured.
- [ ] HTTPS enforced.
- [ ] Passwords hashed.
- [ ] Rate limiting enabled.
- [ ] Security headers enabled.
- [ ] Input validation enabled.
- [ ] File uploads restricted and validated.
- [ ] Local file uploads replaced with durable storage.
- [x] Parcel proof media storage moved to Cloudinary for new uploads.
- [ ] Admin routes protected.
- [ ] Rider routes protected.
- [ ] Portal not linked from the customer website.
- [ ] No debug endpoints.
- [ ] No test accounts exposed.
- [ ] No sensitive logs.

## G. Railway

- [ ] PostgreSQL service created.
- [ ] Backend service deployed.
- [ ] Customer service deployed.
- [ ] Staff Portal service deployed.
- [ ] Build commands verified.
- [ ] Start commands verified.
- [ ] Health checks pass.
- [ ] Migrations complete on Railway PostgreSQL.
- [ ] Environment variables added.
- [ ] Railway-generated domains work.
- [ ] Custom domains connected.
- [ ] SSL active.

## H. External services

- [ ] Gmail 2-Step Verification enabled.
- [ ] Gmail App Password configured in Railway variables.
- [ ] Accepted-order email tested.
- [ ] Delivered-order email tested.
- [ ] Other status emails confirmed disabled.
- [ ] Cloudinary configured.
- [ ] Product image upload tested.
- [ ] Store logo upload tested.
- [ ] Store cover upload tested.
- [ ] Image deletion and replacement tested.
- [ ] OpenStreetMap integration tested.
- [ ] Routing/geocoding provider tested.

## I. UI and content

- [ ] No "Testing" wording.
- [ ] No "Testing Auth" wording.
- [ ] No developer labels.
- [ ] No dummy data visible.
- [ ] No customer links to Admin.
- [ ] No broken links.
- [ ] No missing images.
- [ ] No console errors.
- [ ] No oversized product cards.
- [ ] Desktop layout verified.
- [ ] Mobile layout verified.
- [ ] Tablet responsiveness verified.
- [ ] Empty states are clear.
- [ ] Error messages are helpful.
- [ ] Support phone number verified.
- [ ] WhatsApp support number verified.
- [ ] Instagram link verified.

## J. Final launch

- [ ] Fresh production backup created.
- [ ] Restore procedure tested in a separate environment.
- [ ] Terms and privacy pages reviewed.
- [ ] Support phone number verified.
- [ ] Support email verified.
- [ ] Small real order tested.
- [ ] Admin accepted the real order.
- [ ] Rider completed the real delivery.
- [ ] Customer notifications confirmed.
- [ ] Parcel test delivery completed.
- [ ] Monitoring enabled.
- [ ] Launch approval recorded.
