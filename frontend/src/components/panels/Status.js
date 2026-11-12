import styles from "./Panels.module.css";

export default function Status({ status, noun }) {
  if (status === "loading") return <p className={styles.state}>Loading {noun}…</p>;
  if (status === "error") {
    return <p className={styles.state}>The API is not reachable. Start the backend on port 5000 and refresh.</p>;
  }
  if (status === "empty") return <p className={styles.state}>No {noun} have been returned yet.</p>;
  return null;
}
