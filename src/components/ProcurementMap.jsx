import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_COORDINATES = [20.7453, 78.6022]

const CENTRE_COORDINATES = {
  'wardha-pacs': [20.7453, 78.6022],
  'hinganghat-mandi': [20.5488, 78.8398],
  'arvi-yard': [20.9957, 78.2294],
}

function getCoordinates(centre) {
  if (Array.isArray(centre?.coordinates) && centre.coordinates.length === 2) {
    return centre.coordinates
  }

  if (Number.isFinite(centre?.latitude) && Number.isFinite(centre?.longitude)) {
    return [centre.latitude, centre.longitude]
  }

  return CENTRE_COORDINATES[centre?.id] || DEFAULT_COORDINATES
}

function createMarkerIcon(isSelected) {
  return L.divIcon({
    className: `procurement-marker ${isSelected ? 'procurement-marker-selected' : ''}`,
    html: '<span class="procurement-marker-dot"></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  })
}

function MapViewport({ centre }) {
  const map = useMap()

  useEffect(() => {
    if (!centre) return
    map.flyTo(getCoordinates(centre), Math.max(map.getZoom(), 10), {
      duration: 0.7,
    })
  }, [centre, map])

  return null
}

function ProcurementMap({ centres, selectedCentreId, onSelectCentre }) {
  const selectedCentre = centres.find((centre) => centre.id === selectedCentreId) || centres[0]
  const mapCentre = getCoordinates(selectedCentre)

  return (
    <MapContainer
      center={mapCentre}
      zoom={10}
      scrollWheelZoom
      className="procurement-map"
      aria-label="Live procurement centre map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport centre={selectedCentre} />
      {centres.map((centre) => {
        const isSelected = centre.id === selectedCentreId

        return (
          <Marker
            key={centre.id}
            position={getCoordinates(centre)}
            icon={createMarkerIcon(isSelected)}
            eventHandlers={{ click: () => onSelectCentre(centre.id) }}
          >
            <Popup>
              <div className="procurement-popup">
                <strong>{centre.name}</strong>
                <span>{centre.location}</span>
                <button type="button" onClick={() => onSelectCentre(centre.id)}>
                  {isSelected ? 'Selected centre' : 'Select centre'}
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

export default ProcurementMap
