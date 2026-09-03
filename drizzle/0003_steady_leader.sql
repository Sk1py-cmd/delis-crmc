-- Сессии удалённых пользователей оставались в таблице: внешнего ключа не
-- было, а код чистил её не везде. На таких строках ADD CONSTRAINT упадёт,
-- поэтому сначала убираем сирот, потом ставим каскад.

DELETE FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);
--> statement-breakpoint

-- Заодно выбрасываем протухшие сессии: их не удалял никто, хотя запрос по
-- этой таблице выполняется на каждый запрос страницы.
DELETE FROM sessions WHERE expires_at < now();
--> statement-breakpoint

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
