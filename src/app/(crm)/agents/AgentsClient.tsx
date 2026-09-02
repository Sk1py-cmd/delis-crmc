"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Plus,
  MapPin,
  Camera,
  ShoppingBag,
  Store,
  Navigation,
  Trash2,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Card, Badge, Avatar, Progress, PageHeader, Modal, Tabs } from "@/shared/ui/kit";
import { Bars } from "@/shared/ui/charts";
import { money, compact, dt, timeOnly } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { exportXLSX } from "@/shared/lib/excel";
import { ImageUploader } from "@/shared/ui/ImageUploader";
import { ProductThumb } from "@/shared/ui/ProductThumb";
import { AgentMap, type VisitMarker } from "./AgentMap";
import { SmartImage } from "@/shared/ui/SmartImage";
import { AgentChat } from "./AgentChat";
import { AgentCompare } from "./AgentCompare";
import { AgentPush } from "./AgentPush";
import { AgentAppShareModal } from "@/widgets/AgentAppShareModal";
import { Smartphone } from "lucide-react";

export interface AgentLite {
  id: number;
  name: string;
  phone: string;
  telegram: string;
  email: string;
  region: string;
  route: string;
  plan: string;
  fact: string;
  commission: number;
  visits: number;
  avatarColor: string;
}

export interface AgentVisitLite {
  id: number;
  agentId: number;
  agentName: string;
  storeName: string;
  storeAddress: string;
  gpsCoords: string;
  status: string;
  orderTotal: string;
  notes: string;
  photos: string[];
  visitedAt: string;
}

export interface ProductLite {
  id: number;
  name: string;
  price: string;
  stock: number;
  image: string;
}

export function AgentsClient({
  agents,
  visits,
  products,
}: {
  agents: AgentLite[];
  visits: AgentVisitLite[];
  products: ProductLite[];
}) {
  const [tab, setTab] = useState("agents");
  const [add, setAdd] = useState(false);
  const [visitModal, setVisitModal] = useState(false);
  const [storeOrderModal, setStoreOrderModal] = useState(false);
  const [shareAppModal, setShareAppModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<number>(agents[0]?.id || 1);
  const [selectedVisitPhotos, setSelectedVisitPhotos] = useState<string[] | null>(null);

  const [form, setForm] = useState({
    name: "",
    region: "Toshkent",
    route: "",
    plan: "50000000",
    commission: 7,
    phone: "",
    telegram: "",
    email: "",
  });

  const [visitForm, setVisitForm] = useState({
    storeName: "Автомойка LUX Чиланзар",
    storeAddress: "г. Ташкент, ул. Бунёдкор, 24",
    gpsCoords: "41.2858, 69.2035",
    status: "order_placed",
    orderTotal: "450000",
    notes: "Проверена выкладка автохимии DELIS, заказано 10 шампуней и керамический воск",
    photos: [] as string[],
  });

  const [orderForm, setOrderForm] = useState({
    storeName: "Детейлинг центр Prestige",
    storeAddress: "г. Ташкент, ул. Нукусская, 88",
    notes: "Срочная поставка автошампуня и воска для кузова",
    items: [] as { productId: number; qty: number }[],
  });

  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const fact = agents.reduce((a, x) => a + Number(x.fact), 0);
  const plan = agents.reduce((a, x) => a + Number(x.plan), 0);
  const commission = agents.reduce((a, x) => a + (Number(x.fact) * x.commission) / 100, 0);

  const create = async () => {
    setBusy(true);
    try {
      await postManage("createAgent", { ...form, plan: Number(form.plan), commission: Number(form.commission) });
      toast(`Агент ${form.name} добавлен`);
      setAdd(false);
      setForm({ name: "", region: "Toshkent", route: "", plan: "50000000", commission: 7, phone: "", telegram: "", email: "" });
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const recordVisit = async () => {
    if (!visitForm.storeName.trim()) {
      toast("Укажите название торговой точки", "err");
      return;
    }
    setBusy(true);
    try {
      await postManage("addAgentVisit", {
        agentId: selectedAgentId,
        storeName: visitForm.storeName,
        storeAddress: visitForm.storeAddress,
        gpsCoords: visitForm.gpsCoords,
        status: visitForm.status,
        orderTotal: Number(visitForm.orderTotal) || 0,
        notes: visitForm.notes,
        photos: visitForm.photos,
      });
      toast(`Визит торговой точки «${visitForm.storeName}» и фотоотчёт сохранены`);
      setVisitModal(false);
      setVisitForm({
        storeName: "Автомойка LUX Чиланзар",
        storeAddress: "г. Ташкент, ул. Бунёдкор, 24",
        gpsCoords: "41.2858, 69.2035",
        status: "order_placed",
        orderTotal: "450000",
        notes: "",
        photos: [],
      });
      setTab("visits");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "err");
    }
    setBusy(false);
  };

  const createStoreOrder = async () => {
    if (orderForm.items.length === 0) {
      toast("Добавьте хотя бы один товар в заказ", "err");
      return;
    }
    setBusy(true);
    try {
      const res = await postManage("createAgentStoreOrder", {
        agentId: selectedAgentId,
        storeName: orderForm.storeName,
        storeAddress: orderForm.storeAddress,
        items: orderForm.items,
        notes: orderForm.notes,
      });
      toast(`B2B заказ от торговой точки «${orderForm.storeName}» успешно оформлен!`);
      setStoreOrderModal(false);
      setOrderForm({
        storeName: "Детейлинг центр Prestige",
        storeAddress: "г. Ташкент, ул. Нукусская, 88",
        notes: "",
        items: [],
      });
      setTab("visits");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка оформления заказа", "err");
    }
    setBusy(false);
  };

  const stats = [
    { label: "Агентов", value: String(agents.length), color: "#8b5cf6", icon: "🧑‍💼" },
    { label: "План", value: compact(plan), color: "#3b82f6", icon: "🎯" },
    { label: "Факт", value: compact(fact), color: "#22c55e", icon: "💰" },
    { label: "Выполнение", value: `${((fact / Math.max(plan, 1)) * 100).toFixed(0)}%`, color: "#f97316", icon: "📈" },
    { label: "Комиссия", value: compact(commission), color: "#ec4899", icon: "🤝" },
    { label: "Визитов и точек", value: String(visits.length + agents.reduce((a, x) => a + x.visits, 0)), color: "#14b8a6", icon: "📍" },
  ];

  const exportXlsx = async () => {
    const headers = ["Имя", "Телефон", "Telegram", "Email", "Регион", "Маршрут", "План", "Факт", "Выполнение %", "Комиссия %", "Визитов"];
    const rows = agents.map((a) => [
      a.name,
      a.phone,
      a.telegram,
      a.email,
      a.region,
      a.route,
      a.plan,
      a.fact,
      ((Number(a.fact) / Math.max(Number(a.plan), 1)) * 100).toFixed(1),
      String(a.commission),
      String(a.visits),
    ]);
    try {
      await exportXLSX(headers, rows, `delis-agents-${new Date().toISOString().slice(0, 10)}`);
      toast("Отчёт по агентам выгружен в XLSX");
    } catch {
      toast("Не удалось выгрузить файл", "err");
    }
  };

  const orderFormTotal = orderForm.items.reduce((acc, i) => {
    const pr = products.find((p) => p.id === i.productId);
    return acc + Number(pr?.price || 0) * i.qty;
  }, 0);

  return (
    <>
      <PageHeader
        title="CRM агентов и Торговых точек"
        subtitle="Полевые продажи DELIS: маршруты, торговые точки, GPS-визиты, фотоотчёты и комиссия"
        actions={
          <>
            <button
              className="btn"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(59,130,246,0.22))",
                borderColor: "rgba(124,58,237,0.4)",
              }}
              onClick={() => setShareAppModal(true)}
            >
              <Smartphone size={15} color="var(--primary)" /> 📲 Как установить агентам (QR)
            </button>
            <button className="btn" onClick={exportXlsx}>
              <Download size={15} /> Экспорт XLSX
            </button>
            <button
              className="btn"
              onClick={() => {
                setSelectedAgentId(agents[0]?.id || 1);
                setVisitModal(true);
              }}
            >
              <Camera size={15} /> + Фотоотчёт визита
            </button>
            <button
              className="btn"
              onClick={() => {
                setSelectedAgentId(agents[0]?.id || 1);
                setStoreOrderModal(true);
              }}
            >
              <ShoppingBag size={15} /> + Заказ точки
            </button>
            <button className="btn btn-primary" onClick={() => setAdd(true)}>
              <Plus size={15} /> Добавить агента
            </button>
          </>
        }
      />

      <div className="grid gap-[var(--gap)] grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => (
          <Card key={s.label} delay={i * 0.04}>
            <div className="text-[0.72rem] uppercase tracking-wider muted">{s.label}</div>
            <div className="text-xl font-semibold mt-2" style={{ color: s.color }}>
              {s.icon} {s.value}
            </div>
          </Card>
        ))}
      </div>

      <Card hover={false} className="flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { key: "agents", label: "Агенты и KPI", count: agents.length },
            { key: "visits", label: "Торговые точки, GPS и Фотоотчёты", count: visits.length },
            { key: "map", label: "🗺️ GPS-карта" },
            { key: "chat", label: "💬 Чат с агентом" },
            { key: "compare", label: "📊 Сравнение агентов" },
          ]}
        />
      </Card>

      {tab === "agents" && (
        <>
          <div className="grid gap-[var(--gap)] xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <h3 className="font-semibold mb-3">Выполнение плана по агентам</h3>
              <Bars data={agents.map((a) => ({ name: a.name.split(" ")[0], value: Number(a.fact) }))} />
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Регионы и Маршруты</h3>
              <div className="flex flex-col gap-3">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold">{a.region}</span>
                      <div className="text-xs muted">{a.route || "маршрут не назначен"}</div>
                    </div>
                    <span className="font-semibold">{compact(a.fact)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl p-3 text-xs muted" style={{ background: "rgba(var(--table-row))" }}>
                📍 GPS-трекинг маршрутов и торговых точек активен · синхронизация 1 мин назад
              </div>
            </Card>
          </div>

          <div className="grid gap-[var(--gap)] md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a, i) => {
              const pct = (Number(a.fact) / Math.max(Number(a.plan), 1)) * 100;
              return (
                <Card key={a.id} delay={i * 0.05}>
                  <div className="flex items-center gap-3">
                    <Avatar name={a.name} color={a.avatarColor} size={50} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{a.name}</div>
                      <div className="text-xs muted truncate">
                        {a.region} · {a.route || "маршрут не назначен"}
                      </div>
                    </div>
                    <Badge color={pct >= 100 ? "#22c55e" : "#f97316"}>{pct.toFixed(0)}%</Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs muted mb-1.5">
                      <span>Факт {compact(a.fact)}</span>
                      <span>План {compact(a.plan)}</span>
                    </div>
                    <Progress value={pct} color={a.avatarColor} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    {[
                      ["Визиты", String(a.visits)],
                      ["Комиссия", `${a.commission}%`],
                      ["К выплате", money((Number(a.fact) * a.commission) / 100)],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-2xl p-2.5" style={{ background: "rgba(var(--table-row))" }}>
                        <div className="muted">{k}</div>
                        <div className="font-semibold mt-0.5 truncate">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link href="/chat" className="btn flex-1 justify-center !text-xs">
                      Чат
                    </Link>
                    <button
                      className="btn flex-1 justify-center !text-xs"
                      onClick={() => {
                        setSelectedAgentId(a.id);
                        setVisitModal(true);
                      }}
                    >
                      <Camera size={13} /> + Визит
                    </button>
                    <button
                      className="btn btn-primary flex-1 justify-center !text-xs"
                      onClick={() => {
                        setSelectedAgentId(a.id);
                        setStoreOrderModal(true);
                      }}
                    >
                      <ShoppingBag size={13} /> + Заказ
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {tab === "map" && (
        <AgentMap visits={visits.map((v) => ({ ...v }))} />
      )}

      {tab === "chat" && (
        <AgentChat agents={agents} />
      )}

      {tab === "compare" && (
        <AgentCompare agents={agents} />
      )}

      {tab === "visits" && (
        <div className="flex flex-col gap-4">
          <Card hover={false} className="!p-0">
            <div className="card-pad pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store size={18} color="var(--primary)" />
                <h3 className="font-semibold">Лента визитов и фотоотчётов по торговым точкам</h3>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn"
                  onClick={() => {
                    setSelectedAgentId(agents[0]?.id || 1);
                    setVisitModal(true);
                  }}
                >
                  <Camera size={14} /> + Отметить визит
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedAgentId(agents[0]?.id || 1);
                    setStoreOrderModal(true);
                  }}
                >
                  <ShoppingBag size={14} /> + Оформить заказ точки
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4">
              {visits.map((v) => {
                const hasOrder = Number(v.orderTotal) > 0;
                return (
                  <div
                    key={v.id}
                    className="rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                    style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge color="var(--primary)">{v.agentName}</Badge>
                        <span className="font-bold text-base">{v.storeName}</span>
                        <span className="text-xs muted">· {v.storeAddress}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs muted mb-2">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} color="var(--accent)" /> GPS:{" "}
                          <span className="font-mono text-[11px]">{v.gpsCoords}</span>
                        </span>
                        <span>{dt(v.visitedAt)}</span>
                      </div>

                      <p className="text-sm text-[var(--text)] leading-relaxed">{v.notes}</p>

                      {v.photos && v.photos.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          {v.photos.map((imgUrl, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedVisitPhotos(v.photos)}
                              className="relative rounded-xl overflow-hidden border transition-transform hover:scale-105"
                              style={{ width: 56, height: 56, borderColor: "rgba(var(--border))" }}
                            >
                              <SmartImage
                                src={imgUrl}
                                alt="Фотоотчёт"
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            </button>
                          ))}
                          <button
                            onClick={() => setSelectedVisitPhotos(v.photos)}
                            className="btn !py-1 !px-2.5 text-xs"
                          >
                            <Camera size={13} /> {v.photos.length} фото
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 shrink-0">
                      {hasOrder ? (
                        <Badge color="#22c55e">
                          <CheckCircle2 size={13} /> Заказ {money(v.orderTotal)}
                        </Badge>
                      ) : (
                        <Badge color="#6b7280">Без заказа</Badge>
                      )}
                      <span className="text-xs muted">{timeOnly(v.visitedAt)}</span>
                    </div>
                  </div>
                );
              })}

              {visits.length === 0 && (
                <div className="text-center py-12 muted text-sm">
                  Визитов пока нет — нажмите «+ Отметить визит», чтобы добавить первый отчёт
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Push-уведомления агентам о приближении к плану */}
      <AgentPush agents={agents} />
      {add && (
        <Modal open onClose={() => setAdd(false)} title="Новый агент" wide>
          <div className="grid md:grid-cols-2 gap-3.5">
            <input className="input" placeholder="Имя и фамилия" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Регион" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            <input className="input" placeholder="Маршрут (районы)" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
            <input className="input" placeholder="План (сум)" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
            <input className="input" placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input" placeholder="Telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} />
            <input className="input md:col-span-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="md:col-span-2">
              <label className="text-xs muted uppercase tracking-wider">Комиссия — {form.commission}%</label>
              <input type="range" min={3} max={15} value={form.commission} onChange={(e) => setForm({ ...form, commission: Number(e.target.value) })} className="w-full mt-2 accent-[var(--primary)]" />
            </div>
          </div>
          <button className="btn btn-primary w-full justify-center mt-4" disabled={busy} onClick={create}>
            {busy ? "Сохраняем…" : "Добавить агента"}
          </button>
        </Modal>
      )}

      {/* Модалка визита и фотоотчёта */}
      {visitModal && (
        <Modal open onClose={() => setVisitModal(false)} title="Отметить визит торговой точки и фотоотчёт" wide>
          <div className="flex flex-col gap-3.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Торговый агент</label>
                <select
                  className="input"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Название торговой точки</label>
                <input
                  className="input"
                  placeholder="Автомойка LUX Чиланзар"
                  value={visitForm.storeName}
                  onChange={(e) => setVisitForm({ ...visitForm, storeName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Адрес торговой точки</label>
                <input
                  className="input"
                  placeholder="г. Ташкент, ул. Бунёдкор, 24"
                  value={visitForm.storeAddress}
                  onChange={(e) => setVisitForm({ ...visitForm, storeAddress: e.target.value })}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs muted uppercase tracking-wider">GPS координаты</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const coords = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                            setVisitForm({ ...visitForm, gpsCoords: coords });
                            toast("📍 GPS координаты автоматически получены!");
                          },
                          () => toast("Не удалось получить GPS, используем дефолтные", "err"),
                        );
                      } else {
                        toast("Геолокация не поддерживается браузером", "err");
                      }
                    }}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    📍 Моя геопозиция
                  </button>
                </div>
                <input
                  className="input font-mono"
                  placeholder="41.2858, 69.2035"
                  value={visitForm.gpsCoords}
                  onChange={(e) => setVisitForm({ ...visitForm, gpsCoords: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Статус визита</label>
                <select
                  className="input"
                  value={visitForm.status}
                  onChange={(e) => setVisitForm({ ...visitForm, status: e.target.value })}
                >
                  <option value="order_placed">Оформлен заказ</option>
                  <option value="completed">Визит завершён без заказа</option>
                </select>
              </div>

              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Сумма заказа на точке (сум)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="450000"
                  value={visitForm.orderTotal}
                  onChange={(e) => setVisitForm({ ...visitForm, orderTotal: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Примечания агента / мерчендайзинг</label>
              <textarea
                className="input min-h-20"
                placeholder="Что было сделано во время визита, наличие продукции DELIS, выкладка..."
                value={visitForm.notes}
                onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Фотоотчёт с торговой точки</label>
              <ImageUploader
                images={visitForm.photos}
                onChange={(imgs) => setVisitForm({ ...visitForm, photos: imgs })}
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={recordVisit}
                disabled={busy}
                className="btn btn-primary flex-1 justify-center"
              >
                {busy ? "Сохраняем…" : "Сохранить визит и фотоотчёт"}
              </button>
              <button
                type="button"
                onClick={() => setVisitModal(false)}
                className="btn"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Модалка оформления заказа от торговой точки */}
      {storeOrderModal && (
        <Modal open onClose={() => setStoreOrderModal(false)} title="Оформить B2B заказ для торговой точки" wide>
          <div className="flex flex-col gap-3.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Агент</label>
                <select
                  className="input"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(Number(e.target.value))}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs muted uppercase tracking-wider block mb-1">Название торговой точки</label>
                <input
                  className="input"
                  placeholder="Детейлинг центр Prestige"
                  value={orderForm.storeName}
                  onChange={(e) => setOrderForm({ ...orderForm, storeName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Адрес торговой точки</label>
              <input
                className="input"
                placeholder="г. Ташкент, ул. Нукусская, 88"
                value={orderForm.storeAddress}
                onChange={(e) => setOrderForm({ ...orderForm, storeAddress: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">
                Выбранные товары в заказ ({orderForm.items.length})
              </label>
              <div className="flex flex-col gap-2 mt-1 max-h-[30vh] overflow-y-auto">
                {orderForm.items.map((it, idx) => {
                  const pr = products.find((p) => p.id === it.productId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-2xl p-2.5"
                      style={{ background: "rgba(var(--table-row))" }}
                    >
                      <ProductThumb src={pr?.image || "🧴"} name={pr?.name} size={36} radius={10} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{pr?.name || "Товар"}</div>
                        <div className="text-xs muted">{money(pr?.price || 0)} × {it.qty} шт</div>
                      </div>
                      <input
                        type="number"
                        min={1}
                        className="input !w-20 text-right"
                        value={it.qty}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value) || 1);
                          setOrderForm((f) => ({
                            ...f,
                            items: f.items.map((x, i) => (i === idx ? { ...x, qty } : x)),
                          }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setOrderForm((f) => ({
                            ...f,
                            items: f.items.filter((_, i) => i !== idx),
                          }))
                        }
                        className="btn !px-2"
                      >
                        <Trash2 size={13} color="var(--error)" />
                      </button>
                    </div>
                  );
                })}
                {orderForm.items.length === 0 && (
                  <div
                    className="text-center py-6 text-sm muted rounded-2xl border border-dashed"
                    style={{ borderColor: "rgba(var(--border))" }}
                  >
                    Выберите продукцию DELIS из каталога ниже
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Каталог товаров (нажмите для добавления)</label>
              <div className="flex flex-wrap gap-2 max-h-[25vh] overflow-y-auto p-1">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const existing = orderForm.items.find((i) => i.productId === p.id);
                      if (existing) {
                        setOrderForm((f) => ({
                          ...f,
                          items: f.items.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i)),
                        }));
                      } else {
                        setOrderForm((f) => ({
                          ...f,
                          items: [...f.items, { productId: p.id, qty: 1 }],
                        }));
                      }
                    }}
                    className="chip hover:scale-105 transition-transform"
                    style={{ borderColor: "rgba(var(--border))" }}
                  >
                    + {p.name} <span className="muted">({money(p.price)})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs muted uppercase tracking-wider block mb-1">Комментарий к заказу</label>
              <input
                className="input"
                placeholder="Срочная поставка автошампуня и воска для кузова"
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </div>

            <div
              className="rounded-2xl p-3.5 flex justify-between items-center"
              style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
            >
              <span className="font-semibold text-sm">Итоговая сумма заказа точки</span>
              <span className="text-xl font-extrabold" style={{ color: "var(--success)" }}>
                {money(orderFormTotal)}
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={createStoreOrder}
                disabled={busy || orderForm.items.length === 0}
                className="btn btn-primary flex-1 justify-center"
              >
                {busy ? "Оформляем…" : `Оформить заказ · ${money(orderFormTotal)}`}
              </button>
              <button
                type="button"
                onClick={() => setStoreOrderModal(false)}
                className="btn"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Модалка просмотра фотоотчёта визита */}
      {selectedVisitPhotos && (
        <Modal open onClose={() => setSelectedVisitPhotos(null)} title="Фотоотчёт торгового агента">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {selectedVisitPhotos.map((imgUrl, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(var(--border))" }}>
                <SmartImage
                  src={imgUrl}
                  alt={`Фотоотчёт ${i + 1}`}
                  width={800}
                  height={600}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
          <button className="btn w-full justify-center mt-4" onClick={() => setSelectedVisitPhotos(null)}>
            Закрыть фотоотчёт
          </button>
        </Modal>
      )}

      {/* Модалка с QR-кодом и инструкцией установки для агентов */}
      <AgentAppShareModal
        open={shareAppModal}
        onClose={() => setShareAppModal(false)}
      />
    </>
  );
}
