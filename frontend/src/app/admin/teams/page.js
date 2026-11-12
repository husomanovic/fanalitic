import dynamic from "next/dynamic";
import styles from "@/components/Admin.module.css";

const TeamsBoard = dynamic(() => import("@/components/panels/TeamsBoard"), {
  loading: () => <p className={styles.pageLead}>Loading teams…</p>,
});

export const metadata = {
  title: "Teams | FanAnalitic",
};

export default function TeamsPage() {
  return (
    <section>
      <h1 className={styles.pageTitle}>Teams</h1>
      <p className={styles.pageLead}>
        Clubs in the catalog and the impressions fans leave about their matches.
      </p>
      <TeamsBoard />
    </section>
  );
}
