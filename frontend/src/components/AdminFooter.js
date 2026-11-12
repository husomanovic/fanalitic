import styles from "./Admin.module.css";

export default function AdminFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerBrand}>
        Fan<span>Analitic</span>
        <span className={styles.footerDivider} aria-hidden="true" />
        <span className={styles.footerLabel}>Admin panel</span>
      </p>
      <p>Fan insights. Better matchdays.</p>
    </footer>
  );
}
