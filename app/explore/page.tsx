"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

import {
  Home,
  PlusSquare,
  Activity,
  ShieldAlert,
  Trash2,
  Ban,
  CheckCircle,
  MoreHorizontal,
  Flag,
  MessageCircle,
  Heart,
  Share,
  Loader2,
  X,
  User,
  Search,
  Image as ImageIcon,
  Video,
  UploadCloud,
  Users,
  Globe,
  Edit3,
  Copy,
  Check,
  ArrowLeft,
  History,
} from "lucide-react";

type Role = "user" | "moderator" | "admin" | null;

interface Profile {
  id: string;
  role: Role;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
}

interface Community {
  id: string;
  name: string;
  slug: string;
  about: string;
  avatar_url: string;
  creator_id?: string;
}

interface Post {
  id: string;
  user_id: string;
  community_id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | "none";
  created_at: string;
  profiles: { full_name: string; username: string; avatar_url: string };
  communities: { name: string; slug: string };
  likes?: { user_id: string; profiles: any }[];
  comments?: any[];
}

const POSTS_PER_PAGE = 10;

export default function ExplorePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Data States
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  // Pagination States
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(false);

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<
    "feed" | "search" | "communities"
  >("feed");

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // Load recent searches from local storage on mount
    const stored = localStorage.getItem("recentSearches");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  const fetchCommunities = async () => {
    const { data: comms, error } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(`Community Fetch Error: ${error.message}`);
    }
    if (comms) setCommunities(comms);
  };

  const fetchPosts = async (pageIndex: number, reset = false) => {
    if (fetchingPosts || (!hasMorePosts && !reset)) return;
    setFetchingPosts(true);

    const from = pageIndex * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    const { data: pst, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles:posts_user_id_fkey (full_name, username, avatar_url),
        communities:posts_community_id_fkey (name, slug),
        likes ( user_id, profiles ( full_name, username, avatar_url ) ),
        comments ( id, content, created_at, user_id, profiles ( full_name, username, avatar_url ) )
      `,
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      alert(`Post Fetch Error: ${error.message}`);
    }

    if (pst) {
      pst.forEach((p: any) => {
        if (p.comments) {
          p.comments.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );
        }
      });

      if (pst.length < POSTS_PER_PAGE) setHasMorePosts(false);
      else setHasMorePosts(true);

      if (reset) setPosts(pst);
      else setPosts((prev) => [...prev, ...pst]);
    }
    setFetchingPosts(false);
  };

  const refreshAllData = async () => {
    await fetchCommunities();
    setPage(0);
    await fetchPosts(0, true);
  };

  useEffect(() => {
    const fetchSessionAndProfile = async (sessionUser: any) => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (profileData) {
          // 1. ENFORCE INITIAL LOAD BAN CHECK
          if (
            profileData.account_status &&
            profileData.account_status !== "active"
          ) {
            alert(
              "Systems had detected abnormalities in your account hence your session has been terminated, please relogin.",
            );
            await supabase.auth.signOut();
            window.location.href = "/login";
            return; // Stop execution instantly
          }

          setProfile(profileData as Profile);
          if (!profileData.full_name) setIsProfileModalOpen(true);
        } else {
          setProfile({
            id: sessionUser.id,
            role: "user",
            username: "",
            full_name: "",
            avatar_url: "",
            bio: "",
          });
          setIsProfileModalOpen(true);
        }

        // Only fetch feed if the user is not an admin
        if (profileData?.role !== "admin") {
          await fetchCommunities();
          await fetchPosts(0, true);
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchSessionAndProfile(session.user);
      } else {
        router.replace("/login");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.replace("/login");
        } else if (event === "SIGNED_IN" && session) {
          fetchSessionAndProfile(session.user);
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // PAGINATION LISTENER
  useEffect(() => {
    if (page > 0) fetchPosts(page);
  }, [page]);

  // 2. REAL-TIME MID-SESSION BAN LISTENER
  useEffect(() => {
    if (!profile?.id || profile.role === "admin") return;

    const profileSubscription = supabase
      .channel("enforce-ban-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profile.id}`,
        },
        async (payload) => {
          const newStatus = payload.new.account_status;
          if (newStatus && newStatus !== "active") {
            alert(
              "Systems had detected abnormalities in your account hence your session has been terminated, please relogin.",
            );
            await supabase.auth.signOut();
            window.location.href = "/login"; // Hard redirect clears cache
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [profile?.id]);

  if (loading || !profile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-[#38A1F3]" />
      </div>
    );
  }

  const isNewUser = !profile.full_name;

  // Search Logic with Local Storage
  const executeSearch = (query: string) => {
    const cleanQuery = query.replace("@", "").trim();
    if (!cleanQuery) return;

    // Save to recents (max 5 items)
    const updatedRecents = [
      cleanQuery,
      ...recentSearches.filter((q) => q !== cleanQuery),
    ].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem("recentSearches", JSON.stringify(updatedRecents));

    router.push(`/u/${cleanQuery}`);
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim() !== "") {
      executeSearch(searchQuery);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  return (
    <div className="h-screen w-full bg-white text-gray-900 flex flex-col font-sans overflow-hidden">
      {/* Top Navbar (Hidden on Mobile entirely, Visible on Desktop) */}
      <header className="hidden md:flex shrink-0 z-50 bg-white border-b border-gray-100 items-center justify-between px-4 sm:px-6 lg:px-8 py-3 shadow-sm w-full">
        <div className="flex items-center gap-3 w-auto md:w-1/4">
          <h1 className="text-xl font-black tracking-tight text-gray-900">
            Spurio
          </h1>
        </div>

        {/* Desktop Search Bar */}
        <div className="flex-1 max-w-2xl px-6">
          <div className="relative w-full flex items-center">
            <Search className="w-5 h-5 absolute left-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Search users."
              className="w-full bg-gray-50 border border-gray-100 rounded-full pl-12 pr-6 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#38A1F3]"
            />
          </div>
        </div>

        {/* Desktop User Avatar */}
        <div className="flex items-center justify-end gap-4 w-1/4">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-100 transition-all shadow-sm"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        {profile.role === "admin" ? (
          <AdminDashboardView profile={profile} onRefresh={refreshAllData} />
        ) : (
          <>
            {/* Desktop is always Feed, Mobile switches based on tab */}
            <div
              className={`w-full h-full ${activeMobileTab === "feed" ? "flex" : "hidden md:flex"}`}
            >
              <UserExploreView
                profile={profile}
                communities={communities}
                posts={posts}
                fetchingPosts={fetchingPosts}
                hasMorePosts={hasMorePosts}
                onLoadMore={() => setPage((prevPage: number) => prevPage + 1)}
                onCreateCommunityClick={() => setIsCreateCommunityOpen(true)}
                onCreatePostClick={() => setIsCreatePostOpen(true)}
                onRefresh={refreshAllData}
              />
            </div>

            {/* Mobile Tab: Search */}
            {activeMobileTab === "search" && (
              <div className="w-full h-full flex flex-col md:hidden bg-white z-10">
                <div className="p-4 border-b border-gray-100 shadow-sm">
                  <div className="relative flex items-center">
                    <Search className="w-5 h-5 absolute left-4 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchSubmit}
                      placeholder="Search users..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-full pl-12 pr-6 py-3 focus:outline-none focus:ring-2 focus:ring-[#38A1F3] text-base font-medium text-gray-900"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Recent Searches
                    </h3>
                    {recentSearches.length > 0 && (
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs font-bold text-[#38A1F3]"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {recentSearches.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {recentSearches.map((term, idx) => (
                        <div
                          key={idx}
                          onClick={() => executeSearch(term)}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl cursor-pointer border border-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <History className="w-5 h-5 text-gray-400" />
                            <span className="font-bold text-gray-900">
                              @{term}
                            </span>
                          </div>
                          <ArrowLeft className="w-5 h-5 text-gray-300 rotate-[135deg]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center mt-12 text-gray-400">
                      <Search className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">No recent searches</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Tab: Communities */}
            {activeMobileTab === "communities" && (
              <div className="w-full h-full flex flex-col md:hidden bg-gray-50 z-10">
                <div className="p-5 border-b border-gray-100 shadow-sm flex justify-between items-center bg-white">
                  <h2 className="text-xl font-black tracking-tight text-gray-900">
                    Communities
                  </h2>
                  <button
                    onClick={() => setIsCreateCommunityOpen(true)}
                    className="text-sm font-bold text-[#38A1F3] bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors"
                  >
                    + Create
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex flex-col gap-3 pb-6">
                    {communities.length === 0 ? (
                      <div className="text-center text-gray-400 mt-10">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-sm">
                          No communities exist yet.
                        </p>
                      </div>
                    ) : (
                      communities.map((c: any) => (
                        <div
                          key={c.id}
                          onClick={() => router.push(`/c/${c.name}`)}
                          className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm cursor-pointer active:scale-95 transition-transform"
                        >
                          <img
                            src={
                              c.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`
                            }
                            className="w-14 h-14 rounded-2xl object-cover border border-gray-50"
                          />
                          <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-gray-900 text-lg">
                              s/{c.name}
                            </h4>
                            <p className="text-sm text-gray-500 font-medium truncate">
                              {c.about || "A great community."}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* =========================================
          MOBILE BOTTOM NAVIGATION
          ========================================= */}
      <nav className="md:hidden shrink-0 bg-white border-t border-gray-200 flex items-center justify-around h-[68px] pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => {
            setActiveMobileTab("feed");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`p-3 flex flex-col items-center gap-1 transition-colors ${activeMobileTab === "feed" ? "text-gray-900" : "text-gray-400"}`}
        >
          <Home
            className={`w-[26px] h-[26px] ${activeMobileTab === "feed" ? "fill-current" : ""}`}
          />
        </button>
        <button
          onClick={() => setActiveMobileTab("search")}
          className={`p-3 flex flex-col items-center gap-1 transition-colors ${activeMobileTab === "search" ? "text-gray-900" : "text-gray-400"}`}
        >
          <Search
            className={`w-[26px] h-[26px] ${activeMobileTab === "search" ? "stroke-[2.5]" : ""}`}
          />
        </button>
        <button
          onClick={() => setIsCreatePostOpen(true)}
          className="p-3 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <PlusSquare className="w-7 h-7 stroke-[1.5]" />
        </button>
        <button
          onClick={() => setActiveMobileTab("communities")}
          className={`p-3 flex flex-col items-center gap-1 transition-colors ${activeMobileTab === "communities" ? "text-gray-900" : "text-gray-400"}`}
        >
          <Users
            className={`w-[26px] h-[26px] ${activeMobileTab === "communities" ? "fill-current" : ""}`}
          />
        </button>
        <button
          onClick={() => router.push(`/u/${profile.username}`)}
          className="p-3 flex flex-col items-center transition-transform active:scale-95"
        >
          <div className="w-[28px] h-[28px] rounded-full overflow-hidden border border-gray-200 shadow-sm">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        </button>
      </nav>

      {/* Modals */}
      {isProfileModalOpen && (
        <ProfileModal
          profile={profile}
          isNewUser={isNewUser}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdate={(p: Profile) => setProfile(p)}
          onLogout={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        />
      )}
      {isCreateCommunityOpen && (
        <CreateCommunityModal
          profile={profile}
          onClose={() => setIsCreateCommunityOpen(false)}
          onSuccess={refreshAllData}
        />
      )}
      {isCreatePostOpen && (
        <CreatePostModal
          profile={profile}
          communities={communities}
          onClose={() => setIsCreatePostOpen(false)}
          onSuccess={refreshAllData}
        />
      )}
    </div>
  );
}

/* =========================================
   USER EXPLORE VIEW (Desktop feed is untouched)
   ========================================= */
function UserExploreView({
  profile,
  communities,
  posts,
  fetchingPosts,
  hasMorePosts,
  onLoadMore,
  onCreateCommunityClick,
  onCreatePostClick,
  onRefresh,
}: any) {
  const router = useRouter();

  const myCommunities = communities.filter(
    (c: any) => c.creator_id === profile.id,
  );

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 100 &&
      hasMorePosts &&
      !fetchingPosts
    ) {
      onLoadMore();
    }
  };

  const handleDeleteCommunity = async (
    communityId: string,
    communityName: string,
  ) => {
    if (!confirm(`Are you sure you want to delete s/${communityName}?`)) return;
    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", communityId);
    if (error) alert(`Error deleting community: ${error.message}`);
    else onRefresh();
  };

  return (
    <div className="flex w-full h-full px-0 sm:px-6 lg:px-8 gap-8 justify-center overflow-hidden pt-0 md:pt-6">
      {/* Left Sidebar (Hidden on Mobile) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-6 h-full pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 font-semibold px-4 py-3 bg-gray-50 text-gray-900 rounded-2xl">
            <Activity className="w-5 h-5" />
            Explore
          </div>
        </div>
        <hr className="border-gray-100" />

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-4">
            Communities
          </h3>
          {communities.length === 0 ? (
            <p className="text-sm font-medium text-gray-400 px-4">
              No communities yet.
            </p>
          ) : (
            communities.map((c: any) => (
              <div
                key={c.id}
                onClick={() => router.push(`/c/${c.name}`)}
                className="flex items-center justify-between font-medium text-sm px-4 py-2 hover:bg-gray-50 rounded-xl cursor-pointer group"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={
                      c.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`
                    }
                    className="w-8 h-8 rounded-xl object-cover shrink-0"
                  />
                  <span className="truncate">s/{c.name}</span>
                </div>
                {c.creator_id === profile.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCommunity(c.id, c.name);
                    }}
                    className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <button
          onClick={onCreateCommunityClick}
          className="mt-auto w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800"
        >
          + Create Community
        </button>
      </aside>

      {/* Main Feed */}
      <main
        onScroll={handleScroll}
        className="flex-1 flex flex-col gap-2 md:gap-6 w-full max-w-2xl h-full overflow-y-auto pb-8 [&::-webkit-scrollbar]:hidden pt-2 md:pt-0 bg-gray-50 md:bg-transparent"
      >
        {/* Post Input Trigger (Desktop Style) */}
        <div
          onClick={onCreatePostClick}
          className="hidden md:flex bg-white border border-gray-100 rounded-3xl p-2 pl-4 gap-4 items-center shadow-sm shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <img
            src={
              profile.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`
            }
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 text-gray-400 text-sm py-3">
            Create a new post...
          </div>
          <button className="px-6 py-2 bg-[#38A1F3] text-white font-bold rounded-full text-sm pointer-events-none">
            Post
          </button>
        </div>

        {/* Dynamic Posts */}
        {posts.map((post: any) => (
          <PostItem
            key={post.id}
            post={post}
            profile={profile}
            onRefresh={onRefresh}
            isDetailView={false}
          />
        ))}

        {fetchingPosts && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-[#38A1F3]" />
          </div>
        )}

        {!hasMorePosts && posts.length > 0 && (
          <p className="text-center text-gray-400 mt-6 font-medium text-sm px-4">
            You've caught up with all posts!
          </p>
        )}

        {posts.length === 0 && !fetchingPosts && (
          <p className="text-center text-gray-400 mt-10 px-4">
            No posts on the platform yet. Be the first!
          </p>
        )}
      </main>

      {/* Right Sidebar (Hidden on Mobile) */}
      <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-6 h-full pb-6 overflow-y-auto">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="font-extrabold text-gray-900 mb-5 tracking-tight text-lg">
            Trending
          </h3>
          <div className="flex flex-col gap-5">
            {communities.slice(0, 5).map((c: any) => (
              <div
                key={c.id}
                onClick={() => router.push(`/c/${c.name}`)}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={
                      c.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`
                    }
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <h4 className="font-bold text-sm text-gray-900 truncate group-hover:underline">
                    s/{c.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="font-extrabold text-gray-900 mb-5 tracking-tight text-lg">
            Your Communities
          </h3>
          <div className="flex flex-col gap-4">
            {myCommunities.length === 0 ? (
              <p className="text-sm font-medium text-gray-400">
                You haven't created any communities yet!
              </p>
            ) : (
              myCommunities.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/c/${c.name}`)}
                  className="flex items-center justify-between cursor-pointer group p-2 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={c.avatar_url}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <span className="font-bold text-sm text-gray-800 group-hover:underline truncate">
                      s/{c.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* =========================================
   EXTRACTED POST COMPONENT (Highly Reusable)
   ========================================= */
export function PostItem({ post, profile, onRefresh, isDetailView }: any) {
  const router = useRouter();
  const isAuthor = post.user_id === profile.id;
  const isAdmin = profile.role === "admin";
  const isModerator = profile.role === "moderator";

  const [likes, setLikes] = useState<any[]>(post.likes || []);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [isLiked, setIsLiked] = useState(
    likes.some((l) => l.user_id === profile.id),
  );

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [commentText, setCommentText] = useState("");

  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleLike = async () => {
    if (isLiked) {
      setIsLiked(false);
      setLikes((prev) => prev.filter((l) => l.user_id !== profile.id));
      await supabase
        .from("likes")
        .delete()
        .match({ post_id: post.id, user_id: profile.id });
    } else {
      setIsLiked(true);
      setLikes((prev) => [...prev, { user_id: profile.id, profiles: profile }]);
      await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: profile.id });
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      post_id: post.id,
      user_id: profile.id,
      content: commentText.trim(),
    };

    const { data, error } = await supabase
      .from("comments")
      .insert(newComment)
      .select(`*, profiles(full_name, username, avatar_url)`)
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data]);
      setCommentText("");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/p/${post.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeletePost = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) onRefresh();
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    const { error } = await supabase
      .from("posts")
      .update({ content: editContent })
      .eq("id", post.id);
    if (!error) {
      setEditingPostId(null);
      onRefresh();
    }
  };

  const handleRequestDeletion = async () => {
    const reason = prompt("Enter reason for requesting post deletion:");
    if (!reason) return;
    const { error } = await supabase.from("moderation_requests").insert({
      request_id: `POST-${post.id.slice(0, 6)}`,
      moderator_name: profile.username,
      target_content: `Post ID: ${post.id}`,
      reason: reason,
      status: "pending",
    });
    if (!error) alert("Deletion request sent to admin queue!");
  };

  return (
    <article className="bg-white border-b md:border border-gray-200 md:rounded-3xl overflow-hidden md:shadow-sm shrink-0 group relative">
      <div className="p-4 md:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={
              post.profiles?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=user`
            }
            className="w-10 h-10 rounded-full object-cover cursor-pointer border border-gray-100"
            onClick={() => router.push(`/u/${post.profiles?.username}`)}
          />
          <div>
            <h4
              onClick={() => router.push(`/c/${post.communities?.name}`)}
              className="font-bold text-sm text-gray-900 hover:underline cursor-pointer"
            >
              s/{post.communities?.name || "community"}
            </h4>
            <p
              onClick={() => router.push(`/u/${post.profiles?.username}`)}
              className="text-xs text-gray-500 font-medium hover:underline cursor-pointer"
            >
              @{post.profiles?.username || "user"} •{" "}
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingPostId(post.id);
                  setEditContent(post.content);
                }}
                className="p-2 text-gray-400 hover:text-[#38A1F3] hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeletePost}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          {isModerator && !isAuthor && (
            <button
              onClick={handleRequestDeletion}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
            >
              <Flag className="w-3.5 h-3.5" /> Request Deletion
            </button>
          )}
          {isAdmin && !isAuthor && (
            <button
              onClick={handleDeletePost}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 md:px-5 pb-2">
        {editingPostId === post.id ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#38A1F3]"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-[#38A1F3] text-white text-xs font-bold rounded-lg hover:bg-blue-500"
              >
                Save
              </button>
              <button
                onClick={() => setEditingPostId(null)}
                className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <h2
            onClick={() => !isDetailView && router.push(`/p/${post.id}`)}
            className="text-base md:text-lg font-medium leading-relaxed text-gray-900 whitespace-pre-wrap cursor-pointer"
          >
            {post.content}
          </h2>
        )}
      </div>

      {post.media_url && post.media_type === "image" && (
        <div
          onClick={() => !isDetailView && router.push(`/p/${post.id}`)}
          className="w-full bg-gray-100 relative max-h-[500px] overflow-hidden mt-2 cursor-pointer"
        >
          <img src={post.media_url} className="w-full h-full object-cover" />
        </div>
      )}

      {post.media_url && post.media_type === "video" && (
        <div className="w-full bg-black mt-2">
          <video
            src={post.media_url}
            controls
            className="w-full max-h-[500px] mx-auto"
          />
        </div>
      )}

      {/* Analytics & Interaction Bar */}
      <div className="px-4 md:px-5 py-3 flex items-center justify-between mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 font-bold text-sm ${isLiked ? "text-red-500" : "text-gray-900"} transition-colors`}
          >
            <Heart
              className={`w-[26px] h-[26px] ${isLiked ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={() => !isDetailView && router.push(`/p/${post.id}`)}
            className="flex items-center gap-1.5 font-bold text-sm text-gray-900 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-[26px] h-[26px] transform scale-x-[-1]" />
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 font-bold text-sm text-gray-900 transition-colors"
          >
            <Share className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-5 pb-3">
        <span
          onClick={() => setShowLikesModal(true)}
          className="text-sm font-bold text-gray-900 hover:underline cursor-pointer"
        >
          {likes.length} likes
        </span>
      </div>

      {/* LinkedIn-Style Comments Section */}
      <div className="px-4 md:px-5 pb-4">
        <div className="space-y-2 mb-3">
          {(isDetailView ? comments : comments.slice(0, 2)).map(
            (comment: any) => (
              <div key={comment.id} className="flex gap-2">
                <span
                  onClick={() =>
                    router.push(`/u/${comment.profiles?.username}`)
                  }
                  className="font-bold text-sm text-gray-900 hover:underline cursor-pointer"
                >
                  {comment.profiles?.username}
                </span>
                <span className="text-sm text-gray-800">{comment.content}</span>
              </div>
            ),
          )}
          {!isDetailView && comments.length > 2 && (
            <button
              onClick={() => router.push(`/p/${post.id}`)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              View all {comments.length} comments
            </button>
          )}
        </div>

        <form onSubmit={handlePostComment} className="flex items-center gap-3">
          <img
            src={
              profile.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=me`
            }
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
          <div className="flex-1 flex items-center">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-transparent text-sm focus:outline-none py-1"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-[#38A1F3] font-bold text-sm disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </form>
      </div>

      {showShareModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Share Post</h2>
              <X
                className="w-5 h-5 text-gray-400 cursor-pointer"
                onClick={() => setShowShareModal(false)}
              />
            </div>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-2 gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/p/${post.id}`}
                className="w-full bg-transparent text-sm text-gray-600 outline-none px-2"
              />
              <button
                onClick={handleShare}
                className="p-2 bg-[#38A1F3] text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLikesModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm px-4"
          onClick={() => setShowLikesModal(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm flex flex-col max-h-[70vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Likes</h2>
              <X
                className="w-5 h-5 text-gray-400 cursor-pointer"
                onClick={() => setShowLikesModal(false)}
              />
            </div>
            <div className="overflow-y-auto p-2">
              {likes.length === 0 ? (
                <p className="p-4 text-center text-gray-500 font-medium">
                  No likes yet.
                </p>
              ) : (
                likes.map((like: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setShowLikesModal(false);
                      router.push(`/u/${like.profiles?.username}`);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer"
                  >
                    <img
                      src={
                        like.profiles?.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=user`
                      }
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        {like.profiles?.full_name || "User"}
                      </h4>
                      <p className="text-xs text-gray-500 font-medium">
                        @{like.profiles?.username}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// =========================================
// MODALS AND ADMIN DASHBOARD
// =========================================

function CreateCommunityModal({ profile, onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const slugName = name.replace(/\s+/g, "").toLowerCase();

    const { error } = await supabase.from("communities").insert({
      name: name,
      slug: slugName,
      about: about,
      avatar_url:
        avatarUrl ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${slugName}`,
      creator_id: profile.id,
    });

    setLoading(false);
    if (error) return alert(`Database Error: ${error.message}`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-gray-900/80 backdrop-blur-sm md:px-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl pb-safe">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Create a Community
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Community Name
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Description
            </label>
            <textarea
              required
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 mt-1 resize-none h-24"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Icon URL (Optional)
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 mt-1"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 font-bold text-gray-600 bg-gray-50 rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 font-bold text-white bg-[#38A1F3] rounded-full"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePostModal({ profile, communities, onClose, onSuccess }: any) {
  const [communityId, setCommunityId] = useState(communities[0]?.id || "");
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "image" | "video">(
    "none",
  );
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityId) return alert("Please select a community.");
    setLoading(true);
    let finalMediaUrl = null;

    if (mediaFile && mediaType !== "none") {
      setStatusText("Uploading...");
      const filePath = `${profile.id}-${Date.now()}.${mediaFile.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("post_media")
        .upload(filePath, mediaFile);
      if (uploadError) {
        alert(`Upload Error: ${uploadError.message}`);
        setLoading(false);
        return;
      }
      finalMediaUrl = supabase.storage.from("post_media").getPublicUrl(filePath)
        .data.publicUrl;
    }

    setStatusText("Publishing...");
    const { error } = await supabase.from("posts").insert({
      user_id: profile.id,
      community_id: communityId,
      content,
      media_url: finalMediaUrl,
      media_type: finalMediaUrl ? mediaType : "none",
    });
    setLoading(false);
    if (error) return alert(`Database Error: ${error.message}`);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-gray-900/80 backdrop-blur-sm md:px-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] pb-safe">
        <h2 className="text-xl font-bold text-gray-900 mb-4 shrink-0">
          Create a Post
        </h2>
        {communities.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">
              You need a community to post in!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#38A1F3] text-white rounded-full"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 flex-1 overflow-hidden"
          >
            <div className="shrink-0">
              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold"
              >
                {communities.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    s/{c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 min-h-[200px] resize-y focus:outline-none"
                placeholder="What's on your mind?"
              />
            </div>
            <div className="shrink-0 flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMediaType("image");
                  setMediaFile(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${mediaType === "image" ? "bg-blue-100 text-[#38A1F3]" : "bg-gray-50"}`}
              >
                <ImageIcon className="w-4 h-4" /> Image
              </button>
              <button
                type="button"
                onClick={() => {
                  setMediaType("video");
                  setMediaFile(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${mediaType === "video" ? "bg-rose-100 text-rose-600" : "bg-gray-50"}`}
              >
                <Video className="w-4 h-4" /> Video
              </button>
            </div>
            {mediaType !== "none" && (
              <div className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 shrink-0">
                <input
                  type="file"
                  accept={mediaType === "image" ? "image/*" : "video/*"}
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="text-sm font-medium"
                />
              </div>
            )}
            <div className="flex gap-3 pt-4 shrink-0 border-t border-gray-100 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 font-bold bg-gray-50 rounded-full"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 font-bold text-white bg-[#38A1F3] rounded-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {statusText}
                  </>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ProfileModal({
  profile,
  isNewUser,
  onClose,
  onUpdate,
  onLogout,
}: any) {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    username: profile.username || "",
    bio: profile.bio || "",
    avatar_url: profile.avatar_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setError("");

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: data.publicUrl });
    } catch (err: any) {
      setError(err.message || "Error uploading image.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");

    const cleanUsername = formData.username
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", profile.id)
        .maybeSingle();

      if (existingUser) {
        throw new Error(
          "This username is already taken. Please pick another one.",
        );
      }

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: profile.id,
        role: profile.role || "user",
        full_name: formData.full_name,
        username: cleanUsername,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
      });

      if (updateError) throw updateError;

      onUpdate({ ...profile, ...formData, username: cleanUsername });
      if (!isNewUser) onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-gray-900/80 backdrop-blur-sm md:px-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] pb-safe">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold">
            {isNewUser ? "Welcome!" : "Settings"}
          </h2>
          {!isNewUser && (
            <X className="w-5 h-5 cursor-pointer" onClick={onClose} />
          )}
        </div>
        <form
          onSubmit={handleSave}
          className="p-6 overflow-y-auto space-y-5 flex-1"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 relative group">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-400 m-auto mt-5" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <UploadCloud className="w-6 h-6 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload Avatar"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                Profile Picture
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Click to upload avatar.
              </p>
              {uploading && (
                <p className="text-xs font-bold text-[#38A1F3] animate-pulse">
                  Uploading...
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Display Name
            </label>
            <input
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Username
            </label>
            <input
              required
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 lowercase"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 resize-none"
            />
          </div>
          <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-[#38A1F3] text-white font-bold rounded-full"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-3 text-red-500 font-bold bg-red-50 hover:bg-red-100 rounded-full transition-colors"
            >
              Log Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   NEW ADMIN ERP DASHBOARD
   ========================================= */
function AdminDashboardView({ profile, onRefresh }: any) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Strict Device Detection
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(
          userAgent,
        );
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobileDevice(isMobileUA || isSmallScreen);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isMobileDevice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 p-8 text-center h-screen w-full">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-black text-white mb-2">
          Access Restricted
        </h1>
        <p className="text-gray-400 font-medium max-w-sm">
          Administrative ERP systems cannot be accessed via mobile devices or
          emulators for security reasons. Please use a desktop workstation.
        </p>
        <button
          onClick={handleLogout}
          className="mt-8 px-6 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-300 font-sans">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-slate-950 flex flex-col shadow-2xl z-20 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black text-white tracking-tight">
            ZEN<span className="text-[#38A1F3]">ERP</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">
            Admin Portal
          </p>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <SidebarButton
            icon={Activity}
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
          />
          <SidebarButton
            icon={Trash2}
            label="Delete Posts"
            active={activeTab === "manage_posts"}
            onClick={() => setActiveTab("manage_posts")}
          />
          <SidebarButton
            icon={ShieldAlert}
            label="Moderator Reports"
            active={activeTab === "mod_reports"}
            onClick={() => setActiveTab("mod_reports")}
          />
          <SidebarButton
            icon={Users}
            label="User Management"
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
          />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                @{profile.username}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Administrator
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-500/10 text-red-500 font-bold rounded-lg hover:bg-red-500/20 transition-colors"
          >
            End Session
          </button>
        </div>
      </aside>

      {/* Main ERP Content Area */}
      <main className="flex-1 bg-slate-50 text-slate-900 overflow-y-auto relative">
        <div className="max-w-6xl mx-auto p-8">
          {activeTab === "dashboard" && <TabDashboard />}
          {activeTab === "manage_posts" && (
            <TabManagePosts
              adminUsername={profile.username}
              onRefresh={onRefresh}
            />
          )}
          {activeTab === "mod_reports" && (
            <TabModReports onRefresh={onRefresh} />
          )}
          {activeTab === "users" && <TabUserManagement />}
        </div>
      </main>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
        active
          ? "bg-[#38A1F3] text-white shadow-lg"
          : "text-slate-400 hover:bg-slate-900 hover:text-white"
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

// === ERP TABS ===

function TabDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    communities: 0,
    posts: 0,
    pending: 0,
  });
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { count: users } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { count: comms } = await supabase
        .from("communities")
        .select("*", { count: "exact", head: true });
      const { count: posts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });
      const { count: pending } = await supabase
        .from("moderation_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      const { data: logData } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setStats({
        users: users || 0,
        communities: comms || 0,
        posts: posts || 0,
        pending: pending || 0,
      });
      if (logData) setLogs(logData);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight">System Overview</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Registered Users"
          value={stats.users}
          color="border-blue-500 text-blue-600"
        />
        <StatCard
          title="Total Communities"
          value={stats.communities}
          color="border-purple-500 text-purple-600"
        />
        <StatCard
          title="Total Platform Posts"
          value={stats.posts}
          color="border-green-500 text-green-600"
        />
        <StatCard
          title="Pending Deletions"
          value={stats.pending}
          color="border-amber-500 text-amber-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-8">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 font-bold">
          Admin Deletion Logs
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 text-gray-500 uppercase tracking-wider">
                Report No
              </th>
              <th className="p-4 text-gray-500 uppercase tracking-wider">
                Reported By
              </th>
              <th className="p-4 text-gray-500 uppercase tracking-wider">
                Post ID
              </th>
              <th className="p-4 text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="p-4 text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  No logs generated yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-4 font-bold">#{log.report_no}</td>
                  <td className="p-4 font-medium text-blue-600">
                    @{log.reported_by}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{log.post_id}</td>
                  <td className="p-4 text-gray-700">
                    {log.reason || "Manual Intervention"}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-red-50 text-red-600 font-bold text-xs rounded-md uppercase">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: any) {
  return (
    <div className={`bg-white p-6 rounded-2xl border-l-4 shadow-sm ${color}`}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {title}
      </h3>
      <p className="text-3xl font-black mt-2 text-slate-900">{value}</p>
    </div>
  );
}

function TabManagePosts({ adminUsername, onRefresh }: any) {
  const [postId, setPostId] = useState("");
  const [postData, setPostData] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const searchPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId.trim()) return;
    setLoading(true);

    // Explicitly fetch the post and its comments without triggering any navigation
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles:posts_user_id_fkey (full_name, username, avatar_url),
        communities:posts_community_id_fkey (name, slug),
        comments ( id, content, created_at, profiles ( full_name, username, avatar_url ) )
      `,
      )
      .eq("id", postId.trim())
      .single();

    setLoading(false);

    if (error) {
      alert(`Post not found or invalid ID. (${error.message})`);
      setPostData(null);
    } else if (data) {
      // Sort comments by oldest first
      if (data.comments) {
        data.comments.sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      }
      setPostData(data);
    }
  };

  const handleForceDelete = async () => {
    if (!reason) return alert("Must provide a reason for the log.");

    // Calls the secure backend function to bypass RLS blocks
    const { error } = await supabase.rpc("admin_delete_post", {
      target_post_id: postData.id,
      admin_reason: reason,
    });

    if (!error) {
      alert("Post successfully removed and logged in ERP.");
      setPostData(null);
      setPostId("");
      setReason("");
      if (onRefresh) onRefresh();
    } else {
      alert(`Failed to delete post: ${error.message}`);
    }
  };

  return (
    // Added pb-16 to add scroll clearance at the bottom of the page
    <div className="space-y-6 pb-16">
      <h2 className="text-2xl font-black tracking-tight">
        Manual Post Override
      </h2>
      <form onSubmit={searchPost} className="flex gap-4">
        <input
          type="text"
          value={postId}
          onChange={(e) => setPostId(e.target.value)}
          placeholder="Enter Exact Post UUID..."
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38A1F3]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800"
        >
          {loading ? "Searching..." : "Fetch Data"}
        </button>
      </form>

      {postData && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mt-6 animate-in fade-in slide-in-from-bottom-4">
          {/* SPLIT LAYOUT: POST ON LEFT, COMMENTS ON RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* LEFT SIDE: POST CONTENT */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col">
              <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs mb-4">
                Post Info
              </h3>

              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                <img
                  src={
                    postData.profiles?.avatar_url ||
                    "https://api.dicebear.com/7.x/initials/svg?seed=user"
                  }
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
                <div>
                  <p className="font-black text-gray-900">
                    s/{postData.communities?.name || "community"}
                  </p>
                  <p className="text-sm font-medium text-blue-600">
                    @{postData.profiles?.username}
                  </p>
                </div>
              </div>

              <p className="text-gray-900 text-base leading-relaxed mb-4 whitespace-pre-wrap flex-1">
                {postData.content}
              </p>

              {postData.media_url && postData.media_type === "image" && (
                <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                  <img
                    src={postData.media_url}
                    className="w-full h-auto max-h-64 object-cover"
                  />
                </div>
              )}
            </div>

            {/* RIGHT SIDE: COMMENTS */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col max-h-[400px] lg:max-h-full">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs">
                  Post Comments
                </h3>
                <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-md">
                  {postData.comments?.length || 0}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300">
                {!postData.comments || postData.comments.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 font-medium text-sm">
                    No comments found on this post.
                  </div>
                ) : (
                  postData.comments.map((comment: any) => (
                    <div
                      key={comment.id}
                      className="bg-white border border-gray-100 p-3 rounded-lg flex gap-3 shadow-sm"
                    >
                      <img
                        src={
                          comment.profiles?.avatar_url ||
                          "https://api.dicebear.com/7.x/initials/svg?seed=user"
                        }
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <p className="font-bold text-xs text-gray-900 mb-1">
                          @{comment.profiles?.username}
                        </p>
                        <p className="text-sm text-gray-700">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM SIDE: ACTIONS */}
          <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for deletion (Required for ERP Logging)..."
              className="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-red-400 font-medium"
            />
            <div className="flex gap-4">
              <button
                onClick={handleForceDelete}
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-md active:scale-[0.99]"
              >
                Confirm & Remove Post
              </button>
              <button
                onClick={() => setPostData(null)}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-4 rounded-xl hover:bg-gray-300 transition-all active:scale-[0.99]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function TabModReports({ onRefresh }: any) {
  const [modQueue, setModQueue] = useState<any[]>([]);

  const fetchQ = async () => {
    const { data } = await supabase
      .from("moderation_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setModQueue(data);
  };

  useEffect(() => {
    fetchQ();
  }, []);

  const handleResolveRequest = async (
    id: string,
    action: string,
    targetContent: string,
  ) => {
    if (action === "deleted") {
      const extractedId = targetContent.replace("Post ID: ", "").trim();
      // Uses the new RPC to bypass RLS blocks
      await supabase.rpc("admin_delete_post", {
        target_post_id: extractedId,
        admin_reason: "Moderator Request Approved",
      });
    }

    await supabase
      .from("moderation_requests")
      .update({ status: action })
      .eq("id", id);
    fetchQ();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight">
        Moderator Report Queue
      </h2>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 font-bold text-gray-500 uppercase tracking-wider">
              <th className="p-4">Request ID</th>
              <th className="p-4">Requested By</th>
              <th className="p-4">Target</th>
              <th className="p-4">Reason</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {modQueue.map((req) => (
              <tr key={req.id}>
                <td className="p-4 font-bold">{req.request_id}</td>
                <td className="p-4 text-blue-600 font-medium">
                  @{req.moderator_name}
                </td>
                <td className="p-4">{req.target_content}</td>
                <td className="p-4">
                  <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold">
                    {req.reason}
                  </span>
                </td>
                <td className="p-4 flex gap-2 justify-end">
                  <button
                    onClick={() =>
                      handleResolveRequest(
                        req.id,
                        "deleted",
                        req.target_content,
                      )
                    }
                    title="Approve & Delete Post"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() =>
                      handleResolveRequest(
                        req.id,
                        "dismissed",
                        req.target_content,
                      )
                    }
                    title="Dismiss Request"
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {modQueue.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400">
                  Queue is clean.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabUserManagement() {
  const [search, setSearch] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", search.replace("@", "").trim())
      .maybeSingle();

    setLoading(false);

    if (data) {
      setUserData(data);
    } else {
      alert("User not found in system.");
      setUserData(null);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    // Calls the secure backend function to bypass profile-update RLS blocks
    const { error } = await supabase.rpc("admin_update_user_status", {
      target_user_id: userData.id,
      new_status: status,
    });

    if (!error) {
      alert(
        `User status successfully changed to ${status.toUpperCase()}. Live sessions will be automatically terminated.`,
      );
      setUserData({ ...userData, account_status: status });
    } else {
      alert(`Failed to update user status: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight">
        Security & User Management
      </h2>
      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search via Exact Username..."
          className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38A1F3]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800"
        >
          {loading ? "Searching..." : "Locate User"}
        </button>
      </form>

      {userData && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-start gap-8 shadow-sm mt-6">
          <img
            src={
              userData.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=user`
            }
            className="w-32 h-32 rounded-xl object-cover border border-gray-100"
          />
          <div className="flex-1">
            <h3 className="text-2xl font-black">
              {userData.full_name || "Unknown"}
            </h3>
            <p className="text-gray-500 font-medium">@{userData.username}</p>
            <p className="text-sm mt-2 text-gray-700">
              {userData.bio || "No bio provided."}
            </p>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">
                  Account Status
                </p>
                <p
                  className={`text-lg font-black uppercase ${userData.account_status === "active" || !userData.account_status ? "text-green-600" : "text-red-600"}`}
                >
                  {userData.account_status || "ACTIVE"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusUpdate("suspended")}
                  className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg shadow-sm hover:bg-amber-600"
                >
                  Temp Suspend
                </button>
                <button
                  onClick={() => handleStatusUpdate("banned")}
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow-sm hover:bg-red-700"
                >
                  Permanent Ban
                </button>
                <button
                  onClick={() => handleStatusUpdate("active")}
                  className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg shadow-sm hover:bg-green-700"
                >
                  Restore Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
