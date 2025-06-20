import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

const TamilnaduHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testStarted, setTestStarted] = useState(false);
  const [showModeSidebar, setShowModeSidebar] = useState(false);
  const [showModePopover, setShowModePopover] = useState(false);
  const [isLawMode, setIsLawMode] = useState(true);
  const [questionLimit, setQuestionLimit] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [questionStatuses, setQuestionStatuses] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [isUpbarOpen, setIsUpbarOpen] = useState(true);
  const [isScoreMinimized, setIsScoreMinimized] = useState(false);
  const [filter, setFilter] = useState("all");
  const [lawModeBatchStart, setLawModeBatchStart] = useState(0);
  const [scoreDetails, setScoreDetails] = useState({
    totalQuestions: 0,
    attempted: 0,
    correct: 0,
    wrong: 0,
    unattempted: 0,
    totalScore: 0,
    percentage: 0,
  });
  const [maxQuestionReached, setMaxQuestionReached] = useState(0);
  const [fontSize, setFontSize] = useState(24);
  const [pendingQuestionLimit, setPendingQuestionLimit] = useState(25);
  const [pendingMode, setPendingMode] = useState(null);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "https://new-backend-tx3z.onrender.com";
  const LAW_MODE_INITIAL_COUNT = 1;
  const LAW_MODE_BACKGROUND_COUNT = 99;
  const LAW_MODE_TOTAL_COUNT = 100;
  const LOADING_TIMEOUT = 30000;

  const isTestStarted = useRef(false);

  const modeLabels = {
    LAW: "LAW Mode",
    25: "Rapid Test",
    50: "Half Length",
    100: "Full Length Test",
  };

  useEffect(() => {
    console.log("filter state updated:", filter);
  }, [filter]);

  useEffect(() => {
    console.log("questionStatuses updated:", questionStatuses);
  }, [questionStatuses]);

  const getUserId = () => {
    if (user?.email) {
      const emailLower = user.email.toLowerCase();
      return emailLower.endsWith("@gmail.com")
        ? emailLower.split("@")[0]
        : emailLower;
    }
    const storedUserId = localStorage.getItem("trainWithMeUserId");
    if (storedUserId) return storedUserId;
    const newUserId = Math.random().toString(36).substring(7);
    localStorage.setItem("trainWithMeUserId", newUserId);
    return newUserId;
  };

  const userId = useRef(getUserId()).current;

  useEffect(() => {
    const questionBox = document.querySelector(".question-box");
    const content = document.querySelector(".question-content");
    const questionNumber = document.querySelector(".question-number");
    const chapterText = document.querySelector(".chapter-text");
    if (questionBox && content) {
      let pElementsHeight = 0;
      if (questionNumber) {
        const style = window.getComputedStyle(questionNumber);
        pElementsHeight += questionNumber.offsetHeight + parseFloat(style.marginBottom);
      }
      if (chapterText) {
        const style = window.getComputedStyle(chapterText);
        pElementsHeight += chapterText.offsetHeight + parseFloat(style.marginBottom);
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

  const fetchMCQs = async (requestedCount, excludeIds = []) => {
    try {
      console.log("Fetching MCQs with userId:", userId, "requestedCount:", requestedCount, "excludeIds:", excludeIds);
      if (!userId) throw new Error("userId is undefined or empty");
      const validRequestedCount = typeof requestedCount === "number" && requestedCount > 0 ? requestedCount : 1;
      const response = await fetch(`${API_URL}/user/get-book-mcqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          book: "TamilnaduHistory",
          requestedCount: validRequestedCount,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch MCQs: HTTP ${response.status}`);
      }
      const data = await response.json();
      if (!data.mcqs || !data.mcqs.length) throw new Error("No new MCQs available for this user.");
      const transformedMCQs = data.mcqs
        .filter((mcq) => {
          if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation || excludeIds.includes(mcq._id.toString())) {
            console.warn("Invalid or duplicate MCQ skipped:", mcq);
            return false;
          }
          return true;
        })
        .map((mcq) => ({
          question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter((line) => line.trim()),
          options: mcq.mcq.options,
          correctAnswer: mcq.mcq.correctAnswer,
          explanation: mcq.mcq.explanation,
          chapter: mcq.chapter,
          id: mcq._id,
        }));
      if (!transformedMCQs.length) throw new Error("No valid MCQs available after filtering.");
      return transformedMCQs;
    } catch (err) {
      console.error("fetchMCQs error:", err.message);
      throw err;
    }
  };

  const fetchWisMCQs = async (isInitial = true, limit) => {
    const excludeIds = isInitial ? [] : questions.map((q) => q.id);
    const count = isInitial ? 1 : limit - 1;

    if (count <= 0) {
      setIsBackgroundFetching(false);
      return;
    }

    if (isInitial) {
      setLoading(true);
      setLoadingMessage("Loading MCQ...");
    } else {
      setIsBackgroundFetching(true);
    }
    setError(null);

    try {
      const fetchedMcqs = await fetchMCQs(count, excludeIds);

      if (isInitial) {
        setQuestions(fetchedMcqs);
        setUserAnswers(new Array(limit).fill(null));
        setQuestionStatuses(new Array(limit).fill("unattempted"));
        setCurrentQuestionIndex(0);
        setScore(null);
        setSelectedOption(null);
        setShowExplanation(false);
        setShowScorePopup(false);
        setIsUpbarOpen(true);
        setIsScoreMinimized(false);
        setTestStarted(true);
        console.log(`fetchWisMCQs: Loaded initial 1 MCQ for user ${userId}`);
      } else {
        setQuestions((prev) => [...prev, ...fetchedMcqs]);
        console.log(`fetchWisMCQs: Loaded background ${fetchedMcqs.length} MCQs for user ${userId}`);
      }
    } catch (err) {
      let errorMessage = "Failed to load MCQs. Please try again later.";
      if (err.message.includes("Failed to fetch")) {
        errorMessage = "Unable to connect to the server. Ensure the backend server is running and try again.";
      }
      setError(errorMessage);
      if (isInitial) setTestStarted(false);
    } finally {
      if (isInitial) setLoading(false);
      setIsBackgroundFetching(false);
    }
  };

  const fetchUserMCQsForLawMode = async (batchStart = 0, isInitial = true, retries = 2) => {
    if (!isTestStarted.current) {
      console.log("fetchUserMCQsForLawMode: Test not started, skipping");
      return;
    }

    if (isInitial) {
      setLoading(true);
      setLoadingMessage("Loading MCQ...");
    } else {
      setIsBackgroundFetching(true);
      setLoadingMessage("Loading additional MCQs...");
    }
    setError(null);

    const timeoutId = setTimeout(() => {
      if (isInitial) setLoading(false);
      setIsBackgroundFetching(false);
      setError("Loading timed out. Please try again.");
    }, LOADING_TIMEOUT);

    try {
      console.log(`Fetching MCQs for LAW mode: userId=${userId}, batchStart=${batchStart}, isInitial=${isInitial}, retries=${retries}`);
      if (!userId) throw new Error("userId is undefined or empty");

      const excludeIds = questions.map((q) => q.id.toString());
      const count = isInitial ? LAW_MODE_INITIAL_COUNT : LAW_MODE_BACKGROUND_COUNT;

      const transformedMCQs = await fetchMCQs(count, excludeIds);

      if (isInitial) {
        setQuestions(transformedMCQs);
        setUserAnswers(new Array(LAW_MODE_TOTAL_COUNT).fill(null));
        setQuestionStatuses(new Array(LAW_MODE_TOTAL_COUNT).fill("unattempted"));
        setCurrentQuestionIndex(0);
        setLawModeBatchStart(batchStart);
        setSelectedOption(null);
        setShowExplanation(false);
        setShowScorePopup(false);
        setIsUpbarOpen(true);
        setIsScoreMinimized(false);
        setTestStarted(true);
        console.log(`fetchUserMCQsForLawMode: Loaded initial ${transformedMCQs.length} MCQs for user ${userId}`);
      } else {
        setQuestions((prev) => {
          const newQuestions = [...prev, ...transformedMCQs];
          const limitedQuestions = newQuestions.slice(0, LAW_MODE_TOTAL_COUNT);
          console.log("Updated questions length:", limitedQuestions.length);
          return limitedQuestions;
        });
        console.log(`fetchUserMCQsForLawMode: Loaded background ${transformedMCQs.length} MCQs for user ${userId}`);
      }
    } catch (err) {
      console.error("fetchUserMCQsForLawMode error:", err.message);
      if (retries > 0) {
        console.log(`Retrying fetch, attempts left: ${retries - 1}`);
        setTimeout(() => {
          fetchUserMCQsForLawMode(batchStart, isInitial, retries - 1);
        }, 500);
      } else {
        let errorMessage = "Failed to load MCQs. Please try again later.";
        if (err.message.includes("Failed to fetch")) {
          errorMessage = "Unable to connect to the server. Ensure the backend server is running and try again.";
        }
        setError(errorMessage);
        if (isInitial) setTestStarted(false);
      }
    } finally {
      clearTimeout(timeoutId);
      if (isInitial) setLoading(false);
      setIsBackgroundFetching(false);
    }
  };

  const startTest = (mode, requestedCount) => {
    if (isTestStarted.current) {
      console.log("startTest: Test already started, skipping");
      return;
    }
    isTestStarted.current = true;
    console.log("startTest called with mode:", mode, "requestedCount:", requestedCount);
    setLoading(true);
    setLoadingMessage("Loading...");
    setError(null);
    setShowModePopover(false);
    setShowModeSidebar(false);
    setQuestions([]);
    setUserAnswers([]);
    setQuestionStatuses([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption(null);
    setShowExplanation(false);
    setShowScorePopup(false);
    setIsUpbarOpen(true);
    setIsScoreMinimized(false);
    setFilter("all");
    setLawModeBatchStart(0);
    setScoreDetails({
      totalQuestions: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      unattempted: 0,
      totalScore: 0,
      percentage: 0,
    });
    setMaxQuestionReached(0);
    setIsLawMode(mode === "LAW");
    setQuestionLimit(mode === "WIS" ? requestedCount : undefined);

    if (mode === "WIS") {
      fetchWisMCQs(true, requestedCount);
    } else {
      setLawModeBatchStart(0);
      fetchUserMCQsForLawMode(0, true);
    }
  };

  useEffect(() => {
    startTest("LAW", undefined);
    return () => {
      isTestStarted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isLawMode && testStarted && questions.length === LAW_MODE_INITIAL_COUNT && !isBackgroundFetching) {
      console.log("Triggering background fetch for LAW mode.");
      fetchUserMCQsForLawMode(lawModeBatchStart, false);
    }
  }, [isLawMode, testStarted, questions.length, lawModeBatchStart, isBackgroundFetching]);

  useEffect(() => {
    if (!isLawMode && testStarted && questions.length === 1 && !isBackgroundFetching && questionLimit > 1) {
      console.log(`Triggering background fetch for WIS mode. Limit: ${questionLimit}`);
      fetchWisMCQs(false, questionLimit);
    }
  }, [isLawMode, testStarted, questions.length, isBackgroundFetching, questionLimit]);

  const calculateLawScores = () => {
    const totalQuestions = lawModeBatchStart + currentQuestionIndex + 1;
    let attempted = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattempted = 0;
    for (let i = 0; i < totalQuestions; i++) {
      const status = questionStatuses[i];
      if (status === "correct") {
        correctCount++;
        attempted++;
      } else if (status === "wrong") {
        wrongCount++;
        attempted++;
      } else {
        unattempted++;
      }
    }
    const totalScore = correctCount * 1 + wrongCount * -0.33;
    const percentage = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
    setScoreDetails({
      totalQuestions,
      attempted,
      correct: correctCount,
      wrong: wrongCount,
      unattempted,
      totalScore: totalScore.toFixed(2),
      percentage: percentage.toFixed(2),
    });
  };

  const handleOptionSelect = (option) => {
    const newAnswers = [...userAnswers];
    const newStatuses = [...questionStatuses];
    const currentPosition = isLawMode ? lawModeBatchStart + currentQuestionIndex : currentQuestionIndex;
    newAnswers[currentPosition] = option;
    newStatuses[currentPosition] = option === questions[currentQuestionIndex].correctAnswer ? "correct" : "wrong";
    setUserAnswers(newAnswers);
    setQuestionStatuses(newStatuses);
    setSelectedOption(option);
    setShowExplanation(false);
    if (isLawMode) {
      calculateLawScores();
      const seenMcqId = questions[currentQuestionIndex].id;
      fetch(`${API_URL}/user/mark-mcq-seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mcqId: seenMcqId }),
      })
        .then((res) => {
          if (!res.ok) console.error("Failed to mark MCQ as seen:", res.status);
          else console.log("MCQ marked as seen for user:", userId);
        })
        .catch((err) => console.error("Error marking MCQ as seen:", err));
    }
  };

  const handleNextQuestion = () => {
    if (isLawMode) {
      if (questions.length <= currentQuestionIndex + 1) {
        if (isBackgroundFetching) {
          setLoading(true);
          setLoadingMessage("Waiting for additional MCQs...");
          return;
        }
        if (questions.length < LAW_MODE_TOTAL_COUNT) {
          setLoading(true);
          setLoadingMessage("Waiting for additional MCQs...");
          fetchUserMCQsForLawMode(lawModeBatchStart, false);
          return;
        }
        const nextBatchStart = lawModeBatchStart + LAW_MODE_TOTAL_COUNT;
        console.log("Fetching new batch, nextBatchStart=", nextBatchStart);
        fetchUserMCQsForLawMode(nextBatchStart, true);
      } else {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        const currentPosition = lawModeBatchStart + nextIndex;
        setSelectedOption(userAnswers[currentPosition] || null);
        setShowExplanation(false);
        calculateLawScores();
      }
    } else {
      if (isBackgroundFetching && currentQuestionIndex === questions.length - 1) {
        setLoading(true);
        setLoadingMessage("Prefetching questions...");
        return;
      }
      const maxIndex = (questionLimit || questions.length) - 1;
      if (currentQuestionIndex >= maxIndex) return;

      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedOption(userAnswers[nextIndex] || null);
      setShowExplanation(false);
      if (nextIndex > maxQuestionReached) setMaxQuestionReached(nextIndex);
    }
  };

  const handlePreviousQuestion = () => {
    if (isLawMode) {
      if (currentQuestionIndex > 0) {
        const prevIndex = currentQuestionIndex - 1;
        setCurrentQuestionIndex(prevIndex);
        const currentPosition = lawModeBatchStart + prevIndex;
        setSelectedOption(userAnswers[currentPosition] || null);
        setShowExplanation(false);
        calculateLawScores();
      } else if (lawModeBatchStart > 0) {
        const prevBatchStart = lawModeBatchStart - LAW_MODE_TOTAL_COUNT;
        fetchUserMCQsForLawMode(prevBatchStart, true);
      }
    } else {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        setSelectedOption(userAnswers[currentQuestionIndex - 1]);
        setShowExplanation(false);
      }
    }
  };

  const submitTest = () => {
    let newAnswers = [...userAnswers];
    if (selectedOption !== null) {
      newAnswers[currentQuestionIndex] = selectedOption;
      setUserAnswers(newAnswers);
    }
    const totalQuestionsToScore = questionLimit || questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let attempted = 0;
    const newStatuses = [...questionStatuses];
    newAnswers.slice(0, totalQuestionsToScore).forEach((answer, index) => {
      if (answer !== null) {
        attempted++;
        if (answer === questions[index].correctAnswer) {
          correctCount++;
          if (!isLawMode) newStatuses[index] = "correct";
        } else {
          wrongCount++;
          if (!isLawMode) newStatuses[index] = "wrong";
        }
      } else {
        if (!isLawMode) newStatuses[index] = "unattempted";
      }
    });
    setQuestionStatuses(newStatuses);
    const unattempted = totalQuestionsToScore - attempted;
    const totalScore = correctCount * 1 + wrongCount * -0.33 + unattempted * 0;
    const percentage = (totalScore / totalQuestionsToScore) * 100;
    setScore(totalScore);
    setCurrentQuestionIndex(0);
    setSelectedOption(newAnswers[0]);
    setShowExplanation(false);
    setShowScorePopup(true);
    setScoreDetails({
      totalQuestions: totalQuestionsToScore,
      attempted,
      correct: correctCount,
      wrong: wrongCount,
      unattempted,
      totalScore: totalScore.toFixed(2),
      percentage: percentage.toFixed(2),
    });
    const seenMcqIds = questions.slice(0, totalQuestionsToScore).map((q) => q.id);
    fetch(`${API_URL}/user/mark-mcqs-seen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mcqIds: seenMcqIds }),
    })
      .then((res) => {
        if (!res.ok) console.error("Failed to mark MCQs as seen:", res.status);
        else console.log("MCQs marked as seen for user:", userId);
      })
      .catch((err) => console.error("Error marking MCQs as seen:", err));
  };

  const resetTest = () => {
    isTestStarted.current = false;
    setTestStarted(false);
    setShowModeSidebar(false);
    setShowModePopover(false);
    setQuestions([]);
    setUserAnswers([]);
    setQuestionStatuses([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption(null);
    setError(null);
    setShowExplanation(false);
    setShowScorePopup(false);
    setIsUpbarOpen(true);
    setIsScoreMinimized(false);
    setFilter("all");
    setLawModeBatchStart(0);
    setScoreDetails({
      totalQuestions: 0,
      attempted: 0,
      correct: 0,
      wrong: 0,
      unattempted: 0,
      totalScore: 0,
      percentage: 0,
    });
    setMaxQuestionReached(0);
    setLoading(false);
    console.log("State reset: Test reset");
    startTest("LAW", undefined);
  };

  const handleFilterChange = (newFilter) => {
    console.log("handleFilterChange called with newFilter:", newFilter);
    let filteredIndices;
    if (isLawMode) {
      filteredIndices = Array.from({ length: lawModeBatchStart + currentQuestionIndex + 1 })
        .map((_, i) => i)
        .filter((i) => newFilter === "all" || questionStatuses[i] === newFilter);
    } else {
      filteredIndices = Array.from({ length: questionLimit || questions.length })
        .map((_, i) => i)
        .filter((i) => newFilter === "all" || questionStatuses[i] === newFilter);
    }
    setFilter(newFilter);
    if (newFilter === "wrong") {
      const firstWrongIndex = questionStatuses.findIndex((status) => status === "wrong");
      if (firstWrongIndex !== -1) {
        if (isLawMode) {
          const batchNumber = Math.floor(firstWrongIndex / LAW_MODE_TOTAL_COUNT);
          const newBatchStart = batchNumber * LAW_MODE_TOTAL_COUNT;
          const indexInBatch = firstWrongIndex % LAW_MODE_TOTAL_COUNT;
          if (newBatchStart !== lawModeBatchStart) {
            fetchUserMCQsForLawMode(newBatchStart, true);
            setTimeout(() => {
              setCurrentQuestionIndex(indexInBatch);
              setSelectedOption(userAnswers[firstWrongIndex]);
              setShowExplanation(false);
            }, 0);
          } else {
            setCurrentQuestionIndex(indexInBatch);
            setSelectedOption(userAnswers[firstWrongIndex]);
            setShowExplanation(false);
          }
        } else {
          setCurrentQuestionIndex(firstWrongIndex);
          setSelectedOption(userAnswers[firstWrongIndex]);
          setShowExplanation(false);
        }
      }
    }
  };

  const isTableBasedQuestion = (questionLines) => {
    return questionLines && questionLines.some((line) => line.includes("    ")) && questionLines.some((line) => /^\([A-D]\)/.test(line));
  };

  const isAssertionReasonQuestion = (questionLines) => {
    return questionLines && questionLines.some((line) => line.startsWith("Assertion (A):")) && questionLines.some((line) => line.startsWith("Reason (R):"));
  };

  const isStatementBasedQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => /^\d+\./.test(line)) &&
      (questionLines.some((line) => line.includes("Which of the statements given above is/are correct?")) ||
        questionLines.some((line) => line.includes("How many of the above statements are correct?")))
    );
  };

  const isChronologicalOrderQuestion = (questionLines) => {
    return questionLines && questionLines.some((line) => line.includes("Arrange the following")) && questionLines.some((line) => line.includes("chronological order"));
  };

  const isCorrectlyMatchedPairsQuestion = (questionLines) => {
    return questionLines && questionLines.some((line) => line.includes("Consider the following pairs")) && questionLines.some((line) => line.includes("Which of the pairs are correctly matched?"));
  };

  const isDirectQuestion = (questionLines) => {
    return (
      questionLines &&
      !isStatementBasedQuestion(questionLines) &&
      !isAssertionReasonQuestion(questionLines) &&
      !isTableBasedQuestion(questionLines) &&
      !isChronologicalOrderQuestion(questionLines) &&
      !isCorrectlyMatchedPairsQuestion(questionLines)
    );
  };

  const renderQuestion = (questionLines, mcq) => {
    if (!questionLines || !Array.isArray(questionLines) || !mcq) {
      console.error("renderQuestion: Invalid questionLines or mcq", { questionLines, mcq });
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
        console.error("renderQuestion: Assertion-Reason structure incomplete", questionLines);
        return <p className="text-red-200">Error: Incomplete Assertion-Reason question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{assertionLine}</p>
          <p className="mb-1 text-ivory">{reasonLine}</p>
        </div>
      );
    }
    if (isStatementBasedQuestion(questionLines)) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => {
            const isIntro = index === 0;
            const isClosing = line.includes("How many of the above statements are correct?");
            return (
              <p key={index} className={`mb-1 ${isIntro || isClosing ? "text-cosmic-dark" : "text-ivory"}`}>{line}</p>
            );
          })}
        </div>
      );
    }
    if (isChronologicalOrderQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex((line) => line.includes("Select the correct order")) !== -1 ? questionLines.findIndex((line) => line.includes("Select the correct order")) : questionLines.length;
      const items = questionLines.slice(1, closingLineIndex);
      const closingLine = closingLineIndex < questionLines.length ? questionLines[closingLineIndex] : "Select the correct order:";
      if (items.length !== 4) {
        console.error("renderQuestion: Chronological order question does not have exactly 4 items", items);
        return <p className="text-red-200">Error: Incomplete chronological order question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{introLine}</p>
          {items.map((item, index) => (
            <p key={index} className="mb-1 text-ivory">{item}</p>
          ))}
          <p className="mb-1 text-ivory">{closingLine}</p>
        </div>
      );
    }
    if (isCorrectlyMatchedPairsQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex((line) => line.includes("Which of the pairs are correctly matched?"));
      if (closingLineIndex === -1) {
        console.error("renderQuestion: Correctly matched pairs question missing closing line", questionLines);
        return <p className="text-red-200">Error: Incomplete correctly matched pairs question</p>;
      }
      const pairs = questionLines.slice(1, closingLineIndex);
      const closingLine = questionLines[closingLineIndex];
      if (pairs.length < 3) {
        console.error("renderQuestion: Correctly matched pairs question does not have enough pairs", pairs);
        return <p className="text-red-200">Error: Incomplete correctly matched pairs question</p>;
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{introLine}</p>
          {pairs.map((pair, index) => (
            <p key={index} className="mb-1 text-ivory">{pair}</p>
          ))}
          <p className="mb-1 text-ivory">{closingLine}</p>
        </div>
      );
    }
    if (isDirectQuestion(questionLines)) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => (
            <p key={index} className="mb-1 text-ivory">{line}</p>
          ))}
        </div>
      );
    }
    console.error("renderQuestion: Unknown MCQ structure:", questionLines);
    return (
      <div className="mb-2">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">{line}</p>
        ))}
      </div>
    );
  };

  const lastAttemptedIndex = userAnswers.slice().reverse().findIndex((ans) => ans !== null);
  const lastActiveIndex = lastAttemptedIndex === -1 ? -1 : userAnswers.length - 1 - lastAttemptedIndex;

  const isModeDisabled = () => {
    return false;
  };

  const handleGoBack = () => {
    console.log("Navigating back to previous page");
    navigate(-1);
  };

  const handleQuestionCountSelect = (modeOrCount) => {
    if (modeOrCount === "LAW") {
      setPendingMode("LAW");
      setPendingQuestionLimit(undefined);
    } else {
      setPendingMode("WIS");
      setPendingQuestionLimit(parseInt(modeOrCount, 10));
    }
  };

  const startNewTest = () => {
  if (!pendingMode) {
    console.log("startNewTest: Blocked", { pendingMode, pendingQuestionLimit });
    setError("Please select a test mode.");
    return;
  }
  if (pendingMode === "WIS" && !pendingQuestionLimit) {
    console.log("startNewTest: Blocked, no question limit for WIS mode", { pendingMode, pendingQuestionLimit });
    setError("Please select a question count for WIS mode.");
    return;
  }
  console.log("startNewTest: Starting test with", pendingMode, pendingMode === "WIS" ? pendingQuestionLimit : "LAW mode");
  setError(null);
  isTestStarted.current = false;
  startTest(pendingMode, pendingMode === "WIS" ? pendingQuestionLimit : undefined);
  setShowModePopover(false);
};

  useEffect(() => {
    if (isLawMode && testStarted) calculateLawScores();
  }, [questionStatuses, maxQuestionReached, isLawMode, testStarted]);

  if (showScorePopup) {
    const { totalQuestions, attempted, correct, wrong, unattempted, totalScore, percentage } = scoreDetails;
    const passed = parseFloat(percentage) >= 50;
    const cutoffDifference = Math.abs(parseFloat(percentage) - 50).toFixed(2);

    return (
      <div className="min-h-screen bg-gray-900 text-white font-poppins flex flex-col">
        <main className="flex flex-col min-h-[100dvh] bg-gray-800">
          <style>
            {`
              :root {
                --button-left-position: 1rem;
                --button-right-position: 1rem;
              }

              @media (min-width: 640px) {
                :root {
                  --button-left-position: calc(50% - 250px);
                  --button-right-position: calc(50% - 250px);
                }
              }

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
              @media (max-width: 639px) {
                .question-upbar {
                  width: 100%;
                  clip-path: polygon(
                    0% 100%, 0% 90%, 40% 90%, 44% 0%,
                    56% 0%, 60% 90%, 100% 90%, 100% 100%
                  );
                }
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
          <div className="results-container mt-4 mx-2 sm:mt-0 sm:mx-0 sm:flex sm:flex-col sm:h-full">
  <div className="results-content sm:bg-transparent sm:backdrop-filter-none">
    <button
      onClick={() => {
        setShowScorePopup(false);
        if (!isLawMode) setIsScoreMinimized(true);
      }}
      className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors duration-200 sm:hidden z-10"
      aria-label="Close Results"
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
    <div className="test-complete p-2 sm:p-4 text-center">
      <div className="hidden sm:flex sm:justify-between sm:items-center sm:mb-2">
        <button
          onClick={() => {
            setShowScorePopup(false);
            if (!isLawMode) setIsScoreMinimized(true);
          }}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Solutions</span>
        </button>
        <h1 className="text-2xl font-bold text-blue-400">{isLawMode ? "Live Score" : "Test Complete!"}</h1>
        <div className="w-[140px]"></div>
      </div>
      <svg className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 sm:hidden" viewBox="0 0 32 4" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="2" y1="2" x2="30" y2="2" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="flex flex-col items-center gap-1 mt-6 sm:mt-0 sm:flex-row sm:justify-between sm:items-center sm:hidden">
        <h1 className="text-lg font-bold text-blue-400">{isLawMode ? "Live Score" : "Test Complete!"}</h1>
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
        <div className="bg-gray-700 p-0.5 sm:p-1 rounded-lg"><p className="text-sm sm:text-base font-bold">{totalQuestions}</p><p className="text-[8px] sm:text-[10px] text-gray-400">Total</p></div>
        <div className="bg-gray-700 p-0.5 sm:p-1 rounded-lg"><p className="text-sm sm:text-base font-bold">{attempted}</p><p className="text-[8px] sm:text-[10px] text-gray-400">Attempted</p></div>
        <div className="bg-green-700 p-0.5 sm:p-1 rounded-lg"><p className="text-sm sm:text-base font-bold">{correct}</p><p className="text-[8px] sm:text-[10px] text-green-200">Correct</p></div>
        <div className="bg-red-700 p-0.5 sm:p-1 rounded-lg"><p className="text-sm sm:text-base font-bold">{wrong}</p><p className="text-[8px] sm:text-[10px] text-red-200">Incorrect</p></div>
        <div className="bg-yellow-700 p-0.5 sm:p-1 rounded-lg col-span-2 md:col-span-1"><p className="text-sm sm:text-base font-bold">{unattempted}</p><p className="text-[8px] sm:text-[10px] text-yellow-200">Unattempted</p></div>
      </div>
    </div>
              <div className="question-upbar" onClick={() => {
  setShowModePopover(prev => !prev);
  if (!showModePopover) {
    setPendingMode(null);
    setPendingQuestionLimit(null);
  }
}}>
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
              <div className={`popup fixed bottom-0 left-0 w-full h-[50vh] shadow-lg overflow-y-auto ${showModePopover ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-4 sm:p-6 flex flex-col items-center">
                  <h3 className="text-3xl sm:text-4xl font-semibold text-gray-50 mb-8 -mt-2 whitespace-nowrap">Book Domain</h3>
                  <div className="grid grid-cols-2 w-full gap-4 mb-8 px-4">
  {["LAW", 25, 50, 100].map((item) => {
    const isSelected = (item === "LAW" && pendingMode === "LAW") || (item !== "LAW" && pendingMode === "WIS" && pendingQuestionLimit === item);
    let buttonClass = `w-full px-4 py-4 rounded-full text-sm sm:text-base font-medium transition-all duration-300 transform hover:scale-105 border-2 border-transparent `;
    if (isSelected) {
      if (item === "LAW") {
        buttonClass += 'bg-green-600 text-white border-green-800';
      } else if (item === 100) {
        buttonClass += 'bg-amber-500 text-black border-amber-700';
      } else if (item === 50) {
        buttonClass += 'bg-slate-400 text-black border-slate-600';
      } else if (item === 25) {
        buttonClass += 'bg-orange-400 text-black border-orange-600';
      }
    } else {
      buttonClass += 'bg-gray-700 text-white hover:bg-gray-600';
    }
    return (
      <button key={item} onClick={() => handleQuestionCountSelect(item)} className={buttonClass}>
        {modeLabels[item]}
      </button>
    );
  })}
</div>
                </div>
              </div>
              {showModePopover && (
                <>
                  <button
                    onClick={startNewTest}
                    disabled={pendingMode === "WIS" && !pendingQuestionLimit}
                    className={`fixed z-50 bottom-6 px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent ${
                      pendingMode === "LAW" || (pendingMode === "WIS" && pendingQuestionLimit)
                        ? 'bg-yellow-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    }`}
                    style={{ left: 'var(--button-left-position)' }}
                  >
                    Start New Test
                  </button>
                  <button
                    onClick={() => {
                      setShowScorePopup(false);
                      if (!isLawMode) setIsScoreMinimized(true);
                    }}
                    className="fixed z-50 bottom-6 px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent bg-orange-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105"
                    style={{ right: 'var(--button-right-position)' }}
                  >
                    View Solutions
                  </button>
                </>
              )}
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
            :root {
              --button-left-position: 1rem;
              --button-right-position: 1rem;
            }

                       @media (min-width: 640px) {
              :root {
                --button-left-position: calc(50% - 250px);
                --button-right-position: calc(50% - 250px);
              }
            }

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
            @media (max-width: 639px) {
              .question-upbar {
                width: 100%;
                clip-path: polygon(
                  0% 100%, 0% 90%, 40% 90%, 44% 0%,
                  56% 0%, 60% 90%, 100% 90%, 100% 100%
                );
              }
            }
            .question-upbar svg {
              width: 30px;
              height: 30px;
              fill: black;
              cursor: pointer;
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
          {testStarted && (isLawMode ? "LAW Mode" : `WIS Mode: ${questionLimit} Questions`)}
        </div>
        <button
          onClick={() => setShowModeSidebar(!showModeSidebar)}
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
            <p className="mt-4 text-lg sm:text-xl font-bold text-blue-300 tracking-wide">{loadingMessage}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[999] flex items-center justify-center bg-gray-900">
          <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl text-center">
            <p className="text-base sm:text-lg text-red-200">{error}</p>
            <button
              onClick={resetTest}
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
                  style={{ height: '2.5rem', opacity: 1, visibility: 'visible', position: 'fixed' }}
                >
                  {(() => {
                    let filteredIndices;
                    if (isLawMode) {
                      filteredIndices = Array.from({ length: lawModeBatchStart + currentQuestionIndex + 1 })
                        .map((_, i) => i)
                        .filter((i) => filter === "all" || questionStatuses[i] === filter);
                    } else {
                      filteredIndices = Array.from({ length: questionLimit || questions.length })
                        .map((_, i) => i)
                        .filter((i) => filter === "all" || questionStatuses[i] === filter);
                    }
                    if (filteredIndices.length === 0) {
                      return <p className="text-white text-xs sm:text-sm">No {filter} questions found.</p>;
                    }
                    return filteredIndices.map((actualIndex) => {
                      const status = questionStatuses[actualIndex] || "unattempted";
                      const isCurrent = actualIndex === (isLawMode ? lawModeBatchStart + currentQuestionIndex : currentQuestionIndex) && !showExplanation;
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
                            if (isLawMode) {
                              const batchNumber = Math.floor(actualIndex / LAW_MODE_TOTAL_COUNT);
                              const newBatchStart = batchNumber * LAW_MODE_TOTAL_COUNT;
                              const indexInBatch = actualIndex % LAW_MODE_TOTAL_COUNT;
                              if (newBatchStart !== lawModeBatchStart) {
                                fetchUserMCQsForLawMode(newBatchStart, true);
                                setTimeout(() => {
                                  setCurrentQuestionIndex(indexInBatch);
                                  setSelectedOption(userAnswers[actualIndex]);
                                  setShowExplanation(false);
                                }, 0);
                              } else {
                                setCurrentQuestionIndex(indexInBatch);
                                setSelectedOption(userAnswers[actualIndex]);
                                setShowExplanation(false);
                              }
                            } else {
                              setCurrentQuestionIndex(actualIndex);
                              setSelectedOption(userAnswers[actualIndex]);
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
                onClick={() => ((isLawMode && selectedOption) || (!isLawMode && score !== null)) && setShowExplanation(!showExplanation)}
              >
                <p className="text-sm sm:text-base text-white mb-1 question-number">
                  Question {isLawMode ? lawModeBatchStart + currentQuestionIndex + 1 : currentQuestionIndex + 1}{!isLawMode && ` of ${questionLimit}`}
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
                      const isUserAnswer = userAnswers[isLawMode ? lawModeBatchStart + currentQuestionIndex : currentQuestionIndex] === key;
                      const isCorrectAnswer = questions[currentQuestionIndex].correctAnswer === key;
                      let baseClassName = `
                        w-full text-left p-5 sm:p-5 rounded-md border transition-colors duration-300
                        text-sm sm:text-lg flex items-center justify-start min-h-[2.5rem] sm:min-h-[3rem]
                        overflow-y-auto focus:outline-none focus:ring-2 focus:ring-orange-400
                      `;
                      let stateClassName = ((isLawMode && selectedOption) || (!isLawMode && score !== null))
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
                          onClick={() => handleOptionSelect(key)}
                          className={`${baseClassName} ${stateClassName}`}
                          disabled={(isLawMode && selectedOption !== null) || (!isLawMode && score !== null)}
                        >
                          <span className="font-medium mr-2">{key})</span> {option}
                          {((isLawMode && selectedOption) || (!isLawMode && score !== null)) && isUserAnswer && !isCorrectAnswer && (
                            <span className="ml-2 text-red-300 font-medium text-[10px] sm:text-xs">(Wrong Answer)</span>
                          )}
                          {((isLawMode && selectedOption) || (!isLawMode && score !== null)) && isCorrectAnswer && (
                            <span className="ml-2 text-emerald-300 font-medium text-[10px] sm:text-xs">(Correct Answer)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {((isLawMode && selectedOption) || (!isLawMode && score !== null)) && showExplanation && (
                  <div
                    className="absolute top-0 left-0 right-0 bottom-0 rounded-lg z-70 pointer-events-auto"
                    onClick={() => setShowExplanation(false)}
                  >
                    <div className="absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-md p-2 sm:p-3 rounded-lg flex flex-col h-full">
                      <p className="text-base sm:text-lg font-medium text-zinc-200 mb-2">Explanation:</p>
                      <div className="flex-1 overflow-y-auto">
                        <p className="text-[16px] sm:text-xl text-zinc-200 leading-relaxed">{questions[currentQuestionIndex].explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!showModePopover && (
                <>
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0 && (isLawMode ? lawModeBatchStart === 0 : true)}
                    className={`fixed bottom-4 left-4 px-4 sm:px-6 py-1.5 text-sm sm:text-base rounded-lg shadow-xl transition-colors transform hover:scale-105 duration-300 z-50 ${
                      currentQuestionIndex === 0 && (isLawMode ? lawModeBatchStart === 0 : true)
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed border border-gray-300"
                        : "bg-red-700 text-white hover:bg-red-800 border border-red-700"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      if (isLawMode || score === null) {
                        if (!isLawMode && questions.length === questionLimit && currentQuestionIndex === questionLimit - 1) {
                          submitTest();
                        } else {
                          handleNextQuestion();
                        }
                      } else {
                        const filteredIndices = Array.from({ length: questionLimit || questions.length })
                          .map((_, i) => i)
                          .filter((i) => filter === "all" || questionStatuses[i] === filter);
                        const currentFilteredIndex = filteredIndices.indexOf(currentQuestionIndex);
                        const nextFilteredIndex = currentFilteredIndex < filteredIndices.length - 1
                          ? filteredIndices[currentFilteredIndex + 1]
                          : filteredIndices[0];
                        setCurrentQuestionIndex(nextFilteredIndex);
                        setSelectedOption(userAnswers[nextFilteredIndex] || null);
                        setShowExplanation(false);
                      }
                    }}
                    disabled={(isLawMode && (questions.length <= currentQuestionIndex + 1 || isBackgroundFetching)) || (!isLawMode && isBackgroundFetching && currentQuestionIndex === questions.length - 1)}
                    className={`fixed bottom-4 right-4 sm:right-2 px-4 sm:px-6 py-1.5 text-sm sm:text-base rounded-lg shadow-xl transition-colors transform hover:scale-105 duration-300 border border-gray-200/10 z-50 ${
                      ((isLawMode && (questions.length <= currentQuestionIndex + 1 || isBackgroundFetching)) || (!isLawMode && isBackgroundFetching && currentQuestionIndex === questions.length - 1))
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed border border-gray-300"
                        : score !== null
                        ? "bg-white text-gray-900 hover:bg-gray-100"
                        : !isLawMode && questions.length === questionLimit && currentQuestionIndex === questionLimit - 1
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-white text-gray-900 hover:bg-gray-100"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.18)" }}
                  >
                    {score !== null ? "Next" : !isLawMode && questions.length === questionLimit && currentQuestionIndex === questionLimit - 1 ? "Submit" : "Next"}
                  </button>
                </>
              )}
              <div className="question-upbar" onClick={() => {
  setShowModePopover(prev => !prev);
  if (!showModePopover) {
    setPendingMode(null);
    setPendingQuestionLimit(null);
  }
}}>
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
              <div className={`popup fixed bottom-0 left-0 w-full h-[50vh] shadow-lg overflow-y-auto ${showModePopover ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-4 sm:p-6 flex flex-col items-center">
                  <h3 className="text-3xl sm:text-4xl font-semibold text-gray-50 mb-8 -mt-2 whitespace-nowrap">Book Domain</h3>
                  <div className="grid grid-cols-2 w-full gap-4 mb-8 px-4">
  {["LAW", 25, 50, 100].map((item) => {
    const isSelected = (item === "LAW" && pendingMode === "LAW") || (item !== "LAW" && pendingMode === "WIS" && pendingQuestionLimit === item);
    let buttonClass = `w-full px-4 py-4 rounded-full text-sm sm:text-base font-medium transition-all duration-300 transform hover:scale-105 border-2 border-transparent `;
    if (isSelected) {
      if (item === "LAW") {
        buttonClass += 'bg-green-600 text-white border-green-800';
      } else if (item === 100) {
        buttonClass += 'bg-amber-500 text-black border-amber-700';
      } else if (item === 50) {
        buttonClass += 'bg-slate-400 text-black border-slate-600';
      } else if (item === 25) {
        buttonClass += 'bg-orange-400 text-black border-orange-600';
      }
    } else {
      buttonClass += 'bg-gray-700 text-white hover:bg-gray-600';
    }
    return (
      <button key={item} onClick={() => handleQuestionCountSelect(item)} className={buttonClass}>
        {modeLabels[item]}
      </button>
    );
  })}
</div>
                </div>
              </div>
              {showModePopover && (
                <>
                  <button
                    onClick={startNewTest}
                    disabled={pendingMode === "WIS" && !pendingQuestionLimit}
                    className={`fixed z-50 bottom-6 px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent ${
                      pendingMode === "LAW" || (pendingMode === "WIS" && pendingQuestionLimit)
                        ? 'bg-yellow-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    }`}
                    style={{ left: 'var(--button-left-position)' }}
                  >
                    Start Test
                  </button>
                  <button
                    onClick={() => {
                      setShowModePopover(false);
                      setShowScorePopup(true);
                    }}
                    disabled={!(isLawMode || (!isLawMode && score !== null))}
                    className={`fixed z-50 bottom-6 px-6 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 transform border-2 border-transparent ${
                      isLawMode || (!isLawMode && score !== null)
                        ? 'bg-orange-600 text-white hover:bg-sky-200 hover:text-sky-800 hover:border-sky-600 hover:scale-105'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    }`}
                    style={{ right: 'var(--button-right-position)' }}
                  >
                    View Results
                  </button>
                </>
              )}
            </>
          ) : testStarted && questions.length > 0 ? (
            <div className="p-4 bg-red-600 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
              <p className="text-sm sm:text-base text-white font-semibold">Error: Invalid question index. Please try again.</p>
              <button
                onClick={resetTest}
                className="mt-4 bg-blue-600 text-white px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg hover:bg-blue-700 transition-transform transform duration-300"
              >
                Reset Test
              </button>
            </div>
          ) : (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg mx-auto max-w-sm sm:max-w-md text-center">
              <p className="text-sm sm:text-base text-gray-200 font-semibold">No questions loaded yet. Please try again.</p>
              <button
                onClick={resetTest}
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
              onClick={() => setShowModePopover(true)}
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
          style={{ right: showModeSidebar ? "0" : "-288px" }}
        >
          <div className="p-4 sm:p-6 h-full flex flex-col relative">
            <button
              onClick={() => setShowModeSidebar(false)}
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
            {((isLawMode && selectedOption) || (!isLawMode && score !== null)) && (
              <div className="mt-8 mb-4 z-10">
                <label className="block text-xs sm:text-sm font-semibold text-blue-300 mb-1" htmlFor="sidebar-filter-select">Filter</label>
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
            )}
            <div className="flex-1 flex flex-col relative">
              <div
                className={`grid mb-4 ${
                  isLawMode
                    ? 'grid-cols-5 gap-2 gap-x-3 gap-y-2'
                    : questionLimit === 25
                    ? 'grid-cols-5 gap-2 gap-x-3 gap-y-9'
                    : questionLimit === 50
                    ? 'grid-cols-5 gap-2 gap-x-3 gap-y-3'
                    : questionLimit === 100
                    ? 'grid-cols-7 gap-2 gap-x-3 gap-y-2'
                    : 'grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-2'
                }`}
              >
                {(() => {
                  let circleCount = isLawMode ? lawModeBatchStart + currentQuestionIndex + 1 : Math.min(questionLimit || questions.length, questions.length);
                  return Array.from({ length: circleCount })
                    .map((_, i) => i)
                    .filter((i) => filter === "all" || questionStatuses[i] === filter)
                    .map((actualIndex) => {
                      const status = questionStatuses[actualIndex] || "unattempted";
                      const isCurrent = actualIndex === (isLawMode ? lawModeBatchStart + currentQuestionIndex : currentQuestionIndex) && !showExplanation;
                      let colorClass = isLawMode
                        ? status === "correct"
                          ? "bg-green-500"
                          : status === "wrong"
                          ? "bg-red-500"
                          : isCurrent
                          ? "bg-purple-500"
                          : "bg-white"
                        : score !== null
                        ? status === "correct"
                          ? "bg-green-500"
                          : status === "wrong"
                          ? "bg-red-500"
                          : "bg-white"
                        : actualIndex <= maxQuestionReached
                        ? userAnswers[actualIndex] !== null
                          ? "bg-blue-500"
                          : "bg-white"
                        : "bg-gray-500";
                      if (isCurrent && score !== null) {
                        colorClass = `${colorClass} ring-2 ring-white`;
                      }
                      const sizeClass = isLawMode
                        ? 'w-7 h-7 text-sm'
                        : questionLimit === 25
                        ? 'w-11 h-11 text-base'
                        : questionLimit === 50
                        ? 'w-10 h-10 text-base'
                        : questionLimit === 100
                        ? 'w-7 h-7 text-sm'
                        : 'w-8 h-8 text-sm';
                      return (
                        <div
                          key={actualIndex}
                          className={`${sizeClass} ${colorClass} rounded-md flex items-center justify-center text-gray-900 font-semibold shadow-sm transition-transform duration-200 cursor-pointer hover:scale-105`}
                          onClick={() => {
                            if (isLawMode) {
                              const batchNumber = Math.floor(actualIndex / LAW_MODE_TOTAL_COUNT);
                              const newBatchStart = batchNumber * LAW_MODE_TOTAL_COUNT;
                              const indexInBatch = actualIndex % LAW_MODE_TOTAL_COUNT;
                              if (newBatchStart !== lawModeBatchStart) {
                                fetchUserMCQsForLawMode(newBatchStart, true);
                                setTimeout(() => {
                                  setCurrentQuestionIndex(indexInBatch);
                                  setSelectedOption(userAnswers[actualIndex]);
                                  setShowExplanation(false);
                                }, 0);
                              } else {
                                setCurrentQuestionIndex(indexInBatch);
                                setSelectedOption(userAnswers[actualIndex]);
                                setShowExplanation(false);
                              }
                            } else {
                              setCurrentQuestionIndex(actualIndex);
                              setSelectedOption(userAnswers[actualIndex]);
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
              {!isLawMode && score === null && (
                <button
                  onClick={submitTest}
                  className="w-full px-4 py-1.5 text-sm sm:text-base rounded-full shadow-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-transform duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 absolute bottom-2 left-0 right-0 mx-4 sm:mx-6"
                >
                  Submit Test
                </button>
              )}
              {score !== null && (
                <button
                  onClick={() => setShowScorePopup(true)}
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

export default TamilnaduHistory;