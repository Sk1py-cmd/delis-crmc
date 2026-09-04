"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, UserRound, Lock, Eye, EyeOff, LogIn, Languages } from "lucide-react";
import { useT } from "@/shared/i18n/useT";
import { useLocale } from "@/shared/store/locale";
import { LOCALES, type Locale } from "@/shared/i18n/locales";

export function LoginScreen() {
  const [login, setLogin] = useState("owner");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const router = useRouter();
  const t = useT();
  const { locale, setLocale } = useLocale();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedLogin = login.trim().toLowerCase();
    const normalizedPassword = password.trim();
    setError("");

    if (!normalizedLogin || !normalizedPassword) {
      setError(t("login.errorEmpty"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: normalizedLogin, password: normalizedPassword, code: otp.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; requires2fa?: boolean };
      if (data.ok) {
        // refresh() сбрасывает кеш роутера, чтобы серверные компоненты
        // перерисовались уже от имени вошедшего пользователя.
        router.replace("/");
        router.refresh();
        return;
      }
      if (data.requires2fa) {
        setNeeds2fa(true);
        setOtp("");
        setLoading(false);
        return;
      }
      setError(data.error ?? t("login.errorEmpty"));
    } catch {
      setError(t("login.errorConnection"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid place-items-center p-4">
      {[
        { c: "var(--primary)", x: "12%", y: "8%", s: 420 },
        { c: "var(--accent)", x: "82%", y: "18%", s: 360 },
        { c: "#ec4899", x: "70%", y: "85%", s: 300 },
      ].map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl opacity-25"
          style={{ background: o.c, left: o.x, top: o.y, width: o.s, height: o.s }}
          animate={{ y: [0, -30, 0], scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 9 + i * 2, ease: "easeInOut" }}
        />
      ))}

      {/* Переключатель языка */}
      <div className="absolute top-4 right-4 z-20">
        <button
          className="btn !px-3 !py-2"
          onClick={() => setLangOpen((v) => !v)}
        >
          <Languages size={15} /> {LOCALES[locale].flag} {LOCALES[locale].nativeName}
        </button>
        <AnimatePresence>
          {langOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              className="glass card-pad !p-1.5 absolute right-0 mt-2 w-44"
            >
              {Object.entries(LOCALES).map(([code, l]) => (
                <button
                  key={code}
                  onClick={() => { setLocale(code as Locale); setLangOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[0.82rem]"
                  style={{
                    background: locale === code ? "rgba(var(--table-row))" : "transparent",
                    color: locale === code ? "var(--primary)" : "inherit",
                    fontWeight: locale === code ? 600 : 400,
                  }}
                >
                  <span className="text-base">{l.flag}</span> {l.nativeName}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass card-pad w-full max-w-md relative z-10 !p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center"
            style={{ background: "linear-gradient(135deg,var(--primary),var(--accent))", boxShadow: "0 14px 34px -14px var(--primary)" }}
          >
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight leading-5">DELIS</div>
            <div className="text-[0.68rem] muted tracking-[0.2em]">ENTERPRISE CRM</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
        <p className="muted text-sm mt-1.5">{t("login.subtitle")}</p>

        <form onSubmit={submit} className="flex flex-col gap-3.5 mt-6">
          <div className="relative">
            <UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 muted" />
            <input
              className="input !pl-11 !py-3"
              placeholder={t("login.loginPlaceholder")}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 muted" />
            <input
              className="input !pl-11 !pr-11 !py-3"
              placeholder={t("login.passwordPlaceholder")}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 muted" onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {needs2fa && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <div className="rounded-2xl p-3.5 mb-1" style={{ background: "color-mix(in srgb, var(--success) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)" }}>
                <p className="text-sm mb-2.5">Введите 6-значный код из приложения-аутентификатора</p>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 muted" />
                  <input
                    className="input !pl-11 !py-3 text-center tracking-[0.5em]"
                    placeholder="••••••"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm px-3.5 py-2.5 rounded-2xl"
              style={{ background: "color-mix(in srgb, var(--error) 14%, transparent)", color: "var(--error)", border: "1px solid color-mix(in srgb, var(--error) 35%, transparent)" }}
            >
              {error}
            </motion.div>
          )}

          <motion.button whileTap={{ scale: 0.98 }} className="btn btn-primary justify-center !py-3 mt-1" disabled={loading || (needs2fa && otp.length !== 6)}>
            {loading ? t("login.submitting") : needs2fa ? "Подтвердить код" : (
              <>
                <LogIn size={16} /> {t("login.submit")}
              </>
            )}
          </motion.button>

          {needs2fa && (
            <button type="button" className="text-sm muted text-center mt-1 hover:opacity-80 transition-opacity" onClick={() => { setNeeds2fa(false); setOtp(""); }}>
              ← Вернуться к входу
            </button>
          )}
        </form>

        <div className="mt-5 flex items-center gap-2 text-[0.72rem] muted">
          <Lock size={13} color="var(--success)" />
          {t("login.footer")}
        </div>
      </motion.div>
    </div>
  );
}
