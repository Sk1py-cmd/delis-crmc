/**
 * Генерирует VAPID-ключи для браузерных push-уведомлений.
 *
 * Запуск: npm run vapid:generate
 * Полученные значения кладутся в переменные окружения VAPID_PUBLIC_KEY и
 * VAPID_PRIVATE_KEY. Ключи должны быть стабильны между перезапусками и
 * инстансами — не генерируйте их заново на каждом деплое.
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey);
console.log("VAPID_SUBJECT=mailto:admin@example.com");
