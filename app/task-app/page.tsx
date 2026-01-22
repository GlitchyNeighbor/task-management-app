"use client";
import { PinIcon, Check, TimerIcon, SignalMediumIcon, SignalHighIcon, SignalIcon, LogOut } from "lucide-react";
import { useMemo } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  date?: string;
};

const TaskManager = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus]  = useState<Task["status"]>("to-do");
  const [priority, setPriority] = useState<Task["priority"]>("low");
  const [date,setDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<"all" | "low" | "medium" | "high">("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "thisWeek" | "completed">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "to-do" | "in-progress" | "done">("all");
  const supabase  = useMemo(() => getSupabaseClient(), []);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [taskDoneList, setTaskDoneList] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  if (!supabase) {
    return <p>Service unavailable</p>;
  }

  const handleLogout = async () => {

    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks from Supabase
  const fetchTasks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "done");

      const { data: doneTasks, error: doneError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "done");

      if (error) console.error("Error fetching tasks:", error);
      if (doneError) console.error("Error fetching done tasks:", doneError);

      setTaskList((data as Task[]) || []);
      setTaskDoneList((doneTasks as Task[]) || []);
      setIsLoaded(true);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setIsLoaded(true);
    }
  };

  // Initialize user and fetch tasks
  useEffect(() => {
    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      fetchTasks(session.user.id);
    };
    initializeUser();
  }, [router]);

  // Add task to Supabase
  const setTasks = async () => {
    if (!user || !title || !description) return;

    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      title,
      description,
      status,
      priority,
      date: date || undefined,
    };

    // Update UI immediately
    setTaskList(prev => [...prev, newTask]);
    
    // Clear form
    setTitle("");
    setDescription("");
    setStatus("to-do");
    setPriority("low");
    setDate("");

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([{
          user_id: user.id,
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          date: newTask.date || null,
        }])
        .select()
        .single();

      if (error) throw error;

      const realId = data.id;

      // Replace temp task with real task
      setTaskList(prev => prev.map(t => 
        t.id === tempId ? { ...data } : t
      ));

      // Disable button for 3 seconds
      setRecentlyAddedIds(prev => new Set(prev).add(realId));
      setTimeout(() => {
        setRecentlyAddedIds(prev => {
          const next = new Set(prev);
          next.delete(realId);
          return next;
        });
      }, 3000);

    } catch (err) {
      // Rollback on error
      setTaskList(prev => prev.filter(t => t.id !== tempId));
      console.error("Failed to add task:", err);
    }
  }

    // Mark task as done
  const doneTask = async (id: string) => {
    if (!user) return;

    // Prevent action on recently added tasks
    if (recentlyAddedIds.has(id)) {
      return;
    }

    const taskToMove = taskList.find(t => t.id === id);
    if (!taskToMove) return;

    // Update UI immediately
    setTaskList(prev => prev.filter(t => t.id !== id));
    setTaskDoneList(prev => [...prev, { ...taskToMove, status: "done" }]);

    // Disable Remove button for 3 seconds
    setRecentlyAddedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setRecentlyAddedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 3000);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        // Rollback on error
        setTaskList(prev => [...prev, taskToMove]);
        setTaskDoneList(prev => prev.filter(t => t.id !== id));
        console.error("Error marking task as done:", error);
      }
    } catch (err) {
      // Rollback on error
      setTaskList(prev => [...prev, taskToMove]);
      setTaskDoneList(prev => prev.filter(t => t.id !== id));
      console.error("Failed to mark task as done:", err);
    }
  };

  // Remove task
  const removeTask = async (id: string) => {
    if (!user) return;

    const taskToRemove = taskDoneList.find(t => t.id === id);
    if (!taskToRemove) return;

    setTaskDoneList(prev => prev.filter(t => t.id !== id));

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing task:", error);
        return;
      }

      // Refresh tasks
      await fetchTasks(user.id);
    } catch (err) {
      console.error("Failed to remove task:", err);
    }
  };

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Filter tasks based on search query and filters
  const filteredTaskList = taskList.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    
    let matchesDate = true;
    if (filterDate === "today") {
      if (!t.date) matchesDate = false;
      else {
        const taskDate = new Date(t.date);
        const today = new Date();
        matchesDate = taskDate.toDateString() === today.toDateString();
      }
    } else if (filterDate === "thisWeek") {
      if (!t.date) matchesDate = false;
      else {
        const taskDate = new Date(t.date);
        const today = new Date();
        const currentDay = today.getDay();
        const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - distanceToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        matchesDate = taskDate >= monday && taskDate <= sunday;
      }
    } else if (filterDate === "completed") {
      matchesDate = false;
    }

    return matchesSearch && matchesPriority && matchesStatus && matchesDate;
  });

  const filteredTaskDoneList = taskDoneList.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    
    let matchesDate = true;
    if (filterDate === "today") {
      if (!t.date) matchesDate = false;
      else {
        const taskDate = new Date(t.date);
        const today = new Date();
        matchesDate = taskDate.toDateString() === today.toDateString();
      }
    } else if (filterDate === "thisWeek") {
      if (!t.date) matchesDate = false;
      else {
        const taskDate = new Date(t.date);
        const today = new Date();
        const currentDay = today.getDay();
        const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - distanceToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        matchesDate = taskDate >= monday && taskDate <= sunday;
      }
    }

    return matchesSearch && matchesPriority && matchesDate;
  });

  const tasksByDay: Record<string, Task[]> = days.reduce((acc, day, i) => {
    const weekdayIndex = (i + 1) % 7;
    acc[day] = filteredTaskList.filter((t) => t.date && new Date(t.date).getDay() === weekdayIndex);
    return acc;
  }, {} as Record<string, Task[]>);

  const unscheduledTasks = filteredTaskList.filter((t) => !t.date);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <p className="text-slate-400">Loading tasks...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-50 font-sans dark:bg-black p-2 md:p-4 lg:p-6">
      <main className="bg-gray-900 flex flex-col gap-4 w-full lg:w-3/12 xl:w-2/12 p-4 rounded-lg lg:max-h-screen lg:sticky top-0 lg:overflow-y-auto">
        <div className="flex flex-col">
          <label className="text-white mb-1">Title:</label>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

            />
            {title.length === 0 && (
              <small className="text-red-500 mt-1">Title is Required</small>
            )}
        </div>

        <div className="flex flex-col">
          <label className="text-white mb-1">Description: </label>
            <textarea
              placeholder="Description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"

            />
          <small className="text-red-500 mt-1" hidden={description.length > 0}>Description is required</small>
        </div>

        <div>
          <label className="flex flex-col text-white">Status:
            <label className="text-red-500 flex gap-2 items-center mt-1">
              <input
                type="radio"
                name="status"
                value="to-do"
                checked={status === "to-do"}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="form-radio h-4 w-4 text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500"
              />
              To Do
              <PinIcon size={16} />
            </label>

            <label className="text-yellow-300 flex gap-2 items-center mt-1">
              <input
                type="radio"
                name="status"
                value="in-progress"
                checked={status === "in-progress"}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="form-radio h-4 w-4 text-yellow-300 bg-gray-800 border-gray-600 focus:ring-yellow-300"
              />
              In Progress
              <TimerIcon size={16} />
            </label>
          </label>
        </div>

        <div>
          <label className="flex flex-col text-white">Priority:
            <label className="text-green-500 flex gap-2 items-center mt-1">
              <input
                type="radio"
                name="priority"
                value="low"
                checked={priority === "low"}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="form-radio h-4 w-4 text-green-500 bg-gray-800 border-gray-600 focus:ring-green-500"
              />
              Low
              <SignalMediumIcon size={16} />
            </label>

            <label className="text-yellow-300 flex gap-2 items-center mt-1">
              <input
                type="radio"
                name="priority"
                value="medium"
                checked={priority === "medium"}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="form-radio h-4 w-4 text-yellow-300 bg-gray-800 border-gray-600 focus:ring-yellow-300"
              />
              Medium
              <SignalHighIcon size={16} />
            </label>

            <label className="text-red-500 flex gap-2 items-center mt-1">
              <input
                type="radio"
                name="priority"
                value="high"
                checked={priority === "high"}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="form-radio h-4 w-4 text-red-500 bg-gray-800 border-gray-600 focus:ring-red-500"
              />
              High
              <SignalIcon size={16} />
            </label>
          </label>
        </div>

        <div className="flex flex-col">
          <label className="text-white mb-1">Date: </label>
            <input
              type="datetime-local"
              className="bg-gray-800 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
        </div>

        <div>
          <button className="bg-blue-700 hover:bg-blue-800 text-white w-full p-2 rounded-md transition duration-200" onClick={setTasks}>Add Task</button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition duration-200 w-full mt-auto"
        >
          <LogOut size={16} />
          Logout
        </button>

      </main>

      <section className="w-full lg:ml-4 flex flex-col mt-4 lg:mt-0">
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value as any)}
            className="w-full px-4 py-2 bg-gray-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="completed">Completed</option>
          </select>
          
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:col-span-2 lg:col-span-1 px-4 py-2 bg-gray-800 text-white placeholder-slate-400 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="w-full px-4 py-2 bg-gray-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-4 py-2 bg-gray-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="to-do">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1200px] xl:min-w-full">
            <table className="w-full table-fixed border-collapse text-white">
              <thead>
                <tr className="bg-gray-800">
                  {days.map((d) => (
                    <th key={d} className="border border-slate-700 px-4 py-2 text-left text-sm font-medium">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {days.map((d) => (
                    <td key={d} className="align-top border border-slate-700 p-2 bg-gray-900">
                      {tasksByDay[d].length === 0 && <div className="text-sm text-slate-500">—</div>}
                      <div className="space-y-2">
                        {tasksByDay[d].map((task) => (
                          <div key={task.id} className="p-3 bg-gray-800 rounded-lg shadow">
                            <div className="font-semibold text-white">{task.title || "(no title)"}</div>
                            {task.description && <div className="text-sm text-slate-300 mt-1">{task.description}</div>}
                            <div className="flex items-center justify-between mt-2 text-xs">
                              <span className={`px-2 py-1 rounded-full ${
                                task.priority === 'low' ? 'bg-green-500/20 text-green-400' :
                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>{task.priority}</span>
                              <span className={`px-2 py-1 rounded-full ${
                                task.status === 'to-do' ? 'bg-blue-500/20 text-blue-400' :
                                task.status === 'in-progress' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>{task.status}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-2">{new Date(task.date!).toLocaleString()}</div>
                            <div className="mt-3">
                              <button className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => doneTask(task.id)}
                                disabled={recentlyAddedIds.has(task.id)}
                                >Done
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xl font-semibold text-white mb-3">Unscheduled Tasks</h3>
          {unscheduledTasks.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {unscheduledTasks.map(t => (
                <li key={t.id} className="p-3 bg-gray-800 rounded-lg shadow">
                    <div className="font-semibold text-white">{t.title || "(no title)"}</div>
                    {t.description && <div className="text-sm text-slate-300 mt-1">{t.description}</div>}
                    <div className="flex items-center justify-between mt-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                        t.priority === 'low' ? 'bg-green-500/20 text-green-400' :
                        t.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                        }`}>{t.priority}</span>
                        <span className={`px-2 py-1 rounded-full ${
                        t.status === 'to-do' ? 'bg-blue-500/20 text-blue-400' :
                        t.status === 'in-progress' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                        }`}>{t.status}</span>
                    </div>
                    <div className="mt-3">
                        <button className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => doneTask(t.id)}
                        disabled={recentlyAddedIds.has(t.id)}
                        >Done
                        </button>
                    </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">No unscheduled tasks.</p>
          )}
        </div>

        <div className="mt-6">
            <h3 className="text-xl font-semibold text-white mb-3">Completed Tasks</h3>
            {filteredTaskDoneList.length > 0 ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTaskDoneList.map(t => (
                <li key={t.id} className="p-3 bg-gray-800 rounded-lg shadow">
                  <div className="font-semibold text-white">{t.title || "(no title)"}</div>
                  {t.description && <div className="text-sm text-slate-300 mt-1">{t.description}</div>}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={`px-2 py-1 rounded-full ${
                      t.priority === 'low' ? 'bg-green-500/20 text-green-400' :
                      t.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{t.priority}</span>
                    <span className="px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">done</span>
                  </div>
                  {t.date && <div className="text-xs text-slate-400 mt-2">{new Date(t.date).toLocaleString()}</div>}
                  <div className="mt-3">
                    <button 
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={() => removeTask(t.id)}
                      disabled={recentlyAddedIds.has(t.id)}
                    >
                      {recentlyAddedIds.has(t.id) ? "Wait..." : "Remove"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            ) : (
                <p className="text-slate-400">No completed tasks to show.</p>
            )}
        </div>
      </section>
    </div>
  );
}

export default TaskManager;