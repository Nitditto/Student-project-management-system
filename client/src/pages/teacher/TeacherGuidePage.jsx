import { useState } from "react";
import {
  BookOpen,
  Users,
  FileText,
  Calendar,
  CheckSquare,
  ClipboardList,
  Bell,
  ChevronRight,
  Info,
  QrCode,
  AlertTriangle,
  Award
} from "lucide-react";

const TeacherGuidePage = () => {
  const [activeSection, setActiveSection] = useState("proposals");

  const guideSections = [
    {
      id: "proposals",
      title: "1. Xét duyệt Đề tài Đăng ký",
      icon: <BookOpen className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Khi đợt đăng ký đồ án bắt đầu, sinh viên sẽ đăng ký đề tài trực tuyến và chọn bạn làm Giảng viên hướng dẫn (GVHD). Quy trình xét duyệt như sau:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <h5 className="font-semibold text-slate-800 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-500" />
              Cách thực hiện xét duyệt:
            </h5>
            <ul className="list-decimal pl-5 space-y-2 text-slate-600 text-sm">
              <li>Truy cập menu <span className="font-medium text-slate-900">Pending Requests</span> ở thanh menu bên trái.</li>
              <li>Xem danh sách các đề xuất của sinh viên (Tên đề tài, tóm tắt, mục tiêu, công nghệ sử dụng).</li>
              <li>Nhấp <strong>Approve (Đồng ý)</strong> để nhận hướng dẫn sinh viên, hoặc nhấp <strong>Reject (Từ chối)</strong> và ghi rõ lý do để sinh viên điều chỉnh lại đề cương.</li>
            </ul>
          </div>
          <div className="flex gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold">Lưu ý giới hạn hướng dẫn:</span>
              <p className="mt-1 text-blue-700 leading-relaxed">
                Mỗi giảng viên sẽ có hạn mức số lượng sinh viên hướng dẫn tối đa do Khoa quy định. Trạng thái số lượng nhóm hiện tại sẽ hiển thị trực quan ở mục quản lý.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "supervision",
      title: "2. Quản lý Hướng dẫn & Điểm danh QR",
      icon: <QrCode className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Hệ thống hỗ trợ giảng viên theo dõi tiến trình làm việc hàng tuần của sinh viên và tổ chức điểm danh các buổi họp nhóm trực tiếp một cách nhanh chóng:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Quản lý nhóm hướng dẫn:
              </h5>
              <p className="text-sm text-slate-500 leading-relaxed">
                Vào mục <strong>My Supervision</strong> để xem toàn bộ danh sách sinh viên đang hướng dẫn, lịch sử nộp bài, nhật ký tiến trình từng tuần và gửi phản hồi nhận xét trực tiếp cho từng nhóm.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-blue-500" />
                Tạo mã QR Điểm danh:
              </h5>
              <p className="text-sm text-slate-500 leading-relaxed">
                Trong buổi họp nhóm, nhấp vào nút tạo điểm danh trên website. Hệ thống sẽ hiển thị một mã QR động và mã code 6 số. Sinh viên chỉ cần quét mã này trên giao diện của họ để xác nhận sự hiện diện.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "grading",
      title: "3. Đánh giá Báo cáo Cột mốc (M1 - M4)",
      icon: <FileText className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Giảng viên tiến hành chấm điểm và nhận xét các bài nộp theo từng cột mốc học phần của sinh viên ngay trên hệ thống trực tuyến:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <h5 className="font-semibold text-slate-800 text-sm">💡 Các công cụ hỗ trợ chấm điểm:</h5>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 text-xs">
              <li><strong>Trực quan hóa tài liệu:</strong> Đọc trực tiếp nội dung file báo cáo (PDF/DOCX lên tới 50MB) ngay trên trình duyệt mà không cần tải về máy tính cá nhân.</li>
              <li>
                <strong>Báo cáo Plagiarism & RAG:</strong> Xem kết quả đối chiếu trùng lặp học thuật tự động (đoạn trùng lặp trên 85% sẽ bôi đỏ và liên kết trực tiếp tới tài liệu nguồn gốc).
                <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-[11px] text-slate-600">
                  <p className="font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Thuật toán Cosine Similarity
                  </p>
                  <p>
                    Hệ thống chuyển đổi nội dung văn bản thành các vector toán học nhiều chiều (Vector Embedding) thông qua mô hình học máy. Khoảng cách ngữ nghĩa giữa hai văn bản được đo bằng góc giữa hai vector:
                  </p>
                  <p className="font-mono text-center bg-slate-50 py-1 border border-slate-100 rounded">
                    cos(θ) = (A · B) / (||A|| × ||B||)
                  </p>
                  <p>
                    Kết quả tương đồng $\ge$ <strong>0.85 (85%)</strong> sẽ được đánh dấu là trùng lặp nghiêm trọng giúp giảng viên phát hiện các trường hợp đạo văn tinh vi (như thay thế từ đồng nghĩa hoặc đảo cấu trúc câu).
                  </p>
                </div>
              </li>
              <li><strong>Dự đoán CLO & Điểm:</strong> Xem điểm số hệ 10/GPA hệ 4/Điểm chữ gợi ý từ hệ thống phân tích để hỗ trợ việc chấm điểm khách quan.</li>
              <li><strong>Nhập điểm & Nhận xét:</strong> Điền điểm thành phần và phiếu nhận xét trực tuyến. Điểm số sẽ được đồng bộ ngay tức thì với học bạ điện tử của sinh viên.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "deadlines",
      title: "4. Quản lý Thời hạn (Deadline Management)",
      icon: <Calendar className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Giảng viên có quyền chủ động thiết lập thời hạn nộp bài (Milestones) dành riêng cho các lớp hoặc nhóm sinh viên do mình phụ trách:
          </p>
          <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
            <h5 className="font-semibold text-slate-800 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-500" />
              Cách tạo mới deadline nộp bài:
            </h5>
            <ol className="list-decimal pl-5 space-y-2 text-slate-600 text-sm">
              <li>Truy cập menu <strong>Deadline Management</strong> và chọn <strong>Create Deadline</strong>.</li>
              <li>Nhập tiêu đề (ví dụ: Báo cáo Đề cương M1, Báo cáo Dự thảo M2...).</li>
              <li>Cài đặt ngày, giờ kết thúc nộp bài chính xác (sau thời điểm này cổng nộp bài sẽ tự động khóa hoặc đánh dấu nộp muộn).</li>
              <li>Viết mô tả yêu cầu chi tiết và nhấp <strong>Publish (Công bố)</strong> để gửi thông báo tự động đến toàn bộ sinh viên liên quan.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: "review",
      title: "5. Chấm điểm Phản biện",
      icon: <CheckSquare className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Bên cạnh công tác hướng dẫn, bạn sẽ được phân công làm Giảng viên Phản biện (GVPB) để chấm điểm độc lập cho các đề tài của giảng viên khác:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Quy trình phản biện đồ án:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>Nhận danh sách sinh viên cần phản biện được phân công bởi Giáo vụ Khoa.</li>
              <li>Đọc bản báo cáo đồ án tốt nghiệp chính thức của sinh viên (file nộp M4).</li>
              <li>Điền phiếu nhận xét phản biện trực tuyến: nêu rõ ưu điểm, nhược điểm của đồ án, đặt câu hỏi chất vấn dự kiến cho hội đồng, và nhập điểm phản biện trước thời hạn quy định.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "council",
      title: "6. Tham gia Hội đồng Bảo vệ",
      icon: <Award className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Vào ngày bảo vệ tốt nghiệp, giảng viên sẽ tham gia đánh giá trực tiếp với tư cách thành viên Hội đồng bảo vệ đồ án:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
            <p className="text-slate-700 font-medium">Quy trình làm việc tại Hội đồng:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs">
              <li><strong>Xem lịch hội đồng:</strong> Truy cập menu <strong>Defense Hub</strong> để xem danh sách hội đồng mình tham gia, phòng thi, danh sách sinh viên thuyết trình và thứ tự tương ứng.</li>
              <li><strong>Cho điểm trực tiếp:</strong> Trong quá trình sinh viên thuyết trình và phản biện, các thành viên hội đồng nhập điểm đánh giá trực tuyến cho từng tiêu chí.</li>
              <li><strong>Tổng hợp & ký biên bản:</strong> Thư ký hội đồng tổng hợp điểm trung bình tự động từ hệ thống, hoàn thiện biên bản nhận xét chung và kết thúc buổi bảo vệ trực tuyến.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "7. Nhận Thông báo hệ thống",
      icon: <Bell className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Trung tâm thông báo giúp giảng viên quản lý công việc và cập nhật các tương tác từ sinh viên một cách nhanh chóng nhất:
          </p>
          <div className="flex gap-3 bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Các cảnh báo quan trọng hệ thống gửi tới:</span>
              <p className="mt-1 text-amber-700 leading-relaxed">
                Yêu cầu duyệt đề tài tốt nghiệp mới, cảnh báo khi có nhóm sinh viên nộp báo cáo trễ hạn, thông báo thay đổi thời gian họp hoặc lịch phân công hội đồng bảo vệ từ Khoa. Giảng viên có thể xem trực tiếp hoặc xóa bớt thông báo cũ để giữ giao diện gọn gàng.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "clo",
      title: "8. Định nghĩa Chuẩn đầu ra (CLO)",
      icon: <Award className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            <strong>CLO (Course Learning Outcome - Chuẩn đầu ra học phần)</strong> là các mục tiêu đào tạo cụ thể mà giảng viên dùng làm thước đo đánh giá đồ án tốt nghiệp của sinh viên:
          </p>
          <div className="grid gap-3 text-sm">
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO1 (Phân tích đề tài):</span> Đánh giá năng lực phát biểu bài toán khoa học, khảo sát hiện trạng và xây dựng đặc tả yêu cầu.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO2 (Thiết kế hệ thống):</span> Đánh giá năng lực thiết kế kiến trúc phần mềm, mô hình dữ liệu và tối ưu hóa giải thuật.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO3 (Triển khai ứng dụng):</span> Đánh giá kỹ năng lập trình thực tế, tích hợp công nghệ và mức độ hoàn thiện sản phẩm đồ án.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO4 (Kiểm thử & Đánh giá):</span> Đánh giá năng lực thiết kế test suite, đo lường chỉ số hiệu năng và phân tích bảo mật.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO5 (Báo cáo & Thuyết trình):</span> Đánh giá cách trình bày báo cáo thuyết minh khoa học và trả lời phản biện trước hội đồng.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO6 (Làm việc nhóm):</span> Đánh giá mức độ đóng góp cá nhân, phối hợp và quản lý công việc chung (thông qua rubric Peer/ICS).
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO7 (Đạo đức & Học tập suốt đời):</span> Đánh giá ý thức tổ chức kỷ luật, chống đạo văn (Plagiarism) và khả năng tự học công nghệ mới.
            </div>
          </div>
          <div className="flex gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold">Lưu ý chấm điểm CLO:</span>
              <p className="mt-1 text-blue-700 leading-relaxed text-xs">
                Khi chấm điểm phản biện hoặc cho điểm tại Hội đồng bảo vệ, giảng viên nhập điểm thành phần tương ứng với các CLO quy định. Điểm tổng kết đồ án sẽ được hệ thống tính toán tự động dựa trên trọng số CLO của từng vai trò.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 py-8 px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-inner">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sổ Tay Hướng Dẫn Sử Dụng (Dành Cho Giảng Viên)
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Hướng dẫn chi tiết quy trình hướng dẫn, quản lý và chấm điểm đồ án tốt nghiệp trực tuyến
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
              Mục lục hướng dẫn
            </p>
            {guideSections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-sm font-medium transition-all ${
                  activeSection === sec.id
                    ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${activeSection === sec.id ? "text-white" : "text-slate-400"}`}>
                    {sec.icon}
                  </span>
                  <span>{sec.title.substring(3)}</span>
                </div>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    activeSection === sec.id ? "translate-x-0.5 text-white" : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Guide Content Display */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
            <div>
              {/* Content Header */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  {guideSections.find((s) => s.id === activeSection)?.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  {guideSections.find((s) => s.id === activeSection)?.title}
                </h2>
              </div>

              {/* Content Details */}
              <div className="transition-all duration-200">
                {guideSections.find((s) => s.id === activeSection)?.content}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-slate-100 pt-5 mt-8 flex justify-between items-center text-sm">
              <button
                disabled={activeSection === guideSections[0].id}
                onClick={() => {
                  const idx = guideSections.findIndex((s) => s.id === activeSection);
                  if (idx > 0) setActiveSection(guideSections[idx - 1].id);
                }}
                className="btn-outline px-4 py-2 disabled:opacity-40 disabled:hover:bg-white"
              >
                Trở lại
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Bước {guideSections.findIndex((s) => s.id === activeSection) + 1} / {guideSections.length}
              </span>
              <button
                disabled={activeSection === guideSections[guideSections.length - 1].id}
                onClick={() => {
                  const idx = guideSections.findIndex((s) => s.id === activeSection);
                  if (idx < guideSections.length - 1) setActiveSection(guideSections[idx + 1].id);
                }}
                className="btn-primary px-4 py-2 disabled:opacity-40 disabled:hover:bg-blue-600"
              >
                Tiếp theo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherGuidePage;
