import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTeacherDeadlines,
  createDeadline,
  updateDeadline,
  deleteDeadline,
} from "../../store/slices/deadlineSlice";
import { Plus, Edit, Trash2, Calendar, X, FileText, AlignLeft } from "lucide-react";
import { toast } from "react-toastify";

const DeadlineManagement = () => {
  const dispatch = useDispatch();
  const { deadlines, loading } = useSelector((state) => state.deadline);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDeadline, setCurrentDeadline] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    dispatch(fetchTeacherDeadlines());
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
    } else {
      setIsEditMode(false);
      setCurrentDeadline(null);
      setFormData({
        title: "",
        description: "",
        startDate: "",
        endDate: "",
      });
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
    try {
      if (isEditMode) {
        await dispatch(
          updateDeadline({
            deadlineId: currentDeadline._id,
            data: formData,
          })
        ).unwrap();
      } else {
        await dispatch(createDeadline(formData)).unwrap();
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
          <button
            className="btn btn-primary flex items-center space-x-2 mt-4 md:mt-0"
            onClick={() => handleOpenModal()}
          >
            <Plus className="w-5 h-5" />
            <span>Create Deadline</span>
          </button>
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
                  <td colSpan="4" className="text-center py-8 text-slate-500">
                    Loading deadlines...
                  </td>
                </tr>
              ) : deadlines.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-slate-500">
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
