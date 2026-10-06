import { useMemo, useState } from 'react'
import { featureName } from './geojson.js'
const pageSize = 100
const display = value => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)
export default function AttributeTable({ layer, canEdit, onUpdate, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ro')
    return layer.data.features.map((feature, index) => ({ feature, index })).filter(({ feature }) => !needle || Object.values(feature.properties ?? {}).some(value => display(value).toLocaleLowerCase('ro').includes(needle)))
  }, [layer.data, query])
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pages)
  return <section className="attribute-table" role="dialog" aria-label={`Tabel de atribute · ${layer.name}`}>
    <header><h2>Tabel de atribute · {layer.name}</h2><button onClick={onClose} aria-label="Închide tabelul">×</button></header>
    <div className="table-toolbar"><label>Numele obiectelor din coloana<select disabled={!canEdit} value={layer.labelField} onChange={event => onUpdate({ labelField: event.target.value })}><option value="">Automat</option>{layer.columns.map(column => <option key={column} value={column}>{column}</option>)}</select></label><label>Caută în tabel<input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Orice valoare din atribute…" /></label></div>
    <div className="table-scroll"><table><thead><tr><th>Obiect / hartă</th>{layer.columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(({ feature, index }) => <tr key={index}><td><button onClick={() => onSelect(layer, feature)}>{featureName(feature, index, layer.labelField)}</button></td>{layer.columns.map(column => <td key={column}>{display(feature.properties?.[column])}</td>)}</tr>)}</tbody></table>{!rows.length && <p>Niciun obiect găsit.</p>}</div>
    <div className="table-pagination"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><label>Pagina <input type="number" min="1" max={pages} value={currentPage} onChange={event => setPage(Math.max(1, Math.min(pages, Number(event.target.value) || 1)))} /> din {pages}</label><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Următor</button><span>{rows.length} obiecte · toate coloanele</span></div>
  </section>
}
