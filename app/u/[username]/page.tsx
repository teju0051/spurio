"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Loader2,
  User as UserIcon,
  Heart,
  MessageCircle,
  Video,
  UploadCloud,
  X,
  Image as ImageIcon,
  Home,
  PlusSquare,
  Search,
  Users,
  History,
  Copy,
  Check,
} from "lucide-react";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameSlug = params.username as string;

  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]); // Added for tabs & modals
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Mobile Tab & Search States
  const [activeMobileTab, setActiveMobileTab] = useState<
    "profile" | "search" | "communities"
  >("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  const fetchCommunities = async () => {
    const { data: comms } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });
    if (comms) setCommunities(comms);
  };

  const fetchUserData = async () => {
    try {
      // 1. Fetch current active session user
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const { data: activeUser } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();
        setCurrentUser(activeUser);
      }

      // 2. Fetch the target profile we are viewing
      const cleanUsername = decodeURIComponent(usernameSlug)
        .replace("@", "")
        .trim();
      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (profError || !profData) {
        setLoading(false);
        return;
      }
      setTargetProfile(profData);

      // 3. Fetch posts made by target profile
      const { data: postData } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles:posts_user_id_fkey (full_name, username, avatar_url),
          communities:posts_community_id_fkey (name, slug),
          likes ( user_id ),
          comments ( id )
        `,
        )
        .eq("user_id", profData.id)
        .order("created_at", { ascending: false });

      if (postData) {
        setPosts(postData);
      }

      // 4. Fetch communities for mobile tabs & post modal
      await fetchCommunities();
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usernameSlug) fetchUserData();
  }, [usernameSlug]);

  const executeSearch = (query: string) => {
    const cleanQuery = query.replace("@", "").trim();
    if (!cleanQuery) return;
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

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!targetProfile) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white text-gray-900">
        <h1 className="text-2xl font-black mb-2">User Not Found</h1>
        <p className="text-gray-500 mb-6">@{usernameSlug} does not exist.</p>
        <button
          onClick={() => router.push("/explore")}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  const isOwner = currentUser?.id === targetProfile?.id;

  return (
    <div className="h-screen w-full bg-white text-gray-900 flex flex-col font-sans overflow-hidden">
      {/* Top Navbar (Hidden on Mobile) */}
      <header className="hidden md:flex shrink-0 z-50 bg-white border-b border-gray-100 items-center justify-between px-6 py-4">
        <button
          onClick={() => router.push("/explore")}
          className="flex items-center gap-2 text-gray-900 font-black hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" /> {targetProfile.username}
        </button>
      </header>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto w-full">
        {/* TAB 1: USER PROFILE (Always visible on Desktop) */}
        <div
          className={`w-full max-w-4xl mx-auto pt-6 pb-12 px-0 md:px-4 ${activeMobileTab === "profile" ? "block" : "hidden md:block"}`}
        >
          {/* MOBILE PROFILE HEADER */}
          <div className="flex md:hidden gap-6 items-center px-4 mb-10">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                {targetProfile.avatar_url ? (
                  <img
                    src={targetProfile.avatar_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-400 m-auto mt-6" />
                )}
              </div>
              {isOwner && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-[-12px] bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-1.5 px-4 rounded-full shadow-md transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black">
                {targetProfile.full_name || "Unnamed User"}
              </h1>
              <p className="text-gray-400 text-sm font-medium mt-0.5">
                @{targetProfile.username}
              </p>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed">
                {targetProfile.bio || "No bio provided."}
              </p>
              <p className="text-gray-500 text-xs font-bold mt-2 uppercase tracking-wider">
                {posts.length} Posts
              </p>
            </div>
          </div>

          {/* DESKTOP PROFILE HEADER */}
          <div className="hidden md:flex gap-12 px-4 md:px-0 mb-10 items-start">
            <div className="shrink-0">
              <div className="w-40 h-40 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                {targetProfile.avatar_url ? (
                  <img
                    src={targetProfile.avatar_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-16 h-16 text-gray-400 m-auto mt-10" />
                )}
              </div>
            </div>
            <div className="flex flex-col flex-1 pt-4">
              <div className="flex items-center gap-6 mb-4">
                <h2 className="text-2xl font-medium">
                  {targetProfile.username}
                </h2>
                {isOwner && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="bg-white hover:bg-gray-50 border border-gray-200 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors text-gray-900"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
              <div className="mb-4 text-base">
                <span>
                  <span className="font-bold">{posts.length}</span>{" "}
                  contributions to communities
                </span>
              </div>
              <div>
                <span className="font-bold block text-base">
                  {targetProfile.full_name}
                </span>
                <span className="text-sm block mt-1 whitespace-pre-wrap max-w-lg text-gray-700">
                  {targetProfile.bio || "No bio provided."}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block border-t border-gray-200 mb-6 w-full" />

          {/* POST GRID */}
          <div className="grid grid-cols-3 gap-1 md:gap-6 px-1 md:px-0">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/p/${post.id}`)}
                className="aspect-square bg-gray-100 relative group cursor-pointer overflow-hidden rounded-xl md:rounded-sm border border-gray-100"
              >
                {post.media_url ? (
                  <>
                    {post.media_type === "video" ? (
                      <>
                        <video
                          src={post.media_url}
                          className="w-full h-full object-cover"
                        />
                        <Video className="w-5 h-5 absolute top-2 right-2 text-white drop-shadow-md" />
                      </>
                    ) : (
                      <img
                        src={post.media_url}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 text-center bg-gradient-to-br from-gray-50 to-gray-200">
                    <p className="text-xs md:text-sm font-medium text-gray-800 line-clamp-4">
                      {post.content}
                    </p>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold backdrop-blur-[2px]">
                  <span className="flex items-center gap-2">
                    <Heart className="w-6 h-6 fill-white" />{" "}
                    {post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 fill-white" />{" "}
                    {post.comments?.length || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {posts.length === 0 && (
            <div className="py-20 text-center text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <h2 className="text-xl font-bold text-gray-600 mb-1">
                No Posts Yet
              </h2>
              <p>
                When {targetProfile.username} contributes, they'll show up here.
              </p>
            </div>
          )}
        </div>

        {/* TAB 2: MOBILE SEARCH */}
        {activeMobileTab === "search" && (
          <div className="w-full h-full flex flex-col md:hidden bg-white">
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
                        <span className="font-bold text-gray-900">@{term}</span>
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

        {/* TAB 3: MOBILE COMMUNITIES */}
        {activeMobileTab === "communities" && (
          <div className="w-full h-full flex flex-col md:hidden bg-gray-50">
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
      </div>

      {/* =========================================
          MOBILE BOTTOM NAVIGATION
          ========================================= */}
      <nav className="md:hidden shrink-0 bg-white border-t border-gray-200 flex items-center justify-around h-[68px] pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => router.push("/explore")}
          className="p-3 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <Home className="w-[26px] h-[26px]" />
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
          onClick={() => {
            setActiveMobileTab("profile");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="p-3 flex flex-col items-center transition-transform active:scale-95"
        >
          <div
            className={`w-[28px] h-[28px] rounded-full overflow-hidden border ${activeMobileTab === "profile" ? "border-gray-900 border-2" : "border-gray-200"} shadow-sm`}
          >
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-gray-400" />
              </div>
            )}
          </div>
        </button>
      </nav>

      {/* MODALS */}
      {isEditModalOpen && (
        <ProfileModal
          profile={targetProfile}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={(p: any) => {
            setTargetProfile(p);
            fetchUserData();
          }}
        />
      )}
      {isCreateCommunityOpen && (
        <CreateCommunityModal
          profile={currentUser}
          onClose={() => setIsCreateCommunityOpen(false)}
          onSuccess={fetchUserData}
        />
      )}
      {isCreatePostOpen && (
        <CreatePostModal
          profile={currentUser}
          communities={communities}
          onClose={() => setIsCreatePostOpen(false)}
          onSuccess={fetchUserData}
        />
      )}
    </div>
  );
}

/* =========================================
   MODAL: EDIT PROFILE
   ========================================= */
function ProfileModal({ profile, onClose, onUpdate }: any) {
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
      if (!e.target.files || e.target.files.length === 0)
        throw new Error("You must select an image.");
      const file = e.target.files[0];
      const filePath = `${profile.id}-${Math.random()}.${file.name.split(".").pop()}`;
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
      if (existingUser)
        throw new Error(
          "This username is already taken. Please pick another one.",
        );
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
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-gray-900/80 backdrop-blur-sm md:px-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pb-safe">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={handleSave}
          className="p-6 overflow-y-auto flex-1 space-y-5"
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
                <UserIcon className="w-10 h-10 text-gray-400 m-auto mt-5" />
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
                Click the image to upload a new avatar.
              </p>
              {uploading && (
                <p className="text-xs font-bold text-blue-500 animate-pulse">
                  Uploading...
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 font-medium"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Username Slug *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                @
              </span>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-gray-900 font-medium lowercase"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-900 min-h-[100px] font-medium resize-none"
            />
          </div>
        </form>
        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================
   MODAL: CREATE COMMUNITY
   ========================================= */
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
      name,
      slug: slugName,
      about,
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

/* =========================================
   MODAL: CREATE POST
   ========================================= */
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
    const { error } = await supabase
      .from("posts")
      .insert({
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
