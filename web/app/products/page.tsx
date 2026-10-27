"use client";
import { useState, useEffect } from "react";
import { Search, Leaf, ArrowUpRight } from "lucide-react";
import { api, Product } from "@/lib/api";
import {
  Shell,
  ProductCard,
  ProductDetail,
  Loading,
  ErrorPanel,
  Empty,
} from "@/components/ui";
export default function Page() {
  const [products, setProducts] = useState<Product[]>([]),
    [active, setActive] = useState<Product | null>(null),
    [query, setQuery] = useState(""),
    [cat, setCat] = useState("全部"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api<Product[]>("/products")
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const shown = products.filter(
    (p) =>
      (cat === "全部" || p.category === cat) &&
      (p.name + p.material).includes(query),
  );
  return (
    <Shell crumb="灵感与产品">
      <main className="dashboard">
        <div className="catalog-hero">
          <div>
            <span className="eyebrow">QIMU / A CONSIDERED COLLECTION</span>
            <h1>
              让喜欢，
              <br />
              落到每一件实物。
            </h1>
            <p>自然材质，克制线条。为你的空间寻找恰到好处的答案。</p>
          </div>
          <img src="/assets/sofa.png" alt="栖木家居亚麻沙发" />
        </div>
        <div className="list-toolbar">
          <div className="tabs">
            {["全部", "沙发", "茶几", "柜体", "建材"].map((t) => (
              <button
                key={t}
                className={cat === t ? "active" : ""}
                onClick={() => setCat(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="搜索产品或材质"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorPanel message={error} />
        ) : shown.length ? (
          <div className="catalog-grid">
            {shown.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={() => setActive(p)}
              />
            ))}
          </div>
        ) : (
          <Empty text="换个关键词，发现更多合适的产品。" />
        )}
        <div className="catalog-note">
          <Leaf size={18} />
          <span>示例品牌与产品目录 · 价格仅供方案展示参考</span>
        </div>
      </main>
      {active && (
        <ProductDetail product={active} onClose={() => setActive(null)} />
      )}
    </Shell>
  );
}
