import { useState } from 'react'
import L from 'leaflet'
import { GeoJSON, useMap } from 'react-leaflet'
import './GeoJsonDashboard.css'

function GeoJsonDashboard({
  monumentePunct,
  monumenteMultipoligon,
  zoneProtectie,
}) {
  const map = useMap()
  const [isOpen, setIsOpen] = useState(false)
  const [datasetId, setDatasetId] = useState('multipoligon')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [groupField, setGroupField] = useState('UAT')
  const [operation, setOperation] = useState('count')
  const [valueField, setValueField] = useState('suprafata_mp')
  const [chartType, setChartType] = useState('bars')
  const [selectedFeature, setSelectedFeature] = useState(null)

  const datasets = [
    {
      id: 'puncte',
      name: 'Monumente — punct',
      filename: 'monumente_punct_postgis.geojson',
      data: monumentePunct,
    },
    {
      id: 'multipoligon',
      name: 'Monumente — suprafață',
      filename: 'monumente_multipoligon_postgis.geojson',
      data: monumenteMultipoligon,
    },
    {
      id: 'zone',
      name: 'Zone de protecție',
      filename: 'zone_protectie_postgis.geojson',
      data: zoneProtectie,
    },
  ]

  const dataset =
    datasets.find((item) => item.id === datasetId) ?? datasets[0]

  const features = dataset?.data?.features ?? []

  const columns = [
    ...new Set(
      features.flatMap((feature) =>
        Object.keys(feature.properties ?? {})
      )
    ),
  ]

  const geometryTypes = [
    ...new Set(
      features
        .map((feature) => feature.geometry?.type)
        .filter(Boolean)
    ),
  ]
const pageSize = 8

const filteredFeatures = features.filter((feature) => {
  if (!search.trim()) return true

  const text = Object.values(feature.properties ?? {})
    .join(' ')
    .toLowerCase()

  return text.includes(search.toLowerCase())
})

const totalPages = Math.max(
  1,
  Math.ceil(filteredFeatures.length / pageSize)
)

const currentPage = Math.min(page, totalPages)

const paginatedFeatures = filteredFeatures.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize
)

const numericFields = ['suprafata_mp', 'suprafata_ha'].filter((field) =>
  columns.includes(field)
)

const canCalculateArea = datasetId !== 'puncte' && numericFields.length > 0

const aggregationMap = filteredFeatures.reduce((acc, feature) => {
  const group = String(
    feature.properties?.[groupField] ?? 'Fără valoare'
  )

  if (!acc[group]) {
    acc[group] = {
      count: 0,
      sum: 0,
    }
  }

  acc[group].count += 1

  const rawValue = Number(feature.properties?.[valueField])
  if (Number.isFinite(rawValue)) {
    acc[group].sum += rawValue
  }

  return acc
}, {})

const aggregatedData = Object.entries(aggregationMap)
  .map(([label, stats]) => {
    let value = stats.count

    if (operation === 'sum') {
      value = stats.sum
    }

    if (operation === 'average') {
      value = stats.count ? stats.sum / stats.count : 0
    }

    return {
      label,
      value,
      count: stats.count,
    }
  })
  .sort((a, b) => b.value - a.value)
  .slice(0, 10)

const formatValue = (value) => {
  if (operation === 'count') return String(value)

  return new Intl.NumberFormat('ro-RO', {
    maximumFractionDigits: valueField === 'suprafata_ha' ? 2 : 0,
  }).format(value)
}

const calculationLabel =
  operation === 'count'
    ? 'Număr obiecte'
    : operation === 'sum'
      ? `Sumă ${valueField}`
      : `Medie ${valueField}`

  function selectFeature(feature) {
    setSelectedFeature(feature)

    const featureLayer = L.geoJSON(feature)
    const bounds = featureLayer.getBounds()

    if (
      bounds.isValid() &&
      !bounds.getNorthEast().equals(bounds.getSouthWest())
    ) {
      map.fitBounds(bounds, {
        maxZoom: 17,
        padding: [60, 60],
      })
      return
    }

    const coordinates = feature.geometry?.coordinates

    if (
      feature.geometry?.type === 'Point' &&
      Array.isArray(coordinates) &&
      coordinates.length >= 2
    ) {
      map.flyTo([coordinates[1], coordinates[0]], 17)
    }
  }

  if (!isOpen) {
    return (
      <div className="geo-dashboard">
        <button
          className="geo-dashboard__launcher"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          <span className="geo-dashboard__launcher-icon">▦</span>

          <span>
            <small>Explorare date</small>
            <strong>Deschide dashboard</strong>
          </span>
        </button>
      </div>
    )
  }

  return (
    <>
      {selectedFeature && (
        <GeoJSON
          key={`${datasetId}-${JSON.stringify(selectedFeature.geometry)}`}
          data={selectedFeature}
          style={{
            color: '#00e5ff',
            fillColor: '#00e5ff',
            fillOpacity: 0.45,
            weight: 5,
          }}
          pointToLayer={(_feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 10,
              color: '#ffffff',
              weight: 4,
              fillColor: '#00a9c0',
              fillOpacity: 1,
            })
          }
        />
      )}

      <section className="geo-dashboard geo-dashboard--open">
      <header className="geo-dashboard__header">
        <div className="geo-dashboard__title">
          <span className="geo-dashboard__title-icon">▦</span>

          <span>
            <small>GeoJSON Data Explorer</small>
            <strong>{dataset.name}</strong>
          </span>
        </div>

        <div className="geo-dashboard__actions">
          <label>
            <span>Dataset</span>

            <select
              value={datasetId}
              onChange={(event) => {
                const nextDatasetId = event.target.value
                setDatasetId(nextDatasetId)
                setSelectedFeature(null)
                setSearch('')
                setPage(1)

                if (nextDatasetId === 'puncte') {
                  setOperation('count')
                }
              }}
            >
              {datasets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <button
            className="geo-dashboard__close"
            type="button"
            aria-label="Închide dashboard"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
        </div>
      </header>

      <div className="geo-dashboard__body">
        <aside className="geo-dashboard__summary">
          <div>
            <span>Features</span>
            <strong>{features.length}</strong>
          </div>

          <div>
            <span>Atribute</span>
            <strong>{columns.length}</strong>
          </div>

          <div>
            <span>Geometrie</span>
            <strong>{geometryTypes.join(', ') || '—'}</strong>
          </div>

          <p>{dataset.filename}</p>
        </aside>

        <main className="geo-dashboard__content">
          <div className="geo-dashboard__analysis-controls">
  <label>
    <span>Group by</span>

    <select
      value={groupField}
      onChange={(event) => setGroupField(event.target.value)}
    >
      {columns.map((column) => (
        <option key={column} value={column}>
          {column}
        </option>
      ))}
    </select>
  </label>

  <label>
    <span>Calculation</span>

    <select
      value={operation}
      onChange={(event) => {
        const nextOperation = event.target.value
        setOperation(nextOperation)

        if (nextOperation !== 'count') {
          setChartType('bars')
        }
      }}
    >
      <option value="count">Feature count</option>
      {canCalculateArea && <option value="sum">Sum</option>}
      {canCalculateArea && <option value="average">Average</option>}
    </select>
  </label>

  {operation !== 'count' && canCalculateArea && (
    <label>
      <span>Value field</span>

      <select
        value={valueField}
        onChange={(event) => setValueField(event.target.value)}
      >
        {numericFields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </label>
  )}

  <label>
    <span>Chart</span>

    <select
      value={chartType}
      onChange={(event) => setChartType(event.target.value)}
    >
      <option value="bars">Bars</option>
      {operation === 'count' && <option value="donut">Share</option>}
    </select>
  </label>
</div>

{chartType === 'bars' && (
  <div className="geo-dashboard__chart">
    <h4>{calculationLabel} după {groupField}</h4>

    <div className="geo-dashboard__bars">
      {aggregatedData.map((item) => {
        const maxValue = aggregatedData[0]?.value || 1
        const width = (item.value / maxValue) * 100

        return (
          <div className="geo-dashboard__bar-row" key={item.label}>
            <span className="geo-dashboard__bar-label">
              {item.label}
            </span>

            <div className="geo-dashboard__bar-track">
              <div
                className="geo-dashboard__bar-fill"
                style={{ width: `${width}%` }}
              />
            </div>

            <strong>{formatValue(item.value)}</strong>
          </div>
        )
      })}
    </div>
  </div>
)}

{chartType === 'donut' && (
  <div className="geo-dashboard__chart">
    <h4>Pondere după {groupField}</h4>

    {(() => {
      const allGroups = Object.entries(
        filteredFeatures.reduce((acc, feature) => {
          const group = String(
            feature.properties?.[groupField] ?? 'Fără valoare'
          )

          acc[group] = (acc[group] ?? 0) + 1
          return acc
        }, {})
      )
        .map(([label, value]) => ({
          label,
          value,
        }))
        .sort((a, b) => b.value - a.value)

      const topGroups = allGroups.slice(0, 9)

      const otherValue = allGroups
        .slice(9)
        .reduce((sum, item) => sum + item.value, 0)

      const donutData =
        otherValue > 0
          ? [
              ...topGroups,
              {
                label: 'Altele',
                value: otherValue,
              },
            ]
          : topGroups

      const total = donutData.reduce(
        (sum, item) => sum + item.value,
        0
      )

      let currentAngle = 0

      const segments = donutData.map((item, index) => {
        const angle = total ? (item.value / total) * 360 : 0
        const start = currentAngle
        const end = currentAngle + angle

        currentAngle = end

        return {
          ...item,
          index,
          start,
          end,
          percent: total ? (item.value / total) * 100 : 0,
        }
      })

      const colors = [
        '#4f8f68',
        '#5f9f78',
        '#70ad88',
        '#82ba98',
        '#95c6a8',
        '#a8d1b8',
        '#badbc7',
        '#cce5d6',
        '#dceee3',
        '#edf6ef',
      ]

      const gradient = segments
        .map(
          (item) =>
            `${colors[item.index % colors.length]} ${item.start}deg ${item.end}deg`
        )
        .join(', ')

      return (
        <div className="geo-dashboard__donut-layout">
          <div
            className="geo-dashboard__donut"
            style={{
              background: `conic-gradient(${gradient})`,
            }}
          >
            <div className="geo-dashboard__donut-hole">
              <strong>{total}</strong>
              <span>obiecte</span>
            </div>
          </div>

          <div className="geo-dashboard__legend">
            {segments.map((item) => (
              <div
                className="geo-dashboard__legend-item"
                key={item.label}
              >
                <span
                  className="geo-dashboard__legend-color"
                  style={{
                    background: colors[item.index % colors.length],
                  }}
                />

                <span className="geo-dashboard__legend-label">
                  {item.label}
                </span>

                <strong>{item.percent.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </div>
      )
    })()}
  </div>
)}

  {chartType !== 'donut' && (
    <>
        <div className="geo-dashboard__search">
          <input
            type="search"
            value={search}
            placeholder="Caută în atribute..."
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />

          <span>
            {filteredFeatures.length} din {features.length} obiecte
          </span>
        </div>

        <div className="geo-dashboard__table-wrap">
          <table className="geo-dashboard__table">
            <thead>
              <tr>
                <th>#</th>

                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {paginatedFeatures.map((feature, index) => {
                const absoluteIndex =
                  (currentPage - 1) * pageSize + index
                const isSelected = selectedFeature === feature

                return (
                  <tr
                    key={
                      feature.id ??
                      `${feature.properties?.fid ?? 'feature'}-${absoluteIndex}`
                    }
                    className={
                      isSelected
                        ? 'geo-dashboard__row--selected'
                        : ''
                    }
                    onClick={() => selectFeature(feature)}
                    title="Click pentru zoom la obiect"
                  >
                    <td>{absoluteIndex + 1}</td>

                    {columns.map((column) => (
                      <td key={column}>
                        {String(feature.properties?.[column] ?? '—')}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="geo-dashboard__pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            ← Anterior
          </button>

          <span>
            Pagina {currentPage} din {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() =>
              setPage((value) => Math.min(totalPages, value + 1))
            }
          >
            Următor →
          </button>
        </div>
    </>
  )}

</main>
      </div>
      </section>
    </>
  )
}

export default GeoJsonDashboard