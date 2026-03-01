import SwiftUI

struct ContentView: View {
    @State private var code: String = ""
    @State private var navigateToAR: CodeItem? = nil
    @State private var showGuide: Bool = false
    @State private var showCodeModal: Bool = false
    @State private var errorMessage: String = ""
    
    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [Color(hex: "281e5a"), Color(hex: "50288c")],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 24) {
                    Spacer()
                    (Text("SP")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                    + Text("E")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(Color(hex: "8C90EE"))
                    + Text("CIA-AR")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white))
                    
                    Text("SPECIA-AR에 오신 것을 환영합니다.")
                        .font(.title3)
                        .foregroundColor(.white)
                    
                    Text("당신의 프로젝트를 현실에 옮겨보세요.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                    
                    Button {
                        showGuide = true
                    } label: {
                        Text("설명서")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.7))
                    }
                    .padding(.top, 8)
                    
                    Button {
                        showCodeModal = true
                        errorMessage = ""
                        code = ""
                    } label: {
                        Text("AR 3D 뷰어")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(hex: "3c2896"))
                            .cornerRadius(8)
                    }
                    .padding(.horizontal, 32)
                    .padding(.top, 32)
                    
                    Spacer()
                }
                .sheet(isPresented: $showGuide) {
                    GuideSheet()
                }
                .sheet(isPresented: $showCodeModal) {
                    CodeInputSheet(
                        code: $code,
                        errorMessage: $errorMessage,
                        onConfirm: {
                            let c = code.trimmingCharacters(in: .whitespaces).uppercased()
                            if c.count == 4 {
                                errorMessage = ""
                                showCodeModal = false
                                navigateToAR = CodeItem(code: c)
                            } else {
                                errorMessage = "지정번호 4자리를 입력해 주세요."
                            }
                        },
                        onCancel: { showCodeModal = false }
                    )
                }
                .navigationDestination(item: $navigateToAR) { item in
                    ARViewContainer(code: item.code)
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .openARWithCode)) { notif in
                guard let url = notif.userInfo?["url"] as? URL,
                      url.scheme == "specia-ar",
                      let comps = URLComponents(url: url, resolvingAgainstBaseURL: false),
                      let codeParam = comps.queryItems?.first(where: { $0.name == "code" })?.value,
                      codeParam.count == 4 else { return }
                navigateToAR = CodeItem(code: codeParam.uppercased())
            }
        }
    }
}

struct CodeInputSheet: View {
    @Binding var code: String
    @Binding var errorMessage: String
    let onConfirm: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Text("지정번호 입력")
                .font(.title2)
                .foregroundColor(.white)
            Text("공유받은 4자리 지정번호를 입력하세요.")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))
            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
            }
            TextField("예: A1B2", text: $code)
                .textFieldStyle(.roundedBorder)
                .textCase(.uppercase)
                .autocapitalization(.allCharacters)
                .disableAutocorrection(true)
                .multilineTextAlignment(.center)
                .font(.system(.body, design: .monospaced))
                .onChange(of: code) { _, newValue in
                    if newValue.count > 4 {
                        code = String(newValue.prefix(4))
                    }
                }
            HStack(spacing: 12) {
                Button("취소", action: onCancel)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.white.opacity(0.2))
                    .foregroundColor(.white)
                    .cornerRadius(8)
                Button("확인", action: onConfirm)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(hex: "3c2896"))
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "1a1a1a"))
    }
}

struct CodeItem: Identifiable {
    let id = UUID()
    let code: String
}

struct GuideSheet: View {
    @Environment(\.dismiss) private var dismiss
    let steps = [
        "AR 3D 뷰어 버튼을 누릅니다.",
        "부여받은 코드를 입력합니다.",
        "핸드폰을 잠시 바닥에 가깝게 둡니다.",
        "START AR을 누릅니다.",
        "자유롭게 모델을 현실에서 즐기세요."
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("-사용법-")
                .font(.headline)
                .foregroundColor(.white)
            ForEach(Array(steps.enumerated()), id: \.offset) { i, step in
                HStack(alignment: .top) {
                    Text("\(i + 1).")
                        .foregroundColor(.white.opacity(0.9))
                    Text(step)
                        .foregroundColor(.white.opacity(0.9))
                    Spacer()
                }
            }
            Spacer()
            Button("닫기") {
                dismiss()
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.white.opacity(0.2))
            .foregroundColor(.white)
            .cornerRadius(8)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: "1a1a1a"))
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
