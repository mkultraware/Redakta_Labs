import type { Metadata } from "next";
import { Fira_Code, Outfit } from "next/font/google";
import "./globals.css";

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://redakta.nu"),
  title: "Redakta Labs | Fri OSINT-analys & Domänsäkerhet för Sverige",
  description:
    "Gratis passiv OSINT-analys av domänsäkerhet. Kontrollera nätfiske-skydd, e-postidentitet och svartlistor på sekunder. Ingen datalagring.",
  keywords: ["säkerhet", "OSINT", "e-post", "SPF", "DMARC", "domänsäkerhet", "Sverige", "cyberförsvar", "phishing"],
  authors: [{ name: "Sekura Labs", url: "https://sekura.se" }],
  creator: "Sekura Labs",
  publisher: "Sekura Labs",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Redakta Labs | Passiv OSINT-analys av SEKURA.SE",
    description: "Öppna verktyg för att stärka cyberhygienen hos svenska organisationer. Belyser sårbarheter ur en angripares perspektiv – för defensiva syften.",
    url: "https://redakta.nu",
    siteName: "Redakta Labs by SEKURA.SE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Redakta Labs - Passiv OSINT-analys för svenska organisationer - SEKURA.SE",
      },
    ],
    locale: "sv_SE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Redakta Labs | Passiv OSINT-analys",
    description: "Öppna verktyg för att stärka cyberhygienen hos svenska organisationer. En SEKURA.SE produkt.",
    images: ["/og-image.png"],
    creator: "@SEKURAsverige",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

import CookieBanner from "@/components/CookieBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Redakta Labs",
    "description": "Passiv OSINT-analysverktyg för domänsäkerhet i Sverige.",
    "url": "https://redaktalabs.sekura.se",
    "applicationCategory": "SecurityApplication",
    "operatingSystem": "All",
    "author": {
      "@type": "Organization",
      "name": "Sekura Labs",
      "url": "https://sekura.se"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "SEK"
    }
  };

  return (
    <html lang="sv">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KBVNSQSG');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="geo.region" content="SE" />
        <meta name="geo.placename" content="Sweden" />
        <meta name="google-site-verification" content="GGQlsiVo37oVMnGZL7Ol8WXeeFQ9VIOYpi9QF-7PoQA" />
      </head>
      <body className={`${outfit.variable} ${firaCode.variable} font-sans antialiased`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KBVNSQSG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
