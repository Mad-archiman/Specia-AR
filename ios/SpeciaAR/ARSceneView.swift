import SwiftUI
import ARKit
import SceneKit

struct ARSceneView: View {
    let modelURL: URL
    let modelGeoLocation: (lat: Double, lon: Double, alt: Double)?
    let code: String
    
    var body: some View {
        ARSceneViewControllerRepresentable(
            modelURL: modelURL,
            modelGeoLocation: modelGeoLocation
        )
        .ignoresSafeArea()
    }
}

struct ARSceneViewControllerRepresentable: UIViewControllerRepresentable {
    let modelURL: URL
    let modelGeoLocation: (lat: Double, lon: Double, alt: Double)?
    
    func makeUIViewController(context: Context) -> ARSceneViewController {
        ARSceneViewController(modelURL: modelURL, modelGeoLocation: modelGeoLocation)
    }
    
    func updateUIViewController(_ uiViewController: ARSceneViewController, context: Context) {}
}
