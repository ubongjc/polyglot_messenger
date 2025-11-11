# Responsive UI Guidelines - Polyglot Messenger

## Overview

This document outlines the responsive design strategy for Polyglot Messenger across all supported platforms:
- **Web Desktop** (laptops, 1024px+)
- **Web Tablet** (iPad, Android tablets, 768px-1023px)
- **Web Mobile** (iPhone, Android phones, <768px)
- **iOS Native App** (iPhone, iPad)

## Tailwind CSS Breakpoints

```typescript
// tailwind.config.ts breakpoints
screens: {
  'sm': '640px',   // Small devices (large phones)
  'md': '768px',   // Medium devices (tablets)
  'lg': '1024px',  // Large devices (laptops)
  'xl': '1280px',  // Extra large devices (desktops)
  '2xl': '1536px', // 2X extra large devices
}
```

## Layout Strategy

### Desktop (1024px+)
```
┌─────────────────────────────────────────────┐
│  Header / Navigation                         │
├───────────┬─────────────────────┬───────────┤
│           │                     │           │
│  Sidebar  │   Main Content      │  Details  │
│  (256px)  │   (flex-1)          │  (320px)  │
│           │                     │           │
│  - Threads│   - Messages        │  - Profile│
│  - Search │   - Compose         │  - Media  │
│  - Users  │   - Voice/Video     │  - Files  │
│           │                     │           │
└───────────┴─────────────────────┴───────────┘
```

### Tablet (768px-1023px)
```
┌─────────────────────────────────────┐
│  Header / Navigation                 │
├───────────┬─────────────────────────┤
│           │                         │
│  Sidebar  │   Main Content          │
│  (200px)  │   (flex-1)              │
│           │                         │
│  - Threads│   - Messages            │
│  - Search │   - Compose             │
│           │   - Details (modal)     │
│           │                         │
└───────────┴─────────────────────────┘
```

### Mobile (<768px)
```
┌───────────────────────────┐
│  Header                    │
├───────────────────────────┤
│                           │
│  Main Content (Full Width)│
│                           │
│  - Thread List OR         │
│  - Thread Detail          │
│  - (Stack navigation)     │
│                           │
├───────────────────────────┤
│  Bottom Navigation        │
│  ┌───┬───┬───┬───┬───┐   │
│  │ 🏠│ 💬│ 👤│ 🔍│ ⚙️ │   │
│  └───┴───┴───┴───┴───┘   │
└───────────────────────────┘
```

## Component Patterns

### Responsive Container

```typescript
<div className="
  // Base (mobile)
  px-4 py-4
  // Tablet
  md:px-6 md:py-6
  // Desktop
  lg:px-8 lg:py-8
">
  Content
</div>
```

### Responsive Grid

```typescript
<div className="
  grid
  // Mobile: 1 column
  grid-cols-1
  gap-4
  // Tablet: 2 columns
  md:grid-cols-2
  md:gap-6
  // Desktop: 3 columns
  lg:grid-cols-3
  lg:gap-8
">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Responsive Navigation

```typescript
// Desktop: Sidebar
<nav className="hidden lg:flex lg:flex-col lg:w-64">
  <SidebarContent />
</nav>

// Mobile: Bottom nav
<nav className="lg:hidden fixed bottom-0 left-0 right-0">
  <BottomNavigation />
</nav>
```

### Responsive Typography

```typescript
<h1 className="
  // Mobile
  text-2xl
  leading-tight
  // Tablet
  md:text-3xl
  md:leading-snug
  // Desktop
  lg:text-4xl
  lg:leading-relaxed
">
  Heading
</h1>
```

## Touch Targets

### Minimum Sizes
- **Mobile**: 44x44px (iOS guidelines)
- **Tablet**: 48x48px
- **Desktop**: Can be smaller (32x32px) with mouse precision

```typescript
// Responsive button
<button className="
  // Mobile: Larger touch target
  h-12 px-6
  // Desktop: Compact
  lg:h-10 lg:px-4
  rounded-lg
  active:scale-95
  transition-transform
">
  Button
</button>
```

## Message Bubbles

```typescript
// Sent message (right-aligned)
<div className="flex justify-end">
  <div className="
    // Base
    max-w-[85%]
    bg-blue-500
    text-white
    rounded-2xl
    rounded-tr-sm
    px-4 py-2
    // Desktop: Smaller max width
    lg:max-w-[60%]
  ">
    Message content
  </div>
</div>

// Received message (left-aligned)
<div className="flex justify-start">
  <div className="
    max-w-[85%]
    bg-gray-200
    text-gray-900
    rounded-2xl
    rounded-tl-sm
    px-4 py-2
    lg:max-w-[60%]
  ">
    Message content
  </div>
</div>
```

## Input Areas

```typescript
// Message composer
<div className="
  // Sticky to bottom on mobile
  sticky
  bottom-0
  left-0
  right-0
  // Padding
  p-4
  // Background
  bg-white
  border-t
  // Safe area for iOS notch
  pb-safe
">
  <div className="flex items-center gap-2">
    <input
      className="
        flex-1
        px-4
        py-3
        rounded-full
        border
        focus:outline-none
        focus:ring-2
      "
      placeholder="Type a message..."
    />
    <button className="
      h-12 w-12
      rounded-full
      bg-blue-500
      text-white
    ">
      Send
    </button>
  </div>
</div>
```

## iOS Native App Guidelines

### Safe Areas
```swift
// Respect safe area insets
.padding(.top, geometry.safeAreaInsets.top)
.padding(.bottom, geometry.safeAreaInsets.bottom)
```

### Dynamic Type
```swift
// Support dynamic text sizing
Text("Message")
    .font(.body)
    .lineLimit(nil)
```

### Haptic Feedback
```swift
// Provide haptic feedback for interactions
let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
impactFeedback.impactOccurred()
```

### Adaptive Layouts
```swift
// iPad: Use split view
if horizontalSizeClass == .regular {
    NavigationView {
        ThreadListView()
        ThreadDetailView()
    }
    .navigationViewStyle(.columns)
} else {
    // iPhone: Use stack navigation
    NavigationView {
        ThreadListView()
    }
}
```

## Performance Considerations

### Mobile Optimizations

1. **Lazy Loading**: Load messages incrementally
2. **Image Optimization**: Compress and resize images
3. **Virtual Scrolling**: Use virtualized lists for long conversations
4. **Debounced Search**: Debounce search input (300ms)
5. **Offline Support**: Cache recent messages

### CSS Optimizations

```typescript
// Use CSS containment
<div className="contain-layout contain-paint">
  {/* Message list */}
</div>

// Use will-change for animations
<div className="will-change-transform">
  {/* Animated content */}
</div>
```

## Accessibility

### ARIA Labels
```typescript
<button aria-label="Send message">
  <SendIcon />
</button>
```

### Keyboard Navigation
```typescript
<input
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      sendMessage();
    }
  }}
/>
```

### Screen Reader Support
```typescript
<div role="log" aria-live="polite" aria-atomic="false">
  {/* Message list */}
</div>
```

## Testing Checklist

### Web
- [ ] Test on Chrome, Safari, Firefox, Edge
- [ ] Test on 320px (iPhone SE)
- [ ] Test on 375px (iPhone 12/13)
- [ ] Test on 768px (iPad)
- [ ] Test on 1024px+ (Desktop)
- [ ] Test portrait and landscape orientations
- [ ] Test with slow 3G network
- [ ] Test with DevTools device emulation

### iOS
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro (notch)
- [ ] Test on iPhone 14 Pro Max (large screen)
- [ ] Test on iPad (split view)
- [ ] Test with Dynamic Type (accessibility sizes)
- [ ] Test with VoiceOver enabled
- [ ] Test in light and dark mode

## Common Issues & Solutions

### Issue: Text cutoff on small screens
```typescript
// ❌ Bad
<p className="text-lg">Long text...</p>

// ✅ Good
<p className="text-sm md:text-base lg:text-lg break-words">
  Long text...
</p>
```

### Issue: Buttons too small on touch devices
```typescript
// ❌ Bad
<button className="h-8 w-8">×</button>

// ✅ Good
<button className="h-12 w-12 active:scale-95">×</button>
```

### Issue: Layout breaks on iPad
```typescript
// ❌ Bad
<div className="flex">
  <div className="w-64">Sidebar</div>
  <div className="w-[calc(100%-256px)]">Content</div>
</div>

// ✅ Good
<div className="flex flex-col md:flex-row">
  <div className="w-full md:w-64">Sidebar</div>
  <div className="flex-1">Content</div>
</div>
```

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Responsive Layout](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)
- [MDN Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)

## Implementation Status

✅ **Completed**:
- Tailwind CSS configuration
- Responsive breakpoints defined
- Mobile-first approach established

⏳ **In Progress**:
- Message interface components
- Responsive navigation
- Touch-friendly controls

📋 **Planned**:
- Full UI component library
- Storybook documentation
- Visual regression testing
