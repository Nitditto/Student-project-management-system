import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import axios from "axios";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileImage,
  FileCode,
  Download,
  Loader,
  MessageSquare,
  Upload,
  CheckCircle,
  X,
  AlertTriangle,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import mammoth from "mammoth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const removeVietnameseTones = (str) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

// Configure PDF.js w orker (bundled with react-pdf v10)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const SubmissionPreviewPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const deadlineId = searchParams.get("deadlineId");
  const initialGroupId = searchParams.get("groupId");
  const initialFileUrl = searchParams.get("fileUrl");

  const [loading, setLoading] = useState(true);
  const [submissionsData, setSubmissionsData] = useState(null);

  // Active states
  const [activeGroupId, setActiveGroupId] = useState(initialGroupId);
  const [activeFile, setActiveFile] = useState(null);

  // Preview states
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTextContent, setPreviewTextContent] = useState("");

  // PDF viewer states
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfContainerWidth, setPdfContainerWidth] = useState(0);
  const pdfContainerRef = useCallback((node) => {
    if (node) setPdfContainerWidth(node.getBoundingClientRect().width);
  }, []);

  // Docx viewer state
  const [docxHtml, setDocxHtml] = useState("");

  // Feedback states
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackFile, setFeedbackFile] = useState(null);
  const [feedbackFileName, setFeedbackFileName] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Annotation states
  const [annotations, setAnnotations] = useState([]); // Array of { id, page, x, y, text, fileUrl, createdAt }
  const [tempCoords, setTempCoords] = useState(null); // { x, y }
  const [activeComment, setActiveComment] = useState("");

  // Fetch the global deadline submissions data to populate lists and enable next/prev sequencer
  const fetchDeadlineData = async (groupIdToSet) => {
    if (!deadlineId) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/deadline/${deadlineId}/submissions`);
      const data = res.data.data;
      setSubmissionsData(data);

      const targetGroupId = groupIdToSet || activeGroupId || data.records[0]?.project?._id;
      if (targetGroupId) {
        setActiveGroupId(targetGroupId);
        const record = data.records.find(r => r.project._id === targetGroupId);
        if (record) {
          // Resolve submitted files
          const files = getSubmittedFiles(record);

          // Set active file: either specified in query, first file, or null
          if (initialFileUrl) {
            const foundFile = files.find(f => f.fileUrl === initialFileUrl);
            setActiveFile(foundFile || files[0] || null);
          } else {
            setActiveFile(files[0] || null);
          }

          // Populate existing feedback
          setFeedbackText(record.submission?.feedback?.message || "");
          setFeedbackFileName(record.submission?.feedback?.fileName || "");
          setFeedbackFile(null);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load submissions workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlineData(initialGroupId);
  }, [deadlineId, initialGroupId]);

  // Consolidates all submitted files
  const getSubmittedFiles = (record) => {
    const list = [];
    const urls = new Set();

    if (record?.projectFiles && record.projectFiles.length > 0) {
      record.projectFiles.forEach(f => {
        if (f.fileUrl && !urls.has(f.fileUrl)) {
          list.push(f);
          urls.add(f.fileUrl);
        }
      });
    }

    if (record?.submission?.files && record.submission.files.length > 0) {
      record.submission.files.forEach(f => {
        if (f.fileUrl && !urls.has(f.fileUrl)) {
          list.push(f);
          urls.add(f.fileUrl);
        }
      });
    }

    if (list.length === 0 && record?.submission?.fileUrl) {
      list.push({
        fileUrl: record.submission.fileUrl,
        fileName: record.submission.fileName,
        uploadedAt: record.submission.submittedAt || record.submission.createdAt
      });
    }

    return list;
  };

  // Find active record from submissionsData list
  const activeRecord = submissionsData?.records?.find(r => r.project._id === activeGroupId) || null;
  const submittedFilesList = activeRecord ? getSubmittedFiles(activeRecord) : [];

  // Handle active file changing to fetch contents if code/text or docx file
  useEffect(() => {
    if (!activeFile) {
      setPreviewTextContent("");
      setDocxHtml("");
      return;
    }

    const fileType = getFileType(activeFile.fileName);

    if (fileType === "text") {
      const loadTextContent = async () => {
        setPreviewLoading(true);
        setPreviewTextContent("");
        try {
          const fullUrl = `${import.meta.env.VITE_API_URL || ""}${activeFile.fileUrl}`;
          const res = await fetch(fullUrl);
          const text = await res.text();
          setPreviewTextContent(text);
        } catch (err) {
          setPreviewTextContent("Error: Could not load file contents. Please download the file to view it.");
        } finally {
          setPreviewLoading(false);
        }
      };
      loadTextContent();
    }

    if (fileType === "docx") {
      const loadDocx = async () => {
        setPreviewLoading(true);
        setDocxHtml("");
        try {
          const fullUrl = `${import.meta.env.VITE_API_URL || ""}${activeFile.fileUrl}`;
          const response = await fetch(fullUrl);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } catch (err) {
          setDocxHtml(`<p style="color:red">Could not render DOCX. Please download the file to view it.</p>`);
        } finally {
          setPreviewLoading(false);
        }
      };
      loadDocx();
    }
  }, [activeFile]);

  // Sequencer helper functions
  const activeRecordIndex = submissionsData?.records?.findIndex(r => r.project._id === activeGroupId) ?? -1;
  const hasPrev = activeRecordIndex > 0;
  const hasNext = submissionsData?.records && activeRecordIndex < submissionsData.records.length - 1;

  const navigateSequencer = (direction) => {
    if (!submissionsData) return;
    const nextIdx = direction === "next" ? activeRecordIndex + 1 : activeRecordIndex - 1;
    const nextRecord = submissionsData.records[nextIdx];
    if (nextRecord) {
      setActiveGroupId(nextRecord.project._id);

      const files = getSubmittedFiles(nextRecord);
      setActiveFile(files[0] || null);

      // Populate feedback
      setFeedbackText(nextRecord.submission?.feedback?.message || "");
      setFeedbackFileName(nextRecord.submission?.feedback?.fileName || "");
      setFeedbackFile(null);

      // Update query parameters silently
      navigate(`/teacher/deadlines/submissions/preview?deadlineId=${deadlineId}&groupId=${nextRecord.project._id}`, { replace: true });
    }
  };

  const getFileType = (fileName = "") => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "image";
    if (["pdf"].includes(ext)) return "pdf";
    if (["txt", "html", "css", "js", "jsx", "ts", "tsx", "json", "py", "java", "cpp", "c", "cs", "md", "xml", "yaml", "sh", "sql"].includes(ext)) return "text";
    if (["docx", "doc"].includes(ext)) return "docx";
    if (["pptx", "ppt", "xlsx", "xls"].includes(ext)) return "office";
    return "other";
  };

  const getFileIcon = (fileName = "", customClass = "w-5 h-5 flex-shrink-0") => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
      return <FileImage className={`${customClass} text-indigo-500`} />;
    }
    if (["pdf"].includes(ext)) {
      return <FileText className={`${customClass} text-red-500`} />;
    }
    if (["html", "css", "js", "jsx", "ts", "tsx", "json", "py", "java", "cpp", "c", "cs", "md", "xml", "yaml"].includes(ext)) {
      return <FileCode className={`${customClass} text-emerald-500`} />;
    }
    return <FileText className={`${customClass} text-blue-500`} />;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFeedbackFile(file);
      setFeedbackFileName(file.name);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!activeRecord) return;

    setSubmittingFeedback(true);
    const formData = new FormData();
    formData.append("message", feedbackText);
    if (feedbackFile) {
      formData.append("file", feedbackFile);
    }

    try {
      await axiosInstance.post(
        `/deadline/${deadlineId}/submissions/${activeGroupId}/feedback`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success("Feedback saved and grade recorded");
      fetchDeadlineData(activeGroupId); // reload statistics and entries
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handlePageClick = (e, pageNumber) => {
    if (tempCoords) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTempCoords({ x, y, page: pageNumber });
  };

  const saveAnnotation = () => {
    if (!activeComment.trim() || !activeFile || !tempCoords) return;
    const newAnn = {
      id: Date.now(),
      page: tempCoords.page,
      x: tempCoords.x,
      y: tempCoords.y,
      text: activeComment,
      fileUrl: activeFile.fileUrl,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAnnotations(prev => [...prev, newAnn]);
    setActiveComment("");
    setTempCoords(null);
  };

  const scrollToPage = (pageNumber) => {
    const element = document.getElementById(`pdf-page-${pageNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleExportAnnotatedPDF = async () => {
    if (!activeFile) return;
    const fileAnns = annotations.filter(a => a.fileUrl === activeFile.fileUrl);
    if (fileAnns.length === 0) {
      toast.warning("Chưa có bình luận nào được thêm vào file PDF này.");
      return;
    }
    try {
      toast.info("Đang vẽ bình luận và tạo bản ghi PDF...");

      // Fetch via standard axios using the relative file URL to trigger Vite's dev server proxy (/uploads)
      const res = await axios.get(activeFile.fileUrl, {
        responseType: "arraybuffer",
      });
      const existingPdfBytes = res.data;

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Map of pageIndex -> current Y coordinate for stacked right-margin comments (prevents overlaps)
      const nextPageY = {};

      // Draw all annotations for this file
      fileAnns.forEach(ann => {
        const pageIndex = ann.page - 1;
        if (pageIndex >= pages.length) return;
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        const targetX = (ann.x / 100) * width;
        const targetY = height - ((ann.y / 100) * height);

        // 1. Draw transparent yellow highlight at clicked point
        page.drawRectangle({
          x: Math.max(10, targetX - 40),
          y: targetY - 7,
          width: 80,
          height: 14,
          color: rgb(1, 0.9, 0.25),
          opacity: 0.45, // Transparent yellow highlighter!
        });

        // 2. Draw a connecting guide line from the highlight to the margin comment box
        if (nextPageY[pageIndex] === undefined) {
          nextPageY[pageIndex] = height - 45; // Start first comment 45 points from the top margin
        }
        
        const commentY = nextPageY[pageIndex];
        
        page.drawLine({
          start: { x: targetX, y: targetY },
          end: { x: width - 150, y: commentY + 12 },
          thickness: 0.8,
          color: rgb(0.6, 0.6, 0.6),
          opacity: 0.5,
        });

        // 3. Draw comment box card on the right-hand margin
        page.drawRectangle({
          x: width - 145,
          y: commentY - 15,
          width: 135,
          height: 30,
          color: rgb(0.97, 0.97, 0.98),
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.8,
          opacity: 0.95,
        });

        // Left vertical border accent color (purple) for comment card
        page.drawRectangle({
          x: width - 145,
          y: commentY - 15,
          width: 3,
          height: 30,
          color: rgb(0.5, 0.2, 0.9), // Purple accent
        });

        // 4. Safe drawing of comment text inside the margin card
        try {
          const sanitizedText = removeVietnameseTones(ann.text);
          page.drawText(sanitizedText, {
            x: width - 137,
            y: commentY - 6,
            size: 7.5,
            font: font,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: 122,
          });
        } catch (textErr) {
          console.warn("Could not draw text annot on PDF:", textErr);
        }

        // Adjust nextPageY to stack the next comment card below this one
        nextPageY[pageIndex] = commentY - 40;
      });

      const pdfBytes = await pdfDoc.save();
      const feedbackFileBlob = new File([pdfBytes], `feedback_${activeFile.fileName}`, {
        type: "application/pdf"
      });

      setFeedbackFile(feedbackFileBlob);
      setFeedbackFileName(feedbackFileBlob.name);
      toast.success("Đã nhúng bình luận và gắn file feedback thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tạo file PDF feedback nhúng annotation.");
    }
  };

  const renderDocumentViewer = () => {
    if (!activeFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
          <HelpCircle className="w-16 h-16 text-slate-300 mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-slate-700">No File Selected</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            This student group has either not submitted files yet, or you haven't clicked a file to load.
          </p>
        </div>
      );
    }

    const fileType = getFileType(activeFile.fileName);
    const fullUrl = `${import.meta.env.VITE_API_URL || ""}${activeFile.fileUrl}`;

    if (fileType === "image") {
      return (
        <div className="flex items-center justify-center p-4 bg-slate-900 rounded-2xl h-full overflow-auto shadow-inner border border-slate-800">
          <img
            src={fullUrl}
            alt={activeFile.fileName}
            className="max-h-[70vh] max-w-full object-contain rounded border border-slate-800 transition-all duration-300 hover:scale-105"
          />
        </div>
      );
    }

    if (fileType === "pdf") {
      return (
        <div ref={pdfContainerRef} className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-800 shadow-inner flex flex-col">
          {/* PDF Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white flex-shrink-0 border-b border-slate-700">
            <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">
              {activeFile.fileName}
            </span>
            <div className="flex items-center gap-1.5">
              {/* Zoom out */}
              <button
                onClick={() => setPdfScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 w-10 text-center">
                {Math.round(pdfScale * 100)}%
              </span>
              {/* Zoom in */}
              <button
                onClick={() => setPdfScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {/* Reset zoom */}
              <button
                onClick={() => setPdfScale(1.2)}
                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors ml-1"
                title="Reset zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1" />
              {/* Open in new tab */}
              <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 hover:bg-slate-700 rounded-lg"
              >
                Open ↗
              </a>
            </div>
          </div>

          {/* PDF Canvas area */}
          <div className="flex-grow overflow-auto flex flex-col items-center py-4 px-2 bg-slate-700">
            <Document
              file={fullUrl}
              onLoadSuccess={({ numPages }) => {
                setPdfNumPages(numPages);
              }}
              onLoadError={() => toast.error("Could not load PDF. Please try downloading it.")}
              loading={
                <div className="flex flex-col items-center justify-center h-60 gap-3">
                  <Loader className="w-8 h-8 animate-spin text-blue-400" />
                  <p className="text-sm text-slate-300 animate-pulse">Loading PDF…</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-60 gap-4 text-center p-6">
                  <div className="w-14 h-14 bg-red-900/40 text-red-400 rounded-full flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">Cannot render PDF</p>
                    <p className="text-xs text-slate-400 mt-1">The file may be corrupted or the server is unreachable.</p>
                  </div>
                  <div className="flex gap-3">
                    <a href={fullUrl} target="_blank" rel="noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors">
                      Open in New Tab ↗
                    </a>
                    <a href={fullUrl} download={activeFile.fileName}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </div>
                </div>
              }
            >
              <div className="space-y-6 flex flex-col items-center w-full">
                {Array.from(new Array(pdfNumPages || 0), (el, index) => {
                  const pageNumber = index + 1;
                  return (
                    <div
                      key={pageNumber}
                      id={`pdf-page-${pageNumber}`}
                      className="relative cursor-crosshair shadow-lg bg-white border border-slate-300 rounded-sm overflow-visible"
                      onClick={(e) => handlePageClick(e, pageNumber)}
                    >
                      {/* Page badge watermark */}
                      <span className="absolute top-2 left-2 z-30 px-2 py-0.5 bg-slate-800/80 backdrop-blur-sm text-white text-[9px] font-mono rounded font-bold shadow select-none">
                        Trang {pageNumber}
                      </span>

                      <Page
                        pageNumber={pageNumber}
                        scale={pdfScale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />

                      {/* Render Pinpoints for this specific page */}
                      {annotations
                        .filter((ann) => ann.fileUrl === activeFile.fileUrl && ann.page === pageNumber)
                        .map((ann) => (
                          <React.Fragment key={ann.id}>
                            {/* 1. Yellow Highlighter Overlay */}
                            <div
                              className="absolute bg-yellow-300/40 border border-yellow-400/60 rounded-sm cursor-pointer transition-all hover:bg-yellow-300/60 pointer-events-none"
                              style={{
                                left: `${ann.x}%`,
                                top: `${ann.y}%`,
                                width: "80px",
                                height: "16px",
                                transform: "translate(-50%, -50%)",
                                zIndex: 10
                              }}
                            />

                            {/* 2. Interactive Note Comment bubble icon */}
                            <div
                              className="absolute group flex items-center justify-center cursor-pointer"
                              style={{
                                left: `${ann.x + 3}%`, // Shifted slightly to the right of highlight
                                top: `${ann.y}%`,
                                transform: "translate(-50%, -50%)",
                                zIndex: 20
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="w-5 h-5 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center text-[10px] shadow-md border border-white font-bold transition-all hover:scale-115">
                                💬
                              </div>

                              {/* Tooltip on Hover */}
                              <div className="absolute left-7 hidden group-hover:block bg-slate-900/95 backdrop-blur-sm text-white text-xs p-3.5 rounded-2xl w-56 shadow-2xl border border-slate-700/50 z-50">
                                <p className="font-extrabold text-purple-400 flex items-center gap-1 mb-1.5">
                                  <span>Bình luận giảng viên:</span>
                                </p>
                                <p className="leading-relaxed font-sans text-slate-100">{ann.text}</p>
                                <span className="text-[9px] text-slate-400 block mt-2 text-right font-mono">{ann.createdAt}</span>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}

                      {/* Temporary pin drop & input overlay on this specific page */}
                      {tempCoords && tempCoords.page === pageNumber && (
                        <div
                          className="absolute bg-white/95 backdrop-blur border border-slate-200 shadow-2xl rounded-2xl p-3.5 z-50 w-64 flex flex-col gap-2.5"
                          style={{ left: `${tempCoords.x}%`, top: `${tempCoords.y}%`, transform: "translate(-50%, 20px)" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            <span>Thêm bình luận ghim:</span>
                          </div>
                          <textarea
                            value={activeComment}
                            onChange={(e) => setActiveComment(e.target.value)}
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none h-16 resize-none font-sans"
                            placeholder="Ghi chú nội dung cần sửa..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTempCoords(null);
                                setActiveComment("");
                              }}
                              className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={saveAnnotation}
                              disabled={!activeComment.trim()}
                              className="px-2.5 py-1.5 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer transition-colors"
                            >
                              Lưu Ghim
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Document>
          </div>
        </div>
      );
    }

    if (fileType === "text") {
      if (previewLoading) {
        return (
          <div className="flex flex-col justify-center items-center h-full space-y-3 bg-slate-950 rounded-2xl border border-slate-800">
            <Loader className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="text-emerald-500/80 text-sm font-medium animate-pulse">Reading file content...</p>
          </div>
        );
      }
      return (
        <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-inner h-full flex flex-col">
          <div className="bg-slate-900 px-4 py-2 text-xs font-semibold font-mono text-slate-400 border-b border-slate-800 flex justify-between items-center">
            <span>{activeFile.fileName}</span>
            <span className="text-[10px] text-emerald-500">READING LIVE MODE</span>
          </div>
          <pre className="overflow-auto bg-slate-950 text-emerald-400 p-5 font-mono text-xs md:text-sm flex-grow leading-relaxed select-text custom-scrollbar">
            <code>{previewTextContent}</code>
          </pre>
        </div>
      );
    }

    if (fileType === "docx") {
      if (previewLoading) {
        return (
          <div className="flex flex-col justify-center items-center h-full space-y-3 bg-white rounded-2xl border border-slate-200">
            <Loader className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-blue-500/80 text-sm font-medium animate-pulse">Rendering document...</p>
          </div>
        );
      }
      return (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-full flex flex-col bg-white">
          <div className="bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 border-b border-blue-100 flex justify-between items-center">
            <span>{activeFile.fileName}</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">DOCX VIEWER</span>
          </div>
          <div
            className="flex-grow overflow-auto p-6 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: docxHtml }}
          />
        </div>
      );
    }

    if (fileType === "office") {
      const isLocal = fullUrl.includes("localhost") || fullUrl.includes("127.0.0.1");
      return (
        <div className="flex items-center justify-center h-full bg-slate-50 rounded-2xl border border-slate-200 p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-slate-800">Office File</h4>
              <p className="text-sm text-slate-500">
                {isLocal
                  ? "Preview requires a public URL. Download to view locally."
                  : "Click below to view in Microsoft Online Viewer."}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <a
                href={fullUrl}
                download={activeFile.fileName}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
              {!isLocal && (
                <a
                  href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  <span>Open in Office Viewer</span>
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Fallback for unknown types
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-slate-800">Preview Not Available</h4>
            <p className="text-sm text-slate-500">
              This file type ({activeFile.fileName.split(".").pop().toUpperCase()}) cannot be previewed online.
            </p>
          </div>
          <a
            href={fullUrl}
            download={activeFile.fileName}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download to View</span>
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4 bg-slate-50">
        <Loader className="w-12 h-12 animate-spin text-blue-600" />
        <p className="text-slate-500 font-bold animate-pulse">Launching Online Reader Workspace...</p>
      </div>
    );
  }

  if (!submissionsData || !activeRecord) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-slate-600 font-medium">Failed to load assignment details.</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      {/* Top Workspace Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 flex-shrink-0 shadow-lg">
        <div className="flex items-center space-x-4 min-w-0">
          <button
            onClick={() => navigate(`/teacher/deadlines/${deadlineId}/submissions`)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2.5">
              <h2 className="text-base font-extrabold truncate max-w-[240px]">
                {submissionsData.deadline.title}
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-400/20">
                Grading Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              Group: <strong className="text-slate-200">{activeRecord.project.groupName || "Unnamed"}</strong> — {activeRecord.project.student?.name || "Representative"}
            </p>
          </div>
        </div>

        {/* Sequencer controls */}
        <div className="flex items-center space-x-3 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => navigateSequencer("prev")}
            disabled={!hasPrev}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Previous group submission"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold font-mono text-slate-300 px-1 select-none">
            {activeRecordIndex + 1} / {submissionsData.records.length} Groups
          </span>
          <button
            onClick={() => navigateSequencer("next")}
            disabled={!hasNext}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next group submission"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Split Panels */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left Document Reader Workspace (70% width) */}
        <div className="w-[70%] h-full p-6 flex flex-col justify-center bg-slate-900/10 min-w-0">
          <div className="flex-grow min-h-0">
            {renderDocumentViewer()}
          </div>

          {activeFile && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
              <div className="flex items-center space-x-2.5 min-w-0">
                {getFileIcon(activeFile.fileName, "w-4 h-4 flex-shrink-0")}
                <span className="text-xs font-bold text-slate-700 truncate" title={activeFile.fileName}>
                  {activeFile.fileName}
                </span>
              </div>
              <a
                href={`${import.meta.env.VITE_API_URL || ""}${activeFile.fileUrl}`}
                download={activeFile.fileName}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>

        {/* Right Nav, Files Switcher, & Grading Panel (30% width) */}
        <div className="w-[30%] h-full bg-white border-l border-slate-200 flex flex-col min-w-[320px] shadow-2xl overflow-y-auto">

          {/* File Switcher List */}
          <div className="p-5 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Submitted Attachments ({submittedFilesList.length})</h4>
            {submittedFilesList.length === 0 ? (
              <p className="text-xs italic text-slate-400">No files submitted.</p>
            ) : (
              <div className="space-y-2">
                {submittedFilesList.map((file, idx) => {
                  const isActive = activeFile?.fileUrl === file.fileUrl;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveFile(file)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isActive
                        ? "bg-blue-50/80 border-blue-300 shadow-sm ring-1 ring-blue-400/20"
                        : "bg-slate-50/40 border-slate-200/60 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden mr-2">
                        {getFileIcon(file.fileName, "w-4 h-4 flex-shrink-0")}
                        <span className={`text-xs font-bold truncate ${isActive ? "text-blue-900" : "text-slate-700"}`}>
                          {file.fileName}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-500" : "text-slate-400"}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grading & Feedback form */}
          {activeFile && getFileType(activeFile.fileName) === "pdf" && (
            <div className="p-5 border-b border-slate-100 bg-slate-50/40 flex-shrink-0">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live PDF Annotations ({annotations.filter(a => a.fileUrl === activeFile.fileUrl).length})</h4>
              <p className="text-[10px] text-slate-400 mb-3 leading-normal">
                Click anywhere on the PDF page to drop comments. Once finished, click below to compile them into a feedback PDF.
              </p>

              {annotations.filter(a => a.fileUrl === activeFile.fileUrl).length > 0 ? (
                <div className="space-y-2 mb-3.5 max-h-[160px] overflow-y-auto pr-1">
                  {annotations
                    .filter(a => a.fileUrl === activeFile.fileUrl)
                    .map(ann => (
                      <div
                        key={ann.id}
                        onClick={() => scrollToPage(ann.page)}
                        className="p-2.5 bg-white border border-slate-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all flex flex-col gap-1 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Page {ann.page}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnnotations(prev => prev.filter(a => a.id !== ann.id));
                            }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 leading-normal font-medium truncate">
                          {ann.text}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] italic text-slate-400 text-center py-2">No annotation pins added yet.</p>
              )}

              {annotations.filter(a => a.fileUrl === activeFile.fileUrl).length > 0 && (
                <button
                  type="button"
                  onClick={handleExportAnnotatedPDF}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <span>Confirm Annotation PDF</span>
                </button>
              )}
            </div>
          )}

          <div className="p-5 flex-grow flex flex-col">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Grading & Feedback</h4>

            <form onSubmit={handleSubmitFeedback} className="space-y-5 flex flex-col h-full flex-grow">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Teacher Comments (Nhận xét giảng viên)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-slate-400 leading-relaxed font-sans"
                  placeholder="Provide constructive feedback for the submission..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                  Attachment File (Tệp phản hồi)
                </label>

                {feedbackFileName ? (
                  <div className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50/40 rounded-xl">
                    <div className="flex items-center space-x-2 text-xs text-purple-900 font-bold overflow-hidden mr-2">
                      <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="truncate">{feedbackFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackFile(null);
                        setFeedbackFileName("");
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-bold flex-shrink-0 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-slate-50/50 transition-all text-center">
                    <Upload className="w-7 h-7 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-600">Click to upload file</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PDF, Zip, Doc up to 10MB</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>

              {activeRecord.submission?.feedback?.fileUrl && !feedbackFile && (
                <div className="flex items-center justify-between p-3 border border-slate-200 bg-slate-50 rounded-xl">
                  <div className="flex items-center space-x-2 text-xs text-slate-600 overflow-hidden mr-2">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Existing: {activeRecord.submission.feedback.fileName}</span>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_API_URL || ""}${activeRecord.submission.feedback.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex-shrink-0"
                  >
                    Download
                  </a>
                </div>
              )}

              <div className="pt-2 flex-grow flex items-end">
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:bg-blue-400 cursor-pointer transform active:scale-95"
                >
                  {submittingFeedback ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                      <span>Saving feedback...</span>
                    </span>
                  ) : (
                    <span>Save feedback</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionPreviewPage;
