import json
import re

# Needs to be improved


# Function to load keywords from the keywords JSON file
def load_keywords():
    with open('keywords.json', 'r') as file:
        data = json.load(file)
    return data["specialties"]

# Function to load the transcript from a text file
def load_transcript():
    with open('transcript.txt', 'r') as file:
        transcript = file.read()
    return transcript

# Function to highlight the keywords in the transcript
def highlight_keywords(transcript, keywords):
    # Go through each keyword and highlight it in the transcript
    for keyword in keywords:
        # Use regex to match the keyword case-insensitively and wrap it with a marker (e.g., **keyword**)
        transcript = re.sub(r'\b' + re.escape(keyword) + r'\b', f'**{keyword}**', transcript, flags=re.IGNORECASE)
    return transcript

# Function to save the highlighted transcript to a new file
def save_highlighted_transcript(highlighted_transcript):
    with open('highlighted_transcript.txt', 'w') as file:
        file.write(highlighted_transcript)
    print("Highlighted transcript saved to 'highlighted_transcript.txt'")

# Main function to run the process
def main():
    keywords = load_keywords()  # Load the list of specialties
    transcript = load_transcript()  # Load the transcript text
    
    # Highlight the keywords in the transcript
    highlighted_transcript = highlight_keywords(transcript, keywords)
    
    # Save the highlighted transcript
    save_highlighted_transcript(highlighted_transcript)

if __name__ == "__main__":
    main()
