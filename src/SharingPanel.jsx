export default function SharingPanel({ owner, busy, dirty, title, onTitle, onSave }) {
  const link = new URL(import.meta.env.BASE_URL, window.location.origin).href
  return <section className="sharing-panel">
    {owner ? <><strong>Editor · copie locală</strong>
      <label>Titlul hărții<input disabled={busy} value={title} maxLength={200} onChange={event => onTitle(event.target.value)} /></label>
      <button disabled={busy} onClick={onSave}>Exportă pachetul pentru GitHub</button>
      <p role="status">{dirty ? 'Ai modificări neexportate.' : 'Modificările se publică doar prin repository.'}</p>
      <p>Dezarhivează pachetul și înlocuiește fișierele din public/data în GitHub. Numai persoanele cu acces de scriere pot actualiza harta publică. Copia din editor se pierde la reîncărcare; exportă înainte de a închide.</p>
      <a href={link}>Vezi harta publicată</a>
    </> : <><strong>Hartă publică · doar vizualizare</strong><p>Explorează straturile și tabelul de atribute.</p><a href="?edit=1">Pregătește o copie pentru publicare</a></>}
    <label>Link public<input readOnly value={link} onFocus={event => event.target.select()} /></label>
  </section>
}
