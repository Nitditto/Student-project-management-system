import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import ChatWidget from "../chat/ChatWidget";
import OnboardingTour from "./OnboardingTour";

const DashboardLayout = ({ userRole }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    // Auto-trigger tour on the user's first visit
    const hasSeenTour = localStorage.getItem(`has_seen_tour_${userRole}`);
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setTourOpen(true);
        localStorage.setItem(`has_seen_tour_${userRole}`, "true");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [userRole]);

  useEffect(() => {
    // Set up custom event listener to manually start tour from other components (like Navbar Q&A modal)
    const handleStartTour = () => {
      setTourOpen(true);
    };
    window.addEventListener("start-onboarding-tour", handleStartTour);
    return () => {
      window.removeEventListener("start-onboarding-tour", handleStartTour);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pt-[66px]">
      {/* Navbar */}
      <Navbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userRole={userRole}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          userRole={userRole}
        />

        {/* Main Content */}
        <main
          id="main-content-container"
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Chat Widget */}
      <ChatWidget />

      {/* Onboarding Tour */}
      <OnboardingTour
        userRole={userRole}
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
