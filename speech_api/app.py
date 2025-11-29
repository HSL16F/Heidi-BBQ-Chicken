from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import base64
import tempfile
import os
import subprocess

app = Flask(__name__)
CORS(app)

recognizer = sr.Recognizer()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/transcribe/audio', methods=['POST'])
def transcribe_audio():
    """Transcribe audio data sent from the frontend"""
    try:
        data = request.json
        audio_data = data.get('audio')
        
        if not audio_data:
            return jsonify({
                'success': False,
                'error': 'No audio data provided'
            }), 400
        
        # Decode base64 audio data
        try:
            # Handle data URL format: data:audio/webm;base64,<data>
            if ',' in audio_data:
                audio_bytes = base64.b64decode(audio_data.split(',')[1])
            else:
                audio_bytes = base64.b64decode(audio_data)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid audio data format: {str(e)}'
            }), 400
        
        # Validate audio data size
        if len(audio_bytes) < 1000:
            return jsonify({
                'success': False,
                'error': 'Audio data too small. Please record longer audio.'
            }), 400
        
        # Save to temporary WebM file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_file_path = tmp_file.name
        
        wav_file_path = None
        
        try:
            # Convert WebM to WAV using ffmpeg
            wav_file_path = tmp_file_path.replace('.webm', '.wav')
            
            result = subprocess.run([
                'ffmpeg',
                '-i', tmp_file_path,
                '-ar', '16000',  # Sample rate: 16kHz
                '-ac', '1',      # Mono channel
                '-f', 'wav',     # WAV format
                '-y',            # Overwrite output file
                '-loglevel', 'error',  # Only show errors
                wav_file_path
            ], check=True, capture_output=True, text=True, timeout=15)
            
            # Verify output file exists and has content
            if not os.path.exists(wav_file_path) or os.path.getsize(wav_file_path) == 0:
                return jsonify({
                    'success': False,
                    'error': 'Audio conversion failed: Output file is empty'
                }), 500
            
            # Transcribe the audio
            with sr.AudioFile(wav_file_path) as source:
                # Adjust for ambient noise
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                # Record the audio
                audio = recognizer.record(source)
            
            # Recognize speech using Google Speech Recognition
            try:
                text = recognizer.recognize_google(audio)
                
                return jsonify({
                    'success': True,
                    'text': text
                })
                
            except sr.UnknownValueError:
                return jsonify({
                    'success': False,
                    'error': 'Could not understand the audio'
                })
            except sr.RequestError as e:
                return jsonify({
                    'success': False,
                    'error': f'Speech recognition service error: {str(e)}'
                }), 500
                
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr if e.stderr else 'Unknown conversion error'
            # Filter out version info
            error_lines = [line for line in error_msg.split('\n') 
                          if line.strip() 
                          and 'ffmpeg version' not in line 
                          and 'Copyright' not in line]
            error_msg = '\n'.join(error_lines[-3:]) if error_lines else 'Audio conversion failed'
            
            return jsonify({
                'success': False,
                'error': f'Audio conversion failed: {error_msg[:200]}'
            }), 500
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error processing audio: {str(e)}'
            }), 500
            
        finally:
            # Clean up temporary files
            if tmp_file_path and os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
            if wav_file_path and os.path.exists(wav_file_path):
                os.unlink(wav_file_path)
                
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

if __name__ == '__main__':
    print("=== Speech Recognition API ===")
    print("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
