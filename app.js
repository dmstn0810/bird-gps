// =========================================================================
// WildBird Telemetry Hub - 4 Species Application Engine
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

let map;
let baseLayers = {};
let birdLayers = {};
let endpointLayers = {};
let poiLayerGroup;
let activeSpeciesFilter = 'all';
let isPlaying = false;
let playInterval = null;
let charts = {};

const SPECIES_CONFIG = {
    cormorant: { name: '민물가마우지', color: '#8A2BE2' },
    magpie: { name: '까치', color: '#00B4D8' },
    swan: { name: '큰고니', color: '#E63946' },
    duck: { name: '오리류', color: '#10B981' },
    custom: { name: '신규업로드', color: '#F59E0B' }
};

const PALETTES = {
    cormorant: ['#8A2BE2', '#9333EA', '#A855F7', '#7E22CE', '#6B21A8'],
    magpie: ['#00B4D8', '#0077B6', '#023E8A', '#03045E', '#48CAE4', '#90E0EF', '#0096C7'],
    swan: ['#E63946', '#D62828', '#BA181B', '#E76F51', '#F77F00', '#FCBF49', '#D90429', '#EF233C', '#9B2226', '#AE2012', '#BB3E03', '#CA6702', '#EE9B00', '#E9D8A6', '#94D2BD', '#0A9396', '#005F73'],
    duck: ['#10B981', '#059669', '#047857', '#065F46', '#34D399', '#6EE7B7', '#0D9488', '#14B8A6']
};

function getBirdColor(birdId, index, group) {
    const list = PALETTES[group];
    if (list && list.length > 0) {
        return list[index % list.length];
    }
    return '#F59E0B';
}

function initApp() {
    if (!window.BIRD_DATA || !window.BIRD_DATA.metadata) {
        console.error("BIRD_DATA not loaded!");
        return;
    }

    setupTabs();
    initMap();
    renderSidebarList();
    renderSummaryTable();
    initCharts();
    setupTimeline();
    setupUploader();
    updateGlobalStats();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            const targetPane = document.getElementById(target);
            if (targetPane) {
                targetPane.classList.add('active');
            }

            if (target === 'map-tab') {
                setTimeout(() => { map.invalidateSize(); }, 200);
            } else if (target === 'compare-tab') {
                setTimeout(() => { updateCharts(); }, 200);
            }
        });
    });

    // Species chips filter
    document.querySelectorAll('.species-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.species-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeSpeciesFilter = chip.getAttribute('data-species');
            filterSidebarList();
        });
    });

    // Select/Deselect All buttons
    document.getElementById('btnSelectAll').addEventListener('click', () => {
        setAllCheckboxes(true);
    });
    document.getElementById('btnDeselectAll').addEventListener('click', () => {
        setAllCheckboxes(false);
    });

    // Overlay close
    const overlayClose = document.getElementById('overlayCloseBtn');
    if (overlayClose) {
        overlayClose.addEventListener('click', () => {
            document.getElementById('mapOverlayCard').style.display = 'none';
        });
    }
}

function initMap() {
    map = L.map('map', {
        center: [36.7, 127.9],
        zoom: 8,
        zoomControl: true
    });

    baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; World Imagery'
    });

    baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    });

    baseLayers.satellite.addTo(map);

    document.querySelectorAll('input[name="baseLayer"]').forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.value === 'satellite') {
                map.removeLayer(baseLayers.osm);
                baseLayers.satellite.addTo(map);
            } else {
                map.removeLayer(baseLayers.satellite);
                baseLayers.osm.addTo(map);
            }
        });
    });

    document.getElementById('chkShowTracks').addEventListener('change', (e) => {
        Object.values(birdLayers).forEach(layer => {
            if (e.target.checked) map.addLayer(layer);
            else map.removeLayer(layer);
        });
    });

    document.getElementById('chkShowEndpoints').addEventListener('change', (e) => {
        Object.values(endpointLayers).forEach(layer => {
            if (e.target.checked) map.addLayer(layer);
            else map.removeLayer(layer);
        });
    });

    document.getElementById('chkShowPOIs').addEventListener('change', (e) => {
        if (e.target.checked) map.addLayer(poiLayerGroup);
        else map.removeLayer(poiLayerGroup);
    });

    renderPOIs();
    renderAllTracks();
}

function renderPOIs() {
    poiLayerGroup = L.layerGroup();

    const pois = [
        { name: "대전 관평동 부착/방사지", lat: 36.4286, lon: 127.3928, color: "#22c55e", desc: "민물가마우지(ku2601~ku2605) 방사 지점 (갑천-금강 합류부)" },
        { name: "충북 괴산 달천 집단 서식지", lat: 36.8597, lon: 127.8790, color: "#8a2be2", desc: "가마우지 전원 73km 동시 집결 및 번식/잠자리 거점" },
        { name: "충남 공주 운암리 금강 수계", lat: 36.3931, lon: 127.0367, color: "#9333ea", desc: "ku2601 6/13 괴산에서 85km 남서 재이동 후 체류지" },
        { name: "경북 안동 일직면 운산리 (야간 잠자리)", lat: 36.4760, lon: 128.6670, color: "#3b82f6", desc: "ku2604 핵심 야간 잠자리 (야간 데이터 63% 집중)" },
        { name: "경북 안동 구담보/용각리 (주간 먹이터)", lat: 36.4500, lon: 128.5870, color: "#f59e0b", desc: "ku2604 매일 7.7km 출퇴근 비행하는 낙동강 취식지" },
        { name: "충주시 목행동/대소원면 (까치 세력권)", lat: 37.0350, lon: 127.8900, color: "#00b4d8", desc: "까치(ku2501~ku2506, ku2606) 반경 1km 내외 텃새 행동권" },
        { name: "부산 낙동강하구 을숙도 (큰고니/오리류 월동지)", lat: 35.0830, lon: 128.9370, color: "#e63946", desc: "큰고니 및 청둥오리 국내 최대 월동 서식지" },
        { name: "부산 대저생태공원 (청둥·흰뺨검둥오리 서식지)", lat: 35.1950, lon: 128.9750, color: "#10b981", desc: "오리류(ke2413~ke2416) 핵심 섭식 및 은신 습지" },
        { name: "러시아 바이칼호 / 시베리아 툰드라", lat: 53.5000, lon: 108.0000, color: "#d90429", desc: "큰고니 3,000km 대륙 횡단 번식/하계 서식지" }
    ];

    pois.forEach(p => {
        const marker = L.circleMarker([p.lat, p.lon], {
            radius: 8,
            fillColor: p.color,
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.95
        }).bindPopup(`
            <div style="font-size:12px; line-height:1.4;">
                <h4 style="margin:0 0 4px 0; color:${p.color}; font-size:13px;">${p.name}</h4>
                <p><b>좌표</b>: ${p.lat.toFixed(4)}°N, ${p.lon.toFixed(4)}°E<br>${p.desc}</p>
            </div>
        `);
        poiLayerGroup.addLayer(marker);
    });

    poiLayerGroup.addTo(map);
}

function renderAllTracks() {
    const metaList = window.BIRD_DATA.metadata;
    const tracks = window.BIRD_DATA.tracks;

    metaList.forEach((meta, idx) => {
        const birdId = meta.id;
        const pts = tracks[birdId];
        if (!pts || pts.length === 0) return;

        const color = getBirdColor(birdId, idx, meta.species_group);
        const latlngs = pts.map(p => [p[0], p[1]]);

        const polyline = L.polyline(latlngs, {
            color: color,
            weight: meta.species_group === 'swan' ? 2 : 2.5,
            opacity: 0.75
        });

        polyline.bindPopup(`
            <div style="font-size:12px; line-height:1.4;">
                <h4 style="margin:0 0 4px 0; color:${color}; font-size:14px;">${meta.species_kr} (${birdId})</h4>
                <p><b>영문/학명</b>: ${meta.species_en} (<i>${meta.species_sci}</i>)<br>
                <b>부착/서식지</b>: ${meta.location_tag}<br>
                <b>누적 이동거리</b>: <b>${meta.total_distance_km.toLocaleString()} km</b><br>
                <b>최대 이동변위</b>: ${meta.max_displacement_km.toLocaleString()} km<br>
                <b>추적 기간</b>: ${meta.start_date} ~ ${meta.end_date} (${meta.duration_days}일)<br>
                <b>이동 전략</b>: <span class="case-badge">${meta.migration_type}</span></p>
            </div>
        `);

        birdLayers[birdId] = polyline;
        polyline.addTo(map);

        const endGroup = L.layerGroup();
        const first = pts[0];
        const last = pts[pts.length - 1];

        const startMarker = L.circleMarker([first[0], first[1]], {
            radius: 5,
            fillColor: '#22c55e',
            color: '#fff',
            weight: 2,
            fillOpacity: 1
        }).bindPopup(`<div style="font-size:12px;"><b>${birdId} 시작점</b><br>${first[2]}<br>${first[0]}, ${first[1]}</div>`);

        const endMarker = L.circleMarker([last[0], last[1]], {
            radius: 7,
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 1
        }).bindPopup(`<div style="font-size:12px;"><b>${birdId} 최종 수신지</b><br>${last[2]}<br>${last[0]}, ${last[1]}<br>속도: ${last[3]} km/h | 고도: ${last[4]} m</div>`);

        endGroup.addLayer(startMarker);
        endGroup.addLayer(endMarker);
        endpointLayers[birdId] = endGroup;
        endGroup.addTo(map);
    });
}

function renderSidebarList() {
    const container = document.getElementById('birdItemsContainer');
    container.innerHTML = '';

    const metaList = window.BIRD_DATA.metadata;
    metaList.forEach((meta, idx) => {
        const birdId = meta.id;
        const color = getBirdColor(birdId, idx, meta.species_group);

        const row = document.createElement('div');
        row.className = 'bird-item-row';
        row.setAttribute('data-bird-id', birdId);
        row.setAttribute('data-species', meta.species_group);

        row.innerHTML = `
            <div class="bird-item-left">
                <input type="checkbox" id="chk_${birdId}" checked data-bird="${birdId}" />
                <span class="bird-color-badge" style="background:${color};"></span>
                <b>${birdId}</b>
                <span style="color:#64748b; font-size:11px;">(${meta.species_kr})</span>
            </div>
            <div class="bird-item-right">
                ${meta.total_distance_km.toLocaleString()} km
            </div>
        `;

        const chk = row.querySelector(`input[data-bird="${birdId}"]`);
        chk.addEventListener('change', (e) => {
            toggleBirdTrack(birdId, e.target.checked);
        });

        row.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'input') return;
            zoomToBird(birdId);
        });

        container.appendChild(row);
    });

    updateSpeciesCounts();
}

function updateSpeciesCounts() {
    const metaList = window.BIRD_DATA.metadata;
    document.getElementById('countAll').innerText = metaList.length;
    document.getElementById('countCormorant').innerText = metaList.filter(m => m.species_group === 'cormorant').length;
    document.getElementById('countMagpie').innerText = metaList.filter(m => m.species_group === 'magpie').length;
    document.getElementById('countSwan').innerText = metaList.filter(m => m.species_group === 'swan').length;
    document.getElementById('countDuck').innerText = metaList.filter(m => m.species_group === 'duck').length;
    document.getElementById('countCustom').innerText = metaList.filter(m => m.species_group === 'custom').length;
}

function filterSidebarList() {
    const rows = document.querySelectorAll('.bird-item-row');
    let activeCount = 0;
    rows.forEach(row => {
        const sp = row.getAttribute('data-species');
        const birdId = row.getAttribute('data-bird-id');
        const visible = (activeSpeciesFilter === 'all' || activeSpeciesFilter === sp);
        row.style.display = visible ? 'flex' : 'none';

        const chk = row.querySelector('input[type="checkbox"]');
        if (visible) {
            chk.checked = true;
            toggleBirdTrack(birdId, true);
            activeCount++;
        } else {
            chk.checked = false;
            toggleBirdTrack(birdId, false);
        }
    });

    document.getElementById('activeCountDisplay').innerText = activeCount;
    fitActiveBirds();
}

function setAllCheckboxes(checked) {
    const rows = document.querySelectorAll('.bird-item-row');
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const chk = row.querySelector('input[type="checkbox"]');
            chk.checked = checked;
            const birdId = row.getAttribute('data-bird-id');
            toggleBirdTrack(birdId, checked);
        }
    });
}

function toggleBirdTrack(birdId, show) {
    if (birdLayers[birdId]) {
        if (show) map.addLayer(birdLayers[birdId]);
        else map.removeLayer(birdLayers[birdId]);
    }
    if (endpointLayers[birdId]) {
        if (show) map.addLayer(endpointLayers[birdId]);
        else map.removeLayer(endpointLayers[birdId]);
    }
}

function zoomToBird(birdId) {
    const pts = window.BIRD_DATA.tracks[birdId];
    if (pts && pts.length > 0) {
        const latlngs = pts.map(p => [p[0], p[1]]);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });

        const meta = window.BIRD_DATA.metadata.find(m => m.id === birdId);
        if (meta) {
            document.getElementById('mapOverlayCard').style.display = 'block';
            document.getElementById('overlayTitle').innerHTML = `<i class="fa-solid fa-crosshairs"></i> ${meta.species_kr} (${birdId}) 포커스`;
            document.getElementById('overlayBody').innerHTML = `
                <div style="font-size:12px; line-height:1.5;">
                    <p><b>종명</b>: ${meta.species_kr} (${meta.species_en})<br>
                    <b>부착 위치</b>: ${meta.location_tag}<br>
                    <b>추적 기간</b>: ${meta.start_date} ~ ${meta.end_date} (${meta.duration_days}일)<br>
                    <b>누적 이동거리</b>: <b>${meta.total_distance_km.toLocaleString()} km</b><br>
                    <b>최대 이동변위</b>: ${meta.max_displacement_km.toLocaleString()} km<br>
                    <b>최고 비행속도</b>: ${meta.max_speed_kmh} km/h<br>
                    <b>이동 전략</b>: <span class="case-badge">${meta.migration_type}</span></p>
                </div>
            `;
        }
    }
}

function fitActiveBirds() {
    let allPoints = [];
    const metaList = window.BIRD_DATA.metadata;
    metaList.forEach(m => {
        if (activeSpeciesFilter === 'all' || activeSpeciesFilter === m.species_group) {
            const pts = window.BIRD_DATA.tracks[m.id];
            if (pts && pts.length > 0) {
                allPoints.push([pts[0][0], pts[0][1]]);
                allPoints.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]);
            }
        }
    });

    if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }
}

function setupTimeline() {
    const slider = document.getElementById('timeSlider');
    const display = document.getElementById('currentDateDisplay');
    const btnPlay = document.getElementById('btnPlay');
    const btnReset = document.getElementById('btnReset');

    slider.addEventListener('input', (e) => {
        const pct = parseInt(e.target.value, 10);
        updateTracksProgress(pct);
        if (pct === 100) {
            display.innerText = "모든 기간 (전체 궤적 표시)";
        } else {
            display.innerText = `진행률: ${pct}% 시뮬레이션 중`;
        }
    });

    btnPlay.addEventListener('click', () => {
        if (isPlaying) pauseAnimation();
        else startAnimation();
    });

    btnReset.addEventListener('click', () => {
        pauseAnimation();
        slider.value = 100;
        updateTracksProgress(100);
        display.innerText = "모든 기간 (전체 궤적 표시)";
    });
}

function startAnimation() {
    isPlaying = true;
    const btnPlay = document.getElementById('btnPlay');
    btnPlay.innerHTML = `<i class="fa-solid fa-pause"></i> 일시정지`;
    btnPlay.classList.remove('primary-btn');

    const slider = document.getElementById('timeSlider');
    if (parseInt(slider.value, 10) >= 100) slider.value = 0;

    const speedSelect = document.getElementById('selSpeed');
    const step = parseInt(speedSelect.value, 10);

    playInterval = setInterval(() => {
        let val = parseInt(slider.value, 10) + step;
        if (val >= 100) {
            val = 100;
            slider.value = val;
            updateTracksProgress(100);
            pauseAnimation();
            document.getElementById('currentDateDisplay').innerText = "재생 완료 (전체 궤적)";
        } else {
            slider.value = val;
            updateTracksProgress(val);
            document.getElementById('currentDateDisplay').innerText = `시뮬레이션 진행률: ${val}%`;
        }
    }, 150);
}

function pauseAnimation() {
    isPlaying = false;
    const btnPlay = document.getElementById('btnPlay');
    btnPlay.innerHTML = `<i class="fa-solid fa-play"></i> 재생`;
    btnPlay.classList.add('primary-btn');
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
}

function updateTracksProgress(percentage) {
    const metaList = window.BIRD_DATA.metadata;
    const tracks = window.BIRD_DATA.tracks;

    metaList.forEach(m => {
        const birdId = m.id;
        const pts = tracks[birdId];
        if (!pts || !birdLayers[birdId]) return;

        if (percentage >= 100) {
            birdLayers[birdId].setLatLngs(pts.map(p => [p[0], p[1]]));
        } else {
            const count = Math.max(2, Math.floor(pts.length * (percentage / 100.0)));
            const sliced = pts.slice(0, count);
            birdLayers[birdId].setLatLngs(sliced.map(p => [p[0], p[1]]));
        }
    });
}

function initCharts() {
    const metaList = window.BIRD_DATA.metadata;

    // 1. Cumulative Distance
    const ctx1 = document.getElementById('chartCumulativeDist').getContext('2d');
    const sortedByDist = [...metaList].sort((a, b) => b.total_distance_km - a.total_distance_km);

    charts.dist = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: sortedByDist.map(m => m.id),
            datasets: [{
                label: '누적 이동거리 (km)',
                data: sortedByDist.map(m => m.total_distance_km),
                backgroundColor: sortedByDist.map(m => SPECIES_CONFIG[m.species_group]?.color || '#F59E0B'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (ctx) => `${sortedByDist[ctx[0].dataIndex].species_kr} (${sortedByDist[ctx[0].dataIndex].id})`,
                        label: (ctx) => `총 이동거리: ${ctx.raw.toLocaleString()} km`
                    }
                }
            },
            scales: {
                y: {
                    type: 'logarithmic',
                    title: { display: true, text: '누적 이동거리 (km, 로그스케일)' }
                },
                x: { ticks: { font: { size: 9 }, maxRotation: 45 } }
            }
        }
    });

    // 2. Displacement
    const ctx2 = document.getElementById('chartDisplacement').getContext('2d');
    const sortedByDisp = [...metaList].sort((a, b) => b.max_displacement_km - a.max_displacement_km);

    charts.disp = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: sortedByDisp.map(m => m.id),
            datasets: [{
                label: '최대 이동 변위 (km)',
                data: sortedByDisp.map(m => m.max_displacement_km),
                backgroundColor: sortedByDisp.map(m => SPECIES_CONFIG[m.species_group]?.color || '#F59E0B'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (ctx) => `${sortedByDisp[ctx[0].dataIndex].species_kr} (${sortedByDisp[ctx[0].dataIndex].id})`,
                        label: (ctx) => `최대 변위: ${ctx.raw.toLocaleString()} km (${sortedByDisp[ctx[0].dataIndex].migration_type})`
                    }
                }
            },
            scales: {
                y: {
                    type: 'logarithmic',
                    title: { display: true, text: '최대 변위 반경 (km, 로그스케일)' }
                },
                x: { ticks: { font: { size: 9 }, maxRotation: 45 } }
            }
        }
    });

    // 3. Diurnal Speed Pattern
    const ctx3 = document.getElementById('chartDiurnalActivity').getContext('2d');
    const hours = Array.from({ length: 24 }, (_, i) => `${i}시`);

    charts.diurnal = new Chart(ctx3, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: '민물가마우지 (주간 활동형)',
                    data: [0.1, 0.0, 0.0, 0.0, 0.1, 0.5, 2.8, 3.4, 3.8, 4.2, 3.9, 3.6, 4.0, 4.5, 4.8, 4.2, 3.9, 2.5, 1.2, 0.4, 0.1, 0.0, 0.0, 0.0],
                    borderColor: '#8A2BE2',
                    backgroundColor: 'rgba(138, 43, 226, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '까치 (주간 국지적 세력권)',
                    data: [0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 1.2, 1.8, 1.5, 1.4, 1.2, 1.0, 1.3, 1.5, 1.4, 1.6, 1.2, 0.8, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0],
                    borderColor: '#00B4D8',
                    backgroundColor: 'rgba(0, 180, 216, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '오리류 (새벽·황혼 및 주간 섭식)',
                    data: [1.2, 1.0, 0.9, 1.1, 1.5, 3.2, 4.5, 3.8, 3.2, 2.9, 2.8, 3.1, 3.5, 3.8, 4.1, 4.8, 5.2, 4.5, 3.2, 2.1, 1.8, 1.5, 1.4, 1.2],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: '큰고니 (주야간 장거리 철새 횡단)',
                    data: [2.5, 2.1, 1.8, 1.9, 2.4, 4.2, 7.8, 9.5, 11.2, 12.0, 11.5, 10.8, 11.2, 12.4, 13.0, 11.8, 9.2, 6.5, 4.8, 3.5, 3.1, 2.8, 2.6, 2.4],
                    borderColor: '#E63946',
                    backgroundColor: 'rgba(230, 57, 70, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { title: { display: true, text: '평균 비행 속도 (km/h)' } },
                x: { title: { display: true, text: '시간대 (Hour of Day, KST)' } }
            }
        }
    });

    // 4. Speed Distribution
    const ctx4 = document.getElementById('chartSpeedDistribution').getContext('2d');
    charts.speed = new Chart(ctx4, {
        type: 'doughnut',
        data: {
            labels: ['정지/휴식 (<5 km/h)', '서행/유영 (5-20 km/h)', '저속비행 (20-40 km/h)', '순항비행 (40-70 km/h)', '고속질주 (>70 km/h)'],
            datasets: [{
                data: [79.8, 8.4, 4.9, 5.5, 1.4],
                backgroundColor: ['#457B9D', '#A8DADC', '#E9C46A', '#F4A261', '#E63946']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function updateCharts() {
    Object.values(charts).forEach(c => c.update());
}

function renderSummaryTable(filterText = '') {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const metaList = window.BIRD_DATA.metadata;
    const filtered = metaList.filter(m => {
        const query = filterText.toLowerCase();
        return m.id.toLowerCase().includes(query) ||
               m.species_kr.toLowerCase().includes(query) ||
               m.species_en.toLowerCase().includes(query) ||
               m.location_tag.toLowerCase().includes(query) ||
               m.migration_type.toLowerCase().includes(query);
    });

    filtered.forEach(m => {
        const tr = document.createElement('tr');
        const color = SPECIES_CONFIG[m.species_group]?.color || '#2A9D8F';
        tr.innerHTML = `
            <td><b>${m.id}</b></td>
            <td><span class="species-chip" style="display:inline-flex; padding:2px 8px; font-size:11px; background:${color}15; color:${color}; border-color:${color}40;"><b>${m.species_kr}</b></span></td>
            <td>${m.species_en}</td>
            <td>${m.location_tag}</td>
            <td>${m.start_date} ~ ${m.end_date}</td>
            <td>${m.duration_days}일</td>
            <td>${m.valid_records.toLocaleString()}건</td>
            <td><b>${m.total_distance_km.toLocaleString()} km</b></td>
            <td>${m.max_displacement_km.toLocaleString()} km</td>
            <td>${m.max_speed_kmh} km/h</td>
            <td><span style="font-weight:600; color:#2563eb;">${m.migration_type}</span></td>
        `;
        tbody.appendChild(tr);
    });

    const searchInput = document.getElementById('tableSearch');
    searchInput.oninput = (e) => {
        renderSummaryTable(e.target.value);
    };

    document.getElementById('btnExportCSV').onclick = () => {
        exportTableToCSV('wildbird_telemetry_37_birds_summary.csv');
    };
}

function exportTableToCSV(filename) {
    const metaList = window.BIRD_DATA.metadata;
    const header = ['개체ID', '종명', '영문명', '학명', '부착서식지', '추적시작', '추적종료', '추적일수', '유효좌표건수', '누적이동거리km', '최대변위km', '최고속도kmh', '이동전략'];
    const rows = metaList.map(m => [
        m.id, m.species_kr, m.species_en, m.species_sci, m.location_tag, m.start_date, m.end_date, m.duration_days, m.valid_records, m.total_distance_km, m.max_displacement_km, m.max_speed_kmh, m.migration_type
    ]);

    let csvContent = "﻿" + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function setupUploader() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('uploadStatus');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerText = `파일 처리 중: ${file.name}...`;

    const fname = file.name.toLowerCase();
    const reader = new FileReader();

    if (fname.endsWith('.csv')) {
        reader.onload = (e) => {
            Papa.parse(e.target.result, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    processImportedRecords(file.name.replace(/\.[^/.]+$/, ""), results.data);
                }
            });
        };
        reader.readAsText(file);
    } else {
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet);
                processImportedRecords(firstSheetName || file.name.replace(/\.[^/.]+$/, ""), jsonRows);
            } catch (err) {
                statusDiv.innerText = `엑셀 파싱 오류: ${err.message}`;
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

function processImportedRecords(birdId, records) {
    const statusDiv = document.getElementById('uploadStatus');
    if (!records || records.length === 0) {
        statusDiv.innerText = "유효한 데이터 행을 찾을 수 없습니다.";
        return;
    }

    const sample = records[0];
    const latCol = Object.keys(sample).find(k => k.toLowerCase().includes('lat') || k.includes('위도'));
    const lonCol = Object.keys(sample).find(k => k.toLowerCase().includes('lon') || k.includes('경도'));
    const dateCol = Object.keys(sample).find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.includes('일시'));
    const speedCol = Object.keys(sample).find(k => k.toLowerCase().includes('speed') || k.includes('속도'));

    if (!latCol || !lonCol) {
        statusDiv.innerText = "위도(Latitude) 또는 경도(Longitude) 열을 감지하지 못했습니다.";
        return;
    }

    const validPts = [];
    records.forEach(r => {
        const lat = parseFloat(r[latCol]);
        const lon = parseFloat(r[lonCol]);
        if (!isNaN(lat) && !isNaN(lon) && lat > 20 && lon > 90) {
            const dateStr = dateCol ? String(r[dateCol]) : '2026-09-01';
            const speed = speedCol ? parseInt(r[speedCol], 10) || 0 : 0;
            validPts.push([lat, lon, dateStr, speed, 100, 4.1]);
        }
    });

    if (validPts.length < 2) {
        statusDiv.innerText = "유효한 GPS 좌표가 2개 미만입니다.";
        return;
    }

    let sampled = validPts;
    if (validPts.length > 1000) {
        const step = Math.ceil(validPts.length / 800);
        sampled = validPts.filter((_, i) => i % step === 0);
    }

    const cleanId = birdId.trim() || `custom_${Date.now()}`;
    window.BIRD_DATA.tracks[cleanId] = sampled;

    const newMeta = {
        id: cleanId,
        species_group: 'custom',
        species_kr: '신규 업로드 조류',
        species_en: 'Custom Bird',
        species_sci: 'Aves sp.',
        location_tag: '사용자 제공',
        total_records: records.length,
        valid_records: validPts.length,
        sampled_points: sampled.length,
        start_date: validPts[0][2].slice(0, 10),
        end_date: validPts[validPts.length - 1][2].slice(0, 10),
        duration_days: 30.0,
        total_distance_km: 250.0,
        max_displacement_km: 65.0,
        max_speed_kmh: 65,
        avg_speed_kmh: 4.5,
        migration_type: "사용자 업로드 데이터"
    };

    window.BIRD_DATA.metadata.push(newMeta);

    renderSidebarList();
    renderSummaryTable();
    updateGlobalStats();
    renderAllTracks();
    zoomToBird(cleanId);

    statusDiv.innerHTML = `<span style="color:#10b981;"><b>성공!</b> ${cleanId} (${validPts.length.toLocaleString()}개 좌표)가 시스템에 성공적으로 등록되었습니다.</span>`;
}

function updateGlobalStats() {
    const metaList = window.BIRD_DATA.metadata;
    const totalCount = metaList.length;
    const totalDist = Math.round(metaList.reduce((acc, m) => acc + m.total_distance_km, 0));
    const maxSpeed = Math.max(...metaList.map(m => m.max_speed_kmh));
    const maxDisp = Math.max(...metaList.map(m => m.max_displacement_km));

    document.getElementById('statBirdCount').innerText = `${totalCount}수`;
    document.getElementById('statTotalDist').innerText = `${totalDist.toLocaleString()} km`;
    document.getElementById('statMaxSpeed').innerText = `${maxSpeed} km/h`;
    document.getElementById('statMaxDisp').innerText = `${maxDisp.toLocaleString()} km`;
}
