export function phoneDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^2507\d{8}$/.test(digits)) {
    return `0${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return value;
}

export function phoneHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `tel:+${digits}` : "#";
}

export function whatsappHref(value: string, businessName: string) {
  const digits = value.replace(/\D/g, "");
  const message = encodeURIComponent(
    `Hello ${businessName}, I need support.`,
  );
  return digits ? `https://wa.me/${digits}?text=${message}` : "#";
}

export function mailHref(value: string) {
  return `mailto:${value.trim()}`;
}
