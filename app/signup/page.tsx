import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "Sign up",
  description: "Create a free WatchDrama account to keep your watchlist, bookings and watch progress in sync on every device.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
