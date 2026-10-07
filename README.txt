FOREST GUARDIAN v3
===================
This version contains a REAL geographic interactive map using Leaflet + OpenStreetMap tiles.

Features:
- Pan/zoom geographic map
- Search real places using OpenStreetMap Nominatim
- Click any point on the map
- Browser "My Location" support
- Retrieves current weather at selected coordinates using Open-Meteo
- Uses temperature, humidity, wind and soil moisture plus vegetation dryness for a demonstration fire-risk estimate
- Manual predictor
- Detailed forest-fire information
- Alarm-style risk trend

IMPORTANT:
The geographic map is real, but the fire-risk score is an academic demonstration. It is NOT a live wildfire warning service and does not use official fire detections. For a production/research version, connect official fire/vegetation datasets and a trained ML model.

INTERNET:
Because the geographic map and weather/geocoding use online services, the map features require an internet connection when you open index.html.

FILES:
index.html
style.css
script.js
README.txt


TROUBLESHOOTING MAP ACCESS
==========================
This version removes the mismatched integrity checks that can cause Chrome to block Leaflet resources.
The basemap is switched to CARTO's light map tiles, while place search uses OpenStreetMap Nominatim and weather uses Open-Meteo.

If Chrome still blocks map tiles:
1. Make sure the computer has internet access.
2. Do not open the ZIP itself; extract it first.
3. Open index.html after extraction.
4. If your college/network blocks map services, run the folder from a local web server (for example VS Code Live Server) rather than file://.


v3.1 MAP FIXES
==============
- Leaflet now loads from 3 CDNs (unpkg -> jsDelivr -> cdnjs) so one blocked CDN no longer breaks the map.
- Basemap auto-falls back: CARTO -> OpenStreetMap -> Esri if tiles fail to load.
- Map size is re-calculated after load/resize (fixes grey or half-drawn map).
- Map no longer overlaps the sticky top navigation bar when scrolling.
- Soil moisture is requested via Open-Meteo hourly data (more reliable than "current"), with a retry without it.
- Outdated weather responses can no longer overwrite a newer click.
