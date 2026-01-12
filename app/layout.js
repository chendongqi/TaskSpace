import "./globals.css";

import { Nunito } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@wonder-lab/auth-sdk";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata = {
  title: "Task Space",
  description: "Focus on what matters.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} antialiased font-nunito`}
        suppressHydrationWarning
      >
        <AuthProvider
          config={{
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3204',
            supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          }}
        >
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}
