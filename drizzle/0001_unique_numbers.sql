-- Номера заказов/закупок и SKU генерировались как `префикс + count(*)` либо
-- случайным числом. Оба способа дают дубликаты: count(*) не атомарен (два
-- параллельных заказа получают один номер), а random из 9000 значений
-- сталкивается уже на паре сотен товаров.
--
-- Переводим генерацию на последовательности БД и защищаем уникальность
-- индексами, чтобы дубликат не мог появиться даже в обход приложения.

--> statement-breakpoint
-- Стартуем каждую последовательность выше уже занятых значений.
CREATE SEQUENCE IF NOT EXISTS order_number_seq AS bigint START WITH 1;
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS purchase_order_number_seq AS bigint START WITH 1;
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS product_sku_seq AS bigint START WITH 1;
--> statement-breakpoint

SELECT setval(
  'order_number_seq',
  GREATEST(
    24000,
    COALESCE((SELECT MAX(NULLIF(regexp_replace(number, '\D', '', 'g'), '')::bigint) FROM orders), 24000)
  )
);
--> statement-breakpoint

SELECT setval(
  'purchase_order_number_seq',
  GREATEST(
    1200,
    COALESCE((SELECT MAX(NULLIF(regexp_replace(number, '\D', '', 'g'), '')::bigint) FROM purchase_orders), 1200)
  )
);
--> statement-breakpoint

SELECT setval(
  'product_sku_seq',
  GREATEST(
    1000,
    COALESCE((SELECT MAX(NULLIF(regexp_replace(sku, '\D', '', 'g'), '')::bigint) FROM products), 1000)
  )
);
--> statement-breakpoint

-- Развести уже существующие дубликаты, иначе уникальный индекс не создастся.
UPDATE orders o SET number = o.number || '-' || o.id
WHERE EXISTS (SELECT 1 FROM orders x WHERE x.number = o.number AND x.id < o.id);
--> statement-breakpoint

UPDATE purchase_orders p SET number = p.number || '-' || p.id
WHERE EXISTS (SELECT 1 FROM purchase_orders x WHERE x.number = p.number AND x.id < p.id);
--> statement-breakpoint

UPDATE products p SET sku = p.sku || '-' || p.id
WHERE EXISTS (SELECT 1 FROM products x WHERE x.sku = p.sku AND x.id < p.id);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS orders_number_unique ON orders (number);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_number_unique ON purchase_orders (number);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products (sku);
