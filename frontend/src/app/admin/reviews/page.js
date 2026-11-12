import dynamic from "next/dynamic";
import styles from "@/components/Admin.module.css";

const ReviewsBoard = dynamic(() => import("@/components/panels/ReviewsBoard"), {
  loading: () => <p className={styles.pageLead}>Loading reviews…</p>,
});

export const metadata = {
  title: "Reviews | FanAnalitic",
};

export default function ReviewsPage() {
  return (
    <section>
      <h1 className={styles.pageTitle}>Reviews</h1>
      <p className={styles.pageLead}>
        Scores and written impressions fans leave from the ticket QR code.
      </p>
      <ReviewsBoard />
    </section>
  );
}
