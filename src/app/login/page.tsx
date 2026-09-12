import { redirect } from "next/navigation";

/**
 * Login is rendered by the CRM layout at `/`. Keep `/login` as a friendly
 * alias so opening the conventional login URL does not result in a 404.
 */
export default function LoginPage() {
  redirect("/");
}
