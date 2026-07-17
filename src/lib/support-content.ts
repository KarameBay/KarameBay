import type { SupportSection } from "@/components/support/support-document";

export const helpSections: SupportSection[] = [
  { title: "Store orders", paragraphs: ["Open My Orders to see payment, preparation, rider assignment, and delivery updates."], bullets: ["Keep your order number ready when contacting support.", "Only confirm MoMo payment after completing the payment.", "Use the delivery map pin and exact address details."] },
  { title: "Parcel deliveries", paragraphs: ["Use My Parcels to follow admin review, rider assignment, pickup, route progress, and handover."], bullets: ["Do not send prohibited or unsafe items.", "Give the delivery confirmation code only to the rider at handover."] },
  { title: "Account and payments", paragraphs: ["Use the account pages to update your profile, phone number, saved addresses, and email verification."], bullets: ["Never share passwords or verification codes.", "Contact support if a verified payment or refund needs investigation."] },
];

export const faqSections: SupportSection[] = [
  { title: "How is the delivery fee calculated?", paragraphs: ["The system uses the driving route between the store and your confirmed map location. The route distance, fee, and estimated time update when the location changes."] },
  { title: "When can I review an order?", paragraphs: ["A review becomes available only after an order is marked Delivered. Each order can be reviewed once and edited for 24 hours."] },
  { title: "Who can see my phone number?", paragraphs: ["Authorized administrators can use it for order support. Only the rider assigned to an active delivery can use it for delivery communication."] },
  { title: "How is Mobile Money verified?", paragraphs: ["After you confirm payment, the payment remains pending until an administrator verifies it. The latest payment and order status appears in My Orders."] },
  { title: "How do I report a problem?", paragraphs: ["Open Help & Support in your customer account and contact support with your order or parcel reference and a clear description of the issue."] },
];

export const privacySections: SupportSection[] = [
  { title: "Information we collect", paragraphs: ["{business} collects account, contact, address, order, payment-status, location, and delivery information needed to provide its services."] },
  { title: "How information is used", paragraphs: ["Information is used to authenticate customers, fulfil orders and parcels, calculate routes, communicate delivery updates, prevent abuse, and provide support."] },
  { title: "Contact privacy", paragraphs: ["Customer phone numbers are not public. Access is limited to authorized administrators and an assigned rider while a delivery is active."] },
  { title: "Your choices", paragraphs: ["Customers may update their profile and saved addresses, request support, and ask questions about their information using the contact details on this page."] },
];

export const termsSections: SupportSection[] = [
  { title: "Using the service", paragraphs: ["By using {business}, customers agree to provide accurate account, location, order, and payment information and to use the platform lawfully."] },
  { title: "Orders and availability", paragraphs: ["Products, prices, preparation times, and availability may change. An order is not complete until the required payment and delivery workflow is finished."] },
  { title: "Customer responsibilities", paragraphs: ["Customers must keep account credentials secure, provide a reachable phone number, confirm an accurate delivery point, and inspect parcel restrictions before booking."] },
  { title: "Service changes", paragraphs: ["{business} may update service rules to improve safety, comply with law, or support new services. The current policies are published on this website."] },
];

export const deliverySections: SupportSection[] = [
  { title: "Delivery location", paragraphs: ["Customers must confirm a map pin and provide useful address details. Route distance is calculated by the routing service, not entered manually."] },
  { title: "Delivery timing", paragraphs: ["Estimated times are guidance and may change because of preparation, traffic, weather, access, or customer availability."] },
  { title: "Handover", paragraphs: ["Keep your phone reachable. The assigned rider may contact you only for an active delivery. Confirm that the order is yours before accepting it."] },
  { title: "Delivery problems", paragraphs: ["Report missing, damaged, incorrect, or undelivered items promptly with the order reference and relevant details."] },
];

export const refundSections: SupportSection[] = [
  { title: "When a refund may apply", paragraphs: ["Refund review may apply to a failed or duplicate payment, an admin-rejected order, a confirmed missing order, or another verified service failure."] },
  { title: "Review process", paragraphs: ["Contact support with the order number, payment details, and reason. {business} will verify the order and payment records before approving a refund."] },
  { title: "Refund timing", paragraphs: ["Approved refund timing depends on the payment provider. Support will communicate the recorded refund status through the available contact channel."] },
  { title: "Non-refundable situations", paragraphs: ["Refunds may be declined for completed correct deliveries, inaccurate customer information, customer unavailability, or issues unsupported by the order record."] },
];

export const parcelPolicySections: SupportSection[] = [
  { title: "Accurate booking information", paragraphs: ["Senders must provide accurate pickup, recipient, contents, size, weight, value, contact, and location information."] },
  { title: "Packaging", paragraphs: ["Items must be safely packed for motorcycle or van transport. Fragile items require appropriate protection and disclosure during booking."] },
  { title: "Inspection and refusal", paragraphs: ["{business} may review, reject, or cancel a parcel that is unsafe, prohibited, inaccurately described, or unsuitable for available vehicles."] },
  { title: "Pickup and handover", paragraphs: ["The sender and recipient must be reachable. Confirmation controls and delivery status records protect both parties during handover."] },
];

export const prohibitedSections: SupportSection[] = [
  { title: "Never send", paragraphs: ["The following items are prohibited from the parcel delivery service."], bullets: ["Weapons, ammunition, explosives, or fireworks", "Illegal drugs or controlled substances", "Hazardous, corrosive, toxic, radioactive, or highly flammable materials", "Stolen goods, counterfeit documents, or unlawful items", "Cash, negotiable instruments, or irreplaceable original documents without prior approval", "Live animals or human remains", "Unsealed liquids, unsafe food, or inadequately packaged fragile items"] },
  { title: "Ask before booking", paragraphs: ["Contact support before booking unusual, high-value, temperature-sensitive, oversized, medical, or regulated items. An administrator may require additional information or refuse the booking."] },
];
