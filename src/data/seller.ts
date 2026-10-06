import type { Address } from "@/lib/orders";

/**
 * Letterhead details for the order documents.
 *
 * The identifiers below are **placeholders in the correct Finnish formats**, not
 * Meconet's real registration data — swap them before this goes anywhere near a real
 * buyer. They exist so the documents carry the fields an accounts department looks
 * for (Y-tunnus, VAT number, IBAN, BIC) rather than reading as a mock-up.
 */
export const SELLER = {
  name: "Meconet Oy",
  street: "Pavintie 8",
  postal: "01260 Vantaa",
  country: "Finland",
  businessId: "1234567-8",
  vatId: "FI12345678",
  iban: "FI21 1234 5600 0007 85",
  bic: "NDEAFIHH",
  email: "sales@meconet.fi",
  phone: "+358 9 836 3400",
};

/**
 * The account the prototype is signed in as. A real build reads this from the
 * customer record; here it is fixed so every test session produces identical
 * paperwork, and so the documents show a workshop buying from Meconet rather than
 * Meconet buying from itself.
 */
export const BUYER = {
  name: "Konepaja Virtanen Oy",
  street: "Teollisuuskatu 14",
  postalCode: "02770",
  city: "Espoo",
  country: "Finland",
  businessId: "2748193-5",
  contact: "Jarmo Virtanen",
  email: "jarmo@konepajavirtanen.fi",
};

/**
 * The account's address shaped the way the checkout and the documents want it.
 * The checkout prefills its address fields from here and then owns a copy: once the
 * form is editable, the order has to remember where it was actually sent rather than
 * reading the account back at print time.
 */
export const BUYER_ADDRESS: Address = {
  company: BUYER.name,
  contact: BUYER.contact,
  street: BUYER.street,
  postalCode: BUYER.postalCode,
  city: BUYER.city,
  country: BUYER.country,
};

export const BUYER_BILLING = {
  company: BUYER.name,
  businessId: BUYER.businessId,
};
