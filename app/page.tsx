"use client";
import { PinIcon, Check, TimerIcon, SignalMediumIcon, SignalHighIcon, SignalIcon } from "lucide-react";
import { useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  date?: string;
};

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus]  = useState<Task["status"]>("to-do");
  const [priority, setPriority] = useState<Task["priority"]>("low");
  const [date,setDate] = useState("");

  const [taskList, setTaskList] = useState<Task[]>([]);
  const [taskDoneList, setTaskDoneList] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTaskList = localStorage.getItem("taskList");
    const savedTaskDoneList = localStorage.getItem("taskDoneList");

    if (savedTaskList) {
      try {
        setTaskList(JSON.parse(savedTaskList));
      } catch (e) {
        console.error("Failed to parse saved tasks:", e);
      }
    }

    if (savedTaskDoneList) {
      try {
        setTaskDoneList(JSON.parse(savedTaskDoneList));
      } catch (e) {
        console.error("Failed to parse saved done tasks:", e);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("taskList", JSON.stringify(taskList));
    }
  }, [taskList, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("taskDoneList", JSON.stringify(taskDoneList));
    }
  }, [taskDoneList, isLoaded]);

  const setTasks = () => {
    const id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? (crypto as any).randomUUID()
    : Date.now().toString();
    
    const newTask: Task = {id, title, description, status, priority, date: date || undefined};
    setTaskList(prev => [newTask, ...prev]);

    setTitle("");
    setDescription("");
    setStatus("to-do");
    setPriority("low");
    setDate("");  

  }

  const doneTask = (id: string) => {
        setTaskList(prev => {
          const taskToMove = prev.find(t => t.id === id);
          if (!taskToMove) return prev;

          const movedTask: Task = { ...taskToMove, status: 'done' };

          setTaskDoneList(donePrev => {
            if (donePrev.some(d => d.id === id)) return donePrev;
            return [movedTask, ...donePrev];
          });

          return prev.filter(t => t.id !== id);
        });
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const tasksByDay: Record<string, Task[]> = days.reduce((acc, day, i) => {
    const weekdayIndex = (i + 1) % 7;
    acc[day] = taskList.filter((t) => t.date && new Date(t.date).getDay() === weekdayIndex);
    return acc;
  }, {} as Record<string, Task[]>);

  const unscheduledTasks = taskList.filter((t) => !t.date);


  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans dark:bg-black m-3">
      <main className="bg-gray-900 flex flex-col gap-3 w-2/12 px-2 py-2 h-full">

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

      </main>

      <section className="w-full h-full ml-2 flex flex-col">
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

        {taskDoneList.length > 0 && (
          <div className="mt-4">
            <ul>
              {taskDoneList.map(t => (
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
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

    </div>
  );
}
