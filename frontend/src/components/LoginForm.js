"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputClass = "h-11 w-full rounded-lg border border-line bg-field px-3 text-fg outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/30";

export default function LoginForm({ mode = "login" }) {
  const registering = mode === "register";
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    if (pending) return;
    const next = {};
    if (!emailPattern.test(values.email.trim()) || values.email.trim().length > 254) next.email = "Enter a valid email.";
    if (!values.password) next.password = "Password is required.";
    if (registering) {
      if (!values.name.trim() || values.name.trim().length > 100) next.name = "Enter a name between 1 and 100 characters.";
      if (values.password.length < 12 || new TextEncoder().encode(values.password).length > 72) next.password = "Use at least 12 characters and no more than 72 UTF-8 bytes.";
      if (values.confirmPassword !== values.password) next.confirmPassword = "Passwords do not match.";
    }
    setErrors(next);
    setNotice("");
    if (Object.keys(next).length) return;
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registering ? values : { email: values.email, password: values.password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(data.errors || {});
        setNotice(data.message || "Unable to connect. Please try again later.");
        return;
      }
      setValues({ name: "", email: "", password: "", confirmPassword: "" });
      if (registering) {
        setRegistered(true);
      } else {
        router.replace("/admin");
        router.refresh();
      }
    } catch {
      setNotice("Unable to connect. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  if (registered) {
    return (
      <div className="mt-8 text-center">
        <p role="status" className="text-sm text-muted">Your account has been created.</p>
        <Link href="/login" className="mt-4 inline-block font-semibold text-brand underline underline-offset-4">Sign in to continue</Link>
      </div>
    );
  }

  const fields = [
    ...(registering ? [{ name: "name", label: "Full name", type: "text", autoComplete: "name", maxLength: 100 }] : []),
    { name: "email", label: "Email", type: "email", autoComplete: "email", maxLength: 254 },
    { name: "password", label: "Password", type: showPassword ? "text" : "password", autoComplete: registering ? "new-password" : "current-password" },
    ...(registering ? [{ name: "confirmPassword", label: "Confirm password", type: showPassword ? "text" : "password", autoComplete: "new-password" }] : []),
  ];

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="mt-8 flex flex-col gap-5">
      {fields.map(({ name, label, type, autoComplete, maxLength }) => (
        <div key={name} className="flex flex-col gap-2">
          <label htmlFor={name} className="text-sm font-medium">{label}</label>
          <div className="relative">
            <input
              id={name}
              name={name}
              type={type}
              autoComplete={autoComplete}
              maxLength={maxLength}
              required
              disabled={pending}
              value={values[name]}
              onChange={(event) => setValues(current => ({ ...current, [name]: event.target.value }))}
              aria-invalid={Boolean(errors[name])}
              aria-describedby={errors[name] ? `${name}-error` : registering && name === "password" ? "password-help" : undefined}
              className={`${inputClass}${name === "password" ? " pr-16" : ""}`}
            />
            {name === "password" ? (
              <button
                type="button"
                onClick={() => setShowPassword(current => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-sm font-medium text-brand"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            ) : null}
          </div>
          {errors[name] ? <p id={`${name}-error`} className="text-sm text-danger">{errors[name]}</p> : null}
          {registering && name === "password" ? <p id="password-help" className="text-xs text-muted">At least 12 characters; up to 72 UTF-8 bytes.</p> : null}
        </div>
      ))}
      {notice ? <p role="alert" className="text-sm text-danger">{notice}</p> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-lg bg-brand text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover disabled:cursor-wait disabled:opacity-60">
        {pending ? (registering ? "Creating account..." : "Signing in...") : (registering ? "Create account" : "Sign in")}
      </button>
      <p className="text-center text-sm text-muted">
        {registering ? "Already have an account? " : "Don't have an account? "}
        <Link href={registering ? "/login" : "/register"} className="font-semibold text-brand underline underline-offset-4">
          {registering ? "Sign in here" : "Register here"}
        </Link>
      </p>
    </form>
  );
}
