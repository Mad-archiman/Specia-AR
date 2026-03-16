# 모델 규모별 잘림 현상 수정 계획

## 1. 원인 분석

### 1.1 확인된 원인

| 원인 | 위치 | 설명 |
|------|------|------|
| **고정 카메라 위치** | `threeScene.ts` L80-82 | `resetView()`가 카메라를 항상 (0,0,3)에 두고 OrbitControls 타겟을 (0,0,0)으로 고정. 모델 크기와 무관하게 동일한 초기 시점 사용 |
| **Far plane 한계** | `threeScene.ts` L46 | ` PerspectiveCamera(75, aspect, 0.01, 100)` — far=100으로 100 유닛(미터) 이상의 물체는 잘림 |
| **모델 로드 시 프레이밍 없음** | `ARViewer.tsx` L419-461 | 모델 로드 후 중심만 맞추고, 카메라를 모델 크기에 맞춰 조정하는 로직 없음 |
| **스케일 보정 없음** | `ARViewer.tsx` | 건축/대규모 모델(SketchUp 미터 단위)이 1:1로 표시되어 프리뷰·AR 모두에서 과도하게 커짐 |

### 1.2 시나리오별 영향

- **3D 프리뷰(AR 전)**: 50m 규모 건물 → 카메라가 3m에 있어 대부분 화면 밖 또는 클리핑
- **AR 탭 배치**: 큰 모델 배치 시 가까이 접근하면 near plane(0.01m) 클리핑 가능
- **Location ON**: 100m 이상 거리에서 far plane 클리핑 가능

---

## 2. 수정 계획

### Phase 1: 3D 프리뷰 자동 프레이밍 (우선)

**목표**: 모델 로드 시 바운딩 박스에 맞춰 카메라 거리·타겟 자동 조정

**수정 파일**:
- `src/lib/threeScene.ts`: `frameToObject(object, padding)` 유틸 추가 또는
- `src/components/ARViewer.tsx`: `frameCameraToModel(ctx, model)` 구현 후 `loadGlbFromUrl`·`handleResetView`에서 호출

**구현 요약**:
```typescript
// Box3 → 바운딩 스피어 반경
// distance = radius / tan(fov/2) * padding
// camera.position.set(0, 0, distance)
// controls.target.set(center)
```

### Phase 2: 카메라 클리핑 범위 확대

**수정 파일**: `src/lib/threeScene.ts`

- `far`: 100 → **1000** (대규모 건축물 대응)
- `near`: 0.01 유지 (AR 근접 뷰 호환)
- `logarithmicDepthBuffer`: far 범위 확대 시 z-fighting 방지를 위해 `true` 검토 (성능·호환성 확인 후 적용)

### Phase 3: resetView 일관성

**수정**: `handleResetView`가 모델이 있을 때 `frameCameraToModel`을 호출하도록 변경하여, "초기화" 시에도 항상 모델에 맞는 뷰로 복귀

---

## 3. 적용 순서

1. `threeScene.ts`에 `frameToObject` 또는 `resetView` 옵션 추가
2. `ARViewer.tsx`에서 모델 로드 후 `frameToObject(model)` 호출
3. `handleResetView`에서 모델 기준 프레이밍 호출
4. `far` plane 100 → 1000 변경
5. (선택) `logarithmicDepthBuffer` 테스트 후 적용

---

## 4. 주의사항

- **WebXR AR 모드**: 세션 중에는 기기가 제공하는 projection matrix 사용. near/far 변경은 주로 3D 프리뷰에 영향
- **OrbitControls**: `minDistance`를 모델 크기의 10% 수준으로 설정하면 너무 가까이 확대되는 것 방지 가능
- **모바일**: `logarithmicDepthBuffer`는 일부 기기에서 미지원 가능 — fallback 유지

---

## 5. 적용된 수정 (완료)

- [x] `threeScene.ts`: far plane 100 → 1000
- [x] `ARViewer.tsx`: `frameCameraToModel()` 추가 — 바운딩 스피어 기준 카메라 거리·타겟 자동 조정
- [x] 모델 로드 후 `frameCameraToModel()` 호출
- [x] `handleResetView`에서 모델 존재 시 `frameCameraToModel()` 호출
