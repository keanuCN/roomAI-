"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Share2,
  Sparkles,
  X,
  Eye,
  Link2,
  Trash2,
  ShieldCheck,
  Clock,
  LayoutGrid,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import {
  api,
  Project,
  Product,
  Style,
  Settings,
  Room,
  Job,
  money,
  area,
} from "@/lib/api";
import {
  Shell,
  Loading,
  ErrorPanel,
  Modal,
  Toast,
  ProductCard,
  ProductDetail,
} from "./ui";
import FloorPlan from "./floor-plan";

export default function Editor({ id }: { id: string }) {
  const [p, setP] = useState<Project | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [styles, setStyles] = useState<Style[]>([]),
    [settings, setSettings] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [step, setStep] = useState(3),
    [view, setView] = useState("preview"),
    [selected, setSelected] = useState(0),
    [drawer, setDrawer] = useState(false),
    [toast, setToast] = useState(""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(""),
    [generate, setGenerate] = useState(false),
    [mode, setMode] = useState("demo"),
    [job, setJob] = useState<Job | null>(null),
    [share, setShare] = useState(false),
    [link, setLink] = useState<{
      token: string;
      path: string;
      expires_at: string;
    } | null>(null),
    [sharing, setSharing] = useState(false),
    [comparing, setComparing] = useState(false),
    [slider, setSlider] = useState(50),
    [uploading, setUploading] = useState(false),
    [detail, setDetail] = useState<Product | null>(null),
    [geometryError, setGeometryError] = useState("");
  const baseline = useRef(""),
    file = useRef<HTMLInputElement>(null),
    busy = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    Promise.all([
      api<Project>("/projects/" + id),
      api<Product[]>("/products"),
      api<Style[]>("/styles"),
      api<Settings>("/settings"),
    ])
      .then(([project, pr, st, se]) => {
        setP(project);
        baseline.current = JSON.stringify(project);
        setProducts(pr);
        setStyles(st);
        setSettings(se);
        setSelected(Math.max(0, project.versions.length - 1));
        if (new URLSearchParams(window.location.search).has("new")) setStep(1);
      })
      .catch((e) => setError(e.message));
    return () => {
      mounted.current = false;
    };
  }, [id]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const save = useCallback(
    async (showToast = false) => {
      if (!p) return null;
      setSaving(true);
      try {
        const value = await api<Project>("/projects/" + id, {
          method: "PUT",
          body: JSON.stringify(p),
        });
        baseline.current = JSON.stringify(p);
        setSaved(
          new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        setGeometryError("");
        if (showToast) setToast("项目已保存");
        return value;
      } catch (e) {
        setGeometryError((e as Error).message);
        if (showToast) setToast((e as Error).message);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [p, id],
  );
  useEffect(() => {
    if (!p || JSON.stringify(p) === baseline.current) return;
    const t = setTimeout(() => save(), 1500);
    return () => clearTimeout(t);
  }, [p, save]);
  useEffect(() => {
    if (!p) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (JSON.stringify(p) !== baseline.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [p]);
  useEffect(() => {
    if (!job || ["completed", "failed"].includes(job.status)) return;
    let alive = true;
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await api<Job>("/render-jobs/" + job.id);
        if (!alive) return;
        setJob(next);
        if (next.status === "completed") {
          const updated = await api<Project>("/projects/" + id);
          if (alive) {
            baseline.current = JSON.stringify(updated);
            setP(updated);
            setSelected(updated.versions.length - 1);
            setToast("设计方案已就绪");
            setView("preview");
          }
        } else if (next.status === "failed") {
          setToast(next.error || "生成未完成，请重试");
        } else if (Date.now() - start < 360000) {
          timer = setTimeout(poll, 1400);
        } else {
          setToast("任务仍在处理中，请稍后重新打开项目查看");
        }
      } catch (e) {
        if (alive) {
          setToast((e as Error).message);
          timer = setTimeout(poll, 3000);
        }
      }
    };
    timer = setTimeout(poll, 500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [job?.id, id]);
  function patch(changes: Partial<Project>) {
    setP((v) => (v ? { ...v, ...changes } : v));
  }
  function roomChange(room: Room) {
    patch({ room });
    setGeometryError("");
  }
  async function run() {
    if (!p || busy.current) return;
    busy.current = true;
    setGenerate(false);
    const result = await save();
    if (!result) {
      busy.current = false;
      return;
    }
    try {
      const j = await api<Job>("/projects/" + id + "/renders", {
        method: "POST",
        body: JSON.stringify({
          style: p.style,
          mode,
          confirm_cost: true,
          request_id: crypto.randomUUID(),
        }),
      });
      setJob(j);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      busy.current = false;
    }
  }
  async function startShare() {
    if (!(await save(true))) return;
    setShare(true);
  }
  function toggleProduct(product: Product) {
    if (!p) return;
    const yes = p.product_ids.includes(product.id);
    const room = structuredClone(p.room);
    if (yes)
      room.furniture = room.furniture.filter(
        (f) => f.product_id !== product.id,
      );
    patch({
      product_ids: yes
        ? p.product_ids.filter((x) => x !== product.id)
        : [...p.product_ids, product.id],
      room,
    });
  }
  function addFurniture(product: Product) {
    if (!p || !product.width) return;
    const r = structuredClone(p.room);
    const occupied = r.furniture.map((f) => {
      const pr = products.find((x) => x.id === f.product_id)!;
      return {
        x: f.x,
        y: f.y,
        w: f.rotation % 180 ? pr.depth : pr.width,
        d: f.rotation % 180 ? pr.width : pr.depth,
      };
    });
    let spot: { x: number; y: number } | null = null;
    for (let y = 0.1; y + product.depth <= r.length && !spot; y += 0.2)
      for (let x = 0.1; x + product.width <= r.width; x += 0.2) {
        if (
          r.shape === "alcove" &&
          x + product.width > r.width * 0.7 &&
          y + product.depth > r.length * 0.65
        )
          continue;
        if (
          !occupied.some(
            (o) =>
              x < o.x + o.w &&
              x + product.width > o.x &&
              y < o.y + o.d &&
              y + product.depth > o.y,
          )
        ) {
          spot = { x: +x.toFixed(2), y: +y.toFixed(2) };
          break;
        }
      }
    if (!spot) {
      setToast("空间不足，请先移动或移除已有家具");
      return;
    }
    r.furniture.push({
      id: crypto.randomUUID(),
      product_id: product.id,
      ...spot,
      rotation: 0,
    });
    patch({
      room: r,
      product_ids: p.product_ids.includes(product.id)
        ? p.product_ids
        : [...p.product_ids, product.id],
    });
    setToast("已加入户型，可拖拽调整位置");
  }
  if (error)
    return (
      <Shell crumb="项目">
        <ErrorPanel message={error} />
      </Shell>
    );
  if (!p)
    return (
      <Shell crumb="项目">
        <Loading />
      </Shell>
    );
  const chosen = products.filter((x) => p.product_ids.includes(x.id)),
    version = p.versions[selected],
    image = version?.image || p.cover;
  const pending = !!job && !["completed", "failed"].includes(job.status),
    dirty = JSON.stringify(p) !== baseline.current;
  return (
    <Shell
      crumb={p.title}
      actions={
        <>
          <span className="save-state">
            {saving
              ? "保存中…"
              : dirty
                ? "修改未保存"
                : saved
                  ? "已保存 " + saved
                  : "已保存"}
          </span>
          <button
            className="btn small outline"
            disabled={saving}
            onClick={() => save(true)}
          >
            <Save size={15} />
            保存
          </button>
          <button className="btn small primary" onClick={startShare}>
            <Share2 size={15} />
            分享方案
          </button>
        </>
      }
    >
      <main className="editor-main">
        <div className="editor-heading">
          <div>
            <input
              className="project-title"
              aria-label="项目名称"
              maxLength={80}
              value={p.title}
              onChange={(e) => patch({ title: e.target.value })}
            />
            <p>
              {area(p.room)} m²<span>·</span>
              {p.room_type}
              <span>·</span>
              {p.client}的理想空间
            </p>
          </div>
          <div className="steps">
            {["空间资料", "户型与产品", "设计方案"].map((label, i) => (
              <button
                key={label}
                className={step === i + 1 ? "active" : ""}
                onClick={() => {
                  setStep(i + 1);
                  setView(i === 1 ? "plan" : "preview");
                }}
              >
                <span>0{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="editor-grid">
          <section className="design-stage">
            <div className="stage-toolbar">
              <div className="tabs">
                <button
                  className={view === "preview" ? "active" : ""}
                  onClick={() => setView("preview")}
                >
                  效果预览
                </button>
                <button
                  className={view === "plan" ? "active" : ""}
                  onClick={() => setView("plan")}
                >
                  2D 户型
                </button>
              </div>
              <div>
                {view === "preview" && p.original && (
                  <button
                    className={"btn compact " + (comparing ? "active" : "")}
                    onClick={() => setComparing((v) => !v)}
                  >
                    <Eye size={15} />
                    {comparing ? "结束对比" : "原图对比"}
                  </button>
                )}
                {view === "plan" && (
                  <a
                    className="btn compact"
                    href={"/api/projects/" + id + "/plan"}
                    download
                  >
                    <Download size={15} />
                    尺寸图
                  </a>
                )}
              </div>
            </div>
            {view === "plan" ? (
              <FloorPlan
                room={p.room}
                products={products}
                onChange={roomChange}
              />
            ) : (
              <div className="render-image">
                <img
                  src={image}
                  alt={version?.name || "空间效果预览"}
                  className="main-render"
                />
                {comparing && p.original && (
                  <>
                    <div
                      className="original-layer"
                      style={{
                        clipPath: "inset(0 " + (100 - slider) + "% 0 0)",
                      }}
                    >
                      <img src={p.original} alt="原始房间照片" />
                    </div>
                    <span className="compare-label left">原始空间</span>
                    <span className="compare-label right">设计效果</span>
                    <div
                      className="compare-line"
                      style={{ left: slider + "%" }}
                    >
                      <span>↔</span>
                    </div>
                    <input
                      className="compare-range"
                      type="range"
                      min="0"
                      max="100"
                      value={slider}
                      aria-label="原图效果对比滑块"
                      onChange={(e) => setSlider(+e.target.value)}
                    />
                  </>
                )}
                <div className="image-caption">
                  <span>{version?.name || "空间参考"}</span>
                  <span>
                    {version?.mode === "live" ? "云端模型生成" : "预置演示效果"}
                  </span>
                </div>
                {pending && (
                  <div className="generation-overlay">
                    <LoaderCircle size={35} className="spin" />
                    <h3>
                      {job.status === "queued"
                        ? "正在等待生成"
                        : "正在为你的空间注入灵感"}
                    </h3>
                    <p>
                      {job.mode === "demo"
                        ? "正在准备演示方案"
                        : "云端模型处理中，通常需要数分钟"}
                    </p>
                  </div>
                )}
              </div>
            )}
            {geometryError && (
              <div className="geometry-error" role="alert">
                {geometryError}
              </div>
            )}
            <div className="variant-row">
              {p.versions.length ? (
                p.versions.slice(-6).map((v, i) => {
                  const idx = Math.max(0, p.versions.length - 6) + i;
                  return (
                    <button
                      key={v.id}
                      className={
                        "variant " + (selected === idx ? "selected" : "")
                      }
                      onClick={() => {
                        setSelected(idx);
                        setView("preview");
                      }}
                    >
                      <img src={v.image} alt={v.name} />
                      <span>
                        {v.name}
                        <small>
                          {v.mode === "demo" ? "演示" : "云端"} ·{" "}
                          {new Date(v.created_at).toLocaleDateString("zh-CN")}
                        </small>
                      </span>
                      {selected === idx && <Check size={13} />}
                    </button>
                  );
                })
              ) : (
                <div className="no-versions">
                  <Sparkles size={18} />
                  还没有方案，确认户型后生成你的第一份设计。
                </div>
              )}
            </div>
            <div className="materials">
              <b>空间材质</b>
              <div className="swatches">
                {["stone", "wood", "linen", "olive"].map((c) => (
                  <span
                    key={c}
                    className={"swatch " + c}
                    title={
                      {
                        stone: "天然洞石",
                        wood: "黑胡桃",
                        linen: "亚麻织物",
                        olive: "橄榄绿",
                      }[c]
                    }
                  />
                ))}
              </div>
              <span className="material-divider" />
              <span className="muted">搭配产品</span>
              <div className="mini-products">
                {chosen.map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setDetail(pr)}
                    title={pr.name}
                  >
                    <img src={pr.image} alt={pr.name} />
                  </button>
                ))}
              </div>
              <button
                className="icon-btn"
                title="添加产品"
                onClick={() => setDrawer(true)}
              >
                <Plus size={18} />
              </button>
            </div>
            {version && (
              <div className="design-rationale">
                <span className="eyebrow">THE IDEA BEHIND THE SPACE</span>
                <h3>让设计，有理由。</h3>
                <p>{version.rationale}</p>
                <div className="button-row">
                  <a
                    className="text-link"
                    href={"/api/projects/" + id + "/report"}
                    download
                  >
                    <Download size={15} />
                    导出方案 PDF
                  </a>
                  <span className="fine">
                    图像用于方案沟通，尺寸须现场复核。
                  </span>
                </div>
              </div>
            )}
          </section>
          <aside className="inspector">
            {step === 1 ? (
              <>
                <span className="eyebrow">01 / YOUR SPACE</span>
                <h2>先认识你的空间</h2>
                <p className="muted">记录当下的样子，再一起寻找新的可能。</p>
                <button
                  className="upload-zone"
                  disabled={uploading}
                  onClick={() => file.current?.click()}
                >
                  {p.original ? (
                    <img src={p.original} alt="已上传房间照片" />
                  ) : (
                    <ImagePlus size={29} />
                  )}
                  <b>
                    {uploading
                      ? "正在上传…"
                      : p.original
                        ? "更换房间照片"
                        : "上传房间照片"}
                  </b>
                  <span>JPG、PNG 或 WebP，最大 12 MB</span>
                </button>
                <input
                  ref={file}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setUploading(true);
                    const fd = new FormData();
                    fd.append("file", f);
                    try {
                      const data = await api<Project>(
                        "/projects/" + id + "/upload",
                        { method: "POST", body: fd },
                      );
                      patch({ original: data.original });
                      setToast("照片已上传");
                    } catch (e) {
                      setToast((e as Error).message);
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <label className="field">
                  客户称呼
                  <input
                    maxLength={50}
                    value={p.client}
                    onChange={(e) => patch({ client: e.target.value })}
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    空间类型
                    <select
                      value={p.room_type}
                      onChange={(e) => patch({ room_type: e.target.value })}
                    >
                      {["客厅", "卧室", "书房", "餐厅", "其他空间"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    装修预算 / 元
                    <input
                      type="number"
                      min={0}
                      max={10000000}
                      value={p.budget}
                      onChange={(e) => patch({ budget: +e.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  你的期待
                  <textarea
                    rows={5}
                    maxLength={1500}
                    value={p.brief}
                    onChange={(e) => patch({ brief: e.target.value })}
                  />
                </label>
                <button
                  className="btn primary full"
                  onClick={() => {
                    setStep(2);
                    setView("plan");
                  }}
                >
                  下一步，确认户型
                  <ArrowRight size={17} />
                </button>
              </>
            ) : step === 2 ? (
              <>
                <span className="eyebrow">02 / MEASURED & CONSIDERED</span>
                <h2>空间，每一寸有据</h2>
                <p className="muted">输入现场测量尺寸，在左侧拖拽家具。</p>
                <RoomControls room={p.room} onChange={roomChange} />
                <div className="inspector-section">
                  <div className="inline-heading">
                    <h3>家具占位</h3>
                    <button
                      className="text-link"
                      onClick={() => setDrawer(true)}
                    >
                      <Plus size={15} />
                      选择产品
                    </button>
                  </div>
                  {chosen
                    .filter((pr) => pr.width > 0)
                    .map((pr) => (
                      <div className="placement-row" key={pr.id}>
                        <img src={pr.image} alt={pr.name} />
                        <div>
                          <b>{pr.category}</b>
                          <small>{pr.size}</small>
                        </div>
                        <button
                          className="icon-btn"
                          title={"将" + pr.category + "加入户型"}
                          onClick={() => addFurniture(pr)}
                        >
                          <Plus size={17} />
                        </button>
                      </div>
                    ))}
                </div>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={p.room.confirmed}
                    onChange={(e) =>
                      roomChange({ ...p.room, confirmed: e.target.checked })
                    }
                  />
                  <span>我已确认房间尺寸和门窗位置</span>
                </label>
                <button
                  className="btn primary full"
                  disabled={!p.room.confirmed}
                  onClick={() => {
                    setStep(3);
                    setView("preview");
                  }}
                >
                  探索设计方案
                  <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <span className="eyebrow">03 / MAKE IT YOURS</span>
                <h2>设计你的理想空间</h2>
                <p className="muted">选择风格，补充想法，让灵感慢慢成形。</p>
                <h3 className="field-label">空间风格</h3>
                <div className="style-grid">
                  {styles.map((st) => (
                    <button
                      key={st.id}
                      className={
                        "style-option " + (p.style === st.id ? "selected" : "")
                      }
                      onClick={() => patch({ style: st.id })}
                    >
                      <img src={st.image} alt="" />
                      <span>
                        <b>{st.name}</b>
                        <span className="color-dots">
                          {st.colors.map((c) => (
                            <i key={c} style={{ background: c }} />
                          ))}
                        </span>
                      </span>
                      {p.style === st.id && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <label className="field">
                  自定义描述
                  <textarea
                    rows={4}
                    maxLength={1500}
                    value={p.brief}
                    onChange={(e) => patch({ brief: e.target.value })}
                  />
                  <small className="char-count">{p.brief.length}/1500</small>
                </label>
                <div className="inline-heading">
                  <h3>
                    已选产品 <span>({chosen.length})</span>
                  </h3>
                  <button className="text-link" onClick={() => setDrawer(true)}>
                    添加产品
                    <Plus size={14} />
                  </button>
                </div>
                <div className="chosen-products">
                  {chosen.map((pr) => (
                    <div key={pr.id} className="chosen-product">
                      <img src={pr.image} alt={pr.name} />
                      <div>
                        <b>{pr.name.split(" · ")[1]}</b>
                        <small>{money(pr.price)}</small>
                      </div>
                      <button
                        className="icon-btn"
                        title="移除产品"
                        onClick={() => toggleProduct(pr)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  {!chosen.length && (
                    <p className="fine">选几件喜欢的产品，让方案更具体。</p>
                  )}
                </div>
                <div className="budget-summary">
                  <span>产品参考总价</span>
                  <b>{money(chosen.reduce((s, pr) => s + pr.price, 0))}</b>
                </div>
                <div className="generation-controls">
                  <h3>预算与生成</h3>
                  <p className="fine">预计生成 1 张 · 演示免费</p>
                  <button
                    className="btn primary full"
                    disabled={pending || saving}
                    onClick={() => setGenerate(true)}
                  >
                    {pending ? (
                      <>
                        <LoaderCircle className="spin" size={17} />
                        方案生成中
                      </>
                    ) : (
                      <>
                        <Sparkles size={17} />
                        生成设计方案
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                  <div className="generation-footnote">
                    <ShieldCheck size={13} />
                    生成前确认用量与费用
                  </div>
                </div>
              </>
            )}
            <CustomerLeads projectId={id} />
          </aside>
        </div>
      </main>
      {drawer && (
        <Modal title="为你的空间挑选产品" wide onClose={() => setDrawer(false)}>
          <p className="muted">
            选择产品用于方案展示。切换到“户型与产品”后，可将家具放入平面图。
          </p>
          <div className="picker-grid">
            {products.map((pr) => (
              <ProductCard
                key={pr.id}
                product={pr}
                selected={p.product_ids.includes(pr.id)}
                onClick={() => toggleProduct(pr)}
              />
            ))}
          </div>
          <div className="modal-actions">
            <span className="muted">
              已选 {chosen.length} 件 ·{" "}
              {money(chosen.reduce((s, x) => s + x.price, 0))}
            </span>
            <button className="btn primary" onClick={() => setDrawer(false)}>
              完成选择
              <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
      {detail && (
        <ProductDetail
          product={detail}
          onClose={() => setDetail(null)}
          selected={p.product_ids.includes(detail.id)}
          onSelect={() => {
            toggleProduct(detail);
            setDetail(null);
          }}
        />
      )}
      {generate && (
        <Modal
          title="让想法，成为可见的方案"
          onClose={() => setGenerate(false)}
        >
          <p className="muted">
            选择本次生成方式。云端生成会使用已上传照片与所选产品作为参考。
          </p>
          <div className="mode-options">
            <button
              className={mode === "demo" ? "selected" : ""}
              onClick={() => setMode("demo")}
            >
              <Sparkles size={22} />
              <b>预置演示</b>
              <span>快速体验流程 · 免费</span>
              <small>使用预生成的风格示例，不对当前空间进行重绘。</small>
            </button>
            <button
              disabled={!settings?.configured || !settings?.live_enabled}
              className={mode === "live" ? "selected" : ""}
              onClick={() => setMode("live")}
            >
              <ImagePlus size={22} />
              <b>云端生成</b>
              <span>预计 US$ {settings?.estimated_cost.toFixed(2)}/张</span>
              <small>
                {settings?.configured && settings.live_enabled
                  ? "基于你的空间与参考产品生成"
                  : "需要先在服务器配置并启用模型"}
              </small>
            </button>
          </div>
          <div className="notice">
            {p.room.confirmed
              ? "房间尺寸已确认。方案生成后仍需核对家具尺度、通道与门窗。"
              : "请先在“户型与产品”中确认房间尺寸，然后再生成方案。"}
          </div>
          <button
            className="btn primary full"
            disabled={!p.room.confirmed}
            onClick={run}
          >
            确认并生成
            {mode === "live"
              ? " · US$ " + settings?.estimated_cost.toFixed(2)
              : " · 免费"}
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {share && (
        <Modal title="把喜欢的空间，分享出去" onClose={() => setShare(false)}>
          <p className="muted">
            客户将看到只读的品牌展示页、设计方案和所选产品，不需要注册账号。
          </p>
          {link ? (
            <>
              <div className="share-preview">
                <img src={p.cover} alt="分享方案封面" />
                <div>
                  <b>{p.title}</b>
                  <small>栖木家居 · 客户专属方案</small>
                </div>
              </div>
              <label className="field">
                方案链接
                <div className="copy-field">
                  <input
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? window.location.origin + link.path
                        : link.path
                    }
                  />
                  <button
                    className="icon-btn"
                    title="复制链接"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          window.location.origin + link.path,
                        );
                        setToast("分享链接已复制");
                      } catch {
                        setToast("请选中链接后手动复制");
                      }
                    }}
                  >
                    <Copy size={17} />
                  </button>
                </div>
              </label>
              <p className="fine">
                <Clock size={13} />
                有效期至 {new Date(link.expires_at).toLocaleDateString("zh-CN")}
              </p>
              <div className="modal-actions">
                <button
                  className="text-link danger-text"
                  onClick={async () => {
                    try {
                      await api("/share/" + link.token, { method: "DELETE" });
                      setLink(null);
                      setToast("分享链接已失效");
                    } catch (e) {
                      setToast((e as Error).message);
                    }
                  }}
                >
                  撤销链接
                </button>
                <a
                  className="btn primary"
                  href={link.path}
                  target="_blank"
                  rel="noreferrer"
                >
                  预览客户页面
                  <ExternalLink size={16} />
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="share-preview">
                <img src={image} alt="方案预览" />
                <div>
                  <b>7 天有效 · 只读访问</b>
                  <small>你可以随时撤销本次分享。</small>
                </div>
              </div>
              <button
                className="btn primary full"
                disabled={sharing}
                onClick={async () => {
                  setSharing(true);
                  try {
                    const result = await api<{
                      token: string;
                      path: string;
                      expires_at: string;
                    }>("/projects/" + id + "/share-links", {
                      method: "POST",
                      body: JSON.stringify({ days: 7 }),
                    });
                    setLink(result);
                  } catch (e) {
                    setToast((e as Error).message);
                  } finally {
                    setSharing(false);
                  }
                }}
              >
                {sharing ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <>
                    <Link2 size={17} />
                    创建分享链接
                  </>
                )}
              </button>
            </>
          )}
        </Modal>
      )}
      <Toast message={toast} />
    </Shell>
  );
}
function RoomControls({
  room,
  onChange,
}: {
  room: Room;
  onChange: (r: Room) => void;
}) {
  function change(key: string, value: string | number) {
    onChange({ ...room, [key]: value, confirmed: false });
  }
  return (
    <>
      <div className="field-row">
        <label className="field">
          宽度 / m
          <input
            type="number"
            min={2}
            max={20}
            step={0.1}
            value={room.width}
            onChange={(e) => change("width", +e.target.value)}
          />
        </label>
        <label className="field">
          长度 / m
          <input
            type="number"
            min={2}
            max={20}
            step={0.1}
            value={room.length}
            onChange={(e) => change("length", +e.target.value)}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          层高 / m
          <input
            type="number"
            min={2}
            max={6}
            step={0.1}
            value={room.height}
            onChange={(e) => change("height", +e.target.value)}
          />
        </label>
        <label className="field">
          户型形状
          <select
            value={room.shape}
            onChange={(e) =>
              onChange({
                ...room,
                shape: e.target.value,
                openings: [],
                confirmed: false,
              })
            }
          >
            <option value="rectangle">矩形</option>
            <option value="alcove">L 形凹角</option>
          </select>
        </label>
      </div>
      <div className="inline-heading">
        <h3>门与窗</h3>
        <button
          className="text-link"
          disabled={room.openings.length >= 12}
          onClick={() =>
            onChange({
              ...room,
              confirmed: false,
              openings: [
                ...room.openings,
                {
                  id: crypto.randomUUID(),
                  type: "window",
                  wall: 0,
                  position: room.width / 2,
                  width: 1,
                },
              ],
            })
          }
        >
          <Plus size={15} />
          添加
        </button>
      </div>
      <div className="openings">
        {room.openings.map((o, i) => (
          <div className="opening-item" key={o.id}>
            <div>
              <select
                aria-label="门窗类型"
                value={o.type}
                onChange={(e) =>
                  onChange({
                    ...room,
                    confirmed: false,
                    openings: room.openings.map((x, n) =>
                      n === i ? { ...x, type: e.target.value } : x,
                    ),
                  })
                }
              >
                <option value="door">门</option>
                <option value="window">窗</option>
              </select>
              <select
                aria-label="所在墙段"
                value={o.wall}
                onChange={(e) =>
                  onChange({
                    ...room,
                    confirmed: false,
                    openings: room.openings.map((x, n) =>
                      n === i ? { ...x, wall: +e.target.value } : x,
                    ),
                  })
                }
              >
                {Array.from(
                  { length: room.shape === "alcove" ? 6 : 4 },
                  (_, n) => (
                    <option key={n} value={n}>
                      墙段 {n + 1}
                    </option>
                  ),
                )}
              </select>
              <button
                className="icon-btn"
                title="删除门窗"
                onClick={() =>
                  onChange({
                    ...room,
                    confirmed: false,
                    openings: room.openings.filter((_, n) => n !== i),
                  })
                }
              >
                <X size={15} />
              </button>
            </div>
            <div className="field-row">
              <label>
                距墙段起点 / m
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.1}
                  value={o.position}
                  onChange={(e) =>
                    onChange({
                      ...room,
                      confirmed: false,
                      openings: room.openings.map((x, n) =>
                        n === i ? { ...x, position: +e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
              <label>
                宽度 / m
                <input
                  type="number"
                  min={0.3}
                  max={5}
                  step={0.1}
                  value={o.width}
                  onChange={(e) =>
                    onChange({
                      ...room,
                      confirmed: false,
                      openings: room.openings.map((x, n) =>
                        n === i ? { ...x, width: +e.target.value } : x,
                      ),
                    })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CustomerLeads({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<
      { name: string; contact: string; message: string; created_at: string }[]
    >([]),
    [error, setError] = useState("");
  return (
    <>
      <button
        className="text-link"
        style={{ marginTop: 22 }}
        onClick={async () => {
          setOpen(true);
          setError("");
          try {
            setItems(await api("/projects/" + projectId + "/leads"));
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        查看客户咨询
        <ArrowRight size={14} />
      </button>
      {open && (
        <Modal title="来自客户的想法" onClose={() => setOpen(false)}>
          {error ? (
            <p className="error">{error}</p>
          ) : items.length ? (
            items.map((item, i) => (
              <div key={i} className="notice">
                <b>
                  {item.name} · {item.contact}
                </b>
                <p>{item.message || "客户希望与您进一步沟通。"}</p>
                <small>
                  {new Date(item.created_at).toLocaleString("zh-CN")}
                </small>
              </div>
            ))
          ) : (
            <p className="muted">
              还没有咨询。将方案分享给客户后，他们可以在展示页提交预约。
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
