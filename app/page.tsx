"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is logged in, redirect to tasking page
        router.push("/tasking");
      } else {
        // No user, redirect to login
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Task Management App</h1>
        <p className="text-slate-400">Redirecting...</p>
      </div>
    </div>
  );
}

export default Home;