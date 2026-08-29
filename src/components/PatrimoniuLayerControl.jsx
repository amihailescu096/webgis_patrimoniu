import './PatrimoniuLayerControl.css'

function PatrimoniuLayerControl({
  showPuncte,
  setShowPuncte,
  showMultipoligoane,
  setShowMultipoligoane,
  showZoneProtectie,
  setShowZoneProtectie,
}) {
  return (
    <div className="patrimoniu-layer-control">
      <h3>Straturi patrimoniu</h3>

      <label>
        <input
          type="checkbox"
          checked={showPuncte}
          onChange={(e) => setShowPuncte(e.target.checked)}
        />
        Monumente istorice — punct
      </label>

      <label>
        <input
          type="checkbox"
          checked={showMultipoligoane}
          onChange={(e) => setShowMultipoligoane(e.target.checked)}
        />
        Monumente istorice — suprafață
      </label>

      <label>
        <input
          type="checkbox"
          checked={showZoneProtectie}
          onChange={(e) => setShowZoneProtectie(e.target.checked)}
        />
        Zone de protecție
      </label>
    </div>
  )
}

export default PatrimoniuLayerControl