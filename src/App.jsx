import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import PatrimoniuLayerControl from './components/PatrimoniuLayerControl'
import BasemapSelector from './components/BasemapSelector'
import GeoMilBasemap from './components/GeoMilBasemap'
import NominatimSearch from './components/NominatimSearch'
import GeoJsonDashboard from './components/GeoJsonDashboard'
import L from 'leaflet'

function App() {
  const [monumentePunct, setMonumentePunct] = useState(null)
  const [monumenteMultipoligon, setMonumenteMultipoligon] = useState(null)
  const [zoneProtectie, setZoneProtectie] = useState(null)

  const [showPuncte, setShowPuncte] = useState(true)
const [showMultipoligoane, setShowMultipoligoane] = useState(true)
const [showZoneProtectie, setShowZoneProtectie] = useState(true)
const [basemap, setBasemap] = useState('osm')

  useEffect(() => {
    Promise.all([
  fetch('/data/monumente_punct_postgis.geojson').then((r) => r.json()),
  fetch('/data/monumente_multipoligon_postgis.geojson').then((r) => r.json()),
  fetch('/data/zone_protectie_postgis.geojson').then((r) => r.json()),
])
      .then(([puncte, multipoligoane, zone]) => {
        setMonumentePunct(puncte)
        setMonumenteMultipoligon(multipoligoane)
        setZoneProtectie(zone)
      })
      .catch((error) =>
        console.error('Eroare la încărcarea datelor GeoJSON:', error)
      )
  }, [])

  const popupMonument = (feature, layer) => {
    const p = feature.properties

    layer.bindPopup(`
      <strong>${p.Denumire ?? 'Monument istoric'}</strong><br/>
      Cod LMI: ${p.Cod_LMI_main ?? p.Cod_LMI ?? '-'}<br/>
      UAT: ${p.UAT ?? '-'}<br/>
      Localitate: ${p.Localitate ?? '-'}<br/>
      Adresă: ${p.Adresa ?? '-'}
    `)
  }

  const popupZonaProtectie = (feature, layer) => {
    const p = feature.properties

    layer.bindPopup(`
      <strong>Zonă de protecție</strong><br/>
      Monument: ${p.Denumire ?? '-'}<br/>
      Cod LMI: ${p.Cod_LMI ?? '-'}<br/>
      UAT: ${p.UAT ?? '-'}<br/>
      Localitate: ${p.Localitate ?? '-'}
    `)
  }

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <PatrimoniuLayerControl
  showPuncte={showPuncte}
  setShowPuncte={setShowPuncte}
  showMultipoligoane={showMultipoligoane}
  setShowMultipoligoane={setShowMultipoligoane}
  showZoneProtectie={showZoneProtectie}
  setShowZoneProtectie={setShowZoneProtectie}
/>
      <MapContainer
        center={[45.15, 26.82]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
      >
        <GeoJsonDashboard
          monumentePunct={monumentePunct}
          monumenteMultipoligon={monumenteMultipoligon}
          zoneProtectie={zoneProtectie}
        />

        <NominatimSearch />
        {basemap === 'osm' && (
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="© OpenStreetMap contributors"
  />
)}

{basemap === 'geomil' && <GeoMilBasemap />}

        {showZoneProtectie && zoneProtectie && (
  <GeoJSON
    data={zoneProtectie}
    style={{
      color: '#ff7800',
      weight: 2,
      fillOpacity: 0.15,
    }}
    onEachFeature={popupZonaProtectie}
  />
)}

{showMultipoligoane && monumenteMultipoligon && (
  <GeoJSON
    data={monumenteMultipoligon}
    style={{
      color: '#c62828',
      weight: 2,
      fillOpacity: 0.35,
    }}
    onEachFeature={popupMonument}
  />
)}

{showPuncte && monumentePunct && (
  <GeoJSON
    data={monumentePunct}
    pointToLayer={(_feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#c62828',
        fillOpacity: 1,
      })
    }
    onEachFeature={popupMonument}
  />
)}
      </MapContainer>
      <BasemapSelector basemap={basemap} setBasemap={setBasemap} />
    </div>
  )
}

export default App