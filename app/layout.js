import "./globals.css";

import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata = {
  title: "PrioSpace",
  description: "Focus on what matters.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} antialiased font-nunito`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
