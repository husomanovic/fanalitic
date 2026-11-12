"use client";

import { fetchSecurity, scoreText } from "@/lib/catalog";
import Status from "./Status";
import { useResource } from "./useResource";
import styles from "./Panels.module.css";

function average(rows, key) {
  const rated = rows.filter((row) => row[key] != null);
  if (!rated.length) return null;
  return rated.reduce((sum, row) => sum + row[key], 0) / rated.length;
}

export default function SecurityBoard() {
  const { data, status } = useResource(fetchSecurity);
  const sections = data?.sections ?? [];
  const matches = data?.matches ?? [];
  const weakest = sections[0] || null;

  return (
    <>
      <Status status={status} noun="security scores" />
      {status === "ready" ? (
        <div className={styles.board}>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span>Sections</span>
              <strong>{sections.length}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Avg security</span>
              <strong>{scoreText(average(sections, "security"))}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Weakest section</span>
              <strong>{weakest ? weakest.section : "—"}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Lowest match</span>
              <strong>{scoreText(matches[0]?.security)}</strong>
            </div>
          </div>
          <article className={styles.card}>
            <p className={styles.kicker}>Security by tribune</p>
            <div className={styles.bars}>
              {sections.map((section) => {
                const width = section.security == null ? 0 : Math.max(0, Math.min(100, (section.security / 5) * 100));
                return (
                  <div key={section.section} className={styles.barRow}>
                    <span className={styles.barLabel}>{section.section}</span>
                    <span className={styles.track}>
                      <span
                        className={section.security != null && section.security < 3 ? `${styles.fill} ${styles.fillLow}` : styles.fill}
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <span className={styles.barValue}>{scoreText(section.security)}</span>
                  </div>
                );
              })}
            </div>
          </article>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Match</th>
                  <th>Security</th>
                  <th>Overall</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td>{match.date}</td>
                    <td>
                      {match.home} vs {match.away}
                    </td>
                    <td>{scoreText(match.security)}</td>
                    <td>{scoreText(match.overall)}</td>
                    <td>{match.reviews.toLocaleString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
