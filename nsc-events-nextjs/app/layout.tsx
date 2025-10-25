import React from "react";
import "./globals.css";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import ReactQueryProvider from "@/components/ReactQueryProvider";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import ThemeContextProvider from "./theme/providers";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "NSC Events",
  description: "Stay updated with the latest events at North Seattle College",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeContextProvider>
          <AppRouterCacheProvider>
            <ReactQueryProvider>
              <CssBaseline /> {/* Ensures consistent baseline styles */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
              }}>
                <Navbar />
                {/* {main content should grow to take available space} */}
              <main style={{ flex: 1 }}>
                {children}
                </main>
                <Footer />
              </div>
            </ReactQueryProvider>
          </AppRouterCacheProvider>
        </ThemeContextProvider>
      </body>
    </html>
  );
}
