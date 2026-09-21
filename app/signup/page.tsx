"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="min-h-screen w-full bg-[#050505] bg-cover bg-center bg-no-repeat bg-fixed flex items-center justify-center lg:justify-end px-6 lg:px-32 py-8 lg:py-0 relative"
      style={{
        backgroundImage: `url('https://www.image2url.com/r2/default/images/1790006898610-dc60a752-a70b-4f99-9297-c5733ec637f6.png')`,
      }}
    >
      {/* NO BLUR: Just a very subtle dark tint so the white text remains readable over bright parts of the image */}
      <div className="absolute inset-0 bg-black/20 z-0"></div>

      {/* RIGHT PANEL: Signup Container (Aligned right on desktop, centered on mobile) */}
      <div className="w-full max-w-[340px] bg-[#0c0c11]/90 border border-[#ff7e00]/40 rounded-2xl p-6 lg:p-7 shadow-[0_0_50px_rgba(255,126,0,0.2)] z-10">
        {/* Mobile-only Branding Header */}
        <div className="flex lg:hidden items-center justify-center gap-2 mb-6">
          <img
            src="/icon-192x192.png"
            alt="Spurio Mobile"
            className="w-10 h-10"
          />
          <h1 className="text-xl font-black text-white tracking-widest uppercase">
            SPURIO
          </h1>
        </div>

        {/* Container Header */}
        <div className="hidden lg:flex items-center gap-2 mb-6">
          <img
            src="/icon-192x192.png"
            alt="Spurio Logo Small"
            className="w-6 h-6"
          />
          <span className="text-white font-bold tracking-widest text-base uppercase">
            SPURIO
          </span>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            Create Account
          </h2>
          <p className="text-[#8b8b95] text-xs leading-relaxed">
            Join the Spurio Community today
            <br className="hidden lg:block" />
            to connect and grow.
          </p>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/50 text-red-400 p-2.5 mb-5 rounded-lg text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="w-full bg-green-500/10 border border-green-500/50 text-green-400 p-2.5 mb-5 rounded-lg text-xs font-semibold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Email Input */}
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full bg-[#13131a] border border-[#2a2a35] rounded-xl pl-9 pr-4 py-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#ff7e00] focus:ring-1 focus:ring-[#ff7e00] transition-all"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create Password"
              className="w-full bg-[#13131a] border border-[#2a2a35] rounded-xl pl-9 pr-10 py-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#ff7e00] focus:ring-1 focus:ring-[#ff7e00] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#ff7e00] hover:bg-[#ff8f1f] text-black rounded-xl font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              "Creating Account..."
            ) : (
              <>
                Sign Up <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-[#2a2a35]"></div>
          <span className="flex-shrink-0 mx-3 text-[#525260] text-[10px] font-medium uppercase tracking-wider">
            OR
          </span>
          <div className="flex-grow border-t border-[#2a2a35]"></div>
        </div>

        {/* Google Signup */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full py-2.5 bg-transparent border border-[#2a2a35] hover:bg-[#1a1a24] rounded-xl text-[#d1d1d6] font-medium text-xs flex items-center justify-center gap-2.5 transition-colors"
        >
          <svg
            width="15"
            height="15"
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

        {/* Footer Link */}
        <div className="w-full text-center mt-6">
          <p className="text-[#8b8b95] text-[11px] font-medium">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#ff7e00] font-bold hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
