// Generate random 6-digit session code
export const generateSessionCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request microphone permission (needed to get device labels)
export const requestAudioPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just needed permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

// Check if headphones/earpiece is connected
export const isHeadphonesConnected = async () => {
  try {
    // Check if the Media Devices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }

    // Request permission to access audio devices
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      console.warn('Cannot check audio devices without permission');
      return false;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
    
    // Check for headphone-related labels (case-insensitive)
    const headphoneKeywords = [
      'headphone', 'headphones', 'headset', 'earphone', 'earphones',
      'earbud', 'earbuds', 'airpod', 'airpods', 'bluetooth', 'wired', 
      'usb audio', 'usb headphone', 'wireless headphone', 'galaxy buds', 
      'buds', 'galaxy buds2', 'galaxy buds3', 'Galaxy Buds2 '
    ];
    
    const hasHeadphones = audioOutputs.some(device => {
      const label = device.label.toLowerCase();
      return headphoneKeywords.some(keyword => label.includes(keyword));
    });
    
    return hasHeadphones;
  } catch (error) {
    console.error('Error checking audio devices:', error);
    return false;
  }
};

// Alternative method: Check audio output type 
export const getAudioOutputType = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return 'unknown';
    }

    // Request permission to access audio devices
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      return 'unknown';
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
    
    if (audioOutputs.length === 0) {
      return 'none';
    }

    // Check all audio output devices, not just the first one
    const hasHeadphones = audioOutputs.some(device => {
      const label = device.label.toLowerCase();
      
      // Check for headphone-related keywords
      return (
        label.includes('headphone') || 
        label.includes('Headphones') || 
        label.includes('headphones') ||
        label.includes('headset') || 
        label.includes('earphone') ||
        label.includes('earphones') ||
        label.includes('earbud') ||
        label.includes('earbuds') ||
        label.includes('airpod') ||
        label.includes('airpods') ||
        label.includes('bluetooth') ||
        label.includes('wired headphone') ||
        label.includes('usb headphone') ||
        label.includes('wireless headphone')
      );
    });
    
    if (hasHeadphones) {
      return 'headphones';
    }
    
    // Check if any device has "speaker" in the label
    const hasSpeaker = audioOutputs.some(device => {
      const label = device.label.toLowerCase();
      return label.includes('speaker') && !label.includes('headphone');
    });
    
    if (hasSpeaker) {
      return 'speaker';
    }
    
    return 'other';
  } catch (error) {
    console.error('Error getting audio output type:', error);
    return 'unknown';
  }
};

// Speak text using Web Speech API with optional headphone check
export const speak = async (text, options = {}) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    // Check for headphones and adjust volume/privacy
    if (options.checkHeadphones) {
      const hasHeadphones = await isHeadphonesConnected();
      
      if (hasHeadphones) {
        // User has headphones - normal volume
        utterance.volume = options.volume || 1;
        console.log('🎧 Headphones detected - speaking at normal volume');
      } else {
        // No headphones - reduce volume for privacy or skip
        if (options.skipIfNoHeadphones) {
          console.log('🔇 No headphones detected - skipping speech for privacy');
          return;
        } else {
          utterance.volume = options.volume || 0.5; // Lower volume
          console.log('🔊 No headphones - speaking at reduced volume');
        }
      }
    }
    
    window.speechSynthesis.speak(utterance);
  }
};

// Enhanced speak function specifically for ATM privacy
export const speakPrivate = async (text, options = {}) => {
  const outputType = await getAudioOutputType();
  
  // Only speak if headphones are connected (for sensitive info)
  if (outputType === 'headphones') {
    speak(text, { ...options, checkHeadphones: false });
    console.log('🔒 Private mode: Speaking through headphones');
  } else {
    console.log('🔒 Privacy mode: Skipping speech - no headphones detected');
    console.log(`Current audio output: ${outputType}`);
    
    // Optionally show visual notification instead
    if (options.onSkip) {
      options.onSkip('Please connect headphones to enable audio guidance for sensitive information');
    }
  }
};

// Debug function to list all audio devices
export const debugAudioDevices = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.log('❌ Media Devices API not available');
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
    
    console.log('🔊 Available Audio Output Devices:');
    audioOutputs.forEach((device, index) => {
      console.log(`  ${index + 1}. ${device.label || 'Unknown Device'} (ID: ${device.deviceId})`);
    });
    
    const outputType = await getAudioOutputType();
    const hasHeadphones = await isHeadphonesConnected();
    
    console.log(`\n📊 Detection Results:`);
    console.log(`  Output Type: ${outputType}`);
    console.log(`  Has Headphones: ${hasHeadphones}`);
    
  } catch (error) {
    console.error('Error debugging audio devices:', error);
  }
};

// Monitor audio device changes in real-time
export const monitorAudioDevices = (callback) => {
  if (!navigator.mediaDevices) {
    return null;
  }

  const handleDeviceChange = async () => {
    const outputType = await getAudioOutputType();
    const hasHeadphones = await isHeadphonesConnected();
    
    console.log(`🔄 Audio device changed - Type: ${outputType}, Has Headphones: ${hasHeadphones}`);
    
    callback({ outputType, hasHeadphones });
  };

  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

  // Initial check
  handleDeviceChange();

  // Return cleanup function
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  };
};

// Vibrate device
export const vibrate = (pattern = [50]) => {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// Format seconds to MM:SS
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};