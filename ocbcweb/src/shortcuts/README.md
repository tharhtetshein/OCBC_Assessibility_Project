# Shortcuts Layout System

This directory contains the shortcuts layout system with multiple layout options including the new **Circular Layout**.

## Components

### Core Layout Components

- **`ShortcutsLayoutManager.js`** - Main component that manages different layout options
- **`LayoutSelector.js`** - UI component for switching between layouts
- **`CircularShortcutsGrid.js`** - New circular layout implementation
- **`SwipeableShortcutsGrid.js`** - Existing swipeable grid layout
- **`ShortcutsGrid.js`** - Traditional grid layout

### Supporting Components

- **`shortcutsConfig.js`** - Configuration and data for shortcuts
- **`CustomiseShortcut.js`** - Shortcut customization interface
- **`PreviewModal.js`** - Preview modal for shortcuts
- **`ShortcutsDemo.js`** - Demo component showcasing all layouts

## Layout Options

### 1. Grid Layout (`grid`)
- Traditional 3x2 grid arrangement
- Simple and familiar interface
- Best for users who prefer standard layouts

### 2. Swipeable Layout (`swipeable`) 
- Paginated grid with smooth transitions
- Swipe gestures for navigation
- Page indicators and navigation controls
- Supports large numbers of shortcuts

### 3. Circular Layout (`circular`) ⭐ **NEW**
- Shortcuts arranged in a circle
- Center branding with OCBC logo
- Unique and engaging interface
- Touch gestures for page navigation
- Configurable radius and positioning

## Features

### Layout Management
- **Persistent Preferences**: Layout choice is saved to localStorage
- **Smooth Transitions**: Animated transitions between layouts
- **Responsive Design**: Adapts to different screen sizes
- **Touch Support**: Full touch gesture support on mobile

### Circular Layout Features
- **Mathematical Positioning**: Uses trigonometry for perfect circle arrangement
- **Center Branding**: OCBC logo in the center of the circle
- **Animated Transitions**: Smooth rotation and scaling animations
- **Usage Indicators**: Optional usage count badges
- **Hover Effects**: Interactive hover states with scaling
- **Swipe Navigation**: Left/right swipe for multiple circles

### Accessibility
- **Large Text Mode**: Supports accessibility text scaling
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and descriptions
- **High Contrast**: Maintains readability in all modes

## Usage

### Basic Implementation
```jsx
import ShortcutsLayoutManager from './shortcuts/ShortcutsLayoutManager';

<ShortcutsLayoutManager
  shortcuts={shortcuts}
  onShortcutClick={handleShortcutClick}
  onAddClick={handleAddClick}
  showLayoutSelector={true}
  defaultLayout="circular"
/>
```

### Props
- `shortcuts` - Array of shortcut objects
- `onShortcutClick` - Function called when shortcut is clicked
- `onAddClick` - Function called when add button is clicked
- `showUsageCount` - Boolean to show usage count badges
- `largeTextMode` - Boolean for accessibility text scaling
- `showLayoutSelector` - Boolean to show/hide layout selector
- `defaultLayout` - Default layout ('grid', 'swipeable', 'circular')

### Circular Layout Specific Props
- `radius` - Circle radius in pixels (default: 120)

## Technical Implementation

### Circular Positioning Algorithm
```javascript
const getCircularPosition = (index, total, centerX, centerY) => {
  const angle = (index * 360 / total) - 90; // Start from top
  const radian = (angle * Math.PI) / 180;
  
  const x = centerX + radius * Math.cos(radian);
  const y = centerY + radius * Math.sin(radian);
  
  return { x, y, angle };
};
```

### Animation System
- **CSS Keyframes**: Custom animations for circular entrance
- **Transform Transitions**: Smooth scaling and rotation
- **Staggered Animations**: Sequential item animations
- **Touch Feedback**: Visual feedback during interactions

## Integration

The layout system is integrated into:
- **Dashboard.js** - Main user dashboard (default: swipeable)
- **LandingPage.js** - Landing page for guests (default: grid)

## Customization

### Adding New Layouts
1. Create new layout component following the existing pattern
2. Add layout option to `LayoutSelector.js`
3. Update `ShortcutsLayoutManager.js` switch statement
4. Add appropriate icons and descriptions

### Styling Customization
- All styles are inline for easy customization
- CSS variables can be added for theme consistency
- Animation timing can be adjusted in keyframes

## Browser Support
- **Modern Browsers**: Full support with all animations
- **Touch Devices**: Complete touch gesture support
- **Older Browsers**: Graceful degradation without animations
- **Mobile First**: Optimized for mobile interactions

## Performance
- **Lazy Rendering**: Only renders current page/circle
- **Optimized Animations**: Hardware-accelerated transforms
- **Memory Efficient**: Minimal DOM manipulation
- **Touch Optimized**: Debounced touch events