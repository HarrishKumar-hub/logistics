import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function FleetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
