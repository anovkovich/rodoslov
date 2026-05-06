"use client";

import CreateTreeForm from "@/components/auth/CreateTreeForm";
import Header from "@/components/ui/Header";

export default function NewTreePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <CreateTreeForm />
      </main>
    </div>
  );
}
