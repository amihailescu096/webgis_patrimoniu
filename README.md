# Harta mea · GeoJSON

Aplicație React și Leaflet cu o interfață de hartă și straturi, în stil Google My Maps. Pornește fără date preîncărcate, fără statistici și fără grafice.

## Utilizare

- Importă unul sau mai multe fișiere `.geojson` / `.json`, prin buton sau tragere în panoul lateral.
- Sunt acceptate FeatureCollection, Feature, geometrii simple, multiple și GeometryCollection în WGS84 (EPSG:4326), maximum 25 MB per fișier.
- Activează/ascunde straturi și centrează harta pe un strat sau pe toate straturile vizibile.
- Deschide un strat pentru redenumire, culoare, export sau eliminare.
- Caută în atributele straturilor vizibile și selectează un obiect pentru centrare și detalii.
- Alege OpenStreetMap sau imaginile satelit Esri.

Fișierele importate sunt citite local, în browser, și nu sunt trimise unui server. Straturile sunt păstrate numai pentru sesiunea curentă; exportă-le înainte de reîncărcarea/închiderea paginii. Hărțile de bază necesită internet și solicită tile-uri furnizorilor corespunzători.

## Dezvoltare

```sh
npm ci
npm run dev
npm run build
npm run lint
node --test src/geojson.test.js
```

Pentru publicare într-un subdirector, configurează `base` în `vite.config.js` conform adresei finale.
