"use client";

import Link from "next/link";
import { KitBoxArt } from "@/assets/brand";
import { formatEUR, useCart } from "@/lib/cart";
import { ArrowRightIcon, CloseIcon, MinusIcon, PlusIcon, TruckIcon } from "@/components/icons";

export default function CartPage() {
  const cart = useCart();

  return (
    <section className="mx-auto max-w-[1320px] px-5 py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex gap-2 text-[13.5px] text-muted">
        <Link href="/" className="hover:text-brand-600">
          Frontpage
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-brand-600">Cart</span>
      </nav>

      <h1 className="text-[36px] font-extrabold tracking-tight text-ink">Your cart</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-8 rounded-card border border-line bg-surface p-12 text-center">
          <p className="text-[16px] text-muted">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white hover:bg-brand-600"
          >
            Find an assortment
            <ArrowRightIcon width={18} height={18} />
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
          <ul className="space-y-4">
            {cart.lines.map((line) => (
              <li
                key={line.key}
                className="flex flex-wrap items-center gap-5 rounded-card border border-line bg-surface p-5"
              >
                <div className="h-[86px] w-[120px] shrink-0 rounded-lg bg-brand-50 p-2">
                  <KitBoxArt kit={line.kit} className="h-full w-full" />
                </div>

                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/assortments/${line.kit.slug}?tier=${line.tier}`}
                    className="text-[18px] font-bold text-ink hover:text-brand-600"
                  >
                    {line.variant.name}
                  </Link>
                  <p className="mt-1 text-[13.5px] text-muted">Part number {line.variant.partNumber}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[13.5px] text-stock">
                    <TruckIcon width={17} height={17} />
                    In stock · {line.kit.deliveryDays}
                  </p>
                </div>

                <div className="flex items-center rounded-lg border border-line-strong">
                  <button
                    onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                    aria-label={`Decrease quantity of ${line.variant.name}`}
                    className="flex h-10 w-10 items-center justify-center text-ink hover:text-brand-600"
                  >
                    <MinusIcon width={16} height={16} />
                  </button>
                  <span className="w-11 text-center text-[15px] font-semibold">{line.quantity}</span>
                  <button
                    onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                    aria-label={`Increase quantity of ${line.variant.name}`}
                    className="flex h-10 w-10 items-center justify-center text-ink hover:text-brand-600"
                  >
                    <PlusIcon width={16} height={16} />
                  </button>
                </div>

                <p className="w-[92px] text-right text-[17px] font-bold text-ink">{formatEUR(line.lineTotal)}</p>

                <button
                  onClick={() => cart.remove(line.key)}
                  aria-label={`Remove ${line.variant.name} from cart`}
                  className="rounded-full p-2 text-muted transition hover:text-ink"
                >
                  <CloseIcon width={18} height={18} />
                </button>
              </li>
            ))}
          </ul>

          <OrderSummary />
        </div>
      )}
    </section>
  );
}

function OrderSummary() {
  const cart = useCart();
  const vat = Math.round(cart.subtotal * 0.255);

  return (
    <aside className="h-fit rounded-card border border-line bg-surface p-6 shadow-card">
      <h2 className="text-[20px] font-bold text-ink">Order summary</h2>
      <dl className="mt-5 space-y-3 text-[14.5px]">
        <div className="flex justify-between">
          <dt className="text-muted">Items ({cart.count})</dt>
          <dd className="font-semibold text-ink">{formatEUR(cart.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd className="font-semibold text-stock">Free</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">VAT 25.5%</dt>
          <dd className="font-semibold text-ink">{formatEUR(vat)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-[18px]">
          <dt className="font-bold text-ink">Total</dt>
          <dd className="font-extrabold text-ink">{formatEUR(cart.subtotal + vat)}</dd>
        </div>
      </dl>

      <Link
        href="/checkout"
        className="mt-6 flex items-center justify-center gap-2.5 rounded-full bg-brand-500 py-4 text-[16px] font-bold uppercase tracking-wide text-white transition hover:bg-brand-600"
      >
        Proceed to checkout
      </Link>
      <Link
        href="/"
        className="mt-3 block text-center text-[14px] font-semibold text-brand-600 hover:underline"
      >
        Continue shopping
      </Link>
    </aside>
  );
}
