import { WaitlistForm } from "@/components/waitlist-form";
import { Features } from "@/components/features";
import { Hero } from "@/components/hero";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <Hero />
        <Features />
        <WaitlistForm />
      </div>
    </main>
  );
}