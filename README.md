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

Fișierele importate sunt citite și validate local în browser. Butonul **Salvează și publică harta** le încarcă pe server și păstrează straturile și configurația. Modificările nesalvate sunt doar în sesiunea curentă. Hărțile de bază necesită internet și solicită tile-uri furnizorilor corespunzători.

## Dezvoltare

```sh
npm ci
npm run dev
npm run build
npm run lint
node --test src/geojson.test.js
```

Pentru publicare într-un subdirector, configurează `base` în `vite.config.js` conform adresei finale.

Importul este citit și validat într-un Web Worker. Harta folosește Canvas și desenare în loturi; schimbarea numelui stratului sau a coloanei de titlu nu recreează geometria. Fișierele mari consumă memorie în funcție de numărul de coordonate și de obiecte; limita de 150 MB nu garantează aceeași performanță pe orice dispozitiv. Selecția coloanei pentru titlu este salvată în configurația hărții și nu modifică atributele exportate.

## Salvare și partajare

Aplicația include acum un server Node.js, fără necesar de PostGIS sau de o bază de date separată. Un singur administrator se autentifică prin parolă și folosește **Salvează și publică harta**. Fișierele, ordinea straturilor, numele, culorile, coloana de titlu și vizibilitatea inițială sunt salvate pe server. Linkul `/?map=ID` afișează harta în mod de vizualizare, cu căutare, tabel și vizibilitate locală a straturilor. Vizitatorii nu pot scrie pe server. Datele publicate sunt accesibile și descărcabile oricui are linkul; acesta nu este o restricție de acces pentru date confidențiale.

Modificările administratorului sunt publicate explicit prin salvare. Vizitatorii reîncarcă pagina pentru versiunea nouă. Setările locale ale vizitatorilor nu afectează harta publicată. Salvarea verifică versiunea pentru a evita suprascrierea din două sesiuni. Fișierele noi sunt încărcate înainte de publicarea atomică a configurației, astfel încât un import eșuat nu înlocuiește harta publicată.

### Test local

Necesită Node.js 24. Într-un terminal:

```sh
npm ci
cp .env.example .env
read -rs -p 'Parola administratorului (minimum 12 caractere): ' map_owner_password
printf '%s' "$map_owner_password" | node server/hash-password.js
unset map_owner_password
```

Copiază hash-ul rezultat în `OWNER_PASSWORD_HASH` din `.env`, nu parola. Apoi pornește serverul:

```sh
npm run server
```

În alt terminal:

```sh
npm run dev
```

Deschide `http://localhost:5173`, autentifică-te cu parola aleasă, importă fișierele și salvează. Deschide linkul copiat într-o fereastră privată pentru vizualizarea publică. `PUBLIC_ORIGIN` trebuie să coincidă exact cu originea din browser, inclusiv portul. Nu folosi modul development pentru un server public.

### Publicare online pe Render

Repo-ul conține `render.yaml`, o configurație pentru un serviciu Node cu 2 GB RAM și disc persistent de 5 GB. Configurația este pregătită; simpla existență a fișierului în GitHub nu creează un server. Crearea serviciului implică taxe de găzduire. Verifică prețurile înainte de activare: https://render.com/pricing . Discurile persistente necesită un serviciu plătit: https://render.com/docs/disks .

1. Integrează pull request-ul în branch-ul din care vrei să publici sau selectează branch-ul lui în Render.
2. În contul tău Render, conectează repository-ul privat și creează un Blueprint din `render.yaml` (sau un Web Service cu aceleași setări).
3. Configurează `OWNER_PASSWORD_HASH` cu hash-ul generat local și `PUBLIC_ORIGIN` cu adresa HTTPS exactă atribuită aplicației, de exemplu `https://numele-tau.onrender.com`. Nu include o cale sau slash final.
4. Verifică discul persistent montat la `/var/data` și `DATA_DIR=/var/data/harta`. Fără disc persistent, redeploy-ul poate pierde fișierele.
5. După deploy, autentifică-te, importă GeoJSON-urile și publică harta. Trimite doar linkul de vizualizare, nu parola.

În producție sunt folosite cookie-uri HttpOnly, Secure și SameSite=Strict. Operațiile de scriere verifică sesiunea administratorului și originea cererii pe server. Parola nu apare în frontend. Sesiunile durează maximum 12 ore și sunt invalidate la restart. Schimbarea hash-ului și restartul schimbă parola și invalidează sesiunile.

Serverul este destinat unei singure instanțe cu disc persistent. Asigură backup pentru întregul director DATA_DIR. Straturile eliminate nu mai sunt accesibile public prin API, însă fișierele lor rămân pe disc pentru recuperare; și importurile nepublicate pot rămâne pe disc. Administratorul trebuie să gestioneze spațiul și backup-urile. Nu introduce volumele de stocare în repository. Fișierele mari necesită memorie și lățime de bandă proporționale cu datele; limitele proxy-ului și ale furnizorului trebuie verificate la publicare.

Pentru alte servere, `Dockerfile` construiește aplicația; montează un volum persistent la `/data`, configurează hash-ul și originea HTTPS și folosește un reverse proxy cu TLS. Containerul nu conține nicio parolă și pornește numai dacă este configurat hash-ul.
