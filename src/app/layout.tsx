import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "Freight OS | Fleet Manager",
  description: "Enterprise Fleet Command Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden bg-pearl">
          {/* Static Sidebar */}
          <Sidebar />
          
          {/* Main Content Wrapper */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Static Topbar */}
            <Topbar />
            
            {/* Dynamic Page Content */}
            <main className="flex-1 overflow-y-auto p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
