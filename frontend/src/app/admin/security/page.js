import dynamic from "next/dynamic";
import styles from "@/components/Admin.module.css";

const SecurityBoard = dynamic(() => import("@/components/panels/SecurityBoard"), {
  loading: () => <p className={styles.pageLead}>Loading security scores…</p>,
});

export const metadata = {
  title: "Security | FanAnalitic",
};

export default function SecurityPage() {
  return (
    <section>
      <h1 className={styles.pageTitle}>Security</h1>
      <p className={styles.pageLead}>
        How safe fans felt at each match, from entry to the final whistle.
      </p>
      <SecurityBoard />
    </section>
  );
}
