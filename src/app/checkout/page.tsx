"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { KitBoxArt } from "@/assets/brand";
import { formatEUR, useCart } from "@/lib/cart";
import {
  DELIVERY_COUNTRIES,
  DELIVERY_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  VAT_RATE,
  type Address,
  type Order,
  type PaymentMethod,
  useOrders,
} from "@/lib/orders";
import { BUYER, BUYER_ADDRESS, BUYER_BILLING } from "@/data/seller";
import { OrderRecord } from "@/components/OrderRecord";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";

/**
 * The checkout is an accordion of four steps, each one prefilled from the account
 * and each one openable.
 *
 * It used to print steps 1 to 3 as static text, which read as finished and gave a
 * test participant nothing to do until step 4. That is a problem for a session about
 * ordering: half the questions worth asking — can I send this somewhere else, can I
 * get it tomorrow, can I put it on the right invoice — are questions about these
 * fields, and a participant who cannot touch them cannot ask them. So the summary
 * stays (it is still the fastest thing to skim, and the account details are still
 * right most of the time) but every line behind it is a real input one click away.
 */

type StepNumber = 1 | 2 | 3 | 4;

export default function CheckoutPage() {
  const cart = useCart();
  const orders = useOrders();
  const [placed, setPlaced] = useState<Order | null>(null);

  const [address, setAddress] = useState<Address>(BUYER_ADDRESS);
  const [deliveryId, setDeliveryId] = useState(DELIVERY_OPTIONS[0].id);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("invoice");
  const [paymentTermDays, setPaymentTermDays] = useState(PAYMENT_TERM_OPTIONS[0]);
  const [billing, setBilling] = useState(BUYER_BILLING);
  const [billingSameAsDelivery, setBillingSameAsDelivery] = useState(true);

  /*
   * A workshop cannot reconcile an invoice it has no handle on: the person who
   * approves the spend knows the job number, not the Meconet order number. Asking for
   * their reference here is one input, and it is the difference between filing the
   * invoice and chasing someone to find out what it was for.
   */
  const [buyerReference, setBuyerReference] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");

  /*
   * One step open at a time. Two open forms on a page this tall means a participant
   * edits the address, scrolls past the half-finished payment block and never sees
   * either of them again.
   */
  const [openStep, setOpenStep] = useState<StepNumber | null>(null);
  /** A step's errors stay quiet until its own form has been submitted once. */
  const [touched, setTouched] = useState<Partial<Record<StepNumber, boolean>>>({});
  const stepRefs = useRef<Partial<Record<StepNumber, HTMLDivElement | null>>>({});

  const delivery = useMemo(
    () => DELIVERY_OPTIONS.find((option) => option.id === deliveryId) ?? DELIVERY_OPTIONS[0],
    [deliveryId],
  );
  const collecting = delivery.id === "pickup";

  const addressErrors = validateAddress(address);
  const paymentErrors = validatePayment(paymentMethod, billing, billingSameAsDelivery);
  const referenceErrors = validateReferences(invoiceEmail);
  const errorsByStep: Record<StepNumber, Record<string, string | undefined>> = {
    1: addressErrors,
    2: {},
    3: paymentErrors,
    4: referenceErrors,
  };
  const firstInvalidStep = ([1, 2, 3, 4] as StepNumber[]).find((step) =>
    Object.values(errorsByStep[step]).some(Boolean),
  );

  const shipping = delivery.priceEUR;
  const vat = Math.round((cart.subtotal + shipping) * VAT_RATE);
  const placedHeading = useRef<HTMLHeadingElement>(null);

  /*
   * Placing the order swaps the view without changing the route, so nothing resets
   * the scroll the way a real navigation would: the Place order button sits low in
   * the sidebar, and the confirmation would otherwise open part-way down, below its
   * own heading. Moving focus to that heading as well as scrolling means a screen
   * reader is told the order went through, rather than only sighted users seeing it.
   */
  useEffect(() => {
    if (!placed) return;
    window.scrollTo({ top: 0, behavior: "auto" });
    placedHeading.current?.focus({ preventScroll: true });
  }, [placed]);

  /** Billing follows the delivery company until someone says otherwise. */
  const updateAddress = (patch: Partial<Address>) => {
    const next = { ...address, ...patch };
    setAddress(next);
    if (billingSameAsDelivery && patch.company !== undefined) {
      setBilling((current) => ({ ...current, company: next.company }));
    }
  };

  const openOnly = (step: StepNumber) => {
    setOpenStep((current) => (current === step ? null : step));
  };

  /** Collapsing a step is also the moment to tell the person what is still missing. */
  const closeStep = (step: StepNumber) => {
    setTouched((current) => ({ ...current, [step]: true }));
    if (Object.values(errorsByStep[step]).some(Boolean)) return;
    setOpenStep(null);
  };

  const placeOrder = () => {
    if (firstInvalidStep) {
      setTouched((current) => ({ ...current, [firstInvalidStep]: true }));
      setOpenStep(firstInvalidStep);
      stepRefs.current[firstInvalidStep]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const order = orders.place({
      lines: cart.lines.map((line) => ({
        slug: line.slug,
        name: line.variant.name,
        partNumber: line.variant.partNumber,
        quantity: line.quantity,
        unitPriceEUR: line.variant.priceEUR,
      })),
      buyerReference: buyerReference.trim(),
      costCentre: costCentre.trim(),
      invoiceEmail: invoiceEmail.trim() || BUYER.email,
      deliveryAddress: {
        company: address.company.trim(),
        contact: address.contact.trim(),
        street: address.street.trim(),
        postalCode: address.postalCode.trim(),
        city: address.city.trim(),
        country: address.country,
      },
      delivery,
      paymentMethod,
      billing: { company: billing.company.trim(), businessId: billing.businessId.trim() },
      paymentTermDays,
    });
    setPlaced(order);
    cart.clear();
  };

  if (placed) {
    return (
      <section className="mx-auto max-w-[900px] px-5 py-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stock-bg text-stock">
            <CheckIcon width={26} height={26} />
          </span>
          <div>
            <h1
              ref={placedHeading}
              tabIndex={-1}
              className="text-[32px] font-extrabold leading-tight tracking-tight text-ink outline-none"
            >
              Order placed
            </h1>
            <p className="mt-2 text-[15.5px] text-ink-soft">
              Everything below stays in <Link href="/orders" className="font-semibold text-brand-600 hover:underline">My orders &amp; documents</Link>,
              so you can come back for the paperwork whenever your bookkeeping needs it.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <OrderRecord order={placed} />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600"
          >
            All orders &amp; documents
            <ArrowRightIcon width={17} height={17} />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-line-strong px-6 py-3 text-[15px] font-semibold text-ink transition hover:border-brand-400 hover:text-brand-600"
          >
            Back to the shop
          </Link>
        </div>

        <p className="mt-8 text-[13.5px] text-muted">
          This is where the usability test ends — nothing was actually ordered, and no document here
          is a real demand for payment.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex gap-2 text-[13.5px] text-muted">
        <Link href="/" className="hover:text-brand-600">
          Frontpage
        </Link>
        <span aria-hidden>/</span>
        <Link href="/cart" className="hover:text-brand-600">
          Cart
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-brand-600">Checkout</span>
      </nav>

      <h1 className="text-[36px] font-extrabold tracking-tight text-ink">Checkout</h1>

      {cart.lines.length === 0 ? (
        <p className="mt-8 rounded-card border border-line bg-surface p-12 text-center text-[16px] text-muted">
          There is nothing to check out yet.{" "}
          <Link href="/" className="font-semibold text-brand-600 hover:underline">
            Find an assortment
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div className="space-y-5">
            <Step
              step={1}
              title={collecting ? "Billing address" : "Delivery address"}
              open={openStep === 1}
              invalid={Boolean(touched[1]) && Object.values(addressErrors).some(Boolean)}
              onToggle={() => openOnly(1)}
              onDone={() => closeStep(1)}
              containerRef={(node) => {
                stepRefs.current[1] = node;
              }}
              summary={
                <>
                  <p className="font-semibold text-ink">{address.company || "No company given"}</p>
                  {address.contact && <p>Attn. {address.contact}</p>}
                  <p>{address.street}</p>
                  <p>
                    {address.postalCode} {address.city}
                    {address.country ? `, ${address.country}` : ""}
                  </p>
                  {collecting && (
                    <p className="mt-1.5 text-[13.5px] text-muted">
                      You are collecting this order, so this address is only used on the paperwork.
                    </p>
                  )}
                </>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="company"
                  label="Company"
                  required
                  autoComplete="organization"
                  value={address.company}
                  onChange={(company) => updateAddress({ company })}
                  error={touched[1] ? addressErrors.company : undefined}
                />
                <Field
                  id="contact"
                  label="Contact person"
                  autoComplete="name"
                  placeholder="Who the courier asks for"
                  value={address.contact}
                  onChange={(contact) => updateAddress({ contact })}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="street"
                    label="Street address"
                    required
                    autoComplete="street-address"
                    value={address.street}
                    onChange={(street) => updateAddress({ street })}
                    error={touched[1] ? addressErrors.street : undefined}
                  />
                </div>
                <Field
                  id="postal-code"
                  label="Postal code"
                  required
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={address.postalCode}
                  onChange={(postalCode) => updateAddress({ postalCode })}
                  error={touched[1] ? addressErrors.postalCode : undefined}
                />
                <Field
                  id="city"
                  label="City"
                  required
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(city) => updateAddress({ city })}
                  error={touched[1] ? addressErrors.city : undefined}
                />
                <div className="sm:col-span-2 sm:max-w-[220px]">
                  <Select
                    id="country"
                    label="Country"
                    value={address.country}
                    onChange={(country) => updateAddress({ country })}
                    options={DELIVERY_COUNTRIES.map((name) => ({ value: name, label: name }))}
                  />
                </div>
              </div>
            </Step>

            <Step
              step={2}
              title="Delivery method"
              open={openStep === 2}
              onToggle={() => openOnly(2)}
              onDone={() => closeStep(2)}
              containerRef={(node) => {
                stepRefs.current[2] = node;
              }}
              summary={
                <>
                  <p className="font-semibold text-ink">
                    {delivery.label} · {delivery.detail}
                  </p>
                  <p>{delivery.priceEUR === 0 ? "Free of charge" : formatEUR(delivery.priceEUR)}</p>
                </>
              }
            >
              <fieldset>
                <legend className="sr-only">Choose a delivery method</legend>
                <div className="space-y-2.5">
                  {DELIVERY_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      name="delivery"
                      value={option.id}
                      checked={deliveryId === option.id}
                      onChange={setDeliveryId}
                      label={option.label}
                      detail={option.detail}
                      aside={option.priceEUR === 0 ? "Free" : formatEUR(option.priceEUR)}
                    />
                  ))}
                </div>
              </fieldset>
            </Step>

            <Step
              step={3}
              title="Payment"
              open={openStep === 3}
              invalid={Boolean(touched[3]) && Object.values(paymentErrors).some(Boolean)}
              onToggle={() => openOnly(3)}
              onDone={() => closeStep(3)}
              containerRef={(node) => {
                stepRefs.current[3] = node;
              }}
              summary={
                paymentMethod === "invoice" ? (
                  <>
                    <p className="font-semibold text-ink">Invoice, {paymentTermDays} days net</p>
                    <p>
                      Billing to {billing.company || "no company given"} · Business ID{" "}
                      {billing.businessId || "—"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-ink">Card</p>
                    <p>You are taken to the payment provider after placing the order.</p>
                  </>
                )
              }
            >
              <fieldset>
                <legend className="sr-only">Choose how to pay</legend>
                <div className="space-y-2.5">
                  <Choice
                    name="payment"
                    value="invoice"
                    checked={paymentMethod === "invoice"}
                    onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                    label="Invoice"
                    detail="For account customers. The invoice follows on dispatch."
                  />
                  <Choice
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                    label="Card"
                    detail="Visa, Mastercard. Charged when the order is placed."
                  />
                </div>
              </fieldset>

              {paymentMethod === "invoice" ? (
                <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
                  <Select
                    id="payment-terms"
                    label="Payment terms"
                    value={String(paymentTermDays)}
                    onChange={(value) => setPaymentTermDays(Number(value))}
                    options={PAYMENT_TERM_OPTIONS.map((days) => ({
                      value: String(days),
                      label: `${days} days net`,
                    }))}
                  />
                  <div className="sm:col-span-2">
                    <Checkbox
                      id="billing-same"
                      label="Invoice the same company as the delivery address"
                      checked={billingSameAsDelivery}
                      onChange={(checked) => {
                        setBillingSameAsDelivery(checked);
                        if (checked) setBilling((current) => ({ ...current, company: address.company }));
                      }}
                    />
                  </div>
                  {!billingSameAsDelivery && (
                    <Field
                      id="billing-company"
                      label="Invoice to"
                      required
                      value={billing.company}
                      onChange={(company) => setBilling((current) => ({ ...current, company }))}
                      error={touched[3] ? paymentErrors.company : undefined}
                    />
                  )}
                  <Field
                    id="billing-business-id"
                    label="Business ID"
                    required
                    placeholder="1234567-8"
                    value={billing.businessId}
                    onChange={(businessId) => setBilling((current) => ({ ...current, businessId }))}
                    error={touched[3] ? paymentErrors.businessId : undefined}
                    hint="Y-tunnus. Printed on the invoice so your accounts can match it."
                  />
                </div>
              ) : (
                <p className="mt-5 border-t border-line pt-5 text-[14px] leading-relaxed text-muted">
                  No card details are collected in this prototype — placing the order stands in for
                  the payment page.
                </p>
              )}
            </Step>

            <Step
              step={4}
              title="Your references"
              open={openStep === 4}
              invalid={Boolean(touched[4]) && Object.values(referenceErrors).some(Boolean)}
              onToggle={() => openOnly(4)}
              onDone={() => closeStep(4)}
              optional
              containerRef={(node) => {
                stepRefs.current[4] = node;
              }}
              summary={
                <>
                  <p>Your order or PO number: {buyerReference.trim() || "not given"}</p>
                  <p>Cost centre: {costCentre.trim() || "not given"}</p>
                  <p>Invoice copy to {invoiceEmail.trim() || BUYER.email}</p>
                </>
              }
            >
              <p className="text-[14px] leading-relaxed text-muted">
                Printed on the confirmation, the delivery note and the invoice, so your accounts can
                match them to the job without asking you.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field
                  id="buyer-reference"
                  label="Your order or PO number"
                  placeholder="e.g. TK-2026-118"
                  value={buyerReference}
                  onChange={setBuyerReference}
                />
                <Field
                  id="cost-centre"
                  label="Cost centre or project"
                  placeholder="e.g. Line 3 retrofit"
                  value={costCentre}
                  onChange={setCostCentre}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="invoice-email"
                    label="Send invoice copy to"
                    type="email"
                    autoComplete="email"
                    placeholder={BUYER.email}
                    value={invoiceEmail}
                    onChange={setInvoiceEmail}
                    error={touched[4] ? referenceErrors.invoiceEmail : undefined}
                    hint="Leave blank to use your account address. Most workshops send this to bookkeeping."
                  />
                </div>
              </div>
            </Step>

            <p className="text-[13.5px] text-muted">
              Every step is prefilled from your account and every one of them can be changed.
              Nothing is submitted anywhere.
            </p>
          </div>

          <aside className="h-fit rounded-card border border-line bg-surface p-6 shadow-card">
            <h2 className="text-[20px] font-bold text-ink">Your order</h2>
            <ul className="mt-5 space-y-4">
              {cart.lines.map((line) => (
                <li key={line.key} className="flex items-center gap-3">
                  <div className="h-12 w-16 shrink-0 rounded-lg bg-brand-50 p-1">
                    <KitBoxArt kit={line.kit} art="thumbnail" className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink">{line.variant.name}</p>
                    <p className="text-[12.5px] text-muted">Quantity {line.quantity}</p>
                  </div>
                  <span className="text-[14.5px] font-semibold text-ink">{formatEUR(line.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-line pt-4 text-[14.5px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-semibold text-ink">{formatEUR(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{delivery.label}</dt>
                <dd className="font-semibold text-ink">
                  {shipping === 0 ? "Free" : formatEUR(shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">VAT {(VAT_RATE * 100).toFixed(1)}%</dt>
                <dd className="font-semibold text-ink">{formatEUR(vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5 text-[18px]">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="font-extrabold text-ink">{formatEUR(cart.subtotal + shipping + vat)}</dd>
              </div>
            </dl>

            <button
              onClick={placeOrder}
              className="mt-6 w-full rounded-full bg-brand-500 py-4 text-[16px] font-bold uppercase tracking-wide text-white transition hover:bg-brand-600"
            >
              Place order
            </button>
            {firstInvalidStep && touched[firstInvalidStep] ? (
              <p role="alert" className="mt-3 text-center text-[13px] font-semibold text-danger">
                Step {firstInvalidStep} still needs something.
              </p>
            ) : (
              <p className="mt-3 text-center text-[13px] text-muted">
                {paymentMethod === "invoice"
                  ? "You will get an order confirmation straight away. The invoice follows on dispatch."
                  : "You will get an order confirmation straight away, with the card receipt attached."}
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

/** Required means required; everything else is the participant's business. */
function validateAddress(address: Address): Record<string, string | undefined> {
  const finnishPostalCode = address.country === "Finland" && !/^\d{5}$/.test(address.postalCode.trim());
  return {
    company: address.company.trim() ? undefined : "Tell us which company the order goes to",
    street: address.street.trim() ? undefined : "A street address is needed to deliver",
    postalCode: !address.postalCode.trim()
      ? "A postal code is needed to deliver"
      : finnishPostalCode
        ? "A Finnish postal code is five digits, e.g. 02770"
        : undefined,
    city: address.city.trim() ? undefined : "A town or city is needed to deliver",
  };
}

function validatePayment(
  method: PaymentMethod,
  billing: { company: string; businessId: string },
  followsDelivery: boolean,
): Record<string, string | undefined> {
  if (method !== "invoice") return {};
  return {
    // While billing follows the delivery address its company field is not on screen,
    // so complaining about it here would mark step 3 broken with nothing in it to
    // fix. Step 1 is already asking for the same company.
    company: followsDelivery || billing.company.trim() ? undefined : "Tell us who the invoice goes to",
    // Y-tunnus is seven digits, a hyphen and a check digit. Anything else will come
    // back from the participant's accounts department as an unpayable invoice.
    businessId: /^\d{7}-\d$/.test(billing.businessId.trim())
      ? undefined
      : "A Finnish Business ID looks like 1234567-8",
  };
}

function validateReferences(invoiceEmail: string): Record<string, string | undefined> {
  const value = invoiceEmail.trim();
  return {
    invoiceEmail: !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : "Check this email address",
  };
}

/**
 * One numbered step: a summary with a Change button, or an open form with a Done
 * button. The summary is what makes a page of four editable sections still readable
 * at a glance, which is the whole reason it is not simply four open forms.
 */
function Step({
  step,
  title,
  open,
  invalid,
  optional,
  summary,
  onToggle,
  onDone,
  containerRef,
  children,
}: {
  step: StepNumber;
  title: string;
  open: boolean;
  invalid?: boolean;
  optional?: boolean;
  summary: React.ReactNode;
  onToggle: () => void;
  onDone: () => void;
  containerRef: (node: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  const panelId = `step-${step}-panel`;

  return (
    <div
      ref={containerRef}
      className={`rounded-card border bg-surface p-6 ${invalid ? "border-danger" : "border-line"}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-600">
          {step}
        </span>
        <h2 className="text-[18px] font-bold text-ink">{title}</h2>
        <div className="ml-auto flex items-center gap-3">
          {!open &&
            (invalid ? (
              <span className="text-[13px] font-semibold text-danger">Needs attention</span>
            ) : optional ? (
              <span className="text-[13px] text-muted">Optional</span>
            ) : (
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-stock">
                <CheckIcon width={15} height={15} />
                Ready
              </span>
            ))}
          <button
            type="button"
            onClick={open ? onDone : onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            className={`rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition ${
              open
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "border border-line-strong text-ink hover:border-brand-400 hover:text-brand-600"
            }`}
          >
            {open ? "Done" : "Change"}
          </button>
        </div>
      </div>

      <div id={panelId} className="mt-3 pl-10">
        {open ? (
          children
        ) : (
          <div className="text-[14.5px] leading-relaxed text-ink-soft">{summary}</div>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  required,
  autoComplete,
  inputMode,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
  type?: string;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-[13.5px] font-semibold text-ink">
        {label}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 h-11 w-full rounded-lg border bg-surface px-3.5 text-[14.5px] text-ink outline-none placeholder:text-muted ${
          error ? "border-danger focus:border-danger" : "border-line-strong focus:border-brand-400"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] font-semibold text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13.5px] font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14.5px] text-ink outline-none focus:border-brand-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A radio with its whole row as the target, since a 16px dot is a poor one. */
function Choice({
  name,
  value,
  checked,
  onChange,
  label,
  detail,
  aside,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: string;
  detail: string;
  aside?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
        checked ? "border-brand-400 bg-brand-50/50" : "border-line-strong hover:border-brand-400"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink">{label}</span>
        <span className="block text-[13px] text-muted">{detail}</span>
      </span>
      {aside && <span className="shrink-0 text-[14px] font-semibold text-ink">{aside}</span>}
    </label>
  );
}

function Checkbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-brand-500"
      />
      {label}
    </label>
  );
}
