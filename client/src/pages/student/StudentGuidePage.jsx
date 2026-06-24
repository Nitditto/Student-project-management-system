import { useState } from "react";
import {
  BookOpen,
  Upload,
  Activity,
  CheckCircle2,
  Calendar,
  QrCode,
  ShieldAlert,
  FileText,
  ChevronRight,
  Info,
  Clock,
  UserCheck,
  ChevronDown,
  Award
} from "lucide-react";

const StudentGuidePage = () => {
  const [activeSection, setActiveSection] = useState("registration");

  const guideSections = [
    {
      id: "registration",
      title: "1. Đăng ký Đề tài Tốt nghiệp",
      icon: <BookOpen className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Học phần Đồ án Tốt nghiệp bắt đầu bằng việc đăng ký đề tài chính thức trên website. Quy trình thực hiện như sau:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <h5 className="font-semibold text-slate-800 flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-blue-500" />
              Cách thực hiện đăng ký đề tài:
            </h5>
            <ul className="list-decimal pl-5 space-y-2 text-slate-600 text-sm">
              <li>Truy cập menu <span className="font-medium text-slate-900">Project Registration</span> ở thanh menu bên trái.</li>
              <li>Điền đầy đủ thông tin: <strong>Tên đề tài (Tiếng Việt & Tiếng Anh)</strong>, mô tả tóm tắt, mục tiêu đề tài, công nghệ sử dụng và kết quả mong muốn đạt được.</li>
              <li>Chọn <strong>Giảng viên hướng dẫn (GVHD)</strong> mong muốn từ danh sách.</li>
              <li>Nhấp <strong>Gửi đề cương (Submit)</strong>.</li>
            </ul>
          </div>
          <div className="flex gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold">Lưu ý trạng thái phê duyệt:</span>
              <p className="mt-1 text-blue-700 leading-relaxed">
                Sau khi gửi, đề tài sẽ ở trạng thái <span className="font-medium">Chờ duyệt (Pending)</span>. Giảng viên hướng dẫn sẽ xem xét đồng ý hoặc từ chối trực tuyến. Bạn có thể xem kết quả ngay trên trang chủ điều khiển cá nhân (Dashboard).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "progress",
      title: "2. Cập nhật Tiến độ & Điểm danh QR",
      icon: <QrCode className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Để đảm bảo chất lượng, bạn cần thường xuyên tương tác với GVHD và tham gia các buổi họp định kỳ. Website hỗ trợ các công cụ quản lý tiến độ và điểm danh thông minh:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Cập nhật nhật ký tuần:
              </h5>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tại trang cá nhân, viết báo cáo tóm tắt công việc đã làm trong tuần, các khó khăn gặp phải và kế hoạch cho tuần tiếp theo. GVHD sẽ xem và đưa ra chỉ dẫn.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-blue-500" />
                Điểm danh cuộc họp bằng QR:
              </h5>
              <p className="text-sm text-slate-500 leading-relaxed">
                Trong các buổi họp nhóm trực tiếp, GVHD sẽ trình chiếu một mã QR điểm danh. Nhấp vào nút <strong>Quét mã QR (Scan QR)</strong> ở góc trên bên phải thanh Navbar, cấp quyền camera cho trình duyệt để quét điểm danh tự động, hoặc nhập mã 6 số.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "uploads",
      title: "3. Tải lên Báo cáo & Cột mốc học phần",
      icon: <Upload className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Trong suốt kỳ làm đồ án tốt nghiệp, sinh viên phải nộp báo cáo đúng hạn theo 4 cột mốc quan trọng (Milestones) do khoa quy định:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M1</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Đề cương chi tiết (Project Proposal)</p>
                <p className="text-xs text-slate-500">Xác định hướng nghiên cứu, phương pháp và kế hoạch thực hiện.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M2</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Báo cáo dự thảo lần 1 (Progress Report 1)</p>
                <p className="text-xs text-slate-500">Hoàn thành cơ sở lý thuyết và phác thảo kiến trúc hệ thống.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M3</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Báo cáo dự thảo lần 2 (Progress Report 2)</p>
                <p className="text-xs text-slate-500">Hoàn thành phần lớn chức năng chính của sản phẩm thực tế.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">M4</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">Báo cáo bảo vệ chính thức (Final Report)</p>
                <p className="text-xs text-slate-500">Bản hoàn chỉnh của báo cáo thuyết minh cùng link demo sản phẩm.</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Yêu cầu tệp đính kèm:</span>
              <p className="mt-1 text-amber-700 leading-relaxed">
                Tài liệu tải lên phải có định dạng <span className="font-semibold">PDF hoặc DOCX</span>. Kích thước file tối đa đã được nâng lên <span className="font-semibold">50MB</span> để bạn có thể thoải mái đính kèm các hình ảnh, sơ đồ thiết kế chất lượng cao mà không lo vượt giới hạn.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "analysis",
      title: "4. Đối chiếu RAG & Phân tích Học thuật",
      icon: <Activity className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Ngay khi bạn tải báo cáo lên, hệ thống sẽ tự động kích hoạt **Hệ thống Phân tích Báo cáo học thuật** để đánh giá chất lượng tài liệu:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
            <div>
              <h5 className="font-semibold text-slate-800 text-sm">🛡️ Kiểm tra trùng lặp (Plagiarism Check)</h5>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Hệ thống phân tách nội dung báo cáo và tính toán khoảng cách cosine similarity so với cơ sở dữ liệu các khóa trước. Nếu một đoạn văn bản có tỷ lệ trùng trên 85%, hệ thống sẽ bôi đỏ đoạn đó và trích dẫn trực tiếp nguồn tham chiếu gốc để bạn chỉnh sửa cách diễn đạt (paraphrase).
              </p>
              
              {/* Detailed Cosine Similarity Explanation */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  Chi tiết về thuật toán Cosine Similarity
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Độ tương đồng Cosine (Cosine Similarity)</strong> là thước đo toán học xác định mức độ giống nhau về ngữ nghĩa giữa hai chuỗi văn bản bằng cách đo góc giữa hai vector trong không gian đa chiều:
                </p>
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-2 text-center text-xs font-mono text-slate-800">
                  Cosine Similarity (A, B) = cos(θ) = (A · B) / (||A|| × ||B||)
                </div>
                <div className="text-[11px] text-slate-500 space-y-1.5 pl-1.5 border-l-2 border-slate-200">
                  <p>• <strong>Vector hóa văn bản:</strong> Mỗi đoạn văn bản được AI mã hóa thành một chuỗi số (Vector Embedding) dài hàng trăm chiều đại diện cho ý nghĩa nội hàm của từ ngữ.</p>
                  <p>• <strong>Tính toán Cosine:</strong> Hệ thống tính tích vô hướng của hai vector chia cho tích độ dài. Khoảng kết quả từ 0 (không tương đồng) đến 1 (trùng khớp hoàn toàn về nghĩa, bỏ qua sự khác biệt chiều dài).</p>
                  <p>• <strong>Ngưỡng tương đồng (Threshold):</strong> Khoa thiết lập ngưỡng cảnh báo là <strong>0.85 (85%)</strong>. Bất kỳ đoạn văn nào vượt ngưỡng này sẽ tự động bị đánh dấu đỏ và trích xuất nguồn để sinh viên điều chỉnh diễn đạt.</p>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200/60 pt-3">
              <h5 className="font-semibold text-slate-800 text-sm">📊 Đánh giá chất lượng & Dự báo chuẩn đầu ra (CLO)</h5>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Hệ thống dựa trên nội dung báo cáo để chấm điểm dự kiến theo hệ 10, tự động chuyển đổi sang <strong>GPA hệ 4 và Điểm chữ (A, B, C...)</strong>, đồng thời dự báo mức độ đạt chuẩn đầu ra (CLO hệ 5 bậc).
              </p>
            </div>
            <div className="border-t border-slate-200/60 pt-3">
              <h5 className="font-semibold text-slate-800 text-sm">💡 Khuyến nghị học thuật (Academic Suggestions)</h5>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Cung cấp các góp ý hữu ích giúp sinh viên khắc phục lỗi định dạng, thiếu trích dẫn khoa học, hoặc bổ sung cấu trúc nội dung còn thiếu.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "evaluation",
      title: "5. Xem Đánh giá từ GVHD & Phản biện",
      icon: <UserCheck className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Sau khi nộp báo cáo chính thức, các giảng viên sẽ tiến hành đánh giá chi tiết độc lập trên hệ thống:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 text-sm">
            <li><strong>Giảng viên hướng dẫn (GVHD):</strong> Đánh giá thái độ làm việc, tiến độ hàng tuần và chấm điểm quá trình thực hiện đồ án.</li>
            <li><strong>Giảng viên phản biện (GVPB):</strong> Đọc báo cáo đồ án của bạn, viết phiếu nhận xét phản biện và cho điểm đánh giá độc lập trước ngày bảo vệ.</li>
          </ul>
          <p className="text-slate-600 leading-relaxed text-sm">
            Tất cả các nhận xét chi tiết, câu hỏi chất vấn dự kiến và điểm số thành phần này đều được hiển thị minh bạch tại trang quản lý thông tin đồ án tốt nghiệp của bạn.
          </p>
        </div>
      ),
    },
    {
      id: "defense",
      title: "6. Xem Lịch Bảo vệ & Nhận thông báo",
      icon: <Calendar className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Khi đợt bảo vệ tốt nghiệp bắt đầu, Khoa sẽ tổ chức phân chia Hội đồng đánh giá và sắp xếp lịch bảo vệ. Bạn sẽ theo dõi thông tin này qua website:
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
            <p className="text-slate-700 font-medium">Thông tin hiển thị tại mục Defense & Attendance:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs">
              <li><strong>Hội đồng:</strong> Tên và danh sách thành viên Hội đồng bảo vệ (Chủ tịch, Thư ký, Ủy viên, Phản biện).</li>
              <li><strong>Lịch bảo vệ:</strong> Ngày giờ cụ thể, địa điểm phòng thi.</li>
              <li><strong>Thứ tự thuyết trình:</strong> Số thứ tự lượt bảo vệ của bạn trong buổi họp hội đồng.</li>
            </ul>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm">
            Bất kỳ khi nào có thay đổi lịch, thông báo điểm số mới hay thông tin hội đồng, biểu tượng <strong>Chuông thông báo (Bell)</strong> trên thanh Navbar sẽ phát sáng và gửi tin nhắn cảnh báo trực tiếp để bạn không bỏ lỡ.
          </p>
        </div>
      ),
    },
    {
      id: "final",
      title: "7. Nộp báo cáo chỉnh sửa hoàn thiện cuối cùng",
      icon: <CheckCircle2 className="h-5 w-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            Bảo vệ thành công trước Hội đồng chưa phải là bước cuối cùng. Để hoàn thành thủ tục tốt nghiệp và nhận điểm số chính thức, bạn cần:
          </p>
          <div className="rounded-xl border border-slate-100 bg-blue-50/30 p-4 space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Các bước sau bảo vệ:</p>
            <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-xs">
              <li>Chỉnh sửa báo cáo thuyết minh theo đúng biên bản góp ý của Hội đồng bảo vệ tốt nghiệp.</li>
              <li>Gửi tệp báo cáo đã chỉnh sửa cho Giảng viên hướng dẫn ký xác nhận đồng ý bản cuối.</li>
              <li>Tải tệp PDF báo cáo đồ án tốt nghiệp bản hoàn chỉnh cuối cùng (đã ghép trang nhận xét có chữ ký GVHD) lên website để lưu trữ vĩnh viễn trên thư viện số của nhà trường.</li>
            </ol>
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
            <strong>CLO (Course Learning Outcome - Chuẩn đầu ra học phần)</strong> là các tiêu chí đo lường năng lực cốt lõi mà sinh viên phải đạt được sau khi hoàn thành học phần Đồ án Tốt nghiệp:
          </p>
          <div className="grid gap-3 text-sm">
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO1 (Phân tích đề tài):</span> Khả năng xác định vấn đề thực tế, phân tích yêu cầu nghiệp vụ và lập kế hoạch thực hiện đồ án.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO2 (Thiết kế hệ thống):</span> Khả năng thiết kế mô hình cơ sở dữ liệu, kiến trúc phần mềm và giao diện người dùng tối ưu.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO3 (Triển khai ứng dụng):</span> Khả năng viết mã nguồn sạch, tích hợp các công nghệ thực tế và hiện thực hóa sản phẩm.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO4 (Kiểm thử & Đánh giá):</span> Khả năng thiết lập kịch bản kiểm thử, đánh giá hiệu năng và bảo mật hệ thống.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO5 (Báo cáo & Thuyết trình):</span> Khả năng soạn thảo thuyết minh khoa học chuẩn quy cách và thuyết trình bảo vệ trước Hội đồng.
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO6 (Làm việc nhóm):</span> Khả năng phối hợp đồng đội, quản lý nhiệm vụ và giải quyết xung đột (đối với đồ án nhóm).
            </div>
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <span className="font-bold text-blue-600">CLO7 (Đạo đức & Học tập suốt đời):</span> Tôn trọng sở hữu trí tuệ, trích dẫn tài liệu đúng chuẩn và tự nghiên cứu công nghệ mới.
            </div>
          </div>
          <div className="flex gap-3 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-semibold">Lưu ý về Đánh giá CLO:</span>
              <p className="mt-1 text-blue-700 leading-relaxed text-xs">
                Khi sinh viên nộp báo cáo, hệ thống AI (RAG & Gemini) sẽ tự động phân tích mức độ đáp ứng các CLO. Điểm số chính thức của đồ án sẽ được Hội đồng và Giảng viên hướng dẫn chấm chi tiết dựa trên từng tiêu chí CLO này.
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
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sổ Tay Hướng Dẫn Sử Dụng Website
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Dành cho sinh viên thực hiện Đồ án Tốt nghiệp (Final Year Project - FYP)
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

export default StudentGuidePage;
