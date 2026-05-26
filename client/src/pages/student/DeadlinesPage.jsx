import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentDeadlines } from "../../store/slices/deadlineSlice";
import DeadlineCard from "../../components/deadlines/DeadlineCard";
import { CalendarClock, AlertTriangle, CheckCircle } from "lucide-react";

const DeadlinesPage = () => {
  const dispatch = useDispatch();
  const { deadlines, loading } = useSelector((state) => state.deadline);

  useEffect(() => {
    dispatch(fetchStudentDeadlines());
  }, [dispatch]);

  const total = deadlines.length;
  const completed = deadlines.filter(d => d.submissionStatus === "SUBMITTED").length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAtRisk = percent < 40 && total > 0;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header flex flex-col md:flex-row items-start justify-between md:items-center">
          <div>
            <h1 className="card-title flex items-center">
              <CalendarClock className="w-6 h-6 mr-2 text-blue-600" />
              My Deadlines
            </h1>
            <p className="card-subtitle">
              Manage your project submissions and track your progress
            </p>
          </div>
        </div>
      </div>
      
      <div className="card border-t-4 border-t-blue-500">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Submission Progress</h3>
        
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">
            {completed} of {total} completed
          </span>
          <span className={`text-sm font-bold ${isAtRisk ? 'text-red-600' : 'text-blue-600'}`}>
            {percent}%
          </span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${isAtRisk ? 'bg-red-500' : 'bg-blue-600'}`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
        
        {isAtRisk ? (
          <div className="flex items-start text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 mt-4">
            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p><strong>Warning:</strong> Your completion rate is below 40%. You are at risk of being forbidden from defending your project.</p>
          </div>
        ) : total > 0 && percent === 100 ? (
          <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 mt-4">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p>Great job! You have submitted all required assignments.</p>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-64 animate-pulse flex flex-col">
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6 mb-6"></div>
              <div className="mt-auto h-10 bg-slate-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : deadlines.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">No Deadlines Found</h3>
          <p className="text-slate-500">You don't have any pending deadlines for your project yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
          {deadlines.map((dl) => (
            <DeadlineCard key={dl._id} deadline={dl} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DeadlinesPage;
