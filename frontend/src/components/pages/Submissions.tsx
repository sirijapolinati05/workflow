import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ExternalLink, Github, Clock, User, FileText, CheckCircle2, AlertCircle, Inbox, Plus, Send, MessageSquare, XCircle, Image as ImageIcon, Upload, Trash2, Camera } from "lucide-react";

import { fetchSubmissions, updateSubmissionStatus, createSubmission, fetchTasks, deleteSubmission, updateSubmission, fetchUsers, addSubmissionFeedback } from "@/features/dashboard/api";
import { CollectionPage } from "./CollectionPage";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export function SubmissionsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  const isAdmin = roleName === "ADMIN" || roleName === "SUPER_ADMIN" || roleName === "TEAM_LEAD";

  // State for Employee Modal
  const [showModal, setShowModal] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [formData, setFormData] = useState({
    task_id: "",
    title: "",
    description: "",
    category: "DEVELOPMENT",
    duration: "",
    github_pr_link: "",
    deployment_link: "",
    links: [{ label: "", url: "" }],
    images: [] as File[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<{ 
    isOpen: boolean; 
    submissionId: string | null; 
    text: string; 
    points: string[];
    images: File[];
  }>({
    isOpen: false,
    submissionId: null,
    text: "",
    points: [""],
    images: []
  });

  const submissions = useQuery({ 
    queryKey: ["submissions"], 
    queryFn: fetchSubmissions 
  });

  const tasks = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    enabled: !isAdmin
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: isAdmin
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      updateSubmissionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    }
  });

  const submitMutation = useMutation({
    mutationFn: createSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      setShowModal(false);
      setFormData({
        task_id: "",
        title: "",
        description: "",
        category: "DEVELOPMENT",
        duration: "",
        deployment_link: "",
        github_pr_link: "",
        links: [{ label: "", url: "" }],
        images: []
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    }
  });

  const handleEdit = (submission: any) => {
    setShowLinks(submission.links && submission.links.length > 0);
    setFormData({
      task_id: submission.task_id || "",
      title: submission.title,
      description: submission.description,
      category: submission.category,
      duration: submission.duration || "1 day",
      deployment_link: submission.deployment_link || "",
      github_pr_link: submission.github_pr_link || "",
      links: submission.links || [{ label: "", url: "" }],
      images: []
    });
    setEditingId(submission.id);
    setShowModal(true);
  };


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newFiles]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };
  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this submission?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.task_id || payload.task_id === "CUSTOM") {
      payload.task_id = null as any;
    }

    if (editingId) {
      updateSubmission(editingId, payload).then(() => {
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        setEditingId(null);
      });
    } else {
      const fd = new FormData();
      fd.append("title", payload.title);
      fd.append("description", payload.description);
      fd.append("category", payload.category);
      if (payload.task_id) fd.append("task_id", payload.task_id);
      if (payload.duration) fd.append("duration", payload.duration);
      if (payload.github_pr_link) fd.append("github_pr_link", payload.github_pr_link);
      if (payload.deployment_link) fd.append("deployment_link", payload.deployment_link);
      fd.append("links", JSON.stringify(payload.links.filter((l: any) => l.label && l.url)));
      
      payload.images.forEach((file: File) => {
        fd.append("files", file);
      });

      submitMutation.mutate(fd);
    }
    setShowModal(false);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackModal.submissionId) {
      const combinedText = feedbackModal.points.filter(p => p.trim()).join("\n");
      addSubmissionFeedback(feedbackModal.submissionId, combinedText, feedbackModal.images).then(() => {
        queryClient.invalidateQueries({ queryKey: ["submissions"] });
        setFeedbackModal({ isOpen: false, submissionId: null, text: "", points: [""], images: [] });
      });
    }
  };

  const items = submissions.data?.items ?? [];
  const approvedCount = items.filter((s: any) => s.status === 'APPROVED').length;
  const pendingCount = items.filter((s: any) => s.status === 'SUBMITTED' || s.status === 'PENDING').length;
  const rejectedCount = items.filter((s: any) => s.status === 'REJECTED').length;

  useEffect(() => {
    // Clear submission notifications when viewing submissions
    import("@/features/dashboard/api").then(api => {
      if (isAdmin) {
        api.markNotificationsAsReadByType("SUBMISSION_RECEIVED");
      } else {
        api.markNotificationsAsReadByType("SUBMISSION_UPDATED");
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [isAdmin, queryClient]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "SUBMITTED": return <Clock className="h-5 w-5 text-blue-500" />;
      case "REJECTED": return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-slate-400" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button 
            className="gap-2 px-6 py-3 shadow-lg shadow-primary-100"
            onClick={() => {
              setShowLinks(false);
                setFormData({
                task_id: "",
                title: "",
                description: "",
                category: "DEVELOPMENT",
                duration: "",
                github_pr_link: "",
                deployment_link: "",
                links: [{ label: "", url: "" }],
                images: []
              });
              setShowModal(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Add Submission
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-4 lg:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Inbox size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Submissions</p>
                <h4 className="text-2xl font-bold text-slate-900">{items.length}</h4>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Review</p>
                <h4 className="text-2xl font-bold text-slate-900">{pendingCount}</h4>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Approved Work</p>
                <h4 className="text-2xl font-bold text-slate-900">{approvedCount}</h4>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <XCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Rejected Work</p>
                <h4 className="text-2xl font-bold text-slate-900">{rejectedCount}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-100">
              <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                <Inbox size={40} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No submissions found</h3>
              <p className="text-sm text-slate-500 max-w-xs text-center mt-1">You haven't submitted any tasks yet. Click 'Add Submission' to get started.</p>
            </div>
          ) : (
            items.map((submission: any) => (
              <div key={submission.id} className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-sm transition-all hover:shadow-md ${
                submission.status === 'APPROVED' 
                  ? 'bg-emerald-50/50 border-emerald-400 hover:border-emerald-500' 
                  : submission.status === 'REJECTED'
                  ? 'bg-red-50/50 border-red-400 hover:border-red-500'
                  : 'bg-white border-slate-100 hover:border-primary-100'
              }`}>
                {/* Header: Name & Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Portrait Circle */}
                    <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary-100 text-[14px] font-bold text-primary-700">
                          {user?.full_name?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{user?.full_name || "User"}</h3>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        {submission.category}
                      </p>
                    </div>
                  </div>
                  <div className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border transform -translate-y-1 ${
                    submission.status === 'APPROVED' 
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_0_0_#059669]' 
                      : submission.status === 'REJECTED' 
                      ? 'bg-red-500 text-white border-red-600 shadow-[0_4px_0_0_#dc2626]' 
                      : 'bg-blue-500 text-white border-blue-600 shadow-[0_4px_0_0_#2563eb]'
                  }`}>
                    {submission.status}
                  </div>
                </div>

                {/* Compact Task & Description */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-700">Task:</span>
                    <span className="text-sm font-medium text-slate-600 truncate">{submission.title}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-700">Description:</span>
                    <p className="text-sm font-medium text-slate-600 line-clamp-1">"{submission.description}"</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-700">Duration:</span>
                    <span className="text-sm font-bold text-primary-600">{submission.duration || 'N/A'}</span>
                  </div>
                </div>

                {/* Links */}
                {(submission.github_pr_link || submission.deployment_link || (submission.links && submission.links.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-4 mb-4 pt-2 border-t border-slate-50">
                    {submission.github_pr_link && (
                      <a href={submission.github_pr_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">
                        <Github size={14} /> GitHub PR
                      </a>
                    )}
                    {submission.deployment_link && (
                      <a href={submission.deployment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors">
                        <ExternalLink size={14} /> Live Preview
                      </a>
                    )}
                    {submission.links?.filter((l: any) => l.label && l.url).map((link: any, i: number) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary-600 transition-colors">
                        <ExternalLink size={14} /> {link.label}
                      </a>
                    ))}
                  </div>
                )}

                {/* Attached Images (Submission) */}
                {submission.files?.filter((f: any) => !f.is_feedback).length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Attached Screenshots</p>
                    <div className="flex flex-wrap gap-3">
                      {submission.files.filter((f: any) => !f.is_feedback).map((file: any, index: number) => (
                        <a 
                          key={file.id} 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm"
                        >
                          <ImageIcon size={14} /> Image {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}



                {/* Feedback Section */}
                {submission.feedback && (
                  <div className="mb-4 rounded-xl bg-amber-50/50 p-3 border border-amber-100/50">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-black uppercase tracking-wider text-amber-600">
                      <MessageSquare size={12} /> Admin Feedback
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed mb-2">"{submission.feedback}"</p>
                    
                    {/* Feedback Images */}
                    {submission.files?.filter((f: any) => f.is_feedback).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {submission.files.filter((f: any) => f.is_feedback).map((file: any, index: number) => (
                          <a 
                            key={file.id} 
                            href={file.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-all"
                          >
                            <ImageIcon size={12} /> Screenshot {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Dates & Actions */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider text-slate-400">Submitted:</span>
                    <span className="text-sm font-bold text-slate-800">
                      {new Date(submission.created_at).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(submission)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-primary-600 hover:bg-primary-50 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(submission.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Submission Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-[32px] bg-white p-8 shadow-2xl">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Submit Your Work</h2>
                  <p className="text-sm text-slate-500">Submit your work for review and approval</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Task (Optional)</label>
                    <select 
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={formData.task_id}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedTask = tasks.data?.items?.find((t: any) => t.id === selectedId);
                        setFormData({ 
                          ...formData, 
                          task_id: selectedId,
                          title: selectedTask ? selectedTask.title : (selectedId === "CUSTOM" ? "" : formData.title)
                        });
                      }}
                    >
                      <option value="">Select an existing task</option>
                      <option value="CUSTOM">Type custom task</option>
                      {tasks.data?.items?.map((task: any) => (
                        <option key={task.id} value={task.id}>{task.title}</option>
                      ))}
                    </select>
                    {formData.task_id === "CUSTOM" && (
                      <input 
                        type="text"
                        placeholder="Enter custom task name..."
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Detailed Description</label>
                    <textarea 
                      placeholder="What have you achieved in this submission?"
                      className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</label>
                    <select 
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={formData.category === "DEVELOPMENT" || formData.category === "DESIGN" || formData.category === "QA" || formData.category === "DOCS" || formData.category === "BUG_FIX" ? formData.category : "OTHER"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, category: val === "OTHER" ? "" : val });
                      }}
                    >
                      <option value="DEVELOPMENT">Development</option>
                      <option value="DESIGN">Design</option>
                      <option value="QA">QA / Testing</option>
                      <option value="DOCS">Documentation</option>
                      <option value="BUG_FIX">Bug Fix</option>
                      <option value="OTHER">Add custom category...</option>
                    </select>
                    {(formData.category !== "DEVELOPMENT" && formData.category !== "DESIGN" && formData.category !== "QA" && formData.category !== "DOCS" && formData.category !== "BUG_FIX") && (
                      <input 
                        type="text"
                        placeholder="Type custom category..."
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Duration (e.g., 2 days)</label>
                    <input 
                      type="text"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-primary-500"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700">GitHub PR Link</label>
                      <button 
                        type="button"
                        onClick={() => setShowLinks(!showLinks)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all"
                      >
                        <Plus size={12} /> Add More Links
                      </button>
                    </div>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="url"
                        placeholder="https://github.com/..."
                        className="w-full rounded-xl border border-slate-200 p-3 pl-10 text-sm focus:border-primary-500"
                        value={formData.github_pr_link}
                        onChange={(e) => setFormData({ ...formData, github_pr_link: e.target.value })}
                      />
                    </div>
                  </div>

                  {showLinks && (
                    <div className="col-span-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Additional Resources</label>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, links: [...(formData.links || []), { label: "", url: "" }] })}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {(formData.links || []).map((link: any, index: number) => (
                          <div key={index} className="flex gap-3 group animate-in zoom-in-95 duration-200">
                            <input 
                              type="text"
                              placeholder="Label (e.g. Documentation)"
                              className="flex-1 rounded-xl border border-slate-200 p-2.5 text-sm focus:border-primary-500 bg-slate-50/50"
                              value={link.label}
                              onChange={(e) => {
                                const newLinks = [...formData.links];
                                newLinks[index].label = e.target.value;
                                setFormData({ ...formData, links: newLinks });
                              }}
                            />
                            <input 
                              type="url"
                              placeholder="https://..."
                              className="flex-[2] rounded-xl border border-slate-200 p-2.5 text-sm focus:border-primary-500 bg-slate-50/50"
                              value={link.url}
                              onChange={(e) => {
                                const newLinks = [...formData.links];
                                newLinks[index].url = e.target.value;
                                setFormData({ ...formData, links: newLinks });
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                const newLinks = formData.links.filter((_: any, i: number) => i !== index);
                                setFormData({ ...formData, links: newLinks });
                                if (newLinks.length === 0) setShowLinks(false);
                              }}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Upload Section */}
                <div className="col-span-2 space-y-4 pt-6 mt-6 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Screenshots / Proofs</label>
                  
                  <div className="grid grid-cols-4 gap-4">
                    {formData.images.map((file, index) => (
                      <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="preview" 
                          className="h-full w-full object-cover"
                        />
                        <button 
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    
                    {formData.images.length < 8 && (
                      <label className="flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-primary-500">
                          <Upload size={20} />
                          <span className="text-[10px] font-bold uppercase">Upload</span>
                        </div>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">Upload up to 8 images (Max 5MB each)</p>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <Button 
                  type="submit"
                  className="flex-1 bg-primary-600 py-4 text-white hover:bg-primary-700 disabled:opacity-50"
                  disabled={submitMutation.isPending || !formData.title || !formData.description}
                >
                  {submitMutation.isPending ? "Submitting..." : (
                    <div className="flex items-center justify-center gap-2">
                      <Send size={18} />
                      {editingId ? "Update Submission" : "Submit for Review"}
                    </div>
                  )}
                </Button>
                <Button 
                  type="button"
                  className="flex-1 py-4 bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors"
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setFormData({ 
                      task_id: "",
                      title: "",
                      description: "",
                      category: "DEVELOPMENT",
                      duration: "",
                      github_pr_link: "", 
                      deployment_link: "", 
                      links: [{ label: "", url: "" }],
                      images: []
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Inbox size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Submissions</p>
              <h4 className="text-2xl font-bold text-slate-900">{items.length}</h4>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Review</p>
              <h4 className="text-2xl font-bold text-slate-900">{pendingCount}</h4>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Approved Work</p>
              <h4 className="text-2xl font-bold text-slate-900">{approvedCount}</h4>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Rejected Work</p>
              <h4 className="text-2xl font-bold text-slate-900">{rejectedCount}</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((submission: any) => {
          const submissionUser = usersQuery.data?.items?.find((u: any) => u.id === submission.submitted_by_id);
          const fullName = submissionUser?.full_name || "Employee";
          const designation = typeof submissionUser?.role === 'string' ? submissionUser.role : (submissionUser?.role?.name || "Unknown Role");

          return (
            <div key={submission.id} className={`group relative overflow-hidden rounded-[24px] border p-5 shadow-sm transition-all hover:shadow-md ${
              submission.status === 'APPROVED' 
                ? 'bg-emerald-50/50 border-emerald-400 hover:border-emerald-500' 
                : submission.status === 'REJECTED'
                ? 'bg-red-50/50 border-red-400 hover:border-red-500'
                : 'bg-white border-slate-100 hover:border-primary-100'
            }`}>
              {/* Header: Name & Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Portrait Circle */}
                  <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm">
                    {submissionUser?.avatar_url ? (
                      <img src={submissionUser.avatar_url} alt={fullName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary-100 text-[14px] font-bold text-primary-700">
                        {fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{fullName}</h3>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      {designation}
                    </p>
                  </div>
                </div>
                
                <div className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-wider border transform -translate-y-1 ${
                  submission.status === 'APPROVED' 
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_0_0_#059669]' 
                    : submission.status === 'REJECTED' 
                    ? 'bg-red-500 text-white border-red-600 shadow-[0_4px_0_0_#dc2626]' 
                    : 'bg-blue-500 text-white border-blue-600 shadow-[0_4px_0_0_#2563eb]'
                }`}>
                  {submission.status}
                </div>
              </div>

              {/* Compact Task & Description */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-700">Task:</span>
                  <span className="text-sm font-medium text-slate-600 truncate">{submission.title}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-700">Description:</span>
                  <p className="text-sm font-medium text-slate-600 line-clamp-1">"{submission.description}"</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-700">Duration:</span>
                  <span className="text-sm font-bold text-primary-600">{submission.duration || 'N/A'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-700">Category:</span>
                  <span className="text-sm font-medium text-slate-600">{submission.category}</span>
                </div>
              </div>

              {/* Links */}
              {(submission.github_pr_link || submission.deployment_link || (submission.links && submission.links.length > 0)) && (
                <div className="flex flex-wrap items-center gap-4 mb-4 pt-2 border-t border-slate-50">
                  {submission.github_pr_link && (
                    <a href={submission.github_pr_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">
                      <Github size={14} /> GitHub PR
                    </a>
                  )}
                  {submission.deployment_link && (
                    <a href={submission.deployment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors">
                      <ExternalLink size={14} /> Live Preview
                    </a>
                  )}
                  {submission.links?.filter((l: any) => l.label && l.url).map((link: any, i: number) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary-600 transition-colors">
                      <ExternalLink size={14} /> {link.label}
                    </a>
                  ))}
                </div>
              )}

              {/* Admin View: Attached Images (Submission) */}
              {submission.files?.filter((f: any) => !f.is_feedback).length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Attached Screenshots</p>
                  <div className="flex flex-wrap gap-3">
                    {submission.files.filter((f: any) => !f.is_feedback).map((file: any, index: number) => (
                      <a 
                        key={file.id} 
                        href={file.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm"
                      >
                        <ImageIcon size={14} /> Image {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}



              {/* Feedback Section */}
              {submission.feedback && (
                <div className="mb-4 rounded-xl bg-amber-50/50 p-3 border border-amber-100/50">
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] font-black uppercase tracking-wider text-amber-600">
                    <MessageSquare size={12} /> Feedback Given
                  </div>
                  <ul className="space-y-1 mb-2">
                    {submission.feedback.split("\n").filter((p: string) => p.trim()).map((point: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  {/* Feedback Images */}
                  {submission.files?.filter((f: any) => f.is_feedback).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {submission.files.filter((f: any) => f.is_feedback).map((file: any, index: number) => (
                        <a 
                          key={file.id} 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-all"
                        >
                          <ImageIcon size={12} /> Review Screenshot {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wider text-slate-400">Submitted On:</span>
                  <span className="text-sm font-bold text-slate-800">{new Date(submission.created_at).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
                
                <div className="flex gap-2">
                  {submission.status === 'SUBMITTED' && (
                    <>
                      <Button 
                        className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-lg shadow-emerald-100"
                        onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'APPROVED' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Check size={16} />
                      </Button>
                      <Button 
                        className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-100"
                        onClick={() => updateStatusMutation.mutate({ id: submission.id, status: 'REJECTED' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <X size={16} />
                      </Button>
                    </>
                  )}
                  <Button 
                    className="h-8 w-8 p-0 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-lg shadow-amber-100"
                    onClick={() => {
                      const existingPoints = submission.feedback 
                        ? submission.feedback.split("\n").filter((p: string) => p.trim()) 
                        : [""];
                      setFeedbackModal({ 
                        isOpen: true, 
                        submissionId: submission.id, 
                        text: submission.feedback || "",
                        points: existingPoints.length > 0 ? existingPoints : [""],
                        images: []
                      });
                    }}
                  >
                    <MessageSquare size={16} />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback Modal */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="text-amber-500" />
                Provide Feedback
              </h2>
              <button
                type="button"
                onClick={() => setFeedbackModal(prev => ({ 
                  ...prev, 
                  points: [...prev.points, ""] 
                }))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 text-[11px] font-bold uppercase tracking-wider transition-all"
              >
                <Plus size={13} /> Add Point
              </button>
            </div>
            <form onSubmit={handleFeedbackSubmit}>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar mb-6">
                {feedbackModal.points.map((point, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <input
                      type="text"
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                      placeholder={`Point ${index + 1}...`}
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...feedbackModal.points];
                        newPoints[index] = e.target.value;
                        setFeedbackModal({ ...feedbackModal, points: newPoints });
                      }}
                      autoFocus={index === feedbackModal.points.length - 1}
                    />
                    {feedbackModal.points.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPoints = feedbackModal.points.filter((_, i) => i !== index);
                          setFeedbackModal({ ...feedbackModal, points: newPoints });
                        }}
                        className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Feedback Image Upload */}
              <div className="mb-6">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">Attach Screenshots (Optional)</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {feedbackModal.images.map((file, index) => (
                    <div key={index} className="relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden group">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = feedbackModal.images.filter((_, i) => i !== index);
                          setFeedbackModal({ ...feedbackModal, images: newImages });
                        }}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all text-slate-400 hover:text-amber-500">
                    <Camera size={20} />
                    <span className="text-[10px] font-bold mt-1">ADD</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          setFeedbackModal({ ...feedbackModal, images: [...feedbackModal.images, ...files] });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl"
                  disabled={feedbackModal.points.every(p => !p.trim())}
                >
                  Save Feedback
                </Button>
                <Button 
                  type="button"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl border-none"
                  onClick={() => setFeedbackModal({ isOpen: false, submissionId: null, text: "", points: [""], images: [] })}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
