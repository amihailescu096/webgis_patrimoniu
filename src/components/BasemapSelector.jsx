import './BasemapSelector.css'

function BasemapSelector({ basemap, setBasemap }) {
  return (
    <div className="basemap-selector">
      <h3>Hartă de bază</h3>

      <label>
        <input
          type="radio"
          name="basemap"
          value="osm"
          checked={basemap === 'osm'}
          onChange={(e) => setBasemap(e.target.value)}
        />
        OpenStreetMap
      </label>

      <label>
        <input
          type="radio"
          name="basemap"
          value="geomil"
          checked={basemap === 'geomil'}
          onChange={(e) => setBasemap(e.target.value)}
        />
        GeoMil Ortofoto
      </label>
    </div>
  )
}

export default BasemapSelector