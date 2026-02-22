import cv2
import mediapipe as mp
import numpy as np
import base64
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import time
from collections import deque

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize MediaPipe
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Global Variables
cap = None
is_tracking = False
tracking_thread = None
last_blink_time = 0

# Blink state tracking
eye_was_open = True
blink_started = False
frames_eye_closed = 0

# --- BLINK SETTINGS ---
EYE_CLOSED_THRESHOLD = 0.020   # Below this = eye closed
EYE_OPEN_THRESHOLD = 0.025      # Above this = eye open
MIN_CLOSED_FRAMES = 2           # Must be closed for at least 2 frames
BLINK_COOLDOWN = 1.0            # Seconds between clicks
# ----------------------

# --- EYE DETECTION SETTINGS ---
EYE_OPEN_MIN_THRESHOLD = 0.012  # Minimum eye openness to consider eyes "visible" (lowered for less sensitivity)
CONSECUTIVE_CLOSED_FRAMES = 10   # Frames eyes must be closed to stop cursor (increased grace period)
# ------------------------------

# --- SMOOTHING SETTINGS ---
SMOOTHING_BUFFER_SIZE = 8
EMA_ALPHA = 0.3
DEADZONE_THRESHOLD = 0.02
# --------------------------

# Smoothing buffers
gaze_x_buffer = deque(maxlen=SMOOTHING_BUFFER_SIZE)
gaze_y_buffer = deque(maxlen=SMOOTHING_BUFFER_SIZE)
last_smooth_x = 0.5
last_smooth_y = 0.5

# Eye visibility tracking
eyes_closed_count = 0


def get_eye_openness(landmarks, eye_indices):
    """Calculate how open an eye is based on vertical distance between lids"""
    top = landmarks[eye_indices[0]]
    bottom = landmarks[eye_indices[1]]
    dist = np.linalg.norm(np.array([top.x, top.y]) - np.array([bottom.x, bottom.y]))
    return dist


def check_eyes_visible(landmarks, left_lids, right_lids):
    """
    Check if both eyes are open/visible enough for tracking.
    Returns True if eyes are open, False if closed/covered.
    """
    left_openness = get_eye_openness(landmarks, left_lids)
    right_openness = get_eye_openness(landmarks, right_lids)
    avg_openness = (left_openness + right_openness) / 2
    
    # Eyes are considered visible if openness is above threshold
    return avg_openness > EYE_OPEN_MIN_THRESHOLD, avg_openness


def get_iris_visibility(landmarks, left_iris_idx, right_iris_idx, left_lids, right_lids):
    """
    Check if irises are visible by checking eye openness only.
    Simplified version - just checks if eyes are open enough.
    """
    # Get eye openness
    left_openness = get_eye_openness(landmarks, left_lids)
    right_openness = get_eye_openness(landmarks, right_lids)
    avg_openness = (left_openness + right_openness) / 2
    
    # Just check if eyes are open enough
    return avg_openness > EYE_OPEN_MIN_THRESHOLD


def get_gaze_ratio(landmarks, iris_center_idx, left_corner_idx, right_corner_idx):
    iris = landmarks[iris_center_idx]
    left_corner = landmarks[left_corner_idx]
    right_corner = landmarks[right_corner_idx]
    
    eye_width = right_corner.x - left_corner.x
    
    if abs(eye_width) < 0.001:
        return 0.5
    
    iris_position = (iris.x - left_corner.x) / eye_width
    return iris_position


def smooth_gaze(raw_x, raw_y):
    global last_smooth_x, last_smooth_y
    
    gaze_x_buffer.append(raw_x)
    gaze_y_buffer.append(raw_y)
    
    avg_x = np.mean(gaze_x_buffer)
    avg_y = np.mean(gaze_y_buffer)
    
    smooth_x = EMA_ALPHA * avg_x + (1 - EMA_ALPHA) * last_smooth_x
    smooth_y = EMA_ALPHA * avg_y + (1 - EMA_ALPHA) * last_smooth_y
    
    if abs(smooth_x - last_smooth_x) < DEADZONE_THRESHOLD:
        smooth_x = last_smooth_x
    if abs(smooth_y - last_smooth_y) < DEADZONE_THRESHOLD:
        smooth_y = last_smooth_y
    
    last_smooth_x = smooth_x
    last_smooth_y = smooth_y
    
    return smooth_x, smooth_y


def reset_smoothing():
    global last_smooth_x, last_smooth_y, eye_was_open, blink_started, frames_eye_closed, eyes_closed_count
    gaze_x_buffer.clear()
    gaze_y_buffer.clear()
    last_smooth_x = 0.5
    last_smooth_y = 0.5
    eye_was_open = True
    blink_started = False
    frames_eye_closed = 0
    eyes_closed_count = 0


@socketio.on('connect')
def handle_connect():
    print('✅ React Client connected')
    emit('status', {'message': 'Connected to Python Backend'})


@socketio.on('start_tracking')
def start_tracking():
    global is_tracking, tracking_thread, cap
    if is_tracking:
        return

    print('📷 Opening camera...')
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        emit('tracking_error', {'error': 'Camera failed'})
        return

    reset_smoothing()
    
    is_tracking = True
    tracking_thread = threading.Thread(target=tracking_loop)
    tracking_thread.daemon = True
    tracking_thread.start()
    emit('tracking_started', {'status': 'success'})
    print('🚀 Tracking started')


@socketio.on('stop_tracking')
def stop_tracking():
    global is_tracking, cap
    is_tracking = False
    if cap:
        cap.release()
    reset_smoothing()
    print('⏹ Tracking stopped')

@socketio.on('get_status')
def get_status():
    """Return current tracking status to client"""
    global is_tracking
    print(f'📊 Status requested - is_tracking: {is_tracking}')
    emit('tracking_status', {'is_tracking': is_tracking})
    
def tracking_loop():
    global is_tracking, cap, last_blink_time, eyes_closed_count
    global eye_was_open, blink_started, frames_eye_closed
    
    # Landmark Indices
    LEFT_IRIS = 473
    LEFT_OUTER = 33
    LEFT_INNER = 133
    LEFT_LIDS = [159, 145]  # top, bottom

    RIGHT_IRIS = 468
    RIGHT_INNER = 362
    RIGHT_OUTER = 263
    RIGHT_LIDS = [386, 374]  # top, bottom
    
    # Blink thresholds
    EYE_CLOSED_THRESHOLD = 0.022
    EYE_OPEN_THRESHOLD = 0.026

    while is_tracking and cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        # Default: no eyes detected
        eyes_detected = False
        
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark
            
            # 1. CHECK IF EYES ARE VISIBLE (not just face)
            eyes_open, avg_openness = check_eyes_visible(landmarks, LEFT_LIDS, RIGHT_LIDS)
            iris_valid = get_iris_visibility(landmarks, LEFT_IRIS, RIGHT_IRIS, LEFT_LIDS, RIGHT_LIDS)
            
            # Debug output
            print(f"Eye openness: {avg_openness:.4f} | Eyes open: {eyes_open} | Iris valid: {iris_valid}")
            
            if eyes_open and iris_valid:
                eyes_closed_count = 0
                eyes_detected = True
            else:
                eyes_closed_count += 1
                print(f"👁️ Eyes closed/covered - count: {eyes_closed_count}/{CONSECUTIVE_CLOSED_FRAMES}")
                
                # Only stop detecting after consecutive closed frames
                if eyes_closed_count >= CONSECUTIVE_CLOSED_FRAMES:
                    eyes_detected = False
                else:
                    # Give a few frames grace period
                    eyes_detected = True
            
            # 2. VISUAL FEEDBACK - Always draw if face detected
            for face_landmarks in results.multi_face_landmarks:
                mp_drawing.draw_landmarks(
                    image=frame,
                    landmark_list=face_landmarks,
                    connections=mp_face_mesh.FACEMESH_IRISES,
                    landmark_drawing_spec=None,
                    connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_iris_connections_style()
                )
            
            # Draw eye status on frame
            status_color = (0, 255, 0) if eyes_detected else (0, 0, 255)
            status_text = "EYES OPEN" if eyes_detected else "EYES CLOSED"
            cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
            cv2.putText(frame, f"Openness: {avg_openness:.4f}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            if eyes_detected:
                # 3. BLINK DETECTION (for clicking)
                left_val = get_eye_openness(landmarks, LEFT_LIDS)
                right_val = get_eye_openness(landmarks, RIGHT_LIDS)
                avg_blink = (left_val + right_val) / 2
                
                is_blinking = False
                
                # Detect eye closed for blink
                if avg_blink < EYE_CLOSED_THRESHOLD:
                    frames_eye_closed += 1
                    if eye_was_open and frames_eye_closed >= MIN_CLOSED_FRAMES:
                        blink_started = True
                    eye_was_open = False
                
                # Detect eye opened after being closed (complete blink)
                elif avg_blink > EYE_OPEN_THRESHOLD:
                    if blink_started:
                        if time.time() - last_blink_time > BLINK_COOLDOWN:
                            is_blinking = True
                            last_blink_time = time.time()
                            print(f"🎯 BLINK CLICK!")
                    blink_started = False
                    frames_eye_closed = 0
                    eye_was_open = True

                # 4. GAZE DETECTION
                gaze_left = get_gaze_ratio(landmarks, LEFT_IRIS, LEFT_OUTER, LEFT_INNER)
                gaze_right = get_gaze_ratio(landmarks, RIGHT_IRIS, RIGHT_INNER, RIGHT_OUTER)
                raw_gaze_x = (gaze_left + gaze_right) / 2
                raw_iris_y = landmarks[LEFT_IRIS].y

                # 5. CALIBRATION
                screen_x = np.interp(raw_gaze_x, [0.25, 0.75], [1, 0])
                screen_y = np.interp(raw_iris_y, [0.45, 0.63], [0, 1])

                # 6. APPLY SMOOTHING
                smooth_x, smooth_y = smooth_gaze(screen_x, screen_y)
                
                final_x = np.clip(smooth_x, 0, 1)
                final_y = np.clip(smooth_y, 0, 1)

                # 7. ENCODE VIDEO FRAME
                small_frame = cv2.resize(frame, (320, 240))
                _, buffer = cv2.imencode('.jpg', small_frame)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')

                # 8. SEND DATA - Eyes detected
                socketio.emit('gaze_data', {
                    'x': float(final_x),
                    'y': float(final_y),
                    'blink': is_blinking,
                    'face_detected': True,  # Keep as face_detected for compatibility
                    'eyes_detected': True,
                    'image': frame_base64
                })
            else:
                # Eyes closed/covered - send frame but no gaze data
                small_frame = cv2.resize(frame, (320, 240))
                _, buffer = cv2.imencode('.jpg', small_frame)
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                socketio.emit('gaze_data', {
                    'face_detected': False,
                    'eyes_detected': False,
                    'image': frame_base64
                })

        else:
            # No face detected at all
            eyes_closed_count = 0
            small_frame = cv2.resize(frame, (320, 240))
            _, buffer = cv2.imencode('.jpg', small_frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            socketio.emit('gaze_data', {
                'face_detected': False,
                'eyes_detected': False,
                'image': frame_base64
            })

        time.sleep(0.016)

    print("Tracking loop ended")


if __name__ == '__main__':
    print("🚀 Eye Tracker Server Running on port 5001...")
    socketio.run(app, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True)