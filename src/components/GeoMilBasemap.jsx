import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { dynamicMapLayer } from 'esri-leaflet'

function GeoMilBasemap() {
  const map = useMap()

  useEffect(() => {
    const geoMilLayer = dynamicMapLayer({
      url: 'https://inspire.geomil.ro/network/rest/services/Ortofoto/RGBS42S70/MapServer',
      opacity: 1,
    })

    geoMilLayer.addTo(map)

    return () => {
      map.removeLayer(geoMilLayer)
    }
  }, [map])

  return null
}

export default GeoMilBasemap