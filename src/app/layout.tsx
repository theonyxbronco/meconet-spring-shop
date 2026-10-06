import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

/** Stand-in for the Meconet brand typeface — swap the import to change it everywhere. */
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meconet Spring Shop",
  description: "Find the spring assortment that contains the spring you need.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      {/* Browser extensions get at <body> before React hydrates — ColorZilla adds a
          `cz-shortcut-listen` attribute, others add their own — and React reports
          every one of them as a hydration mismatch. This covers this element's own
          attributes only, not the tree underneath it, so a real mismatch in the app
          still gets reported. */}
      <body className="min-h-screen bg-page" suppressHydrationWarning>
        <CartProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
