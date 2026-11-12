import Image from "next/image";
import LoginForm from "@/components/LoginForm";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginScreen({ mode = "login" }) {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <section className="w-full max-w-md rounded-2xl border border-line bg-card px-8 py-10 shadow-[0_16px_40px_rgba(10,10,10,0.08)]">
        <Image
          src="/logo-blue-white-removebg.png"
          alt="FanAnalitic"
          width={612}
          height={408}
          priority
          className="mx-auto h-auto w-48 dark:hidden"
        />
        <Image
          src="/logo-dark-removebg.png"
          alt=""
          width={612}
          height={408}
          priority
          className="mx-auto hidden h-auto w-48 dark:block"
        />

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{mode === "register" ? "Create account" : "Sign in"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "register" ? "Register for the FanAnalitic admin panel" : "Admin account for FanAnalitic"}</p>
        </div>

        <LoginForm mode={mode} />
      </section>
    </main>
  );
}
