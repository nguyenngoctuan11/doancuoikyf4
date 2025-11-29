import { useEffect, useMemo, useState } from "react";
import httpClient, { API_BASE_URL } from "../api/httpClient";
import { useAuth } from "../context/AuthContext";

const API_BASE = API_BASE_URL;
const SCORE_OPTIONS = [
  { key: "courseScore", label: "Nội dung khóa học" },
  { key: "instructorScore", label: "Giảng viên" },
  { key: "supportScore", label: "Hỗ trợ & kỹ thuật" },
];

const defaultForm = {
  courseScore: 5,
  instructorScore: 5,
  supportScore: 5,
  wouldRecommend: true,
  highlight: "",
  improvement: "",
  comment: "",
};

export default function CourseReviewsPanel({ courseId, canReview }) {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [myReview, setMyReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    async function bootstrap() {
      if (!courseId) return;
      setLoading(true);
      setError("");
      try {
        await Promise.all([
          fetchSummary(courseId, (data) => alive && setSummary(data)),
          fetchReviews(courseId, (list) => alive && setReviews(list)),
          isAuthenticated ? fetchMine(courseId, (data) => alive && handleMineResponse(data)) : Promise.resolve(),
        ]);
      } catch (err) {
        if (alive) setError(err.message || "Không tải được đánh giá.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isAuthenticated]);

  function handleMineResponse(data) {
    if (!data) {
      setMyReview(null);
      setForm(defaultForm);
      return;
    }
    setMyReview(data);
    setForm((prev) => ({
      ...prev,
      courseScore: data.courseScore || prev.courseScore,
      instructorScore: data.instructorScore || prev.instructorScore,
      supportScore: data.supportScore || prev.supportScore,
      wouldRecommend: data.wouldRecommend ?? prev.wouldRecommend,
      highlight: data.highlight || "",
      improvement: data.improvement || "",
      comment: data.comment || "",
    }));
  }

  const recommendLabel = useMemo(() => {
    if (!summary || !summary.total) return "Chưa có dữ liệu";
    const ratio = summary.recommendRatio || 0;
    return `${(Math.round((ratio / 5) * 1000) / 10).toFixed(1)}% học viên sẵn sàng giới thiệu`;
  }, [summary]);

  const histogram = summary?.histogram || [];

  const canSubmit = isAuthenticated && canReview && !submitting;

  async function fetchSummary(id, setter) {
    const res = await fetch(`${API_BASE}/api/course-reviews/course/${id}/summary`);
    if (!res.ok) throw new Error("Không tải được thống kê.");
    const data = await res.json();
    setter(data || null);
  }

  async function fetchReviews(id, setter) {
    const res = await fetch(`${API_BASE}/api/course-reviews/course/${id}?limit=8`);
    if (!res.ok) throw new Error("Không tải được danh sách đánh giá.");
    const data = await res.json();
    setter(Array.isArray(data) ? data : []);
  }

  async function fetchMine(id, setter) {
    try {
      const { data } = await httpClient.get(`/api/course-reviews/course/${id}/mine`);
      setter(data);
    } catch (err) {
      setter(null);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name.endsWith("Score") ? Number(value) : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) {
      setError(isAuthenticated ? "Bạn cần ghi danh trước khi gửi đánh giá." : "Hãy đăng nhập để đánh giá.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        courseScore: form.courseScore,
        instructorScore: form.instructorScore,
        supportScore: form.supportScore,
        wouldRecommend: form.wouldRecommend,
        comment: form.comment,
        highlight: form.highlight,
        improvement: form.improvement,
      };
      const { data } = await httpClient.post(`/api/course-reviews/course/${courseId}`, payload);
      setMyReview(data);
      await fetchSummary(courseId, setSummary);
      await fetchReviews(courseId, setReviews);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          err?.message ||
          "Không gửi được đánh giá. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="lg:w-1/2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">Đánh giá từ học viên</p>
          <h3 className="mt-2 text-2xl font-bold text-stone-900">Trải nghiệm thực tế</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SummaryCard label="Điểm nội dung" value={summary?.courseAverage ?? "--"} />
            <SummaryCard label="Điểm giảng viên" value={summary?.instructorAverage ?? "--"} />
            <SummaryCard label="Hỗ trợ & kỹ thuật" value={summary?.supportAverage ?? "--"} />
            <SummaryCard label="Khuyến nghị" value={summary ? recommendLabel : "--"} small />
          </div>
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">Phân bố đánh giá</p>
            <div className="mt-3 space-y-2">
              {histogram.length > 0 ? (
                histogram
                  .map((value, idx) => ({ value, score: idx + 1 }))
                  .reverse()
                  .map((bucket) => (
                    <div key={bucket.score} className="flex items-center gap-3 text-sm text-stone-600">
                      <span className="w-12 font-semibold">{bucket.score}★</span>
                      <div className="h-2 flex-1 rounded-full bg-stone-100">
                        <div
                          className="h-2 rounded-full bg-primary-500 transition-all"
                          style={{
                            width:
                              summary?.total && summary.total > 0
                                ? `${Math.round((bucket.value / summary.total) * 100)}%`
                                : "0%",
                          }}
                        />
                      </div>
                      <span className="w-10 text-right">{bucket.value}</span>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-stone-500">Chưa có dữ liệu đánh giá.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-1/2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <h4 className="text-base font-semibold text-stone-900">Chia sẻ cảm nhận của bạn</h4>
            {!isAuthenticated && (
              <p className="mt-2 text-sm text-stone-500">Vui lòng đăng nhập để gửi đánh giá khóa học.</p>
            )}
            {isAuthenticated && !canReview && (
              <p className="mt-2 text-sm text-stone-500">Bạn cần ghi danh khóa học trước khi gửi đánh giá.</p>
            )}
            {myReview?.status && (
              <p className="mt-2 text-xs text-primary-600">
                Đánh giá hiện ở trạng thái:{" "}
                <strong>{myReview.status === "approved" ? "Đã duyệt" : myReview.status === "rejected" ? "Bị từ chối" : "Đang chờ duyệt"}</strong>
              </p>
            )}
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {SCORE_OPTIONS.map((item) => (
                <label key={item.key} className="block text-sm font-medium text-stone-700">
                  {item.label}
                  <select
                    name={item.key}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2"
                    value={form[item.key]}
                    onChange={handleChange}
                    disabled={!isAuthenticated}
                  >
                    {[5, 4, 3, 2, 1].map((score) => (
                      <option key={score} value={score}>
                        {score} ★
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="wouldRecommend"
                  className="h-4 w-4 rounded border-stone-300 text-primary-600"
                  checked={form.wouldRecommend}
                  onChange={handleChange}
                  disabled={!isAuthenticated}
                />
                Tôi sẵn sàng giới thiệu khóa học này cho bạn bè
              </label>
              <textarea
                name="highlight"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="Điểm bạn thích nhất..."
                rows={2}
                value={form.highlight}
                onChange={handleChange}
                disabled={!isAuthenticated}
              />
              <textarea
                name="improvement"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="Điều cần cải thiện..."
                rows={2}
                value={form.improvement}
                onChange={handleChange}
                disabled={!isAuthenticated}
              />
              <textarea
                name="comment"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                placeholder="Nhận xét chi tiết..."
                rows={3}
                value={form.comment}
                onChange={handleChange}
                disabled={!isAuthenticated}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={!canSubmit}>
                {submitting ? "Đang gửi..." : myReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-lg font-semibold text-stone-900">Nhận xét nổi bật</h4>
        {loading && <p className="mt-3 text-sm text-stone-500">Đang tải đánh giá...</p>}
        {!loading && reviews.length === 0 && (
          <p className="mt-3 text-sm text-stone-500">Chưa có nhận xét nào. Hãy là người đầu tiên chia sẻ cảm nhận!</p>
        )}
        <div className="mt-4 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900">{review.studentName || "Học viên"}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(review.createdAt || new Date()).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div className="text-sm font-semibold text-primary-600">{review.courseScore} ★</div>
              </div>
              {review.comment && <p className="mt-3 text-sm text-stone-700">{review.comment}</p>}
              <dl className="mt-3 grid gap-3 text-xs text-stone-500 sm:grid-cols-3">
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Điểm mạnh</dt>
                  <dd>{review.highlight || "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Cải thiện</dt>
                  <dd>{review.improvement || "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Giảng viên</dt>
                  <dd>{review.instructorName || "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, small }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-400">{label}</p>
      <p className={`mt-2 font-bold text-stone-900 ${small ? "text-base" : "text-3xl"}`}>{value ?? "--"}</p>
    </div>
  );
}
