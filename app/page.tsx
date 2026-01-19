"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      router.replace(session?.user ? "/task-app" : "/login");
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Checking session…
    </div>
  );
}
