import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchTeacherDeadlines,
  createDeadline,
  updateDeadline,
  deleteDeadline,
  fetchTeacherMatrix,
} from "../../store/slices/deadlineSlice";
import { Plus, Edit, Trash2, Calendar, X, FileText, AlignLeft, Users, FileSpreadsheet, Layers } from "lucide-react";
import { toast } from "react-toastify";

const DeadlineManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { deadlines, matrix, loading } = useSelector((state) => state.deadline);
  const teacherProjects = matrix?.matrix?.map(row => row.project) || [];
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDeadline, setCurrentDeadline] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [targetType, setTargetType] = useState("all"); // "all" or "specific"
  const [selectedGroups, setSelectedGroups] = useState([]); // array of group IDs
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    dispatch(fetchTeacherDeadlines());
    dispatch(fetchTeacherMatrix());
  }, [dispatch]);

  const handleOpenModal = (deadline = null) => {
    if (deadline) {
      setIsEditMode(true);
      setCurrentDeadline(deadline);
      const formatLocal = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      };

      setFormData({
        title: deadline.title,
        description: deadline.description,
        startDate: formatLocal(deadline.startDate),
        endDate: formatLocal(deadline.endDate),
      });

      if (deadline.assignedGroups && deadline.assignedGroups.length > 0) {
        setTargetType("specific");
        setSelectedGroups(deadline.assignedGroups.map(g => g._id || g));
      } else {
        setTargetType("all");
        setSelectedGroups([]);
      }
    } else {
      setIsEditMode(false);
      setCurrentDeadline(null);
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
      });
      setTargetType("all");
      setSelectedGroups([]);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDeadline(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.endDate || !formData.startDate) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsSaving(true);
    const payload = {
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      assignedGroups: targetType === "all" ? [] : selectedGroups,
    };

    try {
      if (isEditMode) {
        await dispatch(
          updateDeadline({
            deadlineId: currentDeadline._id,
            data: payload,
          })
        ).unwrap();
      } else {
        await dispatch(createDeadline(payload)).unwrap();
      }
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save deadline", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deadlineId) => {
    if (window.confirm("Are you sure you want to delete this deadline?")) {
      await dispatch(deleteDeadline(deadlineId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex flex-col md:flex-row items-start justify-between md:items-center">
          <div>
            <h1 className="card-title">Deadline Management</h1>
            <p className="card-subtitle">
              Create and manage project submission deadlines for your groups
            </p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <button
              className="btn btn-outline flex items-center space-x-2 bg-white border border-slate-300 px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => navigate("/teacher/group-progress")}
            >
              <Users className="w-5 h-5" />
              <span>Group Progress Overview</span>
            </button>
            <button
              className="btn btn-primary flex items-center space-x-2"
              onClick={() => handleOpenModal()}
            >
              <Plus className="w-5 h-5" />
              <span>Create Deadline</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Deadlines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Title & Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Applies To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading && deadlines.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500">
                    Loading deadlines...
                  </td>
                </tr>
              ) : deadlines.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500">
                    No deadlines found. Create one to get started.
                  </td>
                </tr>
              ) : (
                deadlines.map((deadline) => (
                  <tr key={deadline._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {deadline.title}
                      </div>
                      <div className="text-sm text-slate-500 max-w-md truncate">
                        {deadline.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {deadline.assignedGroups && deadline.assignedGroups.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {deadline.assignedGroups.map((group) => {
                            // Find the project details from state if needed, or use populated values
                            const matchedProject = teacherProjects.find(p => p._id === (group._id || group));
                            const gName = matchedProject?.groupName || group.groupName || matchedProject?.title || group.title || "Group";
                            return (
                              <span key={group._id || group} className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                {gName}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                          All Groups
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {deadline.startDate
                          ? new Date(deadline.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        {deadline.endDate
                          ? new Date(deadline.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/teacher/deadlines/${deadline._id}/submissions`)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View Submissions"
                        >
                          <FileSpreadsheet className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(deadline)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(deadline._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                {isEditMode ? "Edit Deadline" : "Create New Deadline"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="input w-full pl-10"
                    placeholder="E.g., Final Project Submission"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <AlignLeft className="w-5 h-5 text-slate-400" />
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="input w-full pl-10 py-3"
                    placeholder="Details about the submission requirements..."
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="input w-full"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Assignees (Đối tượng áp dụng)
                </label>
                <div className="flex items-center space-x-4 mb-3">
                  <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      value="all"
                      checked={targetType === "all"}
                      onChange={() => setTargetType("all")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>All assigned groups</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      value="specific"
                      checked={targetType === "specific"}
                      onChange={() => setTargetType("specific")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Specific groups</span>
                  </label>
                </div>

                {targetType === "specific" && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-40 overflow-y-auto space-y-2">
                    {teacherProjects.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">No supervised groups found</p>
                    ) : (
                      teacherProjects.map((project) => {
                        const label = project.groupName || project.title || "Unnamed Group";
                        const isChecked = selectedGroups.includes(project._id);
                        return (
                          <label key={project._id} className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedGroups(prev => prev.filter(id => id !== project._id));
                                } else {
                                  setSelectedGroups(prev => [...prev, project._id]);
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadlineManagement;
