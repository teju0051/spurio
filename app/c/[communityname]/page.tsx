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
  Users,
  Calendar,
  ShieldCheck,
  Plus,
  Settings,
  UserMinus,
  Info,
} from "lucide-react";

export default function CommunityPage() {
  const params = useParams();
  const router = useRouter();
  const communityName = params.communityname as string;

  const [community, setCommunity] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for Creators & Mobile Info Drawer
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showMobileInfoDrawer, setShowMobileInfoDrawer] = useState(false);

  const fetchCommunityData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const { data: activeUser } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();
        setCurrentUser(activeUser);
      }

      const decodedName = decodeURIComponent(communityName).trim();
      const { data: commData, error: commError } = await supabase
        .from("communities")
        .select("*")
        .or(`name.ilike.${decodedName},slug.ilike.${decodedName}`)
        .maybeSingle();

      if (commError || !commData) {
        setLoading(false);
        return;
      }
      setCommunity(commData);

      // Fetch Live Members
      const { data: memberData } = await supabase
        .from("community_members")
        .select(`*, profiles (id, full_name, username, avatar_url)`)
        .eq("community_id", commData.id);

      if (memberData) setMembers(memberData);

      // Fetch Live Posts
      const { data: postData } = await supabase
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
        .eq("community_id", commData.id)
        .order("created_at", { ascending: false });

      if (postData) {
        postData.forEach((p: any) => {
          if (p.comments) {
            p.comments.sort(
              (a: any, b: any) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime(),
            );
          }
        });
        setPosts(postData);
      }
    } catch (err) {
      console.error("Error fetching community:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (communityName) fetchCommunityData();
  }, [communityName]);

  const isCreator =
    currentUser && community && currentUser.id === community.creator_id;
  const isMember = members.some((m) => m.user_id === currentUser?.id);

  const toggleJoinCommunity = async () => {
    if (!currentUser) return alert("Log in to join communities!");

    if (isMember) {
      setMembers((prev) => prev.filter((m) => m.user_id !== currentUser.id));
      await supabase
        .from("community_members")
        .delete()
        .match({ community_id: community.id, user_id: currentUser.id });
    } else {
      const newMember = {
        community_id: community.id,
        user_id: currentUser.id,
        profiles: currentUser,
      };
      setMembers((prev) => [...prev, newMember]);
      await supabase
        .from("community_members")
        .insert({ community_id: community.id, user_id: currentUser.id });
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#38A1F3]" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-900">
        <h1 className="text-2xl font-black mb-2">Community Not Found</h1>
        <p className="text-gray-500 mb-6">
          The community s/{communityName} does not exist.
        </p>
        <button
          onClick={() => router.push("/explore")}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-bold shadow-md hover:bg-gray-800 transition-colors"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 text-gray-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="shrink-0 z-50 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 py-3 sticky top-0 shadow-sm">
        <button
          onClick={() => router.push("/explore")}
          className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Feed
        </button>

        {/* Mobile Info Button (Visible only on Mobile) */}
        <button
          onClick={() => setShowMobileInfoDrawer(true)}
          className="md:hidden p-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
          title="Community Info"
        >
          <Info className="w-5 h-5" />
        </button>
      </header>

      {/* Premium Community Banner */}
      <div className="w-full h-40 md:h-56 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 relative">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Community Header Info */}
      <div className="bg-white px-4 sm:px-6 lg:px-8 pb-6 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white border-4 border-white shadow-xl overflow-hidden shrink-0">
              <img
                src={
                  community.avatar_url ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${community.name}`
                }
                alt={community.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mb-1">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
                s/{community.name}
              </h1>
              <p className="text-gray-500 font-medium text-sm md:text-base mt-1">
                {community.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2 w-full md:w-auto">
            {isCreator ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-bold shadow-sm transition-colors"
                >
                  <Settings className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-bold shadow-md transition-colors"
                >
                  <Users className="w-4 h-4" /> Manage Members
                </button>
              </>
            ) : (
              <button
                onClick={toggleJoinCommunity}
                className={`flex-1 md:flex-none px-8 py-2.5 rounded-full font-bold shadow-md transition-colors ${isMember ? "bg-gray-100 text-gray-900 hover:bg-gray-200" : "bg-[#38A1F3] text-white hover:bg-blue-500"}`}
              >
                {isMember ? "Joined" : "Join Community"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Left Column: Post Feed */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-black text-gray-800">Recent Posts</h2>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>

          {posts.map((post) => (
            <IsolatedPostItem
              key={post.id}
              post={post}
              profile={currentUser}
              onRefresh={fetchCommunityData}
              isDetailView={false}
            />
          ))}

          {posts.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 font-medium">
                Be the first to start a discussion in s/{community.name}!
              </p>
            </div>
          )}
        </div>

        {/* Right Column: About Community Widget (Hidden on Mobile, Visible on Desktop) */}
        <aside className="hidden md:flex w-80 shrink-0 flex-col gap-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 p-4">
              <h3 className="font-extrabold text-gray-900 tracking-tight text-sm uppercase">
                About Community
              </h3>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <p className="text-gray-700 text-sm leading-relaxed font-medium">
                {community.about || "A great place to share and discuss!"}
              </p>

              {/* LIVE Metrics */}
              <div className="flex items-center gap-4 py-4 border-y border-gray-100">
                <div className="flex-1">
                  <div className="text-xl font-black text-gray-900">
                    {members.length}
                  </div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Members
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200"></div>
                <div className="flex-1">
                  <div className="text-xl font-black text-gray-900">
                    {posts.length}
                  </div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Posts
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                <span>
                  Created {new Date(community.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Public Community</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* =========================================
          MOBILE INFO DRAWER (Triggered by 'i' icon)
          ========================================= */}
      {showMobileInfoDrawer && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-gray-900/60 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={() => setShowMobileInfoDrawer(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-6 shadow-2xl pb-safe space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-black text-xl text-gray-900">
                About s/{community.name}
              </h3>
              <button
                onClick={() => setShowMobileInfoDrawer(false)}
                className="p-2 bg-gray-100 rounded-full text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-700 text-sm leading-relaxed font-medium">
              {community.about || "A great place to share and discuss!"}
            </p>

            <div className="flex items-center gap-4 py-4 border-y border-gray-100">
              <div className="flex-1 text-center">
                <div className="text-2xl font-black text-gray-900">
                  {members.length}
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                  Members
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="flex-1 text-center">
                <div className="text-2xl font-black text-gray-900">
                  {posts.length}
                </div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">
                  Posts
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Created {new Date(community.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                <span>Public Community</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Community Modal (Creator Only) */}
      {showEditModal && (
        <EditCommunityModal
          community={community}
          onClose={() => setShowEditModal(false)}
          onSuccess={(newSlug: string) => {
            setShowEditModal(false);
            if (newSlug !== community.name) router.push(`/c/${newSlug}`);
            else fetchCommunityData();
          }}
        />
      )}

      {/* Manage Members Modal (Creator Only) */}
      {showMembersModal && (
        <ManageMembersModal
          community={community}
          members={members}
          onClose={() => setShowMembersModal(false)}
          onRefresh={fetchCommunityData}
        />
      )}
    </div>
  );
}

/* =========================================
   EDIT COMMUNITY MODAL
   ========================================= */
function EditCommunityModal({ community, onClose, onSuccess }: any) {
  const [name, setName] = useState(community.name);
  const [about, setAbout] = useState(community.about || "");
  const [avatarUrl, setAvatarUrl] = useState(community.avatar_url || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const slugName = name.replace(/\s+/g, "").toLowerCase();

    const { error } = await supabase
      .from("communities")
      .update({ name, slug: slugName, about, avatar_url: avatarUrl })
      .eq("id", community.id);

    setLoading(false);
    if (error) return alert(`Database Error: ${error.message}`);
    onSuccess(slugName);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-gray-900/80 backdrop-blur-sm md:px-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 shadow-2xl relative pb-safe">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Community</h2>
        <X
          className="absolute top-6 right-6 w-5 h-5 text-gray-400 cursor-pointer"
          onClick={onClose}
        />

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
              Icon URL
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================
   MANAGE MEMBERS MODAL
   ========================================= */
function ManageMembersModal({ community, members, onClose, onRefresh }: any) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this user from the community?")) return;
    setLoadingId(userId);
    const { error } = await supabase
      .from("community_members")
      .delete()
      .match({ community_id: community.id, user_id: userId });
    setLoadingId(null);
    if (!error) onRefresh();
    else alert(`Error: ${error.message}`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-gray-900/80 backdrop-blur-sm md:px-4">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md flex flex-col max-h-[80vh] shadow-2xl pb-safe">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Members</h2>
            <p className="text-xs font-bold text-gray-500 uppercase mt-1">
              {members.length} Total Members
            </p>
          </div>
          <X
            className="w-5 h-5 text-gray-400 cursor-pointer"
            onClick={onClose}
          />
        </div>

        <div className="overflow-y-auto p-2">
          {members.length === 0 ? (
            <p className="p-8 text-center text-gray-500 font-medium">
              No members yet.
            </p>
          ) : (
            members.map((member: any) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={
                      member.profiles?.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=user`
                    }
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-sm text-gray-900 truncate">
                      {member.profiles?.full_name || "User"}
                    </h4>
                    <p className="text-xs text-gray-500 font-medium">
                      @{member.profiles?.username}
                    </p>
                  </div>
                </div>
                {member.user_id !== community.creator_id ? (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={loadingId === member.user_id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Remove Member"
                  >
                    {loadingId === member.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserMinus className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md shrink-0">
                    Creator
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
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
