import Image from "next/image";
import styles from "./Admin.module.css";

const items = [
  { label: "Dashboard", path: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" },
  { label: "Security", path: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z M8 12l3 3 5-6" },
  { label: "Reviews", path: "M21 11a8 8 0 0 1-8 8H7l-4 3V5a2 2 0 0 1 2-2h8a8 8 0 0 1 8 8Z M7 8h10 M7 12h7" },
  { label: "Stadiums", path: "M3 10c0-4 18-4 18 0v7c0 5-18 5-18 0z M3 10c0 5 18 5 18 0 M7 13v6 M12 14v6 M17 13v6 M6 7V3 M18 7V3" },
  { label: "Games", path: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2 M14 17h2" },
  { label: "Teams", path: "M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M6 21v-3a6 6 0 0 1 12 0v3 M19 4a3 3 0 0 1 0 6 M21 21v-3a6 6 0 0 0-2-4 M5 4a3 3 0 0 0 0 6 M3 21v-3a6 6 0 0 1 2-4" },
];

export default function AdminSidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Admin sidebar">
      <div className={styles.brand}>
        <Image
          src="/logo-readme.png"
          alt="FanAnalitic"
          width={2375}
          height={448}
          priority
          className={styles.logo}
        />
        <span className={styles.badge}>Admin panel</span>
      </div>
      <nav aria-label="Admin navigation" className={styles.navigation}>
        <p className={styles.navHeading}>Workspace</p>
        <ul className={styles.navList}>
          {items.map(({ label, path }) => (
            <li key={label}>
              <button type="button" className={styles.navButton}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={styles.icon}
                >
                  <path d={path} />
                </svg>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p className={styles.sidebarNote}>A better matchday starts with fans.</p>
    </aside>
  );
}
