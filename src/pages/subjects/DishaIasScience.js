import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../App";

const DishaIasScience = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [testStarted, setTestStarted] = useState(false);
  const [showModePopup, setShowModePopup] = useState(true);
  const [showModeSidebar, setShowModeSidebar] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [isLawMode, setIsLawMode] = useState(true);
  const [isWisModeSelected, setIsWisModeSelected] = useState(false);
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
  const [reportMessage, setReportMessage] = useState(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [isUpbarOpen, setIsUpbarOpen] = useState(false);
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

  // Log filter changes
  useEffect(() => {
    console.log("filter state updated:", filter);
  }, [filter]);

  // Log questionStatuses changes for debugging
  useEffect(() => {
    console.log("questionStatuses updated:", questionStatuses);
  }, [questionStatuses]);

  // Ensure popup shows on mount
  useEffect(() => {
    console.log("DishaIasScience component mounted, showModePopup:", showModePopup);
    setShowModePopup(true);
  }, []);

  const getUserId = () => {
    if (user?.email) {
      const emailLower = user.email.toLowerCase();
      return emailLower.endsWith('@gmail.com')
        ? emailLower.split('@')[0]
        : emailLower;
    }

    const storedUserId = localStorage.getItem('trainWithMeUserId');
    if (storedUserId) {
      return storedUserId;
    }

    const newUserId = Math.random().toString(36).substring(7);
    localStorage.setItem('trainWithMeUserId', newUserId);
    return newUserId;
  };

  const userId = useRef(getUserId()).current;

  useEffect(() => {
    const questionBox = document.querySelector('.question-box');
    const content = document.querySelector('.question-content');
    const questionNumber = document.querySelector('.question-number');
    const chapterText = document.querySelector('.chapter-text');
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

  const API_URL = "https://trainwithme-backend.onrender.com";
  const LAW_MODE_BATCH_SIZE = 100;

 const fetchUserMCQs = async () => {
  setLoading(true);
  setLoadingMessage("Loading MCQs...");
  setError(null);

  try {
    console.log("Fetching MCQs with userId:", userId, "questionLimit:", questionLimit);
    if (!userId) {
      throw new Error("userId is undefined or empty");
    }
    const validRequestedCount = (typeof questionLimit === "number" && questionLimit > 0) ? questionLimit : 25;
    console.log("Using requestedCount:", validRequestedCount);

    const response = await fetch(`${API_URL}/user/get-book-mcqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, book: "Science", requestedCount: validRequestedCount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 404) {
        throw new Error(errorData.error || "No new MCQs available for this user.");
      }
      throw new Error(`Failed to fetch MCQs: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.mcqs || data.mcqs.length === 0) {
      throw new Error("No new MCQs available for this user.");
    }

    const transformedMCQs = data.mcqs
      .filter(mcq => {
        if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation) {
          console.warn("Invalid MCQ found and skipped:", mcq);
          return false;
        }
        return true;
      })
      .map(mcq => ({
        question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
        options: mcq.mcq.options,
        correctAnswer: mcq.mcq.correctAnswer,
        explanation: mcq.mcq.explanation,
        chapter: mcq.chapter,
        id: mcq._id
      }));

    if (transformedMCQs.length === 0) {
      throw new Error("No valid MCQs available after filtering.");
    }

    setQuestions(transformedMCQs);
    setUserAnswers(new Array(transformedMCQs.length).fill(null));
    setQuestionStatuses(new Array(transformedMCQs.length).fill("unattempted"));
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption(null);
    setShowExplanation(false);
    setReportMessage(null);
    setShowScorePopup(false);
    setIsUpbarOpen(false);
    setIsScoreMinimized(false);
    setTestStarted(true);
    setShowModePopup(false);
    console.log(`fetchUserMCQs: Loaded ${transformedMCQs.length} MCQs for user ${userId}`);
  } catch (err) {
    let errorMessage = "Failed to load MCQs. Please try again later.";
    if (err.message.includes("Failed to fetch")) {
      errorMessage = "Unable to connect to the server. Please ensure the backend server is running and try again.";
    }
    setError(errorMessage);
    setTestStarted(false);
    setShowModePopup(true);
    console.error("fetchUserMCQs error:", err.message);
  } finally {
    setLoading(false);
  }
};

 const fetchUserMCQsForLawMode = async (batchStart = 0) => {
  setLoading(true);
  setLoadingMessage("Loading MCQs...");
  setError(null);

  try {
    console.log("Fetching MCQs for LAW mode with userId:", userId, "batchStart:", batchStart);
    if (!userId) {
      throw new Error("userId is undefined or empty");
    }

    const response = await fetch(`${API_URL}/user/get-book-mcqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, book: "Science", requestedCount: LAW_MODE_BATCH_SIZE }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 404) {
        throw new Error(errorData.error || "No new MCQs available for this user.");
      }
      throw new Error(`Failed to fetch MCQs: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.mcqs || data.mcqs.length === 0) {
      throw new Error("No new MCQs available for this user.");
    }

    const transformedMCQs = data.mcqs
      .filter(mcq => {
        if (!mcq.mcq || !mcq.mcq.question || !mcq.mcq.options || !mcq.mcq.correctAnswer || !mcq.mcq.explanation) {
          console.warn("Invalid MCQ found and skipped:", mcq);
          return false;
        }
        return true;
      })
      .map(mcq => ({
        question: Array.isArray(mcq.mcq.question) ? mcq.mcq.question : mcq.mcq.question.split("\n").filter(line => line.trim()),
        options: mcq.mcq.options,
        correctAnswer: mcq.mcq.correctAnswer,
        explanation: mcq.mcq.explanation,
        chapter: mcq.chapter,
        id: mcq._id
      }));

    if (transformedMCQs.length === 0) {
      throw new Error("No valid MCQs available after filtering.");
    }

    setQuestions(transformedMCQs);
    setCurrentQuestionIndex(0);
    setLawModeBatchStart(batchStart);
    setSelectedOption(userAnswers[batchStart] || null);
    setShowExplanation(false);
    setReportMessage(null);
    setShowScorePopup(false);
    setIsUpbarOpen(false);
    setIsScoreMinimized(false);
    setTestStarted(true);
    setShowModePopup(false);
    console.log(`fetchUserMCQsForLawMode: Loaded ${transformedMCQs.length} MCQs starting at position ${batchStart} for user ${userId}`);
  } catch (err) {
    let errorMessage = "Failed to load MCQs. Please try again later.";
    if (err.message.includes("Failed to fetch")) {
      errorMessage = "Unable to connect to the server. Please ensure the backend server is running and try again.";
    }
    setError(errorMessage);
    setTestStarted(false);
    setShowModePopup(true);
    console.error("fetchUserMCQsForLawMode error:", err.message);
  } finally {
    setLoading(false);
  }
};

  const startTest = (mode, questionCount) => {
    console.log("startTest called with mode:", mode, "questionCount:", questionCount);
    
    setLoading(true);
    setLoadingMessage("Loading...");
    setError(null);
    setShowModePopup(false);
    setShowModeSelection(false);
    setShowModeSidebar(false);

    setQuestions([]);
    setUserAnswers([]);
    setQuestionStatuses([]);
    setCurrentQuestionIndex(0);
    setScore(null);
    setSelectedOption(null);
    setShowExplanation(false);
    setReportMessage(null);
    setShowScorePopup(false);
    setIsUpbarOpen(false);
    setIsScoreMinimized(false);
    setFilter("all");
    setIsWisModeSelected(false);
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
    setQuestionLimit(mode === "WIS" ? questionCount : undefined);

    if (mode === "WIS") {
      fetchUserMCQs();
    } else {
      setLawModeBatchStart(0);
      fetchUserMCQsForLawMode(0);
    }
  };

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

    const currentPosition = isLawMode ? (lawModeBatchStart + currentQuestionIndex) : currentQuestionIndex;
    newAnswers[currentPosition] = option;
    newStatuses[currentPosition] = option === questions[currentQuestionIndex].correctAnswer ? "correct" : "wrong";

    setUserAnswers(newAnswers);
    setQuestionStatuses(newStatuses);
    setSelectedOption(option);
    setShowExplanation(false);

    if (isLawMode) {
      calculateLawScores();

      const seenMcqIds = [questions[currentQuestionIndex].id];
      fetch(`${API_URL}/user/mark-mcqs-seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mcqIds: seenMcqIds }),
      })
        .then(res => {
          if (!res.ok) {
            console.error("Failed to mark MCQ as seen:", res.status);
          } else {
            console.log("MCQ marked as seen for user:", userId);
          }
        })
        .catch(err => console.error("Error marking MCQ as seen:", err));
    }
  };

  const toggleExplanation = () => {
    setShowExplanation(!showExplanation);
  };

  const handleNextQuestion = () => {
    if (isLawMode) {
      const maxIndex = questions.length - 1;
      if (currentQuestionIndex >= maxIndex) {
        const nextBatchStart = lawModeBatchStart + LAW_MODE_BATCH_SIZE;
        fetchUserMCQsForLawMode(nextBatchStart);
      } else {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        const currentPosition = lawModeBatchStart + nextIndex;
        setSelectedOption(userAnswers[currentPosition] || null);
        setShowExplanation(false);
        setReportMessage(null);
        calculateLawScores();
      }
    } else {
      const maxIndex = Math.min((questionLimit ? questionLimit : questions.length), questions.length) - 1;
      if (currentQuestionIndex >= maxIndex) {
        return;
      }
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedOption(userAnswers[nextIndex]);
      setShowExplanation(false);
      setReportMessage(null);
      if (nextIndex > maxQuestionReached) {
        setMaxQuestionReached(nextIndex);
      }
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
        setReportMessage(null);
        calculateLawScores();
      } else if (lawModeBatchStart > 0) {
        const prevBatchStart = lawModeBatchStart - LAW_MODE_BATCH_SIZE;
        fetchUserMCQsForLawMode(prevBatchStart);
      }
    } else {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
        setSelectedOption(userAnswers[currentQuestionIndex - 1]);
        setShowExplanation(false);
        setReportMessage(null);
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
    const totalScore = (correctCount * 1) + (wrongCount * -0.33) + (unattempted * 0);
    const percentage = (totalScore / totalQuestionsToScore) * 100;

    setScore(totalScore);
    setCurrentQuestionIndex(0);
    setSelectedOption(newAnswers[0]);
    setShowExplanation(false);
    setReportMessage(null);
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

    const seenMcqIds = questions.slice(0, totalQuestionsToScore).map(q => q.id);
    fetch(`${API_URL}/user/mark-mcqs-seen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mcqIds: seenMcqIds }),
    })
      .then(res => {
        if (!res.ok) {
          console.error("Failed to mark MCQs as seen:", res.status);
        } else {
          console.log("MCQs marked as seen for user:", userId);
        }
      })
      .catch(err => console.error("Error marking MCQs as seen:", err));
  };

  const reportMCQ = async () => {
    if (!questions[currentQuestionIndex]) {
      setReportMessage("Error: No MCQ to report.");
      return;
    }

    const mcqToReport = {
      question: questions[currentQuestionIndex].question,
      options: questions[currentQuestionIndex].options,
      correctAnswer: questions[currentQuestionIndex].correctAnswer,
      explanation: questions[currentQuestionIndex].explanation,
      chapter: questions[currentQuestionIndex].chapter
    };

    try {
      const response = await fetch(`${API_URL}/user/report-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          mcqId: questions[currentQuestionIndex].id,
          mcq: mcqToReport
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to report MCQ.");
      }

      setReportMessage("MCQ reported successfully!");
      setTimeout(() => setReportMessage(null), 3000);
    } catch (err) {
      setReportMessage(err.message || "Failed to report MCQ.");
      setTimeout(() => setReportMessage(null), 3000);
      console.error("reportMCQ error:", err.message);
    }
  };

const resetTest = () => {
  setTestStarted(false); // Add this line to explicitly set testStarted to false
  setShowModePopup(true);
  setShowModeSidebar(false);
  setShowModeSelection(false);
  setQuestions([]);
  setUserAnswers([]);
  setQuestionStatuses([]);
  setCurrentQuestionIndex(0);
  setScore(null);
  setSelectedOption(null);
  setError(null);
  setShowExplanation(false);
  setReportMessage(null);
  setShowScorePopup(false);
  setIsUpbarOpen(false);
  setIsScoreMinimized(false);
  setFilter("all");
  setIsWisModeSelected(false);
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
};

  const handleFilterChange = (newFilter) => {
    console.log("handleFilterChange called with newFilter:", newFilter);
    console.log("testStarted:", testStarted);
    console.log("filter before update:", filter);
    console.log("questionStatuses before filtering:", questionStatuses);

    let filteredIndices;
    if (isLawMode) {
      filteredIndices = Array.from({ length: lawModeBatchStart + currentQuestionIndex + 1 })
        .map((_, i) => i)
        .filter(i => newFilter === "all" || questionStatuses[i] === newFilter);
    } else {
      filteredIndices = Array.from({ length: questionLimit || questions.length })
        .map((_, i) => i)
        .filter(i => newFilter === "all" || questionStatuses[i] === newFilter);
    }

    console.log(`Filtered indices for ${newFilter}:`, filteredIndices);
    setFilter(newFilter);
    console.log("filter after update:", newFilter);
    if (newFilter === "wrong") {
      const firstWrongIndex = questionStatuses.findIndex(status => status === "wrong");
      console.log("firstWrongIndex:", firstWrongIndex);
      if (firstWrongIndex !== -1) {
        if (isLawMode) {
          const batchNumber = Math.floor(firstWrongIndex / LAW_MODE_BATCH_SIZE);
          const newBatchStart = batchNumber * LAW_MODE_BATCH_SIZE;
          const indexInBatch = firstWrongIndex % LAW_MODE_BATCH_SIZE;
          if (newBatchStart !== lawModeBatchStart) {
            fetchUserMCQsForLawMode(newBatchStart);
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
      questionLines.some((line) => line.includes("    ")) &&
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
      (questionLines.some((line) => line.includes("Which of the statements given above is/are correct?")) ||
       questionLines.some((line) => line.includes("How many of the above statements are correct?")))
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
      questionLines.some((line) => line.includes("Which of the pairs are correctly matched?"))
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
      console.error("renderQuestion: Invalid questionLines or mcq", { questionLines, mcq });
      return <p className="text-red-200">Error: Question content missing</p>;
    }

    console.log("renderQuestion: Processing questionLines:", questionLines);

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
                  <th key={index} className="px-2 sm:px-4 py-1 sm:py-2 border-b border-gray-600">
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
              <p
                key={index}
                className={`mb-1 ${isIntro || isClosing ? "text-cosmic-dark" : "text-ivory"}`}
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
      const closingLineIndex = questionLines.findIndex(line => line.includes("Select the correct order")) !== -1
        ? questionLines.findIndex(line => line.includes("Select the correct order"))
        : questionLines.length;
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
      const closingLineIndex = questionLines.findIndex(line => line.includes("Which of the pairs are correctly matched?"));
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

  const lastAttemptedIndex = userAnswers.slice().reverse().findIndex(ans => ans !== null);
  const lastActiveIndex = lastAttemptedIndex === -1 ? -1 : userAnswers.length - 1 - lastAttemptedIndex;

  const isModeDisabled = () => {
    return false;
  };

  const handleGoBack = () => {
    if (testStarted) {
      console.log("Exiting test mode");
      resetTest();
    } else {
      console.log("Navigating back to previous page");
      navigate(-1);
    }
  };

  useEffect(() => {
    if (isLawMode && testStarted) {
      calculateLawScores();
    }
  }, [questionStatuses, maxQuestionReached, isLawMode, testStarted]);

  const [pendingMode, setPendingMode] = useState(isLawMode ? "LAW" : "WIS");
  const [pendingQuestionLimit, setPendingQuestionLimit] = useState(questionLimit);

  return (
    <div className="h-screen bg-gray-900 text-white font-poppins overflow-hidden overscroll-none">
      <nav className="fixed top-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-3 flex justify-between items-center shadow-lg z-60 h-16">
        <div className="flex items-center gap-0.5 max-w-[40%]">
          <button onClick={handleGoBack} className="text-zinc-300 hover:text-blue-400 transition-colors duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight text-blue-400">
            TrainWithMe
          </h1>
        </div>
        <div className="flex items-center justify-center flex-1">
          {testStarted && (
            <button
              onClick={reportMCQ}
              className="bg-red-600 text-gray-50 px-2 py-1 rounded-md hover:bg-red-700 transition-transform transform hover:scale-105 duration-300 text-xs sm:text-sm"
            >
              Report
            </button>
          )}
        </div>
        <div className="flex items-center justify-end gap-1">
          {testStarted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("Toggle button clicked, current showModeSidebar:", showModeSidebar);
                setShowModeSidebar(!showModeSidebar);
              }}
              className="bg-blue-600 text-white p-1 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300"
            >
              <svg
                className={`w-6 h-6 transform ${showModeSidebar ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      {reportMessage && (
        <div className="fixed top-16 left-0 right-0 z-40 p-4 bg-gray-800 border border-gray-700 rounded-lg mx-auto max-w-2xl">
          <p className={`text-base sm:text-lg ${reportMessage.includes("successfully") ? "text-green-200" : "text-red-200"}`}>
            {reportMessage}
          </p>
        </div>
      )}

      {showModePopup && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-400 mb-6 drop-shadow-lg">Choose Your Mode</h2>
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={() => {
                  setPendingMode("LAW");
                  setIsWisModeSelected(false);
                }}
                className={`px-3 py-2 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                  pendingMode === "LAW" ? "bg-purple-600 text-gray-50 shadow-lg" : "bg-gray-600 text-gray-300"
                }`}
              >
                LAW (Learn Along the Way)
              </button>
              <button
                onClick={() => {
                  setPendingMode("WIS");
                  setIsWisModeSelected(true);
                }}
                className={`px-3 py-2 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                  pendingMode === "WIS" ? "bg-emerald-500 text-gray-50 shadow-lg" : "bg-gray-600 text-gray-300"
                }`}
              >
                WIS (Where I Stand)
              </button>
            </div>
            {pendingMode === "WIS" && (
              <>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Number of Questions</h3>
                <div className="flex flex-col gap-2 mb-4">
                  {[25, 50, 100].map(num => (
                    <button
                      key={num}
                      onClick={() => {
                        setPendingQuestionLimit(num);
                        if (pendingMode === "WIS") {
                          setQuestionLimit(num);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                        pendingQuestionLimit === num ? "bg-blue-600 text-gray-50 shadow-lg" : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => startTest(pendingMode, pendingQuestionLimit)}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-500 transform hover:scale-105 text-base sm:text-lg font-bold"
            >
              Start Test
            </button>
          </div>
        </div>
      )}

      {console.log("Horizontal strip rendering check - testStarted:", testStarted, "filter:", filter)}
      {testStarted && filter !== "all" && (
        <div
          className="fixed top-[4rem] left-0 w-full bg-gray-800 z-40 p-2 overflow-x-auto overflow-y-hidden flex space-x-2 items-center border-2 border-red-500"
          style={{ 
            height: '3rem',
            opacity: 1, 
            visibility: 'visible', 
            position: 'fixed' 
          }}
        >
          {(() => {
            let filteredIndices;
            if (isLawMode) {
              filteredIndices = Array.from({ length: lawModeBatchStart + currentQuestionIndex + 1 })
                .map((_, i) => i)
                .filter(i => filter === "all" || questionStatuses[i] === filter);
            } else {
              filteredIndices = Array.from({
                length: questionLimit || questions.length
              })
                .map((_, i) => i)
                .filter(i => filter === "all" || questionStatuses[i] === filter);
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
              const isCurrent = actualIndex === (isLawMode ? (lawModeBatchStart + currentQuestionIndex) : currentQuestionIndex) && !showExplanation;
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
                      const batchNumber = Math.floor(actualIndex / LAW_MODE_BATCH_SIZE);
                      const newBatchStart = batchNumber * LAW_MODE_BATCH_SIZE;
                      const indexInBatch = actualIndex % LAW_MODE_BATCH_SIZE;
                      if (newBatchStart !== lawModeBatchStart) {
                        fetchUserMCQsForLawMode(newBatchStart);
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
          <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
            <p className="text-lg sm:text-xl text-gray-400">Select a mode to start the test</p>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex flex-col justify-center items-center py-12">
                <div className="flex items-center justify-center mb-4">
                  <span className="inline-block w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-blue-300 tracking-wide">
                  {loadingMessage || "Loading..."}
                </p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-950 border border-red-700 rounded-lg mx-auto max-w-2xl">
                <p className="text-base sm:text-lg text-red-200">{error}</p>
                <button
                  onClick={resetTest}
                  className="mt-4 bg-purple-600 text-gray-50 px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
                >
                  Try Again
                </button>
              </div>
            ) : questions.length > 0 && questions[currentQuestionIndex] ? (
              <>
                <div 
                  className="fixed left-0 w-full z-60 px-3 sm:px-4 lg:px-6 question-box bg-gray-900"
                  style={{
                    top: '4rem',
                    height: 'calc((100dvh - 8rem) * 0.5)',
                  }}
                  onClick={() => ((isLawMode && selectedOption) || (!isLawMode && score !== null)) && setShowExplanation(!showExplanation)}
                >
                  <p className="text-sm sm:text-base text-white mb-1 question-number">
                    Question {isLawMode ? (lawModeBatchStart + currentQuestionIndex + 1) : (currentQuestionIndex + 1)}
                  </p>
                  {questions[currentQuestionIndex].chapter && (
                    <p className="text-xs sm:text-sm text-white/80 mb-1 chapter-text">
                      Chapter: {questions[currentQuestionIndex].chapter === "entire-book" ? "Entire Book" : questions[currentQuestionIndex].chapter}
                    </p>
                  )}
                  <div className="h-full font-medium text-white bg-gradient-to-br from-gray-800 to-blue-900 p-2 rounded-lg shadow-inner">
                    <div className="question-content leading-tight" style={{ fontSize: `${fontSize}px` }}>
                      {renderQuestion(questions[currentQuestionIndex].question, questions[currentQuestionIndex])}
                    </div>
                  </div>
                </div>

                <div 
                  className="absolute left-0 w-full bg-gray-900 z-20 px-2 sm:px-8 lg:px-6"
                  style={{ 
                    top: 'calc(4rem + (100dvh - 8rem) * 0.5)',
                    bottom: '4rem',
                  }}
                >
                  <div className="bg-gray-800 rounded-lg p-2 sm:p-2 h-full overflow-y-auto">
                    <div className="flex flex-col gap-0.5">
                      {Object.entries(questions[currentQuestionIndex].options).map(([key, option]) => {
                        const isUserAnswer = userAnswers[isLawMode ? (lawModeBatchStart + currentQuestionIndex) : currentQuestionIndex] === key;
                        const isCorrectAnswer = questions[currentQuestionIndex].correctAnswer === key;

                        let baseClassName = `
                          w-full text-left p-5 sm:p-5 rounded-md border transition-colors duration-300 
                          text-sm sm:text-lg
                          flex items-center justify-start
                          min-h-[2.5rem] sm:min-h-[3rem]
                          overflow-y-auto
                          focus:outline-none focus:ring-2 focus:ring-orange-400
                        `;
                        let stateClassName = "";
                        if ((isLawMode && selectedOption) || (!isLawMode && score !== null)) {
                          if (isUserAnswer && !isCorrectAnswer) {
                            stateClassName = "bg-red-600 border-red-500 text-white";
                          } else if (isCorrectAnswer) {
                            stateClassName = "bg-emerald-600 border-emerald-500 text-white";
                          } else {
                            stateClassName = "bg-gray-700 border-gray-600 text-zinc-300";
                          }
                        } else {
                          stateClassName = selectedOption === key
                            ? "bg-orange-600 border-orange-400 text-white"
                            : "bg-gray-700 border-gray-600 text-zinc-300 hover:bg-gray-600 hover:border-gray-500";
                        }

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
                      <div className="absolute top-0 left-0 right-0 bg-black/80 p-2 sm:p-3 rounded-lg flex flex-col h-full">
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

                {isUpbarOpen && isLawMode && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full relative">
                      <button
                        onClick={() => setIsUpbarOpen(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold"
                        aria-label="Close"
                      >
                        ×
                      </button>
                      <h2 className="text-xl sm:text-2xl font-bold text-blue-400 mb-4">Score</h2>
                      <div className="text-white space-y-2">
                        <p>Total Questions: {scoreDetails.totalQuestions}</p>
                        <p>Number of Questions Attempted: {scoreDetails.attempted}</p>
                        <p>Number of Correct Answers: {scoreDetails.correct}</p>
                        <p>Number of Wrong Answers: {scoreDetails.wrong}</p>
                        <p>Number of Unattempted Questions: {scoreDetails.unattempted}</p>
                        <p>Total Score: {scoreDetails.totalScore}</p>
                        <p className="flex items-center">
                          Percentage: {scoreDetails.percentage}%
                          {scoreDetails.percentage >= 50 ? (
                            <span className="ml-2 flex items-center text-green-400">
                              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Above prelims cutoff percentage
                            </span>
                          ) : (
                            <span className="ml-2 flex items-center text-red-400">
                              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-3.707-9.293a1 1 0 011.414-1.414L11 10.586l1.293-1.293a1 1 0 111.414 1.414l-2 2a1 1 0 01-1.414 0l-4-4z" clipRule="evenodd" />
                              </svg>
                              Below prelims cutoff percentage
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  className="fixed bottom-0 left-0 w-full bg-[#1F2526]/80 backdrop-blur-md p-4 flex justify-between items-center shadow-lg z-50"
                >
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0 && (isLawMode ? lawModeBatchStart === 0 : true)}
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                      (currentQuestionIndex === 0 && (isLawMode ? lawModeBatchStart === 0 : true))
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-purple-600 text-gray-50 hover:bg-purple-700"
                    } focus:outline-none focus:ring-2 focus:ring-blue-400`}
                  >
                    Previous
                  </button>
                  {isLawMode && (
                    <button
                      onClick={() => setIsUpbarOpen(!isUpbarOpen)}
                      className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-blue-600 text-gray-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Score
                    </button>
                  )}
                  {!isLawMode && score !== null && (
                    <button
                      onClick={() => {
                        setShowScorePopup(true);
                        setIsScoreMinimized(false);
                      }}
                      className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 bg-blue-600 text-gray-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      Score
                    </button>
                  )}
                  {!isLawMode && currentQuestionIndex === (questionLimit ? questionLimit - 1 : questions.length - 1) ? (
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
                        !isLawMode && (
                          currentQuestionIndex >= Math.min(questionLimit ? questionLimit - 1 : questions.length - 1, questions.length - 1) ||
                          (currentQuestionIndex === questions.length - 1 && score !== null)
                        )
                      }
                      className={`px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base rounded-full shadow-lg transition-transform transform hover:scale-105 duration-300 ${
                        !isLawMode && (
                          currentQuestionIndex >= Math.min(questionLimit ? questionLimit - 1 : questions.length - 1, questions.length - 1) ||
                          (currentQuestionIndex === questions.length - 1 && score !== null)
                        )
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

      {showScorePopup && !isLawMode && (
        <div className="fixed top-16 left-0 right-0 bottom-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-400 mb-4">Test Results</h2>
            <div className="text-white space-y-2">
              <p>Total Number of Questions: {scoreDetails.totalQuestions}</p>
              <p>Number of Questions Attempted: {scoreDetails.attempted}</p>
              <p>Number of Correct Answers: {scoreDetails.correct}</p>
              <p>Number of Wrong Answers: {scoreDetails.wrong}</p>
              <p>Number of Unattempted Questions: {scoreDetails.unattempted}</p>
              <p>Total Score: {scoreDetails.totalScore}</p>
              <p className="flex items-center">
                Percentage: {scoreDetails.percentage}% 
                {scoreDetails.percentage >= 50 && (
                  <span className="ml-2 flex items-center text-green-400">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                  setIsScoreMinimized(true);
                }}
                className="bg-gray-600 text-gray-50 px-4 py-2 rounded-md hover:bg-gray-700 transition-transform transform hover:scale-105 duration-300"
              >
                Hide
              </button>
              <button
                onClick={resetTest}
                className="bg-purple-600 text-gray-50 px-4 py-2 rounded-md hover:bg-purple-700 transition-transform transform hover:scale-105 duration-300"
              >
                New Test
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-gray-800 shadow-2xl z-[9999] transition-all duration-300 ease-in-out"
        style={{ right: showModeSidebar ? "0" : "-256px" }}
        onTransitionEnd={() => console.log("Sidebar transition ended, showModeSidebar:", showModeSidebar)}
      >
        <div className="p-4 h-full flex flex-col relative">
          {isScoreMinimized && isLawMode && (
            <button
              onClick={() => {
                setIsScoreMinimized(false);
                setShowScorePopup(true);
              }}
              className="bg-blue-600 text-gray-50 px-3 py-2 rounded-md hover:bg-blue-700 transition-transform transform hover:scale-105 duration-300 text-sm sm:text-base mb-4"
            >
              Score
            </button>
          )}
          <div
            onClick={() => setShowModeSelection(!showModeSelection)}
            className="bg-gray-700 rounded-lg p-3 mb-4 cursor-pointer hover:bg-gray-600 transition-colors duration-300"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-semibold text-blue-400">
                Mode & Questions
              </h2>
              <svg
                className={`w-5 h-5 transform ${showModeSelection ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {showModeSelection && (
            <div className="mb-4">
              <div className="flex flex-col gap-2 mb-4">
                <button
                  onClick={() => {
                    setPendingMode("LAW");
                    setIsWisModeSelected(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    pendingMode === "LAW" ? "bg-purple-600 text-gray-50 shadow-lg" : "bg-gray-600 text-gray-300"
                  }`}
                >
                  LAW (Learn Along the Way)
                </button>
                <button
                  onClick={() => {
                    setPendingMode("WIS");
                    setIsWisModeSelected(true);
                  }}
                  className={`px-3 py-2 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    pendingMode === "WIS" ? "bg-emerald-500 text-gray-50 shadow-lg" : "bg-gray-600 text-gray-300"
                  }`}
                >
                  WIS (Where I Stand)
                </button>
              </div>
              {pendingMode === "WIS" && (
                <>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Number of Questions</h3>
                  <div className="flex flex-col gap-2 mb-4">
                    {[25, 50, 100].map(num => (
                      <button
                        key={num}
                        onClick={() => {
                          setPendingQuestionLimit(num);
                          if (pendingMode === "WIS") {
                            setQuestionLimit(num);
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                          pendingQuestionLimit === num ? "bg-blue-600 text-gray-50 shadow-lg" : "bg-gray-600 text-gray-300"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                onClick={() => startTest(pendingMode, pendingQuestionLimit)}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-500 transform hover:scale-105 text-base sm:text-lg font-bold"
              >
                Start Test
              </button>
            </div>
          )}

          {testStarted && (
            <div className="mb-4 z-10">
              <label className="block text-xs sm:text-sm font-semibold text-blue-300 mb-1" htmlFor="sidebar-filter-select">
                Filter
              </label>
              <select
                id="sidebar-filter-select"
                value={filter}
                onChange={(e) => {
                  console.log("Filter dropdown changed, new value:", e.target.value);
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
              <h3 className={`text-base sm:text-lg font-semibold text-white mb-2 p-2 rounded-lg ${filter === "wrong" ? "bg-red-500" : "bg-gray-700"}`}>
                Question Progress
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {(() => {
                  let circleCount;
                  if (isLawMode) {
                    circleCount = lawModeBatchStart + currentQuestionIndex + 1;
                  } else {
                    let effectiveLawMode = testStarted ? isLawMode : pendingMode === "LAW";
                    let effectiveQuestionLimit = testStarted ? questionLimit : pendingQuestionLimit;
                    circleCount = effectiveLawMode
                      ? (testStarted ? Math.min(maxQuestionReached + 1, questions.length) : 1)
                      : Math.min(effectiveQuestionLimit || questions.length, questions.length);
                  }

                  const filteredIndices = Array.from({ length: circleCount })
                    .map((_, i) => i)
                    .filter(i => filter === "all" || questionStatuses[i] === filter);

                  return filteredIndices.map((actualIndex) => {
                    const status = questionStatuses[actualIndex] || "unattempted";
                    const isCurrent = actualIndex === (isLawMode ? (lawModeBatchStart + currentQuestionIndex) : currentQuestionIndex) && !showExplanation;

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
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${colorClass} flex items-center justify-center text-gray-900 text-sm sm:text-base font-semibold shadow-md transition-colors duration-300 cursor-pointer`}
                        onClick={() => {
                          if (isLawMode) {
                            const batchNumber = Math.floor(actualIndex / LAW_MODE_BATCH_SIZE);
                            const newBatchStart = batchNumber * LAW_MODE_BATCH_SIZE;
                            const indexInBatch = actualIndex % LAW_MODE_BATCH_SIZE;
                            if (newBatchStart !== lawModeBatchStart) {
                              fetchUserMCQsForLawMode(newBatchStart);
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

export default DishaIasScience;