import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App'; 

const NewsCard = () => {
    const { user } = useAuth();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [suggestedArticles, setSuggestedArticles] = useState([]);
    const [displayedArticleIds, setDisplayedArticleIds] = useState(new Set());
    const [isScrolled, setIsScrolled] = useState(false);
    const [articleHistory, setArticleHistory] = useState([]);
    const limit = 10;
    
    const scrollContainerRef = useRef(null);
    const modalScrollRef = useRef(null);
    const suggestedSectionRef = useRef(null);
    const suggestionScrollRef = useRef(null);
    const modalRef = useRef(null);
    const touchStartY = useRef(null);
    const touchCurrentY = useRef(null);
    const isDragging = useRef(false);
    const navigate = useNavigate();

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    // ========================================================
    // START: MODIFICATION FOR SUGGESTION SORTING & REFRESH LOGIC
    // ========================================================

    // 1. Helper function to sort articles by seenCount (ascending), then by newest date.
    const sortArticlesBySeenCount = (articleArray) => {
        return [...articleArray].sort((a, b) => {
            const seenA = a.seenCount || 0;
            const seenB = b.seenCount || 0;
            if (seenA !== seenB) {
                return seenA - seenB;
            }
            return new Date(b.date) - new Date(a.date);
        });
    };

    // This function resets the state to trigger a fresh fetch from page 1.
    const refreshArticles = () => {
        if (loading) return;
        setPage(1);
        setArticles([]); // Clearing articles will show the main loader
        setHasMore(true);
    };

    const handleCardClick = async (article) => {
        let currentArticles = articles;
        if (user?.email) {
            try {
                await axios.post(`${API_URL}/user/mark-article-seen`, {
                    userId: user.email,
                    articleId: article._id
                });
                console.log(`NewsCard: Marked article as seen: userId=${user.email}, articleId=${article._id}`);
                // Optimistically update the seen count in the local state
                currentArticles = articles.map(a => 
                    a._id === article._id ? { ...a, seenCount: (a.seenCount || 0) + 1 } : a
                );
                setArticles(currentArticles);
            } catch (err) {
                console.error('NewsCard: Error marking article as seen:', err.message);
            }
        }

        setSelectedArticle(article);
        setArticleHistory(prev => [...prev, article]);
        setSuggestionIndex(0);
        setIsScrolled(false);
        
        // 2. Generate initial suggestions from the updated and sorted list.
        const potentialSuggestions = currentArticles.filter((a) => a._id !== article._id);
        const sortedSuggestions = sortArticlesBySeenCount(potentialSuggestions);
        const initialSuggestions = sortedSuggestions.slice(0, 3);

        setSuggestedArticles(initialSuggestions);
        setDisplayedArticleIds(new Set([article._id, ...initialSuggestions.map(a => a._id)]));
    };

    const closeModal = () => {
        if (modalRef.current) {
            modalRef.current.style.transform = 'translateY(100%)';
            setTimeout(() => {
                setSelectedArticle(null);
                if (modalRef.current) {
                    modalRef.current.style.transform = 'translateY(0)';
                }
                // 3. Refresh the entire list when the modal closes.
                refreshArticles(); 
            }, 300);
        } else {
            setSelectedArticle(null);
            refreshArticles();
        }
        setDisplayedArticleIds(new Set());
    };

    const handleNextSuggestions = () => {
        if (window.innerWidth < 640) {
            const filtered = articles.filter((a) => a._id !== selectedArticle._id);
            const sorted = sortArticlesBySeenCount(filtered);
            setSuggestionIndex((prev) => (prev + 1 >= sorted.length ? 0 : prev + 1));
            if (suggestionScrollRef.current) {
                suggestionScrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
            }
        } else {
            // 4. When cycling suggestions, find the next best one from a sorted list.
            const potentialNext = articles.filter((a) => !displayedArticleIds.has(a._id));
            const sortedPotentialNext = sortArticlesBySeenCount(potentialNext);

            setSuggestedArticles((prev) => {
                const newArticles = [...prev.slice(1)];
                const nextArticle = sortedPotentialNext.length > 0 ? sortedPotentialNext[0] : null;
                if (nextArticle) {
                    newArticles.push(nextArticle);
                    setDisplayedArticleIds((prevSet) => new Set([...prevSet, nextArticle._id]));
                }
                return newArticles.filter(a => a);
            });
        }
    };

    // ========================================================
    // END: MODIFICATION FOR SUGGESTION SORTING & REFRESH LOGIC
    // ========================================================
    
    // The rest of the component logic remains the same.
    useEffect(() => {
        if (!hasMore && page > 1) return;

        const fetchArticles = async () => {
            setLoading(true);
            setError(null);
            try {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const params = { 
                    startDate: thirtyDaysAgo.toISOString().split('T')[0], 
                    page, 
                    limit,
                    userId: user.email
                };
                const response = await axios.get(`${API_URL}/admin/get-current-affairs-articles`, { params });
                const newArticles = response.data.articles || [];
                
                setArticles(prev => page === 1 ? newArticles : [...prev, ...newArticles.filter(na => !prev.some(pa => pa._id === na._id))]);
                setHasMore(newArticles.length === limit);
            } catch (err) {
                console.error('NewsCard: Error fetching articles:', err.message);
                setError('Failed to load articles. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (user?.email) {
            fetchArticles();
        } else {
            setLoading(false);
            setError("Please log in to view articles.");
        }
    }, [page, user]); 
    
    useEffect(() => {
        const handleScroll = debounce(() => {
            if (scrollContainerRef.current && hasMore && !loading) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                if (scrollTop + clientHeight >= scrollHeight - 100) {
                    setPage(prev => prev + 1);
                }
            }
        }, 200);

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMore, loading]);

    useEffect(() => {
        if (loading || !hasMore) return;

        const container = scrollContainerRef.current;
        if (container) {
            const isScrollable = container.scrollHeight > container.clientHeight;
            if (!isScrollable) {
                setPage(prevPage => prevPage + 1);
            }
        }
    }, [articles, loading, hasMore]);
    
    useEffect(() => {
        const handleModalScroll = () => {
            if (modalScrollRef.current) {
                setIsScrolled(modalScrollRef.current.scrollTop > 10);
            }
        };

        const scrollableModal = modalScrollRef.current;
        if (scrollableModal) {
            scrollableModal.addEventListener('scroll', handleModalScroll);
            return () => scrollableModal.removeEventListener('scroll', handleModalScroll);
        }
    }, [selectedArticle]);

    useEffect(() => {
        if (selectedArticle) {
            document.body.style.overflow = 'hidden';
            if (modalScrollRef.current) modalScrollRef.current.scrollTop = 0;
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [selectedArticle]);

    const handleGoBack = () => {
        navigate('/upsc-prelims');
    };

    const getSuggestedArticles = () => {
        if (!selectedArticle || articles.length <= 1) return [];
        if (window.innerWidth < 640) {
            const potential = articles.filter((a) => a._id !== selectedArticle._id);
            return sortArticlesBySeenCount(potential);
        }
        return suggestedArticles;
    };
    
    const handlePrevSuggestions = () => {
        if (window.innerWidth < 640) {
            const filtered = articles.filter((a) => a._id !== selectedArticle._id);
            setSuggestionIndex((prev) => (prev - 1 < 0 ? filtered.length - 1 : prev - 1));
            if (suggestionScrollRef.current) {
                suggestionScrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
            }
        } else {
            // This logic could be improved, but for now it's kept as is.
            const currentSuggestionIds = new Set(suggestedArticles.map(a => a._id));
            const availableArticles = articles.filter(a => !currentSuggestionIds.has(a._id) && a._id !== selectedArticle._id);
            const sortedAvailable = sortArticlesBySeenCount(availableArticles);
            setSuggestedArticles((prev) => {
                const newArticles = [...prev.slice(0, -1)];
                const prevArticle = sortedAvailable.length > 0 ? sortedAvailable[sortedAvailable.length - 1] : null;
                if (prevArticle) {
                    newArticles.unshift(prevArticle);
                }
                return newArticles.filter(a => a);
            });
        }
    };
    
    const handleMainNextArticle = async () => {
        const suggested = getSuggestedArticles();
        if (suggested.length === 0) return;
        const nextArticle = suggested[0];
        if (!nextArticle) return;

        // This will now call the handleCardClick logic to ensure sorting and state updates are consistent
        handleCardClick(nextArticle);
    };

    const handleMainPrevArticle = async () => {
        if (articleHistory.length <= 1) return;

        // Pop the current article from history to get the previous one
        const newHistory = articleHistory.slice(0, -1);
        const prevArticle = newHistory[newHistory.length - 1];

        // This replaces the previous logic with a cleaner state update
        setSelectedArticle(prevArticle);
        setArticleHistory(newHistory);
        setIsScrolled(false);
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
        if (window.innerWidth >= 640 || !isDragging.current) return;
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
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-center px-4">
                <p className="text-red-400">{error}</p>
                <button onClick={refreshArticles} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
                    Try Again
                </button>
            </div>
        );
    }
    
    return (
        <div className="w-full bg-gray-900 min-h-screen relative">
            <button
                onClick={handleGoBack}
                aria-label="Go back"
                className="absolute top-5 left-5 w-12 h-12 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm rounded-full text-white shadow-lg z-20 hover:bg-opacity-50 transition-all duration-300"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
            </button>
            <div
                ref={scrollContainerRef}
                className="pt-20 pb-4 min-h-screen overflow-y-auto"
                style={{ scrollbarWidth: 'thin' }}
            >
                <style>
                    {`
                        .article-card:hover {
                            border: 2px solid #3b82f6 !important;
                            box-shadow: 0 0 15px rgba(59, 130, 246, 0.5) !important;
                            transform: scale(1.05) !important;
                        }
                        div[ref="scrollContainerRef"]::-webkit-scrollbar {
                            width: 8px;
                        }
                        div[ref="scrollContainerRef"]::-webkit-scrollbar-thumb {
                            background: #4b5563;
                            border-radius: 4px;
                        }
                        div[ref="scrollContainerRef"]::-webkit-scrollbar-track {
                            background: transparent;
                        }
                    `}
                </style>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
                    {articles.length === 0 && !loading ? (
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
                                    <p className="text-gray-400 text-xs">Seen Count: {article.seenCount || 0}</p>
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
                        className="sm:rounded-none sm:mt-0 rounded-t-3xl bg-gray-800 w-full h-full relative flex flex-col shadow-lg overflow-hidden"
                        style={{ transition: 'transform 0.3s ease-out' }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <style>
                            {`
                                @media (max-width: 639px) {
                                    div[ref="modalRef"]::before {
                                        content: ''; position: absolute; top: 0.5rem; left: 0.25rem; right: 0.25rem; bottom: -0.5rem;
                                        background: rgba(0, 0, 0, 0.6); border-top-left-radius: 1.5rem; border-top-right-radius: 1.5rem;
                                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5); z-index: -1; pointer-events: none;
                                    }
                                    img.article-image {
                                        width: 100vw !important; height: 20rem !important; max-height: 20rem !important;
                                        margin-left: calc(-1rem - 1px) !important; margin-right: calc(-1rem - 1px) !important;
                                    }
                                    .scroll-down-symbol {
                                        position: absolute; top: 0.5rem; left: 50%; transform: translateX(-50%);
                                        width: 2rem; height: 0.25rem; background: rgba(209, 213, 219, 0.8);
                                        border-radius: 0.125rem; z-index: 60; pointer-events: none;
                                    }
                                }
                            `}
                        </style>
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-300 hover:text-white z-60"
                            title="Close"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        {articleHistory.length > 1 && (
                            <button
                                onClick={handleMainPrevArticle}
                                className={`sm:flex items-center justify-center w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 absolute left-4 top-1/2 transform -translate-y-1/2 mt-8 text-gray-300 hover:text-white z-60 hidden transition-all duration-150 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                title="Previous Article"
                            >
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        <button
                            onClick={handleMainNextArticle}
                            className={`sm:flex items-center justify-center w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 absolute right-4 top-1/2 transform -translate-y-1/2 mt-10 text-gray-300 hover:text-white z-60 hidden transition-all duration-150 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            style={{ marginRight: '1rem' }}
                            title="Next Article"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                        <div
                            ref={modalScrollRef}
                            className="overflow-y-auto flex-1 sm:pt-8 sm:pr-20 sm:pl-20 pr-4 pl-4 pt-0 pb-12"
                        >
                            {window.innerWidth < 640 && (<div className="scroll-down-symbol" />)}
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
                                <p className="text-gray-200 text-base leading-relaxed whitespace-pre-line">{selectedArticle.content}</p>
                                <div className="clear-both" />
                                <div className="mt-6 sm:hidden"><h3 className="text-white font-bold text-lg">Keep Reading</h3></div>
                            </div>
                            {getSuggestedArticles().length > 0 && (
                                <div ref={suggestedSectionRef} style={{ marginTop: '0.25rem' }}>
                                    <div className="hidden sm:block mt-10">
                                        <div style={{ background: '#1F2526', borderTop: '1px solid #374151', boxShadow: '0 -2px 16px 0 rgba(0,0,0,0.2)', padding: '1rem 2rem' }}>
                                            <h3 className="text-white font-bold text-xl mb-0">You May Also Like</h3>
                                        </div>
                                        <div style={{ background: '#1F2526', padding: '1rem 2rem 2rem 2rem', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem', maxHeight: '50vh', overflowY: 'auto', position: 'relative' }}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                                                {getSuggestedArticles().map((article, index) => (
                                                    <div key={`${article._id}-${index}`} className="bg-[#1F2526] rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 article-card suggested-article" onClick={() => handleCardClick(article)}>
                                                        <img src={article.imageUrl || 'https://via.placeholder.com/300'} alt={article.heading} className="w-full h-48 object-cover" />
                                                        <div className="p-4"><h3 className="text-white font-bold text-sm sm:text-base line-clamp-2">{article.heading}</h3></div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={handlePrevSuggestions}
                                                    className="absolute -left-0.2 top-1/2 transform -translate-y-1/2 -mt-8 w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white z-10 transition-all"
                                                    title="Previous Suggestions"
                                                >
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                                <button
                                                    onClick={handleNextSuggestions}
                                                    className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 -mt-8 w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white z-10 transition-all"
                                                    title="Next Suggestions"
                                                >
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sm:hidden mt-4 relative">
                                        <div ref={suggestionScrollRef} className="flex flex-row overflow-x-auto scrollbar-hide snap-x snap-mandatory" style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                            <style>{`div[ref="suggestionScrollRef"]::-webkit-scrollbar { display: none; }`}</style>
                                            {getSuggestedArticles().map((article, index) => (
                                                <div key={`${article._id}-${index}`} className="flex-shrink-0 w-56 mx-2 snap-center cursor-pointer" onClick={() => handleCardClick(article)} style={{ maxWidth: '75%' }}>
                                                    <img src={article.imageUrl || 'https://via.placeholder.com/300'} alt={article.heading} className="w-full h-36 object-cover rounded-md mb-2" />
                                                    <h3 className="text-white font-bold text-sm line-clamp-2">{article.heading}</h3>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(NewsCard);