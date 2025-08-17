# UI & Visual Features

Plain-English snapshot of user interface and visual elements (no deep tech yet).

## Themes

- Built-in themes: Dark (default), Light, High Contrast, and platform-specific variants
- Theme auto-switching: automatically switches between dark and light based on system preference
- Custom theme support via plugins with CSS overrides
- Theme color for mobile browsers (PWA appearance)
- macOS-specific: macOS-Dark theme as default, custom title bar styling

## Colors & Visual Design

- Updated icons and visual design (modern flat style)
- Colorful icons option for better visual distinction
- Monospace fonts for protected fields and technical data
- Locale-aware date and time formatting
- San Francisco font support on macOS Chrome
- Font size customization options

## Icons & Favicons

- Custom entry icons support (standard KeePass icon set + user uploads)
- Automatic favicon download for websites (via favicon.keeweb.info service)
- Group icon inheritance: new entries can automatically use their group's icon
- Website icons displayed in entry lists for quick recognition

## Image & Attachment Viewer

- Inline image viewer for attached files
- Back button navigation in attachment preview
- Support for common image formats in entry attachments
- Attachment download capability on mobile devices

## Mobile Support

- Responsive layout adapting to phone and tablet screens
- Touch-friendly controls and gesture support
- Mobile Safari layout optimizations
- iOS PWA (Progressive Web App) improvements
- Homescreen app support with proper icons and splash screens
- Mobile field editing improvements with appropriate keyboard types
- Screen orientation handling for Android PWA

## Layout Options

- Table view with customizable columns (Title, Username, URL, Tags, Modified, etc.)
- List view as default with card-style entries
- Resizable panels (menu width, entry list width saved between sessions)
- Compact and spacious layout modes
- Entry selection and bulk operations support

## Accessibility & UX

- Clear visual indicators for file state (dirty/clean, sync status, locked/unlocked)
- Loading animations and progress feedback
- Error message display with actionable retry options
- Keyboard navigation support throughout the interface
- Focus management for screen readers
- High contrast theme for visual accessibility

## Platform-Specific UI

- Desktop: native title bars, window controls, and system integration
- Web: browser-appropriate styling and PWA manifest
- Consistent experience across platforms while respecting OS conventions
- Tray/menubar integration on desktop platforms

## Interactive Elements

- Context menus for entries, groups, and fields
- Drag-and-drop visual feedback and drop zone indicators
- Hover states and tooltips for better discoverability
- Inline editing with proper focus management
- Modal dialogs for settings, file operations, and confirmations

## What Comes Later

Further sections will cover:

- CSS architecture and theming system
- Icon management and custom graphics pipeline
- Mobile-specific optimizations and PWA configuration
- Platform-specific UI code organization
