import LoginForm from "@/components/admin/LoginForm";
import { isUsingDevPassword } from "@/lib/auth";

export const metadata = { title: "Admin Login — WatchDrama" };

export default function AdminLoginPage() {
  return <LoginForm devPassword={isUsingDevPassword()} />;
}
