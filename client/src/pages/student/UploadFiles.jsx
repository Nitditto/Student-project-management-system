import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  downloadFile,
  fetchProject,
  uploadFiles,
} from "../../store/slices/studentSlice";
import { Archive, File, FileText, FileCode, FilePlus } from "lucide-react";

const UploadFiles = () => {
  const dispatch = useDispatch();

  const { project, files } = useSelector((state) => state.student);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const reportRef = useRef(null);
  const presRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (!project) {
      dispatch(fetchProject());
    }
  }, [dispatch]);

  const handleFilePick = (e) => {
    const list = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...list]);
    e.target.value = "";
  };
  const handleUpload = (e) => {
    const activeProject = project;
    // if(!activeProject) {
    //   const action = dispatch(fetchProject());
    //   if(action.fulfilled.match(action)) {
    //     activeProject = action.payload?.project || action.payload;
    //   }
    // }

    if (selectedFiles.length === 0) return;
    dispatch(uploadFiles({ projectId: project?._id, files: selectedFiles }));
    setSelectedFiles([]);
  };

  const removeSelected = (name) => {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <File className="w-5 h-5 text-slate-500" />;
    const extension = fileName.split(".").pop().toLowerCase();
    const Icon = ({ className }) => <File className={className} />;
    const color =
      extension === "pdf"
        ? "text-red-500"
        : ["doc", "docx"].includes(extension)
          ? "text-blue-500"
          : ["ppt", "pptx"].includes(extension)
            ? "text-orange-500"
            : "text-slate-500";
    return <Icon className={`w-5 h-5 ${color}`} />;
  };

  const handleDownloadFile = async (file) => {
    const res = await dispatch(
      downloadFile({ projectId: project._id, fileId: file._id }),
    ).then((res) => {
      const { blob } = res.payload;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.originalName || "download");
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    });
  };
  return (
    <>
      <div className="space-y-6">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Upload Project Files </h1>
            <p className="card-subtitle">
              Upload your project documents including reports, presentations,
              and code files.
            </p>
          </div>

          {/* Upload section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors ">
              <div className="mb-4">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-slate-800">
                Report
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Upload your project report (PDF, DOC)
              </p>
              <button
                className="btn-outline cursor-pointer"
                onClick={() => reportRef.current.click()}
              >
                Choose File
              </button>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={handleFilePick}
                ref={reportRef}
                multiple
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors ">
              <div className="mb-4">
                <Archive className="w-12 h-12 text-slate-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-slate-800">
                Presentation
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Upload your project presentation (PPT, PPTX, PDF)
              </p>
              <button
                className="btn-outline cursor-pointer"
                onClick={() => presRef.current.click()}
              >
                Choose File
              </button>
              <input
                type="file"
                className="hidden"
                accept=".ppt,.pptx,.pdf"
                onChange={handleFilePick}
                ref={presRef}
                multiple
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors ">
              <div className="mb-4">
                <FileCode className="w-12 h-12 text-slate-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-slate-800">
                Code Files
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Upload your source code (ZIP, RAR)
              </p>
              <button
                className="btn-outline cursor-pointer"
                onClick={() => codeRef.current.click()}
              >
                Choose File
              </button>
              <input
                type="file"
                className="hidden"
                accept=".zip,.rar,.tar,.gz"
                onChange={handleFilePick}
                ref={codeRef}
                multiple
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button className="btn-primary" onClick={handleUpload}>
              Upload Selected Files
            </button>
          </div>
        </div>

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Ready to Upload</h2>
            </div>
            <div className="space-y-3">
              {selectedFiles.map((file, index) => {
                return (
                  <div
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                    key={`${file.name}-${index}`}
                  >
                    <div className="flex items-center space-x-4">
                      {getFileIcon(file.name)}
                      <div className="">
                        <p className="text-slate-800 font-medium">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <span>
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn-danger btn-small"
                      onClick={() => removeSelected(file.name)}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload files list */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upload Files</h2>
            <p className="card-subtitle">Manage your uploaded project files</p>
          </div>

          {(project?.files || []).length === 0 ? (
            <div className="text-center py-4">
              <FilePlus className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No files uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(project?.files || []).map((file) => (
                <div
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  key={file._id || file.fileUrl}
                >
                  <div className="flex items-center space-x-4">
                    {getFileIcon(file.originalName)}
                    <div className="">
                      <p className="font-medium text-slate-800">
                        {file.originalName}
                      </p>
                      <div className="flex items-center space-x-4 text-slate-600">
                        <span>{file.fileType || "File"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      className="btn-outline btn-small"
                      onClick={() => handleDownloadFile(file)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UploadFiles;
