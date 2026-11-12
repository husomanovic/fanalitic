"use client";

import { useMemo, useState } from "react";
import { createGame, deleteGame, fetchFixtures, fetchStadiums, fetchTeams, scoreText, updateGame } from "@/lib/catalog";
import EditorDialog from "./EditorDialog";
import Status from "./Status";
import { useResource } from "./useResource";
import styles from "./Panels.module.css";

function GameForm({ game, onSaved, onCancel }) {
  const teamsResource = useResource(fetchTeams);
  const stadiumsResource = useResource(fetchStadiums);
  const teams = teamsResource.data ?? [];
  const stadiums = stadiumsResource.data ?? [];
  const [homeTeamId, setHomeTeamId] = useState(game?.homeTeamId ? String(game.homeTeamId) : "");
  const [guestTeamId, setGuestTeamId] = useState(game?.guestTeamId ? String(game.guestTeamId) : "");
  const [stadiumId, setStadiumId] = useState(game?.stadiumId ? String(game.stadiumId) : "");
  const [gameDate, setGameDate] = useState(game?.kickoff || "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const optionsReady = teamsResource.status === "ready" && stadiumsResource.status === "ready";

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!homeTeamId || !guestTeamId || !stadiumId || !gameDate) {
      setError("Choose both teams, a stadium, and a kickoff time.");
      return;
    }
    if (homeTeamId === guestTeamId) {
      setError("Home and away teams must be different.");
      return;
    }
    setPending(true);
    try {
      const body = {
        homeTeamId: Number(homeTeamId),
        guestTeamId: Number(guestTeamId),
        stadiumId: Number(stadiumId),
        gameDate,
      };
      if (game) await updateGame(game.id, body);
      else await createGame(body);
      setHomeTeamId("");
      setGuestTeamId("");
      setStadiumId("");
      setGameDate("");
      if (!game) setMessage("Match saved.");
      onSaved();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={game ? styles.dialogForm : styles.editor} onSubmit={onSubmit}>
      {game ? null : <p className={styles.kicker}>Add a match</p>}
      <div className={game ? styles.pair : styles.fields}>
        <label className={styles.field}>
          Home team
          <select value={homeTeamId} onChange={(event) => setHomeTeamId(event.target.value)} required autoFocus={Boolean(game)}>
            <option value="">Select</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Away team
          <select value={guestTeamId} onChange={(event) => setGuestTeamId(event.target.value)} required>
            <option value="">Select</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Stadium
          <select value={stadiumId} onChange={(event) => setStadiumId(event.target.value)} required>
            <option value="">Select</option>
            {stadiums.map((stadium) => (
              <option key={stadium.id} value={stadium.id}>{stadium.name}, {stadium.city}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Kickoff
          <input type="datetime-local" value={gameDate} onChange={(event) => setGameDate(event.target.value)} required />
        </label>
      </div>
      <div className={game ? styles.dialogActions : styles.actions}>
        {game ? (
          <button className={styles.ghost} type="button" onClick={onCancel}>Cancel</button>
        ) : null}
        <button className={styles.save} type="submit" disabled={pending || !optionsReady}>
          {pending ? "Saving…" : game ? "Save changes" : "Save match"}
        </button>
        {message ? <p className={styles.note}>{message}</p> : null}
        {error ? <p className={styles.formError}>{error}</p> : null}
      </div>
    </form>
  );
}

export default function GamesBoard() {
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const { data, status } = useResource(fetchFixtures, refresh);
  const games = data ?? [];
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return games;
    return games.filter((game) => `${game.label} ${game.stadium} ${game.city}`.toLowerCase().includes(needle));
  }, [games, query]);

  async function onDelete(game) {
    if (!window.confirm(`Delete ${game.label}? This also removes its tickets and reviews.`)) return;
    setNotice("");
    setActionError("");
    try {
      await deleteGame(game.id);
      if (editing?.id === game.id) setEditing(null);
      setNotice("Match deleted.");
      setRefresh((value) => value + 1);
    } catch (caught) {
      setActionError(caught.message);
    }
  }

  if (status === "loading" || status === "error") {
    return <Status status={status} noun="fixtures" />;
  }

  return (
    <div className={styles.board}>
      <GameForm onSaved={() => setRefresh((value) => value + 1)} />
      {editing ? (
        <EditorDialog title="Edit match" onClose={() => setEditing(null)}>
          <GameForm
            key={editing.id}
            game={editing}
            onSaved={() => {
              setEditing(null);
              setNotice("Match updated.");
              setActionError("");
              setRefresh((value) => value + 1);
            }}
            onCancel={() => setEditing(null)}
          />
        </EditorDialog>
      ) : null}
      {notice ? <p className={styles.note}>{notice}</p> : null}
      {actionError ? <p className={styles.formError}>{actionError}</p> : null}
      {games.length ? (
        <>
          <div className={styles.toolbar}>
            <p className={styles.kicker}>{games.length} fixtures from the catalog</p>
            <input
              className={styles.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search club or stadium"
              aria-label="Search fixtures"
            />
          </div>
          {shown.length === 0 ? (
            <p className={styles.empty}>No fixtures match that search.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Match</th>
                    <th>Score</th>
                    <th>Stadium</th>
                    <th>Reviews</th>
                    <th>Overall</th>
                    <th>Security</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((game) => (
                    <tr key={game.id}>
                      <td>{game.date}</td>
                      <td>{game.label}</td>
                      <td>{game.score}</td>
                      <td>{game.stadium}{game.city ? `, ${game.city}` : ""}</td>
                      <td>{game.reviews.toLocaleString("en-GB")}</td>
                      <td>{scoreText(game.overall)}</td>
                      <td>{scoreText(game.security)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button className={styles.ghost} type="button" onClick={() => setEditing(game)}>Edit</button>
                          <button className={styles.danger} type="button" onClick={() => onDelete(game)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
