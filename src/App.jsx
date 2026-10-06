import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { featureName, normalizeGeoJSON } from './geojson'

const colors = ['#3979d5', '#8b5bc7', '#2a9679', '#e99a24', '#c64f56']
function MapLayers({ layers, focus, onSelect }) {
  const map = useMap()
  useEffect(() => {
    const group = L.featureGroup().addTo(map)
    layers.filter(layer => layer.visible).forEach(layer => {
      L.geoJSON(layer.data, {
        style: { color: layer.color, weight: 2, fillOpacity: 0.22 },
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 7, color: '#fff', weight: 2, fillColor: layer.color, fillOpacity: 1 }),
        onEachFeature: (feature, item) => item.on('click', () => onSelect({ layerId: layer.id, feature })),
      }).addTo(group)
    })
    return () => { group.remove() }
  }, [layers, map, onSelect])
  useEffect(() => {
    if (!focus) return
    const bounds = L.geoJSON(focus.data).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [35, 35], maxZoom: 17 })
  }, [focus, map])
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}
function download(layer) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(layer.data, null, 2)], { type: 'application/geo+json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${layer.name.replace(/[^\p{L}\p{N} _-]/gu, '_')}.geojson`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function App() {
  const [layers, setLayers] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [focus, setFocus] = useState(null)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [basemap, setBasemap] = useState('streets')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const fileInput = useRef(null)
  async function importFiles(files) {
    setImporting(true)
    const added = []
    const failures = []
    for (const file of files) {
      try {
        if (file.size > 25 * 1024 * 1024) throw new Error('Limita este de 25 MB per fișier.')
        const data = normalizeGeoJSON(JSON.parse((await file.text()).replace(/^\uFEFF/, '')))
        added.push({ id: crypto.randomUUID(), name: file.name.replace(/\.(geojson|json)$/i, ''), data, visible: true, color: colors[added.length % colors.length] })
      } catch (error) { failures.push(`${file.name}: ${error.message}`) }
    }
    setLayers(previous => [...previous, ...added])
    setErrors(failures)
    if (added.length) { setFocus({ data: { type: 'FeatureCollection', features: added.flatMap(layer => layer.data.features) } }); setExpanded(added[0].id) }
    setImporting(false)
    if (fileInput.current) fileInput.current.value = ''
  }
  function update(id, changes) { setLayers(previous => previous.map(layer => layer.id === id ? { ...layer, ...changes } : layer)) }
  const selectedLayer = layers.find(layer => layer.id === selected?.layerId)
  const results = query.trim() ? layers.filter(layer => layer.visible).flatMap(layer => layer.data.features.map((feature, index) => ({ layer, feature, index })).filter(({ feature }) => JSON.stringify(feature.properties ?? {}).toLocaleLowerCase('ro').includes(query.toLocaleLowerCase('ro')))).slice(0, 50) : []
  function select(layer, feature) { setSelected({ layerId: layer.id, feature }); setFocus({ data: feature }) }
  return (
    <div className={`app ${sidebarOpen ? '' : 'app--collapsed'}`}>
      <aside className="sidebar" aria-label="Straturile hărții" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!importing) importFiles(Array.from(event.dataTransfer.files)) }}>
        <header className="brand"><span className="brand-icon">◈</span><div><small>EXPLORATOR GEOGRAFIC</small><h1>Harta mea</h1></div></header>
        <p className="intro">Locuri, contururi și povești. Toate pe o singură hartă.</p>
        <label className="search"><span>Caută în straturile vizibile</span><input type="search" placeholder="Denumire, localitate, cod LMI…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <button className="import-button" disabled={importing} onClick={() => fileInput.current.click()}>{importing ? 'Se importă…' : '+ Importă GeoJSON'}</button>
        <input ref={fileInput} className="file-input" type="file" accept=".geojson,.json,application/geo+json,application/json" multiple onChange={event => importFiles(Array.from(event.target.files))} />
        <p className="hint">Sau trage fișierele aici · WGS84 · maximum 25 MB/fișier</p>
        {!!errors.length && <div className="errors" role="alert">{errors.map((error, index) => <p key={index}>{error}</p>)}<button onClick={() => setErrors([])}>Închide mesajele</button></div>}
        <div className="layer-heading"><h2>Straturile mele</h2><button onClick={() => setFocus({ data: { type: 'FeatureCollection', features: layers.filter(layer => layer.visible).flatMap(layer => layer.data.features) } })}>Vezi toate</button></div>
        
        {!layers.length && <p className="empty">Importă un fișier GeoJSON pentru a începe.</p>}
        <div className="layer-list">{layers.map(layer => <section className="layer-card" key={layer.id}>
          <div className="layer-title"><input type="checkbox" checked={layer.visible} aria-label={`Afișează ${layer.name}`} onChange={event => update(layer.id, { visible: event.target.checked })} /><span className="swatch" style={{ background: layer.color }} /><button className="layer-name" aria-expanded={expanded === layer.id} onClick={() => setExpanded(expanded === layer.id ? null : layer.id)}>{layer.name}</button><button aria-label={`Centrează ${layer.name}`} title="Centrează stratul" onClick={() => setFocus({ data: layer.data })}>⌖</button></div>
          {expanded === layer.id && <div className="layer-options"><label>Nume strat<input value={layer.name} onChange={event => update(layer.id, { name: event.target.value })} /></label><div className="layer-tools"><label>Culoare <input type="color" value={layer.color} onChange={event => update(layer.id, { color: event.target.value })} /></label><button onClick={() => download(layer)}>Exportă</button><button onClick={() => { setLayers(previous => previous.filter(item => item.id !== layer.id)); if (selected?.layerId === layer.id) setSelected(null) }}>Elimină</button></div><div className="feature-list">{layer.data.features.slice(0, 100).map((feature, index) => <button key={index} onClick={() => select(layer, feature)}>{featureName(feature, index)}</button>)}{layer.data.features.length > 100 && <p className="hint">Caută după atribute pentru a găsi alte obiecte.</p>}</div></div>}
        </section>)}</div>
        {query.trim() && <section className="results"><h2>Rezultatele căutării</h2>{results.length ? results.map(({ layer, feature, index }) => <button key={`${layer.id}-${index}`} onClick={() => select(layer, feature)}>{featureName(feature, index)}<small>{layer.name}</small></button>) : <p>Nu s-au găsit obiecte.</p>}<p className="hint">Se afișează maximum 50 de rezultate.</p></section>}
        <footer><label>Hartă de bază<select value={basemap} onChange={event => setBasemap(event.target.value)}><option value="streets">OpenStreetMap</option><option value="satellite">Satelit · Esri</option></select></label><p>Importurile rămân în această sesiune. Exportă straturile înainte de închiderea paginii.</p></footer>
      </aside>
      <main className="map-area" aria-label="Hartă interactivă">
        <MapContainer center={[45.15, 26.82]} zoom={9} zoomControl={false}>
          {basemap === 'streets' ? <TileLayer key="streets" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' /> : <TileLayer key="satellite" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community" />}
          <MapLayers layers={layers} focus={focus} onSelect={setSelected} />
          <MapControls />
        </MapContainer>
        <button className="sidebar-toggle" aria-label={sidebarOpen ? 'Ascunde panoul' : 'Deschide panoul'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '‹' : '☰'}</button>
        <div className="map-caption">HARTA MEA <span>O perspectivă asupra locurilor</span></div>
        {selected && selectedLayer && <section className="details" aria-label="Detalii obiect"><button className="close" aria-label="Închide detaliile" onClick={() => setSelected(null)}>×</button><small>{selectedLayer.name}</small><h2>{featureName(selected.feature, selectedLayer.data.features.indexOf(selected.feature))}</h2><dl>{Object.entries(selected.feature.properties ?? {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value === null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>{!Object.keys(selected.feature.properties ?? {}).length && <p>Acest obiect nu are atribute.</p>}</section>}
      </main>
    </div>
  )
}
function MapControls() {
  const map = useMap()
  return <div className="zoom-controls"><button aria-label="Mărește harta" onClick={() => map.zoomIn()}>+</button><button aria-label="Micșorează harta" onClick={() => map.zoomOut()}>−</button></div>
}
export default App
