import LoginScreen from "@/components/LoginScreen";

export const metadata = {
  title: "Register | FanAnalitic",
  description: "Create a FanAnalitic admin account",
};

export default function RegisterPage() {
  return <LoginScreen mode="register" />;
}
