import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import NewsCard from "./subjects/NewsCard";
import BottomBar from "./subjects/BottomBar";
import Profile from "./subjects/Profile";

// Import all images
import economyImage from "../assets/economy.jpg";
import environmentImage from "../assets/environment.jpg";
import geographyImage from "../assets/Geography.jpg";
import historyImage from "../assets/history.jpg";
import polityImage from "../assets/polity.jpg";
import previousYearPaperImage from "../assets/previousyearpaper.jpg";
import scienceImage from "../assets/Science.jpeg";
import csatImage from "../assets/csat.jpg";
import currentAffairsImage from "../assets/currentaffairs.webp";
import "@fontsource/inter-tight/700.css"; // Import Inter Tight for Perplexity-like font

const UPSCPrelims = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  // Query param logic for view
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("view") || "news";
  });
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newView = params.get("view") || "news";
    if (newView !== view) setView(newView);
  }, [location.search, view]);

  const SUBJECTS = [
    { path: "/polity", name: "Polity", color: "from-blue-500 to-blue-700", hoverColor: "from-blue-600 to-blue-800", image: polityImage },
    { path: "/history", name: "History", color: "from-purple-500 to-purple-700", hoverColor: "from-purple-600 to-purple-800", image: historyImage },
    { path: "/geography", name: "Geography", color: "from-green-500 to-green-700", hoverColor: "from-green-600 to-green-800", image: geographyImage },
    { path: "/science", name: "Science", color: "from-yellow-500 to-yellow-700", hoverColor: "from-yellow-600 to-yellow-800", image: scienceImage },
    { path: "/environment", name: "Environment", color: "from-teal-500 to-teal-700", hoverColor: "from-teal-600 to-teal-800", image: environmentImage },
    { path: "/economy", name: "Economy", color: "from-red-500 to-red-700", hoverColor: "from-red-600 to-red-800", image: economyImage },
    { path: "/csat", name: "CSAT", color: "from-gray-500 to-gray-700", hoverColor: "from-gray-600 to-gray-800", image: csatImage },
    { path: "/current-affairs", name: "Current Affairs", color: "from-indigo-500 to-indigo-700", hoverColor: "from-indigo-600 to-indigo-800", image: currentAffairsImage },
    { path: "/previous-year-papers", name: "Previous Year Papers", color: "from-cyan-500 to-cyan-700", hoverColor: "from-cyan-600 to-cyan-800", image: previousYearPaperImage },
  ];

  const handleSubjectClick = (path, action) => (e) => {
    console.log(`handleSubjectClick: path=${path}, user=${user ? user.uid : 'not logged in'}, action=${action ? 'present' : 'not present'}`);
    if (!user) {
      e.preventDefault();
      console.log("handleSubjectClick: User not logged in, redirecting to login");
      navigate("/login", { state: { from: path } });
    } else if (action) {
      e.preventDefault();
      console.log("handleSubjectClick: Executing action");
      action();
    } else {
      console.log("handleSubjectClick: Allowing Link navigation to proceed");
    }
  };

  useEffect(() => {
    console.log("UpscPrelims: user or location changed - user:", user, "location:", location);
  }, [user, location]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 40) {
        setShowHeader(false); // Hide on scroll down
      } else {
        setShowHeader(true); // Show on scroll up
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overscroll-none relative">
      {/* Show header and profile only if NOT in news view */}
      {view !== "news" && (
        <>
          {/* TrainWithMe at top left */}
          <div
            className={`fixed top-0.5 left-4 z-50 pointer-events-none select-none transition-transform duration-300 ${
              showHeader ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0"
            }`}
          >
            <span
              className="text-2xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-105"
              style={{
                fontFamily: '"Inter Tight", "Inter", "Segoe UI", "Arial", sans-serif',
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              trainwithme
            </span>
          </div>
          {/* Profile button at top right */}
          <div
            className={`fixed top-0.5 right-2 z-50 pointer-events-auto transition-transform duration-300 ${
              showHeader ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0"
            }`}
          >
            <button
              onClick={() => {
                if (user) setShowProfile((prev) => !prev);
                else navigate("/login", { state: { from: location.pathname } });
              }}
              className="flex items-center gap-2 focus:outline-none"
            >
              {user ? (
                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-white font-bold text-2xl shadow hover:bg-gray-700 transition-colors duration-200 select-none">
                  {user.displayName
                    ? user.displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : user.email
                    ? user.email[0].toUpperCase()
                    : "U"}
                </span>
              ) : (
                <span className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg shadow transition-colors duration-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">Login</span>
                </span>
              )}
            </button>
            {user && showProfile && (
              <div className="absolute right-0 mt-2 z-[100] flex flex-col items-end">
                <div className="w-40 bg-gray-800 rounded-xl shadow-lg py-6 flex flex-col items-center">
                  <div className="text-white text-sm mb-4 break-all text-center">
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to logout?")) {
                        window.location.href = "/logout";
                      }
                    }}
                    className="w-28 mt-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main content */}
      <div className="pt-8 pb-20 px-4 sm:px-6 lg:px-8 w-full overflow-y-auto relative z-40">
        <div className="pt-2 w-full">
          {view === "test" ? (
            <div className="flex flex-row flex-wrap gap-4 sm:gap-6">
              {SUBJECTS.map((subject, index) => (
                <Link
                  key={index}
                  to={subject.path}
                  onClick={handleSubjectClick(subject.path, subject.action)}
                >
                  <div
                    className="relative w-[350px] sm:w-[300px] lg:w-[450px] h-48 sm:h-56 lg:h-64 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer"
                    style={{
                      backgroundImage: subject.image ? `url(${subject.image})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                    <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gray-800 opacity-80 rounded-l-lg shadow-lg">
                      <div className="h-full w-1 bg-gray-700 opacity-90 absolute left-0 top-0"></div>
                    </div>
                    <div className="absolute left-4 sm:left-6 right-0 top-0 bottom-0 rounded-r-lg p-4 sm:p-6 flex flex-col justify-center items-center">
                      <span className="text-white text-center font-bold text-sm sm:text-lg lg:text-xl line-clamp-3 z-10">
                        {subject.name}
                      </span>
                    </div>
                    <div className="absolute inset-0 rounded-lg shadow-[inset_-2px_2px_8px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_-4px_4px_12px_rgba(0,0,0,0.4)] transition-shadow duration-300"></div>
                  </div>
                </Link>
              ))}
            </div>
          ) : view === "news" ? (
            <NewsCard />
          ) : (
            <div className="text-white">Invalid view: {view}</div>
          )}
        </div>
      </div>

      <BottomBar view={view} setView={setView} hideProfile />
    </div>
  );
};

export default UPSCPrelims;