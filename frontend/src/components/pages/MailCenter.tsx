import { useState, useEffect } from "react";
import { 
  Mail, 
  Send, 
  Inbox, 
  Trash2, 
  Archive, 
  FileText, 
  Search, 
  Plus, 
  Star, 
  MoreVertical, 
  RotateCcw, 
  CheckCircle2, 
  Paperclip,
  ChevronRight,
  User,
  Filter,
  X,
  Reply,
  Forward,
  ExternalLink,
  Clock,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchInbox, fetchSent, sendInternalMail, markMailAsRead, fetchUsers } from "@/features/dashboard/api";
import { useAuthStore } from "@/store/auth-store";

export function MailCenterPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  // Compose State
  const [composeData, setComposeData] = useState({
    recipient_id: "",
    subject: "",
    body: ""
  });

  const inboxQuery = useQuery({ 
    queryKey: ["mail", "inbox"], 
    queryFn: fetchInbox,
    enabled: selectedFolder === 'inbox'
  });

  const sentQuery = useQuery({ 
    queryKey: ["mail", "sent"], 
    queryFn: fetchSent,
    enabled: selectedFolder === 'sent'
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers
  });

  const sendMutation = useMutation({
    mutationFn: sendInternalMail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "sent"] });
      setIsComposeOpen(false);
      setComposeData({ recipient_id: "", subject: "", body: "" });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: markMailAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "inbox"] });
    }
  });

  const mails = (selectedFolder === 'inbox' ? inboxQuery.data?.items : sentQuery.data?.items) ?? [];
  const filteredMails = mails.filter((m: any) => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.recipient.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEmail = mails.find((e: any) => e.id === selectedEmailId);

  useEffect(() => {
    if (selectedEmail && !selectedEmail.is_read && selectedFolder === 'inbox') {
      markReadMutation.mutate(selectedEmail.id);
    }
  }, [selectedEmailId]);

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: inboxQuery.data?.items?.filter((m: any) => !m.is_read).length ?? 0 },
    { id: 'sent', label: 'Sent', icon: Send, count: 0 },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: 0 },
    { id: 'archive', label: 'Archive', icon: Archive, count: 0 },
    { id: 'trash', label: 'Trash', icon: Trash2, count: 0 },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6 overflow-hidden">
      {/* 1. Folders Sidebar */}
      <div className="w-64 flex flex-col gap-6">
        <Button 
          onClick={() => setIsComposeOpen(true)}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl py-6 shadow-lg shadow-primary-100 flex items-center gap-2 text-sm font-bold tracking-wide transition-all active:scale-95"
        >
          <Plus size={18} /> COMPOSE
        </Button>

        <nav className="space-y-1">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                if (folder.id === 'inbox' || folder.id === 'sent') {
                  setSelectedFolder(folder.id as any);
                  setSelectedEmailId(null);
                }
              }}
              disabled={folder.id !== 'inbox' && folder.id !== 'sent'}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
                selectedFolder === folder.id 
                  ? 'bg-primary-50 text-primary-700 shadow-sm' 
                  : folder.id !== 'inbox' && folder.id !== 'sent' ? 'opacity-50 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <folder.icon size={18} className={selectedFolder === folder.id ? 'text-primary-600' : 'text-slate-400'} />
                <span className="text-sm font-semibold">{folder.label}</span>
              </div>
              {folder.count > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  selectedFolder === folder.id ? 'bg-primary-200 text-primary-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {folder.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 rounded-3xl bg-slate-50 border border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 text-center">Integration Status</p>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 justify-center bg-white py-2 rounded-xl border border-emerald-100">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Internal Mail System Active
          </div>
        </div>
      </div>

      {/* 2. Email List */}
      <div className="w-96 flex flex-col gap-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 capitalize">{selectedFolder}</h2>
            <div className="flex gap-1">
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["mail"] })}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
              >
                <RotateCcw size={16} />
              </button>
              <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><Filter size={16} /></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search emails..."
              className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-100 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          {inboxQuery.isLoading || sentQuery.isLoading ? (
            <div className="flex flex-col gap-4 p-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-3 w-48 bg-slate-50 rounded" />
                </div>
              ))}
            </div>
          ) : filteredMails.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center mt-12">
              <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                <Inbox size={32} className="text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-400">No emails found</p>
            </div>
          ) : (
            filteredMails.map((email: any) => (
              <button
                key={email.id}
                onClick={() => setSelectedEmailId(email.id)}
                className={`w-full text-left p-5 transition-all border-b border-slate-50/50 group relative ${
                  selectedEmailId === email.id ? 'bg-primary-50/30' : 'hover:bg-slate-50/50'
                }`}
              >
                {selectedEmailId === email.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full" />
                )}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-bold ${email.is_read || selectedFolder === 'sent' ? 'text-slate-600' : 'text-slate-900'}`}>
                    {selectedFolder === 'inbox' ? email.sender.full_name : email.recipient.full_name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h3 className={`text-xs font-bold truncate mb-1 ${email.is_read || selectedFolder === 'sent' ? 'text-slate-500' : 'text-slate-800'}`}>
                  {email.subject}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {email.body}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {email.has_attachments && <Paperclip size={12} className="text-slate-400" />}
                  {email.is_starred && <Star size={12} className="text-amber-400 fill-amber-400" />}
                  {selectedFolder === 'inbox' && !email.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary-500 ml-auto" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 3. Reading Pane */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {selectedEmail ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex gap-2">
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-all"><Archive size={18} /></button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18} /></button>
                <div className="w-px h-6 bg-slate-100 mx-1 self-center" />
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"><MoreVertical size={18} /></button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setComposeData({
                      recipient_id: selectedEmail.sender.id,
                      subject: `Re: ${selectedEmail.subject}`,
                      body: `\n\n--- Original Message ---\nFrom: ${selectedEmail.sender.full_name}\nSent: ${new Date(selectedEmail.created_at).toLocaleString()}\n\n${selectedEmail.body}`
                    });
                    setIsComposeOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all border border-slate-100"
                >
                  <Reply size={14} /> Reply
                </button>
              </div>
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">{selectedEmail.subject}</h1>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                    {selectedFolder === 'inbox' ? selectedEmail.sender.full_name[0] : selectedEmail.recipient.full_name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">
                        {selectedFolder === 'inbox' ? selectedEmail.sender.full_name : selectedEmail.recipient.full_name}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {new Date(selectedEmail.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      &lt;{selectedFolder === 'inbox' ? selectedEmail.sender.email : selectedEmail.recipient.email}&gt;
                    </p>
                  </div>
                </div>
              </div>

              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedEmail.body}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
            <div className="h-24 w-24 rounded-[2rem] bg-white shadow-xl shadow-slate-100 flex items-center justify-center mb-6">
              <Mail size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Select an email to read</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Choose a message from the inbox list to see its full content and threads.
            </p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
            <motion.div 
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              className="w-[32rem] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden flex flex-col pointer-events-auto"
            >
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <span className="font-bold text-sm tracking-wide">New Internal Message</span>
                <button 
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <span className="text-xs font-bold text-slate-400 w-8">To</span>
                  <select 
                    className="flex-1 text-sm outline-none font-medium bg-transparent"
                    value={composeData.recipient_id}
                    onChange={(e) => setComposeData({ ...composeData, recipient_id: e.target.value })}
                  >
                    <option value="">Select Recipient...</option>
                    {(usersQuery.data?.items ?? []).filter((u: any) => u.id !== currentUser?.id).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <span className="text-xs font-bold text-slate-400 w-8">Sub</span>
                  <input 
                    type="text" 
                    className="flex-1 text-sm outline-none font-medium" 
                    placeholder="Email subject..." 
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  />
                </div>
                <textarea 
                  className="w-full h-64 resize-none outline-none text-sm leading-relaxed font-medium placeholder:text-slate-300"
                  placeholder="Write your message here..."
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                />
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="p-2.5 text-slate-400 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 shadow-sm"><Paperclip size={18} /></button>
                </div>
                <Button 
                  onClick={() => sendMutation.mutate(composeData)}
                  disabled={!composeData.recipient_id || !composeData.subject || !composeData.body || sendMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 rounded-xl font-bold text-sm h-12 shadow-lg shadow-primary-100 flex items-center gap-2"
                >
                  {sendMutation.isPending ? "SENDING..." : (
                    <>
                      <Send size={16} /> SEND MAIL
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
