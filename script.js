let map, marker, selectedCoords=null;

const $=id=>document.getElementById(id);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function showMapFallback(msg){
  $("realMap").innerHTML='<div class="map-fallback"><b>Map could not be loaded</b><span>'+msg+'</span></div>';
  $("mapStatus").textContent="Map unavailable. You can still use the Manual AI Fire-Risk Predictor below.";
}
function initMap(){
  if(typeof L==="undefined"){
    showMapFallback("The Leaflet map library was blocked or offline. Check your internet connection, or open the site with a local server (e.g. VS Code Live Server) instead of double-clicking index.html.");
    return;
  }
  map=L.map("realMap").setView([22.5,79.0],5);
  // Terrain basemap only (OpenTopoMap, no API key needed)
  let errors=0,loaded=false;
  const terrain=L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{subdomains:"abc",maxZoom:17,attribution:"© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)"});
  terrain.on("tileload",()=>{loaded=true;errors=0});
  terrain.on("tileerror",()=>{
    errors++;
    if(!loaded&&errors===4) $("mapStatus").textContent="Terrain map tiles could not be loaded. Check internet/firewall, or run via a local web server.";
  });
  terrain.addTo(map);
  map.on("click",e=>selectLocation(e.latlng.lat,e.latlng.lng,null));
  // Re-measure the map container (fixes grey / half-drawn maps)
  const fix=()=>map.invalidateSize();
  setTimeout(fix,100);setTimeout(fix,600);
  window.addEventListener("load",fix);window.addEventListener("resize",fix);
  if("ResizeObserver" in window) new ResizeObserver(fix).observe($("realMap"));
}
let weatherToken=0;
async function getJSON(url){const r=await fetch(url);if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
async function loadWeather(lat,lon){
  const base=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&wind_speed_unit=kmh&timezone=auto`;
  let d,soil=null;
  try{
    d=await getJSON(base+"&hourly=soil_moisture_0_to_1cm&forecast_days=1");
    const h=d.hourly;
    if(h&&h.time&&h.soil_moisture_0_to_1cm){
      let i=0;
      for(let k=0;k<h.time.length;k++){if(h.time[k]<=d.current.time)i=k}
      soil=h.soil_moisture_0_to_1cm[i];
      if(soil==null) soil=h.soil_moisture_0_to_1cm.find(v=>v!=null)??null;
    }
  }catch(e){
    d=await getJSON(base); // retry without soil data
  }
  return {c:d.current,soil};
}
async function selectLocation(lat,lon,name){
 if(!map)return;
 selectedCoords={lat,lon};
 if(marker) marker.remove();
 marker=L.marker([lat,lon]).addTo(map).bindPopup("Selected location").openPopup();
 $("selectedArea").textContent=name||"Selected location";
 $("coordinates").textContent=`Latitude ${lat.toFixed(4)} · Longitude ${lon.toFixed(4)}`;
 $("locationRisk").textContent="—";$("locationRisk").className="selected-risk neutral";
 $("locationScore").textContent="Loading current weather…";
 $("analyzeLocation").disabled=true;
 $("mapStatus").textContent="Fetching current weather for the selected coordinates…";
 const token=++weatherToken;
 try{
   const {c,soil}=await loadWeather(lat,lon);
   if(token!==weatherToken) return;
   $("locTemp").textContent=(c.temperature_2m??"—")+"°C";
   $("locHumidity").textContent=(c.relative_humidity_2m??"—")+"%";
   $("locWind").textContent=(c.wind_speed_10m??"—")+" km/h";
   $("locSoil").textContent=soil==null?"—":Math.round(soil*100)+"%";
   $("locationScore").textContent="Weather loaded. Click Analyze Selected Area.";
   $("analyzeLocation").disabled=false;
   $("mapStatus").textContent="Current weather loaded. Add vegetation dryness and analyze the selected area.";
 }catch(e){
   if(token!==weatherToken) return;
   $("locationScore").textContent="Could not load weather.";
   $("mapStatus").textContent="Weather service could not be reached. Try again or use the manual predictor.";
 }
}

async function searchPlace(){
 const q=$("locationSearch").value.trim(); if(!q)return;
 $("mapStatus").textContent="Searching geographic location…";
 try{
  const u=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(q)}`;
  const r=await fetch(u,{headers:{Accept:"application/json"}}); if(!r.ok)throw new Error("HTTP "+r.status); const a=await r.json();
  if(!a.length){$("mapStatus").textContent="Location not found. Try a city, forest, park or region name.";return;}
  const p=a[0],lat=Number(p.lat),lon=Number(p.lon);
  if(map)map.setView([lat,lon],11); selectLocation(lat,lon,p.display_name);
 }catch(e){$("mapStatus").textContent="Search failed. Check your internet connection and try again."}
}

function riskScore(t,h,w,s,d,smoke=0){
 const temp=clamp((t-20)/25*100,0,100),hum=100-clamp(h,0,100),wind=clamp(w/60*100,0,100),soil=100-clamp(s,0,100);
 let r=.24*temp+.22*hum+.18*wind+.18*soil+.12*d+.06*smoke;
 return Math.round(clamp(r+(smoke>=60?10:0),0,99));
}
function riskClass(r){return r<30?"low":r<55?"moderate":r<75?"high":"extreme"}
function riskText(c){return c==="low"?"LOW":c==="moderate"?"MODERATE":c==="high"?"HIGH":"EXTREME"}

async function analyzeSelected(){
 if(!selectedCoords)return;
 const t=parseFloat($("locTemp").textContent),h=parseFloat($("locHumidity").textContent),w=parseFloat($("locWind").textContent);
 const sText=$("locSoil").textContent; const s=sText==="—"?50:parseFloat(sText); const d=Number($("mapDryness").value);
 if([t,h,w,s].some(Number.isNaN))return;
 const r=riskScore(t,h,w,s,d,0),c=riskClass(r);
 $("locationRisk").textContent=riskText(c);$("locationRisk").className="selected-risk "+c;
 $("locationScore").textContent=`Demonstration fire-risk estimate: ${r}%`;
 $("dashTemp").textContent=t+"°C";$("dashHumidity").textContent=h+"%";$("dashWind").textContent=w+" km/h";$("dashSoil").textContent=s+"%";
 renderTrend(r);
 $("mapStatus").textContent="Risk calculated from current weather at the selected coordinates.";
}

function manualPredict(){
 const t=+$("temperature").value,h=+$("humidity").value,w=+$("wind").value,s=+$("soil").value,d=+$("dryness").value,smoke=+$("smoke").value;
 const r=riskScore(t,h,w,s,d,smoke),c=riskClass(r);
 $("emptyResult").classList.add("hidden");$("resultPanel").classList.remove("hidden");
 $("riskLevel").textContent=riskText(c);$("riskLevel").className="risk-level "+c;$("riskScore").textContent=r+"%";
 $("meterFill").style.width=r+"%";$("meterFill").className="meter-fill "+c+"-fill";
 $("riskMessage").textContent=c==="low"?"Current conditions indicate relatively low fire risk.":c==="moderate"?"Some conditions are becoming favorable for fire. Increased monitoring is recommended.":c==="high"?"Several conditions are favorable for ignition or rapid spread. Preventive action is recommended.":"Environmental conditions indicate very high risk. Immediate monitoring and preventive measures are recommended.";
 const f=[];if(t>=35)f.push("High temperature is increasing risk");else f.push("Temperature is currently moderate");
 if(h<=30)f.push("Low humidity is drying vegetation");else if(h<=50)f.push("Moderate humidity contributes to dryness");else f.push("Humidity is helping reduce dryness");
 if(w>=30)f.push("Strong wind can accelerate fire spread");else f.push("Wind is a lower spread factor");
 if(s<=25)f.push("Very low soil moisture indicates dry conditions");else if(s<=50)f.push("Reduced soil moisture indicates some dryness");else f.push("Soil moisture is relatively healthy");
 if(d>=65)f.push("Dry vegetation provides readily available fuel");if(smoke>=60)f.push("Smoke/gas indication is elevated");
 $("factorList").innerHTML=f.slice(0,5).map(x=>`<li>${x}</li>`).join("");
 $("dashTemp").textContent=t+"°C";$("dashHumidity").textContent=h+"%";$("dashWind").textContent=w+" km/h";$("dashSoil").textContent=s+"%";renderTrend(r);
}

function renderTrend(r){
 const vals=[r-28,r-22,r-16,r-8,r-3,r+2,r].map(v=>clamp(v,5,99));
 $("chart").innerHTML=vals.map(v=>`<div class="bar-wrap"><div class="alarm-bar" style="height:${v}%"></div></div>`).join("");
}

$("searchLocation").addEventListener("click",searchPlace);
$("locationSearch").addEventListener("keydown",e=>{if(e.key==="Enter")searchPlace()});
$("analyzeLocation").addEventListener("click",analyzeSelected);
$("predictBtn").addEventListener("click",manualPredict);
$("locateMe").addEventListener("click",()=>{
 if(!map){$("mapStatus").textContent="Map is not available.";return}
 if(!navigator.geolocation){$("mapStatus").textContent="Geolocation is not supported by this browser.";return}
 $("mapStatus").textContent="Requesting your location…";
 navigator.geolocation.getCurrentPosition(p=>{map.setView([p.coords.latitude,p.coords.longitude],12);selectLocation(p.coords.latitude,p.coords.longitude,"My Location")},()=>{$("mapStatus").textContent="Location permission was not granted."});
});
initMap();
renderTrend(30);
