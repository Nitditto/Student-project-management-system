import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentDeadlines } from "../../store/slices/deadlineSlice";
import DeadlineCard from "../../components/deadlines/DeadlineCard";
import { Progress } from "antd";

const DeadlinesPage = () => {
  const dispatch = useDispatch();
  const { deadlines, loading } = useSelector((state) => state.deadline);

  useEffect(() => {
    dispatch(fetchStudentDeadlines());
  }, [dispatch]);

  const total = deadlines.length;
  const completed = deadlines.filter(d => d.submissionStatus === "SUBMITTED").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Deadlines</h1>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-2">Progress</h3>
        <Progress percent={percent} status={percent < 40 ? "exception" : "active"} />
        <p className="mt-2 text-sm text-gray-500">
          Hoàn thành {completed}/{total} Deadline ({percent}%) 
          {percent < 40 && total > 0 ? " - Nguy cơ cấm bảo vệ" : ""}
        </p>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deadlines.map((dl) => (
            <DeadlineCard key={dl._id} deadline={dl} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeadlinesPage;
