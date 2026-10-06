# Harta mea · GeoJSON

Aplicație React și Leaflet cu o interfață de hartă și straturi, în stil Google My Maps. Pornește fără date preîncărcate, fără statistici și fără grafice.

## Utilizare

- Importă unul sau mai multe fișiere `.geojson` / `.json`, prin buton sau tragere în panoul lateral.
- Sunt acceptate FeatureCollection, Feature, geometrii simple, multiple și GeometryCollection în WGS84 (EPSG:4326), maximum 150 MB per fișier.
- Activează/ascunde straturi și centrează harta pe un strat sau pe toate straturile vizibile.
- Deschide un strat pentru redenumire, culoare, export sau eliminare.
- Caută în atributele straturilor vizibile și selectează un obiect pentru centrare și detalii.
- Alege coloana pentru numele obiectelor (de exemplu `Cod_LMI`); selecția se aplică în listă, rezultate, detalii și tabel. Câmpurile LMI uzuale sunt detectate automat.
- Deschide tabelul complet de atribute: toate coloanele, căutare, 100 de rânduri per pagină și acces direct la pagină.
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

Importul este citit și validat într-un Web Worker. Harta folosește Canvas și desenare în loturi; schimbarea numelui stratului sau a coloanei de titlu nu recreează geometria. Fișierele mari consumă memorie în funcție de numărul de coordonate și de obiecte; limita de 150 MB nu garantează aceeași performanță pe orice dispozitiv. Selecția coloanei pentru titlu este o setare a sesiunii și nu modifică atributele exportate.
