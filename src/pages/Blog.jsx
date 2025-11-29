import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import { fetchPublicPosts } from "../services/blog";
import { useAuth } from "../context/AuthContext";

const formatDate = (value) => {
  if (!value) return "Chưa xuất bản";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value;
  }
};

function PostCard({ post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm shadow-stone-100 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-amber-50 via-stone-50 to-white">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">Hình minh hoạ</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">{formatDate(post.publishedAt)}</p>
        <h3 className="mt-3 text-lg font-bold text-stone-900 transition group-hover:text-amber-600">{post.title}</h3>
        <p className="mt-2 flex-1 text-sm text-stone-600 line-clamp-3">{post.summary || "Chưa có mô tả ngắn."}</p>
        <div className="mt-4 text-sm font-medium text-stone-500">
          {post.authorName ? `Tác giả: ${post.authorName}` : "Bài viết cộng đồng"}
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublicPosts({ limit: 60 })
      .then(({ data }) => {
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data || "Không thể tải bài viết.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const heroCtaLabel = useMemo(() => {
    if (!isAuthenticated) return "Đăng nhập để viết bài";
    if (user?.roles?.some((role) => role.toUpperCase() === "STUDENT")) return "Viết blog của tôi";
    return "Xem blog của tôi";
  }, [isAuthenticated, user]);

  const handleCtaClick = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/blog/studio" } });
      return;
    }
    navigate("/blog/studio");
  };

  return (
    <div className="bg-gradient-to-b from-white via-amber-50/30 to-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="rounded-[42px] bg-white/80 p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-amber-500">Blog cộng đồng</p>
          <h1 className="mt-3 text-4xl font-black text-stone-900">Chia sẻ kiến thức & kinh nghiệm học tập</h1>
          <p className="mt-4 text-base text-stone-600">
            Nơi sinh viên ghi lại hành trình học, mẹo luyện thi và câu chuyện nghề nghiệp. Bài viết sẽ được kiểm duyệt
            trước khi hiển thị để đảm bảo chất lượng.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleCtaClick}
              className="inline-flex items-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/40 transition hover:bg-amber-600"
            >
              {heroCtaLabel}
            </button>
            <a
              href="#latest"
              className="inline-flex items-center rounded-full border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:text-stone-900"
            >
              Xem bài mới nhất
            </a>
          </div>
        </div>

        <div id="latest" className="mt-14">
          <SectionHeading
            eyebrow="Bài viết mới"
            title="Cập nhật xu hướng và mẹo học thực tế"
            subtitle="Được viết bởi chính học viên trên nền tảng"
            center
          />

          {error && <p className="mt-6 text-center text-sm text-red-500">{error}</p>}

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-3xl border border-stone-100 bg-white p-5 shadow-sm shadow-stone-100"
                  >
                    <div className="aspect-video rounded-2xl bg-stone-100" />
                    <div className="mt-4 h-4 w-1/3 rounded-full bg-stone-100" />
                    <div className="mt-4 h-5 w-4/5 rounded-full bg-stone-100" />
                    <div className="mt-3 h-3 rounded-full bg-stone-100" />
                    <div className="mt-2 h-3 rounded-full bg-stone-100" />
                  </div>
                ))
              : posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>

          {!loading && posts.length === 0 && !error && (
            <p className="mt-6 text-center text-sm text-stone-500">
              Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ kinh nghiệm học tập của bạn nhé!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
