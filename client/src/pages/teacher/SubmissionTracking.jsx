import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherMatrix } from "../../store/slices/deadlineSlice";
import { Table, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

const SubmissionTracking = () => {
  const dispatch = useDispatch();
  const { matrix, loading } = useSelector((state) => state.deadline);

  useEffect(() => {
    dispatch(fetchTeacherMatrix());
  }, [dispatch]);

  const { deadlines = [], matrix: rows = [] } = matrix || {};

  const columns = [
    {
      title: "Group / Project",
      dataIndex: ["project", "groupName"],
      key: "groupName",
      render: (text, record) => text || record.project.title,
      fixed: 'left',
      width: 200,
    },
    ...deadlines.map(dl => ({
      title: dl.title,
      key: dl._id,
      render: (_, record) => {
        const subData = record.submissions[dl._id];
        if (!subData) return null;

        if (subData.status === "SUBMITTED") {
          return (
            <a href={`${import.meta.env.VITE_API_URL}${subData.submission.fileUrl}`} target="_blank" rel="noreferrer">
              <Tag icon={<CheckCircleOutlined />} color="success">
                Submitted
              </Tag>
            </a>
          );
        }
        if (subData.status === "MISSED") {
          return <Tag icon={<CloseCircleOutlined />} color="error">Missed</Tag>;
        }
        return <Tag icon={<ClockCircleOutlined />} color="warning">Pending</Tag>;
      }
    }))
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Submission Tracking Matrix</h1>
      <Table 
        dataSource={rows} 
        columns={columns} 
        rowKey={(record) => record.project._id}
        loading={loading}
        scroll={{ x: 'max-content' }}
        bordered
      />
    </div>
  );
};

export default SubmissionTracking;
