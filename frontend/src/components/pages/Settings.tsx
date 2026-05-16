import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Cloud, 
  Camera, 
  Key, 
  LogOut, 
  ChevronRight,
  AtSign,
  Briefcase,
  PenTool,
  RotateCw,
  X
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { updateProfile } from "@/features/dashboard/api";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'notifications' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [cropBoxSize, setCropBoxSize] = useState(300);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    job_title: user?.job_title || "",
    signature: user?.signature || "",
    avatar_url: user?.avatar_url || ""
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const tabs = [
    { id: 'profile', label: 'Personal Profile', icon: User },
    { id: 'account', label: 'Mail Identity', icon: Mail },
    { id: 'security', label: 'Account Security', icon: Shield },
    { id: 'notifications', label: 'System Prefs', icon: Bell },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your professional identity and mail integration</p>
        </div>
        {isEditing ? (
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
              className="rounded-xl border-slate-200 px-6"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl px-8 shadow-lg shadow-primary-100"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        ) : (
          <Button 
            onClick={() => setIsEditing(true)}
            className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-8 shadow-sm transition-all"
          >
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <div className="col-span-3 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary-50 text-primary-700 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-primary-600' : 'text-slate-400'} />
              <span className="text-sm font-bold tracking-tight">{tab.label}</span>
              {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
          
          <div className="pt-8 px-5 border-t border-slate-100 mt-8">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 text-red-500 font-bold text-sm hover:translate-x-1 transition-transform"
            >
              <LogOut size={18} />
              Log Out Account
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-9">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10"
          >
            {activeTab === 'profile' && (
              <div className="space-y-10">
                {/* Avatar Section */}
                <div className="flex items-center gap-8">
                  <div className="relative group">
                    <div className="h-28 w-28 rounded-[2rem] bg-slate-100 border-4 border-white shadow-xl shadow-slate-200 overflow-hidden">
                      {formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <User size={48} />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <div className="absolute -bottom-2 -right-2 p-3 bg-primary-600 text-white rounded-2xl shadow-lg cursor-pointer hover:scale-110 transition-transform" onClick={() => fileInputRef.current?.click()}>
                        <Camera size={16} />
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          className="hidden" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
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
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{user?.full_name}</h3>
                    <p className="text-sm text-slate-500">{typeof user?.role === 'string' ? user.role : user?.role?.name} at WorkFlow Pro</p>
                    <div className="flex gap-2 mt-3">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider">Account Active</span>
                      <span className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-600 text-[10px] font-black uppercase tracking-wider">Internal Mail Enabled</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text"
                        disabled={!isEditing}
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all disabled:opacity-70"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Job Title</label>
                    <div className="relative group">
                      <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="text"
                        disabled={!isEditing}
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all disabled:opacity-70"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-8">
                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100/50 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm flex-shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Mail Profile Integration</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Your internal workspace mail identity is tied to your primary login. 
                      Below you can configure how you appear to colleagues in the Mail Center.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
                  <div className="relative group">
                    <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                      type="text"
                      disabled
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold outline-none opacity-60"
                      value={user?.email}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Signature</label>
                  <div className="relative group">
                    <PenTool size={16} className="absolute left-4 top-5 text-slate-300" />
                    <textarea 
                      disabled={!isEditing}
                      placeholder="Best regards, Krishna..."
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 h-32 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-100 focus:bg-white transition-all disabled:opacity-70 resize-none"
                      value={formData.signature}
                      onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 px-1">This signature will be appended to all internal emails you send.</p>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                      <Key size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Change Password</h4>
                      <p className="text-[11px] text-slate-500">Update your account access credentials</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl px-6 text-xs font-bold">Update</Button>
                </div>

                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                      <Cloud size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Cloud Sessions</h4>
                      <p className="text-[11px] text-slate-500">Manage active login sessions across devices</p>
                    </div>
                  </div>
                  <Button variant="outline" className="rounded-xl px-6 text-xs font-bold">View All</Button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="pt-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">System Notifications</h3>
                  <div className="space-y-4">
                    {[
                      { label: "Email Notifications", desc: "Get updates on internal mails", active: true },
                      { label: "Task Alerts", desc: "Never miss a submission deadline", active: true },
                      { label: "System Maintenance", desc: "Stay informed about platform updates", active: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.label}</h4>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-all ${item.active ? 'bg-primary-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${item.active ? 'right-1' : 'left-1'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {/* High-Fidelity Mobile-Style Crop Modal (Matched to Groups) */}
      <AnimatePresence>
        {cropImage && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black animate-in fade-in duration-300">
            {/* Header / Status Bar Style */}
            <div className="p-4 flex items-center justify-between text-white/40">
              <span className="text-xs font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 bg-white/20 rounded-full" />
                <div className="w-2 h-2 bg-white/20 rounded-full" />
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden p-8 bg-black/40 flex items-center justify-center">
              <motion.div 
                id="settings-crop-box"
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

                {/* Resizable Corner Handles */}
                <motion.div 
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0}
                  onDrag={(_, info) => {
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
            <div className="p-10 space-y-8 bg-black">
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
                      const cropBox = document.getElementById('settings-crop-box')?.getBoundingClientRect();
                      const imgRect = imgRef.current.getBoundingClientRect();
                      
                      if (cropBox && imgRect) {
                        const naturalWidth = imgRef.current.naturalWidth || imgRef.current.width;
                        const naturalHeight = imgRef.current.naturalHeight || imgRef.current.height;
                        
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, size, size);
                        
                        const canvasScale = size / cropBox.width;
                        const cropCenterX = cropBox.left + cropBox.width / 2;
                        const cropCenterY = cropBox.top + cropBox.height / 2;
                        const imgCenterX = imgRect.left + imgRect.width / 2;
                        const imgCenterY = imgRect.top + imgRect.height / 2;
                        const offsetX = (imgCenterX - cropCenterX) * canvasScale;
                        const offsetY = (imgCenterY - cropCenterY) * canvasScale;
                        
                        ctx.save();
                        ctx.translate(size / 2 + offsetX, size / 2 + offsetY);
                        ctx.rotate((rotation * Math.PI) / 180);
                        const displayedWidth = imgRef.current.offsetWidth || imgRect.width;
                        const baseScale = (displayedWidth / naturalWidth) * canvasScale;
                        ctx.scale(baseScale * zoom, baseScale * zoom);
                        ctx.drawImage(imgRef.current, -naturalWidth / 2, -naturalHeight / 2);
                        ctx.restore();
                        
                        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                        setFormData(prev => ({ ...prev, avatar_url: croppedBase64 }));
                        setCropImage(null);
                      }
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
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
    </div>
  );
}
