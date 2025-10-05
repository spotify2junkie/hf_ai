import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Modern font configuration
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daily Paper Extractor",
  description: "Discover and explore academic papers from HuggingFace daily collection. Access cutting-edge research papers with intelligent search and filtering.",
  keywords: ["academic papers", "research", "AI", "machine learning", "HuggingFace", "arXiv"],
  authors: [{ name: "Daily Paper Extractor Team" }],
  openGraph: {
    title: "Daily Paper Extractor",
    description: "Discover and explore academic papers from HuggingFace daily collection",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily Paper Extractor",
    description: "Discover and explore academic papers from HuggingFace daily collection",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
        suppressHydrationWarning
      >
        <div id="root" className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">📚</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold gradient-text">
                        Daily Paper Extractor
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        Powered by HuggingFace
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="hidden md:flex items-center space-x-6">
                  <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                    Home
                  </Link>
                  <a href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    About
                  </a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    GitHub
                  </a>
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 relative">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border/40 bg-muted/40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-sm font-semibold mb-4">Daily Paper Extractor</h3>
                  <p className="text-sm text-muted-foreground">
                    Discover cutting-edge academic papers from the HuggingFace daily collection.
                    Stay updated with the latest research in AI and machine learning.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-4">Features</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Daily paper collection</li>
                    <li>• Advanced search & filtering</li>
                    <li>• Responsive design</li>
                    <li>• Fast performance</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-4">Links</h3>
                  <div className="space-y-2 text-sm">
                    <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer"
                       className="block text-muted-foreground hover:text-primary transition-colors">
                      HuggingFace →
                    </a>
                    <a href="https://arxiv.org" target="_blank" rel="noopener noreferrer"
                       className="block text-muted-foreground hover:text-primary transition-colors">
                      arXiv →
                    </a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                       className="block text-muted-foreground hover:text-primary transition-colors">
                      Source Code →
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/40 text-center">
                <p className="text-sm text-muted-foreground">
                  © 2025 Daily Paper Extractor. Built with ❤️ using Next.js and Tailwind CSS.
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
