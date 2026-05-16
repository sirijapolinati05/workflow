import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, FolderPlus, X, Check, Search, Trash2, Shield, Calendar, UserPlus, Phone, Video, MoreVertical, Plus, Minus, RotateCw, Smile, Mic, Send, Paperclip, Info, ChevronRight, FileText, Image as ImageIcon, Camera, Headphones, User, BarChart2, CalendarDays, Sticker, Download, Clock, ListPlus, Image, BellOff, Palette, ChevronLeft, Reply, MessageSquare, Forward, ThumbsDown, CheckSquare, Share, Star, Copy, Pin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchGroups, createGroup, fetchUsers, deleteGroup, fetchGroup, addGroupMembers, exitGroup, markNotificationsAsReadByType } from "@/features/dashboard/api";
import { fetchMessages, sendMessage, votePoll, deleteMessage, reactToMessage } from "@/features/chat/api";
import { useRealtime } from "@/hooks/use-realtime";
import { CollectionPage } from "@/components/pages/CollectionPage";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  body?: string;
  timestamp: string;
  is_self: boolean;
  type: 'text' | 'image' | 'document' | 'poll' | 'event' | 'audio' | 'system';
  metadata?: any;
  reply_to?: Message;
  reactions?: Record<string, string[]>;
  sender_avatar?: string;
  is_starred?: boolean;
}

export function MyGroupPage() {
  const user = useAuthStore((state) => state.user);
  const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const isAdmin = roleName === "ADMIN" || roleName === "SUPER_ADMIN" || roleName === "TEAM_LEAD";
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Feature Modals
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const groupIconInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ name: "", description: "", member_ids: [] as string[] });

  const [pollData, setPollData] = useState({ question: "", options: ["", ""] });
  const [eventData, setEventData] = useState({ title: "", date: "", time: "", location: "" });
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Multiple Uploads & Lightbox State
  const [pendingFiles, setPendingFiles] = useState<{ file: File; type: string; preview?: string }[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<{ images: { url: string; name?: string }[]; index: number } | null>(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('pinned_messages_store');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      return [];
    }
    return [];
  });

  const [showPinnedGallery, setShowPinnedGallery] = useState(false);
  const [showStarredGallery, setShowStarredGallery] = useState(false);
  const [groupIconUrl, setGroupIconUrl] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [cropBoxSize, setCropBoxSize] = useState(300); // Dynamic crop box size

  useEffect(() => {
    localStorage.setItem('pinned_messages_store', JSON.stringify(pinnedMessages));
  }, [pinnedMessages]);

  useEffect(() => {
    // Clear any unread group notifications when visiting the page
    markNotificationsAsReadByType("GROUP_INVITE").catch(console.error);
    markNotificationsAsReadByType("GROUP_MESSAGE").catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      const savedIcon = localStorage.getItem(`group_icon_${selectedGroupId}`);
      setGroupIconUrl(savedIcon || null);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMedia) {
        if (e.key === 'ArrowRight' && selectedMedia.index < selectedMedia.images.length - 1) {
          setSelectedMedia(prev => prev ? { ...prev, index: prev.index + 1 } : null);
        } else if (e.key === 'ArrowLeft' && selectedMedia.index > 0) {
          setSelectedMedia(prev => prev ? { ...prev, index: prev.index - 1 } : null);
        } else if (e.key === 'Escape') {
          setSelectedMedia(null);
        }
      } else if (e.key === 'Escape') {
        setShowMediaGallery(false);
        setShowPinnedGallery(false);
        setShowStarredGallery(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia]);

  const groups = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAdmin
  });

  const selectedGroupBasic = (groups.data?.items ?? []).find((g: any) => g.id === selectedGroupId);

  const groupDetailQuery = useQuery({
    queryKey: ["group", selectedGroupId],
    queryFn: () => fetchGroup(selectedGroupId!),
    enabled: !!selectedGroupId && showChatModal
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", selectedGroupId],
    queryFn: () => fetchMessages(selectedGroupId!),
    enabled: !!selectedGroupId && showChatModal
  });

  const { events } = useRealtime(user?.id);

  useEffect(() => {
    if (messagesQuery.data?.items) {
      const formattedMessages = messagesQuery.data.items.map((m: any) => ({
        id: m.id,
        sender_name: String(m.sender_id) === String(user?.id) ? "You" : (m.sender_name || "User"),
        body: m.body,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_self: String(m.sender_id) === String(user?.id),
        type: m.type || 'text',
        metadata: m.metadata || {},
        reply_to: m.reply_to,
        reactions: m.reactions || {},
        sender_avatar: m.sender_avatar
      }));
      setMessages(formattedMessages.reverse());
    }
  }, [messagesQuery.data, user?.id]);

  useEffect(() => {
    const lastEvent = events[0];
    if (!lastEvent || processedEventsRef.current.has(lastEvent.id)) return;

    // Mark as processed
    processedEventsRef.current.add(lastEvent.id);

    if (lastEvent.type === 'group_message' && lastEvent.message.group_id === selectedGroupId) {
      if (lastEvent.message.sender_id !== user?.id) {
        const msg = lastEvent.message;
        const newMessage: Message = {
          id: msg.id,
          sender_name: String(msg.sender_id) === String(user?.id) ? "You" : (msg.sender_name || "User"),
          body: msg.body,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          is_self: String(msg.sender_id) === String(user?.id),
          type: msg.type,
          metadata: msg.metadata || {},
          reply_to: msg.reply_to,
          reactions: msg.reactions || {},
          sender_avatar: msg.sender_avatar
        };
        setMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
    } else if (lastEvent.type === 'message_reaction') {
      setMessages(prev => prev.map(m => String(m.id) === String(lastEvent.message_id) ? { ...m, reactions: lastEvent.reactions } : m));
    } else if (lastEvent.type === 'message_update' && lastEvent.message.group_id === selectedGroupId) {
      const updatedMsg = lastEvent.message;
      setMessages(prev => prev.map(m => String(m.id) === String(updatedMsg.id) ? {
        ...m,
        metadata: updatedMsg.metadata,
        body: updatedMsg.body
      } : m));
    } else if (lastEvent.type === 'message_delete') {
      setMessages(prev => prev.filter(m => String(m.id) !== String(lastEvent.message_id)));
    }
  }, [events, selectedGroupId, showChatModal, user?.id]);

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, message: msg });
  };

  const [showMenuEmojiPicker, setShowMenuEmojiPicker] = useState(false);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowMenuEmojiPicker(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const reactMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string, emoji: string }) => reactToMessage(messageId, emoji),
    onSuccess: (newReactions, variables) => {
      setMessages(prev => prev.map(m => m.id === variables.messageId ? { ...m, reactions: newReactions } : m));
      setContextMenu(null);
      setShowMenuEmojiPicker(false);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: (_, messageId) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setContextMenu(null);
    }
  });

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setContextMenu(null);
  };

  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.id !== lastMessageIdRef.current) {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        lastMessageIdRef.current = lastMsg.id;
      }
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      const newMessage: Message = {
        id: data.id,
        sender_name: "You",
        body: data.body,
        timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_self: true,
        type: data.type,
        metadata: data.metadata,
        reply_to: data.reply_to ? {
          id: data.reply_to.id,
          sender_name: String(data.reply_to.sender_id) === String(user?.id) ? "You" : (data.reply_to.sender_name || "User"),
          body: data.reply_to.body,
          timestamp: new Date(data.reply_to.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          is_self: String(data.reply_to.sender_id) === String(user?.id),
          type: data.reply_to.type,
          metadata: data.reply_to.metadata || {}
        } : undefined
      };
      setMessages(prev => [...prev, newMessage]);
    }
  });

  const addMessage = (type: Message['type'], content?: string, metadata?: any) => {
    if (!selectedGroupId) return;

    const payload = {
      group_id: selectedGroupId,
      type,
      body: content,
      metadata,
      reply_to_id: replyingTo?.id
    };
    sendMessageMutation.mutate(payload);
    setReplyingTo(null);
  };

  const voteMutation = useMutation({
    mutationFn: ({ messageId, optionIndex }: { messageId: string, optionIndex: number }) => votePoll(messageId, optionIndex),
    onSuccess: (data) => {
      // Local update will be handled by WebSocket message_update
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && pendingFiles.length === 0) return;

    if (inputText.trim()) {
      addMessage('text', inputText);
      setInputText("");
    }

    const images = pendingFiles.filter(f => f.type === 'image');
    const others = pendingFiles.filter(f => f.type !== 'image');

    if (images.length > 1) {
      addMessage('image', undefined, {
        is_group: true,
        images: images.map(img => ({ url: img.preview, name: img.file.name }))
      });
    } else if (images.length === 1) {
      addMessage('image', undefined, { url: images[0].preview, name: images[0].file.name });
    }

    others.forEach(item => {
      if (item.type === 'audio') {
        addMessage('audio', undefined, { url: item.preview, name: item.file.name });
      } else {
        addMessage('document', undefined, {
          url: item.preview,
          name: item.file.name,
          size: (item.file.size / 1024).toFixed(1) + " KB"
        });
      }
    });

    setPendingFiles([]);
    setShowEmojiPicker(false);
  };

  const toggleStar = (messageId: string) => {
    reactMutation.mutate({ messageId, emoji: '⭐' });
    setContextMenu(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPendingPromises = files.map(file => {
      return new Promise<{ file: File; type: string; preview?: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            file,
            type,
            preview: ev.target?.result as string
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(newPendingPromises);
    setPendingFiles(prev => [...prev, ...results]);

    // Reset input value so the same file can be picked again
    e.target.value = '';
    setShowAttachmentMenu(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPendingPromises = files.map(file => {
      return new Promise<{ file: File; type: string; preview?: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          resolve({
            file,
            type: 'audio',
            preview: ev.target?.result as string
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(newPendingPromises);
    setPendingFiles(prev => [...prev, ...results]);

    e.target.value = '';
    setShowAttachmentMenu(false);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollData.question || pollData.options.some(o => !o)) return;
    addMessage('poll', undefined, { ...pollData, votes: pollData.options.map(() => 0) });
    setShowPollModal(false);
    setShowAttachmentMenu(false);
    setPollData({ question: "", options: ["", ""] });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.title || !eventData.date) return;
    addMessage('event', undefined, { ...eventData });
    setShowEventModal(false);
    setShowAttachmentMenu(false);
    setEventData({ title: "", date: "", time: "", location: "" });
  };

  const attachmentItems = [
    { label: "Document", icon: FileText, color: "text-purple-500", bg: "bg-purple-50", action: () => fileInputRef.current?.click() },
    { label: "Photos & videos", icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-50", action: () => mediaInputRef.current?.click() },
    { label: "Audio", icon: Headphones, color: "text-orange-500", bg: "bg-orange-50", action: () => audioInputRef.current?.click() },
    { label: "Poll", icon: BarChart2, color: "text-yellow-500", bg: "bg-yellow-50", action: () => setShowPollModal(true) },
    { label: "Event", icon: CalendarDays, color: "text-rose-500", bg: "bg-rose-50", action: () => setShowEventModal(true) },
    { label: "Emoji", icon: Smile, color: "text-emerald-500", bg: "bg-emerald-50", action: () => { setShowEmojiPicker(true); setShowAttachmentMenu(false); } },
  ];

  const handleOpenChat = (id: string) => {
    setSelectedGroupId(id);
    setShowChatModal(true);
    setShowInfoSidebar(false);
    setShowAttachmentMenu(false);
    setShowEmojiPicker(false);
    setShowOptionsMenu(false);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  const optionItems = [
    { label: "Add to list", icon: ListPlus },
    { label: "Group info", icon: Info, action: () => { setShowInfoSidebar(true); setShowMediaGallery(false); } },
    { label: "Group media", icon: Image, action: () => { setShowMediaGallery(true); setShowInfoSidebar(false); setShowPinnedGallery(false); setShowStarredGallery(false); } },
    { label: "Pinned messages", icon: Pin, action: () => {
      if (pinnedMessages.length > 0) {
        setShowPinnedGallery(true);
        setShowMediaGallery(false);
        setShowInfoSidebar(false);
        setShowStarredGallery(false);
      } else {
        alert("No messages pinned in this group");
      }
    }},
    { label: "Starred messages", icon: Star, action: () => {
      const hasStarred = messages.some(msg => msg.reactions?.['⭐']?.includes(String(user?.id)));
      if (hasStarred) {
        setShowStarredGallery(true);
        setShowMediaGallery(false);
        setShowPinnedGallery(false);
        setShowInfoSidebar(false);
      } else {
        alert("You haven't starred any messages yet");
      }
    }},
    { label: "Search", icon: Search, action: () => setIsSearchActive(true) },
    { label: "Mute notifications", icon: BellOff },
    { label: "Chat theme", icon: Palette },
    { label: "More", icon: ChevronRight, isMore: true },
  ];

  const deleteGroupMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    }
  });

  const addMembersMutation = useMutation({
    mutationFn: (memberIds: string[]) => addGroupMembers(selectedGroupId!, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", selectedGroupId] });
      setShowAddMembersModal(false);
      setSelectedNewMembers([]);
    }
  });

  const exitGroupMutation = useMutation({
    mutationFn: () => exitGroup(selectedGroupId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowChatModal(false);
      setSelectedGroupId(null);
    }
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !user?.id) return;
    createGroupMutation.mutate({
      ...formData,
      owner_id: user.id
    });
  };

  const createGroupMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowCreateModal(false);
      setFormData({ name: "", description: "", member_ids: [] });
    }
  });

  const toggleMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  const filteredUsers = (usersQuery.data?.items ?? []).filter((u: any) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <CollectionPage
        title={isAdmin ? "Group Management" : "My Group"}
        subtitle="Cross-functional squads and collaboration spaces"
        headerContent={isAdmin ? (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-100 hover:bg-primary-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderPlus size={18} />
            Create New Group
          </Button>
        ) : undefined}
      >
        {/* Main Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {(groups.data?.items ?? []).map((group: any) => {
            const groupIcon = localStorage.getItem(`group_icon_${group.id}`);
            return (
              <div
                key={group.id}
                className="group relative rounded-[2rem] bg-white border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
                  {groupIcon ? (
                    <img src={groupIcon} alt="" className="w-20 h-20 rounded-full object-cover grayscale" />
                  ) : (
                    <Users size={80} className="text-primary-600" />
                  )}
                </div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 overflow-hidden">
                      {groupIcon ? (
                        <img src={groupIcon} alt="Group" className="h-full w-full object-cover" />
                      ) : (
                        <Users size={24} />
                      )}
                    </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Are you sure you want to delete this group?")) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {group.name}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-2">
                  {group.description || "Empowering team collaboration and project excellence through unified goal-setting and resource sharing."}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex -space-x-2">
                    {group.members?.slice(0, 3).map((member: any) => {
                      const fullUser = (usersQuery.data?.items || []).find((u: any) => u.id === member.id);
                      return (
                        <div key={member.id} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm" title={member.full_name}>
                          {fullUser?.avatar_url ? (
                            <img src={fullUser.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-600">
                              {member.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {(group.members?.length || 0) > 3 && (
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm" title={`${(group.members?.length || 0) - 3} more members`}>
                        +{(group.members?.length || 0) - 3}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenChat(group.id)}
                    className="px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 hover:scale-105 active:scale-95 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </CollectionPage>

      {/* Hidden File Inputs */}
      <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, 'document')} />
      <input type="file" multiple ref={mediaInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
      <input type="file" multiple ref={audioInputRef} accept="audio/*" className="hidden" onChange={handleAudioUpload} />
      <input 
        type="file" 
        ref={groupIconInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && selectedGroupId) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
              setCropImage(reader.result as string);
              setZoom(1);
              setRotation(0);
              setCropBoxSize(300);
              setDragPos({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
          }
        }} 
      />

      {/* WhatsApp Style Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-[2.5rem] shadow-2xl flex overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0" onClick={() => { setShowAttachmentMenu(false); setShowEmojiPicker(false); setShowOptionsMenu(false); }}>
              {/* Blue Header */}
              <div className="bg-primary-600 p-4 flex items-center justify-between text-white shadow-md z-[70] relative">
                {isSearchActive ? (
                  <div className="flex items-center w-full gap-3 animate-in slide-in-from-right-4 duration-300">
                    <button onClick={() => { setIsSearchActive(false); setSearchQuery(""); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <ChevronLeft size={20} />
                    </button>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search messages, names, polls..."
                      className="flex-1 bg-white/10 text-white placeholder-white/60 border-none rounded-xl px-4 py-2 outline-none focus:bg-white/20 transition-all text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowInfoSidebar(!showInfoSidebar)}>
                      <button onClick={(e) => { e.stopPropagation(); setShowChatModal(false); }} className="lg:hidden">
                        <X size={20} />
                      </button>
                      <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden">
                        {groupIconUrl ? (
                          <img src={groupIconUrl} alt="Group" className="h-full w-full object-cover" />
                        ) : (
                          <Users size={20} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <h2 className="font-bold text-sm leading-tight truncate max-w-[200px]">
                          {selectedGroupBasic?.name || groupDetailQuery.data?.name || "Group Chat"}
                        </h2>
                        <p className="text-blue-100 text-[10px] truncate max-w-[150px]">
                          {selectedGroupBasic?.members && selectedGroupBasic.members.length > 0
                            ? selectedGroupBasic.members.map((m: any) => m.full_name).join(", ")
                            : groupDetailQuery.data?.members && groupDetailQuery.data.members.length > 0
                              ? groupDetailQuery.data.members.map((m: any) => m.full_name).join(", ")
                              : "Active Members"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <Search size={18} className="cursor-pointer hover:text-blue-200 transition-colors" onClick={() => setIsSearchActive(true)} />
                      <Info
                        size={18}
                        className={`cursor-pointer transition-colors ${showInfoSidebar ? "text-blue-200" : "hover:text-blue-200"}`}
                        onClick={(e) => { e.stopPropagation(); setShowInfoSidebar(!showInfoSidebar); }}
                      />
                      <div className="relative">
                        <MoreVertical
                          size={18}
                          className={`cursor-pointer transition-colors ${showOptionsMenu ? "text-blue-200" : "hover:text-blue-200"}`}
                          onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); }}
                        />

                        {/* Header Options Menu */}
                        {showOptionsMenu && (
                          <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 p-2 animate-in zoom-in-95 slide-in-from-top-2 duration-200 z-[100]">
                            <div className="flex flex-col">
                              {optionItems.map((item, i) => (
                                <button
                                  key={item.label}
                                  onClick={(e) => { e.stopPropagation(); item.action?.(); setShowOptionsMenu(false); }}
                                  className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                                >
                                  <span className="text-[13px] font-bold text-slate-700">{item.label}</span>
                                  <item.icon size={16} className={`text-slate-300 group-hover:text-primary-600 transition-colors ${item.isMore ? 'ml-2' : ''}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setShowChatModal(false)} className="hidden lg:flex ml-2">
                        <X size={20} />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Pinned Message Banner */}
              <AnimatePresence>
                {pinnedMessages.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex items-center justify-between z-20 sticky top-0 shadow-sm"
                  >
                    <div
                      className="flex items-center gap-4 cursor-pointer flex-1 min-w-0"
                      onClick={() => setShowPinnedGallery(true)}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
                        <Pin size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest leading-none mb-1">
                          {pinnedMessages.length === 1 ? "Pinned Message" : `${pinnedMessages.length} Pinned Messages`}
                        </p>
                        <p className="text-xs text-slate-600 truncate font-medium">
                          <span className="font-bold text-slate-900">{pinnedMessages[pinnedMessages.length - 1].sender_name}: </span>
                          {pinnedMessages[pinnedMessages.length - 1].body || (pinnedMessages[pinnedMessages.length - 1].type === 'image' ? "Photo" : "Attachment")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPinnedGallery(true)}
                        className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline px-2"
                      >
                        View All
                      </button>
                      <button
                        onClick={() => setPinnedMessages([])}
                        className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Body */}
              <div
                ref={scrollRef}
                className="flex-1 relative overflow-y-auto bg-slate-50 p-8 space-y-6 no-scrollbar"
                style={{ backgroundImage: "url('https://i.pinimg.com/originals/97/c0/07/97c0075474abc6d7756037fd0a027ad3.jpg')", backgroundSize: "400px", backgroundRepeat: "repeat", backgroundBlendMode: "soft-light" }}
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <Send size={24} />
                    </div>
                    <p className="text-sm font-medium">Start the conversation in {selectedGroupBasic?.name}</p>
                  </div>
                )}

                {messages
                  .filter(msg => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    const bodyMatch = msg.body?.toLowerCase().includes(query);
                    const nameMatch = msg.sender_name?.toLowerCase().includes(query);
                    const pollMatch = msg.type === 'poll' && msg.metadata?.question?.toLowerCase().includes(query);
                    const docMatch = msg.type === 'document' && msg.metadata?.name?.toLowerCase().includes(query);
                    return bodyMatch || nameMatch || pollMatch || docMatch || (msg.type === 'system' && msg.body?.toLowerCase().includes(query));
                  })
                  .map((msg) => {
                    if (msg.type === 'system') {
                      return (
                        <div key={msg.id} className="text-center py-2">
                          <span className="bg-black/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1 rounded-full">
                            {msg.sender_id === user?.id ? 'You exited the group.' : `${msg.sender_name} exited the group.`}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <motion.div
                        key={msg.id}
                        id={`message-${msg.id}`}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(_, info) => {
                          if (info.offset.x > 70 || info.offset.x < -70) {
                            setReplyingTo(msg);
                          }
                        }}
                        className={`flex ${msg.is_self ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 w-full animate-in slide-in-from-bottom-2 duration-300 relative cursor-grab active:cursor-grabbing ${msg.reactions && Object.keys(msg.reactions).filter(e => e !== '⭐').length > 0 ? 'mb-4' : 'mb-1.5'
                          }`}
                      >
                        {!msg.is_self && (
                          <div className="h-9 w-9 rounded-full overflow-hidden flex-shrink-0 mb-1 border-2 border-white/5 shadow-sm">
                            <img
                              src={msg.sender_avatar || `https://ui-avatars.com/api/?name=${msg.sender_name}&background=random`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}

                        <div
                          onContextMenu={(e) => handleContextMenu(e, msg)}
                          className={`relative group shadow-sm transition-all duration-300 overflow-visible ${msg.type === 'text' ? 'px-2.5 py-1.5 rounded-2xl max-w-[75%]' : 'pt-1.5 pb-1 rounded-2xl max-w-[85%]'
                            } ${msg.is_self
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                            }`}
                        >
                          {/* Quoted Message (Reply) */}
                          {msg.reply_to && (
                            <div
                              onClick={() => {
                                const element = document.getElementById(`message-${msg.reply_to?.id}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  const bubble = element.querySelector('.group');
                                  if (bubble) {
                                    bubble.classList.add('opacity-50');
                                    setTimeout(() => bubble.classList.remove('opacity-50'), 400);
                                  }
                                }
                              }}
                              className={`mb-1.5 p-1.5 rounded-lg border-l-4 text-left cursor-pointer hover:opacity-80 transition-opacity flex items-stretch justify-between overflow-hidden gap-2 ${msg.is_self ? 'bg-black/10 border-white/40' : 'bg-slate-50 border-primary-500'
                                }`}>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className={`text-[11px] font-bold mb-1 ${msg.is_self ? 'text-white/80' : 'text-primary-600'
                                  }`}>
                                  {msg.reply_to.sender_name}
                                </p>
                                <div className={`text-xs line-clamp-1 opacity-80 flex items-center gap-1.5 ${msg.is_self ? 'text-white/90' : 'text-slate-600'}`}>
                                  {msg.reply_to.type === 'image' && <ImageIcon size={12} />}
                                  <span>{msg.reply_to.body || (msg.reply_to.type === 'image' ? 'Photo' : 'File')}</span>
                                </div>
                              </div>
                              {msg.reply_to.type === 'image' && msg.reply_to.metadata?.url && (
                                <div className="w-10 flex-shrink-0 -my-1.5 -mr-1.5 ml-2 bg-black/10">
                                  <img src={msg.reply_to.metadata.url} alt="" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          )}
                          {/* Bubble Tail */}
                          {msg.type === 'text' && (
                            <div className={`absolute top-0 w-3 h-3 ${msg.is_self
                                ? "-right-2 bg-primary-600 [clip-path:polygon(0_0,0_100%,100%_0)]"
                                : "-left-2 bg-white border-l border-t border-slate-100 [clip-path:polygon(100%_0,100%_100%,0_0)]"
                              }`} />
                          )}

                          <p className={`text-[11px] font-bold mb-0.5 px-0.5 ${msg.is_self ? 'text-blue-100' : 'text-[#f15c6d]'
                            }`}>
                            {msg.sender_name}
                          </p>

                          {/* Message Content by Type */}
                          {msg.type === 'text' && (
                            <div className="relative">
                              <p className="text-sm leading-snug font-medium break-words">
                                {msg.body}
                                <span className="inline-block w-16 h-3" />
                              </p>
                              <div className={`absolute bottom-0 right-0 flex items-center gap-1`}>
                                <span className={`text-[9px] ${msg.is_self ? "text-blue-100" : "text-slate-400"}`}>
                                  {msg.timestamp}
                                </span>
                                {pinnedMessages.some(m => m.id === msg.id) && <Pin size={10} className={`${msg.is_self ? "text-blue-100" : "text-primary-600"} fill-current/10 ml-1`} />}
                                {msg.reactions?.['⭐']?.includes(String(user?.id)) && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                                {msg.is_self && <Check size={10} className="text-blue-200" />}
                              </div>
                            </div>
                          )}

                          {msg.type === 'image' && (
                            <div className="p-1">
                              {msg.metadata.is_group ? (
                                <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden max-w-[280px]">
                                  {msg.metadata.images.slice(0, 4).map((img: any, i: number) => (
                                    <div
                                      key={i}
                                      className="relative aspect-square cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setSelectedMedia({ images: msg.metadata.images, index: i })}
                                    >
                                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                                      {i === 3 && msg.metadata.images.length > 4 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl backdrop-blur-[2px]">
                                          +{msg.metadata.images.length - 4}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <img
                                  src={msg.metadata.url}
                                  alt=""
                                  className="rounded-xl w-full max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setSelectedMedia({ images: [{ url: msg.metadata.url, name: msg.metadata.name }], index: 0 })}
                                />
                              )}
                              <div className="p-2 flex items-center justify-between">
                                <span className="text-[10px] opacity-70 truncate max-w-[150px]">
                                  {msg.metadata.is_group ? `${msg.metadata.images.length} photos` : msg.metadata.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  {pinnedMessages.some(m => m.id === msg.id) && <Pin size={10} className="text-slate-400 fill-current/10" />}
                                  <span className="text-[9px] opacity-70">{msg.timestamp}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {msg.type === 'document' && (
                            <div className={`p-3 flex items-center gap-4 min-w-[200px] ${msg.is_self ? 'bg-primary-700/30' : 'bg-slate-50'}`}>
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${msg.is_self ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600'}`}>
                                <FileText size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{msg.metadata.name}</p>
                                <p className={`text-[10px] ${msg.is_self ? 'text-blue-100' : 'text-slate-400'}`}>{msg.metadata.size}</p>
                              </div>
                              <Download
                                size={18}
                                className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
                                onClick={() => handleDownload(msg.metadata.url, msg.metadata.name)}
                              />
                            </div>
                          )}

                          {msg.type === 'poll' && msg.metadata && (
                            <div className="p-4 min-w-[240px]">
                              <p className="font-bold text-sm mb-4 flex items-center gap-2">
                                <BarChart2 size={16} /> {msg.metadata.question}
                              </p>
                              <div className="space-y-2">
                                {msg.metadata.options?.map((opt: string, i: number) => {
                                  const votes = Array.isArray(msg.metadata.votes) ? msg.metadata.votes[i] || 0 : 0;
                                  const totalVotes = Array.isArray(msg.metadata.votes) ? msg.metadata.votes.reduce((a: number, b: number) => a + b, 0) : 0;
                                  const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                                  const userVote = msg.metadata.voted_users?.[String(user?.id)];
                                  const hasVoted = userVote !== undefined;
                                  const isSelected = userVote === i;

                                  return (
                                    <button
                                      key={i}
                                      onClick={() => !isSelected && voteMutation.mutate({ messageId: msg.id, optionIndex: i })}
                                      disabled={isSelected || voteMutation.isPending}
                                      className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all relative overflow-hidden group ${isSelected
                                          ? "border-primary-600 bg-primary-50 ring-1 ring-primary-600 text-slate-900"
                                          : "border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                    >
                                      <div
                                        className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${isSelected ? 'bg-primary-600/10' : msg.is_self ? 'bg-white/20' : 'bg-primary-100'
                                          }`}
                                        style={{ width: `${percentage}%` }}
                                      />
                                      <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span>{opt}</span>
                                          {isSelected && <Check size={12} className="text-primary-600" />}
                                        </div>
                                        {totalVotes > 0 && <span className={`opacity-60 ${isSelected ? 'text-primary-600' : ''}`}>{percentage}%</span>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] mt-4 opacity-60 uppercase font-black tracking-widest">Select one option</p>
                            </div>
                          )}

                          {msg.type === 'event' && (
                            <div className="p-0 overflow-hidden min-w-[280px]">
                              <div className="bg-rose-500 p-4 text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Upcoming Event</p>
                                <p className="font-bold text-base leading-tight">{msg.metadata.title}</p>
                              </div>
                              <div className="p-4 space-y-3">
                                <div className="flex items-center gap-3 text-slate-600">
                                  <Calendar size={14} className="text-rose-500" />
                                  <span className="text-xs font-bold">{msg.metadata.date}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                  <Clock size={14} className="text-rose-500" />
                                  <span className="text-xs font-bold">{msg.metadata.time || "All day"}</span>
                                </div>
                                <button className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">
                                  Interested
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.type === 'audio' && (
                            <div className="p-4 min-w-[280px]">
                              <div className="flex items-center gap-4 mb-3">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${msg.is_self ? 'bg-white/20 text-white' : 'bg-primary-50 text-primary-600'}`}>
                                  <Headphones size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">{msg.metadata.name}</p>
                                  <p className={`text-[10px] ${msg.is_self ? 'text-blue-100' : 'text-slate-400'}`}>Audio Clip</p>
                                </div>
                              </div>
                              <audio controls className="w-full h-8 custom-audio-player">
                                <source src={msg.metadata.url} />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}

                          {/* Timestamp (only for doc/poll/audio) */}
                          {msg.type !== 'image' && msg.type !== 'event' && msg.type !== 'text' && (
                            <div className={`flex items-center gap-1.5 mt-2 justify-end px-1 pb-1`}>
                              <span className={`text-[9px] ${msg.is_self ? "text-blue-100" : "text-slate-400"}`}>
                                {msg.timestamp}
                              </span>
                              {pinnedMessages.some(m => m.id === msg.id) && <Pin size={10} className={`${msg.is_self ? "text-blue-100" : "text-primary-600"} fill-current/10 ml-1`} />}
                              {msg.reactions?.['⭐']?.includes(String(user?.id)) && <Star size={10} className="text-yellow-400 fill-yellow-400 ml-1" />}
                              {msg.is_self && <Check size={10} className="text-blue-200 ml-0.5" />}
                            </div>
                          )}

                          {/* Reactions Display */}
                          {msg.reactions && Object.keys(msg.reactions).filter(e => e !== '⭐').length > 0 && (
                            <div className={`absolute bottom-[-12px] ${msg.is_self ? 'right-2' : 'left-2'} flex items-center justify-center bg-white border border-slate-100 rounded-full h-[22px] px-1.5 shadow-sm z-20 hover:scale-110 transition-transform cursor-pointer overflow-hidden`}>
                              {Object.entries(msg.reactions).filter(([emoji]) => emoji !== '⭐').map(([emoji, users]) => (
                                <div key={emoji} className="flex items-center justify-center mx-0.5">
                                  <span className="text-[14px] leading-none transform translate-y-[1px]">{emoji}</span>
                                  {users.length > 1 && <span className="text-[9px] font-bold text-slate-500 ml-1">{users.length}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>

              {/* Input Area */}
              <div className="relative">
                {selectedGroupBasic && (
                  <>
                    {(() => {
                      const isMember = (groupDetailQuery.data?.members?.some((m: any) => m.id === user?.id)) ?? false;
                      return (
                        isMember ? (
                          <>
                            <div className="relative">
                              <AnimatePresence>
                                {replyingTo && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mx-4 mb-3 p-3 bg-white rounded-2xl border-l-4 border-primary-600 shadow-lg flex items-center justify-between absolute bottom-full left-0 right-0 z-20 overflow-hidden gap-3"
                                  >
                                    <div className="flex-1 min-w-0 pr-2">
                                      <p className="text-[11px] font-bold text-primary-600 mb-0.5">Replying to {replyingTo.sender_name}</p>
                                      <div className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                                        {replyingTo.type === 'image' && <ImageIcon size={12} className="opacity-70" />}
                                        <span>{replyingTo.body || (replyingTo.type === 'image' ? 'Photo' : 'File')}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {replyingTo.type === 'image' && replyingTo.metadata?.url && (
                                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                          <img src={replyingTo.metadata.url} alt="" className="h-full w-full object-cover" />
                                        </div>
                                      )}
                                      <button type="button" onClick={() => setReplyingTo(null)} className="h-8 w-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {showEmojiPicker && (
                                <div className="absolute bottom-full left-4 mb-4 animate-in slide-in-from-bottom-4 duration-300 z-40">
                                  <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    autoFocusSearch={false}
                                    theme={Theme.LIGHT}
                                    width={350}
                                    height={400}
                                  />
                                </div>
                              )}
                               {showAttachmentMenu && (
                                <div className="absolute bottom-full left-4 mb-4 w-56 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 animate-in slide-in-from-bottom-4 duration-300 z-30">
                                  <div className="space-y-1">
                                    {attachmentItems.map((item) => (
                                      <button
                                        key={item.label}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log("Attachment clicked:", item.label);
                                          item.action();
                                        }}
                                        className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all group text-left"
                                      >
                                        <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                                          <item.icon size={18} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Pending Files Preview */}
                              <AnimatePresence>
                                {pendingFiles.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="mx-4 mb-3 p-4 bg-white rounded-3xl shadow-2xl border border-slate-100 absolute bottom-full left-0 right-0 z-20"
                                  >
                                    <div className="flex items-center justify-between mb-3 px-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">
                                        {pendingFiles.length} {pendingFiles.length === 1 ? 'Attachment' : 'Attachments'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setPendingFiles([])}
                                        className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                        Clear All
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                                      {pendingFiles.map((item, index) => (
                                        <motion.div
                                          key={index}
                                          layout
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          className="relative flex-shrink-0 group"
                                        >
                                          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative">
                                            {item.type === 'image' && item.preview ? (
                                              <img src={item.preview} alt="" className="h-full w-full object-cover" />
                                            ) : item.type === 'audio' ? (
                                              <div className="flex flex-col items-center gap-1 text-orange-500">
                                                <Headphones size={24} />
                                                <span className="text-[8px] font-bold max-w-[60px] truncate px-1">{item.file.name}</span>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col items-center gap-1 text-purple-500">
                                                <FileText size={24} />
                                                <span className="text-[8px] font-bold max-w-[60px] truncate px-1">{item.file.name}</span>
                                              </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <button
                                                type="button"
                                                onClick={() => removePendingFile(index)}
                                                className="h-8 w-8 rounded-full bg-white text-red-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all"
                                              >
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-20 w-20 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-primary-400 hover:text-primary-600 transition-all flex-shrink-0"
                                      >
                                        <Plus size={20} />
                                        <span className="text-[8px] font-bold uppercase tracking-wider">Add More</span>
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <form onSubmit={handleSendMessage} className="bg-white p-4 border-t border-slate-100 flex items-center gap-4 shadow-2xl z-10">
                                <div className="flex items-center gap-4 text-slate-400">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowAttachmentMenu(!showAttachmentMenu); setShowEmojiPicker(false); setShowOptionsMenu(false); }}
                                    className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${showAttachmentMenu ? "bg-primary-50 text-primary-600" : "hover:text-primary-600"}`}
                                  >
                                    <Plus size={24} className={`transition-transform duration-300 ${showAttachmentMenu ? "rotate-45" : ""}`} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setShowAttachmentMenu(false); setShowOptionsMenu(false); }}
                                    className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${showEmojiPicker ? "bg-primary-50 text-primary-600" : "hover:text-primary-600"}`}
                                  >
                                    <Smile size={24} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                    className="h-10 w-10 rounded-xl flex items-center justify-center transition-all hover:bg-primary-50 hover:text-primary-600"
                                  >
                                    <Paperclip size={20} />
                                  </button>
                                </div>
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    placeholder="Type your message here..."
                                    className="w-full bg-slate-50 text-slate-900 text-sm rounded-2xl px-6 py-4 outline-none border border-slate-100 focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all shadow-inner"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                  />
                                </div>
                                <div className="text-primary-600">
                                  {(inputText.trim() || pendingFiles.length > 0) ? (
                                    <button type="submit" className="h-12 w-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-200 hover:scale-105 transition-all">
                                      <Send size={20} />
                                    </button>
                                  ) : (
                                    <button type="button" className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                      <Mic size={20} />
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center py-4 bg-gray-100 text-gray-600 text-sm font-medium">
                            <span>You exited the group.</span>
                          </div>
                        )
                      );
                    })()}
                  </>
                )}
              </div>
            </div>

            {/* Group Info Sidebar */}
            {showInfoSidebar && (
              <div className="w-[380px] bg-white border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-500 shadow-xl z-20">
                <div className="p-6 border-b border-slate-50 flex items-center gap-4">
                  <button onClick={() => setShowInfoSidebar(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                  <h3 className="font-bold text-slate-900">Group Info</h3>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {/* Profile Section */}
                  <div className="p-8 flex flex-col items-center text-center bg-white mb-3">
                    <div 
                      className="relative h-32 w-32 rounded-[2.5rem] bg-primary-50 flex items-center justify-center text-primary-600 mb-5 shadow-lg shadow-primary-50 cursor-pointer group overflow-hidden"
                      onClick={() => groupIconInputRef.current?.click()}
                    >
                      {groupIconUrl ? (
                        <img src={groupIconUrl} alt="Group Icon" className="w-full h-full object-cover" />
                      ) : (
                        <Users size={56} />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={32} className="text-white" />
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">{selectedGroupBasic?.name || "Group Chat"}</h4>
                    <p className="text-slate-400 text-sm mt-1">{groupDetailQuery.data?.members?.length || 0} members</p>
                  </div>

                  {/* Description Section */}
                  <div className="p-6 bg-white mb-3">
                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-3">Description</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedGroupBasic?.description || "No description provided for this collaboration group."}
                    </p>
                  </div>

                  {/* Members List Section */}
                  <div className="bg-white">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                        {groupDetailQuery.data?.members?.length || 0} Members
                      </p>
                      <Search size={14} className="text-slate-300" />
                    </div>

                    <div className="divide-y divide-slate-50">
                      {isAdmin && (
                        <button onClick={() => setShowAddMembersModal(true)} className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-primary-600 group">
                          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                            <UserPlus size={18} />
                          </div>
                          <span className="text-sm font-bold">Add Members</span>
                        </button>
                      )}

                      {(groupDetailQuery.data?.members || []).map((member: any) => (
                        <div key={member.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden border border-slate-200">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              member.full_name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-900 truncate">{member.full_name}</p>
                              {member.id === selectedGroupBasic?.owner_id && (
                                <span className="px-2 py-0.5 rounded-md bg-primary-50 text-[9px] font-bold text-primary-600 border border-primary-100">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{member.job_title || "Team Member"}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-all" />
                        </div>
                      ))}
                    </div>

                    <div className="p-6">
                      <button onClick={() => exitGroupMutation.mutate()} disabled={exitGroupMutation.isPending} className="w-full py-3.5 rounded-2xl border-2 border-red-50 text-red-500 font-bold text-sm hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        <Trash2 size={16} />
                        {exitGroupMutation.isPending ? "Exiting..." : "Exit Group"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Poll Creation Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Create Poll</h3>
            <form onSubmit={handleCreatePoll} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                  placeholder="Ask a question..."
                  value={pollData.question}
                  onChange={e => setPollData({ ...pollData, question: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Options</label>
                {pollData.options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    required
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-5 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const newOpts = [...pollData.options];
                      newOpts[i] = e.target.value;
                      setPollData({ ...pollData, options: newOpts });
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setPollData({ ...pollData, options: [...pollData.options, ""] })}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700"
                >
                  + Add Option
                </button>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={() => setShowPollModal(false)} type="button" className="flex-1 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</Button>
                <Button type="submit" className="flex-1 rounded-2xl bg-primary-600 text-white font-bold">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Creation Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Schedule Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Event Title</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                  placeholder="What's happening?"
                  value={eventData.title}
                  onChange={e => setEventData({ ...eventData, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                    value={eventData.date}
                    onChange={e => setEventData({ ...eventData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</label>
                  <input
                    type="time"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-100"
                    value={eventData.time}
                    onChange={e => setEventData({ ...eventData, time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button onClick={() => setShowEventModal(false)} type="button" className="flex-1 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</Button>
                <Button type="submit" className="flex-1 rounded-2xl bg-primary-600 text-white font-bold">Schedule</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Add Members</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar mb-6">
              {(usersQuery.data?.items || [])
                .filter((u: any) => !(groupDetailQuery.data?.members || []).find((m: any) => m.id === u.id))
                .map((user: any) => (
                  <label key={user.id} className="flex items-center gap-4 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-600"
                      checked={selectedNewMembers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedNewMembers([...selectedNewMembers, user.id]);
                        else setSelectedNewMembers(selectedNewMembers.filter(id => id !== user.id));
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </label>
                ))}
              {(usersQuery.data?.items || []).filter((u: any) => !(groupDetailQuery.data?.members || []).find((m: any) => m.id === u.id)).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">All available users are already in this group.</p>
              )}
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setShowAddMembersModal(false)} type="button" className="flex-1 rounded-2xl bg-slate-100 text-slate-600 font-bold">Cancel</Button>
              <Button
                onClick={() => addMembersMutation.mutate(selectedNewMembers)}
                disabled={selectedNewMembers.length === 0 || addMembersMutation.isPending}
                className="flex-1 rounded-2xl bg-primary-600 text-white font-bold"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-2xl rounded-[2.5rem] bg-white p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Create New Group</h2>
                <p className="text-slate-500 mt-1">Assemble a new team for project collaboration</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Group Name</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder="e.g. Frontend Squad"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Description</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all"
                    placeholder="Brief purpose of this group..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Members</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all w-48"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-2 no-scrollbar">
                  {filteredUsers.map((u: any) => {
                    const isSelected = formData.member_ids.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleMember(u.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${isSelected
                            ? "bg-primary-50 border-primary-200 ring-1 ring-primary-200"
                            : "bg-white border-slate-100 hover:border-primary-100 hover:bg-slate-50"
                          }`}
                      >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isSelected ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                          {u.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{u.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.job_title || "Team Member"}</p>
                        </div>
                        {isSelected && <Check size={14} className="text-primary-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <p className="text-xs font-medium text-slate-400">
                  <span className="text-primary-600 font-bold">{formData.member_ids.length}</span> members selected
                </p>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-2.5 rounded-2xl text-sm font-bold bg-white text-primary-600 border-2 border-primary-100 hover:border-primary-600 hover:bg-primary-50 transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!formData.name || createGroupMutation.isPending}
                    className="px-8 py-2.5 rounded-2xl bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-100 hover:bg-primary-500 transition-all hover:scale-[1.05] disabled:opacity-50 disabled:scale-100"
                  >
                    {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Feature Data Seeding Form (Placeholder) */}
      <div className="hidden">
        <form onSubmit={(e) => { e.preventDefault(); /* Seeding logic here */ }}>
          <input type="text" />
        </form>
      </div>
      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: Math.min(contextMenu.y, window.innerHeight - 500),
              left: Math.min(contextMenu.x, window.innerWidth - 300),
              zIndex: 1000
            }}
            className="w-72 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reactions */}
            <div className="p-3 border-b border-slate-50 flex items-center justify-between px-4 bg-slate-50/50 rounded-t-3xl">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => reactMutation.mutate({ messageId: contextMenu.message.id, emoji })}
                  className="text-xl hover:scale-125 transition-transform duration-200 drop-shadow-sm"
                >
                  {emoji}
                </button>
              ))}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenuEmojiPicker(!showMenuEmojiPicker);
                  }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${showMenuEmojiPicker ? "bg-primary-600 text-white" : "bg-slate-200/50 text-slate-500 hover:bg-slate-200"}`}
                >
                  <Plus size={16} />
                </button>

                {showMenuEmojiPicker && (
                  <div className="absolute top-0 left-full ml-4 z-[1200] shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                    <EmojiPicker
                      onEmojiClick={(data) => {
                        reactMutation.mutate({ messageId: contextMenu.message.id, emoji: data.emoji });
                      }}
                      theme={Theme.LIGHT}
                      width={320}
                      height={400}
                      lazyLoadEmojis={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-1.5 py-2">
              {contextMenu.message.type === 'image' && (
                <button className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group">
                  <div className="text-[13.5px] font-bold ml-1">Copy image</div>
                </button>
              )}

              <button onClick={() => { setReplyingTo(contextMenu.message); setContextMenu(null); }} className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left">
                <Reply size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold">Reply privately</div>
              </button>

              <button className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left">
                <MessageSquare size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold truncate">Message {contextMenu.message.sender_name}</div>
              </button>

              <button onClick={() => handleCopyMessage(contextMenu.message.body || "")} className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left">
                <Copy size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold">Copy</div>
              </button>

              <button className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left">
                <Forward size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold">Forward</div>
              </button>

              <button
                onClick={() => toggleStar(contextMenu.message.id)}
                className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left"
              >
                <Star
                  size={18}
                  className={contextMenu.message.reactions?.['⭐']?.includes(String(user?.id)) ? "text-yellow-400 fill-yellow-400" : "text-slate-400 group-hover:text-primary-600"}
                />
                <div className="text-[13.5px] font-bold">{contextMenu.message.reactions?.['⭐']?.includes(String(user?.id)) ? "Unstar" : "Star"}</div>
              </button>

              <button
                onClick={() => {
                  setPinnedMessages(prev => {
                    const isPinned = prev.some(m => m.id === contextMenu.message.id);
                    if (isPinned) return prev.filter(m => m.id !== contextMenu.message.id);
                    return [...prev, contextMenu.message];
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left"
              >
                <Pin size={18} className={pinnedMessages.some(m => m.id === contextMenu.message.id) ? "text-primary-600 fill-primary-600/20" : "text-slate-400 group-hover:text-primary-600"} />
                <div className="text-[13.5px] font-bold">{pinnedMessages.some(m => m.id === contextMenu.message.id) ? "Unpin message" : "Pin message"}</div>
              </button>

              <div className="my-1.5 h-[1px] bg-slate-100 mx-2" />

              <button className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left">
                <CheckSquare size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold">Select</div>
              </button>

              <button
                onClick={async () => {
                  try {
                    let blob: Blob | null = null;
                    let filename = 'download';
                    if (contextMenu.message.metadata?.url) {
                      filename = contextMenu.message.metadata.name || 'download';
                      const response = await fetch(contextMenu.message.metadata.url);
                      blob = await response.blob();
                    } else if (contextMenu.message.body) {
                      filename = `message_${contextMenu.message.id.slice(0, 8)}.txt`;
                      blob = new Blob([contextMenu.message.body], { type: 'text/plain' });
                    }

                    if (blob) {
                      if ('showSaveFilePicker' in window) {
                        try {
                          const handle = await (window as any).showSaveFilePicker({
                            suggestedName: filename,
                          });
                          const writable = await handle.createWritable();
                          await writable.write(blob);
                          await writable.close();
                        } catch (err: any) {
                          // User cancelled the picker
                          if (err.name !== 'AbortError') console.error(err);
                        }
                      } else {
                        // Fallback
                        const url = URL.createObjectURL(blob);
                        handleDownload(url, filename);
                        URL.revokeObjectURL(url);
                      }
                    }
                  } catch (err) {
                    console.error("Save failed", err);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left"
              >
                <Download size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold">Save as</div>
              </button>

              <button className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700 group text-left">
                <Share size={18} className="text-slate-400 group-hover:text-primary-600" />
                <div className="text-[13.5px] font-bold">Share</div>
              </button>

              <div className="my-1.5 h-[1px] bg-slate-100 mx-2" />

              <button className="w-full flex items-center gap-3.5 p-3 hover:bg-slate-50 rounded-2xl transition-colors text-rose-500 group text-left">
                <ThumbsDown size={18} className="text-rose-400 group-hover:text-rose-600" />
                <div className="text-[13.5px] font-bold">Report</div>
              </button>

              <button
                onClick={() => deleteMessageMutation.mutate(contextMenu.message.id)}
                disabled={deleteMessageMutation.isPending}
                className="w-full flex items-center gap-3.5 p-3 hover:bg-rose-50 rounded-2xl transition-colors text-rose-500 group text-left disabled:opacity-50"
              >
                <Trash2 size={18} className="text-rose-400 group-hover:text-rose-600" />
                <div className="text-[13.5px] font-bold">Delete</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Group Media Gallery Overlay */}
      <AnimatePresence>
        {showMediaGallery && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[80] border-l border-slate-100 flex flex-col"
          >
            <div className="p-6 bg-primary-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowMediaGallery(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="font-bold text-lg">Group Media</h3>
              </div>
              <X size={20} className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setShowMediaGallery(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
              {(() => {
                const media = messages.reduce((acc, msg) => {
                  if (msg.type === 'image') {
                    if (msg.metadata.is_group) {
                      acc.push(...msg.metadata.images);
                    } else {
                      acc.push({ url: msg.metadata.url, name: msg.metadata.name });
                    }
                  }
                  return acc;
                }, [] as any[]);

                if (media.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                      <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <ImageIcon size={24} />
                      </div>
                      <p className="text-sm font-medium">No media shared in this group yet</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-3 gap-2">
                    {media.map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer shadow-sm border border-slate-200/50"
                        onClick={() => setSelectedMedia({ images: media, index: i })}
                      >
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Showing all media shared in this chat
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Messages Gallery Overlay */}
      <AnimatePresence>
        {showPinnedGallery && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[80] border-l border-slate-100 flex flex-col"
          >
            <div className="p-6 bg-primary-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowPinnedGallery(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="font-bold text-lg">Pinned Messages</h3>
              </div>
              <X size={20} className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setShowPinnedGallery(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {pinnedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <Pin size={24} />
                  </div>
                  <p className="text-sm font-medium">No messages pinned yet</p>
                </div>
              ) : (
                pinnedMessages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      const element = document.getElementById(`message-${msg.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setShowPinnedGallery(false);
                      }
                    }}
                    className="p-4 rounded-2xl bg-primary-50/30 border border-primary-100 cursor-pointer hover:bg-primary-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-primary-600 uppercase tracking-widest">{msg.sender_name}</p>
                      <span className="text-[9px] text-slate-400 font-bold">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">
                      {msg.body || (msg.type === 'image' ? "Shared a photo" : "Shared an attachment")}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Jump to message</span>
                      <ChevronRight size={12} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                {pinnedMessages.length} Important messages pinned
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Starred Messages Gallery Overlay */}
      <AnimatePresence>
        {showStarredGallery && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[80] border-l border-slate-100 flex flex-col"
          >
            <div className="p-6 bg-primary-600 text-white flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowStarredGallery(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="font-bold text-lg flex items-center gap-2"><Star size={20} className="text-yellow-400 fill-yellow-400" /> Starred Messages</h3>
              </div>
              <X size={20} className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setShowStarredGallery(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {(() => {
                const starredMessages = messages.filter(msg => msg.reactions?.['⭐']?.includes(String(user?.id)));

                if (starredMessages.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                      <div className="h-16 w-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <Star size={24} />
                      </div>
                      <p className="text-sm font-medium">You haven't starred any messages</p>
                    </div>
                  );
                }

                return starredMessages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      const element = document.getElementById(`message-${msg.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setShowStarredGallery(false);
                      }
                    }}
                    className="p-4 rounded-2xl bg-primary-50/30 border border-primary-100 cursor-pointer hover:bg-primary-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-black text-primary-600 uppercase tracking-widest">{msg.sender_name}</p>
                      <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                        {msg.timestamp}
                        <Star size={10} className="text-yellow-400 fill-yellow-400 ml-1" />
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-3 leading-relaxed">
                      {msg.body || (msg.type === 'image' ? "Shared a photo" : "Shared an attachment")}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Jump to message</span>
                      <ChevronRight size={12} />
                    </div>
                  </motion.div>
                ));
              })()}
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Only you can see your starred messages
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile-Style Image Cropper Modal */}
      <AnimatePresence>
        {cropImage && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 flex items-center justify-between text-white/40">
              <span className="text-xs font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 bg-white/20 rounded-full" />
                <div className="w-2 h-2 bg-white/20 rounded-full" />
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden p-8 bg-black/40 flex items-center justify-center">
              <motion.div 
                id="main-crop-box"
                drag
                dragMomentum={false}
                style={{ width: cropBoxSize, height: cropBoxSize }}
                className="relative border-2 border-white/30 z-10 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move"
              >
                {/* 3x3 Grid Overlay */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Resizable Corner Handles (Interactive) */}
                <motion.div 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0}
                  onDrag={(_, info) => {
                    // Resize logic: increase/decrease cropBoxSize based on drag
                    setCropBoxSize(prev => Math.max(100, Math.min(400, prev + (info.delta.x + info.delta.y) / 2)));
                  }}
                  className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white cursor-nw-resize z-20" 
                />
                <motion.div 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0}
                  onDrag={(_, info) => {
                    setCropBoxSize(prev => Math.max(100, Math.min(400, prev + (info.delta.x - info.delta.y) / 2)));
                  }}
                  className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white cursor-ne-resize z-20" 
                />
                <motion.div 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0}
                  onDrag={(_, info) => {
                    setCropBoxSize(prev => Math.max(100, Math.min(400, prev - (info.delta.x - info.delta.y) / 2)));
                  }}
                  className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white cursor-sw-resize z-20" 
                />
                <motion.div 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0}
                  onDrag={(_, info) => {
                    setCropBoxSize(prev => Math.max(100, Math.min(400, prev + (info.delta.x + info.delta.y) / 2)));
                  }}
                  className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white cursor-se-resize z-20" 
                />
              </motion.div>

              {/* The Draggable/Rotatable Image */}
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                <motion.img
                  ref={imgRef}
                  drag
                  style={{ scale: zoom, rotate: rotation }}
                  src={cropImage}
                  className="max-w-none pointer-events-auto cursor-grab active:cursor-grabbing"
                  draggable={false}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="p-10 space-y-8">
              {/* Zoom Slider */}
              <div className="max-w-xs mx-auto flex items-center gap-4">
                <button 
                  onClick={() => setZoom(prev => Math.max(0.1, prev - 0.2))}
                  className="text-white/60 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-95"
                >
                  −
                </button>
                <input 
                  type="range" 
                  min="0.1" 
                  max="10" 
                  step="0.01" 
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-white h-0.5 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <button 
                  onClick={() => setZoom(prev => Math.min(10, prev + 0.2))}
                  className="text-white/60 hover:text-white text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-95"
                >
                  +
                </button>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCropImage(null)}
                  className="text-emerald-500 font-bold px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button 
                  onClick={() => setRotation(prev => prev + 90)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white active:scale-90"
                >
                  <RotateCw size={24} />
                </button>

                <button 
                  onClick={() => {
                    const canvas = document.createElement('canvas');
                    const size = 500;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx && imgRef.current) {
                      const cropBox = document.getElementById('main-crop-box')?.getBoundingClientRect();
                      const imgRect = imgRef.current.getBoundingClientRect();
                      
                      if (cropBox) {
                        const naturalWidth = imgRef.current.naturalWidth;
                        const naturalHeight = imgRef.current.naturalHeight;
                        
                        // 1. Clear canvas
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, size, size);
                        
                        // 2. Calculate the scale factor between the screen crop box and the 500px canvas
                        const canvasScale = size / cropBox.width;
                        
                        // 3. Find the center of the crop box in screen coordinates
                        const cropCenterX = cropBox.left + cropBox.width / 2;
                        const cropCenterY = cropBox.top + cropBox.height / 2;
                        
                        // 4. Find the center of the image in screen coordinates
                        const imgCenterX = imgRect.left + imgRect.width / 2;
                        const imgCenterY = imgRect.top + imgRect.height / 2;
                        
                        // 5. Calculate the relative offset of the image center from the crop box center
                        const offsetX = (imgCenterX - cropCenterX) * canvasScale;
                        const offsetY = (imgCenterY - cropCenterY) * canvasScale;
                        
                        // 6. Draw!
                        ctx.save();
                        // Move to the calculated offset on the canvas
                        ctx.translate(size / 2 + offsetX, size / 2 + offsetY);
                        // Apply rotation
                        ctx.rotate((rotation * Math.PI) / 180);
                        // Apply zoom and scale to fit natural size to displayed size
                        // We use the image's bounding box width vs natural width to get the base scale
                        // But since we have rotation, we use offsetWidth which is stable
                        const baseScale = (imgRef.current.offsetWidth / naturalWidth) * canvasScale;
                        ctx.scale(baseScale * zoom, baseScale * zoom);
                        
                        // Draw image centered at the translated point
                        ctx.drawImage(imgRef.current, -naturalWidth / 2, -naturalHeight / 2);
                        ctx.restore();
                        
                        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                        localStorage.setItem(`group_icon_${selectedGroupId}`, croppedBase64);
                        setGroupIconUrl(croppedBase64);
                        setCropImage(null);
                      }
                    }
                  }}
                  className="text-emerald-500 font-bold px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Safe Area Indicator */}
            <div className="h-1 w-32 bg-white/20 rounded-full mx-auto mb-4" />
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-8"
            onClick={() => setSelectedMedia(null)}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between text-white z-10 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex flex-col">
                <span className="text-sm font-bold truncate max-w-[200px] md:max-w-md">
                  {selectedMedia.images[selectedMedia.index]?.name || "Photo"}
                </span>
                <span className="text-[10px] opacity-60">
                  {selectedMedia.images.length > 1 ? `${selectedMedia.index + 1} of ${selectedMedia.images.length}` : "Group Media"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const current = selectedMedia.images[selectedMedia.index];
                    handleDownload(current.url, current.name || "image.png");
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Download size={20} />
                </button>
                <button onClick={() => setSelectedMedia(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Navigation Arrows */}
            <AnimatePresence>
              {selectedMedia.index > 0 && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(prev => prev ? { ...prev, index: prev.index - 1 } : null);
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-20"
                >
                  <ChevronLeft size={32} />
                </motion.button>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedMedia.index < selectedMedia.images.length - 1 && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(prev => prev ? { ...prev, index: prev.index + 1 } : null);
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-20"
                >
                  <ChevronRight size={32} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Image Wrapper */}
            <motion.div
              key={selectedMedia.index}
              initial={{ scale: 0.9, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl max-h-full w-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedMedia.images[selectedMedia.index]?.url}
                alt=""
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl shadow-white/5"
              />
            </motion.div>

            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-black/50 to-transparent">
              <div className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/80 text-xs font-bold flex items-center gap-3">
                <span className="opacity-60">Use arrows to browse</span>
                <div className="h-4 w-[1px] bg-white/20" />
                <span>Click anywhere to close</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
