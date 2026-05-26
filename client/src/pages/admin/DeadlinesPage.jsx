import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createDeadline } from "../../store/slices/deadlineSlice";
import { X } from "lucide-react";
const DeadlinesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    projectTitle: "",
    studentName: "",
    supervisor: "",
    deadlineDate: "",
    description: "",
  });

  const [selectedProject, setSelectedProject] = useState(null);
  const [query, setQuery] = useState("");
  const dispatch = useDispatch();
  const { projects } = useSelector((state) => state.admin);

  const [viewProjects, setViewProjects] = useState(projects || []);

  useEffect(() => {
    setViewProjects(projects || []);
  }, [projects]);

  const projectRows = useMemo(() => {
    return (viewProjects || []).map((p) => ({
      _id: p._id,
      title: p.title,
      studentName: p.student?.name || "-",
      studentEmail: p.student?.email || "-",
      studentDept: p.student?.department || "-",
      supervisor: p.supervisor?.name || "-",
      deadline: p.deadline
        ? new Date(p.deadline).toISOString().slice(0, 10)
        : "-",
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "-",
      raw: p,
    }));
  }, [viewProjects]);

  const filteredProjects = projectRows.filter((row) => {
    const matchesSearch =
      (row.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.studentName || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProject || !formData.deadlineDate) return;
    
    const isUpdate = !!selectedProject.deadline;
    
    let deadlineData = {
      //projectId: selectedProject?.student?.name,
      //dueDate: selectedProject?.deadlineData,
      // project: selectedProject?._id,
      name: `Deadline for ${selectedProject.title}`,
      dueDate: formData.deadlineDate,
    };

    try {
      // const updated = await dispatch(
      const result = await dispatch(
        createDeadline({ id: selectedProject._id, data: deadlineData, isUpdate }),
      ).unwrap();
      // const updatedProject = updated?.project || updated;
      
      const updatedDeadline = result.deadline || result;
      const updatedProject = updatedDeadline.project || updatedDeadline;

      if (updatedProject?._id) {
        setViewProjects((prev) =>
          prev.map((p) =>
            p._id === updatedProject._id ? { ...p, ...updatedProject } : p,
          ),
        );
      }
    } catch (err) {
      console.error("Failed to save deadline: ", err);
    } finally {
      setShowModal(false);
      setFormData({
        projectTitle: "",
        studentName: "",
        supervisor: "",
        deadlineDate: "",
        description: "",
      });
      setSelectedProject(null);
      setQuery("");
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="card">
          <div className="card-header flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="">
              <h1 className="card-title">Manage Deadlines</h1>
              <p className="card-subtitle">
                Create and monitor project deadlines
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-4 md:mt-0"
            >
              Create/Update Deadline
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Deadlines
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full"
                placeholder="Search by project or student..."
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Project Deadlines</h2>
          </div>
          <div className="overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Project Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Supervisor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Deadline
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProjects.map((row) => {
                  return (
                    <tr className="hover:bg-slate-50" key={row._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {row.studentName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {row.studentEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{row.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.supervisor !== "-" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {row.supervisor}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{row.deadline}</td>
                      <td className="px-6 py-4">{row.updatedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No projects found matching your criteria
            </div>
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Create or Update Deadline
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="">
                  <label className="label">Project Title</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Start typing to search projects..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedProject(null);
                      setFormData({
                        ...formData,
                        projectTitle: e.target.value,
                      });
                    }}
                  />
                  {query && !selectedProject && (
                    <div className="mt-2 border border-slate-200 rounded-md max-h-56 overflow-y-auto">
                      {(projects || [])
                        .filter((p) =>
                          (p.title || "")
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .slice(0, 8)
                        .map((p) => (
                          <button
                            type="button"
                            key={p._id}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50"
                            onClick={() => {
                              setSelectedProject(p);
                              setQuery(p.title);
                              setFormData({
                                ...formData,
                                projectTitle: p.title,
                                deadlineDate: p.deadline
                                  ? new Date(p.deadline)
                                      .toISOString()
                                      .slice(0, 10)
                                  : "",
                              });
                            }}
                            title={p.title}
                          >
                            <div className="font-medium text-sm text-slate-800 truncate">
                              {p.title}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {p.student?.name || "-"}{" "}
                              {p.supervisor?.name || "-"}
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div className="">
                  <label htmlFor="" className="label">
                    Deadline
                  </label>
                  <input
                    type="date"
                    className="input-field w-full"
                    disabled={!selectedProject}
                    value={formData.deadlineDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deadlineDate: e.target.value,
                      })
                    }
                  />
                </div>

                {selectedProject && (
                  <div className="mt-4 border border-slate-200 rounded-lg bg-slate-50 p-4">
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-slate-900">
                        Project Details
                      </div>
                      <div
                        className="text-sm truncate text-slate-700"
                        title={selectedProject.description || ""}
                      >
                        {(selectedProject.description || "").length > 160
                          ? `${selectedProject.description.slice(0, 160)}...`
                          : selectedProject.description}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="">
                        <div className="text-xs text-slate-500">Status</div>
                        <div className="text-sm font-medium text-slate-800">
                          {selectedProject.status || "Unknown"}
                        </div>
                      </div>
                      <div className="">
                        <div className="text-xs text-slate-500">Supervisor</div>
                        <div className="text-sm font-medium text-slate-800">
                          {selectedProject.supervisor?.name || "Unknown"}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-xs text-slate-500">Student</div>
                        <div className="text-sm font-medium text-slate-800">
                          {selectedProject.student?.name || "-"} -{" "}
                          {selectedProject.student?.email || "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Deadline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default DeadlinesPage;
