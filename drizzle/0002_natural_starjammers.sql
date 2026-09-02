CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"first_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL
);
