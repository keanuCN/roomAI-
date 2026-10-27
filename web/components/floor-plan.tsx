"use client";
import { useRef, useState } from "react";
import {
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
  Undo2,
  Redo2,
} from "lucide-react";
import { Product, Room, Furniture, area } from "@/lib/api";
export function points(r: Room): number[][] {
  return r.shape === "alcove"
    ? [
        [0, 0],
        [r.width, 0],
        [r.width, r.length * 0.65],
        [r.width * 0.7, r.length * 0.65],
        [r.width * 0.7, r.length],
        [0, r.length],
      ]
    : [
        [0, 0],
        [r.width, 0],
        [r.width, r.length],
        [0, r.length],
      ];
}
export default function FloorPlan({
  room,
  products,
  onChange,
}: {
  room: Room;
  products: Product[];
  onChange: (r: Room) => void;
}) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [selected, setSelected] = useState(""),
    [zoom, setZoom] = useState(1),
    [past, setPast] = useState<Room[]>([]),
    [future, setFuture] = useState<Room[]>([]);
  const startRoom = useRef<Room | null>(null);
  const scale = Math.min(540 / room.width, 360 / room.length) * zoom,
    ox = 380 - (room.width * scale) / 2,
    oy = 270 - (room.length * scale) / 2;
  const outline = points(room);
  function local(e: React.PointerEvent) {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    );
    return { x: (p.x - ox) / scale, y: (p.y - oy) / scale };
  }
  function commit(r: Room) {
    setPast((p) => [...p.slice(-19), structuredClone(room)]);
    setFuture([]);
    onChange(r);
  }
  function updateSelected(fn: (f: Furniture) => Furniture) {
    commit({
      ...room,
      furniture: room.furniture.map((f) => (f.id === selected ? fn(f) : f)),
    });
  }
  return (
    <div className="plan-wrap">
      <div className="plan-tools">
        <span>
          <Move size={14} />
          拖拽家具调整布局
        </span>
        <div>
          <button
            className="icon-btn"
            aria-label="撤销布局"
            disabled={!past.length}
            onClick={() => {
              setFuture((f) => [...f, room]);
              onChange(past[past.length - 1]);
              setPast((p) => p.slice(0, -1));
            }}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-btn"
            aria-label="重做布局"
            disabled={!future.length}
            onClick={() => {
              setPast((p) => [...p, room]);
              onChange(future[future.length - 1]);
              setFuture((f) => f.slice(0, -1));
            }}
          >
            <Redo2 size={16} />
          </button>
          <button
            className="icon-btn"
            aria-label="缩小户型"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
          >
            <ZoomOut size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            className="icon-btn"
            aria-label="放大户型"
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      <svg
        ref={svg}
        className="plan-svg"
        viewBox="0 0 760 540"
        role="img"
        aria-label="可编辑房间平面图"
        onPointerMove={(e) => {
          if (!drag.current) return;
          const { x, y } = local(e);
          const f = room.furniture.find((f) => f.id === drag.current!.id)!;
          const p = products.find((p) => p.id === f.product_id)!;
          let w = p.width,
            d = p.depth;
          if (f.rotation % 180) [w, d] = [d, w];
          let xx = Math.max(
              0,
              Math.min(
                room.width - w,
                Math.round((x - drag.current.dx) * 20) / 20,
              ),
            ),
            yy = Math.max(
              0,
              Math.min(
                room.length - d,
                Math.round((y - drag.current.dy) * 20) / 20,
              ),
            );
          if (
            room.shape === "alcove" &&
            xx + w > room.width * 0.7 &&
            yy + d > room.length * 0.65
          )
            yy = Math.max(0, room.length * 0.65 - d);
          onChange({
            ...room,
            furniture: room.furniture.map((i) =>
              i.id === f.id ? { ...i, x: xx, y: yy } : i,
            ),
          });
        }}
        onPointerUp={() => {
          if (drag.current && startRoom.current) {
            setPast((p) => [...p.slice(-19), startRoom.current!]);
            setFuture([]);
          }
          drag.current = null;
          startRoom.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="dots"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".7" fill="#d2d4c9" />
          </pattern>
        </defs>
        <rect width="760" height="540" fill="#f7f8f2" />
        <rect width="760" height="540" fill="url(#dots)" />
        <polygon
          points={outline
            .map(([x, y]) => ox + x * scale + "," + (oy + y * scale))
            .join(" ")}
          fill="#fffef9"
          stroke="#535c4d"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <line
          x1={ox}
          x2={ox + room.width * scale}
          y1={oy - 29}
          y2={oy - 29}
          stroke="#9ba38f"
        />
        {[ox, ox + room.width * scale].map((x, i) => (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={oy - 35}
            y2={oy - 22}
            stroke="#9ba38f"
          />
        ))}
        <text
          x={ox + (room.width * scale) / 2}
          y={oy - 37}
          textAnchor="middle"
          fill="#67735c"
          fontSize="13"
        >
          {room.width.toFixed(2)} m
        </text>
        <line
          x1={ox - 29}
          x2={ox - 29}
          y1={oy}
          y2={oy + room.length * scale}
          stroke="#9ba38f"
        />
        <text
          transform={
            "translate(" +
            (ox - 40) +
            "," +
            (oy + (room.length * scale) / 2) +
            ") rotate(-90)"
          }
          textAnchor="middle"
          fill="#67735c"
          fontSize="13"
        >
          {room.length.toFixed(2)} m
        </text>
        {room.openings.map((o) => {
          const a = outline[o.wall],
            b = outline[(o.wall + 1) % outline.length];
          if (!a || !b) return null;
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const dx = (b[0] - a[0]) / l,
            dy = (b[1] - a[1]) / l;
          const x = ox + (a[0] + dx * (o.position - o.width / 2)) * scale,
            y = oy + (a[1] + dy * (o.position - o.width / 2)) * scale;
          return (
            <g key={o.id}>
              <line
                x1={x}
                y1={y}
                x2={x + dx * o.width * scale}
                y2={y + dy * o.width * scale}
                stroke={o.type === "door" ? "#b39a75" : "#9fbbc0"}
                strokeWidth="7"
              />
              <text
                x={x - dy * 16}
                y={y + dx * 16}
                fill="#89937d"
                fontSize="10"
              >
                {o.type === "door" ? "门" : "窗"}
              </text>
            </g>
          );
        })}
        <text x={380} y={270} textAnchor="middle" fill="#b4b6a8" fontSize="17">
          {area(room)} m²
        </text>
        {room.furniture.map((f) => {
          const p = products.find((p) => p.id === f.product_id);
          if (!p) return null;
          const w = (f.rotation % 180 ? p.depth : p.width) * scale,
            d = (f.rotation % 180 ? p.width : p.depth) * scale;
          return (
            <g
              key={f.id}
              role="button"
              tabIndex={0}
              aria-label={p.name + "，点击选择，可使用方向键移动"}
              className="plan-furniture"
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  const x =
                      f.x +
                      (e.key === "ArrowLeft"
                        ? -0.05
                        : e.key === "ArrowRight"
                          ? 0.05
                          : 0),
                    y =
                      f.y +
                      (e.key === "ArrowUp"
                        ? -0.05
                        : e.key === "ArrowDown"
                          ? 0.05
                          : 0);
                  commit({
                    ...room,
                    furniture: room.furniture.map((v) =>
                      v.id === f.id
                        ? {
                            ...v,
                            x: Math.max(0, Math.min(room.width - w / scale, x)),
                            y: Math.max(
                              0,
                              Math.min(room.length - d / scale, y),
                            ),
                          }
                        : v,
                    ),
                  });
                }
              }}
              onFocus={() => setSelected(f.id)}
              onPointerDown={(e) => {
                e.stopPropagation();
                setSelected(f.id);
                startRoom.current = structuredClone(room);
                const pt = local(e);
                drag.current = { id: f.id, dx: pt.x - f.x, dy: pt.y - f.y };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              transform={
                "translate(" +
                (ox + f.x * scale) +
                "," +
                (oy + f.y * scale) +
                ")"
              }
            >
              <rect
                width={w}
                height={d}
                rx={p.id === "table" ? Math.min(w, d) / 2 : 5}
                fill={p.color}
                fillOpacity=".65"
                stroke={selected === f.id ? "#475b39" : "#b0a590"}
                strokeWidth={selected === f.id ? 2 : 1}
              />
              {p.id === "sofa" && (
                <>
                  <rect
                    x="5"
                    y="5"
                    width={w - 10}
                    height={d * 0.32}
                    rx="3"
                    fill="#c1b69c"
                    fillOpacity=".5"
                  />
                  <line
                    x1={w / 3}
                    x2={w / 3}
                    y1={d * 0.35}
                    y2={d - 5}
                    stroke="#b7ad96"
                  />
                  <line
                    x1={(w * 2) / 3}
                    x2={(w * 2) / 3}
                    y1={d * 0.35}
                    y2={d - 5}
                    stroke="#b7ad96"
                  />
                </>
              )}
              <text
                x={w / 2}
                y={d / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fill="#5c574a"
              >
                {p.category}
              </text>
            </g>
          );
        })}
        <text x="380" y="510" textAnchor="middle" fill="#a2a796" fontSize="11">
          尺寸以米为单位 · 现场复核后确认
        </text>
      </svg>
      {selected && room.furniture.some((f) => f.id === selected) && (
        <div className="furniture-actions">
          <span>
            {
              products.find(
                (p) =>
                  p.id ===
                  room.furniture.find((f) => f.id === selected)?.product_id,
              )?.category
            }
          </span>
          <button
            className="icon-btn"
            title="旋转 90°"
            onClick={() =>
              updateSelected((f) => {
                const p = products.find((p) => p.id === f.product_id)!;
                const rot = (f.rotation + 90) % 360,
                  w = rot % 180 ? p.depth : p.width,
                  d = rot % 180 ? p.width : p.depth;
                return {
                  ...f,
                  rotation: rot,
                  x: Math.max(0, Math.min(room.width - w, f.x)),
                  y: Math.max(0, Math.min(room.length - d, f.y)),
                };
              })
            }
          >
            <RotateCw size={16} />
          </button>
          <button
            className="icon-btn"
            title="移除家具占位"
            onClick={() => {
              commit({
                ...room,
                furniture: room.furniture.filter((f) => f.id !== selected),
              });
              setSelected("");
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
