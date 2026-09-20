"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Mail, Lock } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        setSuccessMsg("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push("/explore");
          router.refresh();
        }, 1500);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred during sign up.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white text-black">
      {/* Left Panel: Edge-to-Edge Background Image */}
      <div
        className="w-full lg:w-1/2 2xl:w-7/12 min-h-[40vh] lg:min-h-screen bg-cover bg-center"
        style={{
          backgroundImage:
            'url("https://tse4.mm.bing.net/th/id/OIP.S7NwDySydLQhp7uOo4DzSwHaD7?r=0&rs=1&pid=ImgDetMain&o=7&rm=3")',
        }}
      />

      {/* Right Panel: Flexible Signup Interface */}
      <div className="w-full lg:w-1/2 2xl:w-5/12 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-16">
            <h1 className="text-xl font-black uppercase tracking-widest text-black">
              Spurio Community
            </h1>
          </div>

          <div className="mb-10">
            <h2 className="text-4xl font-black mb-3 text-black">
              Create Account
            </h2>
            <p className="text-gray-500 font-medium">
              Join the Spurio Community today
            </p>
          </div>

          {errorMsg && (
            <div className="w-full bg-red-50 border-l-4 border-red-600 text-red-700 p-4 mb-6 font-semibold rounded-r-lg">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="w-full bg-green-50 border-l-4 border-green-600 text-green-700 p-4 mb-6 font-semibold rounded-r-lg">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <div className="relative w-full">
                <Mail className="w-5 h-5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-white border border-gray-300 rounded-full pl-12 pr-6 py-4 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>

            <div>
              <div className="relative w-full">
                <Lock className="w-5 h-5 text-gray-400 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-white border border-gray-300 rounded-full pl-12 pr-6 py-4 text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">
                or
              </span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full py-4 bg-white border border-gray-300 rounded-full text-black font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#E23F36] hover:bg-[#C9352D] text-white rounded-full font-bold text-lg transition-all active:scale-[0.99] disabled:opacity-50 shadow-md shadow-red-500/20"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="w-full text-center mt-10">
            <p className="text-gray-500 font-medium text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#E23F36] font-bold hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
