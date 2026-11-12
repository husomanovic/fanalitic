"use client";

import { useMemo, useState } from "react";
import { fetchReviewFeed, scoreText } from "@/lib/catalog";
import Status from "./Status";
import { useResource } from "./useResource";
import styles from "./Panels.module.css";

export default function ReviewsBoard() {
  const { data, status } = useResource(fetchReviewFeed);
  const reviews = data ?? [];
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reviews;
    return reviews.filter((review) =>
      `${review.home} ${review.away} ${review.section} ${review.text}`.toLowerCase().includes(needle),
    );
  }, [reviews, query]);

  return (
    <>
      <Status status={status} noun="reviews" />
      {status === "ready" ? (
        <div className={styles.board}>
          <div className={styles.toolbar}>
            <p className={styles.kicker}>Latest written reviews</p>
            <input
              className={styles.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search match, section, or comment"
              aria-label="Search reviews"
            />
          </div>
          {shown.length === 0 ? (
            <p className={styles.empty}>No reviews match that search.</p>
          ) : (
            <div className={styles.feed}>
              {shown.map((review) => (
                <article key={review.id} className={styles.comment}>
                  <div className={styles.identity}>
                    <strong>
                      {review.home} vs {review.away}
                    </strong>
                    <span className={styles.meta}>
                      {review.section} · {review.at}
                    </span>
                  </div>
                  <p>{review.text}</p>
                  <div className={styles.pills}>
                    <span className={styles.pill}>Overall {scoreText(review.overall)}</span>
                    <span className={styles.pill}>Security {scoreText(review.security)}</span>
                    <span className={styles.pill}>Comfort {scoreText(review.comfort)}</span>
                    <span className={styles.pill}>Match {scoreText(review.game)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
