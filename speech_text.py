import speech_recognition as sr
import threading

USE_NOISE_ADJUSTMENT = True
OUTPUT_FILE = "transcription.txt"

recognizer = sr.Recognizer()
transcriptions = []
stop_flag = threading.Event()

def listen():
    with sr.Microphone() as source:
        if USE_NOISE_ADJUSTMENT:
            recognizer.adjust_for_ambient_noise(source, duration=1)
        print("Listening for speech...")
        try:
            audio = recognizer.listen(source, timeout=None, phrase_time_limit=None)
            return audio
        except sr.WaitTimeoutError:
            return None

def transcribe_audio(audio):
    try:
        text = recognizer.recognize_google(audio)
        return text
    except sr.UnknownValueError:
        return None
    except sr.RequestError:
        return "Error: Could not request results from Google Speech Recognition service."

def start_transcribing():
    global transcriptions
    try:
        while not stop_flag.is_set():
            audio = listen()
            if audio:
                text = transcribe_audio(audio)
                if text:
                    print(f"Transcript: {text}")
                    transcriptions.append(text)
                else:
                    print("Could not understand the audio.")
    except Exception as e:
        print(f"An error occurred: {e}")

def save_to_file():
    print("\nSaving transcription to file...")
    with open(OUTPUT_FILE, 'w') as f:
        f.write("\n".join(transcriptions))
    print(f"Transcription saved to {OUTPUT_FILE}")
    print(f"Total lines transcribed: {len(transcriptions)}")

def main():
    
    print("=== Speech Transcription ===")
    print(f"Transcriptions will be saved to: {OUTPUT_FILE}")
    print("Press Enter at any time to stop and save.\n")
    
    # Start transcription thread
    transcription_thread = threading.Thread(target=start_transcribing)
    transcription_thread.start()
    
    input()
    print("Stopping transcription...")
    stop_flag.set()
    transcription_thread.join(timeout=5)
    
    save_to_file()
    print("Program ended.")

if __name__ == "__main__":
    main()
