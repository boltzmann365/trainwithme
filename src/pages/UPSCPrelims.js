import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import BottomBar from "./subjects/BottomBar";

import economyImage from "../assets/economy.jpg";
import environmentImage from "../assets/environment.jpg";
import geographyImage from "../assets/Geography.jpg";
import historyImage from "../assets/history.jpg";
import polityImage from "../assets/polity.jpg";
import previousYearPaperImage from "../assets/previousyearpaper.jpg";
import scienceImage from "../assets/Science.jpeg";
import csatImage from "../assets/csat.jpg";
import currentAffairsImage from "../assets/currentaffairs.webp";
import "@fontsource/inter-tight/700.css";

const UPSCPrelims = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  const SUBJECTS = [
    { path: "/polity", name: "Polity", image: polityImage },
    { path: "/history", name: "History", image: historyImage },
    { path: "/geography", name: "Geography", image: geographyImage },
    { path: "/science", name: "Science", image: scienceImage },
    { path: "/environment", name: "Environment", image: environmentImage },
    { path: "/economy", name: "Economy", image: economyImage },
    { path: "/csat", name: "CSAT", image: csatImage },
    { path: "/current-affairs", name: "Current Affairs", image: currentAffairsImage },
    { path: "/previous-year-papers", name: "Previous Year Papers", image: previousYearPaperImage },
  ];

  const handleSubjectClick = useCallback(
    (path) => (e) => {
      if (!user) {
        e.preventDefault();
        navigate("/login", { state: { from: path } });
      }
    },
    [user, navigate]
  );

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      setShowProfile(false);
      navigate('/');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 40) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    // ========================================================
    // START: MODIFICATION FOR RESPONSIVE PAGE LAYOUT
    // `min-h-screen` applies to all sizes, allowing mobile to scroll.
    // `md:h-screen md:flex md:flex-col` applies the fixed, non-scrolling layout ONLY to desktops.
    // ========================================================
    <div className="min-h-screen md:h-screen bg-gray-900 text-white font-poppins md:flex md:flex-col">
      {/* Header and Profile Button (no changes) */}
      <>
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
                {user.username
                  ? user.username[0].toUpperCase()
                  : user.email ? user.email[0].toUpperCase() : "U"}
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
              <div className="w-48 bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col items-center">
                  <div className="font-bold text-white text-md mb-2 truncate w-full text-center">{user.username || 'User'}</div>
                  <div className="text-gray-400 text-xs mb-4 break-all text-center">{user.email}</div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Logout
                  </button>
              </div>
            </div>
          )}
        </div>
      </>

      {/* ======================================================== */}
      {/* START: MODIFICATION FOR RESPONSIVE CONTENT AREA          */}
      {/* `md:flex-1` makes this grow ONLY on desktop. `pb-20`     */}
      {/* provides space for the bottom bar on all screen sizes.   */}
      {/* ======================================================== */}
      <div className="md:flex-1 pt-12 pb-20 px-4 sm:px-6 lg:px-8 w-full">
        <div className="h-full grid grid-cols-1 md:grid-cols-3 md:grid-rows-3 gap-4 sm:gap-6">
          {SUBJECTS.map((subject, index) => (
            <Link key={index} to={subject.path} onClick={handleSubjectClick(subject.path)}>
              {/* ======================================================== */}
              {/* START: MODIFICATION FOR RESPONSIVE CARD HEIGHT           */}
              {/* `h-48 sm:h-56` provides fixed height for mobile scrolling.*/}
              {/* `md:h-full` makes the height flexible ONLY on desktop.   */}
              {/* ======================================================== */}
              <div
                className="relative w-full h-48 sm:h-56 md:h-full rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer"
                style={{
                  backgroundImage: subject.image ? `url(${subject.image})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gray-800 opacity-80 rounded-l-lg shadow-lg">
                  <div className="h-full w-1 bg-gray-700 opacity-90 absolute left-0 top-0"></div>
                </div>
                <div className="absolute left-4 sm:left-6 right-0 top-0 bottom-0 rounded-r-lg p-4 sm:p-6 flex flex-col justify-center items-center">
                  <span className="text-white text-center font-bold text-sm sm:text-lg lg:text-xl line-clamp-3 z-10">{subject.name}</span>
                </div>
                <div className="absolute inset-0 rounded-lg shadow-[inset_-2px_2px_8px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_-4px_4px_12px_rgba(0,0,0,0.4)] transition-shadow duration-300"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <BottomBar view="test" hideProfile />
    </div>
  );
};

export default React.memo(UPSCPrelims);