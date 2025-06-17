import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";
import axios from "axios";

const RameshSingh = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testStarted, setTestStarted] = useState(false);
  const [showModeSidebar, setShowModeSidebar] = useState(false);
  const [showModePopover, setShowModePopover] = useState(false);
  const [isLawMode, setIsLawMode] = useState(true);
  const [questionLimit, setQuestionLimit] = useState(25);
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
  const [pendingMode, setPendingMode] = useState("LAW");
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const LAW_MODE_INITIAL_COUNT = 1;
  const LAW_MODE_BACKGROUND_COUNT = 99;
  const LAW_MODE_TOTAL_COUNT = 100;
  const LOADING_TIMEOUT = 30000;

  const isTestStarted = useRef(false);

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
        pElementsHeight +=
          questionNumber.offsetHeight + parseFloat(style.marginBottom);
      }
      if (chapterText) {
        const style = window.getComputedStyle(chapterText);
        pElementsHeight +=
          chapterText.offsetHeight + parseFloat(style.marginBottom);
      }
      const paddingHeight = 16;
      const effectiveHeight =
        questionBox.clientHeight - pElementsHeight - paddingHeight;
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
      console.log(
        "Fetching MCQs with userId:",
        userId,
        "requestedCount:",
        requestedCount,
        "excludeIds:",
        excludeIds
      );
      if (!userId) throw new Error("userId is undefined or empty");
      const validRequestedCount =
        typeof requestedCount === "number" && requestedCount > 0
          ? requestedCount
          : 1;
      const response = await fetch(`${API_URL}/user/get-book-mcqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          book: "Economy", // <-- CRITICAL CHANGE: Fetching Economy MCQs
          requestedCount: validRequestedCount,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to fetch MCQs: HTTP ${response.status}`
        );
      }
      const data = await response.json();
      if (!data.mcqs || !data.mcqs.length)
        throw new Error("No new MCQs available for this user.");
      const transformedMCQs = data.mcqs
        .filter((mcq) => {
          if (
            !mcq.mcq ||
            !mcq.mcq.question ||
            !mcq.mcq.options ||
            !mcq.mcq.correctAnswer ||
            !mcq.mcq.explanation ||
            excludeIds.includes(mcq._id.toString())
          ) {
            console.warn("Invalid or duplicate MCQ skipped:", mcq);
            return false;
          }
          return true;
        })
        .map((mcq) => ({
          question: Array.isArray(mcq.mcq.question)
            ? mcq.mcq.question
            : mcq.mcq.question.split("\n").filter((line) => line.trim()),
          options: mcq.mcq.options,
          correctAnswer: mcq.mcq.correctAnswer,
          explanation: mcq.mcq.explanation,
          chapter: mcq.chapter,
          id: mcq._id,
        }));
      if (!transformedMCQs.length)
        throw new Error("No valid MCQs available after filtering.");
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
        console.log(
          `fetchWisMCQs: Loaded background ${fetchedMcqs.length} MCQs for user ${userId}`
        );
      }
    } catch (err) {
      let errorMessage = "Failed to load MCQs. Please try again later.";
      if (err.message.includes("Failed to fetch")) {
        errorMessage =
          "Unable to connect to the server. Ensure the backend server is running and try again.";
      }
      setError(errorMessage);
      if (isInitial) setTestStarted(false);
    } finally {
      if (isInitial) setLoading(false);
      setIsBackgroundFetching(false);
    }
  };

  const fetchUserMCQsForLawMode = async (
    batchStart = 0,
    isInitial = true,
    retries = 2
  ) => {
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
      console.log(
        `Fetching MCQs for LAW mode: userId=${userId}, batchStart=${batchStart}, isInitial=${isInitial}, retries=${retries}`
      );
      if (!userId) throw new Error("userId is undefined or empty");

      const excludeIds = questions.map((q) => q.id.toString());
      const count = isInitial
        ? LAW_MODE_INITIAL_COUNT
        : LAW_MODE_BACKGROUND_COUNT;

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
        console.log(
          `fetchUserMCQsForLawMode: Loaded initial ${transformedMCQs.length} MCQs for user ${userId}`
        );
      } else {
        setQuestions((prev) => {
          const newQuestions = [...prev, ...transformedMCQs];
          const limitedQuestions = newQuestions.slice(0, LAW_MODE_TOTAL_COUNT);
          console.log("Updated questions length:", limitedQuestions.length);
          return limitedQuestions;
        });
        console.log(
          `fetchUserMCQsForLawMode: Loaded background ${transformedMCQs.length} MCQs for user ${userId}`
        );
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
          errorMessage =
            "Unable to connect to the server. Ensure the backend server is running and try again.";
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
    console.log(
      "startTest called with mode:",
      mode,
      "requestedCount:",
      requestedCount
    );
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
    if (
      isLawMode &&
      testStarted &&
      questions.length === LAW_MODE_INITIAL_COUNT &&
      !isBackgroundFetching
    ) {
      console.log("Triggering background fetch for LAW mode.");
      fetchUserMCQsForLawMode(lawModeBatchStart, false);
    }
  }, [
    isLawMode,
    testStarted,
    questions.length,
    lawModeBatchStart,
    isBackgroundFetching,
  ]);

  useEffect(() => {
    if (
      !isLawMode &&
      testStarted &&
      questions.length === 1 &&
      !isBackgroundFetching &&
      questionLimit > 1
    ) {
      console.log(
        `Triggering background fetch for WIS mode. Limit: ${questionLimit}`
      );
      fetchWisMCQs(false, questionLimit);
    }
  }, [
    isLawMode,
    testStarted,
    questions.length,
    isBackgroundFetching,
    questionLimit,
  ]);


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
    const percentage =
      totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
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
    const currentPosition = isLawMode
      ? lawModeBatchStart + currentQuestionIndex
      : currentQuestionIndex;
    newAnswers[currentPosition] = option;
    newStatuses[currentPosition] =
      option === questions[currentQuestionIndex].correctAnswer
        ? "correct"
        : "wrong";
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
    const seenMcqIds = questions
      .slice(0, totalQuestionsToScore)
      .map((q) => q.id);
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
      filteredIndices = Array.from({
        length: lawModeBatchStart + currentQuestionIndex + 1,
      })
        .map((_, i) => i)
        .filter((i) => newFilter === "all" || questionStatuses[i] === newFilter);
    } else {
      filteredIndices = Array.from({
        length: questionLimit || questions.length,
      })
        .map((_, i) => i)
        .filter((i) => newFilter === "all" || questionStatuses[i] === newFilter);
    }
    setFilter(newFilter);
    if (newFilter === "wrong") {
      const firstWrongIndex = questionStatuses.findIndex(
        (status) => status === "wrong"
      );
      if (firstWrongIndex !== -1) {
        if (isLawMode) {
          const batchNumber = Math.floor(
            firstWrongIndex / LAW_MODE_TOTAL_COUNT
          );
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
    return (
      questionLines &&
      questionLines.some((line) => line.includes("      ")) &&
      questionLines.some((line) => /^\([A-D]\)/.test(line))
    );
  };

  const isAssertionReasonQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.startsWith("Assertion (A):")) &&
      questionLines.some((line) => line.startsWith("Reason (R):"))
    );
  };

  const isStatementBasedQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => /^\d+\./.test(line)) &&
      (questionLines.some((line) =>
        line.includes("Which of the statements given above is/are correct?")
      ) ||
        questionLines.some((line) =>
          line.includes("How many of the above statements are correct?")
        ))
    );
  };

  const isChronologicalOrderQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.includes("Arrange the following")) &&
      questionLines.some((line) => line.includes("chronological order"))
    );
  };

  const isCorrectlyMatchedPairsQuestion = (questionLines) => {
    return (
      questionLines &&
      questionLines.some((line) => line.includes("Consider the following pairs")) &&
      questionLines.some((line) =>
        line.includes("Which of the pairs are correctly matched?")
      )
    );
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
      console.error("renderQuestion: Invalid questionLines or mcq", {
        questionLines,
        mcq,
      });
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
          <p className="text-base sm:text-lg font-medium text-ivory mb-2">
            {introLine}
          </p>
          <table className="table-auto w-full text-left text-ivory mb-4 border-collapse">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchingItems.map((item, index) => {
                const [left, right] = item.split(/\s{4,}/);
                return (
                  <tr key={index}>
                    <td className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">
                      {left}
                    </td>
                    <td className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">
                      {right}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-base sm:text-lg font-medium text-ivory">
            {closingLine}
          </p>
        </div>
      );
    }
    if (isAssertionReasonQuestion(questionLines)) {
      const assertionLine = questionLines.find((line) =>
        line.startsWith("Assertion (A):")
      );
      const reasonLine = questionLines.find((line) =>
        line.startsWith("Reason (R):")
      );
      if (!assertionLine || !reasonLine) {
        console.error(
          "renderQuestion: Assertion-Reason structure incomplete",
          questionLines
        );
        return (
          <p className="text-red-200">
            Error: Incomplete Assertion-Reason question
          </p>
        );
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
            const isClosing = line.includes(
              "How many of the above statements are correct?"
            );
            return (
              <p
                key={index}
                className={`mb-1 ${
                  isIntro || isClosing ? "text-cosmic-dark" : "text-ivory"
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>
      );
    }
    if (isChronologicalOrderQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex =
        questionLines.findIndex((line) =>
          line.includes("Select the correct order")
        ) !== -1
          ? questionLines.findIndex((line) =>
              line.includes("Select the correct order")
            )
          : questionLines.length;
      const items = questionLines.slice(1, closingLineIndex);
      const closingLine =
        closingLineIndex < questionLines.length
          ? questionLines[closingLineIndex]
          : "Select the correct order:";
      if (items.length !== 4) {
        console.error(
          "renderQuestion: Chronological order question does not have exactly 4 items",
          items
        );
        return (
          <p className="text-red-200">
            Error: Incomplete chronological order question
          </p>
        );
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{introLine}</p>
          {items.map((item, index) => (
            <p key={index} className="mb-1 text-ivory">
              {item}
            </p>
          ))}
          <p className="mb-1 text-ivory">{closingLine}</p>
        </div>
      );
    }
    if (isCorrectlyMatchedPairsQuestion(questionLines)) {
      const introLine = questionLines[0];
      const closingLineIndex = questionLines.findIndex((line) =>
        line.includes("Which of the pairs are correctly matched?")
      );
      if (closingLineIndex === -1) {
        console.error(
          "renderQuestion: Correctly matched pairs question missing closing line",
          questionLines
        );
        return (
          <p className="text-red-200">
            Error: Incomplete correctly matched pairs question
          </p>
        );
      }
      const pairs = questionLines.slice(1, closingLineIndex);
      const closingLine = questionLines[closingLineIndex];
      if (pairs.length < 3) {
        console.error(
          "renderQuestion: Correctly matched pairs question does not have enough pairs",
          pairs
        );
        return (
          <p className="text-red-200">
            Error: Incomplete correctly matched pairs question
          </p>
        );
      }
      return (
        <div className="mb-2">
          <p className="mb-1 text-ivory">{introLine}</p>
          {pairs.map((pair, index) => (
            <p key={index} className="mb-1 text-ivory">
              {pair}
            </p>
          ))}
          <p className="mb-1 text-ivory">{closingLine}</p>
        </div>
      );
    }
    if (isDirectQuestion(questionLines)) {
      return (
        <div className="mb-2">
          {questionLines.map((line, index) => (
            <p key={index} className="mb-1 text-ivory">
              {line}
            </p>
          ))}
        </div>
      );
    }
    console.error("renderQuestion: Unknown MCQ structure:", questionLines);
    return (
      <div className="mb-2">
        {questionLines.map((line, index) => (
          <p key={index} className="mb-1 text-ivory">
            {line}
          </p>
        ))}
      </div>
    );
  };
  
  const handleGoBack = () => {
    console.log("Navigating back to previous page");
    navigate(-1);
  };

  const isModeDisabled = () => {
    return false;
  };

  useEffect(() => {
    if (isLawMode && testStarted) calculateLawScores();
  }, [questionStatuses, maxQuestionReached, isLawMode, testStarted]);

  return (
    <div className="h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
      <div className="fixed top-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-3 flex justify-between items-center shadow-lg z-60 h-16">
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex items-center justify-end gap-1">
          {testStarted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModeSidebar(!showModeSidebar);
              }}
              className="bg-blue-600 text-white p-1 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {testStarted && filter !== "all" && (
        <div
          className="fixed top-[4rem] left-0 w-full bg-gray-800 z-40 p-2 overflow-x-auto overflow-y-hidden flex space-x-2 items-center"
          style={{ height: "3rem" }}
        >
          {(() => {
            let filteredIndices;
            if (isLawMode) {
              filteredIndices = Array.from({
                length: lawModeBatchStart + currentQuestionIndex + 1,
              })
                .map((_, i) => i)
                .filter(
                  (i) => filter === "all" || questionStatuses[i] === filter
                );
            } else {
              filteredIndices = Array.from({
                length: questionLimit || questions.length,
              })
                .map((_, i) => i)
                .filter(
                  (i) => filter === "all" || questionStatuses[i] === filter
                );
            }
            if (filteredIndices.length === 0) {
              return (
                <p className="text-white text-xs sm:text-sm">
                  No {filter} questions found.
                </p>
              );
            }
            return filteredIndices.map((actualIndex) => {
              const status = questionStatuses[actualIndex] || "unattempted";
              const isCurrent =
                actualIndex ===
                  (isLawMode
                    ? lawModeBatchStart + currentQuestionIndex
                    : currentQuestionIndex) && !showExplanation;
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
                  className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full ${colorClass} flex items-center justify-center text-gray-900 text-sm sm:text-base font-semibold shadow-md transition-colors duration-300 cursor-pointer`}
                  onClick={() => {
                    if (isLawMode) {
                      const batchNumber = Math.floor(
                        actualIndex / LAW_MODE_TOTAL_COUNT
                      );
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

      <div className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
        {loading ? (
          <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
            <div className="flex items-center">
              <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
              <span className="ml-4 text-lg sm:text-xl font-bold text-blue-300 tracking-wide">
                {loadingMessage || "Loading..."}
              </span>
            </div>
          </div>
        ) : !testStarted && !loading ? (
          <div className="h-[calc(45rem)] w-full flex items-center justify-center">
            <p className="text-lg sm:text-xl text-gray-400">Loading test...</p>
          </div>
        ) : (
          <>
            {error ? (
              <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
                <p className="text-base sm:text-lg text-red-200">{error}</p>
                <button
                  onClick={resetTest}
                  className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                >
                  Try Again
                </button>
              </div>
            ) : questions.length > 0 && currentQuestionIndex < questions.length ? (
              <>
                <div
                  className="fixed left-0 w-full z-60 px-3 sm:px-4 lg:px-6 question-box bg-gray-900"
                  style={{ top: "4rem", height: "calc((100dvh - 8rem) * 0.5)" }}
                  onClick={() =>
                    ((isLawMode && selectedOption) ||
                      (!isLawMode && score !== null)) &&
                    setShowExplanation(!showExplanation)
                  }
                >
                  <p className="text-sm sm:text-base text-white mb-1 question-number">
                    Question{" "}
                    {isLawMode
                      ? lawModeBatchStart + currentQuestionIndex + 1
                      : currentQuestionIndex + 1}
                    {!isLawMode && ` of ${questionLimit}`}
                  </p>
                  {questions[currentQuestionIndex].chapter &&
                    questions[currentQuestionIndex].chapter !==
                      "Unknown Chapter" && (
                      <p className="text-xs sm:text-sm text-white/80 mb-1 chapter-text">
                        Chapter: {questions[currentQuestionIndex].chapter}
                      </p>
                    )}
                  <div className="h-full font-medium text-white bg-gradient-to-br from-gray-800 to-blue-900 p-2 rounded-lg shadow-inner">
                    <div
                      className="question-content leading-tight"
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {renderQuestion(
                        questions[currentQuestionIndex].question,
                        questions[currentQuestionIndex]
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="absolute left-0 w-full bg-gray-900 z-20 px-2 sm:px-8 lg:px-6"
                  style={{
                    top: "calc(4rem + (100dvh - 8rem) * 0.5)",
                    bottom: "4rem",
                  }}
                >
                  <div className="bg-gray-800 rounded-lg p-2 sm:p-2 h-full overflow-y-auto">
                    <div className="flex flex-col gap-0.5">
                      {Object.entries(
                        questions[currentQuestionIndex].options
                      ).map(([key, option]) => {
                        const isUserAnswer =
                          userAnswers[
                            isLawMode
                              ? lawModeBatchStart + currentQuestionIndex
                              : currentQuestionIndex
                          ] === key;
                        const isCorrectAnswer =
                          questions[currentQuestionIndex].correctAnswer === key;
                        let baseClassName = `
                                              w-full text-left p-5 sm:p-5 rounded-md border transition-colors duration-300 
                                              text-sm sm:text-lg flex items-center justify-start min-h-[2.5rem] sm:min-h-[3rem]
                                              overflow-y-auto focus:outline-none focus:ring-2 focus:ring-orange-400
                                            `;
                        let stateClassName = "";
                        if (
                          (isLawMode && selectedOption) ||
                          (!isLawMode && score !== null)
                        ) {
                          if (isUserAnswer && !isCorrectAnswer) {
                            stateClassName =
                              "bg-red-600 border-red-500 text-white";
                          } else if (isCorrectAnswer) {
                            stateClassName =
                              "bg-emerald-600 border-emerald-500 text-white";
                          } else {
                            stateClassName =
                              "bg-gray-700 border-gray-600 text-zinc-300";
                          }
                        } else {
                          stateClassName =
                            selectedOption === key
                              ? "bg-orange-600 border-orange-400 text-white"
                              : "bg-gray-700 border-gray-600 text-zinc-300 hover:bg-gray-600 hover:border-gray-500";
                        }
                        return (
                          <button
                            key={key}
                            onClick={() => handleOptionSelect(key)}
                            className={`${baseClassName} ${stateClassName}`}
                            disabled={
                              (isLawMode && selectedOption !== null) ||
                              (!isLawMode && score !== null)
                            }
                          >
                            <span className="font-medium mr-2">{key})</span>{" "}
                            {option}
                            {((isLawMode && selectedOption) ||
                              (!isLawMode && score !== null)) &&
                              isUserAnswer &&
                              !isCorrectAnswer && (
                                <span className="ml-2 text-red-300 font-medium text-[10px] sm:text-xs">
                                  (Wrong Answer)
                                </span>
                              )}
                            {((isLawMode && selectedOption) ||
                              (!isLawMode && score !== null)) &&
                              isCorrectAnswer && (
                                <span className="ml-2 text-emerald-300 font-medium text-[10px] sm:text-xs">
                                  (Correct Answer)
                                </span>
                              )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {((isLawMode && selectedOption) ||
                    (!isLawMode && score !== null)) &&
                    showExplanation && (
                      <div
                        className="absolute top-0 left-0 right-0 bottom-0 rounded-lg z-70 pointer-events-auto"
                        onClick={() => setShowExplanation(false)}
                      >
                        <div className="absolute top-0 left-0 right-0 bg-black/80 p-2 sm:p-3 rounded-lg flex flex-col h-full">
                          <p className="text-base sm:text-lg font-medium text-zinc-200 mb-2">
                            Explanation:
                          </p>
                          <div className="flex-1 overflow-y-auto">
                            <p className="text-[16px] sm:text-xl text-zinc-200 leading-relaxed">
                              {questions[currentQuestionIndex].explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
                <div className="fixed bottom-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-4 flex justify-between items-center shadow-lg z-50">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={
                      currentQuestionIndex === 0 &&
                      (isLawMode ? lawModeBatchStart === 0 : true)
                    }
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      currentQuestionIndex === 0 &&
                      (isLawMode ? lawModeBatchStart === 0 : true)
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 text-gray-50 hover:bg-purple-700"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Previous
                  </button>

                  <div className="relative mb-[-34px]">
                    <button
                      onClick={() => {
                        setPendingMode(isLawMode ? "LAW" : "WIS");
                        setPendingQuestionLimit(questionLimit || 25);
                        setShowModePopover(true);
                      }}
                      aria-label="Change mode"
                      className="px-8 py-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300 bg-gray-700 text-blue-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <svg
                        className="w-6 h-6"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M2 18h20L14 6h-4L2 18z" />
                      </svg>
                    </button>
                  </div>

                  {!isLawMode &&
                  (questions.length === questionLimit) && 
                  currentQuestionIndex === questionLimit - 1 ? (
                    <button
                      onClick={submitTest}
                      className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-emerald-500 text-gray-50 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Submit Test
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      disabled={
                        (isLawMode && (questions.length <= currentQuestionIndex + 1 || isBackgroundFetching)) ||
                        (!isLawMode && isBackgroundFetching && currentQuestionIndex === questions.length - 1)
                      }
                      className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                        (isLawMode && (questions.length <= currentQuestionIndex + 1 || isBackgroundFetching)) ||
                        (!isLawMode && isBackgroundFetching && currentQuestionIndex === questions.length - 1)
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-white text-black hover:bg-gray-200"
                      } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                    >
                      Next
                    </button>
                  )}
                </div>
              </>
            ) : testStarted && questions.length > 0 ? (
              <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
                <p className="text-base sm:text-lg text-red-200">
                  Error: Invalid question index. Please reset the test.
                </p>
                <button
                  onClick={resetTest}
                  className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                >
                  Reset Test
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {showModePopover && (
        <div
          className="fixed inset-0 bg-black/60 z-[9998]"
          onClick={() => setShowModePopover(false)}
        >
          <div
            className={`absolute bottom-0 left-0 w-full h-1/2 bg-gray-800 shadow-2xl rounded-t-2xl p-6 border-t border-gray-600 flex flex-col justify-center items-center transition-transform duration-300 ease-in-out ${
              showModePopover ? "translate-y-0" : "translate-y-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-blue-400 mb-6 text-center">
              CHOOSE YOUR MODE
            </h3>

            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setPendingMode("LAW")}
                className={`w-32 px-4 py-3 rounded-lg text-md font-semibold transition-colors duration-300 ${
                  pendingMode === "LAW"
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                }`}
              >
                LAW
              </button>
              <button
                onClick={() => setPendingMode("WIS")}
                className={`w-32 px-4 py-3 rounded-lg text-md font-semibold transition-colors duration-300 ${
                  pendingMode === "WIS"
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "bg-gray-600 text-gray-300 hover:bg-gray-500"
                }`}
              >
                WIS
              </button>
            </div>

            <div
              className={`transition-opacity duration-300 w-full max-w-sm ${
                pendingMode === "WIS" ? "opacity-100" : "opacity-50"
              }`}
            >
              <div className="flex justify-center gap-4 mb-6">
                {[25, 50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      if (pendingMode === "WIS") setPendingQuestionLimit(num);
                    }}
                    disabled={pendingMode !== "WIS"}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      pendingMode === "WIS" && pendingQuestionLimit === num
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-600 text-gray-300"
                    } ${
                      pendingMode !== "WIS"
                        ? "cursor-not-allowed"
                        : "hover:bg-gray-500"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-4 w-full max-w-sm">
              <button
                onClick={() => {
                  isTestStarted.current = false; 
                  startTest(
                    pendingMode,
                    pendingMode === "WIS" ? pendingQuestionLimit : undefined
                  );
                }}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors duration-300"
              >
                Start Test
              </button>

              {(isLawMode || (!isLawMode && score !== null)) && (
                <button
                  onClick={() => {
                    if (isLawMode) calculateLawScores();
                    setShowScorePopup(true);
                    setShowModePopover(false);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors duration-300"
                >
                  View Score
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showScorePopup && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-[9998] flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-400 mb-4">
              {isLawMode ? "Live Score" : "Test Results"}
            </h2>
            <div className="text-white space-y-2">
              <p>Total Questions: {scoreDetails.totalQuestions}</p>
              <p>Attempted: {scoreDetails.attempted}</p>
              <p>Correct: {scoreDetails.correct}</p>
              <p>Wrong: {scoreDetails.wrong}</p>
              <p>Unattempted: {scoreDetails.unattempted}</p>
              <p>Total Score: {scoreDetails.totalScore}</p>
              <p className="flex items-center">
                Percentage: {scoreDetails.percentage}%{" "}
                {scoreDetails.percentage >= 50 && (
                  <span className="ml-2 flex items-center text-green-400">
                    <svg
                      className="w-5 h-5 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Above prelims cutoff percentage
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowScorePopup(false);
                  if (!isLawMode) setIsScoreMinimized(true);
                }}
                className="bg-gray-600 text-gray-50 px-4 py-2 rounded-md hover:bg-gray-700 transition-transform transform hover:scale-105 duration-300"
              >
                {isLawMode ? "Close" : "Hide"}
              </button>
              {!isLawMode && (
                <button
                  onClick={resetTest}
                  className="bg-purple-600 text-gray-50 px-4 py-2 rounded-md hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                >
                  New Test
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-gray-800 shadow-2xl z-[9999] transition-all duration-300 ease-in-out"
        style={{ right: showModeSidebar ? "0" : "-256px" }}
      >
        <div className="p-4 h-full flex flex-col relative">
          {testStarted && (
            <div className="mb-4 z-10">
              <label
                className="block text-xs sm:text-sm font-semibold text-blue-300 mb-1"
                htmlFor="sidebar-filter-select"
              >
                Filter
              </label>
              <select
                id="sidebar-filter-select"
                value={filter}
                onChange={(e) => {
                  handleFilterChange(e.target.value);
                }}
                className={`w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isModeDisabled() ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isModeDisabled()}
              >
                <option value="all">All Questions</option>
                <option value="correct">Right Questions</option>
                <option value="wrong">Wrong Questions</option>
                <option value="unattempted">Unattempted Questions</option>
              </select>
            </div>
          )}
          {testStarted && (
            <div className="flex-1 overflow-y-auto">
              <h3
                className={`text-base sm:text-lg font-semibold text-white mb-2 p-2 rounded-lg ${
                  filter === "wrong" ? "bg-red-500" : "bg-gray-700"
                }`}
              >
                Question Progress
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {(() => {
                  let circleCount;
                  if (isLawMode) {
                    circleCount = lawModeBatchStart + currentQuestionIndex + 1;
                  } else {
                    circleCount = Math.min(
                      questionLimit || questions.length,
                      questions.length
                    );
                  }
                  const filteredIndices = Array.from({ length: circleCount })
                    .map((_, i) => i)
                    .filter(
                      (i) => filter === "all" || questionStatuses[i] === filter
                    );
                  return filteredIndices.map((actualIndex) => {
                    const status =
                      questionStatuses[actualIndex] || "unattempted";
                    const isCurrent =
                      actualIndex ===
                        (isLawMode
                          ? lawModeBatchStart + currentQuestionIndex
                          : currentQuestionIndex) && !showExplanation;
                    let colorClass = "";
                    if (isLawMode) {
                      colorClass =
                        status === "correct"
                          ? "bg-green-500"
                          : status === "wrong"
                          ? "bg-red-500"
                          : isCurrent
                          ? "bg-purple-500"
                          : "bg-white";
                    } else if (score !== null) {
                      colorClass =
                        status === "correct"
                          ? "bg-green-500"
                          : status === "wrong"
                          ? "bg-red-500"
                          : "bg-white";
                    } else {
                      colorClass =
                        actualIndex <= maxQuestionReached
                          ? userAnswers[actualIndex] !== null
                            ? "bg-blue-500"
                            : "bg-white"
                          : "bg-gray-500";
                    }
                    return (
                      <div
                        key={actualIndex}
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${
                          isCurrent ? "rounded-full" : "rounded-sm"
                        } ${colorClass} flex items-center justify-center text-gray-900 text-xs sm:text-sm font-semibold shadow-md transition-colors duration-300 cursor-pointer`}
                        onClick={() => {
                          if (isLawMode) {
                            const batchNumber = Math.floor(
                              actualIndex / LAW_MODE_TOTAL_COUNT
                            );
                            const newBatchStart =
                              batchNumber * LAW_MODE_TOTAL_COUNT;
                            const indexInBatch =
                              actualIndex % LAW_MODE_TOTAL_COUNT;
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
                  className="w-full mt-4 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-emerald-500 text-gray-50 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  Submit Test
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RameshSingh;