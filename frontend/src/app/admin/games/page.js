import dynamic from "next/dynamic";
import styles from "@/components/Admin.module.css";

const GamesBoard = dynamic(() => import("@/components/panels/GamesBoard"), {
  loading: () => <p className={styles.pageLead}>Loading fixtures…</p>,
});

export const metadata = {
  title: "Games | FanAnalitic",
};

export default function GamesPage() {
  return (
    <section>
      <h1 className={styles.pageTitle}>Games</h1>
      <p className={styles.pageLead}>
        Fixtures, results, and the fan ratings attached to each match.
      </p>
      <GamesBoard />
    </section>
  );
}
