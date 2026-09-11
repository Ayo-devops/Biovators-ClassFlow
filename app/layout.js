import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Shell from "../components/shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "ClassFlow — Your class, connected",
    template: "%s | ClassFlow",
  },
  description:
    "Your assignments, deadlines and class announcements in one calm workspace.",
  applicationName: "ClassFlow",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ClassFlow" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#173f33",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
