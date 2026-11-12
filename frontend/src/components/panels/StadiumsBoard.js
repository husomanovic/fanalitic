"use client";

import { useState } from "react";
import { createStadium, deleteStadium, fetchStadiums, scoreText, updateStadium } from "@/lib/catalog";
import EditorDialog from "./EditorDialog";
import Status from "./Status";
import { useResource } from "./useResource";
import styles from "./Panels.module.css";

function StadiumEditor({ stadium, onClose, onSaved }) {
  const [name, setName] = useState(stadium.name);
  const [city, setCity] = useState(stadium.city);
  const [country, setCountry] = useState(stadium.country);
  const [capacityInput, setCapacityInput] = useState(String(stadium.capacity));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    const seats = Number(capacityInput);
    if (!name.trim() || !city.trim() || !country.trim() || !Number.isInteger(seats) || seats <= 0) {
      setError("Enter a name, city, country, and a whole-number capacity.");
      return;
    }
    setPending(true);
    try {
      await updateStadium(stadium.id, {
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
        capacity: seats,
      });
      onSaved();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <EditorDialog title="Edit stadium" onClose={onClose}>
      <form className={styles.dialogForm} onSubmit={onSubmit}>
        <div className={styles.pair}>
          <label className={styles.field}>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required autoFocus />
          </label>
          <label className={styles.field}>
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} required />
          </label>
          <label className={styles.field}>
            Country
            <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={80} required />
          </label>
          <label className={styles.field}>
            Capacity
            <input value={capacityInput} onChange={(event) => setCapacityInput(event.target.value)} inputMode="numeric" required />
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

export default function StadiumsBoard() {
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [capacityInput, setCapacityInput] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { data, status } = useResource(fetchStadiums, refresh);
  const stadiums = data ?? [];
  const capacity = stadiums.reduce((sum, stadium) => sum + stadium.capacity, 0);
  const reviews = stadiums.reduce((sum, stadium) => sum + stadium.reviews, 0);

  async function onSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const seats = Number(capacityInput);
    if (!name.trim() || !city.trim() || !country.trim() || !Number.isInteger(seats) || seats <= 0) {
      setError("Enter a name, city, country, and a whole-number capacity.");
      return;
    }
    setPending(true);
    try {
      await createStadium({
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
        capacity: seats,
      });
      setName("");
      setCity("");
      setCountry("");
      setCapacityInput("");
      setMessage("Stadium saved.");
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setPending(false);
    }
  }

  async function onDelete(stadium) {
    if (!window.confirm(`Delete ${stadium.name}?`)) return;
    setMessage("");
    setError("");
    try {
      await deleteStadium(stadium.id);
      if (editing?.id === stadium.id) setEditing(null);
      setMessage("Stadium deleted.");
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught.message);
    }
  }

  if (status === "loading" || status === "error") {
    return <Status status={status} noun="stadiums" />;
  }

  return (
    <div className={styles.board}>
      {editing ? (
        <StadiumEditor
          key={editing.id}
          stadium={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMessage("Stadium updated.");
            setError("");
            setRefresh((value) => value + 1);
          }}
        />
      ) : null}
      <form className={styles.editor} onSubmit={onSubmit}>
        <p className={styles.kicker}>Add a stadium</p>
        <div className={styles.fields}>
          <label className={styles.field}>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
          </label>
          <label className={styles.field}>
            City
            <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={80} required />
          </label>
          <label className={styles.field}>
            Country
            <input value={country} onChange={(event) => setCountry(event.target.value)} maxLength={80} required />
          </label>
          <label className={styles.field}>
            Capacity
            <input value={capacityInput} onChange={(event) => setCapacityInput(event.target.value)} inputMode="numeric" required />
          </label>
        </div>
        <div className={styles.actions}>
          <button className={styles.save} type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save stadium"}
          </button>
          {message ? <p className={styles.note}>{message}</p> : null}
          {error ? <p className={styles.formError}>{error}</p> : null}
        </div>
      </form>
      {stadiums.length ? (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <span>Venues</span>
              <strong>{stadiums.length}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Total capacity</span>
              <strong>{capacity.toLocaleString("en-GB")}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Reviews</span>
              <strong>{reviews.toLocaleString("en-GB")}</strong>
            </div>
            <div className={styles.kpi}>
              <span>Countries</span>
              <strong>{new Set(stadiums.map((stadium) => stadium.country).filter(Boolean)).size}</strong>
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stadium</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Capacity</th>
                  <th>Reviews</th>
                  <th>Overall</th>
                  <th>Security</th>
                  <th>Comfort</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stadiums.map((stadium) => (
                  <tr key={stadium.id ?? stadium.name}>
                    <td>{stadium.name}</td>
                    <td>{stadium.city || "—"}</td>
                    <td>{stadium.country || "—"}</td>
                    <td>{stadium.capacity.toLocaleString("en-GB")}</td>
                    <td>{stadium.reviews.toLocaleString("en-GB")}</td>
                    <td>{scoreText(stadium.overall)}</td>
                    <td>{scoreText(stadium.security)}</td>
                    <td>{scoreText(stadium.comfort)}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className={styles.ghost} type="button" onClick={() => setEditing(stadium)}>Edit</button>
                        <button className={styles.danger} type="button" onClick={() => onDelete(stadium)}>Delete</button>
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
