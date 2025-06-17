import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useQanda } from "../../App";

const Battleground = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mcqs, setMcqs, fetchNewInitialMCQs, isMcqsFetching, cachedMcqs, setCachedMcqs } = useQanda();
  const [testStarted, setTestStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [questionStatuses, setQuestionStatuses] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(null);
  const [showResultsPage, setShowResultsPage] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showSidebar, setShowSidebar] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [maxQuestionReached, setMaxQuestionReached] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeLeft, setTimeLeft] = useState(6 * 60); // 6 minutes for 10 questions
  const [timerActive, setTimerActive] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [showPopup, setShowPopup] = useState(false);
  const [showTestPopup, setShowTestPopup] = useState(false);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(null);
  const [isFirstReturnAfterSubmit, setIsFirstReturnAfterSubmit] = useState(false);

  const testLabels = {
    10: "Quick Test",
    25: "Rapid Test",
    50: "Half Length",
    100: "Full Length Test",
  };

  const [scoreDetails, setScoreDetails] = useState({
    totalQuestions: 0,
    attempted: 0,
    answeredCorrectly: 0,
    answeredIncorrectly: 0,
    unattempted: 0,
    totalScore: 0,
    percentage: 0,
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const PRELIMS_CUTOFF = 50;
  const isFetchingRef = useRef(false);
  const markedMcqIdsRef = useRef(new Set());
  const markMcqTimeoutRef = useRef(null);

  const categoryToBookMap = {
    TamilnaduHistory: { bookName: "Tamilnadu History Book", category: "History" },
    Spectrum: { bookName: "Spectrum Book", category: "History" },
    ArtAndCulture: { bookName: "Nitin Singhania Art and Culture Book", category: "History" },
    FundamentalGeography: { bookName: "NCERT Class 11th Fundamentals of Physical Geography", category: "Geography" },
    IndianGeography: { bookName: "NCERT Class 11th Indian Geography", category: "Geography" },
    Science: { bookName: "Disha IAS Previous Year Papers (Science Section)", category: "Science" },
    Environment: { bookName: "Shankar IAS Environment Book", category: "Environment" },
    Economy: { bookName: "Ramesh Singh Indian Economy Book", category: "Economy" },
    CSAT: { bookName: "Disha IAS Previous Year Papers (CSAT Section)", category: "CSAT" },
    CurrentAffairs: { bookName: "Vision IAS Current Affairs Magazine", category: "Current Affairs" },
    PreviousYearPapers: { bookName: "Disha Publication’s UPSC Prelims Previousissued Papers", category: "PreviousYearPapers" },
    Polity: { bookName: "Laxmikanth Indian Polity", category: "Politics" },
  };

  const resultsRef = useRef(null);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = touchStartY.current;
  };

  const handleTouchMove = (e) => {
    if (!resultsRef.current) return;
    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (deltaY > 0 && resultsRef.current) {
      resultsRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleReturnToSolutions = () => {
    if (isFirstReturnAfterSubmit) {
      setCurrentQuestionIndex(0);
      setSelectedOption(userAnswers[0] || "");
      setShowExplanation(false);
      setIsFirstReturnAfterSubmit(false);
    }
    setShowResultsPage(false);
  };

  const handleTouchEnd = () => {
    if (!resultsRef.current) return;
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (deltaY > 50 && resultsRef.current) {
      resultsRef.current.style.transition = 'transform 0.3s ease-out';
      resultsRef.current.style.transform = `translateY(100vh)`;
      setTimeout(() => {
        handleReturnToSolutions();
        if (resultsRef.current) {
          resultsRef.current.style.transition = '';
          resultsRef.current.style.transform = '';
        }
      }, 300);
    } else if (resultsRef.current) {
      resultsRef.current.style.transition = 'transform 0.3s ease-out';
      resultsRef.current.style.transform = '';
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.style.transition = '';
        }
      }, 300);
    }
  };

  const fetchInitialMCQ = async () => {
    if (isMcqsFetching || !user || !user.email) {
      console.log("fetchInitialMCQ: Blocked", { isMcqsFetching, user: !!user, email: user?.email });
      return;
    }
    setLoading(true);
    setLoadingMessage("Loading first question...");
    try {
      console.log("fetchInitialMCQ: Fetching initial MCQ for user", user.email);
      const subjects = [
        "Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture",
        "FundamentalGeography", "IndianGeography", "Science",
        "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers"
      ];
      const response = await fetch(`${API_URL}/user/get-multi-book-mcqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          books: subjects.map(subject => ({ book: subject, requestedCount: 1 })),
          userId: user.email
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.mcqs || data.mcqs.length === 0) {
        throw new Error("No MCQs available");
      }
      const transformedMCQ = data.mcqs
        .filter(mcq => mcq.mcq && mcq.mcq.question && mcq.mcq.options && mcq.mcq.correctAnswer && mcq.mcq.explanation)
        .map(mcq => ({
          question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
          options: mcq.mcq.options,
          correctAnswer: mcq.mcq.correctAnswer,
          explanation: mcq.mcq.explanation,
          category: mcq.category || "",
          id: mcq._id,
        }))[0];
      if (!transformedMCQ) {
        throw new Error("No valid MCQ found");
      }
      setMcqs([transformedMCQ]);
      setQuestions([transformedMCQ]);
      setUserAnswers([null]);
      setQuestionStatuses(["unattempted"]);
      setTestStarted(true);
      setTimerActive(true);
      console.log("fetchInitialMCQ: Successfully loaded initial MCQ", transformedMCQ.id);
    } catch (err) {
      console.error("fetchInitialMCQ: Error:", err.message);
      setError("Failed to load the first question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRemainingMCQs = async (desiredCount, initialMCQIds) => {
    if (isFetchingRef.current || !user || !user.email) {
      console.log("fetchRemainingMCQs: Blocked", { isFetching: isFetchingRef.current, user: !!user, email: user?.email });
      return;
    }
    isFetchingRef.current = true;

    console.log("fetchRemainingMCQs: Called with desiredCount", desiredCount);

    try {
      let allSubjects = [
        "Polity", "TamilnaduHistory", "Spectrum", "ArtAndCulture",
        "FundamentalGeography", "IndianGeography", "Science",
        "Environment", "Economy", "CurrentAffairs", "PreviousYearPapers"
      ];
      let remainingCount = Math.max(desiredCount - questions.length, 0);
      let allMCQs = [];
      let fetchedMCQIds = new Set([...initialMCQIds]);
      let maxRetries = 5;

      while (remainingCount > 0 && allSubjects.length > 0 && maxRetries > 0) {
        const questionsPerSubject = Math.ceil(remainingCount / allSubjects.length);
        console.log(
          `Attempting to fetch ${remainingCount} MCQs, ${questionsPerSubject} per subject, subjects: ${allSubjects.join(", ")}`
        );

        const books = allSubjects.map(subject => ({
          book: subject,
          requestedCount: questionsPerSubject
        }));

        const response = await fetch(`${API_URL}/user/get-multi-book-mcqs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ books, userId: user.email })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.warn(`Failed to fetch MCQs: HTTP ${response.status}`, errorData);
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.mcqs || data.mcqs.length === 0) {
          console.warn("No MCQs returned", data.diagnostics || []);
          break;
        }

        console.log("MCQ fetch diagnostics:", data.diagnostics);
        console.log("Raw MCQ IDs fetched:", data.mcqs.map(mcq => mcq._id?.toString()));

        const transformedMCQs = [];
        for (const mcq of data.mcqs) {
          if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation) {
            console.warn("Invalid MCQ skipped:", mcq._id?.toString());
            continue;
          }
          const mcqIdStr = mcq._id?.toString();
          if (fetchedMCQIds.has(mcqIdStr)) {
            console.warn(`Duplicate MCQ ID filtered out: ${mcqIdStr}`);
            continue;
          }
          fetchedMCQIds.add(mcqIdStr);
          transformedMCQs.push({
            question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
            options: mcq.mcq.options,
            correctAnswer: mcq.mcq.correctAnswer,
            explanation: mcq.mcq.explanation,
            category: mcq.category || null,
            id: mcq._id,
          });
        }

        if (transformedMCQs.length > 0) {
          allMCQs = [...allMCQs, ...transformedMCQs];
          remainingCount = Math.max(desiredCount - (questions.length + allMCQs.length), 0);
        }

        const availableSubjects = data.diagnostics
          .filter(d => d.available > d.requested && d.available > 0 && !d.error)
          .map(d => Object.keys(categoryToBookMap).find(key => categoryToBookMap[key].category === d.category))
          .filter(Boolean);

        if (availableSubjects.length === 0 && remainingCount > 0) {
          console.warn("No subjects with additional MCQs available");
          break;
        }

        allSubjects = availableSubjects;
        maxRetries--;

        console.log(
          `Fetched ${transformedMCQs.length} unique MCQs, remaining: ${remainingCount}, retries left: ${maxRetries}, available subjects: ${allSubjects.join(", ")}`
        );

        if (questions.length + allMCQs.length >= desiredCount) {
          console.log("Sufficient unique MCQs fetched, stopping further requests");
          break;
        }
      }

      const uniqueMCQs = [];
      const seenIds = new Set();
      for (const mcq of allMCQs) {
        if (!seenIds.has(mcq.id.toString())) {
          seenIds.add(mcq.id.toString());
          uniqueMCQs.push(mcq);
        } else {
          console.warn(`Duplicate MCQ ID detected in final list: ${mcq.id.toString()}`);
        }
      }

      if (uniqueMCQs.length > 0) {
        setQuestions(prevQuestions => {
          const updatedMCQs = [...prevQuestions, ...uniqueMCQs].slice(0, desiredCount);
          console.log("Setting questions state with unique MCQs:", updatedMCQs.map(m => m.id.toString()));
          return updatedMCQs;
        });
        setMcqs(prevMcqs => {
          const updatedMCQs = [...prevMcqs, ...uniqueMCQs].slice(0, desiredCount);
          return updatedMCQs;
        });
        setUserAnswers(prevAnswers => [...prevAnswers, ...new Array(uniqueMCQs.length).fill(null)]);
        setQuestionStatuses(prevStatuses => [...prevStatuses, ...new Array(uniqueMCQs.length).fill("unattempted")]);
        setTotalQuestions(Math.min(desiredCount, questions.length + uniqueMCQs.length));
      }

      console.log("fetchRemainingMCQs: Fetched total unique MCQs", uniqueMCQs.length);

      if (questions.length + uniqueMCQs.length < desiredCount) {
        const unavailableSubjects = Object.keys(categoryToBookMap).filter(
          s => !uniqueMCQs.some(mcq => mcq.category === categoryToBookMap[s]?.category)
        );
        setError(
          `Unable to load all ${desiredCount} questions (loaded ${questions.length + uniqueMCQs.length}). Subjects with insufficient questions: ${unavailableSubjects.join(", ") || "unknown"}. Try a lower question count.`
        );
      }
    } catch (err) {
      console.error("Error in fetchRemainingMCQs:", err.message);
      setError("Failed to load additional questions. Please try again.");
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    console.log("Battleground: Initial state", { user, testStarted, loading, error });
    console.log("User object:", user);
    if (user && user.email) {
      fetchInitialMCQ();
    } else {
      setError("Please log in to access Battleground.");
    }
  }, [user]);

  useEffect(() => {
    if (testStarted && questions.length === 1 && !isFetchingRef.current && user && user.email) {
      console.log("Triggering background fetch for remaining MCQs", { desired: totalQuestions - 1 });
      fetchRemainingMCQs(totalQuestions, questions.map(q => q.id.toString()));
    }
  }, [testStarted, questions.length, totalQuestions, user]);

  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimerActive(false);
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const markMcqAsSeen = async (mcqId, retries = 3) => {
    if (!user || !user.email || !mcqId) {
      console.error("markMcqAsSeen: Invalid parameters", { user: !!user, email: user?.email, mcqId });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/user/mark-mcq-seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.email,
          mcqId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        console.log(`MCQ ${mcqId} marked as seen for user ${user.email}`);
      }
    } catch (error) {
      console.error(`Error marking MCQ ${mcqId} as seen (attempt ${4 - retries}/3):`, error.message);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return markMcqAsSeen(mcqId, retries - 1);
      } else {
        console.error(`Failed to mark MCQ ${mcqId} as seen after 3 attempts`);
        markedMcqIdsRef.current.delete(mcqId);
      }
    }
  };

  useEffect(() => {
    if (testStarted && questions.length > 0 && currentQuestionIndex < questions.length && user && user.email) {
      const currentMcqId = questions[currentQuestionIndex]?.id?.toString();
      if (currentMcqId && !markedMcqIdsRef.current.has(currentMcqId)) {
        if (markMcqTimeoutRef.current) {
          clearTimeout(markMcqTimeoutRef.current);
        }
        markMcqTimeoutRef.current = setTimeout(() => {
          markedMcqIdsRef.current.add(currentMcqId);
          console.log(`Marking MCQ ${currentMcqId} as seen for user ${user.email}`);
          markMcqAsSeen(currentMcqId);
        }, 100);
      }
    }
    return () => {
      if (markMcqTimeoutRef.current) {
        clearTimeout(markMcqTimeoutRef.current);
      }
    };
  }, [currentQuestionIndex, testStarted, user]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleGoBack = () => {
    fetchNewInitialMCQs();
    window.location.href = "/upsc-prelims";
  };

  const toggleSidebar = () => {
    if (!showSidebar && cachedMcqs.length < 3 && user && user.email) {
      fetchNewInitialMCQs();
    }
    setShowSidebar(prev => !prev);
  };

  const fetchLeaderboard = async (retries = 3) => {
    const validQuestionCounts = [10, 25, 50, 100];
    if (!validQuestionCounts.includes(totalQuestions)) {
      console.warn(`Skipping leaderboard fetch for invalid questionCount: ${totalQuestions}`);
      setLeaderboard([]);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/battleground/leaderboard?questionCount=${totalQuestions}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeaderboard(data.rankings || []);
      console.log(`Battleground: Fetched leaderboard for ${totalQuestions} questions`, data.rankings?.length || 0);
    } catch (error) {
      console.error(`Error fetching leaderboard for ${totalQuestions} questions:`, error.message);
      if (retries > 0) {
        console.log(`Retrying leaderboard fetch, ${retries} attempts left`);
        setTimeout(() => fetchLeaderboard(retries - 1), 2000);
      } else {
        console.error(`Failed to load leaderboard for ${totalQuestions}-question test after 3 attempts`);
        setLeaderboard([]);
      }
    }
  };

  useEffect(() => {
    if (user && user.email) {
      fetchLeaderboard();
    }
  }, [totalQuestions, user]);

  useEffect(() => {
    const questionBox = document.querySelector('.question-box');
    const content = document.querySelector('.question-content');
    const questionNumber = document.querySelector('.question-number');
    if (questionBox && content) {
      let pElementsHeight = 0;
      if (questionNumber) {
        const style = window.getComputedStyle(questionNumber);
        pElementsHeight += questionNumber.offsetHeight + parseFloat(style.marginBottom);
      }

      const paddingHeight = 16;
      const effectiveHeight = questionBox.clientHeight - pElementsHeight - paddingHeight;

      let currentFontSize = 24;
      content.style.fontSize = `${currentFontSize}px`;
      while (content.scrollHeight > effectiveHeight && currentFontSize > 8) {
        currentFontSize -= 1;
        content.style.fontSize = `${currentFontSize}px`;
      }
      setFontSize(currentFontSize);
    }
  }, [questions, currentQuestionIndex]);

  const handleOptionSelect = (option, event) => {
    if (selectedOption === option) {
      const newAnswers = [...userAnswers];
      const newStatuses = [...questionStatuses];
      newAnswers[currentQuestionIndex] = null;
      newStatuses[currentQuestionIndex] = "unattempted";
      setUserAnswers(newAnswers);
      setQuestionStatuses(newStatuses);
      setSelectedOption("");
      if (event.currentTarget) {
        event.currentTarget.blur();
      }
    } else {
      const newAnswers = [...userAnswers];
      const newStatuses = [...questionStatuses];
      newAnswers[currentQuestionIndex] = option;
      newStatuses[currentQuestionIndex] = "attempted";
      setUserAnswers(newAnswers);
      setQuestionStatuses(newStatuses);
      setSelectedOption(option);
      setShowExplanation(false);
    }
  };

  const handleNextQuestion = () => {
    if (
      currentQuestionIndex >= totalQuestions - 1 ||
      currentQuestionIndex >= questions.length - 1
    )
      return;

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setSelectedOption(userAnswers[nextIndex] || "");
    setShowExplanation(false);
    if (nextIndex > maxQuestionReached) {
      setMaxQuestionReached(nextIndex);
    }
  };

  const handleFilteredNextQuestion = () => {
    const filteredIndices = Array.from({ length: totalQuestions })
      .map((_, i) => i)
      .filter(i => filter === "all" || questionStatuses[i] === filter);
    const currentFilteredIndex = filteredIndices.indexOf(currentQuestionIndex);
    const nextFilteredIndex = currentFilteredIndex < filteredIndices.length - 1
      ? filteredIndices[currentFilteredIndex + 1]
      : filteredIndices[0];
    setCurrentQuestionIndex(nextFilteredIndex);
    setSelectedOption(userAnswers[nextFilteredIndex] || "");
    setShowExplanation(false);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setSelectedOption(userAnswers[prevIndex] || "");
      setShowExplanation(false);
    }
  };

  const submitTest = () => {
    let newAnswers = [...userAnswers];
    let correctCount = 0;
    let wrongCount = 0;
    let attempted = 0;
    const newStatuses = [...questionStatuses];

    newAnswers.forEach((answer, index) => {
      if (answer && index < questions.length) {
        attempted++;
        if (answer === questions[index].correctAnswer) {
          correctCount++;
          newStatuses[index] = "correct";
        } else {
          wrongCount++;
          newStatuses[index] = "wrong";
        }
      } else {
        newStatuses[index] = "unattempted";
      }
    });

    setQuestionStatuses(newStatuses);

    const unattempted = questions.length - attempted;
    const totalScore = (correctCount * 2) - (wrongCount * 0.66);
    const percentage = questions.length > 0 ? (totalScore / (questions.length * 2)) * 100 : 0;

    setScore(totalScore);
    setTimerActive(false);

    setScoreDetails({
      totalQuestions: questions.length,
      attempted,
      answeredCorrectly: correctCount,
      answeredIncorrectly: wrongCount,
      unattempted,
      totalScore: totalScore.toFixed(2),
      percentage: percentage.toFixed(2),
    });

    setShowResultsPage(true);
    setShowPopup(false);
    setIsFirstReturnAfterSubmit(true);

    fetch(`${API_URL}/battleground/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        score: totalScore,
        questionCount: totalQuestions
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setLeaderboard(data.rankings || []);
        console.log(`Battleground: Test submitted for ${totalQuestions} questions, leaderboard updated`, data.rankings?.length || 0);
      })
      .catch(error => {
        console.error("Error submitting test:", error);
        setError(`Failed to submit score for ${totalQuestions}-question test. Please try again.`);
      });
  };

  const resetTest = (questionCount) => {
    console.log("Battleground: Resetting test with", questionCount, "questions");
    markedMcqIdsRef.current.clear();
    if (markMcqTimeoutRef.current) {
      clearTimeout(markMcqTimeoutRef.current);
    }
    setTestStarted(false);
    setQuestions([]);
    setMcqs([]);
    setCachedMcqs([]);
    setUserAnswers([]);
    setQuestionStatuses([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption("");
    setShowExplanation(false);
    setShowResultsPage(false);
    setFilter("all");
    setShowSidebar(false);
    setMaxQuestionReached(0);
    setIsFirstReturnAfterSubmit(false);
    setScoreDetails({
      totalQuestions: 0,
      attempted: 0,
      answeredCorrectly: 0,
      answeredIncorrectly: 0,
      unattempted: 0,
      totalScore: 0,
      percentage: 0,
    });
    setError(null);
    setLoading(false);
    setTimeLeft(
      questionCount === 25 ? 12 * 60 :
        questionCount === 50 ? 30 * 60 :
          questionCount === 100 ? 60 * 60 : 6 * 60
    );
    setTimerActive(false);
    setTotalQuestions(questionCount);
    setTimeout(() => fetchInitialMCQ(), 0);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    if (newFilter === "wrong") {
      const firstWrongIndex = questionStatuses.findIndex(status => status === "wrong");
      if (firstWrongIndex !== -1) {
        setCurrentQuestionIndex(firstWrongIndex);
        setSelectedOption(userAnswers[firstWrongIndex] || "");
        setShowExplanation(false);
      }
    }
  };

  const handleQuestionCountSelect = (count) => {
    const parsedCount = parseInt(count, 10);
    if (parsedCount && [10, 25, 50, 100].includes(parsedCount)) {
      console.log("Battleground: Staging question count", parsedCount);
      setSelectedQuestionCount(parsedCount);
    }
  };

  const startNewTest = () => {
    if (!selectedQuestionCount || !user || !user.email) {
      console.log("startNewTest: Blocked", { selectedQuestionCount, user: !!user, email: user?.email });
      setError("Please select a question count and ensure you are logged in.");
      return;
    }
    console.log("startNewTest: Starting test with", selectedQuestionCount, "questions");
    setError(null);
    resetTest(selectedQuestionCount);
    setShowPopup(false);
    setShowTestPopup(false);
  };

  const isTableBasedQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.includes("      ")) &&
    questionLines.some((line) => /^\([A-D]\)/.test(line))
  );

  const isAssertionReasonQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.startsWith("Assertion (A):")) &&
    questionLines.some((line) => line.startsWith("Reason (R):"))
  );

  const isStatementBasedQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => /^\d+\./.test(line)) &&
    (questionLines.some((line) => line.includes("Which of the statements given above is/are correct?")) ||
      questionLines.some((line) => line.includes("How many of the above statements are correct?")))
  );

  const isChronologicalOrderQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.includes("Arrange the following")) &&
    questionLines.some((line) => line.includes("chronological order"))
  );

  const isCorrectlyMatchedPairsQuestion = (questionLines) => (
    questionLines &&
    questionLines.some((line) => line.includes("Consider the following pairs")) &&
    questionLines.some((line) => line.includes("Which of the pairs are correctly matched?"))
  );

  const isDirectQuestion = (questionLines) => (
    questionLines &&
    !isStatementBasedQuestion(questionLines) &&
    !isAssertionReasonQuestion(questionLines) &&
    !isTableBasedQuestion(questionLines) &&
    !isChronologicalOrderQuestion(questionLines) &&
    !isCorrectlyMatchedPairsQuestion(questionLines)
  );

  const renderQuestion = (questionLines, mcq) => {
    if (!questionLines || !Array.isArray(questionLines) || !mcq) {
      return <p className="text-red-200">Error: Question content missing</p>;
    }

    if (isTableBasedQuestion(questionLines)) {
      const introLine = questionLines[0];
      const columnHeaders = questionLines[1];
      const matchingItems = questionLines.slice(2, questionLines.length - 1);
      const closingLine = questionLines[questionLines.length - 1];
      const headers = columnHeaders.split(/\s{4,}/);

      return (
        <div>
          <p className="text-base sm:text-lg font-medium text-ivory mb-2">{introLine}</p>
          <table className="table-auto w-full text-left text-ivory mb-4 border-collapse">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchingItems.map((item, index) => {
                const [left, right] = item.split(/\s{4,}/);
                return (
                  <tr key={index}>
                    <td className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">{left}</td>
                    <td className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">{right}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-base sm:text-lg font-medium text-ivory">{closingLine}</p>
        </div>
      );
    }

    if (isAssertionReasonQuestion(questionLines)) {
      const assertionLine = questionLines.find((line) => line.startsWith("Assertion (A):"));
      const reasonLine = questionLines.find((line) => line.startsWith("Reason (R):"));
      if (!assertionLine || !reasonLine) {
        return <p className="text-red-200">Error: Incomplete Assertion-Reason question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{assertionLine}</p>
          <p className="mb-1 text-ivory">{reasonLine}</p>
        </div>
      );
    }

    return (
      <div className="mb-2">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">{line}</p>
        ))}
      </div>
    );
  };

  if (showResultsPage) {
    const { totalQuestions, attempted, answeredCorrectly, answeredIncorrectly, unattempted, totalScore, percentage } = scoreDetails;
    const passed = parseFloat(percentage) >= PRELIMS_CUTOFF;
    const cutoffDifference = Math.abs(parseFloat(percentage) - PRELIMS_CUTOFF).toFixed(2);

    return (
      <div className="min-h-screen bg-gray-900 text-white font-poppins flex flex-col">
        <main className="flex flex-col min-h-[100dvh] bg-gray-800">
          <style>
            {`
              @media (max-width: 639px) {
                .results-container {
                  touch-action: pan-y;
                  border-bottom-left-radius: 24px;
                  border-bottom-right-radius: 24px;
                  overflow-y: auto;
                  min-height: calc(100dvh - 16px);
                  padding-top: env(safe-area-inset-top);
                }
                .results-content {
                  display: flex;
                  flex-direction: column;
                  min-height: calc(100dvh - 16px);
                  background: rgba(31, 37, 47, 0.95);
                  backdrop-filter: blur(10px);
                }
                .test-complete {
                  min-height: 35vh;
                  z-index: 10;
                }
                .leaderboard {
                  flex: 1;
                  background: rgb(17, 24, 39);
                }
                .popup {
                  transition: transform 0.3s ease-out;
                  z-index: 20;
                  background: rgba(31, 37, 47, 0.95);
                  backdrop-filter: blur(10px);
                  border-top-left-radius: 16px;
                  border-top-right-radius: 16px;
                }
                 .question-upbar {
                    width: 30%; /* EXAMPLE: Changed from 35% for a narrower mobile view */
                    clip-path: polygon(
                      5% 0%,
                      95% 0%,
                      100% 100%,
                      0% 100%
                    );
                 }
              }
              @media (min-width: 640px) {
                .popup {
                  transition: transform 0.3s ease-out;
                  z-index: 20;
                  background: rgba(31, 37, 47, 0.95);
                  backdrop-filter: blur(10px);
                  border-top-left-radius: 24px;
                  border-top-right-radius: 24px;
                }
              }
              .question-upbar {
                  background-color: grey;
                  padding: 15px 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  position: fixed;
                  bottom: 0;
                  left: 50%;
                  transform: translateX(-50%);
                  z-index: 50;
                  width: 100%;
                  border-top-left-radius: 12px;
                  border-top-right-radius: 12px;
                  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
                  clip-path: polygon(
                    0% 100%, 0% 76%, 45% 76%, 48% 0%,
                    52% 0%, 55% 76%, 100% 76%, 100% 100%
                  );
                }
               .question-upbar svg {
                  width: 30px;
                  height: 30px;
                  fill: black;
                  cursor: pointer;
                }
              @media (forced-colors: active) {
                .glass-button, .glass-timer, .question-upbar, .popup {
                  border: 1px solid;
                }
              }
            `}
          </style>
          <div
            ref={resultsRef}
            className="results-container mt-4 mx-2 sm:mt-0 sm:mx-0 sm:flex sm:flex-col sm:h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="results-content sm:bg-transparent sm:backdrop-filter-none">
              <div className="test-complete p-2 sm:p-4 text-center">
                <div className="hidden sm:flex sm:justify-between sm:items-center sm:mb-2">
                  <button
                    onClick={handleReturnToSolutions}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Solutions</span>
                  </button>
                  <h1 className="text-2xl font-bold text-blue-400">Test Complete!</h1>
                  <div className="w-[140px]"></div>
                </div>
                <svg
                  className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 sm:hidden"
                  viewBox="0 0 32 4"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line x1="2" y1="2" x2="30" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div className="flex flex-col items-center gap-1 mt-6 sm:mt-0 sm:flex-row sm:justify-between sm:items-center sm:hidden">
                  <h1 className="text-lg font-bold text-blue-400">Test Complete!</h1>
                </div>
                <p className="text-sm sm:text-base text-gray-300 mb-0 sm:mb-1">Here's your performance summary for {totalQuestions}-question test.</p>
                <div className={`p-1 sm:p-2 rounded-lg mb-1 sm:mb-2 max-w-sm mx-auto ${passed ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                  <p className="text-sm sm:text-lg font-bold">{`Your Score: ${totalScore}`}</p>
                  <p className="text-xs sm:text-sm text-gray-200">{`Percentage: ${percentage}%`}</p>
                  <p className={`mt-0.5 font-semibold Footnote sm:text-xs ${passed ? 'text-green-400' : 'text-red-400'}`}>
                    {passed ? `🎉 Congratulations! You are above the prelims cutoff by ${cutoffDifference}%.` : `Below the prelims cutoff by ${cutoffDifference}%. Keep practicing!`}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-0.5 sm:gap-1 text-white max-w-full sm:max-w-2xl mx-auto">
                  <div className="bg-gray-700 p-0.5 sm:p-1 rounded-lg">
                    <p className="text-sm sm:text-base font-bold">{totalQuestions}</p><p className="text-[8px] sm:text-[10px] text-gray-400">Total</p>
                  </div>
                  <div className="bg-gray-700 p-0.5 sm:p-1 rounded-lg">
                    <p className="text-sm sm:text-base font-bold">{attempted}</p><p className="text-[8px] sm:text-[10px] text-gray-400">Attempted</p>
                  </div>
                  <div className="bg-green-700 p-0.5 sm:p-1 rounded-lg">
                    <p className="text-sm sm:text-base font-bold">{answeredCorrectly}</p><p className="text-[8px] sm:text-[10px] text-green-200">Correct</p>
                  </div>
                  <div className="bg-red-700 p-0.5 sm:p-1 rounded-lg">
                    <p className="text-sm sm:text-base font-bold">{answeredIncorrectly}</p><p className="text-[8px] sm:text-[10px] text-red-200">Incorrect</p>
                  </div>
                  <div className="bg-yellow-700 p-0.5 sm:p-1 rounded-lg col-span-2 md:col-span-1">
                    <p className="text-sm sm:text-base font-bold">{unattempted}</p><p className="text-[8px] sm:text-[10px] text-yellow-200">Unattempted</p>
                  </div>
                </div>
              </div>
              <div className="leaderboard p-2 sm:p-4">
                <div className="max-w-full sm:max-w-2xl mx-auto">
                  <h3 className="text-lg sm:text-2xl font-semibold text-gray-50 mb-2 sm:mb-4 text-center">
                    Leaderboard ({totalQuestions} Questions)
                  </h3>
                  {leaderboard.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-zinc-300 text-[8px] sm:text-xs">
                        <thead>
                          <tr className="border-b-2 border-gray-700">
                            <th className="px-0.5 sm:px-1.5 py-0.5 sm:py-1.5 text-blue-300">Rank</th>
                            <th className="px-0.5 sm:px-1.5 py-0.5 sm:py-1.5 text-blue-300">Username</th>
                            <th className="px-0.5 sm:px-1.5 py-0.5 sm:py-1.5 text-blue-300">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((entry, index) => (
                            <tr key={index} className={`border-b border-gray-700 ${user.username === entry.username ? 'bg-blue-900/50' : ''}`}>
                              <td className="px-0.5 sm:px-1.5 py-0.5 sm:py-1.5 font-bold">{index + 1}</td>
                              <td className="px-0.5 sm:px-1.5 py-0.5 sm:py-1.5">{entry.username}</td>
                              <td className="px-0.5 sm:px-1.5 py-0.5 sm:py-1.5">{entry.score.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-zinc-400 text-[8px] sm:text-xs mb-2">Leaderboard for {totalQuestions}-question test is currently empty.</p>
                      <button
                        onClick={() => fetchLeaderboard()}
                        className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="question-upbar" onClick={() => setShowPopup(prev => !prev)}>
                <svg
                  className="w-10 h-10 text-white hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                  viewBox="0 0 40 50"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line x1="0" y1="6" x2="40" y2="6" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <line x1="0" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <line x1="0" y1="30" x2="40" y2="30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>

              <div
                className={`popup fixed bottom-0 left-0 w-full h-[50vh] shadow-lg overflow-y-auto ${
                  showPopup ? 'translate-y-0' : 'translate-y-full'
                  }`}
              >
                <div className="p-4 sm:p-6 flex flex-col items-center">
                  <h3 className="text-3xl sm:text-4xl font-semibold text-gray-50 mb-8 -mt-2 whitespace-nowrap">
                    Battleground Domain
                  </h3>
                  <div className="flex justify-between w-full gap-2 mb-32 px-4">
                    {[10, 25, 50, 100].map((count) => {
                      const isSelected = selectedQuestionCount === count;
                      let buttonClass = `flex-1 px-4 py-2 rounded-full text-sm sm:text-base font-medium transition-all duration-300 transform hover:scale-105 border-2 border-transparent `;

                      // =========== UPDATED COLOR LOGIC BLOCK (1/2) ===========
                      if (count === 100) { // Gold for Full Length Test
                        buttonClass += isSelected ? 'bg-amber-500 text-black border-amber-700' : 'bg-amber-400 text-black hover:bg-amber-500 hover:border-amber-700';
                      } else if (count === 50) { // Silver for Half Length
                        buttonClass += isSelected ? 'bg-slate-400 text-black border-slate-600' : 'bg-slate-300 text-black hover:bg-slate-400 hover:border-slate-600';
                      } else if (count === 25) { // Bronze for Rapid Test
                        buttonClass += isSelected ? 'bg-orange-400 text-black border-orange-600' : 'bg-orange-300 text-black hover:bg-orange-400 hover:border-orange-600';
                      } else { // Green for Quick Test (count of 10)
                        buttonClass += isSelected ? 'bg-green-600 text-white border-green-800' : 'bg-green-500 text-white hover:bg-green-600 hover:border-green-800';
                      }
                      // ===============================================

                      return (
                        <button
                          key={count}
                          onClick={() => handleQuestionCountSelect(count)}
                          className={buttonClass}
                        >
                          {testLabels[count]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-center w-full gap-40">
                    <button
                      onClick={startNewTest}
                      disabled={!selectedQuestionCount}
                      className={`px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent ${
                        selectedQuestionCount
                          ? 'bg-blue-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                      Start Test
                    </button>
                    <button
                        onClick={handleReturnToSolutions}
                        className="px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent bg-blue-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105"
                    >
                        View Solutions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
      <div className="fixed top-0 left-0 w-full h-12 flex justify-between items-center z-50">
        <style>
          {`
            .glass-button {
              background: transparent;
              border: none;
              border-radius: 8px;
              transition: all 0.3s ease;
              padding: 8px;
              box-shadow: none;
            }
            .glass-button:hover {
              transform: scale(1.08);
              background: rgba(59, 130, 246, 0.08);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            }
            .glass-timer {
              background: rgba(31, 37, 47, 0.6);
              backdrop-filter: blur(10px);
              border-radius: 8px;
              padding: 4px 12px;
              transition: all 0.3s ease;
            }
            .question-upbar {
              background-color: grey; /* Or any color you prefer for the bar */
              padding: 15px 20px; /* Adjust padding as needed */
              display: flex;
              justify-content: center;
              align-items: center;
              position: fixed;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              z-index: 50;
              width: 100%; /* EXAMPLE: Changed from 80% for a narrower desktop view */
              border-top-left-radius: 12px;
              border-top-right-radius: 12px;
              box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
              clip-path: polygon(
                0% 100%,
                0% 76%,
                45% 76%,
                48% 0%,
                52% 0%,
                55% 76%,
                100% 76%,
                100% 100%
              );
            }

            @media (max-width: 639px) {
              .question-upbar {
                width: 30%; /* EXAMPLE: Changed from 35% for a narrower mobile view */
                clip-path: polygon(
                  5% 0%,
                  95% 0%,
                  100% 100%,
                  0% 100%
                );
              }
            }

            /* Style for the icon inside (if you are using the three lines SVG) */
            .question-upbar svg {
              width: 30px; /* Adjust icon size as needed */
              height: 30px;
              fill: black; /* Adjust icon color as needed */
              cursor: pointer;
            }

            /* Style for the icon inside (if you are using the three lines SVG) */
            .question-upbar svg {
              width: 30px; /* Adjust icon size as needed */
              height: 30px;
              fill: black; /* Adjust icon color as needed */
              cursor: pointer;
            }
            .question-upbar button {
              padding: 0;
              background: none;
              border: none;
              transition: opacity 0.3s ease;
            }
            .question-upbar svg {
              width: 24px;
              height: 24px;
              transition: color 0.2s ease;
            }
            .question-upbar button:hover svg {
              color: #d1d5db;
            }
            .filter-bar::-webkit-scrollbar {
              height: 4px;
            }
            .filter-bar::-webkit-scrollbar-track {
              background: transparent;
            }
            .filter-bar::-webkit-scrollbar-thumb {
              background: #4b5563;
              border-radius: 2px;
              border: none;
            }
            .filter-bar {
              scrollbar-width: thin;
              scrollbar-color: #4b5563 transparent;
            }
            .popup {
              transition: transform 0.3s ease-out;
              z-index: 20;
              background: rgba(31, 37, 47, 0.95);
              backdrop-filter: blur(10px);
              border-top-left-radius: 16px;
              border-top-right-radius: 16px;
            }
            @media (min-width: 640px) {
              .popup {
                border-top-left-radius: 24px;
                border-top-right-radius: 24px;
              }
            }
            @media (forced-colors: active) {
              .glass-button, .glass-timer, .question-upbar, .popup {
                border: 1px solid;
              }
            }
          `}
        </style>
        <button
          onClick={handleGoBack}
          className="glass-button absolute left-4 flex items-center justify-center"
          style={{ background: "transparent", boxShadow: "none", padding: 0 }}
          aria-label="Go Back"
        >
          <svg
            className="w-8 h-8 text-white opacity-80 hover:opacity-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="glass-timer text-sm sm:text-base font-semibold text-white absolute left-1/2 transform -translate-x-1/2">
          {testStarted && `Time Left: ${formatTime(timeLeft)}`}
        </div>
        <button
          onClick={toggleSidebar}
          className="glass-button absolute right-4 flex items-center justify-center"
          aria-label="Sidebar"
        >
          <span className="block">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect y="6" width="28" height="2.5" rx="1.25" fill="#fff" />
              <rect y="13" width="28" height="2.5" rx="1.25" fill="#fff" />
              <rect y="20" width="28" height="2.5" rx="1.25" fill="#fff" />
            </svg>
          </span>
        </button>
      </div>

      {loading && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[1000] flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center">
            <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
            <p className="mt-4 text-lg sm:text-xl font-bold text-blue-300 tracking-wide">
              {loadingMessage}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[999] flex items-center justify-center bg-gray-900">
          <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl text-center">
            <p className="text-base sm:text-lg text-red-200">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchInitialMCQ();
              }}
              className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {testStarted && !loading && !error && (
        <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
          {questions.length > 0 && currentQuestionIndex < questions.length ? (
            <>
              {filter !== "all" && (
                <div
                  className="fixed top-[3.5rem] left-0 w-full bg-gray-800 z-40 p-2 overflow-x-auto overflow-y-hidden flex items-center filter-bar"
                  style={{
                    height: '2.5rem',
                    opacity: 1,
                    visibility: 'visible',
                    position: 'fixed'
                  }}
                >
                  {(() => {
                    const filteredIndices = Array.from({ length: totalQuestions })
                      .map((_, i) => i)
                      .filter(i => filter === "all" || questionStatuses[i] === filter);

                    if (filteredIndices.length === 0) {
                      return (
                        <p className="text-white text-xs sm:text-sm">
                          No {filter} questions found.
                        </p>
                      );
                    }
                    return filteredIndices.map((actualIndex) => {
                      const status = questionStatuses[actualIndex] || "unattempted";
                      const isCurrent = actualIndex === currentQuestionIndex && !showExplanation;
                      const colorClass = isCurrent
                        ? "bg-gray-700"
                        : status === "correct"
                          ? "bg-green-500"
                          : status === "wrong"
                            ? "bg-red-500"
                            : "bg-white";
                      return (
                        <div
                          key={actualIndex}
                          className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full ${colorClass} flex items-center justify-center text-gray-900 text-xs sm:text-sm font-semibold shadow-md transition-colors duration-300 cursor-pointer`}
                          onClick={() => {
                            if (actualIndex < questions.length) {
                              setCurrentQuestionIndex(actualIndex);
                              setSelectedOption(userAnswers[actualIndex] || "");
                              setShowExplanation(false);
                            }
                          }}
                        >
                          {actualIndex + 1}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              <div
                className="fixed left-0 w-full z-5 px-3 sm:px-4 lg:px-6 question-box"
                style={{
                  top: filter !== 'all' ? 'calc(3.5rem + 2.5rem)' : '3.5rem',
                  height: filter !== 'all' ? 'calc((100dvh - 8rem - 2.5rem) * 0.5)' : 'calc((100dvh - 8rem) * 0.5)',
                }}
                onClick={() => score !== null && setShowExplanation(!showExplanation)}
              >
                <p className="text-sm sm:text-base text-white mb-1 question-number">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </p>
                <div className="h-full font-medium text-white bg-gradient-to-br from-gray-800 to-blue-900 p-2 rounded-lg shadow-inner">
                  <div className="question-content leading-tight" style={{ fontSize: `${fontSize}px` }}>
                    {renderQuestion(questions[currentQuestionIndex].question, questions[currentQuestionIndex])}
                  </div>
                </div>
              </div>

              <div
                className="absolute left-0 w-full bg-gray-900 z-20 px-2 sm:px-8 lg:px-2"
                style={{
                  top: filter !== 'all' ? 'calc(3.5rem + 2.5rem + (100dvh - 8rem - 2.5rem) * 0.5)' : 'calc(3.5rem + (100dvh - 8rem) * 0.5)',
                  bottom: '4rem',
                }}
              >
                <div className="bg-gray-800 rounded-lg p-2 sm:p-2 h-full overflow-y-auto">
                  <div className="flex flex-col gap-0.5">
                    {Object.entries(questions[currentQuestionIndex].options).map(([key, option]) => {
                      const isUserAnswer = userAnswers[currentQuestionIndex] === key;
                      const isCorrectAnswer = questions[currentQuestionIndex].correctAnswer === key;
                      let baseClassName = `
                        w-full text-left p-5 sm:p-5 rounded-md border transition-colors duration-300
                        text-sm sm:text-lg
                        flex items-center justify-start
                        min-h-[2.5rem] sm:min-h-[3rem]
                        overflow-y-auto
                        focus:outline-none focus:ring-2 focus:ring-orange-400
                      `;
                      let stateClassName = score !== null
                        ? isUserAnswer && !isCorrectAnswer
                          ? "bg-red-600 border-red-500 text-white"
                          : isCorrectAnswer
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "bg-gray-700 border-gray-600 text-zinc-300"
                        : selectedOption === key
                          ? "bg-orange-600 border-orange-400 text-white"
                          : "bg-gray-700 border-gray-600 text-zinc-300 hover:bg-gray-600 hover:border-gray-500";

                      return (
                        <button
                          key={key}
                          onClick={(e) => handleOptionSelect(key, e)}
                          className={`${baseClassName} ${stateClassName}`}
                          disabled={score !== null}
                        >
                          <span className="font-medium mr-2">{key}) {option}</span>
                          {score !== null && isUserAnswer && !isCorrectAnswer && (
                            <span className="ml-2 text-red-300 font-medium text-[10px] sm:text-xs">(Wrong Answer)</span>
                          )}
                          {score !== null && isCorrectAnswer && (
                            <span className="ml-2 text-emerald-300 font-medium text-[10px] sm:text-xs">(Correct Answer)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {score !== null && showExplanation && (
                  <div
                    className="absolute top-0 left-0 right-0 bottom-0 rounded-lg z-70 pointer-events-auto"
                    onClick={() => setShowExplanation(false)}
                  >
                    <div className="absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col h-full">
                      <p className="text-base sm:text-lg font-medium text-zinc-200 mb-2">Explanation:</p>
                      <div className="flex-1 overflow-y-auto">
                        <p className="text-[16px] sm:text-xl text-zinc-200 leading-relaxed">
                          {questions[currentQuestionIndex].explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!showTestPopup && (
                <>
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={`fixed bottom-4 left-4 px-4 sm:px-6 py-1.5 text-sm sm:text-base rounded-lg shadow-xl transition-colors transform hover:scale-105 duration-300 z-50 ${
                      currentQuestionIndex === 0
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed border border-gray-300"
                        : "bg-red-700 text-white hover:bg-red-800 border border-red-700"
                      } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => score !== null ? handleFilteredNextQuestion() : (currentQuestionIndex === totalQuestions - 1 ? submitTest() : handleNextQuestion())}
                    className={`fixed bottom-4 right-4 sm:right-2 px-4 sm:px-6 py-1.5 text-sm sm:text-base rounded-lg shadow-xl transition-colors transform hover:scale-105 duration-300 border border-gray-200/10 z-50 ${
                      score !== null
                        ? "bg-white text-gray-900 hover:bg-gray-100"
                        : currentQuestionIndex === totalQuestions - 1
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-white text-gray-900 hover:bg-gray-100"
                      } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
                  >
                    {score !== null ? "Next" : currentQuestionIndex === totalQuestions - 1 ? "Submit" : "Next"}
                  </button>
                </>
              )}

              <div className="question-upbar" onClick={() => setShowTestPopup(prev => !prev)}>
                <svg
                  className="w-10 h-10 text-white hover:text-gray-300 transition-colors duration-200 cursor-pointer"
                  viewBox="0 0 40 50"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line x1="0" y1="6" x2="40" y2="6" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <line x1="0" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  <line x1="0" y1="30" x2="40" y2="30" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                </svg>
              </div>

              <div
                className={`popup fixed bottom-0 left-0 w-full h-[50vh] shadow-lg overflow-y-auto ${
                  showTestPopup ? 'translate-y-0' : 'translate-y-full'
                  }`}
              >
                <div className="p-4 sm:p-6 flex flex-col items-center">
                  <h3 className="text-3xl sm:text-4xl font-semibold text-gray-50 mb-8 -mt-2 whitespace-nowrap">
                    Battleground Domain
                  </h3>
                  <div className="flex justify-between w-full gap-2 mb-32 px-4">
                    {[10, 25, 50, 100].map((count) => {
                      const isSelected = selectedQuestionCount === count;
                      let buttonClass = `flex-1 px-4 py-2 rounded-full text-sm sm:text-base font-medium transition-all duration-300 transform hover:scale-105 border-2 border-transparent `;

                      // =========== UPDATED COLOR LOGIC BLOCK (2/2) ===========
                      if (count === 100) { // Gold for Full Length Test
                        buttonClass += isSelected ? 'bg-amber-500 text-black border-amber-700' : 'bg-amber-400 text-black hover:bg-amber-500 hover:border-amber-700';
                      } else if (count === 50) { // Silver for Half Length
                        buttonClass += isSelected ? 'bg-slate-400 text-black border-slate-600' : 'bg-slate-300 text-black hover:bg-slate-400 hover:border-slate-600';
                      } else if (count === 25) { // Bronze for Rapid Test
                        buttonClass += isSelected ? 'bg-orange-400 text-black border-orange-600' : 'bg-orange-300 text-black hover:bg-orange-400 hover:border-orange-600';
                      } else { // Green for Quick Test (count of 10)
                        buttonClass += isSelected ? 'bg-green-600 text-white border-green-800' : 'bg-green-500 text-white hover:bg-green-600 hover:border-green-800';
                      }
                      // ===============================================

                      return (
                        <button
                          key={count}
                          onClick={() => handleQuestionCountSelect(count)}
                          className={buttonClass}
                        >
                          {testLabels[count]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-center w-full gap-40">
                    <button
                      onClick={startNewTest}
                      disabled={!selectedQuestionCount}
                      className={`px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent ${
                        selectedQuestionCount
                          ? 'bg-blue-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                      Start Test
                    </button>
                    <button
                      onClick={() => {
                        setShowTestPopup(false);
                        setShowResultsPage(true);
                      }}
                      disabled={score === null}
                      className={`px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent ${
                        score !== null
                          ? 'bg-blue-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105'
                          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                      View Results
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : testStarted && questions.length > 0 ? (
            <div className="p-4 bg-red-600 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
              <p className="text-sm sm:text-base text-white font-semibold">Error: Invalid question index. Please try again.</p>
              <button
                onClick={() => resetTest(totalQuestions)}
                className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
              >
                Reset Test
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
              <p className="text-sm sm:text-base text-gray-200 font-semibold">No questions loaded yet. Please try again.</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchInitialMCQ();
                }}
                className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {!testStarted && !loading && !error && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[999] flex items-center justify-center bg-gray-900">
          <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
            <p className="text-sm sm:text-base text-gray-200 font-semibold">Select a test to start.</p>
            <button
              onClick={() => setShowTestPopup(true)}
              className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
            >
              Choose Test
            </button>
          </div>
        </div>
      )}

      {testStarted && (
        <div
          className="fixed top-0 right-0 h-[100vh] w-64 sm:w-72 bg-gray-800 shadow-lg z-[9999] transition-all duration-300 ease-in-out"
          style={{ right: showSidebar ? "0" : "-288px" }}
        >
          <div className="p-4 sm:p-6 h-full flex flex-col relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSidebar();
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 p-2 pointer-events-auto z-20"
              aria-label="Close Sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {score !== null ? (
              <div className="mt-8 mb-4 z-10">
                <label className="block text-xs sm:text-sm font-semibold text-blue-300 mb-1" htmlFor="sidebar-filter-select">
                  Filter
                </label>
                <select
                  id="sidebar-filter-select"
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full text-gray-50 bg-gray-700 px-4 py-1.5 text-sm sm:text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200"
                >
                  <option value="all">All Questions</option>
                  <option value="correct">Correct Answers</option>
                  <option value="wrong">Wrong Answers</option>
                  <option value="unattempted">Unattempted</option>
                </select>
              </div>
            ) : (
              <div className="h-[6.5rem]" />
            )}

            <div className="flex-1 flex flex-col relative">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1 sm:gap-1.5 mb-4">
                {Array.from({ length: totalQuestions })
                  .map((_, i) => i)
                  .filter(i => filter === "all" || questionStatuses[i] === filter)
                  .map((actualIndex) => {
                    const status = questionStatuses[actualIndex] || "unattempted";
                    const isCurrent = actualIndex === currentQuestionIndex && !showExplanation;
                    let colorClass = score !== null
                      ? status === "correct"
                        ? "bg-green-500"
                        : status === "wrong"
                          ? "bg-red-500"
                          : "bg-white"
                      : actualIndex <= maxQuestionReached
                        ? userAnswers[actualIndex]
                          ? "bg-blue-200"
                          : "bg-white"
                        : "bg-gray-200";

                    if (isCurrent && score !== null) {
                      colorClass = `${colorClass} ring-2 ring-white`;
                    }

                    return (
                      <div
                        key={actualIndex}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md ${colorClass} flex items-center justify-center text-gray-900 text-[9px] sm:text-[10px] font-semibold shadow-sm transition-transform duration-200 cursor-pointer hover:scale-105`}
                        onClick={() => {
                          if (actualIndex < questions.length) {
                            setCurrentQuestionIndex(actualIndex);
                            setSelectedOption(userAnswers[actualIndex] || "");
                            setShowExplanation(false);
                          }
                        }}
                      >
                        {actualIndex + 1}
                      </div>
                    );
                  })}
              </div>
              {score === null ? (
                <button
                  onClick={submitTest}
                  className="w-full px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-transform duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 absolute bottom-2 left-0 right-0 mx-4 sm:mx-6"
                >
                  Submit Test
                </button>
              ) : (
                <button
                  onClick={() => setShowResultsPage(true)}
                  className="w-full px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-transform duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 absolute bottom-2 left-0 right-0 mx-4 sm:mx-6"
                >
                  View Results
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Battleground;