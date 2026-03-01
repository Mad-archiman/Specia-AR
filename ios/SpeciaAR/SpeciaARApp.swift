import SwiftUI

@main
struct SpeciaARApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    NotificationCenter.default.post(name: .openARWithCode, object: nil, userInfo: ["url": url])
                }
        }
    }
}

extension Notification.Name {
    static let openARWithCode = Notification.Name("openARWithCode")
}
