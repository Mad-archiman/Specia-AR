import UIKit
import ARKit
import SceneKit
import CoreLocation

/// GLB 로딩: GLTFKit2 Swift Package 추가 필요
/// Xcode: File > Add Package Dependencies > https://github.com/warrenm/GLTFKit2
#if canImport(GLTFKit2)
import GLTFKit2
#endif

final class ARSceneViewController: UIViewController, ARSCNViewDelegate, CLLocationManagerDelegate {
    private let modelURL: URL
    private let modelGeoLocation: (lat: Double, lon: Double, alt: Double)?
    private var arView: ARSCNView!
    private var arModelNode: SCNNode?
    private var tapPlacedNodes: [SCNNode] = []
    private var geoPlacedNode: SCNNode?
    private var reticleNode: SCNNode?
    private var locationManager: CLLocationManager?
    private var locationModeActive = false
    private var hitTestResult: ARHitTestResult?
    private var meshOpacityMap: [String: Float] = [:]
    
    init(modelURL: URL, modelGeoLocation: (lat: Double, lon: Double, alt: Double)?) {
        self.modelURL = modelURL
        self.modelGeoLocation = modelGeoLocation
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupARView()
        loadModel()
        setupGestures()
        setupOverlay()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal]
        config.environmentTexturing = .automatic
        arView.session.run(config)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        arView.session.pause()
    }
    
    private func setupARView() {
        arView = ARSCNView(frame: view.bounds)
        arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        arView.delegate = self
        arView.showsStatistics = false
        arView.antialiasingMode = .multisampling4X
        view.addSubview(arView)
        
        let reticle = SCNNode()
        reticle.geometry = SCNTorus(ringRadius: 0.1, pipeRadius: 0.02)
        reticle.geometry?.firstMaterial?.diffuse.contents = UIColor.white
        reticle.name = "reticle"
        reticle.isHidden = true
        arView.scene.rootNode.addChildNode(reticle)
        reticleNode = reticle
    }
    
    private func loadModel() {
        #if canImport(GLTFKit2)
        GLTFAsset.load(with: modelURL, options: [:]) { [weak self] progress, status, asset, error, _ in
            guard status == .complete, let asset = asset else {
                if let err = error {
                    DispatchQueue.main.async {
                        self?.showError(err.localizedDescription)
                    }
                }
                return
            }
            DispatchQueue.main.async {
                guard let scene = SCNScene(gltfAsset: asset) else {
                    self?.showError("모델 변환 실패")
                    return
                }
                self?.addModelToScene(scene)
            }
        }
        #else
        showError("GLTFKit2 패키지를 추가해 주세요. File > Add Package Dependencies > https://github.com/warrenm/GLTFKit2")
        #endif
    }
    
    private func addModelToScene(_ scene: SCNScene) {
        let root = scene.rootNode.clone()
        let (min, max) = root.boundingBox
        let cx = (min.x + max.x) / 2
        let cy = (min.y + max.y) / 2
        let cz = (min.z + max.z) / 2
        root.position = SCNVector3(-cx, -cy, -cz)
        
        root.enumerateChildNodes { node, _ in
            if let geom = node.geometry {
                meshOpacityMap[node.name ?? node.uuid] = 1
            }
        }
        
        arModelNode = root
        arView.scene.rootNode.addChildNode(root)
        root.isHidden = true
    }
    
    private func setupGestures() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        arView.addGestureRecognizer(tap)
    }
    
    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        guard !locationModeActive,
              let arModel = arModelNode,
              let hit = hitTestResult else { return }
        let clone = arModel.clone()
        clone.worldTransform = hit.worldTransform
        clone.isHidden = false
        arView.scene.rootNode.addChildNode(clone)
        tapPlacedNodes.append(clone)
    }
    
    private func setupOverlay() {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        
        if modelGeoLocation != nil {
            let locBtn = UIButton(type: .system)
            locBtn.setTitle("Location ON", for: .normal)
            locBtn.addTarget(self, action: #selector(toggleLocation), for: .touchUpInside)
            locBtn.setTitleColor(.white, for: .normal)
            locBtn.backgroundColor = UIColor.black.withAlphaComponent(0.5)
            locBtn.layer.cornerRadius = 8
            locBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
            stack.addArrangedSubview(locBtn)
        }
        
        let closeBtn = UIButton(type: .system)
        closeBtn.setTitle("✕ AR 종료", for: .normal)
        closeBtn.addTarget(self, action: #selector(closeAR), for: .touchUpInside)
        closeBtn.setTitleColor(.white, for: .normal)
        closeBtn.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        closeBtn.layer.cornerRadius = 8
        closeBtn.contentEdgeInsets = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        stack.addArrangedSubview(closeBtn)
        
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16)
        ])
    }
    
    @objc private func toggleLocation() {
        guard let geo = modelGeoLocation else { return }
        locationModeActive = true
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.requestWhenInUseAuthorization()
        locationManager?.startUpdatingLocation()
        locationManager?.startUpdatingHeading()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.placeModelAtLocation(geo: geo)
        }
    }
    
    private func placeModelAtLocation(geo: (lat: Double, lon: Double, alt: Double)) {
        guard let loc = locationManager?.location else { return }
        let userLat = loc.coordinate.latitude
        let userLon = loc.coordinate.longitude
        let userAlt = loc.altitude
        let horizontalDist = min(GeoUtils.getDistanceMeters(lat1: userLat, lon1: userLon, lat2: geo.lat, lon2: geo.lon), 150)
        let bearing = GeoUtils.getBearing(lat1: userLat, lon1: userLon, lat2: geo.lat, lon2: geo.lon)
        let deltaAlt = userAlt - geo.alt
        let heading = locationManager?.heading?.trueHeading ?? 0
        
        guard let frame = arView.session.currentFrame else { return }
        let cam = frame.camera
        let camPos = SCNVector3(
            cam.transform.columns.3.x,
            cam.transform.columns.3.y,
            cam.transform.columns.3.z
        )
        let camRot = simd_quatf(cam.transform)
        let angleRad = Float((heading - bearing) * .pi / 180)
        var fwd = simd_make_float3(0, 0, -1)
        fwd = simd_act(camRot, fwd)
        fwd.y = 0
        if simd_length(fwd) > 0.001 {
            fwd = simd_normalize(fwd)
        } else {
            fwd = simd_make_float3(0, 0, -1)
        }
        let rot = simd_quatf(angle: angleRad, axis: simd_make_float3(0, 1, 0))
        fwd = simd_act(rot, fwd)
        let down = simd_make_float3(0, -1, 0)
        let placePos = camPos + fwd * Float(horizontalDist) + down * Float(deltaAlt)
        
        tapPlacedNodes.forEach { $0.removeFromParentNode() }
        tapPlacedNodes.removeAll()
        geoPlacedNode?.removeFromParentNode()
        
        guard let arModel = arModelNode else { return }
        let placed = arModel.clone()
        placed.position = placePos
        placed.quaternion = camRot
        placed.isHidden = false
        arView.scene.rootNode.addChildNode(placed)
        geoPlacedNode = placed
        arModelNode?.isHidden = true
    }
    
    @objc private func closeAR() {
        locationManager?.stopUpdatingLocation()
        locationManager?.stopUpdatingHeading()
        dismiss(animated: true)
    }
    
    private func showError(_ msg: String) {
        let alert = UIAlertController(title: "오류", message: msg, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "확인", style: .default) { [weak self] _ in
            self?.dismiss(animated: true)
        })
        present(alert, animated: true)
    }
    
    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        DispatchQueue.main.async { [weak self] in
            self?.updateHitTest()
        }
    }
    
    private func updateHitTest() {
        guard !locationModeActive,
              let frame = arView.session.currentFrame else {
            reticleNode?.isHidden = true
            hitTestResult = nil
            return
        }
        let point = CGPoint(x: view.bounds.midX, y: view.bounds.midY)
        let results = arView.hitTest(point, types: [.existingPlaneUsingGeometry, .estimatedHorizontalPlane])
        if let first = results.first {
            hitTestResult = first
            reticleNode?.isHidden = false
            reticleNode?.simdWorldTransform = first.worldTransform
        } else {
            hitTestResult = nil
            reticleNode?.isHidden = true
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {}
    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {}
}
