import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth, useQanda } from "../../App";
import "@fontsource/inter-tight/700.css";

const BottomBar = ({ view, setView }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { refreshQanda } = useQanda();
  const [showProfile, setShowProfile] = useState(false);

  const handleViewChange = (newView) => {
    console.log(`BottomBar: handleViewChange called with newView=${newView}, current location=`, location);
    if (location.pathname === "/oneliners" && newView !== "qanda") {
      console.log("BottomBar: Leaving OneLiner, triggering Q&A refresh");
      refreshQanda();
    }
    const targetPath = `/upsc-prelims?view=${newView}`;
    navigate(targetPath, { replace: true });
    setView(newView);
    setShowProfile(false);
    console.log(`BottomBar: Navigated to ${targetPath}`);
  };

  const handleProfileClick = () => {
    if (user) {
      console.log("BottomBar: Toggling Profile component");
      setShowProfile((prev) => !prev);
    } else {
      console.log("BottomBar: Navigating to login");
      navigate("/login", { state: { from: location.pathname } });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-lg h-16 flex justify-center items-center z-[60] shadow-lg">
      <div className="flex w-full max-w-screen-lg gap-2 px-4">
        <div className="flex-1 flex justify-center items-center">
          <button
            onClick={() => {
              console.log("BottomBar: News button clicked");
              handleViewChange("news");
            }}
            className={`flex flex-col items-center justify-center w-full h-12 rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              view === "news" && location.pathname === "/upsc-prelims"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/50"
                : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
            }`}
            style={{ fontFamily: '"Inter Tight", "Inter", "Segoe UI", "Arial", sans-serif' }}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10h.01M15 10h.01M12 14h.01" />
            </svg>
            <span className="text-xs font-bold tracking-tight">News</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <button
            onClick={() => handleViewChange("test")}
            className={`flex flex-col items-center justify-center w-full h-12 rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              view === "test" && location.pathname === "/upsc-prelims"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/50"
                : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
            }`}
            style={{ fontFamily: '"Inter Tight", "Inter", "Segoe UI", "Arial", sans-serif' }}
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 26" xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-xs font-bold tracking-tight">Tests</span>
          </button>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <Link to="/battleground" className="w-full flex justify-center">
            <button
              className={`flex flex-col items-center justify-center w-full h-12 rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                location.pathname === "/battleground"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/50"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
              }`}
              style={{ fontFamily: '"Inter Tight", "Inter", "Segoe UI", "Arial", sans-serif' }}
              onClick={() => {
                if (location.pathname === "/oneliners") {
                  console.log("BottomBar: Leaving OneLiner for Battleground, triggering Q&A refresh");
                  refreshQanda();
                }
              }}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 4l7 7-7 7M11 4l-7 7 7 7" />
              </svg>
              <span className="text-xs font-bold tracking-tight">Battleground</span>
            </button>
          </Link>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <Link to="/oneliners" className="w-full flex justify-center">
            <button
              className={`flex flex-col items-center justify-center w-full h-12 rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                location.pathname === "/oneliners"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/50"
                  : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
              }`}
              style={{ fontFamily: '"Inter Tight", "Inter", "Segoe UI", "Arial", sans-serif' }}
            >
              <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 4.42-4.48 7.5-8 11-3.52-3.5-8-6.58-8-11 0-2.21 1.79-4 4-4 1.742 0 3.223.835 3.772 2z"
                />
              </svg>
              <span className="text-xs font-bold tracking-tight">Q & A</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BottomBar;