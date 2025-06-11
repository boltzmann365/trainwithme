import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const NewsCard = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestedArticles, setSuggestedArticles] = useState([]);
  const [displayedArticleIds, setDisplayedArticleIds] = useState(new Set());
  const limit = 10;
  const scrollContainerRef = useRef(null);
  const modalScrollRef = useRef(null);
  const suggestedSectionRef = useRef(null);
  const suggestionScrollRef = useRef(null);
  const modalRef = useRef(null);
  const touchStartY = useRef(null);
  const touchCurrentY = useRef(null);
  const isDragging = useRef(false);

  const API_URL = process.env.REACT_APP_API_URL || 'https://new-backend-tx3z.onrender.com';

  useEffect(() => {
    const fetchArticles = async () => {
      if (!hasMore) return;
      try {
        setLoading(true);
        setError(null);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const response = await axios.get(`${API_URL}/admin/get-current-affairs-articles`, {
          params: { startDate: thirtyDaysAgo.toISOString().split('T')[0], page, limit },
        });
        const newArticles = response.data.articles || [];
        setArticles((prev) => (page === 1 ? newArticles : [...prev, ...newArticles]));
        setHasMore(newArticles.length === limit);
        setLoading(false);
        console.log(`NewsCard: Fetched ${newArticles.length} articles for page ${page}`);
      } catch (err) {
        console.error('NewsCard: Error fetching articles:', err.message, err.response?.data, err.response?.status);
        if (err.response) {
          setError(`Failed to load articles: ${err.response.data?.error || 'Server error'} (Status: ${err.response.status})`);
        } else if (err.request) {
          setError('Failed to load articles: Network error, possibly due to server unavailability.');
        } else {
          setError('Failed to load articles: An unexpected error occurred.');
        }
        setLoading(false);
      }
    };
    fetchArticles();
  }, [page, API_URL, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current && hasMore && !loading) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
          setPage((prev) => prev + 1);
        }
      }
    };
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, loading]);

  useEffect(() => {
    if (selectedArticle && modalScrollRef.current && suggestedSectionRef.current) {
      const modal = modalScrollRef.current;
      if (window.innerWidth >= 640) {
        const suggested = suggestedSectionRef.current;
        const bottomBarHeight = 3 * 16;
        const offset = 40;
        const scrollPosition = suggested.offsetTop - modal.clientHeight + bottomBarHeight + offset;
        modal.scrollTop = scrollPosition > 0 ? scrollPosition : 0;
      } else {
        modal.scrollTop = 0;
      }
    }
  }, [selectedArticle]);

  useEffect(() => {
    if (selectedArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedArticle]);

  const handleCardClick = (article) => {
    console.log('NewsCard: Opening article:', article.heading);
    setSelectedArticle(article);
    setSuggestionIndex(0);
    const filtered = articles.filter((a) => a._id !== article._id);
    const initialSuggestions = filtered.slice(0, 3);
    setSuggestedArticles(initialSuggestions);
    setDisplayedArticleIds(new Set([article._id, ...initialSuggestions.map(a => a._id)]));
  };

  const closeModal = () => {
    console.log('NewsCard: Closing modal');
    if (modalRef.current) {
      modalRef.current.style.transform = 'translateY(100%)';
      setTimeout(() => {
        setSelectedArticle(null);
        modalRef.current.style.transform = 'translateY(0)';
      }, 300);
    } else {
      setSelectedArticle(null);
    }
    setDisplayedArticleIds(new Set());
  };

  const getSuggestedArticles = () => {
    if (!selectedArticle || articles.length <= 1) return [];
    if (window.innerWidth < 640) {
      const filtered = articles.filter((a) => a._id !== selectedArticle._id);
      return filtered;
    }
    return suggestedArticles;
  };

  const handleNextSuggestions = () => {
    if (window.innerWidth < 640) {
      const filtered = articles.filter((a) => a._id !== selectedArticle._id);
      setSuggestionIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= filtered.length ? 0 : nextIndex;
      });
      if (suggestionScrollRef.current) {
        suggestionScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
      }
    } else {
      const filtered = articles.filter((a) => a._id !== selectedArticle._id && !displayedArticleIds.has(a._id));
      setSuggestionIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= articles.length ? 0 : nextIndex;
      });
      setSuggestedArticles((prev) => {
        const newArticles = [...prev.slice(1)]; // Remove leftmost article
        const nextArticle = filtered.length > 0 ? filtered[0] : null;
        if (nextArticle) {
          newArticles.push(nextArticle);
          setDisplayedArticleIds((prevSet) => new Set([...prevSet, nextArticle._id]));
        }
        return newArticles.filter(a => a); // Remove nulls if no new articles
      });
    }
  };

  const handlePrevSuggestions = () => {
    if (window.innerWidth < 640) {
      const filtered = articles.filter((a) => a._id !== selectedArticle._id);
      setSuggestionIndex((prev) => {
        const prevIndex = prev - 1;
        return prevIndex < 0 ? filtered.length - 1 : prevIndex;
      });
      if (suggestionScrollRef.current) {
        suggestionScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
      }
    } else {
      const filtered = articles.filter((a) => a._id !== selectedArticle._id && !displayedArticleIds.has(a._id));
      setSuggestionIndex((prev) => {
        const prevIndex = prev - 1;
        return prevIndex < 0 ? articles.length - 1 : prevIndex;
      });
      setSuggestedArticles((prev) => {
        const newArticles = [...prev.slice(0, -1)]; // Remove rightmost article
        const prevArticle = filtered.length > 0 ? filtered[filtered.length - 1] : null;
        if (prevArticle) {
          newArticles.unshift(prevArticle);
          setDisplayedArticleIds((prevSet) => new Set([...prevSet, prevArticle._id]));
        }
        return newArticles.filter(a => a);
      });
    }
  };

  const handleMainNextArticle = () => {
    const suggested = getSuggestedArticles();
    if (suggested.length === 0) return;
    const nextArticle = suggested[0]; // Article near "Previous" arrow
    if (!nextArticle) return;
    console.log('NewsCard: Switching to next main article:', nextArticle.heading);
    setSelectedArticle(nextArticle);
    if (window.innerWidth >= 640) {
      const filtered = articles.filter((a) => a._id !== nextArticle._id && !displayedArticleIds.has(a._id));
      setSuggestedArticles((prev) => {
        const newArticles = [...prev.slice(1)]; // Shift left
        const newSuggestion = filtered.length > 0 ? filtered[0] : null;
        if (newSuggestion) {
          newArticles.push(newSuggestion);
          setDisplayedArticleIds((prevSet) => new Set([...prevSet, nextArticle._id, newSuggestion._id]));
        }
        return newArticles.filter(a => a);
      });
      setSuggestionIndex((prev) => prev + 1);
    } else {
      const filtered = articles.filter((a) => a._id !== nextArticle._id);
      setSuggestedArticles(filtered.slice(0, 3));
      setDisplayedArticleIds(new Set([nextArticle._id, ...filtered.slice(0, 3).map(a => a._id)]));
      setSuggestionIndex(0);
    }
  };

  const handleTouchStart = (e) => {
    if (window.innerWidth >= 640) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchCurrentY.current = touch.clientY;
    isDragging.current = false;
    if (modalRef.current) {
      modalRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e) => {
    if (window.innerWidth >= 640) return;
    const touch = e.touches[0];
    touchCurrentY.current = touch.clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;

    if (deltaY > 0 && modalScrollRef.current.scrollTop === 0) {
      isDragging.current = true;
      e.preventDefault();
      const translateY = Math.min(deltaY, 200);
      modalRef.current.style.transform = `translateY(${translateY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 640) return;
    if (!isDragging.current) return;

    const deltaY = touchCurrentY.current - touchStartY.current;
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s ease-out';
      if (deltaY > 100) {
        closeModal();
      } else {
        modalRef.current.style.transform = 'translateY(0)';
      }
    }
    isDragging.current = false;
  };

  if (loading && page === 1) {
    return <div className="text-center text-gray-400 py-10">Loading articles...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400 py-10">{error}</div>;
  }

  return (
    <div className="w-full">
      <div
        ref={scrollContainerRef}
        className="pt-2 pb-16 h-[calc(100vh-4rem)] overflow-y-auto scrollbar-hide z-10"
        style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>
          {`
            div[ref="scrollContainerRef"]::-webkit-scrollbar {
              display: none;
            }
            @media (min-width: 640px) {
              .article-card:hover {
                border: 2px solid #3b82f6 !important;
                box-shadow: 0 0 15px rgba(59, 130, 246, 0.5) !important;
                transform: scale(1.05) !important;
              }
              .suggested-article {
                transition: transform 0.3s ease-in-out;
              }
            }
          `}
        </style>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
          {articles.length === 0 ? (
            <div className="text-center text-gray-400 col-span-full py-10">No articles available.</div>
          ) : (
            articles.map((article, index) => (
              <div
                key={`${article._id}-${index}`}
                className="bg-[#1F2526] rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 article-card"
                onClick={() => handleCardClick(article)}
              >
                <img
                  src={article.imageUrl || 'https://via.placeholder.com/300'}
                  alt={article.heading}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2">{article.heading}</h3>
                </div>
              </div>
            ))
          )}
          {loading && page > 1 && (
            <div className="col-span-full flex items-center justify-center py-4">
              <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}
          {!hasMore && articles.length > 0 && (
            <div className="col-span-full text-center text-gray-400 py-4">No more articles to load.</div>
          )}
        </div>
      </div>
      {selectedArticle && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 z-50 flex">
          <div
            ref={modalRef}
            className="sm:rounded-none sm:mt-0 rounded-t-3xl bg-gray-800 w-full h-[calc(100vh-1rem)] relative flex flex-col shadow-lg overflow-hidden mt-4"
            style={{ transition: 'transform 0.3s ease-out' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <style>
              {`
                @media (max-width: 639px) {
                  div[ref="modalRef"] {
                    position: relative;
                  }
                  div[ref="modalRef"]::before {
                    content: '';
                    position: absolute;
                    top: 0.5rem;
                    left: 0.25rem;
                    right: 0.25rem;
                    bottom: -0.5rem;
                    background: rgba(0, 0, 0, 0.6);
                    border-top-left-radius: 1.5rem;
                    border-top-right-radius: 1.5rem;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
                    z-index: -1;
                    pointer-events: none;
                  }
                  img.article-image {
                    width: 100vw !important;
                    height: 20rem !important;
                    max-height: 20rem !important;
                    margin-left: calc(-1rem - 1px) !important;
                    margin-right: calc(-1rem - 1px) !important;
                  }
                  .scroll-down-symbol {
                    position: absolute;
                    top: 0.5rem;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 2rem;
                    height: 0.25rem;
                    background: rgba(209, 213, 219, 0.8);
                    border-radius: 0.125rem;
                    z-index: 60;
                    pointer-events: none;
                  }
                  button[title="Close"] {
                    color: #D1D5DB;
                  }
                  button[title="Close"]:hover {
                    color: #9CA3AF;
                  }
                  button[title="Next Article"] {
                    display: none !important;
                  }
                }
              `}
            </style>
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-300 hover:text-white z-60"
              title="Close"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={handleMainNextArticle}
              className="sm:block absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white z-60 hidden"
              style={{ marginRight: '1rem' }}
              title="Next Article"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div
              ref={modalScrollRef}
              className="overflow-y-auto flex-1 sm:pt-0 sm:pr-8 sm:pl-8 pr-4 pl-4 pt-0 pb-12"
              style={{ paddingBottom: '3rem' }}
            >
              {window.innerWidth < 640 && (
                <div className="scroll-down-symbol" />
              )}
              <img
                src={selectedArticle.imageUrl || 'https://via.placeholder.com/300'}
                alt={selectedArticle.heading}
                className="w-full h-48 object-cover rounded-t-3xl mb-4 max-w-none article-image sm:float-left sm:w-80 sm:h-80 sm:rounded-md sm:mr-6 sm:ml-0 sm:mb-4"
                style={{ maxWidth: 'none' }}
                width="1000"
                height="320"
              />
              <div className="w-full" style={{ minHeight: 'calc(100vh - 8rem)' }}>
                <h2 className="text-white font-bold text-xl sm:text-2xl mb-2">{selectedArticle.heading}</h2>
                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-line">
                  {selectedArticle.content}
                </p>
                <div className="clear-both" />
                <div className="mt-6 sm:hidden">
                  <h3 className="text-white font-bold text-lg">Keep Reading</h3>
                </div>
              </div>
              {getSuggestedArticles().length > 0 && (
                <div ref={suggestedSectionRef} style={{ marginTop: '0.25rem' }}>
                  <div className="hidden sm:block">
                    <div
                      style={{
                        background: '#1F2526',
                        borderTop: '1px solid #374151',
                        boxShadow: '0 -2px 16px 0 rgba(0,0,0,0.2)',
                        padding: '1rem 2rem',
                      }}
                    >
                      <h3 className="text-white font-bold text-xl mb-0">You May Also Like</h3>
                    </div>
                    <div
                      style={{
                        background: '#1F2526',
                        padding: '1rem 2rem 2rem 2rem',
                        borderBottomLeftRadius: '1rem',
                        borderBottomRightRadius: '1rem',
                        maxHeight: '50vh',
                        overflowY: 'auto',
                        position: 'relative',
                      }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                        {getSuggestedArticles().map((article, index) => (
                          <div
                            key={`${article._id}-${index}`}
                            className="bg-[#1F2526] rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 article-card suggested-article"
                            onClick={() => handleCardClick(article)}
                          >
                            <img
                              src={article.imageUrl || 'https://via.placeholder.com/300'}
                              alt={article.heading}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-4">
                              <h3 className="text-white font-bold text-sm sm:text-base line-clamp-2">{article.heading}</h3>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handlePrevSuggestions}
                          className="absolute left-0 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white z-10"
                          style={{ marginLeft: '-2rem' }}
                          title="Previous Suggestions"
                        >
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={handleNextSuggestions}
                          className="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white z-10"
                          style={{ marginRight: '-2rem' }}
                          title="Next Suggestions"
                        >
                          <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="sm:hidden mt-4 relative">
                    <div
                      ref={suggestionScrollRef}
                      className="flex flex-row overflow-x-auto scrollbar-hide snap-x snap-mandatory"
                      style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <style>
                        {`
                          div[ref="suggestionScrollRef"]::-webkit-scrollbar {
                            display: none;
                          }
                        `}
                      </style>
                      {getSuggestedArticles().map((article, index) => (
                        <div
                          key={`${article._id}-${index}`}
                          className="flex-shrink-0 w-56 mx-2 snap-center cursor-pointer"
                          onClick={() => handleCardClick(article)}
                          style={{ maxWidth: '75%' }}
                        >
                          <img
                            src={article.imageUrl || 'https://via.placeholder.com/300'}
                            alt={article.heading}
                            className="w-full h-36 object-cover rounded-md mb-2"
                          />
                          <h3 className="text-white font-bold text-sm line-clamp-2">{article.heading}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: '0px',
                height: '3rem',
                background: '#111827',
                zIndex: 50,
                borderTop: '1px solid #374151',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsCard;