import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import httpClient from "../../api/httpClient";

function formatDuration(sec) {
  if (!sec && sec !== 0) return "--:--";
  const safe = Math.max(0, sec);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function ExamMeta({ overview, lastResult }) {
  if (!overview) return null;
  const attemptsText =
    overview.attemptsUsed != null && overview.maxAttempts != null
      ? `${overview.attemptsUsed}/${overview.maxAttempts}`
      : "--";

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-stone-900">{overview.title || "Bài kiểm tra"}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="p-3 rounded-xl border border-stone-200 bg-white">
          <p className="text-stone-500">Thời lượng</p>
          <p className="text-stone-900 text-lg font-semibold">
            {Math.floor((overview.timeLimitSec || 0) / 60)} phút
          </p>
        </div>
        <div className="p-3 rounded-xl border border-stone-200 bg-white">
          <p className="text-stone-500">Số câu hỏi</p>
          <p className="text-stone-900 text-lg font-semibold">{overview.questionCount ?? "--"}</p>
        </div>
        <div className="p-3 rounded-xl border border-stone-200 bg-white">
          <p className="text-stone-500">Lượt làm</p>
          <p className="text-stone-900 text-lg font-semibold">{attemptsText}</p>
        </div>
        <div className="p-3 rounded-xl border border-stone-200 bg-white">
          <p className="text-stone-500">Điểm đạt</p>
          <p className="text-stone-900 text-lg font-semibold">{overview.passingScore ?? 0}%</p>
        </div>
      </div>
      {lastResult && (
        <div
          className={`p-4 rounded-2xl text-sm ${
            lastResult.passed
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <p>
            Lần làm gần nhất: <strong>{Math.round(lastResult.scorePercent ?? 0)}%</strong>{" "}
            {lastResult.passed ? "(Đạt)" : "(Chưa đạt)"}
          </p>
          {typeof lastResult.attemptsRemaining === "number" && (
            <p className="mt-1">Lượt còn lại: {lastResult.attemptsRemaining}</p>
          )}
          {lastResult.message && <p className="mt-1">{lastResult.message}</p>}
          {lastResult.locked && (
            <p className="mt-1 text-red-600">Khóa học đã bị khóa. Vui lòng đăng ký lại.</p>
          )}
        </div>
      )}
      {overview.blockers?.length > 0 && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
          {overview.blockers.map((b) => (
            <p key={b}>• {b}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionNav({ questions, currentId, onSelect }) {
  if (!questions?.length) return null;
  return (
    <div className="grid grid-cols-8 gap-2 text-xs">
      {questions.map((q, idx) => {
        const answered = Boolean(q.selectedOptionId);
        const marked = Boolean(q.markedForReview);
        const active = q.id === currentId;
        return (
          <button
            key={q.id}
            onClick={() => onSelect(q.id)}
            className={`h-10 rounded-md border text-center ${
              active ? "border-primary-500 text-primary-700" : "border-stone-200 text-stone-600"
            } ${answered ? "bg-primary-50" : "bg-white"}`}
          >
            {idx + 1}
            {marked && <span className="block text-[10px] text-amber-600">Review</span>}
          </button>
        );
      })}
    </div>
  );
}

function QuestionCard({ question, onSelectOption, onToggleFlag }) {
  if (!question) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">Câu hỏi</p>
          <div
            className="text-lg text-stone-900 font-medium"
            dangerouslySetInnerHTML={{ __html: question.text || "" }}
          />
        </div>
        <button
          onClick={() => onToggleFlag(question)}
          className={`text-xs px-2 py-1 rounded-full border ${
            question.markedForReview ? "border-amber-400 text-amber-600" : "border-stone-200 text-stone-500"
          }`}
        >
          {question.markedForReview ? "Bỏ đánh dấu" : "Đánh dấu"}
        </button>
      </div>
      <div className="space-y-2">
        {question.options?.map((opt) => {
          const selected = question.selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSelectOption(question, opt.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border ${
                selected ? "border-primary-500 bg-primary-50 text-primary-700" : "border-stone-200 bg-white"
              }`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExamInner() {
  const { courseId, examId } = useParams();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState(null);

  const fetchOverview = useCallback(async () => {
    if (!courseId || !examId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await httpClient.get(`/api/student/exams/courses/${courseId}/exams/${examId}`);
      setOverview(data);
      if (data.activeAttemptId) {
        const res = await httpClient.get(`/api/student/exams/attempts/${data.activeAttemptId}`);
        setAttempt(res.data);
        setCurrentQuestionId(res.data.questions?.[0]?.id || null);
        setCountdown(res.data.countdownSec || 0);
      } else {
        setAttempt(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải thông tin bài kiểm tra");
    } finally {
      setLoading(false);
    }
  }, [courseId, examId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!attempt) return undefined;
    setCountdown(attempt.countdownSec || 0);
    const interval = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  const startAttempt = async () => {
    if (!overview) return;
    try {
      setLoading(true);
      const body = overview.activeAttemptId ? { resumeAttemptId: overview.activeAttemptId } : {};
      const { data } = await httpClient.post(
        `/api/student/exams/courses/${courseId}/exams/${examId}/attempts`,
        body,
      );
      setAttempt(data);
      setCurrentQuestionId(data.questions?.[0]?.id || null);
      setCountdown(data.countdownSec || 0);
      setResult(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể bắt đầu bài kiểm tra");
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = useMemo(
    () => attempt?.questions?.find((q) => q.id === currentQuestionId) || null,
    [attempt, currentQuestionId],
  );
  const currentIndex = useMemo(() => {
    if (!attempt?.questions?.length || !currentQuestionId) return 0;
    const idx = attempt.questions.findIndex((q) => q.id === currentQuestionId);
    return idx >= 0 ? idx : 0;
  }, [attempt, currentQuestionId]);

  const updateQuestionState = (questionId, updater) => {
    setAttempt((prev) => {
      if (!prev) return prev;
      const updated = prev.questions?.map((q) => {
        if (q.id !== questionId) return q;
        return { ...q, ...updater(q) };
      });
      return { ...prev, questions: updated };
    });
  };

  const saveAnswer = async (payload) => {
    setSaving(true);
    try {
      await httpClient.patch(`/api/student/exams/attempts/${attempt.attemptId}/answers`, payload);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOption = (question, optionId) => {
    updateQuestionState(question.id, () => ({ selectedOptionId: optionId }));
    saveAnswer({
      questionId: question.id,
      selectedOptionId: optionId,
      markedForReview: question.markedForReview,
      lastSeenQuestionId: question.id,
    });
  };

  const handleToggleFlag = (question) => {
    const next = !question.markedForReview;
    updateQuestionState(question.id, () => ({ markedForReview: next }));
    saveAnswer({
      questionId: question.id,
      selectedOptionId: question.selectedOptionId,
      markedForReview: next,
      lastSeenQuestionId: question.id,
    });
  };

  const issueCertificate = async () => {
    try {
      await httpClient.post(`/api/student/exams/courses/${courseId}/certificate`);
    } catch (err) {
      console.warn("Issue certificate failed", err);
    }
  };

  const submitAttempt = async () => {
    if (!attempt) return;
    try {
      setLoading(true);
      const { data } = await httpClient.post(`/api/student/exams/attempts/${attempt.attemptId}/submit`);
      setResult(data);
      setAttempt(null); // trở lại màn meta để xem lượt còn lại
      if (data.passed) {
        issueCertificate();
      }
      await fetchOverview();
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể nộp bài");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !overview && !attempt) {
    return <div className="py-12 text-center text-stone-500">Đang tải dữ liệu...</div>;
  }

  if (!attempt) {
    return (
      <div className="space-y-6">
        <ExamMeta overview={overview} lastResult={result} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={startAttempt} disabled={!overview?.canAttempt} className="btn btn-primary">
            {overview?.activeAttemptId ? "Tiếp tục bài làm" : "Bắt đầu làm bài"}
          </button>
          <button onClick={() => navigate(-1)} className="btn border-stone-300">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between border border-stone-200 rounded-2xl p-4 bg-white">
        <div>
          <p className="text-sm text-stone-500">Đang làm</p>
          <p className="text-lg font-semibold text-stone-900">{attempt.examTitle}</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-center">
            <p className="text-xs text-stone-500">Thời gian còn lại</p>
            <p className="text-2xl font-mono text-primary-600">{formatDuration(countdown)}</p>
          </div>
          <button onClick={submitAttempt} className="btn btn-primary" disabled={saving || loading}>
            Nộp bài
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div
          className={`p-4 rounded-2xl text-sm ${
            result.passed
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p>
            Điểm: <strong>{Math.round(result.scorePercent ?? 0)}%</strong>{" "}
            {result.passed ? "(Đạt)" : "(Chưa đạt)"}
          </p>
          {typeof result.attemptsRemaining === "number" && (
            <p className="mt-1">Lượt còn lại: {result.attemptsRemaining}</p>
          )}
          {result.message && <p className="mt-1">{result.message}</p>}
          {result.locked && <p className="mt-1 text-red-600">Khóa học đã bị khóa. Vui lòng đăng ký lại.</p>}
        </div>
      )}

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <QuestionCard question={currentQuestion} onSelectOption={handleSelectOption} onToggleFlag={handleToggleFlag} />
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
            <span>
              Câu {currentIndex + 1}/{attempt?.questions?.length ?? 1}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-xs border-stone-300"
                onClick={() => {
                  if (!attempt?.questions?.length) return;
                  const prevIdx = Math.max(0, currentIndex - 1);
                  setCurrentQuestionId(attempt.questions[prevIdx].id);
                }}
                disabled={!attempt?.questions?.length || currentIndex <= 0}
              >
                Câu trước
              </button>
              <button
                type="button"
                className="btn btn-xs border-stone-300"
                onClick={() => {
                  if (!attempt?.questions?.length) return;
                  const nextIdx = Math.min(attempt.questions.length - 1, currentIndex + 1);
                  setCurrentQuestionId(attempt.questions[nextIdx].id);
                }}
                disabled={
                  !attempt?.questions?.length || currentIndex >= (attempt?.questions?.length ?? 1) - 1
                }
              >
                Câu tiếp
              </button>
            </div>
          </div>
          {saving && <p className="text-xs text-stone-400">Đang lưu...</p>}
        </div>
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-stone-200 bg-white">
            <p className="text-sm font-medium text-stone-700 mb-3">Danh sách câu hỏi</p>
            <QuestionNav
              questions={attempt.questions}
              currentId={currentQuestionId}
              onSelect={(id) => setCurrentQuestionId(id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamPlayer() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ExamInner />
    </div>
  );
}
