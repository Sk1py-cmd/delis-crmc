/**
 * Права на действия `/api/manage`.
 *
 * Раньше проверку прав имели только 8 из 45 действий: остальные мог
 * выполнить любой авторизованный пользователь. Например, агент —
 * записать расход в финансы, хотя раздел /finance ему не виден.
 *
 * Политика:
 *  - `admin`   — только Owner/Admin. Деньги, рассылки, публикация сайта,
 *                промокоды, интеграции, аккаунты, сброс данных.
 *  - `self`    — любой авторизованный пользователь, но только над собой
 *                (смена своего пароля и логина).
 *  - иначе     — раздел CRM: действие разрешено, если роль имеет доступ
 *                к этому разделу, то есть права совпадают с меню.
 */
export type ActionPolicy = "admin" | "self" | (string & {});

export const ACTION_POLICY: Record<string, ActionPolicy> = {
  // --- Только Owner/Admin -------------------------------------------------
  // Аккаунты сотрудников.
  createUser: "admin",
  resetPassword: "admin",
  toggle2fa: "admin",
  setup2fa: "admin",
  confirm2fa: "admin",
  deleteUser: "admin",
  // Деньги.
  addTransaction: "admin",
  createPurchaseOrder: "admin",
  receivePurchaseOrder: "admin",
  approveReturn: "admin",
  // Массовые коммуникации: уходят наружу к клиентам.
  sendBroadcast: "admin",
  sendPush: "admin",
  notify: "admin",
  sendTelegram: "admin",
  testTelegram: "admin",
  setupOrderNotifications: "admin",
  // Публичные поверхности и маркетинговые условия.
  publishSite: "admin",
  saveSeo: "admin",
  createPromocode: "admin",
  toggleMarketingTrigger: "admin",
  // Инфраструктура.
  saveIntegration: "admin",
  syncEverything: "admin",
  resetOperationalData: "admin",

  // --- Над собой ----------------------------------------------------------
  changePassword: "self",
  changeLogin: "self",

  // --- По разделу CRM -----------------------------------------------------
  createAgent: "/agents",
  addAgentVisit: "/agents",
  sendAgentMessage: "/agents",
  createAgentStoreOrder: "/agents",

  importProducts: "/products",
  inventory: "/warehouse",

  createSupplier: "/suppliers",
  createReturn: "/returns",

  addCourier: "/delivery",
  assignDelivery: "/delivery",
  completeDelivery: "/delivery",

  sendOrderToClient: "/orders",

  createTask: "/tasks",
  updateTaskStatus: "/tasks",
  deleteTask: "/tasks",

  saveArticle: "/knowledge",
  deleteArticle: "/knowledge",
  saveNote: "/knowledge",

  updateContent: "/website",
  createInstagramPost: "/instagram",
  saveMiniAppBanners: "/miniapp",
  saveTemplate: "/broadcast",
};

/**
 * Уточнённые тексты отказа. Для остальных действий используется общий
 * «Недостаточно прав для этого действия».
 */
export const DENY_MESSAGE: Record<string, string> = {
  createUser: "Только Owner/Admin может создавать аккаунты",
  resetPassword: "Только Owner/Admin может менять пароли сотрудников",
  toggle2fa: "Только Owner/Admin может менять настройки 2FA",
  setup2fa: "Только Owner/Admin может включать 2FA",
  confirm2fa: "Только Owner/Admin может подтверждать 2FA",
  deleteUser: "Только Owner/Admin может удалять аккаунты",
  saveIntegration: "Только Owner/Admin может менять интеграции",
  addTransaction: "Только Owner/Admin может проводить операции по кассе",
  approveReturn: "Только Owner/Admin может одобрять возвраты",
  sendBroadcast: "Только Owner/Admin может запускать рассылки",
};
