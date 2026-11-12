import dynamic from "next/dynamic";
import styles from "@/components/Admin.module.css";

const StadiumsBoard = dynamic(() => import("@/components/panels/StadiumsBoard"), {
  loading: () => <p className={styles.pageLead}>Loading stadiums…</p>,
});

export const metadata = {
  title: "Stadiums | FanAnalitic",
};

export default function StadiumsPage() {
  return (
    <section>
      <h1 className={styles.pageTitle}>Stadiums</h1>
      <p className={styles.pageLead}>
        Venues, cities, and how the matchday felt inside each ground.
      </p>
      <StadiumsBoard />
    </section>
  );
}
