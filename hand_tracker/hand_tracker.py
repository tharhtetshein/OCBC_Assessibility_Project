import cv2
import mediapipe as mp
import numpy as np
import base64
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)
mp_drawing = mp.solutions.drawing_utils

# Global Variables
cap = None
is_tracking = False
tracking_thread = None

# Gesture states
last_pinch_time = 0
PINCH_COOLDOWN = 1.0
PINCH_THRESHOLD = 0.05  # Distance between thumb and index finger

def get_finger_status(landmarks):
    """Check which fingers are up - adjusted for mirrored view"""
    fingers = []
    
    # Thumb - FIXED for mirrored view (compare x position, reversed)
    # In mirrored view, thumb tip should be > thumb ip for "up"
    if landmarks[4].x > landmarks[3].x:
        fingers.append(1)
    else:
        fingers.append(0)
    
    # Other fingers (compare y position - lower y = higher on screen = finger up)
    finger_tips = [8, 12, 16, 20]  # Index, Middle, Ring, Pinky
    finger_pips = [6, 10, 14, 18]  # Second joint
    
    for tip, pip in zip(finger_tips, finger_pips):
        if landmarks[tip].y < landmarks[pip].y:
            fingers.append(1)
        else:
            fingers.append(0)
    
    return fingers

def detect_pinch(landmarks):
    """Detect pinch gesture (thumb + index finger close together)"""
    thumb_tip = landmarks[4]
    index_tip = landmarks[8]
    
    distance = np.sqrt(
        (thumb_tip.x - index_tip.x) ** 2 + 
        (thumb_tip.y - index_tip.y) ** 2
    )
    
    return distance < PINCH_THRESHOLD, distance

def get_cursor_position(landmarks):
    """Get cursor position from index finger tip"""
    index_tip = landmarks[8]
    return index_tip.x, index_tip.y

@socketio.on('connect')
def handle_connect():
    print('✅ React Client connected to Hand Tracker')
    emit('status', {'message': 'Connected to Hand Tracker Backend'})

@socketio.on('get_status')
def get_status():
    global is_tracking
    emit('tracking_status', {'is_tracking': is_tracking, 'type': 'hand'})

@socketio.on('start_tracking')
def start_tracking():
    global is_tracking, tracking_thread, cap
    if is_tracking:
        return

    print('📷 Opening camera for hand tracking...')
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        emit('tracking_error', {'error': 'Camera failed'})
        return

    is_tracking = True
    tracking_thread = threading.Thread(target=tracking_loop)
    tracking_thread.daemon = True
    tracking_thread.start()
    emit('tracking_started', {'status': 'success', 'type': 'hand'})
    print('🖐️ Hand tracking started')

@socketio.on('stop_tracking')
def stop_tracking():
    global is_tracking, cap
    is_tracking = False
    if cap:
        cap.release()
    print('⏹ Hand tracking stopped')

def tracking_loop():
    global is_tracking, cap, last_pinch_time
    
    while is_tracking and cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Flip frame for mirror effect (same as eye tracker)
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)

        hand_detected = False
        cursor_x, cursor_y = 0.5, 0.5
        is_clicking = False
        gesture = "none"

        if results.multi_hand_landmarks:
            hand_detected = True
            hand_landmarks = results.multi_hand_landmarks[0]
            landmarks = hand_landmarks.landmark
            
            # Draw hand landmarks
            mp_drawing.draw_landmarks(
                frame, 
                hand_landmarks, 
                mp_hands.HAND_CONNECTIONS
            )
            
            # Get cursor position from index finger
            # Since frame is already flipped, use coordinates directly (no inversion needed)
            cursor_x, cursor_y = get_cursor_position(landmarks)
            
            # Detect pinch for clicking
            is_pinching, pinch_distance = detect_pinch(landmarks)
            
            if is_pinching:
                if time.time() - last_pinch_time > PINCH_COOLDOWN:
                    is_clicking = True
                    last_pinch_time = time.time()
                    print(f"👌 PINCH CLICK! (Distance: {pinch_distance:.3f})")
                gesture = "pinch"
            else:
                # Detect other gestures
                fingers = get_finger_status(landmarks)
                if fingers == [0, 1, 0, 0, 0]:
                    gesture = "point"  # Only index finger up
                elif fingers == [1, 1, 1, 1, 1]:
                    gesture = "open"   # All fingers up
                elif fingers == [0, 0, 0, 0, 0]:
                    gesture = "fist"   # Fist
            
            # Draw cursor position on frame
            h, w, _ = frame.shape
            cx, cy = int(cursor_x * w), int(cursor_y * h)
            cv2.circle(frame, (cx, cy), 15, (0, 255, 0), -1)
            cv2.putText(frame, gesture, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # Encode frame
        small_frame = cv2.resize(frame, (320, 240))
        _, buffer = cv2.imencode('.jpg', small_frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        # Send data to React
        # Since frame is flipped, coordinates are already mirrored
        # Use cursor_x directly (removed the 1 - cursor_x inversion)
        socketio.emit('hand_data', {
            'x': float(cursor_x),
            'y': float(cursor_y),
            'click': is_clicking,
            'hand_detected': hand_detected,
            'gesture': gesture,
            'image': frame_base64
        })

        time.sleep(0.016)  # ~60 FPS

    print("Hand tracking loop ended")

if __name__ == '__main__':
    print("🖐️ Hand Tracker Server Running on port 5002...")
    socketio.run(app, host='0.0.0.0', port=5002, allow_unsafe_werkzeug=True)