"use client";
import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader } from "lucide-react";

    const Login = () => {
        const [email, setEmail] = useState("");
        const [password, setPassword] = useState("");
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState("");
        const router = useRouter();

        const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const supabase = getSupabaseClient();
        if (!supabase) {
            setError("Auth service unavailable");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
            });

            if (error) {
            setError(error.message);
            setLoading(false);
            return;
            }

            router.replace("/tasking");
        } catch (err: any) {
            setError(err.message || "Login failed");
            setLoading(false);
        }
    };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-2xl border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-slate-400 mb-6">Sign in to your account</p>

        {error && (
          <div className="mb-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-slate-400 mt-6">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;