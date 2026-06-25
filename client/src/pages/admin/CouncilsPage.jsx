import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { axiosInstance } from "../../lib/axios";
import {
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Play,
  Trash2,
  Plus,
  Calendar,
  MapPin,
  Users,
  BookOpen,
  Sparkles,
  CheckCircle,
  RefreshCw,
  X,
  Info,
  AlertCircle,
} from "lucide-react";
import { formatAssessmentScore } from "../../lib/assessment";

const formatDateTime = (value) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleString("vi-VN");
};

const getVietnameseDayOfWeek = (dateValue) => {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  const day = d.getDay();
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return days[day];
};

const formatCouncilSchedule = (defenseDate, room) => {
  if (!defenseDate) return "Chưa xếp lịch";
  const d = new Date(defenseDate);
  if (isNaN(d.getTime())) return "Lịch không hợp lệ";
  const dayName = getVietnameseDayOfWeek(d);
  const dateStr = d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const roomInfo = room ? `Phòng: ${room}` : "Chưa xếp phòng";
  return `${dayName}, ngày ${dateStr} vào lúc ${timeStr} | ${roomInfo}`;
};

const getPeriodFromDate = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return null;
  const hour = d.getHours();
  if (hour < 7 || hour > 21) return null;
  return hour - 6; // returns 1 for 7, 2 for 8, ..., 15 for 21
};

const formatDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const DEFAULT_ROLE_WEIGHTS = {
  chairman: 1.5,
  secretary: 1,
  member: 1,
};

const createMember = (
  role = "member",
  weight = DEFAULT_ROLE_WEIGHTS[role] || 1,
) => ({
  teacher: "",
  role,
  weight,
});

const createEmptyCouncilForm = () => ({
  name: "",
  description: "",
  defenseDate: "",
  room: "",
  members: [createMember("chairman"), createMember("secretary")],
});

const mapCouncilToForm = (council) => ({
  name: council.name || "",
  description: council.description || "",
  defenseDate: formatDateTimeInput(council.defenseDate),
  room: council.room || "",
  members: council.members?.map((member) => ({
    teacher: member.teacher?._id || "",
    role: member.role || "member",
    weight: member.weight ?? DEFAULT_ROLE_WEIGHTS[member.role] ?? 1,
  })) || [createMember("chairman"), createMember("secretary")],
});

const getCouncilFormValidationMessage = (form) => {
  if (!form.name.trim()) {
    return "Council name is required";
  }

  if (!Array.isArray(form.members) || form.members.length === 0) {
    return "Council members are required";
  }

  const chairmanCount = form.members.filter(
    (member) => member.role === "chairman",
  ).length;
  const secretaryCount = form.members.filter(
    (member) => member.role === "secretary",
  ).length;

  if (chairmanCount !== 1) {
    return "Council must have exactly one chairman";
  }

  if (secretaryCount !== 1) {
    return "Council must have exactly one secretary";
  }

  const teacherIds = form.members
    .map((member) => member.teacher)
    .filter(Boolean);
  if (teacherIds.length !== form.members.length) {
    return "Please select a teacher for every council member";
  }

  if (new Set(teacherIds).size !== teacherIds.length) {
    return "Council members must not contain duplicate teachers";
  }

  return null;
};

const FieldBlock = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div>
      <label className="label text-sm font-semibold text-slate-700">
        {label}
      </label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
    {children}
  </div>
);

const CouncilsPage = () => {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [councils, setCouncils] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [qaDashboard, setQaDashboard] = useState(null);
  const [form, setForm] = useState(createEmptyCouncilForm);
  const [assignForms, setAssignForms] = useState({});
  const [councilToDelete, setCouncilToDelete] = useState(null);
  const [editingCouncilId, setEditingCouncilId] = useState(null);

  // States for Search, Filter, Pagination, and Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdDesc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [isQaExpanded, setIsQaExpanded] = useState(false);

  // TABS State
  const [activeTab, setActiveTab] = useState("list"); // 'list', 'scheduler', 'grid'

  // AUTO SCHEDULER States
  const [solving, setSolving] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [rooms, setRooms] = useState(["Phòng 401", "Phòng 402", "Phòng 403"]);
  const [newRoom, setNewRoom] = useState("");
  const [timeSlots, setTimeSlots] = useState([
    { startAt: "2026-06-22T08:00", endAt: "2026-06-22T11:30" },
    { startAt: "2026-06-22T13:30", endAt: "2026-06-22T17:00" },
    { startAt: "2026-06-23T08:00", endAt: "2026-06-23T11:30" },
  ]);
  const [newSlot, setNewSlot] = useState({ startAt: "", endAt: "" });

  // Date-range slot generation state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [rangeFromDate, setRangeFromDate] = useState(todayStr);
  const [rangeToDate, setRangeToDate] = useState(todayStr);
  const [sessionTemplates, setSessionTemplates] = useState([
    { startTime: "08:00", endTime: "11:30" },
    { startTime: "13:30", endTime: "17:00" },
  ]);
  const [newSessionTemplate, setNewSessionTemplate] = useState({
    startTime: "",
    endTime: "",
  });

  // Slot list filter state
  const [slotFilterStart, setSlotFilterStart] = useState("");
  const [slotFilterEnd, setSlotFilterEnd] = useState("");

  const [schedulerJobs, setSchedulerJobs] = useState([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const [teacherSearchTerm, setTeacherSearchTerm] = useState("");

  // WEEKLY SCHEDULE GRID States
  const getMonday = (d) => {
    const dateObj = new Date(d);
    const day = dateObj.getDay();
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dateObj.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getMonday(new Date()),
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, projectsRes, councilsRes, templatesRes, qaRes, jobsRes] =
        await Promise.all([
          axiosInstance.get("/admin/users"),
          axiosInstance.get("/admin/projects"),
          axiosInstance.get("/admin/councils"),
          axiosInstance.get("/admin/assessment-templates"),
          axiosInstance.get("/admin/qa/clo-dashboard"),
          axiosInstance
            .get("/scheduler/jobs")
            .catch(() => ({ data: { data: [] } })),
        ]);

      setTeachers(
        (usersRes.data.data?.users || []).filter(
          (user) => user.role === "Teacher",
        ),
      );
      setProjects(projectsRes.data.data?.projects || []);
      setCouncils(councilsRes.data.data?.councils || []);
      setTemplates(templatesRes.data.data?.templates || []);
      setQaDashboard(qaRes.data.data?.dashboard || null);
      setSchedulerJobs(jobsRes.data?.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load councils page",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pre-populate scheduler selections when data is loaded
  useEffect(() => {
    if (projects.length > 0 && selectedProjectIds.length === 0) {
      const activeIds = projects
        .filter(
          (p) =>
            [
              "approved",
              "in_progress",
              "created",
              "pending",
              "completed",
            ].includes(p.status) && !p.councilId,
        )
        .map((p) => p._id);
      setSelectedProjectIds(activeIds);
    }
  }, [projects]);

  useEffect(() => {
    if (teachers.length > 0 && selectedTeacherIds.length === 0) {
      const activeIds = teachers.filter((t) => t.isActive).map((t) => t._id);
      setSelectedTeacherIds(activeIds);
    }
  }, [teachers]);

  // Poll job status if a job is running
  useEffect(() => {
    let interval;
    if (jobId && solving) {
      interval = setInterval(async () => {
        try {
          const res = await axiosInstance.get(`/scheduler/jobs/${jobId}`);
          const job = res.data.data;
          setJobData(job);

          if (job.status === "completed") {
            setSolving(false);
            setJobId(null);
            toast.success("Xếp lịch tự động thành công!");
            loadData(); // Reload pools to reflect assignments
          } else if (job.status === "failed") {
            setSolving(false);
            setJobId(null);
            toast.error(job.error || "Không thể tối ưu lịch tự động.");
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, solving]);

  const checkCouncilsOverlap = (c1, c2) => {
    if (!c1.defenseDate || !c2.defenseDate) return false;

    const startA = new Date(c1.defenseDate).getTime();
    const endA = c1.defenseEndDate
      ? new Date(c1.defenseEndDate).getTime()
      : startA + 3.5 * 60 * 60 * 1000;

    const startB = new Date(c2.defenseDate).getTime();
    const endB = c2.defenseEndDate
      ? new Date(c2.defenseEndDate).getTime()
      : startB + 3.5 * 60 * 60 * 1000;

    return startA < endB && endA > startB;
  };

  const conflictsMap = useMemo(() => {
    const map = {}; // councilId -> { room: boolean, teachers: Set, projects: Set, supervisors: Set }

    // 1. Check supervisor conflicts (internal to each council)
    councils.forEach((c) => {
      const memberIds =
        c.members
          ?.map((m) => (m.teacher?._id || m.teacher)?.toString())
          .filter(Boolean) || [];
      c.projects?.forEach((pItem) => {
        const proj = pItem.project;
        const supervisorId = proj?.supervisor?._id || proj?.supervisor;
        if (supervisorId && memberIds.includes(supervisorId.toString())) {
          if (!map[c._id])
            map[c._id] = {
              room: false,
              teachers: new Set(),
              projects: new Set(),
              supervisors: new Set(),
            };
          if (!map[c._id].supervisors) map[c._id].supervisors = new Set();
          map[c._id].supervisors.add(proj.supervisor?.name || "Giảng viên");
        }
      });
    });

    // 2. Check time-overlapping conflicts (room, teacher, project double bookings)
    for (let i = 0; i < councils.length; i++) {
      const c1 = councils[i];
      if (!c1.defenseDate || !c1.room) continue;

      for (let j = i + 1; j < councils.length; j++) {
        const c2 = councils[j];
        if (!c2.defenseDate || !c2.room) continue;

        if (checkCouncilsOverlap(c1, c2)) {
          // Room conflict
          if (c1.room.trim().toLowerCase() === c2.room.trim().toLowerCase()) {
            if (!map[c1._id])
              map[c1._id] = {
                room: false,
                teachers: new Set(),
                projects: new Set(),
                supervisors: new Set(),
              };
            if (!map[c2._id])
              map[c2._id] = {
                room: false,
                teachers: new Set(),
                projects: new Set(),
                supervisors: new Set(),
              };
            map[c1._id].room = true;
            map[c2._id].room = true;
          }

          // Teacher conflict
          const getTeachers = (c) => {
            const list = [];
            c.members?.forEach((m) => {
              const id = m.teacher?._id || m.teacher;
              if (id)
                list.push({
                  id: id.toString(),
                  name: m.teacher?.name || "Giáo viên",
                });
            });
            c.projects?.forEach((p) => {
              const id = p.reviewer?._id || p.reviewer;
              if (id)
                list.push({
                  id: id.toString(),
                  name: p.reviewer?.name || "Giáo viên nhận xét",
                });
            });
            return list;
          };

          const teachers1 = getTeachers(c1);
          const teachers2 = getTeachers(c2);

          teachers1.forEach((t1) => {
            const matched = teachers2.find((t2) => t2.id === t1.id);
            if (matched) {
              if (!map[c1._id])
                map[c1._id] = {
                  room: false,
                  teachers: new Set(),
                  projects: new Set(),
                  supervisors: new Set(),
                };
              if (!map[c2._id])
                map[c2._id] = {
                  room: false,
                  teachers: new Set(),
                  projects: new Set(),
                  supervisors: new Set(),
                };
              map[c1._id].teachers.add(t1.name);
              map[c2._id].teachers.add(matched.name);
            }
          });

          // Project conflict
          const getProjects = (c) =>
            (c.projects || [])
              .map((p) => {
                const id = p.project?._id || p.project;
                return {
                  id: id?.toString(),
                  title: p.project?.title || p.project?.groupName || "Đề tài",
                };
              })
              .filter((item) => item.id);

          const projs1 = getProjects(c1);
          const projs2 = getProjects(c2);

          projs1.forEach((p1) => {
            const matched = projs2.find((p2) => p2.id === p1.id);
            if (matched) {
              if (!map[c1._id])
                map[c1._id] = {
                  room: false,
                  teachers: new Set(),
                  projects: new Set(),
                  supervisors: new Set(),
                };
              if (!map[c2._id])
                map[c2._id] = {
                  room: false,
                  teachers: new Set(),
                  projects: new Set(),
                  supervisors: new Set(),
                };
              map[c1._id].projects.add(p1.title);
              map[c2._id].projects.add(matched.title);
            }
          });
        }
      }
    }

    return map;
  }, [councils]);

  const eligibleProjects = useMemo(
    () =>
      projects.filter(
        (project) => project.status === "completed" && !project.councilId,
      ),
    [projects],
  );

  const handleMemberChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [field]: value } : member,
      ),
    }));
  };

  const removeMember = (index) => {
    setForm((current) => ({
      ...current,
      members: current.members.filter(
        (_, memberIndex) => memberIndex !== index,
      ),
    }));
  };

  const resetForm = () => {
    setForm(createEmptyCouncilForm());
    setEditingCouncilId(null);
    setIsFormModalOpen(false);
  };

  const startEditingCouncil = (council) => {
    setEditingCouncilId(council._id);
    setForm(mapCouncilToForm(council));
    setIsFormModalOpen(true);
  };

  const isTeacherSelectedInOtherMember = (memberIndex, teacherId) =>
    form.members.some(
      (member, currentIndex) =>
        currentIndex !== memberIndex &&
        member.teacher &&
        member.teacher === teacherId,
    );

  const isRoleTakenInOtherMember = (memberIndex, role) =>
    role !== "member" &&
    form.members.some(
      (member, currentIndex) =>
        currentIndex !== memberIndex && member.role === role,
    );

  const saveCouncil = async () => {
    const validationMessage = getCouncilFormValidationMessage(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    if (form.room) {
      const conflictMsgs = [];
      const formRoom = form.room.trim().toLowerCase();
      const formTeacherIds = form.members
        .map((m) => m.teacher?.toString() || m.teacher)
        .filter(Boolean);

      // A. Hard Constraint: Supervisor cannot be a member of the council of their projects
      if (editingCouncilId) {
        const currentCouncil = councils.find((c) => c._id === editingCouncilId);
        if (currentCouncil && currentCouncil.projects) {
          const supervisorViolations = [];
          currentCouncil.projects.forEach((pItem) => {
            const proj = pItem.project;
            const supervisorId = proj?.supervisor?._id || proj?.supervisor;
            if (
              supervisorId &&
              formTeacherIds.includes(supervisorId.toString())
            ) {
              const supervisorName =
                proj.supervisor?.name || "Giảng viên hướng dẫn";
              supervisorViolations.push(
                `- Giảng viên hướng dẫn "${supervisorName}" của đề tài "${proj.title || proj.groupName}" đang nằm trong danh sách thành viên hội đồng.`,
              );
            }
          });

          if (supervisorViolations.length > 0) {
            toast.error(
              "Không thể lưu: Giảng viên hướng dẫn không được tham gia hội đồng bảo vệ đề tài mình hướng dẫn.\n" +
                supervisorViolations.join("\n"),
            );
            return;
          }
        }
      }

      // B. Soft Overlap Warnings (Room/Teacher double booking)
      if (form.defenseDate) {
        const formDate = new Date(form.defenseDate);
        councils.forEach((c) => {
          if (editingCouncilId && c._id === editingCouncilId) return;
          if (!c.defenseDate || !c.room) return;

          const formStart = formDate.getTime();
          const formEnd = formStart + 3.5 * 60 * 60 * 1000;

          const cStart = new Date(c.defenseDate).getTime();
          const cEnd = c.defenseEndDate
            ? new Date(c.defenseEndDate).getTime()
            : cStart + 3.5 * 60 * 60 * 1000;

          const isTimeOverlapping = formStart < cEnd && formEnd > cStart;

          if (isTimeOverlapping) {
            // Room conflict
            if (c.room.trim().toLowerCase() === formRoom) {
              conflictMsgs.push(
                `- Trùng phòng: Phòng "${c.room}" đã được sử dụng cho hội đồng "${c.name}" (${new Date(c.defenseDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
              );
            }

            // Teacher conflict
            const cTeacherIds = [];
            c.members?.forEach((m) => {
              const id = m.teacher?._id || m.teacher;
              if (id)
                cTeacherIds.push({
                  id: id.toString(),
                  name: m.teacher?.name || "Giáo viên",
                });
            });
            c.projects?.forEach((p) => {
              const id = p.reviewer?._id || p.reviewer;
              if (id)
                cTeacherIds.push({
                  id: id.toString(),
                  name: p.reviewer?.name || "Giáo viên nhận xét",
                });
            });

            formTeacherIds.forEach((tId) => {
              const matched = cTeacherIds.find((ct) => ct.id === tId);
              if (matched) {
                conflictMsgs.push(
                  `- Trùng giáo viên: "${matched.name}" đã tham gia hội đồng "${c.name}" (${new Date(c.defenseDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
                );
              }
            });
          }
        });

        if (conflictMsgs.length > 0) {
          if (
            !window.confirm(
              "Cảnh báo trùng lịch phát hiện:\n\n" +
                conflictMsgs.join("\n") +
                "\n\nBạn có chắc chắn muốn lưu không?",
            )
          ) {
            return;
          }
        }
      }
    }

    try {
      if (editingCouncilId) {
        await axiosInstance.put(`/admin/councils/${editingCouncilId}`, form);
        toast.success("Hội đồng đã được cập nhật thành công.");
      } else {
        await axiosInstance.post("/admin/councils", form);
        toast.success("Hội đồng mới đã được tạo thành công.");
        setSortBy("createdDesc");
        setCurrentPage(1);
      }

      resetForm();
      await loadData();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingCouncilId
            ? "Không thể cập nhật hội đồng"
            : "Không thể tạo hội đồng"),
      );
    }
  };

  // AUTO SCHEDULER Handlers
  const handleAddRoom = () => {
    if (newRoom.trim() && !rooms.includes(newRoom.trim())) {
      setRooms([...rooms, newRoom.trim()]);
      setNewRoom("");
    }
  };

  const handleRemoveRoom = (roomToRemove) => {
    setRooms(rooms.filter((r) => r !== roomToRemove));
  };

  const handleAddSlot = () => {
    if (newSlot.startAt && newSlot.endAt) {
      if (new Date(newSlot.startAt) >= new Date(newSlot.endAt)) {
        toast.error("Thời gian kết thúc phải sau thời gian bắt đầu.");
        return;
      }
      setTimeSlots([...timeSlots, newSlot]);
      setNewSlot({ startAt: "", endAt: "" });
    }
  };

  const handleRemoveSlot = (indexToRemove) => {
    setTimeSlots(timeSlots.filter((_, idx) => idx !== indexToRemove));
  };

  // Generate slots for each day in [rangeFromDate, rangeToDate] × sessionTemplates
  const handleGenerateSlots = () => {
    if (!rangeFromDate || !rangeToDate) {
      toast.error("Vui lòng chọn ngày bắt đầu và kết thúc.");
      return;
    }
    if (sessionTemplates.length === 0) {
      toast.error("Vui lòng thêm ít nhất một ca (session) để tạo lịch.");
      return;
    }
    const from = new Date(rangeFromDate);
    const to = new Date(rangeToDate);
    if (from > to) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }
    const generated = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
      sessionTemplates.forEach((tpl) => {
        const startAt = `${dateStr}T${tpl.startTime}`;
        const endAt = `${dateStr}T${tpl.endTime}`;
        // Avoid duplicates
        const isDuplicate = timeSlots.some(
          (s) => s.startAt === startAt && s.endAt === endAt,
        );
        if (!isDuplicate) {
          generated.push({ startAt, endAt });
        }
      });
    }
    if (generated.length === 0) {
      toast("Tất cả các ca trong khoảng thời gian đã tồn tại.", { icon: "ℹ️" });
      return;
    }
    setTimeSlots((prev) => [...prev, ...generated]);
    toast.success(`Đã tạo ${generated.length} khung giờ mới.`);
  };

  const handleAddSessionTemplate = () => {
    if (!newSessionTemplate.startTime || !newSessionTemplate.endTime) return;
    if (newSessionTemplate.startTime >= newSessionTemplate.endTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    const isDuplicate = sessionTemplates.some(
      (t) =>
        t.startTime === newSessionTemplate.startTime &&
        t.endTime === newSessionTemplate.endTime,
    );
    if (isDuplicate) {
      toast.error("Ca này đã tồn tại.");
      return;
    }
    setSessionTemplates((prev) => [...prev, newSessionTemplate]);
    setNewSessionTemplate({ startTime: "", endTime: "" });
  };

  const handleRemoveSessionTemplate = (idx) => {
    setSessionTemplates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleToggleProject = (id) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id],
    );
  };

  const handleToggleTeacher = (id) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id],
    );
  };

  const handleRunScheduler = async () => {
    const activeProjects = projects.filter(
      (p) =>
        ["approved", "in_progress", "created", "pending", "completed"].includes(
          p.status,
        ) && !p.councilId,
    );
    const activeTeachers = teachers.filter((t) => t.isActive);

    const runProjectIds = selectedProjectIds.filter((id) =>
      activeProjects.some((p) => p._id === id),
    );
    const runTeacherIds = selectedTeacherIds.filter((id) =>
      activeTeachers.some((t) => t._id === id),
    );

    if (runProjectIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một đề tài.");
      return;
    }
    if (runTeacherIds.length < 3) {
      toast.error("Cần ít nhất 3 giảng viên để tạo hội đồng.");
      return;
    }
    if (rooms.length === 0) {
      toast.error("Vui lòng thêm ít nhất một phòng.");
      return;
    }
    if (timeSlots.length === 0) {
      toast.error("Vui lòng thêm ít nhất một khung giờ.");
      return;
    }

    setSolving(true);
    setJobData(null);
    try {
      const payload = {
        projectIds: runProjectIds,
        teacherIds: runTeacherIds,
        rooms,
        timeSlots: timeSlots.map((s) => ({
          startAt: new Date(s.startAt),
          endAt: new Date(s.endAt),
        })),
        solverType: "genetic_algorithm",
        populationSize: 100,
        generations: 200,
      };

      const res = await axiosInstance.post("/scheduler/jobs", payload);
      if (res.data.success) {
        setJobId(res.data.data.jobId);
        toast.info("Tiến trình tối ưu hóa đã bắt đầu trong nền.");
      }
    } catch (error) {
      setSolving(false);
      toast.error(
        error.response?.data?.message || "Không thể bắt đầu lập lịch tự động.",
      );
    }
  };

  const handlePublishSchedule = async () => {
    if (!jobData || !jobData._id) return;
    try {
      await axiosInstance.post(`/scheduler/jobs/${jobData._id}/apply`);
      toast.success("Đã công bố lịch thành công!");
      setJobData(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể công bố lịch.");
    }
  };

  const handleDiscardSchedule = async () => {
    if (!jobData || !jobData._id) return;
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn hủy bản nháp này? Tất cả trạng thái đề tài sẽ được hoàn tác.",
      )
    )
      return;

    try {
      await axiosInstance.delete(`/scheduler/jobs/${jobData._id}`);
      toast.info("Đã hủy bản nháp lịch thành công.");
      setJobData(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể hủy bản nháp.");
    }
  };

  const handleViewJobDetails = async (jobId) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/scheduler/jobs/${jobId}`);
      setJobData(res.data.data);
      toast.info("Đang xem bản nháp từ lịch sử!");
    } catch (error) {
      toast.error("Không thể tải chi tiết lịch từ lịch sử.");
    } finally {
      setLoading(false);
    }
  };

  const updateAssignForm = (councilId, field, value) => {
    setAssignForms((current) => ({
      ...current,
      [councilId]: {
        ...(current[councilId] || {}),
        [field]: value,
      },
    }));
  };

  const assignProject = async (councilId) => {
    const selectedProjId = assignForms[councilId]?.projectId;
    if (!selectedProjId) {
      toast.error("Vui lòng chọn đề tài để gán.");
      return;
    }

    const project = projects.find((p) => p._id === selectedProjId);
    const council = councils.find((c) => c._id === councilId);
    if (project && council) {
      const supervisorId = project.supervisor?._id || project.supervisor;
      const councilTeacherIds = council.members
        ?.map((m) => (m.teacher?._id || m.teacher)?.toString())
        .filter(Boolean);
      if (supervisorId && councilTeacherIds.includes(supervisorId.toString())) {
        toast.error(
          `Không thể gán: Giảng viên hướng dẫn "${project.supervisor?.name || "GVHD"}" của đề tài này đang là thành viên của hội đồng.`,
        );
        return;
      }
    }

    try {
      await axiosInstance.post(`/admin/councils/${councilId}/assign-project`, {
        projectId: selectedProjId,
        projectTrack: assignForms[councilId]?.projectTrack || "capstone",
        templateId: assignForms[councilId]?.templateId || undefined,
      });
      toast.success("Gán đề tài vào hội đồng thành công.");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể gán đề tài");
    }
  };

  const handleDeleteCouncil = async () => {
    if (!councilToDelete?._id) return;

    try {
      await axiosInstance.delete(`/admin/councils/${councilToDelete._id}`);
      toast.success("Council deleted");
      setCouncilToDelete(null);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete council");
    }
  };

  // Search, Filter & Sort Handlers
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleTrackFilterChange = (value) => {
    setTrackFilter(value);
    setCurrentPage(1);
  };

  const handleSortByChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  // Filtered and Sorted Councils
  const filteredCouncils = useMemo(() => {
    let result = [...councils];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((council) => {
        const nameMatch = council.name?.toLowerCase().includes(term);
        const descMatch = council.description?.toLowerCase().includes(term);
        const roomMatch = council.room?.toLowerCase().includes(term);

        // Members match
        const membersMatch = council.members?.some((m) =>
          m.teacher?.name?.toLowerCase().includes(term),
        );

        // Projects match
        const projectsMatch = council.projects?.some(
          (p) =>
            p.project?.groupName?.toLowerCase().includes(term) ||
            p.project?.title?.toLowerCase().includes(term),
        );

        return (
          nameMatch || descMatch || roomMatch || membersMatch || projectsMatch
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((council) => {
        const projCount = council.projects?.length || 0;
        if (projCount === 0) {
          return statusFilter === "unassigned";
        }

        const allDone = council.projects.every((p) => p.status === "done");
        if (allDone) {
          return statusFilter === "completed";
        } else {
          return statusFilter === "pending";
        }
      });
    }

    // Track filter
    if (trackFilter !== "all") {
      result = result.filter((council) => {
        return council.projects?.some((p) => {
          const track = p.projectTrack || p.project?.projectTrack || "capstone";
          return track === trackFilter;
        });
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "createdDesc") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "dateAsc") {
        const diff = new Date(a.defenseDate || 0) - new Date(b.defenseDate || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "dateDesc") {
        const diff = new Date(b.defenseDate || 0) - new Date(a.defenseDate || 0);
        if (diff !== 0) return diff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "nameAsc") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "nameDesc") {
        return (b.name || "").localeCompare(a.name || "");
      }
      return 0;
    });

    return result;
  }, [councils, searchTerm, statusFilter, trackFilter, sortBy]);

  const totalPages = Math.ceil(filteredCouncils.length / itemsPerPage);

  const paginatedCouncils = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCouncils.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCouncils, currentPage, itemsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const displayedProjectWarnings = useMemo(() => {
    if (!qaDashboard || !qaDashboard.projectWarnings) return [];
    if (isQaExpanded) {
      return qaDashboard.projectWarnings;
    }
    return qaDashboard.projectWarnings.slice(0, 5);
  }, [qaDashboard, isQaExpanded]);

  if (loading) {
    return <div className="card text-center py-8">Loading councils...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Block with Tab actions */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Quản lý Hội đồng bảo vệ Đồ án
          </h1>
          <p className="text-indigo-100 text-sm">
            Tạo hội đồng, quản lý lịch bảo vệ đồ án tốt nghiệp và phân bổ tài
            nguyên hợp lý.
          </p>
        </div>
        {activeTab === "list" && (
          <button
            className="bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all duration-200 shrink-0"
            onClick={() => {
              resetForm();
              setIsFormModalOpen(true);
            }}
          >
            Tạo Hội đồng mới
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("list")}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "list"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-slate-300"
          }`}
        >
          Danh sách Hội đồng
        </button>
        <button
          onClick={() => setActiveTab("scheduler")}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "scheduler"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-slate-300"
          }`}
        >
          Tự động lập lịch
        </button>
        <button
          onClick={() => setActiveTab("grid")}
          className={`px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === "grid"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-slate-300"
          }`}
        >
          Lịch trình tuần
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {qaDashboard && (
            <div className="card space-y-4">
              <div className="card-header">
                <h2 className="card-title">CLO QA Dashboard</h2>
                <p className="card-subtitle">
                  Theo dõi kết quả đạt chuẩn đầu ra CLO, mức độ hoàn thiện minh
                  chứng và các đề tài cần lưu ý về QA.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Tổng số đánh giá</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {qaDashboard.totalAssessments}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Đã chốt điểm</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {qaDashboard.finalizedAssessments}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Tỷ lệ Đạt (Pass)</p>
                  <p className="text-xl font-semibold text-slate-800">
                    {qaDashboard.passRate}%
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Hoàn thiện minh chứng QA
                  </p>
                  <p className="text-xl font-semibold text-slate-800">
                    {qaDashboard.averageQaCompleteness}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 font-medium text-slate-700">
                    Tỷ lệ đạt chuẩn đầu ra (CLO)
                  </p>
                  <div className="space-y-2">
                    {(qaDashboard.cloAchievementRates || []).map((item) => (
                      <div
                        key={item.cloCode}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                      >
                        <span className="font-medium text-slate-700">
                          {item.cloCode}
                        </span>
                        <span className="text-sm text-slate-500">
                          {item.achievementRate}% ({item.achievedProjects}/
                          {item.totalProjects})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-3 font-medium text-slate-700">
                    Đề tài cần cập nhật minh chứng QA
                  </p>
                  <div className="space-y-2">
                    {displayedProjectWarnings.map((item) => (
                      <div
                        key={item.projectId}
                        className="rounded-lg bg-amber-50 p-3"
                      >
                        <p className="font-medium text-slate-800">
                          {item.projectName}
                        </p>
                        <p className="text-sm text-slate-600">
                          CLO chưa đạt:{" "}
                          {item.redClos.length
                            ? item.redClos.join(", ")
                            : "None"}{" "}
                          | Độ hoàn thiện QA: {item.qaCompleteness}%
                        </p>
                        {item.missingItems.length > 0 && (
                          <p className="text-sm text-amber-700">
                            Minh chứng thiếu: {item.missingItems.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                    {(qaDashboard.projectWarnings || []).length === 0 && (
                      <p className="text-slate-500">Không có cảnh báo QA.</p>
                    )}
                    {(qaDashboard.projectWarnings || []).length > 5 && (
                      <button
                        className="text-indigo-600 hover:text-indigo-700 font-medium text-sm mt-2 block w-full text-center py-1 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        onClick={() => setIsQaExpanded(!isQaExpanded)}
                      >
                        {isQaExpanded
                          ? "Thu gọn"
                          : `Xem tất cả (${qaDashboard.projectWarnings.length})`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search, Filter & Sort Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hội đồng, phòng, tên giảng viên, đề tài..."
                  className="input pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-2/3">
                <div className="relative">
                  <select
                    className="input pr-8 appearance-none w-full"
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="pending">Chờ chấm điểm</option>
                    <option value="unassigned">Chưa gán đề tài</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <Filter className="h-4 w-4" />
                  </div>
                </div>

                

                <div className="relative">
                  <select
                    className="input pr-8 appearance-none w-full"
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value)}
                  >
                    <option value="createdDesc">Mới tạo (Mới nhất)</option>
                    <option value="dateDesc">Ngày bảo vệ (Mới nhất)</option>
                    <option value="dateAsc">Ngày bảo vệ (Cũ nhất)</option>
                    <option value="nameAsc">Tên hội đồng (A-Z)</option>
                    <option value="nameDesc">Tên hội đồng (Z-A)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <Filter className="h-4 w-4" />
                  </div>
                </div>

                <div className="relative">
                  <select
                    className="input pr-8 appearance-none w-full"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 hội đồng / trang</option>
                    <option value={10}>10 hội đồng / trang</option>
                    <option value={20}>20 hội đồng / trang</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <Filter className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Councils Cards List */}
          <div className="space-y-4">
            {paginatedCouncils.map((council) => {
              const conflict = conflictsMap[council._id];
              const hasConflict =
                conflict &&
                (conflict.room ||
                  conflict.teachers.size > 0 ||
                  conflict.projects.size > 0 ||
                  (conflict.supervisors && conflict.supervisors.size > 0));

              return (
                <div
                  key={council._id}
                  className={`card ${editingCouncilId === council._id ? "ring-2 ring-blue-200" : ""} ${hasConflict ? "border-red-300" : ""}`}
                >
                  {/* Warning banner */}
                  {hasConflict && (
                    <div className="bg-red-50 border-b border-red-200 text-red-800 rounded-t-xl p-3.5 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">
                          Phát hiện trùng lịch / vi phạm vai trò bảo vệ:
                        </p>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                          {conflict.room && (
                            <li>
                              <strong>Trùng phòng:</strong> Phòng này đang được
                              xếp lịch cho một hội đồng khác ở cùng thời gian.
                            </li>
                          )}
                          {conflict.teachers.size > 0 && (
                            <li>
                              <strong>Trùng giáo viên:</strong>{" "}
                              {Array.from(conflict.teachers).join(", ")} đang
                              bận ở hội đồng khác cùng thời gian.
                            </li>
                          )}
                          {conflict.projects.size > 0 && (
                            <li>
                              <strong>Trùng đề tài:</strong> Đề tài/nhóm{" "}
                              {Array.from(conflict.projects).join(", ")} có lịch
                              bảo vệ trùng thời gian ở hội đồng khác.
                            </li>
                          )}
                          {conflict.supervisors &&
                            conflict.supervisors.size > 0 && (
                              <li>
                                <strong>Trùng vai trò:</strong> Giảng viên hướng
                                dẫn{" "}
                                {Array.from(conflict.supervisors).join(", ")}{" "}
                                không được làm thành viên hội đồng cho đề tài
                                mình hướng dẫn.
                              </li>
                            )}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="card-title">{council.name}</h2>
                          {council.status === "draft" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                              BẢN NHÁP
                            </span>
                          )}
                        </div>
                        <p className="card-subtitle">
                          {formatCouncilSchedule(
                            council.defenseDate,
                            council.room,
                          )}
                        </p>
                        {council.description && (
                          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                            {council.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="btn-outline"
                          onClick={() => startEditingCouncil(council)}
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setCouncilToDelete(council)}
                        >
                          Xóa hội đồng
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div>
                        <p className="font-medium text-slate-700 mb-2">
                          Thành viên hội đồng
                        </p>
                        <div className="space-y-2">
                          {(council.members || []).map((member) => (
                            <div
                              key={member.teacher?._id}
                              className="rounded-lg bg-slate-50 p-3 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium text-slate-800">
                                  {member.teacher?.name}
                                </p>
                                <p className="text-sm text-slate-500 capitalize">
                                  {member.role === "chairman"
                                    ? "Chủ tịch"
                                    : member.role === "secretary"
                                      ? "Thư ký"
                                      : "Ủy viên"}
                                </p>
                              </div>
                              <span className="text-sm text-slate-500">
                                Trọng số {member.weight}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="font-medium text-slate-700">
                          Gán đề tài cho Hội đồng
                        </p>
                        <select
                          className="input"
                          value={assignForms[council._id]?.projectId || ""}
                          onChange={(event) =>
                            updateAssignForm(
                              council._id,
                              "projectId",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Chọn đề tài đã hoàn thành</option>
                          {eligibleProjects.map((project) => (
                            <option key={project._id} value={project._id}>
                              {project.groupName || project.title}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn-primary"
                          onClick={() => assignProject(council._id)}
                        >
                          Gán đề tài vào hội đồng
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="font-medium text-slate-700 mb-2">
                        Đề tài đã gán ({council.projects?.length || 0})
                      </p>
                      <div className="space-y-2">
                        {(council.projects || []).map((projectItem) => (
                          <div
                            key={projectItem.project?._id}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <p className="font-medium text-slate-800">
                              {projectItem.project?.groupName ||
                                projectItem.project?.title}
                            </p>
                            <p className="text-sm text-slate-500">
                              GV Hướng dẫn:{" "}
                              {projectItem.project?.supervisor?.name || "N/A"}
                            </p>
                            <p className="text-sm text-slate-500">
                              GV Phản biện:{" "}
                              {projectItem.reviewer?.name || "Chưa phân công"}
                            </p>
                            
                            <p className="text-sm text-slate-500">
                              Điểm tổng hợp:{" "}
                              {projectItem.weightedAverage ?? "Chưa có"} | Trạng
                              thái: {projectItem.status}
                            </p>
                            {projectItem.assessmentSummary && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3">
                                <div>
                                  <p className="text-xs uppercase text-slate-500">
                                    Điểm nhóm
                                  </p>
                                  <p className="font-semibold text-slate-800">
                                    {formatAssessmentScore(
                                      projectItem.assessmentSummary
                                        .teamFinalScore,
                                      "/10",
                                    )}{" "}
                                    |{" "}
                                    {projectItem.assessmentSummary
                                      .teamPassStatus === "passed"
                                      ? "ĐẠT"
                                      : "CHƯA ĐẠT"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase text-slate-500">
                                    Độ hoàn thiện QA
                                  </p>
                                  <p className="font-semibold text-slate-800">
                                    {projectItem.assessmentSummary
                                      .qaEvidenceSummary?.completenessPercent ||
                                      0}
                                    %
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase text-slate-500">
                                    CLO rủi ro
                                  </p>
                                  <p className="font-semibold text-red-600">
                                    {projectItem.assessmentSummary.cloResults
                                      ?.filter(
                                        (item) =>
                                          item.status === "not_achieved",
                                      )
                                      .map((item) => item.cloCode)
                                      .join(", ") || "Không có"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!council.projects ||
                          council.projects.length === 0) && (
                          <p className="text-slate-500 text-xs">
                            Chưa có đề tài nào được gán.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {paginatedCouncils.length === 0 && (
              <div className="card text-center py-8 text-slate-500">
                Không tìm thấy hội đồng nào phù hợp.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                Hiển thị{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredCouncils.length,
                  )}
                </span>{" "}
                đến{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredCouncils.length,
                  )}
                </span>{" "}
                trong số{" "}
                <span className="font-semibold text-slate-700">
                  {filteredCouncils.length}
                </span>{" "}
                hội đồng
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "scheduler" && (
        <div className="space-y-6">
          {/* Genetic Algorithm title banner */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">
                Tối ưu hóa Lịch Bảo vệ tự động
              </h2>
              <p className="text-blue-100 text-sm">
                Hệ thống tự động phân bổ phòng, phân công giảng viên và xếp slot
                bảo vệ tối ưu, tránh trùng lịch giáo viên/học sinh.
              </p>
            </div>
            <button
              onClick={handleRunScheduler}
              disabled={solving}
              className="btn-primary bg-white text-blue-700 hover:bg-blue-50 border-0 shadow-lg px-6 py-3 flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
            >
              {solving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Đang tính toán...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Bắt đầu lập lịch
                </>
              )}
            </button>
          </div>

          {/* Solver status loader */}
          {solving && (
            <div className="card bg-blue-50 border border-blue-200 p-6 flex items-center justify-center space-y-4 flex-col text-center">
              <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Đang chạy thuật toán tối ưu hóa
                </h3>
                <p className="text-slate-600 text-sm max-w-md mt-1">
                  Chạy tiến trình tính toán trong nền để tìm lịch tối ưu thỏa
                  mãn các ràng buộc cứng.
                </p>
              </div>
              {jobData && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 animate-pulse">
                  Trạng thái: {jobData.status}...
                </span>
              )}
            </div>
          )}

          {/* Results panel if complete */}
          {jobData && jobData.status === "completed" && (
            <div className="card border-2 border-emerald-500/30 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      Lịch nháp tự động đã được tạo
                    </h2>
                    <p className="text-xs text-slate-500">
                      Thời gian giải: {jobData.result?.executionTimeMs}ms |
                      fitnessScore: {jobData.result?.fitnessScore}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePublishSchedule}
                    className="btn-primary"
                  >
                    Công bố lịch trình
                  </button>
                  <button
                    onClick={handleDiscardSchedule}
                    className="btn-outline border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Hủy bản nháp
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">
                  Xem trước Hội đồng dự thảo
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobData.result?.generatedCouncils?.map((council, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800 text-sm">
                          {council.name}
                        </h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-semibold uppercase">
                          Dự thảo
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {getVietnameseDayOfWeek(council.defenseDate)}, ngày{" "}
                          {new Date(council.defenseDate).toLocaleDateString(
                            "vi-VN",
                          )}{" "}
                          vào lúc{" "}
                          {new Date(council.defenseDate).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          Phòng: {council.room}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Thành viên
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {council.members?.map((m, midx) => (
                            <span
                              key={midx}
                              className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded"
                            >
                              {m.role === "chairman"
                                ? "Chủ tịch: "
                                : m.role === "secretary"
                                  ? "Thư ký: "
                                  : "Ủy viên: "}
                              {teachers.find((t) => t._id === m.teacher)
                                ?.name || m.teacher}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Đề tài được phân bổ ({council.projects?.length})
                        </p>
                        <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded p-1 max-h-36 overflow-y-auto">
                          {council.projects?.map((p, pidx) => (
                            <div
                              key={pidx}
                              className="py-2 px-2 text-xs text-slate-700 first:pt-0 last:pb-0"
                            >
                              {pidx + 1}.{" "}
                              {projects.find((proj) => proj._id === p.project)
                                ?.title || p.project}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Configuration pools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Setup inputs column */}
            <div className="space-y-6 lg:col-span-1">
              {/* Classrooms list */}
              <div className="card space-y-4">
                <div className="card-header border-b border-slate-100 pb-3">
                  <h2 className="card-title text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Phòng bảo vệ khả dụng
                  </h2>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input py-1.5 text-sm"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="E.g., Phòng 302"
                  />
                  <button
                    onClick={handleAddRoom}
                    className="btn-primary py-1.5 px-3 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rooms.map((room) => (
                    <span
                      key={room}
                      className="text-xs bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1 flex items-center gap-1.5"
                    >
                      {room}
                      <button
                        onClick={() => handleRemoveRoom(room)}
                        className="text-slate-400 hover:text-red-500 font-bold text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {rooms.length === 0 && (
                    <p className="text-xs text-slate-400">Chưa có phòng nào.</p>
                  )}
                </div>
              </div>

              {/* Time slots list */}
              <div className="card space-y-4">
                <div className="card-header border-b border-slate-100 pb-3">
                  <h2 className="card-title text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    Khung thời gian (Sessions)
                  </h2>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-slate-500">Bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="input py-1 px-2 text-xs"
                        value={newSlot.startAt}
                        onChange={(e) =>
                          setNewSlot((prev) => ({
                            ...prev,
                            startAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-slate-500">Kết thúc</label>
                      <input
                        type="datetime-local"
                        className="input py-1 px-2 text-xs"
                        value={newSlot.endAt}
                        onChange={(e) =>
                          setNewSlot((prev) => ({
                            ...prev,
                            endAt: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddSlot}
                    className="btn-outline w-full py-1.5 text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Khung giờ
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {timeSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="py-2.5 flex justify-between items-center text-xs text-slate-700"
                    >
                      <div>
                        <p className="font-semibold">
                          {new Date(slot.startAt).toLocaleDateString()}
                        </p>
                        <p className="text-slate-500">
                          {new Date(slot.startAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(slot.endAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveSlot(index)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {timeSlots.length === 0 && (
                    <p className="text-xs text-slate-400 py-2">
                      Chưa có khung giờ nào.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Selector tables column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Projects pool */}
              <div className="card space-y-4">
                {(() => {
                  const activeProjects = projects.filter(
                    (p) =>
                      [
                        "approved",
                        "in_progress",
                        "created",
                        "pending",
                        "completed",
                      ].includes(p.status) && !p.councilId,
                  );
                  const filteredProjects = activeProjects.filter((p) => {
                    const search = projectSearchTerm.toLowerCase();
                    const title = (p.title || "").toLowerCase();
                    const groupName = (p.groupName || "").toLowerCase();
                    const supervisorName = (
                      p.supervisor?.name || ""
                    ).toLowerCase();
                    return (
                      title.includes(search) ||
                      groupName.includes(search) ||
                      supervisorName.includes(search)
                    );
                  });
                  const allFilteredSelected =
                    filteredProjects.length > 0 &&
                    filteredProjects.every((p) =>
                      selectedProjectIds.includes(p._id),
                    );

                  return (
                    <>
                      <div className="card-header border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="card-title text-sm flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-slate-500" />
                          Đề tài chưa xếp lịch (
                          {
                            selectedProjectIds.filter((id) =>
                              activeProjects.some((ap) => ap._id === id),
                            ).length
                          }
                          /{activeProjects.length})
                        </h2>
                        <button
                          onClick={() => {
                            const filteredIds = filteredProjects.map(
                              (p) => p._id,
                            );
                            if (allFilteredSelected) {
                              setSelectedProjectIds((prev) =>
                                prev.filter((id) => !filteredIds.includes(id)),
                              );
                            } else {
                              setSelectedProjectIds((prev) =>
                                Array.from(new Set([...prev, ...filteredIds])),
                              );
                            }
                          }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          {allFilteredSelected
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="px-4 pb-2 mt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm kiếm đề tài, nhóm, giảng viên hướng dẫn..."
                            className="input pl-9 py-1 text-xs w-full"
                            value={projectSearchTerm}
                            onChange={(e) =>
                              setProjectSearchTerm(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-semibold">
                            <tr>
                              <th className="px-4 py-3 w-10">Chọn</th>
                              <th className="px-4 py-3">Tên đề tài / Nhóm</th>
                              <th className="px-4 py-3">GV Hướng dẫn</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredProjects.map((proj) => (
                              <tr
                                key={proj._id}
                                className={`hover:bg-slate-50 cursor-pointer ${selectedProjectIds.includes(proj._id) ? "bg-blue-50/30" : ""}`}
                                onClick={() => handleToggleProject(proj._id)}
                              >
                                <td
                                  className="px-4 py-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedProjectIds.includes(
                                      proj._id,
                                    )}
                                    onChange={() =>
                                      handleToggleProject(proj._id)
                                    }
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {proj.groupName || proj.title}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {proj.supervisor?.name || "N/A"}
                                </td>
                              </tr>
                            ))}
                            {filteredProjects.length === 0 &&
                              activeProjects.length > 0 && (
                                <tr>
                                  <td
                                    colSpan="3"
                                    className="px-4 py-8 text-center text-slate-400"
                                  >
                                    Không tìm thấy đề tài nào phù hợp với từ
                                    khóa tìm kiếm.
                                  </td>
                                </tr>
                              )}
                            {activeProjects.length === 0 && (
                              <tr>
                                <td
                                  colSpan="3"
                                  className="px-4 py-8 text-center text-slate-400"
                                >
                                  Không có đề tài chưa xếp lịch. Tất cả đề tài
                                  đều đã được xếp lịch hoặc chưa đủ điều kiện.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Teachers pool */}
              <div className="card space-y-4">
                {(() => {
                  const activeTeachers = teachers.filter((t) => t.isActive);
                  const filteredTeachers = activeTeachers.filter((t) => {
                    const search = teacherSearchTerm.toLowerCase();
                    const name = (t.name || "").toLowerCase();
                    const department = (t.department || "Chung").toLowerCase();
                    const experties = (t.experties || []).map((exp) =>
                      exp.toLowerCase(),
                    );
                    return (
                      name.includes(search) ||
                      department.includes(search) ||
                      experties.some((exp) => exp.includes(search))
                    );
                  });
                  const allFilteredSelected =
                    filteredTeachers.length > 0 &&
                    filteredTeachers.every((t) =>
                      selectedTeacherIds.includes(t._id),
                    );

                  return (
                    <>
                      <div className="card-header border-b border-slate-100 pb-3 flex justify-between items-center">
                        <h2 className="card-title text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          Giảng viên khả dụng (
                          {
                            selectedTeacherIds.filter((id) =>
                              activeTeachers.some((at) => at._id === id),
                            ).length
                          }
                          /{activeTeachers.length})
                        </h2>
                        <button
                          onClick={() => {
                            const filteredIds = filteredTeachers.map(
                              (t) => t._id,
                            );
                            if (allFilteredSelected) {
                              setSelectedTeacherIds((prev) =>
                                prev.filter((id) => !filteredIds.includes(id)),
                              );
                            } else {
                              setSelectedTeacherIds((prev) =>
                                Array.from(new Set([...prev, ...filteredIds])),
                              );
                            }
                          }}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          {allFilteredSelected
                            ? "Bỏ chọn tất cả"
                            : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="px-4 pb-2 mt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm kiếm giảng viên, bộ môn, chuyên môn..."
                            className="input pl-9 py-1 text-xs w-full"
                            value={teacherSearchTerm}
                            onChange={(e) =>
                              setTeacherSearchTerm(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-semibold">
                            <tr>
                              <th className="px-4 py-3 w-10">Chọn</th>
                              <th className="px-4 py-3">Họ và tên</th>
                              <th className="px-4 py-3">Khoa / Bộ môn</th>
                              <th className="px-4 py-3">Chuyên môn</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredTeachers.map((teacher) => (
                              <tr
                                key={teacher._id}
                                className={`hover:bg-slate-50 cursor-pointer ${selectedTeacherIds.includes(teacher._id) ? "bg-blue-50/30" : ""}`}
                                onClick={() => handleToggleTeacher(teacher._id)}
                              >
                                <td
                                  className="px-4 py-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTeacherIds.includes(
                                      teacher._id,
                                    )}
                                    onChange={() =>
                                      handleToggleTeacher(teacher._id)
                                    }
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  {teacher.name}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {teacher.department || "Chung"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {teacher.experties
                                      ?.slice(0, 3)
                                      .map((exp, expIdx) => (
                                        <span
                                          key={expIdx}
                                          className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                                        >
                                          {exp}
                                        </span>
                                      ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredTeachers.length === 0 &&
                              activeTeachers.length > 0 && (
                                <tr>
                                  <td
                                    colSpan="4"
                                    className="px-4 py-8 text-center text-slate-400"
                                  >
                                    Không tìm thấy giảng viên nào phù hợp với từ
                                    khóa tìm kiếm.
                                  </td>
                                </tr>
                              )}
                            {activeTeachers.length === 0 && (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="px-4 py-8 text-center text-slate-400"
                                >
                                  Không tìm thấy giảng viên hoạt động trong hệ
                                  thống.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Lịch sử tối ưu lịch trình (Scheduler Run History) */}
          <div className="card space-y-4">
            <div className="card-header border-b border-slate-100 pb-3 flex justify-between items-center bg-slate-50/50">
              <h2 className="card-title text-sm flex items-center gap-2 font-bold text-slate-800">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                Lịch sử tối ưu lịch trình (Scheduler Run History)
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Tổng số: {schedulerJobs.length} lượt chạy
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Thời gian chạy</th>
                    <th className="px-4 py-3">Thuật toán</th>
                    <th className="px-4 py-3">Đầu vào</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3 text-right animate-none">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {schedulerJobs.map((job) => {
                    const dateStr = new Date(job.createdAt).toLocaleString(
                      "vi-VN",
                    );
                    const isSelected = jobData && jobData._id === job._id;
                    return (
                      <tr
                        key={job._id}
                        className={`hover:bg-slate-50 ${isSelected ? "bg-indigo-50/30" : ""}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {dateStr}
                        </td>
                        <td className="px-4 py-3 text-slate-500 capitalize">
                          {job.config?.solverType?.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {job.config?.projectIds?.length || 0} đề tài,{" "}
                          {job.config?.teacherIds?.length || 0} GV,{" "}
                          {job.config?.rooms?.length || 0} phòng
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              job.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : job.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : job.status === "processing"
                                    ? "bg-amber-100 text-amber-800 animate-pulse"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {job.status === "completed" && "Hoàn thành"}
                            {job.status === "failed" && "Thất bại"}
                            {job.status === "processing" && "Đang chạy"}
                            {job.status === "pending" && "Chờ xử lý"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {job.status === "completed" ? (
                            <span>
                              {job.result?.generatedCouncils?.length || 0} hội
                              đồng | Fitness: {job.result?.fitnessScore || 0}
                            </span>
                          ) : job.status === "failed" ? (
                            <span
                              className="text-red-500 truncate block max-w-xs"
                              title={job.error}
                            >
                              Lỗi: {job.error}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {job.status === "completed" && (
                            <button
                              onClick={() => handleViewJobDetails(job._id)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                                isSelected
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {isSelected ? "Đang xem" : "Xem bản nháp"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {schedulerJobs.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        Chưa có lịch sử chạy lập lịch tự động nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "grid" && (
        <div className="space-y-6">
          {/* Week Selector Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newMonday = new Date(currentWeekStart);
                  newMonday.setDate(newMonday.getDate() - 7);
                  setCurrentWeekStart(newMonday);
                }}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-800 text-sm md:text-base">
                Tuần: {new Date(currentWeekStart).toLocaleDateString("vi-VN")} -{" "}
                {(() => {
                  const sunday = new Date(currentWeekStart);
                  sunday.setDate(sunday.getDate() + 6);
                  return sunday.toLocaleDateString("vi-VN");
                })()}
              </span>
              <button
                onClick={() => {
                  const newMonday = new Date(currentWeekStart);
                  newMonday.setDate(newMonday.getDate() + 7);
                  setCurrentWeekStart(newMonday);
                }}
                className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setCurrentWeekStart(getMonday(new Date()))}
              className="btn-outline text-xs px-4 py-2 border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
            >
              Tuần hiện tại
            </button>
          </div>

          {/* Matrix table render */}
          {(() => {
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
              const d = new Date(currentWeekStart);
              d.setDate(currentWeekStart.getDate() + i);
              weekDates.push(d);
            }
            const DAY_LABELS = [
              "Thứ 2",
              "Thứ 3",
              "Thứ 4",
              "Thứ 5",
              "Thứ 6",
              "Thứ 7",
              "Chủ nhật",
            ];
            const PERIODS = Array.from({ length: 15 }, (_, i) => {
              const p = i + 1;
              const startHour = p + 6;
              return {
                id: p,
                name: `Tiết ${p}`,
                time: `${startHour < 10 ? "0" + startHour : startHour}:00`,
                startHour,
              };
            });

            return (
              <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 border-collapse table-fixed">
                  <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      {/* Left arrow column header */}
                      <th className="border-r border-b border-slate-200 text-center w-16 shrink-0 bg-slate-50 z-10 sticky left-0 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                        <button
                          onClick={() => {
                            const newMonday = new Date(currentWeekStart);
                            newMonday.setDate(newMonday.getDate() - 7);
                            setCurrentWeekStart(newMonday);
                          }}
                          className="w-full py-3 flex items-center justify-center hover:bg-slate-100 transition-colors"
                          title="Tuần trước"
                        >
                          <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                      </th>
                      {weekDates.map((day, idx) => {
                        const dateStr = day.toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                        });
                        const isToday =
                          new Date().toDateString() === day.toDateString();
                        return (
                          <th
                            key={idx}
                            className={`px-4 py-3 border-r border-b border-slate-200 text-center w-52 min-w-[13rem] ${isToday ? "bg-blue-50 text-blue-700 font-bold" : ""}`}
                          >
                            <div>{DAY_LABELS[idx]}</div>
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              ({dateStr})
                            </div>
                          </th>
                        );
                      })}
                      {/* Right arrow column header */}
                      <th className="border-b border-slate-200 text-center w-16 bg-slate-50">
                        <button
                          onClick={() => {
                            const newMonday = new Date(currentWeekStart);
                            newMonday.setDate(newMonday.getDate() + 7);
                            setCurrentWeekStart(newMonday);
                          }}
                          className="w-full py-3 flex items-center justify-center hover:bg-slate-100 transition-colors"
                          title="Tuần sau"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700 bg-white">
                    {PERIODS.map((period) => (
                      <tr
                        key={period.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Period label column */}
                        <td className="font-semibold text-center text-slate-800 border-r border-slate-200 bg-slate-50 z-10 sticky left-0 shadow-[1px_0_0_0_rgba(226,232,240,1)] align-middle w-16 py-3">
                          {period.name}
                        </td>
                        {/* Day cells */}
                        {weekDates.map((day, dayIdx) => {
                          const dayPeriodCouncils = councils.filter((c) => {
                            if (!c.defenseDate) return false;
                            const cDate = new Date(c.defenseDate);
                            const matchesDay =
                              cDate.toDateString() === day.toDateString();
                            const matchesPeriod =
                              getPeriodFromDate(c.defenseDate) === period.id;
                            return matchesDay && matchesPeriod;
                          });

                          return (
                            <td
                              key={dayIdx}
                              className="px-3 py-3 border-r border-slate-200 align-top"
                            >
                              {dayPeriodCouncils.length === 0 ? (
                                <div
                                  className="group flex flex-col items-center justify-center h-24 border border-dashed border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 cursor-pointer"
                                  onClick={() => {
                                    setEditingCouncilId(null);
                                    const prefilledDate = new Date(day);
                                    prefilledDate.setHours(
                                      period.startHour,
                                      0,
                                      0,
                                      0,
                                    );
                                    setForm({
                                      ...createEmptyCouncilForm(),
                                      defenseDate:
                                        formatDateTimeInput(prefilledDate),
                                    });
                                    setIsFormModalOpen(true);
                                  }}
                                >
                                  <span className="text-slate-400 font-medium group-hover:text-slate-600 transition-colors">
                                    Trống
                                  </span>
                                  <span className="mt-1.5 opacity-0 group-hover:opacity-100 btn-outline py-0.5 px-2 text-[10px] flex items-center gap-1 bg-white border-slate-200 text-slate-600 shadow-sm transition-all duration-200">
                                    <Plus className="w-3 h-3" />
                                    Xếp lịch
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {dayPeriodCouncils.map((council) => {
                                    const conflict = conflictsMap[council._id];
                                    const hasConflict =
                                      conflict &&
                                      (conflict.room ||
                                        conflict.teachers.size > 0 ||
                                        conflict.projects.size > 0 ||
                                        (conflict.supervisors &&
                                          conflict.supervisors.size > 0));
                                    const formattedTime = new Date(
                                      council.defenseDate,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });

                                    return (
                                      <div
                                        key={council._id}
                                        onClick={() =>
                                          startEditingCouncil(council)
                                        }
                                        className={`p-2.5 rounded-lg border text-left shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 ${
                                          hasConflict
                                            ? "bg-red-50/50 border-red-200 hover:bg-red-50 text-red-900"
                                            : council.status === "draft"
                                              ? "bg-amber-50/30 border-amber-200 hover:bg-amber-50/60"
                                              : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                          <span className="font-bold text-slate-800 tracking-tight leading-tight line-clamp-2">
                                            {council.name}
                                          </span>
                                          {hasConflict && (
                                            <AlertCircle
                                              className="w-4 h-4 text-red-600 shrink-0"
                                              title={
                                                conflict.supervisors &&
                                                conflict.supervisors.size > 0
                                                  ? "Vi phạm vai trò: Giảng viên hướng dẫn trong hội đồng!"
                                                  : "Phát hiện trùng lịch!"
                                              }
                                            />
                                          )}
                                        </div>

                                        <div className="text-[10px] text-slate-500 space-y-1">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>{formattedTime}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate">
                                              Phòng:{" "}
                                              {council.room || "Chưa xếp"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate">
                                              CT:{" "}
                                              {council.members?.find(
                                                (m) => m.role === "chairman",
                                              )?.teacher?.name || "N/A"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>
                                              {council.projects?.length || 0} Đề
                                              tài
                                            </span>
                                          </div>
                                        </div>

                                        {hasConflict && (
                                          <div className="mt-1.5 text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-semibold text-center uppercase tracking-wide">
                                            Trùng lịch/Vai trò
                                          </div>
                                        )}
                                        {council.status === "draft" &&
                                          !hasConflict && (
                                            <div className="mt-1.5 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold text-center uppercase tracking-wide">
                                              Dự thảo (Nháp)
                                            </div>
                                          )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        {/* Time label column */}
                        <td className="font-semibold text-center text-slate-800 bg-slate-50 border-l border-slate-200 align-middle w-16 py-3">
                          {period.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Form Dialog Modal (Create / Edit Council) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingCouncilId
                    ? "Chỉnh sửa Hội đồng bảo vệ"
                    : "Tạo Hội đồng bảo vệ mới"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {editingCouncilId
                    ? "Cập nhật thông tin hội đồng và thành viên. Không thể đổi thành viên sau khi bắt đầu chấm điểm."
                    : "Chủ tịch hội đồng và thư ký là bắt buộc. Chủ tịch sẽ phân công giáo viên nhận xét (reviewer) sau."}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <FieldBlock
                label="C1. Tên Hội đồng bảo vệ"
                hint='Ví dụ: "Hội đồng bảo vệ tốt nghiệp - Kỹ thuật phần mềm - Đợt 1 - Nhóm 2"'
              >
                <input
                  className="input"
                  placeholder="Nhập tên hội đồng..."
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </FieldBlock>

              <FieldBlock
                label="C2. Mô tả Hội đồng"
                hint="Nhập mô tả ngắn về đợt bảo vệ, ngành học hoặc ghi chú của quản trị viên."
              >
                <textarea
                  className="input min-h-20"
                  placeholder="Nhập mô tả ngắn..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </FieldBlock>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldBlock
                  label={`C3. Ngày và Giờ bảo vệ${form.defenseDate ? ` (${getVietnameseDayOfWeek(form.defenseDate)})` : ""}`}
                  hint="Thời gian chính thức hội đồng bắt đầu làm việc."
                >
                  <input
                    className="input"
                    type="datetime-local"
                    value={form.defenseDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        defenseDate: event.target.value,
                      }))
                    }
                  />
                </FieldBlock>
                <FieldBlock
                  label="C4. Phòng bảo vệ / Meeting Link"
                  hint="Nhập tên phòng, tên phòng lab hoặc link họp trực tuyến (Google Meet/Teams)."
                >
                  <input
                    className="input"
                    placeholder="Ví dụ: Phòng B305 hoặc link Google Meet"
                    value={form.room}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        room: event.target.value,
                      }))
                    }
                  />
                </FieldBlock>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-slate-700">
                  Thành viên hội đồng
                </p>
                {form.members.map((member, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50"
                  >
                    <div className="md:col-span-3 border-b border-slate-200 pb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800">
                          C5.{index + 1}. Thành viên hội đồng {index + 1}
                        </p>
                        <p className="text-xs text-slate-500">
                          {member.role === "chairman"
                            ? "Bắt buộc: Chọn Chủ tịch để điều phối hội đồng và phân công GV nhận xét (Reviewer)."
                            : member.role === "secretary"
                              ? "Bắt buộc: Chọn Thư ký để ghi chép biên bản cuộc họp bảo vệ."
                              : "Tùy chọn: Thêm thành viên hội đồng và thiết lập trọng số điểm tương ứng."}
                        </p>
                      </div>
                      {member.role === "member" && (
                        <button
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                          onClick={() => removeMember(index)}
                        >
                          Xóa thành viên
                        </button>
                      )}
                    </div>
                    <FieldBlock
                      label="Giảng viên"
                      hint="Chọn giảng viên đảm nhiệm vị trí này."
                    >
                      <select
                        className="input"
                        value={member.teacher}
                        onChange={(event) =>
                          handleMemberChange(
                            index,
                            "teacher",
                            event.target.value,
                          )
                        }
                      >
                        <option value="">Chọn giảng viên</option>
                        {teachers.map((teacher) => (
                          <option
                            key={teacher._id}
                            value={teacher._id}
                            disabled={isTeacherSelectedInOtherMember(
                              index,
                              teacher._id,
                            )}
                          >
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </FieldBlock>
                    <FieldBlock
                      label="Vai trò"
                      hint="Vai trò của giảng viên trong hội đồng."
                    >
                      <select
                        className="input"
                        value={member.role}
                        onChange={(event) =>
                          handleMemberChange(index, "role", event.target.value)
                        }
                      >
                        <option
                          value="chairman"
                          disabled={isRoleTakenInOtherMember(index, "chairman")}
                        >
                          Chủ tịch
                        </option>
                        <option
                          value="secretary"
                          disabled={isRoleTakenInOtherMember(
                            index,
                            "secretary",
                          )}
                        >
                          Thư ký
                        </option>
                        <option value="member">
                          Thành viên khác (Ủy viên)
                        </option>
                      </select>
                    </FieldBlock>
                    <FieldBlock
                      label="Trọng số điểm"
                      hint="Hệ số điểm đóng góp vào điểm trung bình hội đồng."
                    >
                      <input
                        className="input"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={member.weight}
                        onChange={(event) =>
                          handleMemberChange(
                            index,
                            "weight",
                            event.target.value,
                          )
                        }
                        placeholder="Ví dụ: 1 hoặc 1.5"
                      />
                    </FieldBlock>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="btn-outline"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      members: [...current.members, createMember("member", 1)],
                    }))
                  }
                >
                  Thêm thành viên hội đồng
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl shrink-0">
              {editingCouncilId && (
                <button
                  className="btn-danger mr-auto px-4 py-2 flex items-center gap-1.5"
                  onClick={() => {
                    const currentCouncil = councils.find(
                      (c) => c._id === editingCouncilId,
                    ) || { _id: editingCouncilId, name: form.name };
                    setCouncilToDelete(currentCouncil);
                    setIsFormModalOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa Hội đồng
                </button>
              )}
              <button className="btn-outline" onClick={resetForm}>
                Hủy bỏ
              </button>
              <button className="btn-primary px-6" onClick={saveCouncil}>
                {editingCouncilId ? "Cập nhật" : "Tạo hội đồng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {councilToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center mb-4 justify-center">
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Xóa Hội đồng bảo vệ
              </h3>
              <p className="text-sm text-slate-500 mb-2">
                Bạn có chắc chắn muốn xóa hội đồng{" "}
                <strong>{councilToDelete.name}</strong>?
              </p>
              <p className="text-sm text-slate-500 mb-5">
                Các đề tài đã được gán vào hội đồng này sẽ tự động gỡ liên kết
                và quay về trạng thái chưa gán hội đồng.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  className="btn-outline"
                  onClick={() => setCouncilToDelete(null)}
                >
                  Hủy bỏ
                </button>
                <button className="btn-danger" onClick={handleDeleteCouncil}>
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilsPage;
