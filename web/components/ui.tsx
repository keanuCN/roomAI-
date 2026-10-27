"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  FolderOpen,
  Armchair,
  Cloud,
  ArrowUpRight,
  X,
  Check,
  ChevronRight,
  ArrowLeft,
  LoaderCircle,
  Monitor,
  Leaf,
} from "lucide-react";
import { api, Product, Settings, money } from "@/lib/api";

export function Logo() {
  return (
    <span className="logo">
      <svg
        width="32"
        height="35"
        viewBox="0 0 34 38"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 16 17 4l14 12v19H3V16Z M12 35V21h10v14 M17 4v11 M7 17v-3"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
      <b>roomAI</b>
      <i>栖间</i>
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button,a,input,textarea,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    ref.current?.querySelector<HTMLElement>("button,input")?.focus();
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="关闭弹窗" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <LoaderCircle className="spin" size={26} />
      <span>正在打开你的空间…</span>
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Leaf size={30} />
      <p>{text}</p>
    </div>
  );
}
export function Shell({
  children,
  crumb = "工作台",
  actions,
}: {
  children: React.ReactNode;
  crumb?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-link">
          <Logo />
        </Link>
        <div className="workspace-label">设计工作空间</div>
        <nav>
          {[
            { href: "/", label: "工作台", icon: Home },
            { href: "/projects", label: "我的项目", icon: FolderOpen },
            { href: "/products", label: "灵感与产品", icon: Armchair },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              aria-label={label}
              className={
                "nav-item " +
                ((href === "/" ? pathname === "/" : pathname.startsWith(href))
                  ? "active"
                  : "")
              }
              key={href}
              href={href}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={25} />
          <p>
            让每个空间，
            <br />
            都有自己的答案。
          </p>
          <span>DESIGN WITH INTENTION</span>
        </div>
        <div className="sidebar-bottom">
          <button
            aria-label="云端模型设置"
            className="nav-item"
            onClick={() => setSettings(true)}
          >
            <Cloud size={19} />
            <span>云端模型设置</span>
          </button>
          <div className="profile">
            <span className="avatar">林</span>
            <div>
              <b>设计体验空间</b>
              <small>个人演示版</small>
            </div>
            <ChevronRight size={16} />
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="breadcrumb">
            <Link href="/">工作空间</Link>
            <span>/</span>
            <span>{crumb}</span>
          </div>
          <div className="top-actions">
            {actions || (
              <span className="demo-badge">
                <Monitor size={14} />
                演示模式
              </span>
            )}
          </div>
        </header>
        {children}
      </div>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Settings | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Settings>("/settings")
      .then(setS)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Modal title="云端模型设置" onClose={onClose}>
      <p className="muted">
        演示模式可直接体验。云端生成使用服务器配置的模型服务。
      </p>
      {error ? (
        <p className="error">{error}</p>
      ) : s ? (
        <>
          <div className="setting-status">
            <Cloud size={26} />
            <div>
              <b>
                {s.configured && s.live_enabled
                  ? "云端模型已就绪"
                  : "当前使用预置演示"}
              </b>
              <small>
                {s.provider} · {s.image_model || "尚未设置图像模型"}
              </small>
            </div>
            <span className="status-dot" />
          </div>
          <dl className="info-list">
            <div>
              <dt>预计单张费用</dt>
              <dd>US$ {s.estimated_cost.toFixed(2)}</dd>
            </div>
            <div>
              <dt>项目调用预算</dt>
              <dd>US$ {s.project_limit.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="notice">
            在服务器 .env 中设置 MODEL_API_KEY、IMAGE_MODEL 和
            MODEL_BASE_URL，并将 ENABLE_LIVE_GENERATION 设为 true 后重新启动 API
            与 Worker。密钥始终只保存在服务器。
          </div>
          <p className="fine">费用为配置的估算值，模型服务商按实际使用计费。</p>
        </>
      ) : (
        <Loading />
      )}
    </Modal>
  );
}
export function ProductCard({
  product,
  onClick,
  selected,
}: {
  product: Product;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      className={"product-card " + (selected ? "selected" : "")}
      onClick={onClick}
    >
      <div className="product-photo">
        <img src={product.image} alt={product.name} />
        {selected && (
          <span className="selected-mark">
            <Check size={15} />
          </span>
        )}
      </div>
      <small>{product.category} / QIMU COLLECTION</small>
      <h3>{product.name}</h3>
      <p>{product.material}</p>
      <div className="product-price">
        {money(product.price)}
        <ArrowUpRight size={19} />
      </div>
    </button>
  );
}
export function ProductDetail({
  product,
  onClose,
  onSelect,
  selected,
}: {
  product: Product;
  onClose: () => void;
  onSelect?: () => void;
  selected?: boolean;
}) {
  return (
    <Modal title="产品详情" onClose={onClose}>
      <img className="detail-image" src={product.image} alt={product.name} />
      <small className="eyebrow">QIMU COLLECTION / {product.category}</small>
      <h2>{product.name}</h2>
      <p className="muted">{product.description}</p>
      <dl className="info-list">
        <div>
          <dt>尺寸</dt>
          <dd>{product.size}</dd>
        </div>
        <div>
          <dt>材质</dt>
          <dd>{product.material}</dd>
        </div>
        <div>
          <dt>参考价格</dt>
          <dd>{money(product.price)}</dd>
        </div>
      </dl>
      {onSelect && (
        <button className="btn primary full" onClick={onSelect}>
          {selected ? "从方案中移除" : "加入设计方案"}
          <ArrowUpRight size={17} />
        </button>
      )}
      <p className="fine">示例产品与价格，用于验证展示流程。</p>
    </Modal>
  );
}
export function Toast({ message }: { message: string }) {
  return message ? (
    <div className="toast" role="status">
      <Check size={17} />
      {message}
    </div>
  ) : null;
}
export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="empty">
      <p className="error">{message}</p>
      {onRetry ? (
        <button className="btn" onClick={onRetry}>
          重新加载
        </button>
      ) : (
        <Link className="btn" href="/">
          <ArrowLeft size={16} />
          回到工作台
        </Link>
      )}
    </div>
  );
}
