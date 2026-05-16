import { useState } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, Shield, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { QUICK_ACCESS_ACCOUNTS, QUICK_ACCESS_PASSWORD, login } from "@/features/auth/api";

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "EMPLOYEE" | null>(null);
  const form = useForm<{ email: string; password: string }>({
    defaultValues: {
      email: "",
      password: QUICK_ACCESS_PASSWORD,
    },
  });

  const roleAccounts = selectedRole ? QUICK_ACCESS_ACCOUNTS.filter((account) => account.role === selectedRole) : [];

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      setErrorMessage(null);
      setIsSubmitting(true);
      await login(values.email, values.password);
      window.location.href = "/";
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.message ||
        "Sign in failed. Check credentials.";
      setErrorMessage(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">WorkFlow <span className="text-blue-600">Pro</span></h1>
            <p className="text-slate-500 mt-3 text-lg font-medium">Enterprise Workforce Management Platform</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Admin Card */}
            <button 
              onClick={() => {
                setSelectedRole("ADMIN");
                form.setValue("email", QUICK_ACCESS_ACCOUNTS.find(a => a.role === "ADMIN")?.email || "");
              }}
              className="group relative bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <Shield size={120} className="text-blue-600" />
              </div>
              <div className="h-16 w-16 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-white mb-8 shadow-lg shadow-blue-200">
                <Shield size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Admin Portal</h2>
              <p className="text-slate-500 leading-relaxed mb-8">Access the management dashboard, oversee tasks, and manage team members.</p>
              <div className="flex items-center gap-2 font-bold text-blue-600 group-hover:gap-4 transition-all">
                Enter Command Center <ChevronDown size={20} className="-rotate-90" />
              </div>
            </button>

            {/* Employee Card */}
            <button 
              onClick={() => {
                setSelectedRole("EMPLOYEE");
                form.setValue("email", QUICK_ACCESS_ACCOUNTS.find(a => a.role === "EMPLOYEE")?.email || "");
              }}
              className="group relative bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl shadow-emerald-500/5 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                <User size={120} className="text-emerald-600" />
              </div>
              <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-500 flex items-center justify-center text-white mb-8 shadow-lg shadow-emerald-200">
                <User size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Employee Space</h2>
              <p className="text-slate-500 leading-relaxed mb-8">View your assigned tasks, submit work, and collaborate with your team.</p>
              <div className="flex items-center gap-2 font-bold text-emerald-600 group-hover:gap-4 transition-all">
                Access Workspace <ChevronDown size={20} className="-rotate-90" />
              </div>
            </button>
          </div>
          
          <div className="mt-12 text-center text-slate-400 text-sm font-medium">
            Protected by WorkFlow Enterprise Security System
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] flex items-center justify-center p-6">
      <div className="w-full max-w-[520px] bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 relative overflow-hidden">
        {/* Back Button */}
        <button 
          onClick={() => setSelectedRole(null)}
          className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
        >
          <ChevronDown size={16} className="rotate-90" />
          Go Back
        </button>

        <div className="text-center mb-10">
          <div className={`mx-auto h-20 w-20 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-xl ${
            selectedRole === "ADMIN" ? "bg-blue-600 shadow-blue-200" : "bg-emerald-500 shadow-emerald-200"
          }`}>
            {selectedRole === "ADMIN" ? <Shield size={36} /> : <User size={36} />}
          </div>
          <h2 className="text-3xl font-bold text-slate-900">
            {selectedRole === "ADMIN" ? "Admin Login" : "Employee Login"}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">Please enter your credentials to continue</p>
        </div>

        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Select Profile</label>
            <div className="relative mt-2">
              <select
                className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                {...form.register("email")}
              >
                {roleAccounts.map((account) => (
                  <option key={account.id} value={account.email}>
                    {account.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Password</label>
              <button type="button" className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-600 hover:text-blue-500">
                Forgot?
              </button>
            </div>
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 py-4 text-base font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all placeholder:text-slate-300"
              placeholder="••••••••"
              {...form.register("password")}
            />
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 font-medium">
              {errorMessage}
            </div>
          )}

          <Button
            className={`w-full rounded-2xl py-4 text-lg font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
              selectedRole === "ADMIN" ? "bg-blue-600 shadow-blue-100 hover:bg-blue-500" : "bg-emerald-500 shadow-emerald-100 hover:bg-emerald-400"
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Authenticating..." : "Sign In Now"}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Don't have an account?{" "}
            <button type="button" className={`font-bold transition-colors ${
              selectedRole === "ADMIN" ? "text-blue-600 hover:text-blue-500" : "text-emerald-600 hover:text-emerald-500"
            }`}>
              Register Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
