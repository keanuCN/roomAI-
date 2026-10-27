"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  Leaf,
  LoaderCircle,
} from "lucide-react";
import { api, Product, Version, money } from "@/lib/api";
import { Modal, ProductDetail, Loading, ErrorPanel } from "./ui";
type Data = {
  title: string;
  client: string;
  room_type: string;
  area: number;
  versions: Version[];
  cover: string;
  products: Product[];
  brand: { name: string; english: string; tagline: string };
  expires_at: string;
};
export default function Proposal({ token }: { token: string }) {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [detail, setDetail] = useState<Product | null>(null),
    [inquiry, setInquiry] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState("");
  useEffect(() => {
    api<Data>("/share/" + token)
      .then((d) => {
        setData(d);
        setVersion(d.versions.length - 1);
      })
      .catch((e) => setError(e.message));
  }, [token]);
  if (error)
    return (
      <div className="public-error">
        <h2>这个空间，暂时无法访问。</h2>
        <ErrorPanel message={error} />
      </div>
    );
  if (!data) return <Loading />;
  const img = (url: string) =>
    url.startsWith("/files/")
      ? url + "?share=" + encodeURIComponent(token)
      : url;
  const current = data.versions[version],
    total = data.products.reduce((s, p) => s + p.price, 0);
  return (
    <div className="proposal">
      <header className="proposal-nav">
        <a href="#" className="qimu-logo">
          {data.brand.name}
          <span>{data.brand.english}</span>
        </a>
        <span className="proposal-nav-copy">
          为真实的生活，寻找自然的答案。
        </span>
        <button className="btn primary small" onClick={() => setInquiry(true)}>
          联系设计顾问
          <ArrowUpRight size={17} />
        </button>
      </header>
      <main>
        <section className="proposal-hero">
          <img
            className="proposal-hero-image"
            src={img(current?.image || data.cover)}
            alt={data.title}
          />
          <div className="proposal-hero-copy">
            <div className="eyebrow">
              为{data.client}定制 · 方案 {String(version + 1).padStart(2, "0")}
            </div>
            <h1>
              把日常，
              <br />
              安放在自然里。
            </h1>
            <p>{current?.rationale || data.brand.tagline}</p>
          </div>
          <div className="proposal-image-footer">
            <span>
              {data.title} <i /> {data.area} m²
            </span>
            <span>
              {current?.mode === "live"
                ? "云端模型生成"
                : "预置演示效果 · 用于沟通参考"}
            </span>
          </div>
        </section>
        {data.versions.length > 1 && (
          <div className="proposal-versions">
            <span>探索不同的可能</span>
            {data.versions.map((v, i) => (
              <button
                key={v.id}
                className={i === version ? "active" : ""}
                onClick={() => setVersion(i)}
              >
                {v.name}
                <small>0{i + 1}</small>
              </button>
            ))}
          </div>
        )}
        <section className="proposal-products">
          <div className="proposal-section-title">
            <div className="eyebrow">THOUGHTFULLY SELECTED</div>
            <h2>让喜欢，落到每一件实物。</h2>
            <p>
              从空间到单品，延续自然的质感与温度。
              <br />
              这些被精心挑选的家居，是理想生活的具体模样。
            </p>
          </div>
          <div className="proposal-product-grid">
            {data.products.map((p) => (
              <button
                className="proposal-product"
                key={p.id}
                onClick={() => setDetail(p)}
              >
                <img src={p.image} alt={p.name} />
                <h3>{p.name}</h3>
                <p>{p.material}</p>
                <div>
                  <b>{money(p.price)}</b>
                  <ArrowRight size={20} />
                </div>
              </button>
            ))}
          </div>
          {!data.products.length && (
            <p className="muted">
              产品搭配正在斟酌中，欢迎和设计顾问聊聊你的想法。
            </p>
          )}
        </section>
        <section className="proposal-invite">
          <Leaf size={27} />
          <h2>
            关于家的下一步，
            <br />
            我们一起慢慢聊。
          </h2>
          <p>预约一次到店体验，亲手感受材质，也聊聊属于你的生活。</p>
          <button className="btn dark" onClick={() => setInquiry(true)}>
            预约设计咨询
            <ArrowRight size={17} />
          </button>
        </section>
        <footer className="proposal-footer">
          <span>
            {data.brand.name} / {data.brand.english}
          </span>
          <p>示例产品与价格。效果图用于沟通，尺寸需现场复核，非施工图。</p>
          <small>由 roomAI 栖间 提供空间方案支持</small>
        </footer>
      </main>
      <div className="proposal-sticky">
        <div className="sticky-product-images">
          {data.products.slice(0, 3).map((p) => (
            <img key={p.id} src={p.image} alt={p.name} />
          ))}
        </div>
        <span>已选 {data.products.length} 件产品</span>
        <div className="proposal-total">
          <small>参考总价</small>
          <b>{money(total)}</b>
        </div>
        <button className="btn primary" onClick={() => setInquiry(true)}>
          预约到店体验
          <ArrowRight size={18} />
        </button>
      </div>
      {detail && (
        <ProductDetail product={detail} onClose={() => setDetail(null)} />
      )}
      {inquiry && (
        <Modal
          title={sent ? "期待与你，一起构想生活" : "预约一次关于家的对话"}
          onClose={() => setInquiry(false)}
        >
          {sent ? (
            <div className="success-state">
              <CheckCircle2 size={44} />
              <h3>预约已提交</h3>
              <p className="muted">
                我们已收到你的联系方式，设计顾问会尽快联系你。
              </p>
              <button
                className="btn primary full"
                onClick={() => setInquiry(false)}
              >
                继续欣赏方案
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setFormError("");
                const fd = new FormData(e.currentTarget);
                try {
                  await api("/share/" + token + "/leads", {
                    method: "POST",
                    body: JSON.stringify({
                      name: fd.get("name"),
                      contact: fd.get("contact"),
                      message: fd.get("message"),
                      consent: fd.get("consent") === "on",
                    }),
                  });
                  setSent(true);
                } catch (e) {
                  setFormError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p className="muted">
                留下你的联系方式，我们会围绕这份方案与你沟通。
              </p>
              <label className="field">
                如何称呼你
                <input
                  name="name"
                  required
                  maxLength={60}
                  placeholder="你的姓名"
                />
              </label>
              <label className="field">
                手机 / 邮箱 / 微信
                <input
                  name="contact"
                  required
                  minLength={5}
                  maxLength={120}
                  placeholder="方便联系到你的方式"
                />
              </label>
              <label className="field">
                想和我们聊聊
                <textarea
                  name="message"
                  maxLength={1000}
                  rows={3}
                  placeholder="你喜欢的材质、到店时间，或任何关于家的想法…"
                />
              </label>
              <label className="check-label">
                <input type="checkbox" name="consent" required />
                <span>同意将上述联系方式用于本次设计咨询。</span>
              </label>
              {formError && <p className="error">{formError}</p>}
              <button className="btn primary full" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <>
                    提交预约
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
