"use client";

import { useState } from "react";
import { createTeam, deleteTeam, fetchTeams, scoreText, updateTeam } from "@/lib/catalog";
import EditorDialog from "./EditorDialog";
import Status from "./Status";
import { useResource } from "./useResource";
import styles from "./Panels.module.css";

function Crest({ name, logo }) {
  const [failed, setFailed] = useState(!logo);

  if (failed) {
    return <span className={styles.crest}>{name.slice(0, 1)}</span>;
  }

  return <img className={styles.logo} src={logo} alt="" onError={() => setFailed(true)} />;
}

function TeamEditor({ team, onClose, onSaved }) {
  const [name, setName] = useState(team.name);
  const [logo, setLogo] = useState(team.logo || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter a team name.");
      return;
    }
    setPending(true);
    try {
      await updateTeam(team.id, { name: name.trim(), logoUrl: logo.trim() });
      onSaved();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <EditorDialog title="Edit team" onClose={onClose}>
      <form className={styles.dialogForm} onSubmit={onSubmit}>
        <div className={styles.fields}>
          <label className={styles.field}>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required autoFocus />
          </label>
          <label className={styles.field}>
            Logo URL
            <input value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="https://" />
          </label>
        </div>
        <div className={styles.dialogActions}>
          <button className={styles.ghost} type="button" onClick={onClose}>Cancel</button>
          <button className={styles.save} type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
        {error ? <p className={styles.formError}>{error}</p> : null}
      </form>
    </EditorDialog>
  );
}

export default function TeamsBoard() {
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { data, status } = useResource(fetchTeams, refresh);
  const teams = data ?? [];
  const rated = teams.filter((team) => team.overall != null);
  const average = rated.length
    ? rated.reduce((sum, team) => sum + team.overall, 0) / rated.length
    : null;

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!name.trim()) {
      setError("Enter a team name.");
      return;
    }
    setPending(true);
    try {
      await createTeam({ name: name.trim(), logoUrl: logo.trim() });
      setName("");
      setLogo("");
      setMessage("Team saved.");
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPending(false);
    }
  }

  async function onDelete(team) {
    if (!window.confirm(`Delete ${team.name}?`)) return;
    setMessage("");
    setError("");
    try {
      await deleteTeam(team.id);
      if (editing?.id === team.id) setEditing(null);
      setMessage("Team deleted.");
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught.message);
    }
  }

  if (status === "loading" || status === "error") {
    return <Status status={status} noun="teams" />;
  }

  return (
    <div className={styles.board}>
      {editing ? (
        <TeamEditor
          key={editing.id}
          team={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMessage("Team updated.");
            setError("");
            setRefresh((value) => value + 1);
          }}
        />
      ) : null}
      <form className={styles.editor} onSubmit={onSubmit}>
        <p className={styles.kicker}>Add a team</p>
        <div className={styles.fields}>
          <label className={styles.field}>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
          </label>
          <label className={styles.field}>
            Logo URL
            <input value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="https://" />
          </label>
        </div>
        <div className={styles.actions}>
          <button className={styles.save} type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save team"}
          </button>
          {message ? <p className={styles.note}>{message}</p> : null}
          {error ? <p className={styles.formError}>{error}</p> : null}
        </div>
      </form>
      {teams.length ? (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span>Clubs</span>
              <strong>{teams.length}</strong>
            </div>
            <div className={styles.kpi}>
              <span>With a rating</span>
              <strong>{rated.length}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Avg overall</span>
              <strong>{scoreText(average)}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Appearances</span>
              <strong>{teams.reduce((sum, team) => sum + team.matches, 0).toLocaleString("en-GB")}</strong>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Matches</th>
                  <th>Overall</th>
                  <th>Security</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id ?? team.name}>
                    <td>
                      <div className={styles.identity}>
                        <Crest name={team.name} logo={team.logo} />
                        <strong>{team.name}</strong>
                      </div>
                    </td>
                    <td>{team.matches}</td>
                    <td>{scoreText(team.overall)}</td>
                    <td>{scoreText(team.security)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.ghost} type="button" onClick={() => setEditing(team)}>Edit</button>
                        <button className={styles.danger} type="button" onClick={() => onDelete(team)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
