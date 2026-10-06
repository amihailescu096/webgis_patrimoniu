import { useState } from 'react'
export default function SharingPanel({ owner, publicView, busy, dirty, revision, mapId, title, onTitle, onLogin, onLogout, onSave }) {
  const [password, setPassword] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [copied, setCopied] = useState(false)
  const link = new URL(`?map=${mapId}`, window.location.origin).href
  return <section className="sharing-panel">
    {publicView ? <><strong>Hartă partajată · doar vizualizare</strong><p>Poți explora straturile și tabelul. Configurația publicată poate fi modificată doar de administrator.</p><a href="/">Administrare</a></> : owner ? <>
      <label>Titlul hărții<input disabled={busy} value={title} maxLength={200} onChange={event => onTitle(event.target.value)} /></label>
      <button disabled={busy} onClick={onSave}>{busy ? 'Se salvează / încarcă…' : 'Salvează și publică harta'}</button>
      <p role="status">{dirty ? 'Ai modificări nesalvate.' : revision ? 'Versiunea publicată este salvată pe server.' : 'Publică harta pentru a activa partajarea.'}</p>
      {revision > 0 && <><label>Link pentru vizualizare<input readOnly value={link} onFocus={event => event.target.select()} /></label><button disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setCopied(false) } }}>{copied ? 'Link copiat' : 'Copiază linkul'}</button><p>Oricine are linkul poate vedea și descărca datele publicate. Modificările devin vizibile după salvare și reîncărcarea paginii.</p></>}
      <button disabled={busy} onClick={onLogout}>Deconectare</button>
    </> : <><strong>Administrarea hărții</strong><p>Autentifică-te pentru a importa și publica straturi.</p><button disabled={busy} onClick={() => setShowLogin(!showLogin)}>Autentificare administrator</button>{showLogin && <form onSubmit={async event => { event.preventDefault(); await onLogin(password); setPassword('') }}><label>Parola administratorului<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={1024} /></label><button disabled={busy || !password}>Intră</button></form>}</>}
  </section>
}
