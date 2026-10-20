import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to WatchDrama to sync your watchlist, bookings and continue-watching progress across devices.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
