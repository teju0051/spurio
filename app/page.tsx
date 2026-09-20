"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [modal, setModal] = useState({ isOpen: false, title: "", text: "" });

  const handleExploreClick = () => {
    setModal({
      isOpen: true,
      title: "Action Restricted",
      text: "Please login to explore.",
    });
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    setModal({
      isOpen: true,
      title: "Authentication Required",
      text: "Please login to share posts.",
    });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: "", text: "" });
  };

  return (
    <div className="h-screen bg-white text-gray-900 flex flex-col w-full font-sans overflow-hidden relative">
      <header className="shrink-0 z-50 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 w-full shadow-sm">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={handleExploreClick}
        >
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">
            Spurio
          </h1>
        </div>

        <div className="flex-1 w-full px-6 hidden md:block">
          <div className="relative w-full flex items-center">
            <svg
              className="w-5 h-5 absolute left-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              onFocus={handleInputFocus}
              placeholder="Search visually stunning communities..."
              className="w-full bg-white border border-gray-200 rounded-full pl-12 pr-6 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all text-sm cursor-text"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-sm inline-block"
          >
            Log In
          </Link>
        </div>
      </header>

      <div className="flex w-full flex-1 px-4 sm:px-6 lg:px-8 gap-8 justify-between overflow-hidden pt-6">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-6 h-full pb-6">
          <div className="flex flex-col gap-1">
            <div
              onClick={handleExploreClick}
              className="flex items-center gap-3 font-semibold px-4 py-3 bg-white border border-gray-100 text-gray-900 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home Feed
            </div>
          </div>
          <hr className="border-gray-100" />
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4">
              Communities
            </h3>
            {["photography", "architecture", "design", "travel"].map(
              (topic, i) => (
                <div
                  key={topic}
                  onClick={handleExploreClick}
                  className="flex items-center gap-3 font-medium text-sm px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs ${["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500"][i]}`}
                  >
                    {topic.charAt(0).toUpperCase()}
                  </div>
                  s/{topic}
                </div>
              ),
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col gap-6 w-full h-full overflow-y-auto pb-8 pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="bg-white border border-gray-100 rounded-3xl p-2 pl-4 flex gap-4 items-center shadow-sm shrink-0 w-full">
            <div className="w-10 h-10 rounded-full bg-white shrink-0 border border-gray-200"></div>
            <input
              type="text"
              onFocus={handleInputFocus}
              placeholder="Share a photo, video, or link..."
              className="flex-1 bg-transparent border-none text-sm focus:outline-none py-3 cursor-text w-full"
            />
            <button
              onClick={handleExploreClick}
              className="p-3 bg-white border border-gray-100 hover:bg-gray-50 rounded-full transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>

          <article className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 shrink-0 w-full flex flex-col">
            <div className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <div onClick={handleExploreClick} className="cursor-pointer">
                <h4 className="font-bold text-sm text-gray-900 hover:underline">
                  s/photography
                </h4>
                <p className="text-xs text-gray-500 font-medium">
                  Posted by u/creative_lens • 2 hours ago
                </p>
              </div>
            </div>
            <div className="px-5 pb-4" onClick={handleExploreClick}>
              <h2 className="text-xl font-bold leading-tight text-gray-900 cursor-pointer">
                Captured this incredible sunrise over the mountains. The colors
                were unreal this morning.
              </h2>
            </div>
            <div
              className="w-full aspect-[16/9] bg-white relative group cursor-pointer border-y border-gray-100"
              onClick={handleExploreClick}
            >
              <img
                src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
                alt="Mountain sunrise"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="p-3 flex items-center gap-2 text-gray-500 font-semibold text-sm bg-white">
              <button
                onClick={handleExploreClick}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 shadow-sm rounded-full hover:bg-gray-50 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                842 Comments
              </button>
            </div>
          </article>
        </main>

        <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-6 h-full pb-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm w-full">
            <h3 className="font-extrabold text-gray-900 mb-5 tracking-tight text-lg">
              Trending Communities
            </h3>
            <div className="flex flex-col gap-5">
              {[
                { name: "s/webdev", members: "1.2m", color: "bg-indigo-500" },
                { name: "s/EarthPorn", members: "4.5m", color: "bg-green-500" },
                {
                  name: "s/battlestations",
                  members: "890k",
                  color: "bg-purple-500",
                },
                { name: "s/minimalism", members: "500k", color: "bg-gray-900" },
              ].map((community, i) => (
                <div
                  key={i}
                  onClick={handleExploreClick}
                  className="flex items-center justify-between group cursor-pointer w-full"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${community.color} text-white flex items-center justify-center font-bold text-sm shadow-sm`}
                    >
                      {community.name.charAt(2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 group-hover:underline">
                        {community.name}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        {community.members} members
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-1.5 bg-white border border-gray-200 text-gray-900 font-bold text-xs rounded-full hover:bg-gray-50 transition-colors">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {modal.isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4 transition-all"
          style={{ zIndex: 99999 }}
        >
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {modal.title}
            </h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">
              {modal.text}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 bg-white text-gray-900 font-semibold rounded-full hover:bg-gray-50 transition-colors border border-gray-200"
              >
                Cancel
              </button>
              <Link
                href="/login"
                className="flex-1 flex items-center justify-center py-2.5 bg-gray-900 text-white font-semibold rounded-full hover:bg-gray-800 transition-colors shadow-sm"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
