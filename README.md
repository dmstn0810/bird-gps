# 🦅 야생조류 통합 GPS 텔레메트리 분석 시스템 (WildBird Telemetry Hub)

[![GitHub License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Web%20GIS-brightgreen.svg)]()
[![Data Count](https://img.shields.io/badge/Tracked%20Birds-37%20Individuals-orange.svg)]()
[![Species](https://img.shields.io/badge/Species-4%20Major%20Groups-purple.svg)]()

> **민물가마우지(5수) · 까치(7수) · 큰고니(17수) · 오리류(8수)** 4대 야생조류군 37개체의 대용량 GPS 위치추적 빅데이터를 통합 분석하고 시각화하는 고성능 인터랙티브 웹 GIS 플랫폼입니다.

---

## 📌 주요 특징 및 기능

1. **🗺️ 다종 실시간 GIS 위치추적 지도 (Leaflet 1.9 & Esri Satellite)**
   - 4대 조류군 37개체 전체의 이동 궤적을 고유 색상으로 시각화
   - Esri 위성 영상 및 OpenStreetMap 간 1-클릭 레이어 전환
   - 대전 방사지, 괴산 달천 집결지, 안동 잠자리·먹이터, 충주 까치 세력권, 부산 을숙도 및 대저생태공원, 러시아 바이칼호/시베리아 툰드라 핵심 생태 거점(POI) 마커 표출
2. **⏱️ 시계열 이동 시뮬레이션 (Timeline Playback Animation)**
   - 날짜/시간 슬라이더 바를 통한 자유로운 시간대 이동
   - ▶ 재생(Play), 일시정지, 1x / 5x / 20x 배속 조절 기능으로 조류의 계절적·일일 이동 과정을 애니메이션으로 재현
3. **📊 4대 조류군 이동생태 비교 분석 (Chart.js 4.4)**
   - 텃새(까치), 수계 분산(민물가마우지), 동계 월동(오리류), 대륙간 초장거리 횡단 철새(큰고니)의 행동권 및 이동 전략 카드
   - 종별 누적 이동거리(로그 스케일), 최대 변위 반경(Displacement), 24시간 일주기 비행 활동성 곡선, 속도 구간별 도넛 차트
4. **🦅 민물가마우지 정밀 심층 분석 (Case Studies)**
   - 대전 방사 후 괴산 달천 73km 동시 집결 및 강한 지소 충실성(Site Fidelity)
   - ku2604의 안동 일직면(잠자리) ↔ 구담보(먹이터) 매일 7.7km 출퇴근 비행(Commuting Flight)
   - 5월 30일 시속 93 km/h 군집 편대 비행(Flocking) 실증
   - 장치 수명 및 배터리 컷오프(3.5V) 진단
5. **📁 라이브 드래그 앤 드롭 업로더 (Live Drag & Drop Uploader)**
   - 신규 조류 GPS 데이터(CSV / XLS / XLSX) 파일을 브라우저에 끌어다 놓으면 SheetJS & PapaParse를 통해 즉시 파싱하여 지도 및 차트에 실시간 추가
6. **🚀 무설치 로컬 100% 호환 구동**
   - 별도 백엔드 서버 없이 브라우저에서 `index.html`을 더블클릭하는 것만으로 CORS 제약 없이 즉시 구동 (`data.js` 번들 탑재)

---

## 📊 수록 데이터셋 현황 (총 37개체)

| 조류 종 | 학명 (Scientific Name) | 개체수 | 주요 부착/서식지 | 이동 전략 | 대표 개체 ID |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **민물가마우지** | *Phalacrocorax carbo* | 5수 | 괴산군 달천 / 대전 관평동 | 지역 수계 분산 (73~116km) | ku2601 ~ ku2605 |
| **까치** | *Pica sericea* | 7수 | 충주시 도심 및 농경지 | 국지적 텃새 (반경 1km) | ku2501 ~ ku2506, ku2606 |
| **큰고니** | *Cygnus cygnus* | 17수 | 부산 을숙도 하구 ↔ 시베리아 | 대륙간 초장거리 철새 (3,384km) | ke2401 ~ ke2412, ke2421 ~ ke2425 |
| **청둥오리** | *Anas platyrhynchos* | 6수 | 부산 대저생태공원 / 을숙도 | 동계 월동 및 국지 이동 | ke2413, ke2414, ke2417 ~ ke2420 |
| **흰뺨검둥오리** | *Anas zonorhyncha* | 2수 | 부산 대저생태공원 습지 | 동계 월동 및 하천 이동 | ke2415, ke2416 |

---

## 🖥️ 실행 방법

### 방법 1 (간편 더블클릭 실행)
- 폴더 내 `index.html` 파일을 웹 브라우저(Chrome, Edge 등)로 더블클릭하여 바로 실행합니다.

### 방법 2 (로컬 웹서버 실행)
- 폴더 내 `run_dashboard.bat` 배치 파일을 더블클릭하면 로컬 서버(포트 8000)가 구동되며 브라우저가 자동 실행됩니다.

```bash
# 또는 터미널에서 직접 실행
python -m http.server 8000
# 브라우저에서 http://localhost:8000/index.html 접속
```

---

## 📁 프로젝트 구조

```
bird-gps/
├── index.html                     # 메인 통합 웹 대시보드
├── style.css                      # 반응형 모던 UI 스타일시트
├── app.js                         # Leaflet GIS, Chart.js, 업로더 구동 엔진
├── data.js                        # CORS 제한 없는 브라우저용 37개체 통합 데이터
├── web_bird_data.json             # 웹용 최적화 JSON 데이터셋
├── multi_species_summary.csv      # 37개체 전수 요약 통계 테이블
├── run_dashboard.bat              # 1-클릭 로컬 웹서버 실행 스크립트
├── figure1_movement_overview.png  # 가마우지 이동 궤적 및 행동권(MCP)
├── figure2_diurnal_activity.png   # 일주기 비행 패턴 및 출퇴근 비행
├── figure3_flocking_behavior.png  # 5월 30일 시속 93km/h 군집 편대 비행
├── figure4_tag_health_lifecycle.png # 센서 헬스케어 및 배터리 방전 분석
├── figure5_multi_species_comparison.png # 4대 조류군 이동생태 비교 분석 차트
└── README.md                      # 프로젝트 설명 문서
```

---

## 📜 라이선스 및 출처
- **기관**: KU / KIENV 조류 텔레메트리 연구 데이터
- **라이선스**: MIT License
