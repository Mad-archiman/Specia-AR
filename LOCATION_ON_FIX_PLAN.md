# Location ON 모드 수정 계획

## 문제 요약
- Location ON 시 기존 탭 기반 AR 모드는 종료됨 ✓
- **목표 위치에 모델이 생성되는지 불명확**
- **모델이 화면 밖(다른 방향)에 있을 때 반투명 화살표가 표시되지 않음** ← 핵심 문제

---

## 원인 분석

### 1. 화살표가 항상 숨겨져 있음 (가장 유력한 원인)
**위치**: `ARViewer.tsx` 586번째 줄

```tsx
className="pointer-events-none absolute z-20 hidden -translate-x-1/2 -translate-y-1/2"
```

- 화살표 div에 Tailwind `hidden` 클래스가 있음 (→ `display: none`)
- 코드에서 `arrowEl.style.display = ''`로 설정 (141번째 줄)
- **빈 문자열은 인라인 스타일을 제거**하여, `hidden` 클래스가 다시 적용됨
- 결과: 화살표가 절대 보이지 않음

### 2. XR 프레임에서 카메라 행렬이 갱신되지 않음
**위치**: `ARViewer.tsx` 116-141번째 줄

- `tempVec.project(ctx.camera)` 사용
- WebXR 세션 중 `ctx.camera`는 **XR 루프 시작 시점에 아직 갱신되지 않음**
- Three.js는 `renderer.render()` 호출 시에만 XR 카메라로 업데이트
- `onXRFrame` 콜백에서는 이전 프레임의 카메라 또는 초기값 사용
- 결과: 모델이 화면 밖에 있어도 화살표 위치/방향이 부정확하거나 갱신되지 않음

### 3. 모델이 카메라 뒤에 있을 때 프로젝션 오동작
**위치**: `ARViewer.tsx` 119-124번째 줄

- `Vector3.project()`는 **카메라 앞쪽에 있는 점**을 NDC로 변환
- 모델이 카메라 뒤에 있으면 NDC 값이 비정상적이거나 뒤집힐 수 있음
- 화살표는 “방향만” 알려주면 되므로, **방향 벡터(카메라→모델)를 기준**으로 계산하는 것이 더 적합

### 4. 모델 배치 실패 가능성
**위치**: `ARViewer.tsx` 158-224번째 줄

- `arPlaceableGeoRef` / `arPlaceableRef`가 `null`이면 배치 불가
- `viewerPose`가 `null`이면 `GEO_PLACEMENT_MAX_RETRIES`(300)회까지만 재시도 후 포기
- `getDeviceHeading()` 비동기: 400ms 내 값이 없으면 `deviceHeading`이 `null`로 배치
- 디버깅용 빨간 마커(BoxGeometry)는 배치되지만, 실제 모델 배치가 실패할 수 있음

---

## 수정 계획

### 수정 1: 화살표 표시 보장
**파일**: `ARViewer.tsx`

- `arrowEl.style.display = ''` → `arrowEl.style.display = 'block'`로 변경
- 또는 `hidden` 클래스 제거 후 `visibility`/`opacity`로 초기 숨김 처리

### 수정 2: XR 프레임에서 카메라 정보 사용
**파일**: `ARViewer.tsx`

- 화살표 로직에서 `frame.getViewerPose(refSpace)`로 현재 시점의 뷰어 포즈 획득
- 뷰어 포즈로 `ctx.camera`의 위치/회전 업데이트 또는
- `frame.views[0]`의 `projectionMatrix` + 뷰어 `transform`으로 직접 프로젝션 계산

### 수정 3: 화면 밖·뒤쪽 모델용 화살표 로직
**파일**: `ARViewer.tsx`

- 카메라 위치 → 모델 위치 방향 벡터 계산
- 모델이 카메라 뒤에 있으면:
  - 카메라 로컬 방향으로 변환
  - 화면 가장자리로 클리핑
  - 화살표를 그 방향으로 표시
- `project()` 결과가 비정상(z > 1 등)일 때 fallback 로직 추가

### 수정 4: 모델 배치 안정화 (선택)
**파일**: `ARViewer.tsx`

- `getDeviceHeading()` 타임아웃을 400ms에서 800ms 정도로 연장 검토
- 배치 실패 시 `setLocationOnError`로 사용자 피드백 표시

---

## 권장 수정 순서

1. **수정 1** (화살표 display) – 가장 단순하고 영향이 큼
2. **수정 2** (XR 카메라 갱신) – 화살표 정확도 개선
3. **수정 3** (방향/클리핑 로직) – 화면 밖/뒤쪽 케이스 처리
4. **수정 4** (배치 안정화) – 필요 시 적용

---

## 참고: 현재 화살표 관련 코드 흐름

```
handleLocationOn()
  → geoPlacementPendingRef 설정
  → onXRFrame에서 pending 처리 → geoPlacedRef 설정
  → onXRFrame에서 locationModeActiveRef && geoPlaced
     → project() → arrow position/angle → arrowEl.style.display = ''
     → hidden 클래스로 인해 실제로는 display:none 유지
```
