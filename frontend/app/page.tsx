"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  StickyNote,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  User,
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

type Priority = "high" | "medium" | "low";

interface Task {
  id: string;
  text: string;
  priority: Priority;
  completed: boolean;
}

interface ApiTask {
  _id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "done" | "archived";
}

const authHeaders = (accessToken: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${accessToken}`,
});

const mapApiPriorityToUi = (priority: ApiTask["priority"]): Priority => {
  if (priority === "critical") return "high";
  if (priority === "high" || priority === "medium" || priority === "low") return priority;
  return "medium";
};

const mapApiTaskToUi = (apiTask: ApiTask): Task => ({
  id: apiTask._id,
  text: apiTask.title,
  priority: mapApiPriorityToUi(apiTask.priority),
  completed: apiTask.status === "done" || apiTask.status === "archived",
});

const SETTINGS_STORAGE_KEY = "devpulse-settings";
const AUTH_STORAGE_KEY = "devpulse-auth";
const NOTES_STORAGE_PREFIX = "devpulse-notes-";
const PANEL_CLASS =
  "dp-panel bg-zinc-900/50 rounded-xl border border-cyan-500/20 p-6 backdrop-blur-sm";

type AppSettings = {
  notifications: boolean;
  darkMode: boolean;
  soundEffects: boolean;
  pomodoroLength: number;
  breakLength: number;
};

const defaultSettings: AppSettings = {
  notifications: true,
  darkMode: true,
  soundEffects: false,
  pomodoroLength: 25,
  breakLength: 5,
};

const loadSettings = (): AppSettings => {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
};

type StoredAuth = {
  user: { name: string; email: string };
  accessToken: string;
};

const isTokenValid = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const loadAuth = (): StoredAuth | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.accessToken || !parsed.user?.email) return null;
    if (!isTokenValid(parsed.accessToken)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveAuth = (auth: StoredAuth) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch (err) {
    console.error("saveAuth:", err);
  }
};

const clearAuth = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("clearAuth:", err);
  }
};

const playTimerSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.error("playTimerSound:", err);
  }
};

const showTimerNotification = (mode: "work" | "break") => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const title = mode === "work" ? "Focus session complete" : "Break is over";
  const body =
    mode === "work" ? "Time for a break." : "Ready for another focus session.";
  new Notification(title, { body });
};

type SettingsContextValue = {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const useAppSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within SettingsContext");
  }
  return ctx;
};

const fetchTasksFromApi = async (accessToken: string): Promise<Task[]> => {
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: authHeaders(accessToken),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || "Failed to fetch tasks");
  }
  const apiTasks: ApiTask[] = json.data?.tasks ?? [];
  return apiTasks.map(mapApiTaskToUi);
};

const computeTaskStats = (tasks: Task[]) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const open = total - completed;
  const highPriority = tasks.filter(
    (t) => t.priority === "high" && !t.completed
  ).length;
  const completionRate =
    total > 0 ? `${Math.round((completed / total) * 100)}%` : "0%";

  return { total, completed, open, highPriority, completionRate };
};

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "tasks", icon: CheckSquare, label: "Tasks" },
  { id: "notes", icon: StickyNote, label: "Quick Notes" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  high: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/50" },
  medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
  low: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/50" },
};

function LoginPage({
  onLogin,
  onSwitchToRegister,
}: {
  onLogin: (user: { name: string; email: string }, accessToken: string) => void;
  onSwitchToRegister: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Login failed");
        return;
      }

      onLogin(
        { name: json.data.user.name, email: json.data.user.email },
        json.data.accessToken
      );
    } catch (err) {
      console.error("login:", err);
      setError("Unable to connect to the server");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-zinc-500 mt-2">Sign in to your DevPulse account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/50 rounded-xl border border-cyan-500/20 p-6 backdrop-blur-sm space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-zinc-400">
              <input type="checkbox" className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-cyan-500/20" />
              Remember me
            </label>
            <button type="button" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium py-3 rounded-lg hover:opacity-90 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Sign In
          </button>

          <p className="text-center text-zinc-500 text-sm">
            {"Don't have an account? "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Create one
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function RegisterPage({
  onRegister,
  onSwitchToLogin,
}: {
  onRegister: (user: { name: string; email: string }, accessToken: string) => void;
  onSwitchToLogin: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Registration failed");
        return;
      }

      onRegister(
        { name: json.data.user.name, email: json.data.user.email },
        json.data.accessToken
      );
    } catch (err) {
      console.error("register:", err);
      setError("Unable to connect to the server");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-zinc-500 mt-2">Join DevPulse and boost your productivity</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/50 rounded-xl border border-cyan-500/20 p-6 backdrop-blur-sm space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium py-3 rounded-lg hover:opacity-90 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Create Account
          </button>

          <p className="text-center text-zinc-500 text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function Sidebar({
  activeTab,
  setActiveTab,
  userName,
  userEmail,
  onLogout,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
}) {
  return (
    <aside className="w-64 bg-zinc-950/80 border-r border-cyan-500/20 flex flex-col backdrop-blur-sm">
      <div className="p-6 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">DevPulse</h1>
            <p className="text-xs text-cyan-400/60">Developer Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 outline-none ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-cyan-500/20">
        <button
          onClick={() => setActiveTab("account")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all outline-none ${
            activeTab === "account"
              ? "bg-zinc-800 border border-cyan-500/40"
              : "bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-zinc-500 truncate">@{userEmail.split("@")[0]}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
        <button
          onClick={onLogout}
          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all outline-none"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function TaskList({
  accessToken,
  onTasksChange,
}: {
  accessToken: string;
  onTasksChange?: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        headers: authHeaders(accessToken),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to fetch tasks");
      }

      const apiTasks: ApiTask[] = json.data?.tasks ?? [];
      setTasks(apiTasks.map(mapApiTaskToUi));
      onTasksChange?.();
    } catch (err) {
      console.error("fetchTasks:", err);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    void fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch on token change only
  }, [accessToken]);

  const addTask = async () => {
    if (!newTask.trim() || !accessToken) return;

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          title: newTask.trim(),
          priority: newPriority,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to create task");
      }

      setTasks((prev) => [...prev, mapApiTaskToUi(json.data as ApiTask)]);
      setNewTask("");
      onTasksChange?.();
    } catch (err) {
      console.error("addTask:", err);
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || !accessToken) return;

    const nextStatus = task.completed ? "todo" : "done";

    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to update task");
      }

      const updated = mapApiTaskToUi(json.data as ApiTask);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      onTasksChange?.();
    } catch (err) {
      console.error("toggleTask:", err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => t.id !== id));
      onTasksChange?.();
    } catch (err) {
      console.error("deleteTask:", err);
    }
  };

  return (
    <div className={PANEL_CLASS}>
      <h2 className="dp-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-cyan-400" />
        Task List
      </h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a new task..."
          className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as Priority)}
          className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50 transition-all"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          onClick={addTask}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/10"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
        {tasks.length === 0 && (
          <p className="dp-muted text-zinc-500 text-sm text-center py-6">
            No tasks yet. Add one above.
          </p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              task.completed
                ? "bg-zinc-800/30 border-zinc-700/50"
                : "bg-zinc-800/50 border-zinc-700 hover:border-cyan-500/30"
            }`}
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                task.completed
                  ? "bg-cyan-500 border-cyan-500"
                  : "border-zinc-600 hover:border-cyan-500"
              }`}
            >
              {task.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className={`flex-1 ${task.completed ? "text-zinc-500 line-through" : "text-white"}`}
            >
              {task.text}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium border ${priorityColors[task.priority].bg} ${priorityColors[task.priority].text} ${priorityColors[task.priority].border}`}
            >
              {task.priority}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-zinc-500 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scratchpad({ storageKey }: { storageKey: string }) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${NOTES_STORAGE_PREFIX}${storageKey}`);
      setContent(saved ?? "");
    } catch (err) {
      console.error("loadNotes:", err);
    } finally {
      setLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!loaded || !storageKey) return;
    try {
      localStorage.setItem(`${NOTES_STORAGE_PREFIX}${storageKey}`, content);
    } catch (err) {
      console.error("saveNotes:", err);
    }
  }, [content, loaded, storageKey]);

  return (
    <div className={`${PANEL_CLASS} h-full flex flex-col`}>
      <h2 className="dp-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-purple-400" />
        Daily Scratchpad
      </h2>
      <div className="flex-1 relative">
        <div className="absolute inset-0 bg-zinc-950/80 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs text-zinc-500 font-mono">notes.md</span>
          </div>
          <div className="flex h-[calc(100%-36px)]">
            <div className="w-12 bg-zinc-900/30 border-r border-zinc-800 py-3 text-right pr-3 select-none">
              {content.split("\n").map((_, i) => (
                <div key={i} className="text-xs text-zinc-600 font-mono leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your notes..."
              className="flex-1 bg-transparent p-3 text-zinc-300 font-mono text-sm leading-6 resize-none focus:outline-none placeholder:text-zinc-600"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PomodoroTimer() {
  const { settings } = useAppSettings();
  const workSeconds = settings.pomodoroLength * 60;
  const breakSeconds = settings.breakLength * 60;

  const [timeLeft, setTimeLeft] = useState(workSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (mode === "work") {
        if (settings.notifications) showTimerNotification("work");
        if (settings.soundEffects) playTimerSound();
        setMode("break");
        setTimeLeft(breakSeconds);
      } else {
        if (settings.notifications) showTimerNotification("break");
        if (settings.soundEffects) playTimerSound();
        setMode("work");
        setTimeLeft(workSeconds);
      }
    }
    return () => clearInterval(interval);
  }, [
    isRunning,
    timeLeft,
    mode,
    settings.notifications,
    settings.soundEffects,
    workSeconds,
    breakSeconds,
  ]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? workSeconds : breakSeconds);
  };

  const totalSeconds = mode === "work" ? workSeconds : breakSeconds;
  const progress =
    totalSeconds > 0 ? (totalSeconds - timeLeft) / totalSeconds : 0;

  return (
    <div className={PANEL_CLASS}>
      <h2 className="dp-heading text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <div
          className={`w-5 h-5 rounded-full ${mode === "work" ? "bg-cyan-500" : "bg-emerald-500"} animate-pulse`}
        />
        Pomodoro Timer
      </h2>

      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-zinc-800"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${progress * 283} 283`}
              strokeLinecap="round"
              className={mode === "work" ? "text-cyan-500" : "text-emerald-500"}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-white tracking-wider">
              {formatTime(timeLeft)}
            </span>
            <span
              className={`text-sm font-medium mt-1 ${mode === "work" ? "text-cyan-400" : "text-emerald-400"}`}
            >
              {mode === "work" ? "Focus Time" : "Break Time"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              isRunning
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30"
                : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30"
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? "Pause" : "Start"}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-600 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              setMode("work");
              setTimeLeft(workSeconds);
              setIsRunning(false);
            }}
            className={`px-3 py-1 rounded text-sm transition-all ${
              mode === "work"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {settings.pomodoroLength} min
          </button>
          <button
            onClick={() => {
              setMode("break");
              setTimeLeft(breakSeconds);
              setIsRunning(false);
            }}
            className={`px-3 py-1 rounded text-sm transition-all ${
              mode === "break"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {settings.breakLength} min
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`${PANEL_CLASS} p-4`}>
      <p className="dp-muted text-zinc-500 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TasksPage({ accessToken }: { accessToken: string }) {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 outline-none">
          <CheckSquare className="w-8 h-8 text-cyan-400" />
          Task Management
        </h1>
        <p className="text-zinc-500 mt-1">Organize and track your development tasks</p>
      </header>
      <TaskList accessToken={accessToken} />
    </div>
  );
}

function NotesPage({ userEmail }: { userEmail: string }) {
  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-180px)]">
      <header className="mb-8">
        <h1 className="dp-heading text-3xl font-bold text-white flex items-center gap-3 outline-none">
          <StickyNote className="w-8 h-8 text-purple-400" />
          Quick Notes
        </h1>
        <p className="dp-muted text-zinc-500 mt-1">
          Your personal scratchpad — saved locally in this browser
        </p>
      </header>
      <div className="h-[calc(100%-100px)]">
        <Scratchpad storageKey={userEmail || "guest"} />
      </div>
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings } = useAppSettings();

  const handleNotificationsToggle = async () => {
    const next = !settings.notifications;
    if (next && typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          updateSettings({ notifications: false });
          return;
        }
      } catch (err) {
        console.error("notifications permission:", err);
        return;
      }
    }
    updateSettings({ notifications: next });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="dp-heading text-3xl font-bold text-white flex items-center gap-3 outline-none">
          <Settings className="w-8 h-8 text-zinc-400" />
          Settings
        </h1>
        <p className="dp-muted text-zinc-500 mt-1">Customize your DevPulse experience</p>
      </header>

      <div className="space-y-6">
        <div className={PANEL_CLASS}>
          <h3 className="dp-heading text-lg font-semibold text-white mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="dp-heading text-white font-medium">Notifications</p>
                <p className="dp-muted text-zinc-500 text-sm">
                  Browser alert when a Pomodoro session ends
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.notifications}
                onClick={handleNotificationsToggle}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.notifications ? "bg-cyan-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.notifications ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="dp-heading text-white font-medium">Dark Mode</p>
                <p className="dp-muted text-zinc-500 text-sm">Toggle light and dark theme</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.darkMode}
                onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.darkMode ? "bg-cyan-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.darkMode ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="dp-heading text-white font-medium">Sound Effects</p>
                <p className="dp-muted text-zinc-500 text-sm">Play a chime when the timer finishes</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.soundEffects}
                onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
                className={`w-12 h-6 rounded-full transition-all ${
                  settings.soundEffects ? "bg-cyan-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.soundEffects ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className={PANEL_CLASS}>
          <h3 className="dp-heading text-lg font-semibold text-white mb-4">Timer Settings</h3>
          <p className="dp-muted text-zinc-500 text-sm mb-4">
            Changes apply to the Pomodoro timer on Dashboard immediately.
          </p>
          <div className="space-y-4">
            <div>
              <label className="dp-heading text-white font-medium block mb-2">
                Focus Duration: {settings.pomodoroLength} minutes
              </label>
              <input
                type="range"
                min="15"
                max="60"
                value={settings.pomodoroLength}
                onChange={(e) =>
                  updateSettings({ pomodoroLength: Number(e.target.value) })
                }
                className="w-full accent-cyan-500"
              />
            </div>
            <div>
              <label className="dp-heading text-white font-medium block mb-2">
                Break Duration: {settings.breakLength} minutes
              </label>
              <input
                type="range"
                min="3"
                max="15"
                value={settings.breakLength}
                onChange={(e) =>
                  updateSettings({ breakLength: Number(e.target.value) })
                }
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage({
  accessToken,
  userName,
  userEmail,
}: {
  accessToken: string;
  userName: string;
  userEmail: string;
}) {
  const [taskStats, setTaskStats] = useState({
    total: 0,
    completed: 0,
    open: 0,
    highPriority: 0,
    completionRate: "0%",
  });

  const refreshStats = useCallback(async () => {
    if (!accessToken) return;
    try {
      const tasks = await fetchTasksFromApi(accessToken);
      setTaskStats(computeTaskStats(tasks));
    } catch (err) {
      console.error("dashboard stats:", err);
    }
  }, [accessToken]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return (
    <>
      <header className="mb-8">
        <h1 className="dp-heading text-3xl font-bold text-white outline-none">
          Welcome back, <span className="text-cyan-400">{userName || "Developer"}</span>
        </h1>
        <p className="dp-muted text-zinc-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Tasks Completed"
          value={String(taskStats.completed)}
          color="text-cyan-400"
        />
        <StatsCard
          label="Open Tasks"
          value={String(taskStats.open)}
          color="text-purple-400"
        />
        <StatsCard
          label="High Priority"
          value={String(taskStats.highPriority)}
          color="text-emerald-400"
        />
        <StatsCard
          label="Completion Rate"
          value={taskStats.completionRate}
          color="text-yellow-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <TaskList accessToken={accessToken} onTasksChange={refreshStats} />
          <PomodoroTimer />
        </div>
        <div className="h-[calc(100vh-280px)]">
          <Scratchpad storageKey={userEmail || "guest"} />
        </div>
      </div>
    </>
  );
}

function AccountPage({
  userName,
  userEmail,
  onLogout,
}: {
  userName: string;
  userEmail: string;
  onLogout: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 outline-none">
          <User className="w-8 h-8 text-purple-400" />
          Account
        </h1>
        <p className="text-zinc-500 mt-1">Manage your profile and account settings</p>
      </header>

      <div className="space-y-6">
        <div className={PANEL_CLASS}>
          <h3 className="dp-heading text-lg font-semibold text-white mb-6">Profile</h3>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-xl">{userName}</p>
              <p className="text-zinc-500">{userEmail}</p>
              <p className="text-emerald-400 text-sm mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function DevPulse() {
  const [authHydrated, setAuthHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState({ name: "", email: "" });
  const [accessToken, setAccessToken] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    setSettings(loadSettings());
    const stored = loadAuth();
    if (stored) {
      setUser(stored.user);
      setAccessToken(stored.accessToken);
      setIsAuthenticated(true);
    }
    setAuthHydrated(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error("saveSettings:", err);
    }
  }, [settings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
    document.documentElement.setAttribute(
      "data-theme",
      settings.darkMode ? "dark" : "light"
    );
  }, [settings.darkMode]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAuthSuccess = (
    authUser: { name: string; email: string },
    token: string
  ) => {
    setUser(authUser);
    setAccessToken(token);
    setIsAuthenticated(true);
    saveAuth({ user: authUser, accessToken: token });
  };

  const handleLogout = () => {
    clearAuth();
    setIsAuthenticated(false);
    setUser({ name: "", email: "" });
    setAccessToken("");
    setActiveTab("dashboard");
    setAuthMode("login");
  };

  if (!authHydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authMode === "login") {
      return (
        <LoginPage
          onLogin={handleAuthSuccess}
          onSwitchToRegister={() => setAuthMode("register")}
        />
      );
    }
    return (
      <RegisterPage
        onRegister={handleAuthSuccess}
        onSwitchToLogin={() => setAuthMode("login")}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardPage
            accessToken={accessToken}
            userName={user.name}
            userEmail={user.email}
          />
        );
      case "tasks":
        return <TasksPage accessToken={accessToken} />;
      case "notes":
        return <NotesPage userEmail={user.email} />;
      case "settings":
        return <SettingsPage />;
      case "account":
        return <AccountPage userName={user.name} userEmail={user.email} onLogout={handleLogout} />;
      default:
        return (
          <DashboardPage
            accessToken={accessToken}
            userName={user.name}
            userEmail={user.email}
          />
        );
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
    <div
      className={`dp-shell min-h-screen flex ${
        settings.darkMode ? "bg-zinc-950" : "bg-zinc-100"
      }`}
    >
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent pointer-events-none" />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userName={user.name}
        userEmail={user.email}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-8 overflow-auto relative">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
    </SettingsContext.Provider>
  );
}
