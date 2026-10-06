# Harta mea — GeoJSON pe GitHub Pages

Hartă interactivă fără statistici, grafice sau date de patrimoniu preîncărcate. Import WGS84 de maximum 150 MB/fișier, nume de obiect din orice coloană (inclusiv cod LMI), tabel complet de atribute cu paginare și căutare.

## Pornire locală

Node.js 22.12 sau mai nou: `npm ci`, apoi `npm run dev`. Deschide adresa afișată cu `?edit=1` pentru editor. Fără acest parametru, aplicația afișează harta publicată, în mod de vizualizare.

## Activarea găzduirii gratuite

Integrează modificările în main. În repository: Settings → Pages → Build and deployment → Source → GitHub Actions. Workflow-ul `.github/workflows/pages.yml` construiește și publică site-ul la fiecare actualizare a main. Dacă prima execuție a eșuat înainte de activare, rulează din nou workflow-ul din Actions.

Adresa: https://amihailescu096.github.io/webgis_patrimoniu/

## Publicarea straturilor

1. Deschide aplicația cu `?edit=1`. Importă GeoJSON-urile, setează titlul, culorile și coloana pentru numele obiectelor.
2. Apasă **Exportă pachetul pentru GitHub**. Dezarhivează `harta-pentru-github.zip` pe calculator.
3. În repository, în folderul `public/data`, folosește Add file → Upload files pentru a încărca **conținutul** folderului `public/data` din arhivă: `map.json` și toate fișierele `.part`. Înlocuiește fișierele cu același nume și confirmă modificarea în main. Nu încărca arhiva ZIP ca atare. Fișierele vechi nefolosite pot fi șterse.
4. Așteaptă ca workflow-ul Actions să fie verde. Vizitatorii văd noua hartă după reîncărcare.

Exportul împarte automat fiecare strat în fișiere de maximum 20 MiB. Un GeoJSON de 68 MB poate astfel fi încărcat prin browser. Fișierele `.part` sunt segmente ale aceluiași GeoJSON; nu le edita și nu le redenumi. Aplicația le reasamblează înainte de import și validare.

Doar persoanele cu drept de scriere în GitHub pot schimba versiunea publicată. Editorul este o copie temporară în browser, fără autentificare și fără acces de scriere la repository. Oricine poate pregăti o copie proprie, dar nu poate publica în repository-ul tău fără permisiune. Exportă înainte de reîncărcare: editorul nu salvează automat.

Repository-ul, configurația și datele publicate sunt publice și pot fi descărcate. Găzduirea nu necesită laptopul pornit, PostGIS sau un server propriu. Geometrii foarte mari pot încărca mai lent: se descarcă întregul strat și se desenează progresiv. GitHub Pages are limite de dimensiune și trafic; această variantă este destinată hărților de dimensiuni moderate.

## Verificare

`npm test`, `npm run lint`, `npm run build -- --base /webgis_patrimoniu/`.
