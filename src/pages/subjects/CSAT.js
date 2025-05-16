import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

// Import the image
import dishaIasCsatImage from "../../assets/dishaiascsat.jpg";

const CSAT = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const BOOKS = [
    { name: "Disha IAS CSAT Book", path: "/disha-csat", image: dishaIasCsatImage },
    // Add more books in the future, e.g., { name: "Another Book", path: "/another-book" }
  ];

  const handleGoBack = () => {
    console.log("Navigating back to previous page");
    navigate(-1);
  };

  const handleCardClick = (path) => (e) => {
    console.log(`handleCardClick: path=${path}, user=${user ? user.uid : 'not logged in'}`);
    if (!user) {
      e.preventDefault();
      console.log("handleCardClick: User not logged in, redirecting to login");
      navigate("/login", { state: { from: path } });
    } else {
      console.log("handleCardClick: Allowing Link navigation to proceed");
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
      <nav className="fixed top-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-3 flex justify-between items-center shadow-lg z-50 h-16">
        <div className="flex items-center gap-0.5 max-w-[40%]">
          <button
            onClick={handleGoBack}
            className="text-zinc-300 hover:text-blue-400 transition-colors duration-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight text-blue-400">
            TrainWithMe
          </h1>
        </div>
      </nav>

      <div className="pt-16 px-4 sm:px-6 lg:px-8 w-full">
        {/* Cards Positioned Below Navbar in the Left Corner, in a Column on Mobile, Row on Larger Screens */}
        <div className="absolute top-20 left-4 sm:left-6 lg:left-8 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
          {BOOKS.map((book, index) => (
            <Link
              key={index}
              to={book.path}
              onClick={handleCardClick(book.path)}
            >
              <div
                className="relative w-[350px] sm:w-[300px] lg:w-[450px] h-48 sm:h-56 lg:h-64 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group cursor-pointer"
                style={{
                  backgroundImage: book.image ? `url(${book.image})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg group-hover:bg-opacity-40 transition-opacity duration-300"></div>
                {/* Book Spine Effect */}
                <div className="absolute left-0 top-0 bottom-0 w-4 sm:w-6 bg-gray-800 opacity-80 rounded-l-lg shadow-lg">
                  <div className="h-full w-1 bg-gray-700 opacity-90 absolute left-0 top-0"></div>
                </div>
                {/* Book Cover */}
                <div className="absolute left-4 sm:left-6 right-0 top-0 bottom-0 rounded-r-lg p-4 sm:p-6 flex flex-col justify-center items-center">
                  <span className="text-white text-center font-bold text-sm sm:text-lg lg:text-xl line-clamp-3 z-10">
                    {book.name}
                  </span>
                </div>
                {/* 3D Shadow Effect */}
                <div className="absolute inset-0 rounded-lg shadow-[inset_-2px_2px_8px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_-4px_4px_12px_rgba(0,0,0,0.4)] transition-shadow duration-300"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CSAT;