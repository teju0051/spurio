"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Mail, Lock } from "lucide-react";
import Swal from "sweetalert2";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      if (authData?.session) {
        // 1. Fetch user's exact account status
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", authData.user.id)
          .single();

        // 2. Check for ban/suspension
        if (
          profile &&
          (profile.account_status === "suspended" ||
            profile.account_status === "banned")
        ) {
          const isTemp = profile.account_status === "suspended";

          // Setup 72-hour timer in localStorage
          let banEndTime = localStorage.getItem(`ban_${authData.user.id}`);
          if (!banEndTime && isTemp) {
            banEndTime = (Date.now() + 72 * 60 * 60 * 1000).toString();
            localStorage.setItem(`ban_${authData.user.id}`, banEndTime);
          }

          // AAA Premium HTML Design - LANDSCAPE MODE
          const timerHtml = isTemp
            ? `
            <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 16px 32px; margin: 0 auto; position: relative; overflow: hidden; display: inline-block;">
               <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #ef4444, transparent);"></div>
               <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 4px; text-align: center;">Suspension Ending In</p>
               <div id="swal-timer" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 900; color: #f87171; text-shadow: 0 0 20px rgba(239, 68, 68, 0.4); letter-spacing: -1px; text-align: center;">
                  --:--:--:--
               </div>
            </div>
          `
            : "";

          let timerInterval: NodeJS.Timeout;

          Swal.fire({
            width: "650px", // Forces Landscape Width
            html: `
              <div style="display: flex; flex-direction: column; padding: 10px;">
                <!-- Top Row: Icon Left, Heading Center -->
                <div style="display: flex; align-items: center; margin-bottom: 24px; width: 100%;">
                  <!-- Glowing Error Icon (Left) -->
                  <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(239, 68, 68, 0.15); flex-shrink: 0;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  
                  <!-- Heading (Centered exactly by offsetting the icon width) -->
                  <div style="flex-grow: 1; text-align: center; padding-right: 56px;">
                    <h2 style="font-size: 26px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: -0.5px;">Account Access Restricted</h2>
                  </div>
                </div>
                
                <!-- Main Message (Centered) -->
                <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; font-weight: 500; text-align: center; max-width: 90%; margin: 0 auto 24px auto;">
                  Systems have detected abnormal activities in your account. You have violated platform policies and your access has been temporarily revoked.
                </p>
                
                <!-- Timer (Centered slightly lower) -->
                <div style="text-align: center;">
                  ${timerHtml}
                </div>
              </div>
            `,
            background: "#0f172a", // Deep slate background
            backdrop: "rgba(0, 0, 0, 0.8) backdrop-blur-md", // Glassmorphism backdrop
            showCancelButton: true,
            confirmButtonText: "Confirm",
            cancelButtonText: "Contact Support",
            buttonsStyling: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              popup:
                "!border !border-slate-800 !rounded-3xl !shadow-[0_0_50px_rgba(0,0,0,0.5)] !p-2",
              // Force row layout for buttons
              actions:
                "!w-full !flex !flex-row !justify-center !gap-4 !px-8 !pb-6 !pt-2 !mt-0",
              confirmButton:
                "!flex-1 !bg-slate-800 !text-white !font-bold !py-3.5 !rounded-xl hover:!bg-slate-700 transition-colors",
              cancelButton:
                "!flex-1 !bg-red-600 !text-white !font-bold !py-3.5 !rounded-xl hover:!bg-red-500 !shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all",
            },
            didOpen: () => {
              if (isTemp && banEndTime) {
                const timerEl = document.getElementById("swal-timer");
                timerInterval = setInterval(async () => {
                  const now = Date.now();
                  const distance = parseInt(banEndTime!) - now;

                  if (distance < 0) {
                    clearInterval(timerInterval);
                    if (timerEl) timerEl.innerHTML = "00:00:00:00";

                    // AUTO-ACTIVATE LOGIC
                    await supabase
                      .from("profiles")
                      .update({ account_status: "active" })
                      .eq("id", authData.user.id);
                    localStorage.removeItem(`ban_${authData.user.id}`);
                    Swal.close();
                    window.location.href = "/explore";
                  } else {
                    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
                    const h = Math.floor(
                      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
                    );
                    const m = Math.floor(
                      (distance % (1000 * 60 * 60)) / (1000 * 60),
                    );
                    const s = Math.floor((distance % (1000 * 60)) / 1000);

                    if (timerEl) {
                      timerEl.innerHTML = `${d.toString().padStart(2, "0")}:${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                    }
                  }
                }, 1000);
              }
            },
            willClose: () => {
              if (timerInterval) clearInterval(timerInterval);
            },
          }).then(async (result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
              window.location.href =
                "mailto:zentechindiaofficial@gmail.com?subject=Account Suspension Inquiry";
            }
            // Revoke the session immediately
            await supabase.auth.signOut();
          });

          setLoading(false);
          return;
        }

        // Standard active user success redirect
        window.location.href = "/explore";
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password.";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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

      {/* Right Panel: Flexible Login Interface */}
      <div className="w-full lg:w-1/2 2xl:w-5/12 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-16">
            <h1 className="text-xl font-black uppercase tracking-widest text-black">
              Spurio Community
            </h1>
          </div>

          <div className="mb-10">
            <h2 className="text-4xl font-black mb-3 text-black">
              Welcome Back
            </h2>
            <p className="text-gray-500 font-medium">
              Welcome to Spurio Community
            </p>
          </div>

          {errorMsg && (
            <div className="w-full bg-red-50 border-l-4 border-red-600 text-red-700 p-4 mb-6 font-semibold rounded-r-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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
              onClick={handleGoogleLogin}
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
              Login with Google
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#E23F36] hover:bg-[#C9352D] text-white rounded-full font-bold text-lg transition-all active:scale-[0.99] disabled:opacity-50 shadow-md shadow-red-500/20"
            >
              {loading ? "Authenticating..." : "Login"}
            </button>
          </form>

          <div className="w-full text-center mt-10">
            <p className="text-gray-500 font-medium text-sm">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-[#E23F36] font-bold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
