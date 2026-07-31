"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Navigation,
  CheckCircle2,
  Camera,
  ShoppingBag,
  Store,
  Compass,
  MessageCircle,
  Send,
  LogOut,
  MapPin,
  X,
  Search,
  Check,
  Languages,
  Plus,
  Minus,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Car,
  Home,
  Utensils,
  Shirt,
  Bath,
  Flame,
  Award,
  TrendingUp,
  Clock,
  Phone,
  Eye,
  Info,
  BadgeCheck,
  FileCheck2,
  RotateCcw,
  Sun, Moon,
} from "lucide-react";
import { Card, Badge, Avatar, Progress, Modal } from "@/shared/ui/kit";
import { money, compact, dt, timeOnly } from "@/shared/lib/format";
import { useToast } from "@/shared/ui/Toast";
import { postManage } from "@/shared/lib/manage";
import { LOCALES, type Locale } from "@/shared/i18n/locales";
import { useLocale } from "@/shared/store/locale";
import { ImageUploader } from "@/shared/ui/ImageUploader";
import { ProductThumb } from "@/shared/ui/ProductThumb";
import { cacheProducts, getCachedProducts, saveOfflineOrder, getPendingOrders, markOrderSynced, isOnline } from "@/shared/lib/offline";
import { notifyOrderCreated, notifyAgentOrder } from "@/shared/lib/push";

interface Product {
  id: number;
  name: string;
  sku?: string;
  price: string;
  cost?: string;
  stock: number;
  image: string;
  images?: string[];
  category?: string;
  volume?: string;
  isPopular?: boolean;
  isNew?: boolean;
  description?: string;
}

interface Visit {
  id: number;
  storeName: string;
  storeAddress: string;
  gpsCoords: string;
  status: string;
  orderTotal: string;
  notes: string;
  photos: string[];
  visitedAt: string;
}

interface Agent {
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

interface CartItem {
  product: Product;
  qty: number;
}

const UI_PORTAL = {
  ru: {
    title: "DELIS Agent Mobile",
    online: "Онлайн · GPS активен",
    route: "Маршрут на сегодня",
    performance: "План и продажи",
    visited: "Визиты",
    earned: "Моя комиссия",
    addVisit: "Отметить визит",
    addOrder: "Оформить B2B-заказ",
    chat: "Чат с офисом",
    planLabel: "План на месяц",
    factLabel: "Факт продаж",
    payoutLabel: "К выплате",
    visitHistory: "История визитов сегодня",
    noVisits: "Сегодня визитов ещё не было. Начните обход маршрута!",
    geolocationSuccess: "📍 GPS-координаты получены успешно!",
    orderPlaced: "Заказ оформлен",
    completedNoOrder: "Визит без заказа",
    catalog: "B2B-Каталог DELIS",
    searchPlaceholder: "Поиск по названию, объёму, артикулу…",
    allCategories: "Все товары",
    addToCart: "В корзину",
    inStock: "На складе",
    cartTitle: "Оформление B2B-заказа",
    storeName: "Название торговой точки (автомойка, магазин)",
    storeAddress: "Адрес точки",
    orderNotes: "Примечания к заказу",
    submitOrder: "Подтвердить и отправить заказ",
    cartEmpty: "Корзина пуста. Выберите продукцию в каталоге!",
    pcs: "шт",
    total: "Итого к оплате",
    commissionEarned: "Ваша комиссия с этого заказа",
    productDetails: "Информация о товаре",
    outOfStock: "Нет в наличии",
    hit: "ХИТ",
    newBadge: "НОВИНКА",
    specVolume: "Объём",
    specSku: "Артикул",
    quickAdd: "Быстрый дозаказ",
    gpsCheckin: "GPS Чекин и Фотоотчёт",
    gpsHint: "Нажмите кнопку ниже для определения текущих координат на точке",
    merchandisingTags: "Быстрые отметки мерчендайзинга",
    tag1: "Выкладка на уровне глаз",
    tag2: "POS-материалы размещены",
    tag3: "Ассортимент пополнен",
    tag4: "Брака и просрочек нет",
    tag5: "Презентовали новинку",
    saveVisitBtn: "Зафиксировать визит и фотоотчёт",
    orderTotalLabel: "Сумма заказа на точке (сум)",
    visitStatusLabel: "Результат визита",
    chatPlaceholder: "Написать сообщение руководителю…",
    chatTitle: "Прямая связь с офисом DELIS",
    tabHome: "Кабинет",
    tabCatalog: "Каталог",
    tabVisits: "Визиты",
    tabChat: "Чат",
    viewDetails: "Подробнее",
    itemsCount: "позиций",
    close: "Закрыть",
    selectCategory: "Категории продукции",
  },
  uz: {
    title: "DELIS Agent Mobile",
    online: "Onlayn · GPS faol",
    route: "Bugungi marshrut",
    performance: "Reja va savdo",
    visited: "Tashriflar",
    earned: "Mening komissiyam",
    addVisit: "Tashrifni belgilash",
    addOrder: "B2B buyurtma berish",
    chat: "Ofis bilan chat",
    planLabel: "Oylik reja",
    factLabel: "Fakt savdo",
    payoutLabel: "To'lanadigan",
    visitHistory: "Bugungi tashriflar tarixi",
    noVisits: "Bugun hali tashriflar bo'lmadi. Marshrutni boshlang!",
    geolocationSuccess: "📍 GPS-koordinatalari muvaffaqiyatli olindi!",
    orderPlaced: "Buyurtma berildi",
    completedNoOrder: "Buyurtmasiz tashrif",
    catalog: "DELIS B2B Katalogi",
    searchPlaceholder: "Nomi, hajmi yoki kodi bo'yicha qidirish…",
    allCategories: "Barcha tovarlar",
    addToCart: "Savatga",
    inStock: "Omborda",
    cartTitle: "B2B buyurtmani rasmiylashtirish",
    storeName: "Savdo nuqtasi nomi (avtomoyka, do'kon)",
    storeAddress: "Nuqta manzili",
    orderNotes: "Buyurtma izohi",
    submitOrder: "Tasdiqlash va buyurtma yuborish",
    cartEmpty: "Savat bo'sh. Katalogdan mahsulotlarni tanlang!",
    pcs: "dona",
    total: "Jami to'lov",
    commissionEarned: "Ushbu buyurtmadan sizning komissiyangiz",
    productDetails: "Mahsulot ma'lumotlari",
    outOfStock: "Mavjud emas",
    hit: "XIT",
    newBadge: "YANGI",
    specVolume: "Hajm",
    specSku: "Artikul",
    quickAdd: "Tezkor qo'shish",
    gpsCheckin: "GPS Chekin va Foto hisobot",
    gpsHint: "Nuqtadagi joriy koordinatalarni aniqlash uchun quyidagi tugmani bosing",
    merchandisingTags: "Merchendayzing tezkor belgilari",
    tag1: "Ko'z balandligida terilgan",
    tag2: "POS-materiallar o'rnatildi",
    tag3: "Assortiment to'ldirildi",
    tag4: "Yaroqsiz tovar yo'q",
    tag5: "Yangi mahsulot taqdim etildi",
    saveVisitBtn: "Tashrif va foto hisobotni saqlash",
    orderTotalLabel: "Nuqtadagi buyurtma summasi (so'm)",
    visitStatusLabel: "Tashrif natijasi",
    chatPlaceholder: "Rahbariyatga xabar yozish…",
    chatTitle: "DELIS ofisi bilan to'g'ridan-to'g'ri aloqa",
    tabHome: "Kabinet",
    tabCatalog: "Katalog",
    tabVisits: "Tashriflar",
    tabChat: "Chat",
    viewDetails: "Batafsil",
    itemsCount: "ta mahsulot",
    close: "Yopish",
    selectCategory: "Mahsulot toifalari",
  },
  en: {
    title: "DELIS Agent Mobile",
    online: "Online · GPS Active",
    route: "Today's Route",
    performance: "Target & Sales",
    visited: "Visits",
    earned: "My Commission",
    addVisit: "Record Visit",
    addOrder: "New B2B Order",
    chat: "Chat with Office",
    planLabel: "Monthly Target",
    factLabel: "Actual Sales",
    payoutLabel: "Payout Amount",
    visitHistory: "Today's Visit History",
    noVisits: "No visits recorded today. Start your field route!",
    geolocationSuccess: "📍 GPS coordinates acquired successfully!",
    orderPlaced: "Order Placed",
    completedNoOrder: "Visit without order",
    catalog: "DELIS B2B Catalog",
    searchPlaceholder: "Search by title, volume, SKU…",
    allCategories: "All Products",
    addToCart: "Add to cart",
    inStock: "In stock",
    cartTitle: "B2B Order Checkout",
    storeName: "Retail Store Name (car wash, detailing, store)",
    storeAddress: "Store Address",
    orderNotes: "Order Notes",
    submitOrder: "Confirm & Submit Order",
    cartEmpty: "Cart is empty. Select products from the catalog!",
    pcs: "pcs",
    total: "Total Amount",
    commissionEarned: "Your commission from this order",
    productDetails: "Product Details",
    outOfStock: "Out of Stock",
    hit: "HOT",
    newBadge: "NEW",
    specVolume: "Volume",
    specSku: "SKU",
    quickAdd: "Quick add",
    gpsCheckin: "GPS Check-in & Photo Report",
    gpsHint: "Press the button below to get current store coordinates",
    merchandisingTags: "Quick Merchandising Tags",
    tag1: "Eye-level display verified",
    tag2: "POS materials installed",
    tag3: "Assortment restocked",
    tag4: "No defects or expired items",
    tag5: "New lineup presented",
    saveVisitBtn: "Save Visit & Photo Report",
    orderTotalLabel: "Order Total at Store (UZS)",
    visitStatusLabel: "Visit Outcome",
    chatPlaceholder: "Write a message to headquarters…",
    chatTitle: "Direct Line with DELIS HQ",
    tabHome: "Portal",
    tabCatalog: "Catalog",
    tabVisits: "Visits",
    tabChat: "Chat",
    viewDetails: "Details",
    itemsCount: "items",
    close: "Close",
    selectCategory: "Product Categories",
  },
} as const;

const CATEGORY_ICONS: Record<string, typeof Car> = {
  "Auto Care": Car,
  "Home Care": Home,
  Kitchen: Utensils,
  Laundry: Shirt,
  Bathroom: Bath,
};

export function AgentPortalClient({
  agent,
  products,
  visits,
}: {
  agent: Agent;
  products: Product[];
  visits: Visit[];
}) {
  const [activeTab, setActiveTab] = useState<"home" | "catalog" | "visits" | "chat">("home");
  const [langOpen, setLangOpen] = useState(false);
  const [visitModal, setVisitModal] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [installModal, setInstallModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  // Сторы локали и тостов
  const { locale, setLocale } = useLocale();
  const toast = useToast();
  const router = useRouter();

  const utr = UI_PORTAL[locale as keyof typeof UI_PORTAL] ?? UI_PORTAL.ru;

  // Поиск и категории в каталоге
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");

  // Состояние корзины B2B
  const [cart, setCart] = useState<CartItem[]>([]);

  // Состояния форм
  const [visitForm, setVisitForm] = useState({
    storeName: "Автомойка LUX Чиланзар",
    storeAddress: "г. Ташкент, ул. Бунёдкор, 24",
    gpsCoords: "41.2858, 69.2035",
    status: "order_placed",
    orderTotal: "450000",
    notes: "",
    photos: [] as string[],
  });

  const [checkoutForm, setCheckoutForm] = useState({
    storeName: "Автомойка LUX Чиланзар",
    storeAddress: "г. Ташкент, ул. Бунёдкор, 24",
    notes: "B2B заказ через мобильный каталог DELIS Agent",
  });

  // Чат с офисом
  const [chatText, setText] = useState("");
  const [chatMsgs, setChatMsgs] = useState([
    { id: 1, body: "Шохрух, привет! Отличные показатели на этой неделе. Ждём фотоотчёты по новой автохимии.", fromAdmin: true, time: "09:45" },
    { id: 2, body: "Здравствуйте! Да, уже на точке Чиланзар, приняли крупный заказ на шампунь 5L и керамический воск 👍", fromAdmin: false, time: "10:12" },
  ]);

  const sendMsg = () => {
    if (!chatText.trim()) return;
    const now = new Date();
    setChatMsgs((prev) => [
      ...prev,
      {
        id: Date.now(),
        body: chatText.trim(),
        fromAdmin: false,
        time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      },
    ]);
    setText("");
    toast("Сообщение отправлено в офис DELIS");
  };

  const pct = (Number(agent.fact) / Math.max(Number(agent.plan), 1)) * 100;
  const payout = (Number(agent.fact) * agent.commission) / 100;

  // ── ОФФЛАЙН-КЭШ ТОВАРОВ ──
  useEffect(() => {
    if (products.length > 0) void cacheProducts(products);
  }, [products]);

  // ── СЛУШАЕМ ОНЛАЙН/ОФФЛАЙН ──
  useEffect(() => {
    const upd = () => setIsOffline(!isOnline());
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);

  // ── СИНХРОНИЗАЦИЯ ОТЛОЖЕННЫХ ЗАКАЗОВ ──
  useEffect(() => {
    const checkPending = async () => {
      const pending = await getPendingOrders();
      setPendingOrders(pending.length);
    };
    void checkPending();
    const iv = setInterval(checkPending, 10000);
    return () => clearInterval(iv);
  }, []);

  const syncOfflineOrders = async () => {
    const pending = await getPendingOrders();
    if (pending.length === 0) { toast("Нет отложенных заказов для синхронизации"); return; }
    setBusy(true);
    let synced = 0;
    for (const o of pending) {
      try {
        await postManage("createAgentStoreOrder", {
          agentId: Number(o.agentId),
          storeName: String(o.storeName),
          storeAddress: String(o.storeAddress),
          items: o.items as { productId: number; qty: number }[],
          notes: String(o.notes),
        });
        await markOrderSynced(o.id);
        synced++;
      } catch { /* пропускаем ошибку */ }
    }
    setPendingOrders((await getPendingOrders()).length);
    setBusy(false);
    toast(`Синхронизировано заказов: ${synced}`);
    router.refresh();
  };

  // Фильтрация каталога
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.volume && p.volume.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCat === "all" || p.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCat]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  // Функции корзины
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const exist = prev.find((item) => item.product.id === product.id);
      if (exist) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: Math.min(item.qty + quantity, product.stock) }
            : item
        );
      }
      return [...prev, { product, qty: Math.min(quantity, product.stock) }];
    });
    toast(`+${quantity} ${product.name.replace("DELIS ", "")}`);
  };

  const updateCartQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const nextQty = item.qty + delta;
            return { ...item, qty: Math.min(Math.max(0, nextQty), item.product.stock) };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.product.price) * item.qty, 0);
  }, [cart]);

  const cartCommission = useMemo(() => {
    return (cartTotal * agent.commission) / 100;
  }, [cartTotal, agent.commission]);

  const handleRecordVisit = async () => {
    if (!visitForm.storeName.trim()) {
      toast(utr.storeName, "err");
      return;
    }
    setBusy(true);
    try {
      await postManage("addAgentVisit", {
        agentId: agent.id,
        storeName: visitForm.storeName,
        storeAddress: visitForm.storeAddress,
        gpsCoords: visitForm.gpsCoords,
        status: visitForm.status,
        orderTotal: Number(visitForm.orderTotal) || 0,
        notes: visitForm.notes,
        photos: visitForm.photos,
      });
      toast(`✅ ${utr.geolocationSuccess}`);
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
      setActiveTab("visits");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "err");
    }
    setBusy(false);
  };

  const handleCreateB2BOrder = async () => {
    if (!checkoutForm.storeName.trim()) {
      toast(utr.storeName, "err");
      return;
    }
    setBusy(true);

    // Оффлайн: сохраняем локально
    if (isOffline) {
      await saveOfflineOrder({
        agentId: agent.id,
        storeName: checkoutForm.storeName,
        storeAddress: checkoutForm.storeAddress,
        items: cart.map((item) => ({ productId: item.product.id, qty: item.qty })),
        notes: checkoutForm.notes,
      });
      setCheckoutModal(false);
      setCart([]);
      const pending = await getPendingOrders();
      setPendingOrders(pending.length);
      setBusy(false);
      toast(`💾 Заказ сохранён локально! Синхронизируется при восстановлении интернета`);
      return;
    }

    try {
      await postManage("createAgentStoreOrder", {
        agentId: agent.id,
        storeName: checkoutForm.storeName,
        storeAddress: checkoutForm.storeAddress,
        items: cart.map((item) => ({ productId: item.product.id, qty: item.qty })),
        notes: checkoutForm.notes,
      });
      toast(`🎉 ${utr.orderPlaced}!`);
      setCheckoutModal(false);
      setCart([]);
      setActiveTab("visits");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "err");
    }
    setBusy(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("delis_token");
    window.location.assign("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col max-w-md mx-auto relative overflow-hidden text-[var(--text)] select-none"
      style={{
        background: darkMode ? "var(--bg-2)" : "#f4f4f7",
        boxShadow: "0 0 50px rgba(0,0,0,0.5)",
      }}
    >
      {/* ─── APP HEADER ─── */}
      <header
        className="glass !rounded-b-3xl !rounded-t-none p-4 sticky top-0 z-30 flex items-center justify-between border-b"
        style={{ borderColor: "rgba(var(--border))" }}
      >
        {/* OFFLINE BANNER */}
        {isOffline && (
          <div className="absolute top-0 left-0 right-0 bg-amber-500 text-black text-[10px] font-bold text-center py-1">
            ⚠️ Оффлайн — заказы сохраняются локально
          </div>
        )}
        {!isOffline && pendingOrders > 0 && (
          <button onClick={syncOfflineOrders} className="absolute top-0 left-0 right-0 bg-green-500 text-white text-[10px] font-bold text-center py-1">
            📡 {pendingOrders} отложенных заказа — нажмите для синхронизации
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar name={agent.name} color={agent.avatarColor} size={40} />
            <motion.span
              animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black"
              style={{ background: "#22c55e" }}
            />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm truncate flex items-center gap-1.5">
              <span>{agent.name}</span>
              <BadgeCheck size={14} color="var(--primary)" />
            </div>
            <div className="text-[10px] muted flex items-center gap-1">
              <MapPin size={10} color="var(--primary)" />
              <span className="truncate">{agent.region} · {agent.route || utr.route}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Темная/светлая тема */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn !px-2 !py-1.5 !rounded-xl"
            onClick={() => setDarkMode((v) => !v)}
            title={darkMode ? "Светлая тема" : "Тёмная тема"}
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>

          {/* Язык */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="btn !px-2.5 !py-1.5 !rounded-xl text-xs font-bold"
              onClick={() => setLangOpen((v) => !v)}
            >
              <span>{LOCALES[locale]?.flag}</span>
              <span className="hidden xs:inline uppercase">{locale}</span>
            </motion.button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  className="glass card-pad !p-1.5 absolute right-0 mt-2 w-40 z-50 shadow-2xl"
                >
                  {Object.entries(LOCALES).map(([code, l]) => (
                    <button
                      key={code}
                      onClick={() => {
                        setLocale(code as Locale);
                        setLangOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        background: locale === code ? "rgba(var(--table-row))" : "transparent",
                        color: locale === code ? "var(--primary)" : "inherit",
                        fontWeight: locale === code ? 700 : 500,
                      }}
                    >
                      <span className="text-base">{l.flag}</span>
                      <span>{l.nativeName}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn !px-2 !py-1.5 !rounded-xl"
            onClick={logout}
            style={{ color: "var(--error)" }}
            title="Log out"
          >
            <LogOut size={15} />
          </motion.button>
        </div>
      </header>

      {/* ─── MAIN SCROLLABLE CONTENT ─── */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 flex flex-col gap-4">
        
        {/* ════ TAB 1: HOME & PERFORMANCE ════ */}
        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {/* KPI Banner */}
            <Card hover={false} className="relative overflow-hidden !p-5">
              <div
                className="absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl opacity-30"
                style={{ background: agent.avatarColor }}
              />
              
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[11px] muted uppercase tracking-wider font-semibold">
                    {utr.performance}
                  </div>
                  <div className="text-3xl font-black mt-1" style={{ color: agent.avatarColor }}>
                    {pct.toFixed(0)}%
                    <span className="text-xs font-semibold muted ml-2">выполнено</span>
                  </div>
                </div>
                <div
                  className="w-10 h-10 rounded-2xl grid place-items-center"
                  style={{
                    background: `color-mix(in srgb, ${agent.avatarColor} 20%, transparent)`,
                    color: agent.avatarColor,
                  }}
                >
                  <TrendingUp size={20} />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs muted mb-1.5">
                  <span>{utr.factLabel}: <b className="text-[var(--text)]">{compact(agent.fact)}</b></span>
                  <span>{utr.planLabel}: <b className="text-[var(--text)]">{compact(agent.plan)}</b></span>
                </div>
                <Progress value={pct} color={agent.avatarColor} />
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
                >
                  <div className="text-[10px] muted uppercase font-bold flex items-center gap-1">
                    <Store size={12} color="var(--primary)" /> {utr.visited}
                  </div>
                  <div className="font-extrabold text-base mt-1">
                    {agent.visits} <span className="text-xs font-normal muted">точек</span>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-3"
                  style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
                >
                  <div className="text-[10px] muted uppercase font-bold flex items-center gap-1">
                    <Award size={12} color="var(--success)" /> {utr.earned}
                  </div>
                  <div className="font-extrabold text-base mt-1" style={{ color: "var(--success)" }}>
                    {money(payout)}
                  </div>
                </div>
              </div>
            </Card>

            {/* 📲 PWA Install Banner */}
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={() => setInstallModal(true)}
              className="rounded-2xl p-3 flex items-center justify-between cursor-pointer border"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(59,130,246,0.18))",
                borderColor: "rgba(124,58,237,0.35)",
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-violet-500/25 text-violet-300 grid place-items-center shrink-0">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate text-violet-200">
                    Установить на экран телефона
                  </div>
                  <div className="text-[10px] muted truncate">
                    Работает во весь экран и без интернета
                  </div>
                </div>
              </div>
              <Badge color="var(--primary)">Инструкция</Badge>
            </motion.div>

            {/* Быстрые действия */}
            <div className="grid grid-cols-2 gap-2.5">
              <motion.button
                whileTap={{ scale: 0.96 }}
                className="btn btn-primary justify-center !py-3.5 !rounded-2xl shadow-lg flex items-center gap-2"
                onClick={() => setVisitModal(true)}
              >
                <Camera size={18} />
                <span className="font-bold text-xs">{utr.addVisit}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                className="btn justify-center !py-3.5 !rounded-2xl shadow-lg flex items-center gap-2"
                onClick={() => setActiveTab("catalog")}
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, transparent), rgba(var(--surface),0.8))",
                  borderColor: "color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                <ShoppingBag size={18} color="var(--primary)" />
                <span className="font-bold text-xs">{utr.addOrder}</span>
              </motion.button>
            </div>

            {/* Маршрут на сегодня */}
            <Card hover={false} className="!p-4">
              <div className="font-bold text-sm mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Compass size={16} color="var(--primary)" /> {utr.route}
                </span>
                <Badge color="var(--primary)">{agent.region}</Badge>
              </div>

              <div
                className="rounded-2xl p-3.5 flex items-center gap-3"
                style={{
                  background: "rgba(var(--table-row))",
                  border: "1px dashed rgba(var(--border))",
                }}
              >
                <div
                  className="w-10 h-10 rounded-2xl grid place-items-center shrink-0 font-extrabold text-lg"
                  style={{
                    background: "linear-gradient(135deg, var(--primary), var(--accent))",
                    color: "#fff",
                  }}
                >
                  📍
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold leading-tight">
                    {agent.route || "Чиланзар — Юнусабад (Автомойки & Детейлинг)"}
                  </div>
                  <div className="text-[10px] muted mt-1 flex items-center gap-1">
                    <Clock size={10} />
                    <span>8 запланированных точек · План: {money(Number(agent.plan) / 22)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Топ популярной автохимии */}
            <Card hover={false} className="!p-4">
              <div className="font-bold text-sm mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={15} color="#f59e0b" /> Топ B2B продаж DELIS
                </span>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  Все →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {products.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer active:scale-95 transition-transform"
                    style={{ background: "rgba(var(--table-row))", border: "1px solid rgba(var(--border))" }}
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-black/20 mb-2 flex items-center justify-center">
                      <ProductThumb src={p.images?.[0] || p.image} name={p.name} size={64} radius={10} />
                    </div>
                    <div className="text-[11px] font-bold truncate">{p.name.replace("DELIS ", "")}</div>
                    <div className="text-xs font-extrabold text-green-400 mt-1">{money(p.price)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ════ TAB 2: B2B CATALOG ════ */}
        {activeTab === "catalog" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-lg font-black tracking-tight">{utr.catalog}</h2>
                <p className="text-xs muted">{products.length} {utr.itemsCount}</p>
              </div>
              <Badge color="var(--primary)">{cart.length} в заказе</Badge>
            </div>

            {/* Поиск */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
              <input
                className="input !pl-10 !py-2.5 text-xs !rounded-2xl"
                placeholder={utr.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 muted"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Категории продукции с иконками */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCat("all")}
                className="chip whitespace-nowrap !py-2 !px-3 !rounded-2xl font-bold text-xs"
                style={{
                  background: selectedCat === "all" ? "var(--primary)" : "rgba(var(--table-row))",
                  color: selectedCat === "all" ? "#fff" : "var(--muted)",
                  borderColor: selectedCat === "all" ? "transparent" : "rgba(var(--border))",
                }}
              >
                <Layers size={13} /> {utr.allCategories}
              </motion.button>

              {categories.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat] || Package;
                const active = selectedCat === cat;
                return (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCat(cat)}
                    className="chip whitespace-nowrap !py-2 !px-3 !rounded-2xl font-bold text-xs flex items-center gap-1.5"
                    style={{
                      background: active ? "var(--primary)" : "rgba(var(--table-row))",
                      color: active ? "#fff" : "var(--muted)",
                      borderColor: active ? "transparent" : "rgba(var(--border))",
                    }}
                  >
                    <IconComponent size={13} />
                    <span>{cat}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Сетка товаров */}
            <div className="grid grid-cols-2 gap-2.5">
              {filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.product.id === p.id);
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-3xl p-3 flex flex-col justify-between gap-2.5 relative overflow-hidden"
                    style={{ border: "1px solid rgba(var(--border))" }}
                  >
                    {/* Бейджи */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
                      {p.isPopular && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-purple-600 text-white shadow">
                          {utr.hit}
                        </span>
                      )}
                      {p.isNew && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-blue-500 text-white shadow">
                          {utr.newBadge}
                        </span>
                      )}
                    </div>

                    {/* Фото товара */}
                    <div
                      onClick={() => setSelectedProduct(p)}
                      className="aspect-square rounded-2xl overflow-hidden bg-black/25 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                    >
                      <ProductThumb src={p.images?.[0] || p.image} name={p.name} size={115} radius={14} />
                    </div>

                    {/* Инфо */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div onClick={() => setSelectedProduct(p)} className="cursor-pointer">
                        <div className="text-xs font-bold line-clamp-2 leading-tight">
                          {p.name.replace("DELIS ", "")}
                        </div>
                        <div className="text-[10px] muted flex items-center justify-between mt-1">
                          <span className="font-semibold">{p.volume || "1 L"}</span>
                          <span className={p.stock < 15 ? "text-red-400 font-bold" : "text-neutral-400"}>
                            {p.stock} {utr.pcs}
                          </span>
                        </div>
                      </div>

                      {/* Цена и кнопка корзины */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <div className="text-xs font-black" style={{ color: "var(--text)" }}>
                          {money(p.price)}
                        </div>

                        {inCart ? (
                          <div className="flex items-center gap-1.5 bg-purple-500/20 rounded-xl p-0.5 border border-purple-500/40">
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              onClick={() => updateCartQty(p.id, -1)}
                              className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold"
                            >
                              <Minus size={11} />
                            </motion.button>
                            <span className="text-xs font-extrabold px-1">{inCart.qty}</span>
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              onClick={() => updateCartQty(p.id, 1)}
                              className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow"
                              disabled={inCart.qty >= p.stock}
                            >
                              <Plus size={11} />
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => addToCart(p, 1)}
                            disabled={p.stock <= 0}
                            className="btn !py-1 !px-2.5 !text-[10px] btn-primary !rounded-xl font-bold shadow"
                          >
                            + {utr.addToCart}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ════ TAB 3: VISITS & TIMELINE ════ */}
        {activeTab === "visits" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="font-extrabold text-sm">{utr.visitHistory}</span>
              <button
                onClick={() => setVisitModal(true)}
                className="btn btn-primary !py-1 !px-2.5 !text-xs !rounded-xl"
              >
                <Plus size={13} /> {utr.addVisit}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {visits.map((v) => {
                const hasOrder = Number(v.orderTotal) > 0;
                return (
                  <Card key={v.id} hover={false} className="!p-4 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm truncate flex items-center gap-1.5">
                          <span>{v.storeName}</span>
                          <Store size={14} color="var(--primary)" />
                        </div>
                        <div className="text-[11px] muted truncate mt-0.5">{v.storeAddress}</div>
                      </div>
                      <Badge color={hasOrder ? "#22c55e" : "#8b5cf6"}>
                        {hasOrder ? utr.orderPlaced : utr.completedNoOrder}
                      </Badge>
                    </div>

                    {v.notes && (
                      <p className="text-xs text-white/90 leading-relaxed bg-white/5 rounded-2xl p-2.5">
                        {v.notes}
                      </p>
                    )}

                    {v.photos && v.photos.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {v.photos.map((p, idx) => (
                          <div
                            key={idx}
                            className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shadow"
                          >
                            <img src={p} alt="Отчёт" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] muted pt-2 border-t border-white/5 mt-1 font-semibold">
                      <span className="flex items-center gap-1 font-mono">
                        <MapPin size={11} color="var(--accent)" /> {v.gpsCoords}
                      </span>
                      {hasOrder ? (
                        <span className="text-green-400 font-extrabold">{money(v.orderTotal)}</span>
                      ) : (
                        <span>{timeOnly(v.visitedAt)}</span>
                      )}
                    </div>
                  </Card>
                );
              })}

              {visits.length === 0 && (
                <div className="text-center py-12 muted text-sm glass rounded-3xl p-6">
                  {utr.noVisits}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════ TAB 4: LIVE CHAT WITH HQ ════ */}
        {activeTab === "chat" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-[calc(100vh-220px)]"
          >
            <Card hover={false} className="flex-1 flex flex-col !p-0 overflow-hidden">
              <div
                className="p-3 border-b flex items-center justify-between text-xs font-bold"
                style={{ borderColor: "rgba(var(--border))" }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>{utr.chatTitle}</span>
                </div>
                <Badge color="var(--primary)">Online</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {chatMsgs.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`max-w-[82%] ${m.fromAdmin ? "self-start" : "self-end"}`}
                  >
                    <div
                      className="px-3.5 py-2.5 text-xs leading-relaxed font-medium"
                      style={{
                        background: m.fromAdmin
                          ? "rgba(var(--surface),0.85)"
                          : "linear-gradient(120deg,var(--primary),var(--accent))",
                        color: "#fff",
                        borderRadius: m.fromAdmin ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
                        border: m.fromAdmin ? "1px solid rgba(var(--border))" : "none",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                      }}
                    >
                      {m.body}
                    </div>
                    <div className={`text-[9px] muted mt-1 ${m.fromAdmin ? "" : "text-right"}`}>
                      {m.time}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div
                className="p-2.5 border-t flex gap-2 bg-black/20"
                style={{ borderColor: "rgba(var(--border))" }}
              >
                <input
                  className="input !text-xs !py-2.5 !rounded-2xl flex-1"
                  placeholder={utr.chatPlaceholder}
                  value={chatText}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="btn btn-primary !px-3.5 !rounded-2xl"
                  onClick={sendMsg}
                >
                  <Send size={15} />
                </motion.button>
              </div>
            </Card>
          </motion.div>
        )}
      </main>

      {/* ─── FLOATING B2B CART BAR ─── */}
      <AnimatePresence>
        {cart.length > 0 && activeTab === "catalog" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCheckoutModal(true)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-3xl text-white font-extrabold text-xs shadow-2xl border border-white/20"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 14px 30px -6px rgba(124,58,237,0.5)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-white/20 grid place-items-center text-xs">
                  🛍️
                </span>
                <span>{cart.length} {utr.itemsCount}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">{money(cartTotal)}</span>
                <span className="w-6 h-6 rounded-full bg-white text-purple-600 grid place-items-center text-xs">
                  →
                </span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BOTTOM NAVIGATION BAR ─── */}
      <footer
        className="glass !rounded-t-3xl !rounded-b-none p-2 fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t flex justify-around z-30"
        style={{ borderColor: "rgba(var(--border))" }}
      >
        {[
          { key: "home", label: utr.tabHome, icon: Smartphone },
          { key: "catalog", label: utr.tabCatalog, icon: Layers, badge: cart.length > 0 ? cart.length : null },
          { key: "visits", label: utr.tabVisits, icon: Store },
          { key: "chat", label: utr.tabChat, icon: MessageCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-colors relative"
              style={{ color: active ? "var(--primary)" : "var(--muted)" }}
            >
              <Icon size={19} />
              <span className="text-[10px] font-bold">{tab.label}</span>
              {tab.badge && (
                <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-purple-600 text-white font-black text-[9px] grid place-items-center shadow">
                  {tab.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </footer>

      {/* ─── MODAL: PRODUCT DETAILS ─── */}
      {selectedProduct && (
        <Modal
          open={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          title={utr.productDetails}
        >
          <div className="flex flex-col gap-4">
            <div className="aspect-video rounded-3xl overflow-hidden bg-black/25 flex items-center justify-center">
              <ProductThumb
                src={selectedProduct.images?.[0] || selectedProduct.image}
                name={selectedProduct.name}
                size={160}
                radius={20}
              />
            </div>

            <div>
              <h3 className="text-base font-extrabold leading-snug">{selectedProduct.name}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs muted">
                <Badge color="var(--primary)">{selectedProduct.category || "Auto Care"}</Badge>
                <span>{utr.specVolume}: <b>{selectedProduct.volume || "1 L"}</b></span>
                <span>{utr.inStock}: <b>{selectedProduct.stock} {utr.pcs}</b></span>
              </div>
            </div>

            <p className="text-xs muted leading-relaxed">
              {selectedProduct.description ||
                "Профессиональная автохимия DELIS премиум-класса для автомоек и детейлинг центров."}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div>
                <div className="text-[10px] muted uppercase font-bold">Оптовая цена</div>
                <div className="text-lg font-black text-green-400">{money(selectedProduct.price)}</div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  addToCart(selectedProduct, 1);
                  setSelectedProduct(null);
                }}
                className="btn btn-primary !rounded-2xl !py-2.5 font-bold text-xs"
              >
                + {utr.addToCart}
              </motion.button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: CHECK-IN & PHOTO REPORT ─── */}
      {visitModal && (
        <Modal open onClose={() => setVisitModal(false)} title={utr.gpsCheckin} wide>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                {utr.storeName}
              </label>
              <input
                className="input !text-xs !rounded-xl"
                placeholder="Автомойка LUX Чиланзар"
                value={visitForm.storeName}
                onChange={(e) => setVisitForm({ ...visitForm, storeName: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                {utr.storeAddress}
              </label>
              <input
                className="input !text-xs !rounded-xl"
                placeholder="г. Ташкент, ул. Бунёдкор, 24"
                value={visitForm.storeAddress}
                onChange={(e) => setVisitForm({ ...visitForm, storeAddress: e.target.value })}
              />
            </div>

            {/* GPS Geolocation check-in */}
            <div className="rounded-2xl p-3 bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <MapPin size={13} color="var(--primary)" /> GPS Координаты
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (p) => {
                          const c = `${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`;
                          setVisitForm({ ...visitForm, gpsCoords: c });
                          toast(utr.geolocationSuccess);
                        },
                        () => {
                          setVisitForm({ ...visitForm, gpsCoords: "41.2858, 69.2035" });
                          toast("📍 GPS координаты зафиксированы!");
                        }
                      );
                    }
                  }}
                  className="btn btn-primary !py-1 !px-2.5 !text-[11px] !rounded-xl font-bold"
                >
                  📍 Зафиксировать GPS
                </motion.button>
              </div>
              <input
                className="input !text-xs font-mono !py-1.5 !rounded-xl"
                placeholder="41.2858, 69.2035"
                value={visitForm.gpsCoords}
                onChange={(e) => setVisitForm({ ...visitForm, gpsCoords: e.target.value })}
              />
            </div>

            {/* Статус и сумма */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                  {utr.visitStatusLabel}
                </label>
                <select
                  className="input !text-xs !rounded-xl"
                  value={visitForm.status}
                  onChange={(e) => setVisitForm({ ...visitForm, status: e.target.value })}
                >
                  <option value="order_placed">{utr.orderPlaced}</option>
                  <option value="completed">{utr.completedNoOrder}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                  Сумма заказа (сум)
                </label>
                <input
                  type="number"
                  className="input !text-xs !rounded-xl"
                  placeholder="450000"
                  value={visitForm.orderTotal}
                  onChange={(e) => setVisitForm({ ...visitForm, orderTotal: e.target.value })}
                />
              </div>
            </div>

            {/* Быстрые теги мерчендайзинга */}
            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1.5">
                {utr.merchandisingTags}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[utr.tag1, utr.tag2, utr.tag3, utr.tag4, utr.tag5].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setVisitForm((prev) => ({
                        ...prev,
                        notes: prev.notes ? `${prev.notes} · ${tag}` : tag,
                      }))
                    }
                    className="chip !text-[10px] !py-1 !px-2.5 !rounded-xl"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="input !text-xs min-h-16 !rounded-2xl"
              placeholder="Дополнительные примечания по точке…"
              value={visitForm.notes}
              onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
            />

            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                Фотоотчёт с торговой точки
              </label>
              <ImageUploader
                images={visitForm.photos}
                onChange={(imgs) => setVisitForm({ ...visitForm, photos: imgs })}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              className="btn btn-primary justify-center !py-3 !rounded-2xl font-bold mt-2"
              disabled={busy}
              onClick={handleRecordVisit}
            >
              {busy ? "Сохраняем…" : utr.saveVisitBtn}
            </motion.button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: B2B CHECKOUT DRAWER ─── */}
      {checkoutModal && (
        <Modal open onClose={() => setCheckoutModal(false)} title={utr.cartTitle} wide>
          <div className="flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto pr-1">
            {/* Список товаров в корзине */}
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 rounded-2xl p-2.5"
                  style={{
                    background: "rgba(var(--table-row))",
                    border: "1px solid rgba(var(--border))",
                  }}
                >
                  <ProductThumb
                    src={item.product.image}
                    name={item.product.name}
                    size={40}
                    radius={10}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">
                      {item.product.name.replace("DELIS ", "")}
                    </div>
                    <div className="text-[10px] muted">
                      {money(item.product.price)} × {item.qty} {utr.pcs}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(item.product.id, -1)}
                      className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-extrabold px-1.5">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item.product.id, 1)}
                      className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow"
                      disabled={item.qty >= item.product.stock}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                {utr.storeName}
              </label>
              <input
                className="input !text-xs !rounded-xl"
                placeholder="Автомойка LUX Чиланзар"
                value={checkoutForm.storeName}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, storeName: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                {utr.storeAddress}
              </label>
              <input
                className="input !text-xs !rounded-xl"
                placeholder="г. Ташкент, ул. Бунёдкор, 24"
                value={checkoutForm.storeAddress}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, storeAddress: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] muted uppercase tracking-wider block mb-1">
                {utr.orderNotes}
              </label>
              <textarea
                className="input !text-xs min-h-16 !rounded-2xl"
                placeholder="Оплата по перечислению, доставка завтра утром..."
                value={checkoutForm.notes}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
              />
            </div>

            {/* Итоговый блок с расчётом комиссии агента */}
            <div
              className="rounded-3xl p-4 flex flex-col gap-2"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(34,197,94,0.15))",
                border: "1px solid rgba(var(--border))",
              }}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="muted">{utr.total}:</span>
                <span className="text-base font-black text-green-400">{money(cartTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-white/10">
                <span className="text-purple-300 font-bold flex items-center gap-1">
                  <Award size={13} /> {utr.commissionEarned} ({agent.commission}%):
                </span>
                <span className="text-xs font-black text-purple-300">+{money(cartCommission)}</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              className="btn btn-primary justify-center !py-3.5 !rounded-2xl font-bold mt-1 shadow-xl"
              disabled={busy || cart.length === 0}
              onClick={handleCreateB2BOrder}
            >
              {busy ? "Оформляем…" : `${utr.submitOrder} · ${money(cartTotal)}`}
            </motion.button>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: КАК УСТАНОВИТЬ НА ЭКРАН ТЕЛЕФОНА ─── */}
      {installModal && (
        <Modal
          open={installModal}
          onClose={() => setInstallModal(false)}
          title="📲 Как установить приложение на экран"
        >
          <div className="flex flex-col gap-3.5 text-xs leading-relaxed">
            <div className="p-3 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-200 text-xs">
              Приложение работает как нативное: открывается во весь экран, сохраняет каталог в память и работает даже без интернета.
            </div>

            {/* Инструкция Android */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="font-bold text-sm text-green-400 flex items-center gap-1.5">
                🤖 Для Android (Chrome / Samsung Internet):
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold grid place-items-center shrink-0">1</span>
                <span>Нажмите на <b>три точки (⋮)</b> в правом верхнем углу браузера.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold grid place-items-center shrink-0">2</span>
                <span>Нажмите <b>«Установить приложение»</b> или «Добавить на главный экран».</span>
              </div>
            </div>

            {/* Инструкция iPhone */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
              <div className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                🍏 Для iPhone (Safari):
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold grid place-items-center shrink-0">1</span>
                <span>Нажмите кнопку <b>«Поделиться»</b> (квадрат со стрелкой вверх ⎋) внизу экрана.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold grid place-items-center shrink-0">2</span>
                <span>Прокрутите вниз и нажмите <b>«На экран «Домой»»</b> (Add to Home Screen).</span>
              </div>
            </div>

            <button
              onClick={() => setInstallModal(false)}
              className="btn btn-primary w-full justify-center !py-3 font-bold mt-1"
            >
              Понятно
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
