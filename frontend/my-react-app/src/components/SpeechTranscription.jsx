import { useState, useRef, useEffect } from 'react';
import { submitReferral } from '../backend/function';
import jsPDF from 'jspdf';
import './SpeechTranscription.css';

const SPEECH_API_URL = '/api/transcribe';
const CHUNK_INTERVAL = 10000; // Send audio chunks every 10 seconds
const SPECIALIST_DATA_URL = '/ahpra_pseudo_data.json';

// Map spoken terms to specialty names in the JSON
// IMPORTANT: Order matters - more specific/longer phrases should come first
const SPECIALTY_MAPPING = {
  // Orthopaedic surgery - must come before generic "surgeon" and "surgery"
  'orthopaedic surgeon': 'Orthopaedic surgery',
  'orthopedic surgeon': 'Orthopaedic surgery',
  'orthopaedic': 'Orthopaedic surgery',
  'orthopedic': 'Orthopaedic surgery',
  'orthopaedics': 'Orthopaedic surgery',
  'orthopedics': 'Orthopaedic surgery',
  
  // Dentistry - must come before "emergency" to avoid false matches
  'paediatric dentistry': 'Paediatric dentistry',
  'pediatric dentistry': 'Paediatric dentistry',
  'general dentistry': 'General dentistry',
  'dentist': 'General dentistry',
  'dentistry': 'General dentistry',
  'dental': 'General dentistry',
  
  // Emergency medicine - only match when explicitly about emergency medicine
  // Note: 'emergency' alone is too generic and removed to avoid false matches
  'emergency medicine': 'Emergency medicine',
  'emergency room': 'Emergency medicine',
  'emergency department': 'Emergency medicine',
  'er doctor': 'Emergency medicine',
  'er physician': 'Emergency medicine',
  
  // Obstetrics and gynaecology - must come before generic terms
  'obstetrics and gynaecology': 'Obstetrics and gynaecology',
  'obstetrics and gynecology': 'Obstetrics and gynaecology',
  'obstetrician': 'Obstetrics and gynaecology',
  'gynaecologist': 'Obstetrics and gynaecology',
  'gynecologist': 'Obstetrics and gynaecology',
  'obstetrics': 'Obstetrics and gynaecology',
  'gynaecology': 'Obstetrics and gynaecology',
  'gynecology': 'Obstetrics and gynaecology',
  
  // General practice - must come before generic "gp"
  'general practice': 'General practice',
  'family doctor': 'General practice',
  'family physician': 'General practice',
  'gp': 'General practice',
  
  // Other specialties
  'cardiologist': 'Cardiology',
  'cardiology': 'Cardiology',
  'heart': 'Cardiology',
  'cardiac': 'Cardiology',
  'psychiatrist': 'Psychiatry',
  'psychiatry': 'Psychiatry',
  'psychologist': 'Psychiatry',
  'psychology': 'Psychiatry',
  'mental health': 'Psychiatry',
  'paediatrician': 'Paediatrics',
  'paediatrics': 'Paediatrics',
  'pediatrician': 'Paediatrics',
  'pediatrics': 'Paediatrics',
  'children': 'Paediatrics',
  'child': 'Paediatrics',
  'surgeon': 'Surgery',
  'surgery': 'Surgery',
  'surgical': 'Surgery',
  'dermatologist': 'Dermatology',
  'dermatology': 'Dermatology',
  'skin': 'Dermatology',
  'oncologist': 'Oncology',
  'oncology': 'Oncology',
  'cancer': 'Oncology',
  'ophthalmologist': 'Ophthalmology',
  'ophthalmology': 'Ophthalmology',
  'eye': 'Ophthalmology',
  'optometrist': 'Ophthalmology',
  'anaesthetist': 'Anaesthetics',
  'anesthetist': 'Anaesthetics',
  'anaesthetics': 'Anaesthetics',
  'anesthetics': 'Anaesthetics',
  'radiologist': 'Radiology',
  'radiology': 'Radiology',
  'x-ray': 'Radiology',
  'xray': 'Radiology',
};

function SpeechTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [transcriptions, setTranscriptions] = useState([]);
  const [error, setError] = useState('');
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [matchedSpecialists, setMatchedSpecialists] = useState([]);
  const [detectedSpecialty, setDetectedSpecialty] = useState('');
  const [specialistData, setSpecialistData] = useState([]);
  const [transcriptionSpecialties, setTranscriptionSpecialties] = useState({}); // Map transcription index to specialty info
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [referralFormData, setReferralFormData] = useState({
    patientFirstName: '',
    patientLastName: '',
    patientDOB: '',
    reason: '',
    referralDate: new Date().toISOString().split('T')[0], // Default to today
    referByFirstName: '',
    referByLastName: '',
  });
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralMessage, setReferralMessage] = useState({ type: '', text: '' });
  const [practitionerName, setPractitionerName] = useState({
    firstName: '',
    lastName: '',
  });
  const [detectedPatientName, setDetectedPatientName] = useState({
    firstName: '',
    lastName: '',
  });
  const [currentTranscriptionIndex, setCurrentTranscriptionIndex] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const chunkIntervalRef = useRef(null);

  // Load specialist data on component mount
  useEffect(() => {
    fetch(SPECIALIST_DATA_URL)
      .then(res => res.json())
      .then(data => {
        setSpecialistData(data);
      })
      .catch(err => {
        console.error('Error loading specialist data:', err);
      });
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const sendAudioToAPI = async (audioBlob) => {
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        
        try {
          const response = await fetch(`${SPEECH_API_URL}/audio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audio: base64Audio }),
          });

          const result = await response.json();
          
          if (result.success && result.text) {
            setTranscriptions((prev) => {
              const updated = [...prev, result.text];
              const newIndex = updated.length - 1;
              // Check this specific transcription for referral and specialist type
              checkForReferral(result.text, newIndex);
              return updated;
            });
            setError('');
          } else if (result.error) {
            // Only show error if it's not just "could not understand"
            if (result.error !== 'Could not understand the audio') {
              setError(result.error);
            }
          }
        } catch (err) {
          console.error('Error sending audio to API:', err);
          setError('Failed to connect to speech recognition service');
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Error processing audio');
    }
  };

  const sendCurrentChunk = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Request data from current recording
      mediaRecorderRef.current.requestData();
      
      // Wait a moment for data to be available
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Only send if blob is large enough (at least 2KB)
        if (audioBlob.size > 2000) {
          // Send in background
          sendAudioToAPI(audioBlob).catch(err => {
            console.error('Error sending audio chunk:', err);
          });
        }
        
        // Clear chunks but keep recording
        audioChunksRef.current = [];
      }
    }
  };

  const startListening = async () => {
    setError('');
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Send final audio chunk when recording stops
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          if (audioBlob.size > 1000) {
            await sendAudioToAPI(audioBlob);
          }
          
          audioChunksRef.current = [];
        }
      };

      // Start recording continuously
      mediaRecorder.start();
      
      // Send chunks periodically while recording
      chunkIntervalRef.current = setInterval(() => {
        sendCurrentChunk();
      }, CHUNK_INTERVAL);

      setIsListening(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Error accessing microphone: ${err.message}`);
      }
    }
  };

  const stopListening = async () => {
    // Clear the chunk interval
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    // Stop recording (this will trigger onstop and send final chunk)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
  };

  const clearTranscriptions = () => {
    setTranscriptions([]);
    setError('');
    setMatchedSpecialists([]);
    setDetectedSpecialty('');
    setTranscriptionSpecialties({});
    setDetectedPatientName({ firstName: '', lastName: '' });
  };

  // Function to extract patient name from transcription text
  const extractPatientName = (text) => {
    // Common patterns for patient names in medical transcriptions
    const namePatterns = [
      /patient\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/,  // "patient John Smith"
      /patient\s+([A-Z][a-z]+)/,  // "patient John" (first name only)
      /referring\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/,  // "referring John Smith"
      /for\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/,  // "for John Smith"
      /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:is|needs|requires|has)/,  // "John Smith is/needs/requires/has"
      /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+(?:patient|case)/,  // "John Smith patient/case"
    ];

    // Try each pattern
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2]) {
          // Full name found
          return {
            firstName: match[1],
            lastName: match[2],
          };
        } else if (match[1]) {
          // Only first name found
          return {
            firstName: match[1],
            lastName: '',
          };
        }
      }
    }

    // Fallback: Look for capitalized word pairs that might be names
    // This is less reliable but can catch names in various contexts
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i].replace(/[^A-Za-z]/g, '');
      const word2 = words[i + 1].replace(/[^A-Za-z]/g, '');
      
      // Check if both words start with capital letters and are reasonable name lengths
      if (
        word1.length >= 2 && word1.length <= 15 &&
        word2.length >= 2 && word2.length <= 15 &&
        /^[A-Z][a-z]+$/.test(word1) &&
        /^[A-Z][a-z]+$/.test(word2) &&
        !['The', 'This', 'That', 'There', 'These', 'Those', 'Patient', 'Doctor', 'Dr', 'Mr', 'Mrs', 'Ms', 'Miss'].includes(word1)
      ) {
        // Check if the next word after the potential name is not a common verb/article
        const nextWord = i + 2 < words.length ? words[i + 2].toLowerCase() : '';
        if (!['is', 'are', 'was', 'were', 'has', 'have', 'the', 'a', 'an'].includes(nextWord)) {
          return {
            firstName: word1,
            lastName: word2,
          };
        }
      }
    }

    return null;
  };

  // Function to extract referral reason from transcription text
  const extractReferralReason = (text) => {
    // Look for common patterns indicating a reason
    const reasonPatterns = [
      /(?:for|regarding|about)\s+(.+)$/i,          // "for chest pain", "regarding depression"
      /because of\s+(.+)$/i,                     // "because of ongoing back pain"
      /because\s+(.+)$/i,                        // "because they have diabetes"
      /due to\s+(.+)$/i,                         // "due to recurrent falls"
    ];

    for (const pattern of reasonPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let reason = match[1].trim();
        // Strip trailing polite phrases that aren't part of the reason
        reason = reason.replace(/\b(thank you|thanks|please review|please assess).*$/i, '').trim();
        // Limit length to avoid huge blobs
        if (reason.length > 0) {
          return reason.length > 400 ? reason.slice(0, 400) + '…' : reason;
        }
      }
    }

    return null;
  };

  const checkForReferral = (transcriptionText, transcriptionIndex) => {
    const lowerText = transcriptionText.toLowerCase();
    
    // Check if "referral" appears in the text
    if (!lowerText.includes('referral') && !lowerText.includes('refer')) {
      return null;
    }
    
    // Try to extract patient name and reason from the transcription
    const extractedName = extractPatientName(transcriptionText);
    if (extractedName) {
      setDetectedPatientName(extractedName);
    }
    const extractedReason = extractReferralReason(transcriptionText);
    
    // Try to find a specialist type mentioned in the text
    // Sort keywords by length (longest first) to match more specific terms first
    const sortedKeywords = Object.keys(SPECIALTY_MAPPING).sort((a, b) => b.length - a.length);
    
    let foundSpecialty = null;
    for (const keyword of sortedKeywords) {
      // Use word boundary matching for better accuracy
      // For multi-word phrases, check if the phrase exists
      // For single words, use word boundaries to avoid partial matches
      if (keyword.includes(' ')) {
        // Multi-word phrase - check if it exists in the text
        if (lowerText.includes(keyword)) {
          foundSpecialty = SPECIALTY_MAPPING[keyword];
          break;
        }
      } else {
        // Single word - use word boundary regex to avoid partial matches
        // This prevents "emergency" from matching inside "emergency" or other words
        const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordBoundaryRegex.test(lowerText)) {
          foundSpecialty = SPECIALTY_MAPPING[keyword];
          break;
        }
      }
    }
    
    // If we found a specialty, find matching specialists
    if (foundSpecialty && specialistData.length > 0) {
      const matches = specialistData.filter(practitioner => 
        practitioner.Specialty === foundSpecialty &&
        practitioner['Registration Type'] === 'Specialist'
      );
      
      if (matches.length > 0) {
        // Store specialty info for this transcription, including detected patient name / reason
        setTranscriptionSpecialties(prev => ({
          ...prev,
          [transcriptionIndex]: {
            specialty: foundSpecialty,
            specialists: matches,
            patientName: extractedName || null,
            reason: extractedReason || prev[transcriptionIndex]?.reason || null,
          }
        }));
        return { specialty: foundSpecialty, specialists: matches };
      }
    }
    
    // Even if no specialty found, store the patient name / reason if detected
    if (extractedName || extractedReason) {
      setTranscriptionSpecialties(prev => ({
        ...prev,
        [transcriptionIndex]: {
          ...prev[transcriptionIndex],
          patientName: extractedName || prev[transcriptionIndex]?.patientName || null,
          reason: extractedReason || prev[transcriptionIndex]?.reason || null,
        }
      }));
    }
    
    return null;
  };

  const openSpecialistModal = (transcriptionIndex) => {
    const specialtyInfo = transcriptionSpecialties[transcriptionIndex];
    if (specialtyInfo) {
      setDetectedSpecialty(specialtyInfo.specialty);
      setMatchedSpecialists(specialtyInfo.specialists);
      // Store the transcription index so we can use it when opening referral form
      setShowSpecialistModal(true);
      setShowReferralForm(false);
      setSelectedSpecialist(null);
      setReferralMessage({ type: '', text: '' });
      // Store the current transcription index in a ref or state
      setCurrentTranscriptionIndex(transcriptionIndex);
    }
  };

  const closeSpecialistModal = () => {
    setShowSpecialistModal(false);
    setShowReferralForm(false);
    setSelectedSpecialist(null);
    setReferralMessage({ type: '', text: '' });
    setCurrentTranscriptionIndex(null);
    // Reset form
    setReferralFormData({
      patientFirstName: '',
      patientLastName: '',
      patientDOB: '',
      reason: '',
      referralDate: new Date().toISOString().split('T')[0],
      referByFirstName: '',
      referByLastName: '',
    });
  };

  const openReferralForm = (specialist, transcriptionIndex = null) => {
    setSelectedSpecialist(specialist);
    
    // Get patient name / reason from the specific transcription if available
    let patientNameToUse = detectedPatientName;
    let reasonToUse = referralFormData.reason;
    if (transcriptionIndex !== null && transcriptionSpecialties[transcriptionIndex]?.patientName) {
      patientNameToUse = transcriptionSpecialties[transcriptionIndex].patientName;
    }
    if (transcriptionIndex !== null && transcriptionSpecialties[transcriptionIndex]?.reason) {
      reasonToUse = transcriptionSpecialties[transcriptionIndex].reason;
    }
    
    // Pre-fill refer by fields with practitioner name if available
    // Pre-fill patient name fields with detected patient name if available
    setReferralFormData(prev => ({
      ...prev,
      patientFirstName: patientNameToUse?.firstName || prev.patientFirstName || '',
      patientLastName: patientNameToUse?.lastName || prev.patientLastName || '',
      reason: reasonToUse || prev.reason || '',
      referByFirstName: practitionerName.firstName,
      referByLastName: practitionerName.lastName,
    }));
    setShowReferralForm(true);
    setReferralMessage({ type: '', text: '' });
  };

  const handleReferralFormChange = (e) => {
    const { name, value } = e.target;
    setReferralFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateReferralPDF = () => {
    // Validate that required fields are filled
    if (!referralFormData.patientFirstName || !referralFormData.patientLastName ||
        !referralFormData.reason || !referralFormData.referralDate ||
        !referralFormData.referByFirstName || !referralFormData.referByLastName ||
        !selectedSpecialist) {
      setReferralMessage({
        type: 'error',
        text: 'Please fill in all required fields before generating the PDF'
      });
      return;
    }

    // Parse specialist name to get first and last name
    const specialistName = selectedSpecialist['Practitioner Name'];
    const nameParts = specialistName.replace(/^Dr\s+/i, '').trim().split(/\s+/);
    const referToFirstName = nameParts[0] || '';
    const referToLastName = nameParts.slice(1).join(' ') || '';

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = 20;
    const lineHeight = 0.35;
    const defaultSpacing = 3;

    // Helper function to add text with word wrapping
    const addText = (text, fontSize = 12, isBold = false, align = 'left', spacing = defaultSpacing) => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }

      const lines = doc.splitTextToSize(text, maxWidth);
      const xPosition = align === 'center' ? pageWidth / 2 : margin;
      doc.text(lines, xPosition, yPosition, { align });
      yPosition += lines.length * (fontSize * lineHeight) + spacing;

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Header - centered
    addText('REFERRAL LETTER', 18, true, 'center', 8);

    // Date
    const formattedDate = referralFormData.referralDate 
      ? new Date(referralFormData.referralDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : referralFormData.referralDate;
    addText(`Date: ${formattedDate}`, 12, false, 'left', 4);

    // Refer To
    addText(`To: Dr. ${referToFirstName} ${referToLastName}`, 12, true, 'left', 4);

    // Refer By
    addText(`From: Dr. ${referralFormData.referByFirstName} ${referralFormData.referByLastName}`, 12, true, 'left', 4);

    // Patient Information
    const patientDOBFormatted = referralFormData.patientDOB 
      ? new Date(referralFormData.patientDOB).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : '';
    addText(`Patient: ${referralFormData.patientFirstName} ${referralFormData.patientLastName}`, 12, false, 'left', 2);
    if (patientDOBFormatted) {
      addText(`Date of Birth: ${patientDOBFormatted}`, 12, false, 'left', 4);
    }

    // Subject
    addText('Subject: Referral', 12, true, 'left', 4);

    // Salutation
    addText(`Dear Dr. ${referToLastName},`, 12, false, 'left', 4);

    // Body - Reason
    addText('I am writing to refer the following patient for your assessment and management:', 12, false, 'left', 4);

    addText(`Patient: ${referralFormData.patientFirstName} ${referralFormData.patientLastName}`, 12, false, 'left', 2);
    if (patientDOBFormatted) {
      addText(`Date of Birth: ${patientDOBFormatted}`, 12, false, 'left', 4);
    }

    addText('Reason for Referral:', 12, true, 'left', 2);
    addText(referralFormData.reason, 12, false, 'left', 4);

    // Closing
    addText('I would be grateful if you could assess this patient and provide your recommendations. Please do not hesitate to contact me if you require any further information.', 12, false, 'left', 6);

    addText('Yours sincerely,', 12, false, 'left', 6);
    addText(`Dr. ${referralFormData.referByFirstName} ${referralFormData.referByLastName}`, 12, true, 'left', 2);

    // Generate filename
    const fileName = `Referral_${referralFormData.patientFirstName}_${referralFormData.patientLastName}_${referralFormData.referralDate || 'referral'}.pdf`;
    
    // Save the PDF
    doc.save(fileName);
    
    setReferralMessage({
      type: 'success',
      text: 'Referral letter PDF generated successfully!',
    });
  };

  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    setReferralLoading(true);
    setReferralMessage({ type: '', text: '' });

    // Parse specialist name to get first and last name
    const specialistName = selectedSpecialist['Practitioner Name'];
    const nameParts = specialistName.replace(/^Dr\s+/i, '').trim().split(/\s+/);
    const referToFirstName = nameParts[0] || '';
    const referToLastName = nameParts.slice(1).join(' ') || '';

    const referralData = {
      ...referralFormData,
      referToFirstName,
      referToLastName,
    };

    const result = await submitReferral(referralData);

    if (result.success) {
      setReferralMessage({
        type: 'success',
        text: result.message || 'Referral submitted successfully!'
      });
      // Reset form after successful submission
      setTimeout(() => {
        closeSpecialistModal();
      }, 2000);
    } else {
      setReferralMessage({
        type: 'error',
        text: result.error || 'Failed to submit referral'
      });
    }

    setReferralLoading(false);
  };

  const downloadTranscription = () => {
    const content = transcriptions.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="speech-transcription-container">
      <h2>Speech Transcription</h2>
      
      <div className="practitioner-input-section">
        <h3>Current Practitioner</h3>
        <div className="practitioner-input-group">
          <div className="practitioner-input-field">
            <label htmlFor="practitionerFirstName">First Name</label>
            <input
              type="text"
              id="practitionerFirstName"
              value={practitionerName.firstName}
              onChange={(e) => setPractitionerName(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter your first name"
            />
          </div>
          <div className="practitioner-input-field">
            <label htmlFor="practitionerLastName">Last Name</label>
            <input
              type="text"
              id="practitionerLastName"
              value={practitionerName.lastName}
              onChange={(e) => setPractitionerName(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter your last name"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="controls">
        {!isListening ? (
          <button 
            onClick={startListening} 
            className="start-button"
            disabled={!!error && error.includes('permission')}
          >
            Start Listening
          </button>
        ) : (
          <button 
            onClick={stopListening} 
            className="stop-button"
          >
            Stop Listening
          </button>
        )}
        
        <button 
          onClick={clearTranscriptions} 
          className="clear-button"
          disabled={transcriptions.length === 0}
        >
          Clear
        </button>
        
        <button 
          onClick={downloadTranscription} 
          className="download-button"
          disabled={transcriptions.length === 0}
        >
          Download Transcription
        </button>
      </div>

      {isListening && (
        <div className="listening-indicator">
          <span className="pulse-dot"></span>
          Listening... (Click "Stop Listening" when finished)
        </div>
      )}

      <div className="transcriptions">
        <h3>Transcriptions ({transcriptions.length})</h3>
        {transcriptions.length === 0 ? (
          <p className="empty-state">No transcriptions yet. Click "Start Listening" to begin.</p>
        ) : (
          <div className="transcription-list">
            {transcriptions.map((text, index) => {
              const hasSpecialist = transcriptionSpecialties[index];
              return (
                <div key={index} className="transcription-item">
                  <div className="transcription-content">
                    <span className="transcription-number">{index + 1}.</span>
                    <span className="transcription-text">{text}</span>
                    {transcriptionSpecialties[index]?.patientName && (
                      <span className="detected-name-badge">
                        Patient: {transcriptionSpecialties[index].patientName.firstName} {transcriptionSpecialties[index].patientName.lastName}
                      </span>
                    )}
                    {transcriptionSpecialties[index]?.reason && (
                      <span className="detected-reason-badge">
                        Reason: {transcriptionSpecialties[index].reason}
                      </span>
                    )}
                  </div>
                  {hasSpecialist && (
                    <button 
                      onClick={() => openSpecialistModal(index)} 
                      className="specialist-button-small"
                    >
                      Refer to a Specialist
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Specialist Modal */}
      {showSpecialistModal && (
        <div className="modal-overlay" onClick={closeSpecialistModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {showReferralForm 
                  ? `Create Referral - ${selectedSpecialist?.['Practitioner Name']}`
                  : `Available Specialists - ${detectedSpecialty}`
                }
              </h3>
              <button className="modal-close" onClick={closeSpecialistModal}>×</button>
            </div>
            <div className="modal-body">
              {!showReferralForm ? (
                <>
                  <p className="modal-info">
                    Found {matchedSpecialists.length} specialist{matchedSpecialists.length !== 1 ? 's' : ''} in {detectedSpecialty}
                  </p>
                  <div className="specialist-list">
                    {matchedSpecialists.map((specialist, index) => (
                      <div key={index} className="specialist-item">
                        <div className="specialist-info">
                          <div className="specialist-name">{specialist['Practitioner Name']}</div>
                          <div className="specialist-details">
                            <span className="specialist-specialty">{specialist.Specialty}</span>
                            <span className="specialist-location">{specialist.Location}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => openReferralForm(specialist, currentTranscriptionIndex)}
                          className="create-referral-button"
                        >
                          Create Referral
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <form onSubmit={handleReferralSubmit} className="referral-form-modal">
                  {referralMessage.text && (
                    <div className={`referral-message ${referralMessage.type}`}>
                      {referralMessage.text}
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label htmlFor="patientFirstName">Patient First Name *</label>
                    <input
                      type="text"
                      id="patientFirstName"
                      name="patientFirstName"
                      value={referralFormData.patientFirstName}
                      onChange={handleReferralFormChange}
                      required
                      placeholder="Enter patient first name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="patientLastName">Patient Last Name *</label>
                    <input
                      type="text"
                      id="patientLastName"
                      name="patientLastName"
                      value={referralFormData.patientLastName}
                      onChange={handleReferralFormChange}
                      required
                      placeholder="Enter patient last name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reason">Reason for Referral *</label>
                    <textarea
                      id="reason"
                      name="reason"
                      value={referralFormData.reason}
                      onChange={handleReferralFormChange}
                      required
                      placeholder="Enter reason for referral"
                      rows="4"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="referralDate">Referral Date *</label>
                    <input
                      type="date"
                      id="referralDate"
                      name="referralDate"
                      value={referralFormData.referralDate}
                      onChange={handleReferralFormChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="referByFirstName">Refer By - First Name *</label>
                    <input
                      type="text"
                      id="referByFirstName"
                      name="referByFirstName"
                      value={referralFormData.referByFirstName}
                      onChange={handleReferralFormChange}
                      required
                      placeholder="Your first name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="referByLastName">Refer By - Last Name *</label>
                    <input
                      type="text"
                      id="referByLastName"
                      name="referByLastName"
                      value={referralFormData.referByLastName}
                      onChange={handleReferralFormChange}
                      required
                      placeholder="Your last name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Refer To</label>
                    <input
                      type="text"
                      value={selectedSpecialist?.['Practitioner Name'] || ''}
                      disabled
                      className="disabled-input"
                    />
                  </div>

                  <div className="modal-form-actions">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowReferralForm(false);
                        setReferralMessage({ type: '', text: '' });
                      }}
                      className="back-button"
                      disabled={referralLoading}
                    >
                      Back to Specialists
                    </button>
                    <button 
                      type="button" 
                      onClick={generateReferralPDF}
                      className="generate-pdf-button"
                      disabled={referralLoading}
                    >
                      Generate PDF Letter
                    </button>
                    <button 
                      type="submit" 
                      className="submit-referral-button"
                      disabled={referralLoading}
                    >
                      {referralLoading ? 'Submitting...' : 'Submit Referral'}
                    </button>
                  </div>
                </form>
              )}
            </div>
            {!showReferralForm && (
              <div className="modal-footer">
                <button onClick={closeSpecialistModal} className="modal-close-button">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpeechTranscription;
