CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"body" text NOT NULL,
	"from_admin" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"store_name" text NOT NULL,
	"store_address" text DEFAULT '' NOT NULL,
	"gps_coords" text DEFAULT '41.2858, 69.2035' NOT NULL,
	"status" text DEFAULT 'order_placed' NOT NULL,
	"order_total" numeric DEFAULT '0' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"telegram" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"region" text DEFAULT 'Toshkent' NOT NULL,
	"route" text DEFAULT '' NOT NULL,
	"plan" numeric DEFAULT '0' NOT NULL,
	"fact" numeric DEFAULT '0' NOT NULL,
	"commission" integer DEFAULT 7 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"avatar_color" text DEFAULT '#8b5cf6' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"segment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'home' NOT NULL,
	"icon" text DEFAULT '🧴' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"surface" text NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"vehicle" text DEFAULT 'car' NOT NULL,
	"zone" text DEFAULT 'Tashkent' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"active_deliveries" integer DEFAULT 0 NOT NULL,
	"completed_today" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"avatar_color" text DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"telegram_id" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"city" text DEFAULT 'Tashkent' NOT NULL,
	"region" text DEFAULT 'Toshkent' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'ru' NOT NULL,
	"source" text DEFAULT 'telegram' NOT NULL,
	"is_vip" boolean DEFAULT false NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric DEFAULT '0' NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"courier_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT 'Tashkent' NOT NULL,
	"scheduled_at" timestamp,
	"delivered_at" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'not_configured' NOT NULL,
	"last_check_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '📄' NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"event_key" text NOT NULL,
	"action_type" text DEFAULT 'discount_message' NOT NULL,
	"message_body" text NOT NULL,
	"discount_bonus" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"triggered_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"body" text NOT NULL,
	"from_admin" boolean DEFAULT false NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"customer_id" integer,
	"agent_id" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"channel" text DEFAULT 'miniapp' NOT NULL,
	"payment" text DEFAULT 'click' NOT NULL,
	"total" numeric DEFAULT '0' NOT NULL,
	"profit" numeric DEFAULT '0' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"barcode" text DEFAULT '' NOT NULL,
	"category_id" integer,
	"description" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT 'DELIS' NOT NULL,
	"country" text DEFAULT 'Uzbekistan' NOT NULL,
	"volume" text DEFAULT '1 L' NOT NULL,
	"weight" numeric DEFAULT '1' NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL,
	"cost" numeric DEFAULT '0' NOT NULL,
	"vat" integer DEFAULT 12 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock" integer DEFAULT 20 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color" text DEFAULT '#8b5cf6' NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promocodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" text DEFAULT 'percent' NOT NULL,
	"discount_value" numeric DEFAULT '15' NOT NULL,
	"min_order_amount" numeric DEFAULT '100000' NOT NULL,
	"max_uses" integer DEFAULT 100 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promocodes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"price" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"supplier_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"total" numeric DEFAULT '0' NOT NULL,
	"paid" numeric DEFAULT '0' NOT NULL,
	"expected_at" timestamp,
	"received_at" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"customer_id" integer,
	"reason" text DEFAULT 'defect' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"refund_amount" numeric DEFAULT '0' NOT NULL,
	"restock_items" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"device" text DEFAULT '' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"kind" text NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_person" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"country" text DEFAULT 'Uzbekistan' NOT NULL,
	"city" text DEFAULT 'Tashkent' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"inn" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'chemicals' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"lead_time_days" integer DEFAULT 7 NOT NULL,
	"total_purchased" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'crm' NOT NULL,
	"target" text DEFAULT 'all' NOT NULL,
	"entity" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'synced' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assignee" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'mid' NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"link_type" text DEFAULT '' NOT NULL,
	"link_label" text DEFAULT '' NOT NULL,
	"due_at" timestamp,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"category" text DEFAULT 'sales' NOT NULL,
	"account" text DEFAULT 'click' NOT NULL,
	"amount" numeric DEFAULT '0' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"login" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'manager' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_ip" text DEFAULT '94.158.0.1' NOT NULL,
	"device" text DEFAULT 'MacBook Pro · Chrome' NOT NULL,
	"two_fa" boolean DEFAULT false NOT NULL,
	"password_hash" text DEFAULT '' NOT NULL,
	"last_login_at" timestamp DEFAULT now() NOT NULL
);
