import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";
import axios from "axios";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get("https://new-backend-tx3z.onrender.com/user/get-profile", {
          params: { email: user.email },
        });
        setProfileData(response.data.user);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="w-64 sm:w-80 bg-[#1F2526]/90 backdrop-blur-md rounded-lg shadow-2xl p-4 sm:p-6 font-poppins text-white animate-fadeIn">
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
          .profile-card {
            transition: all 0.3s ease;
          }
          .logout-button {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            transition: all 0.3s ease;
          }
          .logout-button:hover {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
          }
        `}
      </style>

      <div className="profile-card flex flex-col items-center space-y-4">
        {loading ? (
          <div className="flex items-center justify-center w-full h-32">
            <span className="inline-block w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm text-center">{error}</p>
        ) : (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-bold">
              {profileData?.username?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-center line-clamp-1">
              {profileData?.username || "User"}
            </h2>
            <p className="text-sm sm:text-base text-gray-300 text-center line-clamp-1">
              {profileData?.email || user.email}
            </p>
            <button
              onClick={handleLogout}
              className="logout-button w-full py-2 rounded-lg text-sm sm:text-base font-medium text-white focus:outline-none"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;