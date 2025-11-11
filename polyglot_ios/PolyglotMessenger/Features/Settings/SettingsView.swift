import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        NavigationView {
            List {
                Section {
                    if let user = authViewModel.currentUser {
                        HStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 60, height: 60)
                                .overlay(
                                    Text(user.name?.prefix(1).uppercased() ?? "?")
                                        .font(.title)
                                        .foregroundColor(.blue)
                                )

                            VStack(alignment: .leading) {
                                Text(user.name ?? "Unknown")
                                    .font(.headline)
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }

                Section("Preferences") {
                    NavigationLink(destination: Text("Language Settings")) {
                        Label("Language", systemImage: "globe")
                    }

                    NavigationLink(destination: Text("Translation Settings")) {
                        Label("Translation", systemImage: "text.bubble")
                    }

                    NavigationLink(destination: Text("Privacy Settings")) {
                        Label("Privacy", systemImage: "lock.shield")
                    }
                }

                Section("Subscription") {
                    NavigationLink(destination: Text("Subscription Details")) {
                        Label("Manage Subscription", systemImage: "creditcard")
                    }
                }

                Section("About") {
                    NavigationLink(destination: Text("Help Center")) {
                        Label("Help", systemImage: "questionmark.circle")
                    }

                    NavigationLink(destination: Text("Terms of Service")) {
                        Label("Terms of Service", systemImage: "doc.text")
                    }

                    NavigationLink(destination: Text("Privacy Policy")) {
                        Label("Privacy Policy", systemImage: "hand.raised")
                    }
                }

                Section {
                    Button(action: {
                        authViewModel.signOut()
                    }) {
                        HStack {
                            Spacer()
                            Text("Sign Out")
                                .foregroundColor(.red)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthViewModel())
}
