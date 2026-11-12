"use client";

import Image from "next/image";
import ThemeToggle from "./ThemeToggle";

export default function ReviewShell({ children }) {
  return (
    <main className="page-shell mx-auto flex min-h-full w-full max-w-6xl flex-col">
      <header className="panel mb-4 flex items-center justify-between gap-3 px-4 py-3 animate-rise sm:mb-5 sm:px-5 sm:py-3.5">
        <BrandMark />
        <ThemeToggle />
      </header>
      {children}
    </main>
  );
}

function BrandMark() {
  return (
    <div className="relative h-10 w-36 sm:h-12 sm:w-44 lg:h-14 lg:w-52">
      <Image
        src="/logo-blue-white-removebg.png"
        alt="FanAnalitic"
        fill
        priority
        className="brand-logo-light object-contain object-left"
        sizes="(max-width: 640px) 144px, (max-width: 1024px) 176px, 208px"
      />
      <Image
        src="/logo-dark-removebg.png"
        alt=""
        fill
        priority
        aria-hidden
        className="brand-logo-dark object-contain object-left"
        sizes="(max-width: 640px) 144px, (max-width: 1024px) 176px, 208px"
      />
    </div>
  );
}
