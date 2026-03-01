import Foundation

/// API 베이스 URL (웹 앱이 배포된 도메인)
/// 예: "https://your-domain.com" (끝에 / 없이)
enum Config {
    static var apiBaseURL: String {
        if let url = ProcessInfo.processInfo.environment["SPECIA_AR_API_URL"] {
            return url.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        return "https://specia-ar.vercel.app"
    }
}
