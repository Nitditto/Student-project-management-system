import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { submitDeadline, unsubmitDeadline } from "../../store/slices/deadlineSlice";
import { Card, Button, Upload, Tag } from "antd";
import { UploadOutlined, FileOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const DeadlineCard = ({ deadline }) => {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const isOverdue = deadline.isOverdue;
  const status = deadline.submissionStatus;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    await dispatch(submitDeadline({ deadlineId: deadline._id, file }));
    setFile(null);
    setLoading(false);
  };

  const handleUnsubmit = async () => {
    setLoading(true);
    await dispatch(unsubmitDeadline(deadline._id));
    setLoading(false);
  };

  const uploadProps = {
    beforeUpload: (file) => {
      setFile(file);
      return false; // Prevent auto upload
    },
    maxCount: 1,
    onRemove: () => setFile(null),
  };

  const renderStatusTag = () => {
    if (status === "SUBMITTED") return <Tag color="success">Submitted</Tag>;
    if (status === "MISSED") return <Tag color="error">Missed / Late</Tag>;
    if (isOverdue) return <Tag color="error">Overdue</Tag>;
    return <Tag color="warning">Pending</Tag>;
  };

  return (
    <Card title={deadline.title} extra={renderStatusTag()} className="shadow-sm">
      <p className="text-gray-600 mb-4">{deadline.description}</p>
      <div className="text-sm mb-4">
        <strong>Due Date:</strong> <span className={isOverdue ? "text-red-500 font-bold" : ""}>{dayjs(deadline.endDate).format("YYYY-MM-DD HH:mm")}</span>
      </div>

      {status === "PENDING" && !isOverdue && (
        <div className="mt-4">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          <Button 
            type="primary" 
            onClick={handleUpload} 
            disabled={!file} 
            loading={loading}
            className="mt-2 w-full"
          >
            Nộp bài
          </Button>
        </div>
      )}

      {status === "SUBMITTED" && !isOverdue && (
        <div className="mt-4 border p-3 rounded bg-gray-50">
          <p className="flex items-center mb-2">
            <FileOutlined className="mr-2" /> 
            <a href={`${import.meta.env.VITE_API_URL}${deadline.submission?.fileUrl}`} target="_blank" rel="noreferrer" className="text-blue-500 truncate">
              {deadline.submission?.fileName || "Download file"}
            </a>
          </p>
          <Button danger block onClick={handleUnsubmit} loading={loading}>
            Hủy nộp
          </Button>
        </div>
      )}

      {isOverdue && status !== "SUBMITTED" && (
        <div className="mt-4 text-center p-2 bg-red-50 text-red-500 rounded">
          Đã khóa nộp bài
        </div>
      )}

      {isOverdue && status === "SUBMITTED" && (
        <div className="mt-4 border p-3 rounded bg-gray-50">
           <p className="flex items-center mb-2">
            <FileOutlined className="mr-2" /> 
            <a href={`${import.meta.env.VITE_API_URL}${deadline.submission?.fileUrl}`} target="_blank" rel="noreferrer" className="text-blue-500 truncate">
              {deadline.submission?.fileName || "Download file"}
            </a>
          </p>
          <div className="text-center p-2 bg-gray-100 text-gray-500 rounded">
            Hết hạn - Không thể hủy
          </div>
        </div>
      )}
    </Card>
  );
};

export default DeadlineCard;
