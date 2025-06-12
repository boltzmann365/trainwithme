import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQanda } from '../../App'; // Keep for Q&A refresh logic
import "@fontsource/inter-tight/700.css";

// An Icon component for cleanliness
const Icon = ({ path, className = "w-5 h-5 mb-1" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
  </svg>
);

const BottomBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshQanda } = useQanda();

  // Define navigation items in an array for easy management
  const navItems = [
    {
      name: 'News',
      path: '/current-affairs',
      icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2',
    },
    {
      name: 'Tests',
      path: '/upsc-prelims',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      name: 'Battleground',
      path: '/battleground',
      icon: 'M13 4l7 7-7 7M11 4l-7 7 7 7',
      onClick: () => {
        // This is a custom action for this specific button
        if (location.pathname === "/oneliners") {
          refreshQanda();
        }
      },
    },
    {
      name: 'Q & A',
      path: '/oneliners',
      icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4 0 4.42-4.48 7.5-8 11-3.52-3.5-8-6.58-8-11 0-2.21 1.79-4 4-4 1.742 0 3.223.835 3.772 2z',
    },
  ];

  const handleNavigate = (item) => {
    // Execute any custom action before navigating
    if (item.onClick) {
      item.onClick();
    }
    // Navigate to the defined path
    navigate(item.path);
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-lg h-16 flex justify-center items-center z-[60] shadow-lg">
      <div className="flex w-full max-w-screen-lg gap-2 px-4">
        {navItems.map((item) => {
          // Determine if the button is active by checking the current URL path
          const isActive = location.pathname === item.path;
          return (
            <div key={item.name} className="flex-1 flex justify-center items-center">
              <button
                onClick={() => handleNavigate(item)}
                className={`flex flex-col items-center justify-center w-full h-12 rounded-full px-4 py-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/50"
                    : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/70"
                }`}
                style={{ fontFamily: '"Inter Tight", "Inter", "Segoe UI", "Arial", sans-serif' }}
              >
                <Icon path={item.icon} />
                <span className="text-xs font-bold tracking-tight">{item.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BottomBar;
