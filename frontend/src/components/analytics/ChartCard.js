import styles from './Dashboard.module.css';

export default function ChartCard({ title, subtitle, state, empty, children, id }) {
  return <section id={id} className={styles.card} aria-busy={state?.loading}>
    <h2>{title}</h2><p className={styles.caption}>{subtitle}</p>
    {state?.loading ? <div className={styles.placeholder} role="status">Loading analytics…</div>
      : state?.error ? <div className={styles.placeholder} role="alert">{state.error}</div>
      : empty ? <div className={styles.placeholder}>No reviews match these filters.</div> : children}
  </section>;
}
