import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var showingMagicLinkFlow = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Logo
            Image(systemName: "message.fill")
                .font(.system(size: 80))
                .foregroundColor(.blue)

            Text("Polyglot Messenger")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("Everyone types in their language;\nrecipients see messages in theirs")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)
                .padding(.horizontal)

            Spacer()

            VStack(spacing: 16) {
                // Passkey Sign In (Primary)
                Button(action: {
                    Task {
                        await authViewModel.signInWithPasskey()
                    }
                }) {
                    HStack {
                        Image(systemName: "person.badge.key.fill")
                        Text("Sign in with Passkey")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }

                // Magic Link (Fallback)
                Button(action: {
                    showingMagicLinkFlow = true
                }) {
                    HStack {
                        Image(systemName: "envelope.fill")
                        Text("Sign in with Magic Link")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.secondary.opacity(0.2))
                    .foregroundColor(.primary)
                    .cornerRadius(12)
                }
            }
            .padding(.horizontal, 32)

            if authViewModel.isLoading {
                ProgressView()
                    .padding()
            }

            if let error = authViewModel.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding()
            }

            Spacer()
        }
        .sheet(isPresented: $showingMagicLinkFlow) {
            MagicLinkView(email: $email)
                .environmentObject(authViewModel)
        }
    }
}

struct MagicLinkView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Binding var email: String
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Text("Enter your email")
                    .font(.title2)
                    .fontWeight(.semibold)

                TextField("Email", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(8)
                    .padding(.horizontal)

                Button(action: {
                    Task {
                        await authViewModel.signInWithMagicLink(email: email)
                        dismiss()
                    }
                }) {
                    Text("Send Magic Link")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding(.horizontal)
                .disabled(email.isEmpty)

                Spacer()
            }
            .padding(.top, 32)
            .navigationBarItems(trailing: Button("Cancel") {
                dismiss()
            })
        }
    }
}

#Preview {
    SignInView()
        .environmentObject(AuthViewModel())
}
