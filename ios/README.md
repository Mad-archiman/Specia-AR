# SPECIA-AR iOS (ARKit 네이티브 앱)

## 요구사항

- Xcode 15+
- iOS 15+
- 실제 기기 (시뮬레이터는 AR 미지원)

## 설정

1. **Xcode에서 프로젝트 열기**
   - `SpeciaAR.xcodeproj` 더블클릭

2. **API URL 설정** (선택)
   - 기본: `https://specia-ar.vercel.app`
   - 변경하려면: Scheme > Edit Scheme > Run > Arguments > Environment Variables
   - `SPECIA_AR_API_URL` = 웹 앱이 배포된 도메인 (예: `https://your-domain.com`)

3. **번들 ID 및 서명**
   - Signing & Capabilities에서 Team 선택

## 빌드 및 실행

1. 실제 iPhone 연결
2. Product > Run (⌘R)

## URL Scheme

웹에서 iOS 사용자가 "START AR"을 누르면 `specia-ar://ar?code=XXXX`로 앱이 열립니다.
앱이 설치되어 있지 않으면 아무 동작 없을 수 있습니다. 앱 설치 후 다시 시도하세요.

## 기능

- 지정번호로 GLB 모델 로드
- Hit Test + 탭하여 배치
- Location ON (위치 기반 AR)
- 웹 버전과 동일한 API 사용
