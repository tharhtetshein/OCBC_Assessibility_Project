import React from 'react';
import { speak, speakPrivate, vibrate } from './atmUtils';
import { doc, getDoc } from "firebase/firestore";
import { db, processEmergencySharedWithdrawal } from "../services/firebase";
import jsQR from 'jsqr';
import { Camera, Upload, QrCode, CheckCircle, AlertTriangle, Volume2, Clock, ArrowLeft } from 'lucide-react';


const SharedQRScreens = ({
  currentStep,
  onBack,
  setCurrentStep,
  qrScanMethod,
  setQrScanMethod,
  scannedQRData,
  setScannedQRData,
  setAmount,
  navigate,
  videoRef
}) => {
  const [processing, setProcessing] = React.useState(false);
  const [cameraError, setCameraError] = React.useState(null);
  const [scanning, setScanning] = React.useState(false);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const scanningRef = React.useRef(false);

  // OCBC Theme Colors (matching EmergencyWithdrawal)
  const colors = {
    primary: '#E52629',
    primaryDark: '#C41F21',
    secondary: '#4A5568',
    background: '#F5F5F5',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    textLight: '#A0AEC0',
    border: '#E2E8F0',
    success: '#00A651',
    warning: '#F89728',
    danger: '#E52629',
    lightRed: '#FFF5F5',
    lightGrey: '#F7FAFC',
    lightBeige: '#FFF8F0',
    shadow: 'rgba(0, 0, 0, 0.05)',
    iconBg: '#FFE8D5'
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      padding: '0',
      paddingBottom: '0',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: colors.cardBg,
      borderBottom: `1px solid ${colors.border}`,
      gap: '12px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      color: colors.textPrimary,
      display: 'flex',
      alignItems: 'center',
      borderRadius: '50%',
      transition: 'background-color 0.2s',
      fontSize: '24px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: colors.textPrimary,
      margin: 0,
      letterSpacing: '-0.3px'
    },
    progressText: {
      textAlign: 'center',
      padding: '12px 16px',
      backgroundColor: colors.lightGrey,
      borderBottom: `1px solid ${colors.border}`,
      color: colors.textSecondary,
      fontSize: '14px',
      fontWeight: '500',
      letterSpacing: '-0.1px'
    },
    primaryButton: {
      width: '100%',
      padding: '16px',
      fontSize: '17px',
      fontWeight: '600',
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: 'none',
      letterSpacing: '-0.3px'
    },
    secondaryButton: {
      width: '100%',
      padding: '16px',
      fontSize: '17px',
      fontWeight: '600',
      backgroundColor: colors.cardBg,
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: 'none',
      letterSpacing: '-0.3px'
    },
    card: {
      backgroundColor: colors.cardBg,
      border: 'none',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '12px',
      boxShadow: 'none'
    },
    voiceButton: {
      width: '100%',
      padding: '16px',
      backgroundColor: colors.lightGrey,
      border: `2px solid ${colors.border}`,
      borderRadius: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontSize: '15px',
      fontWeight: '600',
      color: colors.textSecondary,
      transition: 'all 0.2s ease',
      letterSpacing: '-0.2px'
    }
  };
  
  const handleWithdrawalLookup = async (withdrawalId) => {
    scanningRef.current = false;
    
    try {
        console.log("Raw QR data:", withdrawalId);
        
        let sessionId = withdrawalId;
        
        try {
          const parsedData = JSON.parse(withdrawalId);
          console.log("Parsed QR data:", parsedData);
          
          if (parsedData.sessionId) {
            sessionId = parsedData.sessionId;
          }
        } catch (e) {
          console.log("QR data is not JSON, using as-is");
        }
        
        console.log("Looking up session ID:", sessionId);
        
        const ref = doc(db, "emergencyWithdrawals", sessionId);
        const snap = await getDoc(ref);

        console.log("Document exists?", snap.exists());

        if (!snap.exists()) {
          speak("Invalid QR code. Please try again.");
          alert("Invalid QR code");
          scanningRef.current = true;
          return;
        }

        const data = snap.data();
        console.log("Document data:", data);

        if (data.used === true) {
          speak("This withdrawal has already been used.");
          alert("This withdrawal has already been used");
          scanningRef.current = true;
          return;
        }

        if (new Date(data.expiresAt) < new Date()) {
          speak("This QR code has expired.");
          alert("This QR code has expired");
          scanningRef.current = true;
          return;
        }

        const ownerDoc = await getDoc(doc(db, "users", data.ownerId));
        const ownerName = ownerDoc.exists() ? ownerDoc.data().name : "Unknown";

        const session = {
          sessionId: sessionId,
          amount: data.amount,
          ownerId: data.ownerId,
          ownerName: ownerName,
          expiresAt: new Date(data.expiresAt).getTime()
        };

        setScannedQRData(session);
        setAmount(data.amount.toString());
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setCurrentStep("shared-qr-confirm");

        vibrate([50, 100, 50]);
        speakPrivate(
          `QR code verified. Withdrawal of ${data.amount} dollars from ${ownerName}'s account.`
        );
    } catch (err) {
        console.error("Error in handleWithdrawalLookup:", err);
        speak("Failed to verify QR code. Please try again.");
        alert("Failed to verify QR code: " + err.message);
        scanningRef.current = true;
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      speak('Processing withdrawal. Please wait.');
      
      const result = await processEmergencySharedWithdrawal(scannedQRData.sessionId);
      
      if (!result.success) {
        speak(`Withdrawal failed: ${result.error}`);
        alert(`Withdrawal failed: ${result.error}`);
        vibrate([100, 50, 100]);
        setProcessing(false);
        return;
      }
      
      vibrate([50, 100, 50, 100, 50]);
      speakPrivate(`Withdrawal successful. ${result.amount} dollars dispensed from ${scannedQRData.ownerName}'s account. Please collect your cash.`);
      
      alert(
        `✓ Withdrawal Successful!\n\n` +
        `Amount Withdrawn: $${result.amount.toFixed(2)}\n` +
        `Please collect your cash from the dispenser.`
      );
      
      setScannedQRData(null);
      setAmount('');
      setProcessing(false);
      navigate('/dashboard');
      
      if (onBack) {
        onBack();
      } else {
        setCurrentStep('main');
      }
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      speak(`Error processing withdrawal: ${error.message}`);
      alert(`Error processing withdrawal: ${error.message}`);
      vibrate([100, 50, 100]);
      setProcessing(false);
    }
  };

  const startCameraAndScan = React.useCallback(async () => {
    try {
      setCameraError(null);
      speak('Starting camera. Position QR code in view.');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        scanningRef.current = true;
        setScanning(true);
        
        videoRef.current.onloadedmetadata = () => {
          speak('Camera ready. Scanning for QR code.');
          scanQRCodeLoop();
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      const errorMsg = 'Unable to access camera. Please check permissions.';
      setCameraError(errorMsg);
      speak(errorMsg);
    }
  }, []);

  const scanQRCodeLoop = () => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) {
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && scanningRef.current) {
        vibrate([50]);
        speak('QR code detected. Verifying...');
        handleWithdrawalLookup(code.data);
        return;
      }
    }
    
    if (scanningRef.current) {
      requestAnimationFrame(scanQRCodeLoop);
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  React.useEffect(() => {
    if (currentStep === 'shared-qr-camera') {
      startCameraAndScan();
    }
    
    return () => {
      stopCamera();
    };
  }, [currentStep, startCameraAndScan]);

  // SHARED QR - CHOOSE SCAN METHOD
  if (currentStep === 'shared-qr-method') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              onBack();
              speak('Returned to main menu');
            }} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Shared Access QR Withdrawal</h1>
        </div>

        <div style={styles.progressText}>Step 1: Choose Scan Method</div>

        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Info Banner */}
          <div style={{
            backgroundColor: colors.lightBeige,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              <QrCode size={20} color={colors.warning} />
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.textPrimary,
                letterSpacing: '-0.2px'
              }}>
                Scan QR Code
              </div>
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.textSecondary,
              lineHeight: '1.5',
              letterSpacing: '-0.1px'
            }}>
              Scan a QR code from someone who granted you emergency withdrawal access
            </div>
          </div>

          {/* Scan Method Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <button 
              onClick={() => { 
                setQrScanMethod('camera'); 
                setCurrentStep('shared-qr-camera'); 
                speak('Camera scan selected. Position QR code in camera view'); 
                vibrate([50]);
              }}
              style={{
                backgroundColor: colors.cardBg,
                border: `2px solid ${colors.primary}`,
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightRed;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                backgroundColor: colors.iconBg,
                borderRadius: '50%',
                marginBottom: '12px'
              }}>
                <Camera size={32} color={colors.primary} />
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.textPrimary,
                marginBottom: '6px',
                letterSpacing: '-0.3px'
              }}>
                Scan with Camera
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.textSecondary,
                letterSpacing: '-0.1px'
              }}>
                Use your device camera to scan QR code
              </div>
            </button>

            <button 
              onClick={() => { 
                setQrScanMethod('upload'); 
                setCurrentStep('shared-qr-upload'); 
                speak('Upload selected. Choose QR code image from device'); 
                vibrate([50]);
              }}
              style={{
                backgroundColor: colors.cardBg,
                border: `2px solid ${colors.secondary}`,
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightGrey;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                backgroundColor: colors.lightGrey,
                borderRadius: '50%',
                marginBottom: '12px'
              }}>
                <Upload size={32} color={colors.secondary} />
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.textPrimary,
                marginBottom: '6px',
                letterSpacing: '-0.3px'
              }}>
                Upload from Device
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.textSecondary,
                letterSpacing: '-0.1px'
              }}>
                Select a saved QR code image
              </div>
            </button>
          </div>

          {/* Voice Guide Button */}
          <button 
            onClick={() => speak('Shared Access QR Withdrawal. Choose scan method. Option 1: Scan with camera to use your device camera. Option 2: Upload from device to select a saved QR code image.')}
            style={styles.voiceButton}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.lightGrey;
            }}
          >
            <Volume2 size={20} />
            Play Voice Guide
          </button>
        </div>
      </div>
    );
  }

  // SHARED QR - CAMERA SCAN
  if (currentStep === 'shared-qr-camera') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => { 
              stopCamera();
              setCurrentStep('shared-qr-method');
              speak('Camera scan cancelled. Returned to scan method selection.');
            }} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Scan QR Code</h1>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Camera View */}
          <div style={{ 
            width: '100%', 
            height: '400px', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            marginBottom: '20px', 
            border: `3px solid ${colors.border}`,
            position: 'relative',
            backgroundColor: '#000'
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            {/* Scanning Frame */}
            {scanning && !cameraError && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '250px',
                height: '250px',
                border: `3px solid ${colors.success}`,
                borderRadius: '16px',
                boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-3px',
                  left: '-3px',
                  right: '-3px',
                  height: '4px',
                  backgroundColor: colors.success,
                  animation: 'scan 2s linear infinite'
                }}></div>
              </div>
            )}
            
            <style>{`
              @keyframes scan {
                0% { top: -3px; }
                50% { top: calc(100% - 1px); }
                100% { top: -3px; }
              }
            `}</style>
            
            {/* Camera Error */}
            {cameraError && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                textAlign: 'center',
                padding: '24px',
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderRadius: '12px',
                maxWidth: '80%'
              }}>
                <Camera size={48} color="white" style={{ marginBottom: '12px' }} />
                <div style={{ fontSize: '15px', lineHeight: '1.5' }}>{cameraError}</div>
              </div>
            )}
          </div>

          {/* Tip Card */}
          <div style={{
            backgroundColor: colors.lightBeige,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.warning}`,
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: colors.textPrimary,
              lineHeight: '1.5',
              letterSpacing: '-0.1px'
            }}>
              <AlertTriangle size={16} color={colors.warning} />
              <div>
                <strong>Tip:</strong> Hold your phone steady and ensure the QR code is well-lit and in focus
              </div>
            </div>
          </div>

          {/* Voice Guide */}
          <button 
            onClick={() => speak('Camera scanning active. Position the QR code within the green scanning frame. Hold your phone steady and ensure the QR code is well-lit and in focus.')}
            style={styles.voiceButton}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.lightGrey;
            }}
          >
            <Volume2 size={20} />
            Play Scanning Tips
          </button>
        </div>
      </div>
    );
  }

  // SHARED QR - UPLOAD
  if (currentStep === 'shared-qr-upload') {
    const handleFileUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        speak('Processing QR code image...');
        
        const image = new Image();
        const reader = new FileReader();

        reader.onload = (event) => {
          image.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
              vibrate([50]);
              speak('QR code detected. Verifying...');
              handleWithdrawalLookup(code.data);
            } else {
              speak("Could not detect QR code in the image. Please make sure the image is clear.");
              alert("Could not detect QR code in the image. Please make sure the image is clear and contains a valid QR code.");
            }
          };
          image.src = event.target.result;
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error(error);
        speak("Failed to read QR code from image.");
        alert("Failed to read QR code from image.");
      }
    };

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              setCurrentStep('shared-qr-method');
              speak('Returned to scan method selection');
            }} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Upload QR Code</h1>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Header Info */}
          <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: colors.iconBg,
              borderRadius: '50%',
              marginBottom: '20px'
            }}>
              <Upload size={56} color={colors.primary} />
            </div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '12px',
              letterSpacing: '-0.3px'
            }}>
              Select QR Code Image
            </h2>
            <p style={{
              fontSize: '15px',
              color: colors.textSecondary,
              lineHeight: '1.6',
              letterSpacing: '-0.1px'
            }}>
              Choose a QR code image saved on your device
            </p>
          </div>

          {/* Upload Area */}
          <label
            htmlFor="qr-upload"
            style={{
              display: 'block',
              width: '100%',
              padding: '48px 24px',
              backgroundColor: colors.cardBg,
              border: `3px dashed ${colors.primary}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'center',
              marginBottom: '20px',
              transition: 'all 0.2s',
              boxSizing: 'border-box'
            }}
            onMouseOver={(e) => { 
              e.currentTarget.style.backgroundColor = colors.lightRed;
              e.currentTarget.style.borderColor = colors.primaryDark;
            }}
            onMouseOut={(e) => { 
              e.currentTarget.style.backgroundColor = colors.cardBg;
              e.currentTarget.style.borderColor = colors.primary;
            }}
          >
            <div style={{
              display: 'inline-flex',
              padding: '20px',
              backgroundColor: colors.lightRed,
              borderRadius: '50%',
              marginBottom: '16px'
            }}>
              <Upload size={40} color={colors.primary} />
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.primary,
              marginBottom: '8px',
              letterSpacing: '-0.3px'
            }}>
              Click to Upload
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.textSecondary,
              letterSpacing: '-0.1px'
            }}>
              PNG, JPG, or JPEG format
            </div>
            <input
              id="qr-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          {/* Tip Card */}
          <div style={{
            backgroundColor: colors.lightBeige,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.warning}`,
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: colors.textPrimary,
              lineHeight: '1.5',
              letterSpacing: '-0.1px'
            }}>
              <AlertTriangle size={16} color={colors.warning} />
              <div>
                <strong>Tip:</strong> Make sure the QR code image is clear and not blurry for best results
              </div>
            </div>
          </div>

          {/* Voice Guide */}
          <button 
            onClick={() => speak('Upload QR code from device. Click the upload area to select a QR code image in PNG, JPG, or JPEG format. Make sure the image is clear and not blurry.')}
            style={styles.voiceButton}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.lightGrey;
            }}
          >
            <Volume2 size={20} />
            Play Voice Guide
          </button>
        </div>
      </div>
    );
  }

  // SHARED QR - CONFIRM WITHDRAWAL
  if (currentStep === 'shared-qr-confirm') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => { 
              if (!processing) {
                setCurrentStep('shared-qr-method'); 
                setScannedQRData(null);
                speak('Withdrawal cancelled. Returned to scan method selection.');
              }
            }} 
            style={{
              ...styles.backButton,
              opacity: processing ? 0.5 : 1,
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
            disabled={processing}
            onMouseOver={(e) => !processing && (e.currentTarget.style.backgroundColor = colors.lightGrey)}
            onMouseOut={(e) => !processing && (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Confirm Withdrawal</h1>
        </div>

        <div style={styles.progressText}>Step 2: Final Confirmation</div>
        
        <div style={{ padding: '16px' }}>
          {/* Success Icon */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: '#E8F5E9',
              borderRadius: '50%',
              marginBottom: '16px',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <CheckCircle size={64} color={colors.success} />
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.3px'
            }}>
              QR Code Verified!
            </h2>
          </div>

          <style>{`
            @keyframes pulse { 
              0%, 100% { transform: scale(1); opacity: 1; } 
              50% { transform: scale(1.05); opacity: 0.9; } 
            }
          `}</style>

          {/* Amount Display Card */}
          <div style={{
            ...styles.card,
            textAlign: 'center',
            padding: '32px 24px',
            marginBottom: '20px',
            backgroundColor: colors.primary,
            color: 'white'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              marginBottom: '12px',
              opacity: 0.9
            }}>
              WITHDRAWAL AMOUNT
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              marginBottom: '16px',
              letterSpacing: '-1px'
            }}>
              ${scannedQRData?.amount}
            </div>
            <div style={{
              fontSize: '14px',
              marginBottom: '6px',
              opacity: 0.9,
              fontWeight: '500'
            }}>
              From
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              letterSpacing: '-0.3px'
            }}>
              {scannedQRData?.ownerName}'s Account
            </div>
          </div>

          {/* Session Details Card */}
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: '500'
              }}>
                Session ID:
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'monospace',
                color: colors.textPrimary
              }}>
                {scannedQRData?.sessionId.substring(0, 8)}...
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: '500'
              }}>
                Expires At:
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.textPrimary
              }}>
                {new Date(scannedQRData?.expiresAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Warning Banner */}
          <div style={{
            backgroundColor: colors.lightBeige,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.warning}`,
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '14px',
              color: colors.textPrimary,
              lineHeight: '1.5',
              letterSpacing: '-0.1px'
            }}>
              <AlertTriangle size={20} color={colors.warning} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                This will withdraw <strong>${scannedQRData?.amount}</strong> from <strong>{scannedQRData?.ownerName}'s</strong> account. Only confirm if you have their permission.
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <button 
              onClick={() => {
                handleConfirmWithdrawal();
                vibrate([50]);
              }}
              disabled={processing}
              style={{
                ...styles.primaryButton,
                backgroundColor: processing ? '#9e9e9e' : colors.success,
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.7 : 1
              }}
              onMouseOver={(e) => { 
                if (!processing) {
                  e.currentTarget.style.backgroundColor = '#00842A';
                }
              }}
              onMouseOut={(e) => { 
                if (!processing) {
                  e.currentTarget.style.backgroundColor = colors.success;
                }
              }}
            >
              {processing ? 'Processing...' : 'Confirm Withdrawal'}
            </button>

            <button 
              onClick={() => { 
                if (!processing) {
                  setCurrentStep('shared-qr-method'); 
                  setScannedQRData(null);
                  speak('Withdrawal cancelled');
                }
              }}
              disabled={processing}
              style={{
                ...styles.secondaryButton,
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.5 : 1
              }}
              onMouseOver={(e) => {
                if (!processing) {
                  e.currentTarget.style.backgroundColor = colors.lightRed;
                }
              }}
              onMouseOut={(e) => {
                if (!processing) {
                  e.currentTarget.style.backgroundColor = colors.cardBg;
                }
              }}
            >
              Cancel
            </button>
          </div>

          {/* Voice Guide */}
          <button 
            onClick={() => speakPrivate(`Withdrawal confirmation. Amount: ${scannedQRData?.amount} dollars from ${scannedQRData?.ownerName}'s account. Expires at ${new Date(scannedQRData?.expiresAt).toLocaleTimeString()}. Only confirm if you have their permission.`)}
            style={styles.voiceButton}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.lightGrey;
            }}
          >
            <Volume2 size={20} />
            Read Details (Private Audio)
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SharedQRScreens;