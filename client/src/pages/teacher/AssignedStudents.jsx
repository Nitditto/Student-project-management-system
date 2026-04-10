import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MessageSquare,
  CheckCircle,
  X,
  Loader,
  Search,
  Filter,
} from "lucide-react";
import {
  addFeedback,
  getAssignedStudents,
  markComplete,
} from "../../store/slices/teacherSlice";

const AssignedStudents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [feedbackData, setFeedbackData] = useState({
    title: "",
    message: "",
    type: "general",
  });

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAssignedStudents());
  }, [dispatch]);

  const { assignedStudents, loading, error } = useSelector(
    (state) => state.teacher,
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border border-green-200";
      case "approved":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "rejected":
        return "bg-red-100 text-red-700 border border-red-200";
      default:
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "approved":
        return "Approved";
      default:
        return "Pending";
    }
  };

  const handleFeedback = (student) => {
    setSelectedStudent(student);
    setFeedbackData({
      title: "",
      message: "",
      type: "general",
    });
    setShowFeedbackModal(true);
  };

  const handleMarkComplete = (student) => {
    setSelectedStudent(student);
    setShowCompleteModal(true);
  };

  const closeModal = () => {
    setShowFeedbackModal(false);
    setShowCompleteModal(false);
    setSelectedStudent(null);
    setFeedbackData({
      title: "",
      message: "",
      type: "general",
    });
  };

  const submitFeedback = () => {
    if (
      selectedStudent?.project?._id &&
      feedbackData.title &&
      feedbackData.message
    ) {
      dispatch(
        addFeedback({
          projectId: selectedStudent.project._id,
          feedback: feedbackData,
        }),
      );
      closeModal();
    }
  };

  const confirmMarkComplete = () => {
    if (selectedStudent?.project?._id) {
      dispatch(markComplete(selectedStudent.project._id));
      closeModal();
    }
  };

  const sortedStudents = [...(assignedStudents || [])].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "lastActivity": {
        const dateA = a.project?.updatedAt
          ? new Date(a.project.updatedAt)
          : new Date(0);
        const dateB = b.project?.updatedAt
          ? new Date(b.project.updatedAt)
          : new Date(0);
        return dateB - dateA;
      }
      default:
        return 0;
    }
  });

  const stats = [
    {
      label: "Total Students",
      value: sortedStudents.length,
      bg: "bg-blue-50",
      text: "text-blue-700",
      sub: "text-blue-600",
    },
    {
      label: "Projects Completed",
      value: sortedStudents.filter((s) => s.project?.status === "completed")
        .length,
      bg: "bg-green-50",
      text: "text-green-700",
      sub: "text-green-600",
    },
    {
      label: "In Progress",
      value: sortedStudents.filter((s) => s.project?.status === "in_progress")
        .length,
      // value: sortedStudents.filter(
      //   (s) =>
      //     s.project?.status === "approved" || s.project?.status === "pending",
      // ).length,
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      sub: "text-yellow-600",
    },
    {
      label: "Total Projects",
      value: sortedStudents.length,
      bg: "bg-purple-50",
      text: "text-purple-700",
      sub: "text-purple-600",
    },
  ];

  if (loading) return <Loader className="animate-spin w-16 h-16" />;
  if (error)
    return (
      <div className="text-center py-10 text-red-600 font-medium">
        Error loading students
      </div>
    );

  return (
    <>
      <div className="space-y-6">
        {/* Header */}

        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Assigned Students</h1>
            <p className="card-subtitle">
              Manage your assigned students and their projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {stats.map((item) => {
              return (
                <div className={`${item.bg} rounded-lg p-4`} key={item.label}>
                  <p className={`${item.sub} text-sm`}>{item.label}</p>
                  <p className={`${item.text} text-2xl font-bold`}>
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* students grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedStudents.map((student) => {
            return (
              <div
                className="card hover:shadow-lg transition-all duration-300"
                key={student._id}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {student.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "S"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {student.name}
                      </h3>
                      <p className="text-sm text-slate-800">{student.email}</p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(student.project?.status)}`}
                  >
                    {getStatusText(student.project?.status)}
                  </span>
                </div>

                <div className="mb-5">
                  <h4 className="font-medium text-slate-700 mb-1">
                    {student.project?.title || "No project title"}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Last Update:{" "}
                    {new Date(
                      student.project?.updatedAt || new Date(),
                    ).toLocaleDateString()}
                  </p>
                </div>

                {/* Action */}
                <div className="flex gap-3">
                  <button
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
                    onClick={() => handleFeedback(student)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Feedback
                  </button>

                  <button
                    className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg transition-all ${
                      student?.project?.status === "complete"
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-green-700"
                    }`}
                    disabled={student.project?.status === "completed"}
                    onClick={() => handleMarkComplete(student)}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Complete
                  </button>
                </div>
              </div>
            );
          })}

          {sortedStudents.length === 0 && (
            <div className="card">No assigned students found</div>
          )}
        </div>
        {/* Feedback modal */}
        {showFeedbackModal && selectedStudent && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeModal}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full transform scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">
                    Provide Feedback
                  </h2>
                  <button
                    className="text-slate-400 hover:text-slate-600"
                    onClick={closeModal}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Project info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="">
                    <span className="text-slate-500">Project:</span>
                    <span className="ml-2 text-slate-800">
                      {selectedStudent.project?.title || "No title"}
                    </span>
                  </div>
                  <div className="">
                    <span className="text-slate-500">Student:</span>
                    <span className="ml-2 text-slate-800">
                      {selectedStudent.name}
                    </span>
                  </div>

                  {selectedStudent.project?.deadline && (
                    <div className="">
                      <span className="font-medium text-slate-600">
                        Deadline:
                      </span>
                      <span className="ml-2 text-slate-800">
                        {new Date(
                          selectedStudent.project?.deadline,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <span className="font-medium text-slate-600">
                      Last Updated:
                    </span>
                    <span className="ml-2 text-slate-800">
                      {new Date(
                        selectedStudent.project?.updatedAt || new Date(),
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Feedback form */}
                <div className="space-y-4">
                  <div className="mt-5">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Feedback Title
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter feedback title"
                      value={feedbackData.title}
                      type="text"
                      onChange={(e) =>
                        setFeedbackData({
                          ...feedbackData,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Feedback Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={feedbackData.type}
                      onChange={(e) =>
                        setFeedbackData({
                          ...feedbackData,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="general">General</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Feedback Message
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Write your feedback here..."
                      rows={4}
                      value={feedbackData.message}
                      onChange={(e) =>
                        setFeedbackData({
                          ...feedbackData,
                          message: e.target.value,
                        })
                      }
                    />
                  </div>

                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    className="btn-danger"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!feedbackData.title || !feedbackData.message}
                    onClick={submitFeedback}
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Complete modal */}
        {showCompleteModal && selectedStudent && (
          <div className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full transform scale-100 transition-all " onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800">Mark Project as Completed?</h2>
                  <button className="text-slate-400 hover:text-slate-600" onClick={closeModal}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 mb-6">
                  <div className="space-y-2 text-sm">
                    <div className="">
                      <span className="font-medium text-slate-600">Student</span>
                      <span className="ml-2 text-slate-800">
                        {selectedStudent.name}
                      </span>
                    </div>
                    <div className="">
                      <span className="font-medium text-slate-600">Project</span>
                      <span className="ml-2 text-slate-800">
                        {selectedStudent.project?.title || "No title"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-600 mb-6">
                  Are you sure you want to mark this project as completed? This action cannot be undone.
                </p>

                <div className="flex gap-3 mt-6">
                  <button
                    className="btn-danger"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={confirmMarkComplete}
                  >
                    Mark as Completed
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AssignedStudents;
