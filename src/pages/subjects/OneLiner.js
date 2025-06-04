import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";
import axios from "axios";

const OneLiner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qandaPairs, setQandaPairs] = useState([]);
  const [books, setBooks] = useState(["All"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedBook, setSelectedBook] = useState("All");
  const [showSidebar, setShowSidebar] = useState(false);
  const scrollContainerRef = useRef(null);
  const API_URL = "https://new-backend-tx3z.onrender.com";
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/oneliners" } });
      return;
    }
    fetchBooks();
    fetchQandA(true);
  }, [user]);

  useEffect(() => {
    if (selectedBook !== "All") {
      setQandaPairs([]);
      setPage(1);
      setHasMore(true);
      fetchQandA(true);
    }
  }, [selectedBook]);

  // Infinite scroll on manual scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10 && hasMore && !loading) {
          setPage(prev => prev + 1);
          fetchQandA(false);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [qandaPairs, loading, hasMore]);

  const fetchBooks = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/get-qanda-books`, {
        params: { userId: user.email.split('@')[0] }
      });
      const bookNames = response.data.books || [];
      setBooks(["All", ...bookNames]);
    } catch (err) {
      console.error("fetchBooks error:", err.message);
    }
  };

  const fetchQandA = async (reset = false) => {
    if (!hasMore && !reset) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/user/get-qanda`, {
        params: {
          userId: user.email.split('@')[0],
          bookName: selectedBook === "All" ? undefined : selectedBook,
          page: reset ? 1 : page,
          limit: ITEMS_PER_PAGE
        }
      });
      const newPairs = response.data.qanda || [];
      setQandaPairs(prev => reset ? newPairs : [...prev, ...newPairs]);
      setHasMore(newPairs.length === ITEMS_PER_PAGE);
      if (reset) setPage(2);
    } catch (err) {
      const errorMsg = err.response?.status === 404 ? "No more Q and A pairs available." : err.response?.data?.error || "Failed to load Q and A pairs.";
      setError(errorMsg);
      setHasMore(false);
      console.error("fetchQandA error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookChange = (book) => {
    setSelectedBook(book);
    setQandaPairs([]);
    setPage(1);
    setHasMore(true);
    setShowSidebar(false);
  };

  const handleGoBack = () => {
    navigate("/upsc-prelims");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overscroll-none">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .qanda-card {
            animation: fadeInUp 0.5s ease-out forwards;
          }
        `}
      </style>
      <nav className="fixed top-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-3 flex justify-between items-center shadow-lg z-50 h-16">
        <div className="flex items-center gap-0.5 max-w-[40%]">
          <button onClick={handleGoBack} className="text-gray-300 hover:text-blue-400 transition-colors duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight text-blue-400">Q & A World</h1>
        </div>
        <button onClick={() => setShowSidebar(true)} className="text-gray-300 hover:text-blue-400 transition-colors duration-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      <div className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
        {error && (
          <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
            <p className="text-base sm:text-lg text-red-200">{error}</p>
          </div>
        )}
        <div
          ref={scrollContainerRef}
          className="h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          {qandaPairs.length === 0 && !loading && !error ? (
            <p className="text-gray-400 text-center mt-20">No Q and A pairs available for {selectedBook}.</p>
          ) : (
            qandaPairs.map((pair, index) => (
              <div
                key={index}
                className="qanda-card bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg hover:shadow-xl shadow-blue-500/50 border border-blue-400/30 mb-6 mx-auto max-w-2xl transition-all duration-300 hover:scale-105"
              >
                <p className="text-lg sm:text-xl font-bold text-white mb-3">{pair.question}</p>
                <p className="text-base text-gray-100 leading-relaxed">{pair.answer}</p>
                <p className="text-sm text-blue-200 mt-3 italic">Book: {pair.bookName}</p>
              </div>
            ))
          )}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}
        </div>
      </div>

      <div
        className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-gray-800 shadow-2xl z-50 transition-transform duration-300 ease-in-out"
        style={{ transform: showSidebar ? 'translateX(0)' : 'translateX(256px)' }}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-400">Choose Book</h2>
            <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-white text-xl font-bold">
              ×
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {books.map((book) => (
              <button
                key={book}
                onClick={() => handleBookChange(book)}
                className={`px-3 py-2 rounded-lg text-base font-semibold transition-all duration-300 transform hover:scale-105 ${
                  selectedBook === book ? "bg-blue-600 text-white shadow-lg" : "bg-gray-600 text-gray-300"
                }`}
              >
                {book}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneLiner;