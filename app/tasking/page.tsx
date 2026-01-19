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
  const [filterStatus, setFilterStatus] = useState<"all" | "to-do" | "in-progress" | "done">("all");
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [taskList, setTaskList] = useState<Task[]>([]);
  const [taskDoneList, setTaskDoneList] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .insert([
          {
            user_id: user.id,
            title,
            description,
            status,
            priority,
            date: date || null,
          },
        ]);

      if (error) {
        console.error("Error adding task:", error);
        return;
      }

      // Refresh tasks
      await fetchTasks(user.id);

      // Clear form
      setTitle("");
      setDescription("");
      setStatus("to-do");
      setPriority("low");
      setDate("");
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  // Mark task as done
  const doneTask = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "done" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error marking task as done:", error);
        return;
      }

      // Refresh tasks
      await fetchTasks(user.id);
    } catch (err) {
      console.error("Failed to mark task as done:", err);
    }
  };

  // Remove task
  const removeTask = async (id: string) => {
    if (!user) return;

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
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const filteredTaskDoneList = taskDoneList.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
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
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black m-3">
      <main className="bg-gray-900 flex flex-col gap-3 w-2/12 px-2 py-2 h-full relative">
        <div className="flex flex-col">
          <label>Title:</label>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}

            />
        </div>

        <div className="flex flex-col">
          <label>Description: </label>
            <textarea
              placeholder="Description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}

            />

        </div>

        <div>
          <label className="flex flex-col">Status:
            <label className="text-red-500 flex gap-1">
              <input
                type="radio"
                name="status"
                value="to-do"
                checked={status === "to-do"}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
              />
              To Do
              <PinIcon />
            </label>

            <label className="text-yellow-300 flex gap-1">
              <input
                type="radio"
                name="status"
                value="in-progress"
                checked={status === "in-progress"}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
              />
              In Progress
              <TimerIcon />
            </label>

            {/* <label className="text-green-500 flex gap-1">
              <input
                type="radio"
                name="status"
                value="done"
                checked={status === "done"}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
              />
              Done
              <Check />
            </label> */}
          </label>
        </div>

        <div>
          <label className="flex flex-col">Priority:
            <label className="text-green-500 flex gap-1">
              <input
                type="radio"
                name="priority"
                value="low"
                checked={priority === "low"}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
              />
              Low
              <SignalMediumIcon />
            </label>

            <label className="text-yellow-300 flex gap-1">
              <input
                type="radio"
                name="priority"
                value="medium"
                checked={priority === "medium"}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
              />
              Medium
              <SignalHighIcon />
            </label>

            <label className="text-red-500 flex gap-1">
              <input
                type="radio"
                name="priority"
                value="high"
                checked={priority === "high"}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
              />
              High
              <SignalIcon />
            </label>
          </label>
        </div>

        <div className="flex flex-col">
          <label>Date: </label>
            <input
              type="datetime-local"
              className="bg-gray-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}

            />
        
        </div>

        <div>
          <button className="bg-blue-700 w-full" onClick={setTasks}>Add Task</button>
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

      <section className="w-full h-full ml-2 flex flex-col">
        {/* Search and Filter Bar */}
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 text-white placeholder-slate-400 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 text-white border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="to-do">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="overflow-auto">
          <table className="w-full table-fixed border-collapse text-white">
            <thead>
              <tr>
                {days.map((d) => (
                  <th key={d} className="border px-2 py-1 text-left bg-gray-800">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {days.map((d) => (
                  <td key={d} className="align-top border px-2 py-2 bg-gray-900">
                    {tasksByDay[d].length === 0 && <div className="text-sm opacity-70">—</div>}
                    {tasksByDay[d].map((task) => (
                      <div key={task.id} className="mb-2 p-2 bg-gray-800 rounded">
                        <div className="font-semibold">{task.title || "(no title)"}</div>
                        <div>{task.description && <div className="text-sm mt-1">{task.description}</div>}</div>
                        <div>
                          {task.priority === 'low' ? (
                            <div className="text-sms opacity-80 text-green-500">{task.priority}</div>
                          ) : task.priority === 'medium' ? (
                            <div className="text-sms opacity-80 text-yellow-300">{task.priority}</div>
                          ) : (
                            <div className="text-sms opacity-80 text-red-500">{task.priority}</div>
                          )}

                          {task.status === 'to-do' ? (
                            <div className="text-sms opacity-80 text-green-500">{task.status}</div>
                          ) : task.status === 'in-progress' ? (
                            <div className="text-sms opacity-80 text-yellow-300">{task.status}</div>
                          ) : (
                            <div className="text-sms opacity-80 text-red-500">{task.status}</div>
                          )}

                        </div>
                        <div>
                          {task.date}
                        </div>

                        <div className="mt-2 justify-self-end">
                          <button className="bg-green-700 px-3" onClick={() => doneTask(task.id)}>Done</button>
                        </div>

                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {unscheduledTasks.length > 0 && (
          <div className="mt-4">
            <ul>
              {unscheduledTasks.map(t => (
                <li key={t.id} className="mb-2 p-2 bg-gray-800 rounded">
                  <h4 className="font-semibold text-red-500">Unscheduled</h4>
                  <div className="font-semibold">
                    {t.title || "(no title)"}
                  </div>

                  <div>
                    {t.description && 
                      <div className="text-sm mt-1">{t.description}</div>
                    }
                  </div>

                  <div>
                    {t.priority === 'low' ? (
                      <div className="text-sms opacity-80 text-green-500">
                        {t.priority}
                      </div>
                    ) : t.priority === 'medium' ? (
                      <div className="text-sms opacity-80 text-yellow-300">
                        {t.priority}
                      </div>
                    ) : (
                      <div className="text-sms opacity-80 text-red-500">
                        {t.priority}
                      </div>
                    )}

                    {t.status === 'to-do' ? (
                      <div className="text-sms opacity-80 text-red-500">
                        {t.status}
                      </div>
                    ) : t.status === 'in-progress' ? (
                      <div className="text-sms opacity-80 text-yellow-300">
                        {t.status}
                      </div>
                    ) : (
                      <div className="text-sms opacity-80 text-green-500">
                        {t.status}
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <button className="bg-green-700 px-3" onClick={() => doneTask(t.id)}>Done</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {filteredTaskDoneList.length > 0 && (
          <div className="mt-4">
            <ul>
              {filteredTaskDoneList.map(t => (
                <li key={t.id} className="mb-2 p-2 bg-gray-800 rounded">
                  <h4 className="font-semibold text-green-500">Task Finished</h4>
                  <div className="font-semibold">
                    {t.title || "(no title)"}
                  </div>

                  <div>
                    {t.description && 
                      <div className="text-sm mt-1">{t.description}</div>
                    }
                  </div>

                  <div>
                    {t.priority === 'low' ? (
                      <div className="text-sms opacity-80 text-green-500">
                        {t.priority}
                      </div>
                    ) : t.priority === 'medium' ? (
                      <div className="text-sms opacity-80 text-yellow-300">
                        {t.priority}
                      </div>
                    ) : (
                      <div className="text-sms opacity-80 text-red-500">
                        {t.priority}
                      </div>
                    )}

                    {t.status === 'to-do' ? (
                      <div className="text-sms opacity-80 text-red-500">
                        {t.status}
                      </div>
                    ) : t.status === 'in-progress' ? (
                      <div className="text-sms opacity-80 text-yellow-300">
                        {t.status}
                      </div>
                    ) : (
                      <div className="text-sms opacity-80 text-green-500">
                        {t.status}
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    <button className="bg-red-700 px-3" onClick={() => removeTask(t.id)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

    </div>
  );
}

export default TaskManager;