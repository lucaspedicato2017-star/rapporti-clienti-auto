Rapporti Clienti – Reperibilità (PWA)

REQUISITI
- Hosting HTTPS (obbligatorio per Service Worker).
- Funziona su:
  - iPhone/iPad (Safari) tramite “Aggiungi a Home”.
  - Android (Chrome/Edge) tramite “Installa app”.

CONTENUTO CARTELLA (root del sito)
- index.html
- manifest.json            (uguale al manifest.webmanifest, per compatibilità col tuo index)
- manifest.webmanifest
- service-worker.js
- icons/
  - icon-192.png
  - icon-512.png
- .well-known/assetlinks.json   (serve SOLO se vuoi creare APK TWA)

NOTE IMPORTANTI iPhone (iOS)
- L’installazione si fa così: Safari → Condividi → “Aggiungi a Home”.
- iOS ha alcune limitazioni rispetto ad Android (es. certe API, push in base alla versione), ma la PWA funziona.

PUBBLICARE SU GITHUB PAGES (semplice)
OPZIONE A (consigliata se vuoi anche APK TWA con assetlinks):
1) Crea repo chiamato: <tuo-utente>.github.io
2) Carica tutti i file nella root del repo
3) GitHub Pages è già attivo su https://<tuo-utente>.github.io/

OPZIONE B (repo normale “project pages”):
1) Crea repo (es: rapporti-clienti)
2) Carica tutti i file nella root del repo
3) Settings → Pages → Deploy from branch → main / root
4) URL sarà: https://<tuo-utente>.github.io/rapporti-clienti/

ATTENZIONE (importante per APK TWA):
- Android TWA richiede che assetlinks.json sia disponibile a:
  https://DOMINIO/.well-known/assetlinks.json
- Se usi GitHub Pages “project pages” (URL con /repo/), NON sei alla root del dominio.
  Per TWA è meglio:
  - usare un dominio tuo (custom domain) oppure
  - usare l’opzione A (<tuo-utente>.github.io) che è root del dominio.

CREARE APK (Android) CON PWABuilder (TWA)
1) Pubblica prima la PWA (GitHub Pages o dominio tuo).
2) Apri PWABuilder e inserisci l’URL della PWA.
3) Genera pacchetto Android (TWA).
4) PWABuilder ti fornisce/usa un assetlinks.json legato alla chiave di firma dell’APK.
5) Metti l’assetlinks.json esattamente in:
   /.well-known/assetlinks.json
   sullo STESSO DOMINIO della PWA.
6) Reinstalla/Prova l’APK.

TEST VELOCE
- Android: apri URL in Chrome → menu → “Installa app”.
- iPhone: apri URL in Safari → Condividi → “Aggiungi a Home”.
- Prova in modalità aereo: l’app deve aprirsi (cache base).
