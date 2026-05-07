import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-toastify";

const QrScannerModal = ({ onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const processedRef = useRef(null);

  const [status, setStatus] = useState("starting"); // starting | scanning | success | error
  const [statusMessage, setStatusMessage] = useState("Starting camera…");
  const [codeInput, setCodeInput] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [tab, setTab] = useState("camera"); // camera | code

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const handleQrData = useCallback(async (data) => {
    let token = null;
    try {
      const url = new URL(data);
      token = url.searchParams.get("token");
    } catch {
      token = data.trim() || null;
    }

    if (!token || processedRef.current === token) return;
    processedRef.current = token;

    stopCamera();
    setStatus("success");
    setStatusMessage("QR detected! Confirming attendance…");

    try {
      await axiosInstance.post("/student/attendance/check-in", { token });
      toast.success("Attendance confirmed successfully!");
      setTimeout(handleClose, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to confirm attendance";
      toast.error(msg);
      setStatus("error");
      setStatusMessage(msg);
    }
  }, [stopCamera, handleClose]);

  useEffect(() => {
    if (tab !== "camera") return;

    let cancelled = false;
    processedRef.current = null;
    setStatus("starting");
    setStatusMessage("Starting camera…");

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("scanning");
        setStatusMessage("Point camera at the QR code");

        const scan = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
            animFrameRef.current = requestAnimationFrame(scan);
            return;
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code?.data) {
            handleQrData(code.data);
            return;
          }

          animFrameRef.current = requestAnimationFrame(scan);
        };

        animFrameRef.current = requestAnimationFrame(scan);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setStatusMessage(
            err.name === "NotAllowedError"
              ? "Camera permission was denied. Please allow camera access and try again."
              : "Could not access camera. Use the code tab instead."
          );
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [tab, stopCamera, handleQrData]);

  const handleCodeSubmit = async () => {
    const code = codeInput.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    setCodeLoading(true);
    try {
      await axiosInstance.post("/student/attendance/check-in-code", { accessCode: code });
      toast.success("Attendance confirmed successfully!");
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setCodeLoading(false);
    }
  };

  const statusColors = {
    starting: "text-slate-500",
    scanning: "text-blue-600",
    success: "text-green-600",
    error: "text-red-600",
  };

  const statusIcons = {
    starting: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
    ),
    scanning: (
      <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-16h4a2 2 0 012 2v4m0 10v4a2 2 0 01-2 2h-4" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-16h4a2 2 0 012 2v4m0 10v4a2 2 0 01-2 2h-4" />
              </svg>
            </div>
            <h2 className="font-semibold text-slate-800">Attendance Check-in</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === "camera" ? "border-b-2 border-blue-500 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => setTab("camera")}
          >
            📷 Scan QR
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === "code" ? "border-b-2 border-blue-500 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}
            onClick={() => { stopCamera(); setTab("code"); }}
          >
            🔢 Enter Code
          </button>
        </div>

        {/* Camera tab */}
        {tab === "camera" && (
          <>
            <div className="relative bg-black" style={{ aspectRatio: "1/1" }}>
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />

              {status === "scanning" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-48">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    <div className="absolute inset-x-2 h-0.5 bg-blue-400 animate-scan-line shadow-[0_0_8px_2px_rgba(96,165,250,0.8)]" />
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-white text-sm text-center">{statusMessage}</p>
                    <button
                      onClick={() => setTab("code")}
                      className="mt-3 text-xs text-blue-300 underline"
                    >
                      Try entering the code instead
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 flex items-center gap-2">
              <span className={`flex-shrink-0 ${statusColors[status]}`}>{statusIcons[status]}</span>
              <p className={`text-sm font-medium ${statusColors[status]}`}>{statusMessage}</p>
            </div>
          </>
        )}

        {/* Code tab */}
        {tab === "code" && (
          <div className="p-5 space-y-4">
            <div className="text-center">
              <p className="text-slate-500 text-sm">Enter the 6-digit code shown by your teacher</p>
            </div>

            {/* Big digit inputs */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  id={`digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-10 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  value={codeInput[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    const arr = codeInput.split("");
                    arr[i] = val.slice(-1);
                    const next = arr.join("").slice(0, 6);
                    setCodeInput(next.padEnd(6, "").trimEnd());
                    if (val && i < 5) {
                      document.getElementById(`digit-${i + 1}`)?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !codeInput[i] && i > 0) {
                      document.getElementById(`digit-${i - 1}`)?.focus();
                    }
                    if (e.key === "Enter") handleCodeSubmit();
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    setCodeInput(pasted);
                    const focusIdx = Math.min(pasted.length, 5);
                    document.getElementById(`digit-${focusIdx}`)?.focus();
                  }}
                />
              ))}
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleCodeSubmit}
              disabled={codeLoading || codeInput.replace(/\s/g, "").length < 6}
            >
              {codeLoading ? "Confirming…" : "Confirm Attendance"}
            </button>

            <button
              className="w-full text-sm text-blue-600 hover:underline"
              onClick={() => { setCodeInput(""); setTab("camera"); }}
            >
              ← Back to QR scan
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default QrScannerModal;
