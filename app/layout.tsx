import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. MAXIMIZED VIEWPORT CONFIGURATION
export const viewport: Viewport = {
  themeColor: "#ff7e00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
  colorScheme: "dark",
};

// 2. ENTERPRISE SEO METADATA
export const metadata: Metadata = {
  metadataBase: new URL("https://spurio.vercel.app"),

  title: {
    default: "Spurio | The Ultimate Community Forum",
    template: "%s | Spurio Forum",
  },
  description:
    "Join Spurio, the premium community forum under T-Service Group. Connect with members, share insights, discuss modern topics, and grow your network.",
  keywords: [
    "Spurio",
    "forum",
    "community",
    "tech discussions",
    "developers",
    "T-Service Group",
    "Zen-Tech",
    "social platform",
  ],

  applicationName: "Spurio",
  authors: [{ name: "Zen-Tech India", url: "https://spurio.vercel.app" }],
  generator: "Next.js",
  publisher: "T-Service Group",
  creator: "Zen-Tech",

  // Forces Google to recognize the Vercel URL as the true source, preventing duplicate content penalties
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-US",
    },
  },

  // Prevents Apple/Google from automatically highlighting random numbers as phone numbers in forum posts
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  category: "technology",

  // PWA Manifest Connection
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spurio",
    startupImage: ["/icon-512x512.png"],
  },

  // MAXIMIZED OPEN GRAPH
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://spurio.vercel.app",
    siteName: "Spurio Forum",
    title: "Spurio | Discuss • Share • Grow",
    description:
      "Join the ultimate community platform. Connect, share knowledge, and grow your network on Spurio.",
    emails: ["zentechindiaofficial@gmail.com"],
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Spurio Brand Logo",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Spurio | Discuss • Share • Grow",
    description:
      "Join the ultimate community platform. Connect, share knowledge, and grow your network on Spurio.",
    images: ["/icon-512x512.png"],
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Connects directly to Google Search Console (Replace the string once you register on GSC)
  verification: {
    google: "ADD_YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE_HERE",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 3. JSON-LD STRUCTURED DATA (Schema.org)
  // This tells Google exactly what your site is and enables the "Search within site" bar on Google Results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Spurio Forum",
    url: "https://spurio.vercel.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://spurio.vercel.app/explore?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "T-Service Group & Zen-Tech",
      logo: {
        "@type": "ImageObject",
        url: "https://spurio.vercel.app/icon-512x512.png",
      },
    },
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Inject the Schema.org data invisibly into the head for crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#050505] text-white">
        {children}
      </body>
    </html>
  );
}
