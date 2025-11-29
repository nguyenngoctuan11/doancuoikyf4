import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../api/httpClient";
import SectionHeading from "../../components/SectionHeading";

const levelBands = [
  { label: "350+", max: 30, description: "Nền tảng để làm quen từ vựng và phát âm" },
  { label: "450+", max: 50, description: "Sơ trung cấp với ngữ pháp, hội thoại" },
  { label: "550+", max: 65, description: "Trung cấp luyện đọc, viết và phản xạ" },
  { label: "650+", max: 80, description: "Trung cao tăng tốc kỹ năng nghe nói" },
  { label: "750+", max: 90, description: "Nâng cao xử lý đề khó, học thuật" },
  { label: "850+", max: 100, description: "Chuyên sâu luyện chứng chỉ, giao tiếp chuyên nghiệp" },
];

const SAMPLE_QUESTIONS = [
  {
    id: "q1",
    type: "image",
    skill: "Reading",
    prompt: "Nhìn bức hình và chọn đáp án mô tả đúng nhất.",
    imageUrl:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=60",
    options: [
      { key: "A", label: "Cô gái đang đọc sách trong thư viện" },
      { key: "B", label: "Cậu bé đang chơi đá bóng" },
      { key: "C", label: "Một gia đình đang ăn tối" },
      { key: "D", label: "Một nhóm bạn đang chạy bộ" },
    ],
    correct: "A",
  },
  {
    id: "q2",
    type: "listening",
    skill: "Listening",
    prompt: "Nghe đoạn audio và chọn nội dung bạn nghe được.",
    audioUrl:
      "https://cdn.pixabay.com/download/audio/2022/03/15/audio_7b8ea449c0.mp3?filename=short-podcast-intro-11159.mp3",
    options: [
      { key: "A", label: "Diễn giả nói về học online" },
      { key: "B", label: "Diễn giả giới thiệu bài hát" },
      { key: "C", label: "Diễn giải một bộ phim" },
      { key: "D", label: "Diễn giải kế hoạch du lịch" },
    ],
    correct: "A",
  },
  {
    id: "q3",
    type: "text",
    skill: "Grammar",
    prompt: "Chọn từ thích hợp để hoàn thành câu: 'She ____ to the meeting yesterday.'",
    options: [
      { key: "A", label: "go" },
      { key: "B", label: "gone" },
      { key: "C", label: "went" },
      { key: "D", label: "going" },
    ],
    correct: "C",
  },
  {
    id: "q4",
    type: "text",
    skill: "Vocabulary",
    prompt: "Từ nào đồng nghĩa với 'improve'?",
    options: [
      { key: "A", label: "decline" },
      { key: "B", label: "enhance" },
      { key: "C", label: "reduce" },
      { key: "D", label: "ignore" },
    ],
    correct: "B",
  },
];

function normalizeLevel(level) {
  if (!level) return null;
  const clean = level.toLowerCase();
  if (clean.includes("350")) return "350+";
  if (clean.includes("450")) return "450+";
  if (clean.includes("550")) return "550+";
  if (clean.includes("650")) return "650+";
  if (clean.includes("750")) return "750+";
  if (clean.includes("850")) return "850+";
  if (clean.includes("950")) return "950+";
  if (clean.includes("beginner")) return "350+";
  if (clean.includes("intermediate")) return "550+";
  if (clean.includes("advanced")) return "750+";
  return level;
}

export default function PlacementTest() {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadingCourses(true);
    fetch(`${API_BASE_URL}/api/public/courses-sql?status=published&limit=30`)
      .then((res) => {
        if (!res.ok) throw new Error("Không thể tải khóa học gợi ý");
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        const mapped = (Array.isArray(data) ? data : []).map((c) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          level: normalizeLevel(c.level || c.level_name),
          thumbnail:
            c.thumbnail_url ||
            c.thumbnailUrl ||
            "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&q=60",
          summary: c.short_desc || c.shortDesc || "Khóa học trên hệ thống",
        }));
        setCourses(mapped);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => alive && setLoadingCourses(false));
    return () => {
      alive = false;
    };
  }, []);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const total = SAMPLE_QUESTIONS.length;
    const correct = SAMPLE_QUESTIONS.filter((q) => answers[q.id] === q.correct).length;
    const percent = Math.round((correct / total) * 100);
    const band = levelBands.find((b) => percent <= b.max) || levelBands[levelBands.length - 1];
    const recommended = courses
      .filter((c) => !band || !c.level || c.level === band.label)
      .slice(0, 4);
    setResult({ total, correct, percent, band, recommended });
  };

  const resetTest = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="bg-slate-950 text-white">
      <section className="bg-gradient-to-br from-amber-50 via-white to-rose-50 text-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-4">
            <p className="text-sm font-semibold tracking-[0.4em] text-amber-500">VOCA ENGLISH TEST</p>
            <h1 className="text-3xl font-extrabold text-slate-900">Kiểm tra trình độ trước khi đăng ký khóa học</h1>
            <p className="text-base text-slate-600">
              Bài test gồm nghe, đọc, từ vựng và mẫu tự bằng hình ảnh giúp bạn định vị cấp độ của mình (350+ - 950+).
              Kết quả dùng để đề xuất khóa học phù hợp ngay lập tức.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#test-area"
                className="inline-flex items-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-amber-600"
              >
                Làm bài kiểm tra ngay
              </a>
              {result && (
                <button
                  type="button"
                  onClick={resetTest}
                  className="text-sm font-semibold text-amber-700"
                >
                  Làm lại bài test
                </button>
              )}
            </div>
            <div className="mt-6 rounded-2xl bg-white/70 p-4 shadow-lg">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-400">Trình độ của bạn</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                {levelBands.map((band) => (
                  <div
                    key={band.label}
                    className={`rounded-xl border px-3 py-2 text-center font-semibold ${
                      result?.band?.label === band.label
                        ? "border-amber-500 bg-amber-50 text-amber-600"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {band.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <img
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=700&q=60"
              alt="Placement test"
              className="w-full rounded-[32px] border border-white shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section id="test-area" className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeading
          eyebrow="Bài test"
          title="Làm bài kiểm tra tổng hợp"
          subtitle="Giảng viên có thể thiết kế hình ảnh, audio và câu hỏi trắc nghiệm cho học viên."
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {SAMPLE_QUESTIONS.map((question, index) => (
              <div key={question.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-400">Câu {index + 1}</p>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {question.skill}
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">{question.prompt}</p>

                {question.imageUrl && (
                  <img
                    src={question.imageUrl}
                    alt="question"
                    className="mt-4 w-full rounded-2xl object-cover"
                  />
                )}

                {question.audioUrl && (
                  <audio controls className="mt-4 w-full">
                    <source src={question.audioUrl} type="audio/mpeg" />
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                )}

                <div className="mt-4 space-y-3">
                  {question.options.map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                        answers[question.id] === opt.key
                          ? "border-amber-400 bg-amber-50/10 text-amber-100"
                          : "border-slate-700 text-slate-300"
                      }`}
                    >
                      <span>
                        <span className="font-semibold">{opt.key}. </span>
                        {opt.label}
                      </span>
                      <input
                        type="radio"
                        name={question.id}
                        value={opt.key}
                        checked={answers[question.id] === opt.key}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: e.target.value,
                          }))
                        }
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Đã trả lời</span>
                <span>
                  {answeredCount}/{SAMPLE_QUESTIONS.length}
                </span>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-amber-600"
              >
                Nộp bài và xem gợi ý
              </button>
            </div>
          </form>

          <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-xl font-bold text-white">Kết quả & Gợi ý</h3>
            {!result ? (
              <p className="text-sm text-slate-400">Hoàn thành bài test để xem đề xuất khóa học.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Điểm đúng</p>
                  <p className="text-3xl font-extrabold text-white">
                    {result.correct}/{result.total}
                  </p>
                  <p className="text-sm text-slate-400">Tỷ lệ: {result.percent}%</p>
                </div>
                <div className="rounded-2xl border border-amber-600 bg-amber-50/10 p-4 text-amber-100">
                  <p className="text-sm">Trình độ đề xuất</p>
                  <p className="text-2xl font-bold">{result.band.label}</p>
                  <p className="text-sm opacity-80">{result.band.description}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Khóa học nên thử</p>
                  {loadingCourses ? (
                    <p className="text-xs text-slate-500">Đang tải khóa học...</p>
                  ) : error ? (
                    <p className="text-xs text-red-400">{error}</p>
                  ) : result.recommended.length === 0 ? (
                    <p className="text-xs text-slate-500">Chưa có khóa phù hợp, hãy thử lại sau.</p>
                  ) : (
                    <ul className="mt-3 space-y-3 text-sm">
                      {result.recommended.map((course) => (
                        <li key={course.id} className="rounded-2xl border border-slate-800 p-3">
                          <p className="font-semibold text-white">{course.title}</p>
                          <p className="text-xs text-slate-400">Cấp độ: {course.level || "Đang cập nhật"}</p>
                          <a
                            href={`/courses/${course.slug || course.id}`}
                            className="mt-1 inline-flex items-center text-xs font-semibold text-amber-400"
                          >
                            Xem khóa học →
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
