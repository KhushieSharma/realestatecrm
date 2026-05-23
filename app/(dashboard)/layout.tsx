import { SessionProvider } from '@/lib/supabase/auth';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
        <Footer />
      </div>
    </SessionProvider>
  );
}