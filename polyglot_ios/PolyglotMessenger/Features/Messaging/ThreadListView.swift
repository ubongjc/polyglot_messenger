import SwiftUI

struct ThreadListView: View {
    @EnvironmentObject var messagingViewModel: MessagingViewModel
    @State private var showingNewThread = false

    var body: some View {
        NavigationView {
            Group {
                if messagingViewModel.threads.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "message.badge.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)

                        Text("No conversations yet")
                            .font(.title3)
                            .foregroundColor(.secondary)

                        Button(action: {
                            showingNewThread = true
                        }) {
                            Text("Start a Conversation")
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(12)
                        }
                    }
                } else {
                    List(messagingViewModel.threads) { thread in
                        NavigationLink(destination: ThreadDetailView(thread: thread)) {
                            ThreadRowView(thread: thread)
                        }
                    }
                    .refreshable {
                        await messagingViewModel.fetchThreads()
                    }
                }
            }
            .navigationTitle("Messages")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingNewThread = true
                    }) {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .sheet(isPresented: $showingNewThread) {
                NewThreadView()
                    .environmentObject(messagingViewModel)
            }
        }
        .task {
            await messagingViewModel.fetchThreads()
        }
    }
}

struct ThreadRowView: View {
    let thread: Thread

    var otherParticipants: [User] {
        thread.participants.map { $0.user }
    }

    var lastMessage: Message? {
        thread.messages?.last
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 50, height: 50)
                .overlay(
                    Text(otherParticipants.first?.name?.prefix(1).uppercased() ?? "?")
                        .font(.title3)
                        .foregroundColor(.blue)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(otherParticipants.map { $0.name ?? $0.email }.joined(separator: ", "))
                    .font(.headline)

                if let lastMessage = lastMessage {
                    Text(lastMessage.decryptedContent ?? "Encrypted message")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            Text(thread.updatedAt, style: .relative)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }
}

struct NewThreadView: View {
    @EnvironmentObject var messagingViewModel: MessagingViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedUserIds: [String] = []

    var body: some View {
        NavigationView {
            VStack {
                Text("Select participants")
                    .font(.headline)
                    .padding()

                // TODO: Add user picker

                Spacer()

                Button(action: {
                    Task {
                        await messagingViewModel.createThread(with: selectedUserIds)
                        dismiss()
                    }
                }) {
                    Text("Create Thread")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
                .padding()
                .disabled(selectedUserIds.isEmpty)
            }
            .navigationTitle("New Conversation")
            .navigationBarItems(trailing: Button("Cancel") {
                dismiss()
            })
        }
    }
}

#Preview {
    ThreadListView()
        .environmentObject(MessagingViewModel())
}
