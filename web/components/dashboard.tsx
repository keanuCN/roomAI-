"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Plus,
  Search,
  SlidersHorizontal,
  ImagePlus,
  Sparkles,
  Send,
  Trash2,
  LoaderCircle,
} from "lucide-react";
import { api, Project, area } from "@/lib/api";
import { Shell, Modal, Loading, Empty, ErrorPanel, Toast } from "./ui";

export default function Dashboard({ all = false }: { all?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("全部项目"),
    [query, setQuery] = useState(""),
    [create, setCreate] = useState(false),
    [toast, setToast] = useState(""),
    [deleting, setDeleting] = useState<Project | null>(null);
  const load = () => {
    setLoading(true);
    setError("");
    api<Project[]>("/projects")
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const shown = projects.filter(
    (p) =>
      (filter === "全部项目" || p.status === filter) && p.title.includes(query),
  );
  return (
    <Shell crumb={all ? "我的项目" : "工作台"}>
      <main className="dashboard">
        {!all ? (
          <section className="welcome">
            <div>
              <div className="eyebrow">A SPACE TO CALL YOUR OWN</div>
              <h1>
                让空间的想象，
                <br />
                <em>有迹可循。</em>
              </h1>
              <p>从一张照片，到可与客户分享的设计方案。</p>
              <div className="button-row">
                <button className="btn dark" onClick={() => setCreate(true)}>
                  新建项目
                  <Plus size={18} />
                </button>
                {projects[0] && (
                  <Link
                    className="btn outline"
                    href={"/projects/" + projects[0].id}
                  >
                    体验示例
                    <ArrowRight size={17} />
                  </Link>
                )}
              </div>
            </div>
            <div className="material-composition" aria-hidden="true">
              <div className="stone-swatch">
                <span>01 / STONE</span>
              </div>
              <div className="wood-swatch">
                <span>02 / WALNUT</span>
              </div>
              <div className="fabric-swatch">
                <span>03 / LINEN</span>
              </div>
              <span className="material-caption">
                自然的质感，是生活的底色。
              </span>
            </div>
          </section>
        ) : (
          <div className="page-intro">
            <div className="eyebrow">YOUR DESIGN JOURNEY</div>
            <h1>
              我的项目<span className="count">{projects.length}</span>
            </h1>
            <p>每个理想空间，都从一个想法开始。</p>
            <button className="btn dark" onClick={() => setCreate(true)}>
              <Plus size={18} />
              新建项目
            </button>
          </div>
        )}
        <div className="section-heading">
          <h2>
            {all ? "所有设计项目" : "最近的项目"}
            <span className="small-count">{projects.length}</span>
          </h2>
          {!all && (
            <Link className="text-link" href="/projects">
              查看全部项目
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <div className="list-toolbar">
          <div className="tabs">
            {["全部项目", "设计中", "已完成"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={filter === t ? "active" : ""}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="搜索你的项目"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索项目"
            />
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorPanel message={error} onRetry={load} />
        ) : shown.length ? (
          <div className={"project-grid " + (!all ? "featured" : "")}>
            {shown.map((p, i) => (
              <article
                className="project-card"
                key={p.id}
                style={{ animationDelay: i * 65 + "ms" }}
              >
                <Link href={"/projects/" + p.id} className="project-image">
                  <img src={p.cover} alt={p.title} />
                  <span
                    className={
                      "project-status " + (p.status === "已完成" ? "done" : "")
                    }
                  >
                    <i />
                    {p.status}
                  </span>
                  <span className="project-open">
                    <ArrowRight size={22} />
                  </span>
                </Link>
                <button
                  className="project-delete"
                  title="删除项目"
                  aria-label={"删除" + p.title}
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 size={15} />
                </button>
                <Link href={"/projects/" + p.id}>
                  <h3>{p.title}</h3>
                </Link>
                <div className="project-meta">
                  <span>
                    {p.room_type} · {area(p.room)} m²
                  </span>
                  <span>
                    {new Date(p.updated_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            text={
              query
                ? "没有找到匹配的项目"
                : "还没有项目，创建你的第一个理想空间吧。"
            }
          />
        )}
        {!all && (
          <section className="workflow-strip">
            <div>
              <h2>从想法，到住进理想。</h2>
              <p>让家的可能性，清晰可见。</p>
            </div>
            {[
              {
                n: "01",
                icon: ImagePlus,
                t: "记录你的空间",
                s: "一张照片，开启设计",
              },
              {
                n: "02",
                icon: Sparkles,
                t: "让灵感成形",
                s: "精确布局，探索风格",
              },
              {
                n: "03",
                icon: Send,
                t: "分享每一份喜欢",
                s: "与客户沟通，推进实现",
              },
            ].map(({ n, icon: Icon, t, s }) => (
              <div className="workflow-item" key={n}>
                <Icon size={24} />
                <div>
                  <small>{n}</small>
                  <b>{t}</b>
                  <span>{s}</span>
                </div>
              </div>
            ))}
          </section>
        )}
        <footer className="app-footer">
          <span>roomAI 栖间 · 为真实的生活而设计</span>
          <span>灵感由你，空间有据。</span>
        </footer>
      </main>
      {create && <NewProject onClose={() => setCreate(false)} />}
      {deleting && (
        <Modal title="删除这个项目？" onClose={() => setDeleting(null)}>
          <p className="muted">
            项目“{deleting.title}”及上传照片将被删除，分享链接也会失效。
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleting(null)}>
              保留项目
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                try {
                  await api("/projects/" + deleting.id, { method: "DELETE" });
                  setProjects((ps) => ps.filter((p) => p.id !== deleting.id));
                  setDeleting(null);
                  setToast("项目已删除");
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              确认删除
            </button>
          </div>
        </Modal>
      )}
      <Toast message={toast} />
    </Shell>
  );
}
function NewProject({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(""),
    [type, setType] = useState("客厅"),
    [width, setWidth] = useState(5.6),
    [length, setLength] = useState(5),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="开启一个理想空间" onClose={onClose}>
      <p className="muted">
        先为它取个名字。尺寸和更多想法，都可以在下一步调整。
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const p = await api<Project>("/projects", {
              method: "POST",
              body: JSON.stringify({ title, room_type: type, width, length }),
            });
            router.push("/projects/" + p.id + "?new=1");
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <label className="field">
          项目名称
          <input
            required
            maxLength={80}
            placeholder="例如：云栖 · 我们的新家"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          空间类型
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {["客厅", "卧室", "书房", "餐厅", "其他空间"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            房间宽度 / m
            <input
              type="number"
              min={2}
              max={20}
              step={0.1}
              required
              value={width}
              onChange={(e) => setWidth(+e.target.value)}
            />
          </label>
          <label className="field">
            房间长度 / m
            <input
              type="number"
              min={2}
              max={20}
              step={0.1}
              required
              value={length}
              onChange={(e) => setLength(+e.target.value)}
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary full" disabled={busy || !title.trim()}>
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <>
              创建项目
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}
