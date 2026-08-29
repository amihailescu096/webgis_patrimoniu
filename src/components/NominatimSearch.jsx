import { useState } from 'react'
import { useMap } from 'react-leaflet'
import './NominatimSearch.css'

function NominatimSearch() {
  const map = useMap()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  const searchLocation = async () => {
    if (!query.trim()) return

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5`
      )

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Eroare la căutarea Nominatim:', error)
    }
  }

  const goToResult = (result) => {
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)

    map.setView([lat, lon], 16)
    setResults([])
  }

  return (
    <div className="nominatim-search">
      <h3>Căutare</h3>

      <div className="nominatim-search-row">
        <input
          type="text"
          value={query}
          placeholder="Localitate sau adresă"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              searchLocation()
            }
          }}
        />

        <button onClick={searchLocation}>Caută</button>
      </div>

      {results.length > 0 && (
        <div className="nominatim-results">
          {results.map((result) => (
            <button
              key={result.place_id}
              className="nominatim-result"
              onClick={() => goToResult(result)}
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default NominatimSearch