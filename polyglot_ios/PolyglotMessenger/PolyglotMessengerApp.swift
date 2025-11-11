import SwiftUI

@main
struct PolyglotMessengerApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var messagingViewModel = MessagingViewModel()

    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
                    .environmentObject(messagingViewModel)
            } else {
                SignInView()
                    .environmentObject(authViewModel)
            }
        }
    }
}
