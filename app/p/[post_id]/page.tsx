"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  Loader2,
  Heart,
  MessageCircle,
  Share,
  Edit3,
  Trash2,
  Flag,
  X,
  Copy,
  Check,
  Home,
  PlusSquare,
  Search,
  Users,
  History,
  User as UserIcon,
  Video,
  UploadCloud,
  Image as ImageIcon,
} from "lucide-react";

export default function SinglePostPage() {
  const params = useParams();
  const router = useRouter();

  // Safely capture the post ID matching your [post_id] folder and force TypeScript to see it as a string
  const rawId = params?.post_id || params?.postId || params?.postid;
  const postId = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

  const [post, setPost] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [communities, setCommunities] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Mobile Tab & Search States
  const [activeMobileTab, setActiveMobileTab] = useState<
    "post" | "search" | "communities"
  >("post");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recentSearches");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  const fetchPostData = async (currentPostId: string) => {
    if (!currentPostId) return;

    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      setCurrentUser(profileData);

      // Fetch Communities (for Mobile Tabs & Modals)
      const { data: comms } = await supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: false });
      if (comms) setCommunities(comms);

      // Fetch Post with Likes & Comments
      const { data: postData, error: postError } = await supabase
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
        .eq("id", currentPostId)
        .maybeSingle();

      if (postError) {
        setErrorMsg(`Database Error: ${postError.message}`);
      } else if (postData) {
        // Sort comments chronologically (oldest first)
        if (postData.comments) {
          postData.comments.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          );
        }
        setPost(postData);
      } else {
        setPost(null);
      }
    } catch (err: any) {
      console.error("Critical Error fetching post:", err);
      setErrorMsg(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchPostData(postId);
    }
  }, [postId]);

  // Search Logic
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#38A1F3] mb-4" />
      </div>
    );
  }

  if (errorMsg || !post) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="text-2xl font-black mb-2 text-gray-900">
          {errorMsg ? "Error Fetching Post" : "Post Not Found"}
        </h1>
        <p className="text-gray-500 mb-6">
          {errorMsg || "This post has been deleted or does not exist."}
        </p>
        <button
          onClick={() => router.push("/explore")}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white md:bg-gray-50 text-gray-900 flex flex-col font-sans overflow-hidden">
      {/* Top Navbar (Hidden entirely on Mobile) */}
      <header className="hidden md:flex shrink-0 z-50 bg-white border-b border-gray-200 items-center px-6 py-4 sticky top-0 shadow-sm">
        <button
          onClick={() => router.push("/explore")}
          className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Feed
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative w-full">
        {/* Desktop always shows post, Mobile switches based on tab */}
        <div
          className={`w-full h-full overflow-y-auto ${activeMobileTab === "post" ? "block" : "hidden md:block"}`}
        >
          <main className="max-w-2xl w-full mx-auto px-0 md:px-4 py-0 md:py-8 h-full">
            <IsolatedPostItem
              post={post}
              profile={currentUser}
              onRefresh={() => fetchPostData(postId)}
              isDetailView={true}
            />
          </main>
        </div>

        {/* TAB 2: MOBILE SEARCH */}
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
          onClick={() => router.push(`/u/${currentUser?.username}`)}
          className="p-3 flex flex-col items-center transition-transform active:scale-95"
        >
          <div className="w-[28px] h-[28px] rounded-full overflow-hidden border border-gray-200 shadow-sm">
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
      {isProfileModalOpen && (
        <ProfileModal
          profile={currentUser}
          isNewUser={!currentUser?.full_name}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdate={(p: any) => setCurrentUser(p)}
          onLogout={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
        />
      )}
      {isCreateCommunityOpen && (
        <CreateCommunityModal
          profile={currentUser}
          onClose={() => setIsCreateCommunityOpen(false)}
          onSuccess={() => {}}
        />
      )}
      {isCreatePostOpen && (
        <CreatePostModal
          profile={currentUser}
          communities={communities}
          onClose={() => setIsCreatePostOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}

/* =========================================
   ISOLATED POST COMPONENT
   ========================================= */
function IsolatedPostItem({ post, profile, onRefresh, isDetailView }: any) {
  const router = useRouter();
  const isAuthor = profile && post.user_id === profile.id;
  const isAdmin = profile && profile.role === "admin";
  const isModerator = profile && profile.role === "moderator";

  const [likes, setLikes] = useState<any[]>(post.likes || []);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [isLiked, setIsLiked] = useState(
    profile && likes.some((l) => l.user_id === profile.id),
  );

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [commentText, setCommentText] = useState("");

  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleLike = async () => {
    if (!profile) return alert("Log in to like posts!");
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
    if (!profile) return alert("Log in to comment!");
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
    if (!error) {
      router.push("/explore");
    }
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
          <h2 className="text-base md:text-lg font-medium leading-relaxed text-gray-900 whitespace-pre-wrap">
            {post.content}
          </h2>
        )}
      </div>

      {post.media_url && post.media_type === "image" && (
        <div className="w-full bg-gray-100 relative max-h-[500px] overflow-hidden mt-2">
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
          <button className="flex items-center gap-1.5 font-bold text-sm text-gray-900 transition-colors">
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

      <div className="px-4 md:px-5 pb-4">
        <div className="space-y-2 mb-3">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-2">
              <span
                onClick={() => router.push(`/u/${comment.profiles?.username}`)}
                className="font-bold text-sm text-gray-900 hover:underline cursor-pointer"
              >
                {comment.profiles?.username}
              </span>
              <span className="text-sm text-gray-800">{comment.content}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handlePostComment} className="flex items-center gap-3">
          <img
            src={
              profile?.avatar_url ||
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
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
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
// REMAINDER OF THE MODALS AND ADMIN DASHBOARD
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
      creator_id: profile?.id,
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
      const filePath = `${profile?.id}-${Date.now()}.${mediaFile.name.split(".").pop()}`;
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
        user_id: profile?.id,
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
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    bio: profile?.bio || "",
    avatar_url: profile?.avatar_url || "",
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
      const filePath = `${profile?.id}-${Math.random()}.${fileExt}`;

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
        .neq("id", profile?.id)
        .maybeSingle();

      if (existingUser) {
        throw new Error(
          "This username is already taken. Please pick another one.",
        );
      }

      const { error: updateError } = await supabase.from("profiles").upsert({
        id: profile?.id,
        role: profile?.role || "user",
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
