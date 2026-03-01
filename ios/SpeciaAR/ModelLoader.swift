import Foundation

actor ModelLoader {
    private let baseURL: String
    
    init(baseURL: String = Config.apiBaseURL) {
        self.baseURL = baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }
    
    func downloadModel(code: String) async throws -> URL {
        let urlStr = "\(baseURL)/api/ar/model?code=\(code.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? code)"
        guard let url = URL(string: urlStr) else {
            throw ModelLoaderError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else {
            throw ModelLoaderError.invalidResponse
        }
        guard http.statusCode == 200 else {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let msg = json["error"] as? String {
                throw ModelLoaderError.apiError(msg)
            }
            throw ModelLoaderError.apiError("모델을 불러올 수 없습니다.")
        }
        let tempDir = FileManager.default.temporaryDirectory
        let tempFile = tempDir.appendingPathComponent("model_\(code)_\(UUID().uuidString).glb")
        try data.write(to: tempFile)
        return tempFile
    }
    
    func fetchMeta(code: String) async throws -> (lat: Double, lon: Double, alt: Double) {
        let urlStr = "\(baseURL)/api/ar/model/meta?code=\(code.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? code)"
        guard let url = URL(string: urlStr) else {
            throw ModelLoaderError.invalidURL
        }
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw ModelLoaderError.apiError("위치 정보를 불러올 수 없습니다.")
        }
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let lat = json["lat"] as? Double,
              let lon = json["lon"] as? Double else {
            throw ModelLoaderError.apiError("위치 정보가 없습니다.")
        }
        let alt = (json["alt"] as? Double) ?? 0
        return (lat, lon, alt)
    }
}

enum ModelLoaderError: LocalizedError {
    case invalidURL
    case invalidResponse
    case apiError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL: return "잘못된 URL"
        case .invalidResponse: return "잘못된 응답"
        case .apiError(let msg): return msg
        }
    }
}
