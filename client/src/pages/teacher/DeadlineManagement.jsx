import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTeacherDeadlines, createDeadline } from "../../store/slices/deadlineSlice";
import { Button, Modal, Form, Input, DatePicker, Table } from "antd";
import dayjs from "dayjs";

const DeadlineManagement = () => {
  const dispatch = useDispatch();
  const { deadlines, loading } = useSelector((state) => state.deadline);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchTeacherDeadlines());
  }, [dispatch]);

  const handleCreate = async (values) => {
    await dispatch(createDeadline({
      title: values.title,
      description: values.description,
      startDate: values.dateRange[0].toISOString(),
      endDate: values.dateRange[1].toISOString(),
    })).unwrap();
    setIsModalVisible(false);
    form.resetFields();
    dispatch(fetchTeacherDeadlines());
  };

  const columns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    { 
      title: "Start Date", 
      dataIndex: "startDate", 
      key: "startDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD")
    },
    { 
      title: "End Date", 
      dataIndex: "endDate", 
      key: "endDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD")
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deadline Management</h1>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>Create New Deadline</Button>
      </div>

      <Table 
        dataSource={deadlines} 
        columns={columns} 
        rowKey="_id" 
        loading={loading}
      />

      <Modal
        title="Create New Deadline"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="dateRange" label="Date Range" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" showTime />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeadlineManagement;
