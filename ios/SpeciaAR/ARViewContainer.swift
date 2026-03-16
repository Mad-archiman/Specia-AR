import SwiftUI

struct ARViewContainer: View {
    let code: String
    @State private var modelUrl: URL? = nil
    @State private var modelGeoLocation: (lat: Double, lon: Double, alt: Double)? = nil
    @State private var loadError: String? = nil
    @State private var isLoading = true
    var body: some View {
        Group {
            if isLoading {
                ZStack {
                    LinearGradient(
                        colors: [Color(hex: "281e5a"), Color(hex: "50288c")],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea()
                    VStack(spacing: 16) {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)
                        Text("모델 불러오는 중…")
                            .foregroundColor(.white)
                    }
                }
            } else if let err = loadError {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(err)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.white)
                    Button("다시 시도") {
                        loadModel()
                    }
                    .foregroundColor(.white)
                    .padding()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(hex: "281e5a"))
            } else if let url = modelUrl {
                ARSceneView(
                    modelURL: url,
                    modelGeoLocation: modelGeoLocation,
                    code: code
                )
            }
        }
        .navigationBarBackButtonHidden(true)
        .task { loadModel() }
    }
    
    private func loadModel() {
        isLoading = true
        loadError = nil
        Task {
            do {
                let loader = ModelLoader()
                async let modelTask: URL = loader.downloadModel(code: code)
                async let metaTask: (lat: Double, lon: Double, alt: Double)? = {
                    try? await loader.fetchMeta(code: code)
                }()
                let (model, meta) = await (try modelTask, try? metaTask)
                await MainActor.run {
                    modelUrl = model
                    modelGeoLocation = meta
                    isLoading = false
                }
            } catch {
                await MainActor.run {
                    loadError = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}
