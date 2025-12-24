Rapporti Clienti - PWA (per PWABuilder / TWA)

CONTENUTO:
- index.html (la tua app)
- manifest.webmanifest (manifest PWA)
- service-worker.js (cache base)
- icons/ (icone 192 e 512)
- .well-known/assetlinks.json (placeholder: va sostituito con quello generato da PWABuilder)

COME PUBBLICARE (GitHub Pages):
1) Crea un repository su GitHub (es: rapporti-clienti)
2) Carica TUTTI questi file nella root del repository
3) Settings -> Pages -> Build and deployment: Deploy from a branch -> Branch: main / root -> Save
4) Aspetta l'URL https://<utente>.github.io/<repo>/
5) Controlla che funzioni da telefono.

COME CREARE L'APK con PWABuilder:
1) Apri PWABuilder e inserisci l'URL della tua PWA (quello GitHub Pages)
2) Genera Android package (TWA)
3) Dal pacchetto scaricato, prendi il file assetlinks.json
4) Sostituisci il placeholder in /.well-known/assetlinks.json sul tuo sito con quello vero
5) Ricompila l'APK se necessario e prova.
