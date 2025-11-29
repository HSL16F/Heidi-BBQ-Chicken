import { useState } from 'react';
import { submitReferral } from '../backend/function';
import jsPDF from 'jspdf';
import './ReferralForm.css';

function ReferralForm() {
  const [formData, setFormData] = useState({
    patientFirstName: '',
    patientLastName: '',
    patientDOB: '',
    reason: '',
    referralDate: '',
    referToFirstName: '',
    referToLastName: '',
    referByFirstName: '',
    referByLastName: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await submitReferral(formData);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || 'Referral submitted successfully!',
        });
        // Reset form
        setFormData({
          patientFirstName: '',
          patientLastName: '',
          patientDOB: '',
          reason: '',
          referralDate: '',
          referToFirstName: '',
          referToLastName: '',
          referByFirstName: '',
          referByLastName: '',
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to submit referral',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    // Validate that required fields are filled
    if (!formData.patientFirstName || !formData.patientLastName || !formData.patientDOB ||
        !formData.reason || !formData.referralDate || 
        !formData.referToFirstName || !formData.referToLastName ||
        !formData.referByFirstName || !formData.referByLastName) {
      setMessage({
        type: 'error',
        text: 'Please fill in all required fields before generating the PDF',
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = 20;

    // Helper function to add text with word wrapping
    const addText = (text, fontSize = 12, isBold = false, align = 'left', spacing = 3) => {
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }
      
      const lines = doc.splitTextToSize(text, maxWidth);
      const xPosition = align === 'center' ? pageWidth / 2 : margin;
      doc.text(lines, xPosition, yPosition, { align });
      yPosition += lines.length * (fontSize * 0.35) + spacing;
      
      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPosition = 20;
      }
    };

    // Header - centered
    addText('REFERRAL LETTER', 18, true, 'center', 8);

    // Date
    const formattedDate = formData.referralDate 
      ? new Date(formData.referralDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : formData.referralDate;
    addText(`Date: ${formattedDate}`, 12, false, 'left', 4);

    // Refer To
    addText(`To: Dr. ${formData.referToFirstName} ${formData.referToLastName}`, 12, true, 'left', 4);

    // Refer By
    addText(`From: Dr. ${formData.referByFirstName} ${formData.referByLastName}`, 12, true, 'left', 4);

    // Patient Information
    const patientDOBFormatted = formData.patientDOB 
      ? new Date(formData.patientDOB).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : formData.patientDOB;
    addText(`Patient: ${formData.patientFirstName} ${formData.patientLastName}`, 12, false, 'left', 2);
    addText(`Date of Birth: ${patientDOBFormatted}`, 12, false, 'left', 4);

    // Subject
    addText('Subject: Referral', 12, true, 'left', 4);

    // Salutation
    addText(`Dear Dr. ${formData.referToLastName},`, 12, false, 'left', 4);

    // Body - Reason
    addText('I am writing to refer the following patient for your assessment and management:', 12, false, 'left', 4);

    addText(`Patient: ${formData.patientFirstName} ${formData.patientLastName}`, 12, false, 'left', 2);
    addText(`Date of Birth: ${patientDOBFormatted}`, 12, false, 'left', 4);

    addText('Reason for Referral:', 12, true, 'left', 2);
    addText(formData.reason, 12, false, 'left', 4);

    // Closing
    addText('I would be grateful if you could assess this patient and provide your recommendations. Please do not hesitate to contact me if you require any further information.', 12, false, 'left', 6);

    addText('Yours sincerely,', 12, false, 'left', 6);
    addText(`Dr. ${formData.referByFirstName} ${formData.referByLastName}`, 12, true, 'left', 2);

    // Generate filename
    const fileName = `Referral_${formData.patientFirstName}_${formData.patientLastName}_${formData.referralDate || 'referral'}.pdf`;
    
    // Save the PDF
    doc.save(fileName);
    
    setMessage({
      type: 'success',
      text: 'Referral letter PDF generated successfully!',
    });
  };

  return (
    <div className="referral-form-container">
      <h2>Referral Form</h2>
      <form onSubmit={handleSubmit} className="referral-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="patientFirstName">Patient First Name *</label>
            <input
              type="text"
              id="patientFirstName"
              name="patientFirstName"
              value={formData.patientFirstName}
              onChange={handleChange}
              required
              placeholder="First name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="patientLastName">Patient Last Name *</label>
            <input
              type="text"
              id="patientLastName"
              name="patientLastName"
              value={formData.patientLastName}
              onChange={handleChange}
              required
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="patientDOB">Patient Date of Birth *</label>
          <input
            type="date"
            id="patientDOB"
            name="patientDOB"
            value={formData.patientDOB}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reason">Reason *</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            required
            placeholder="Enter referral reason"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="referralDate">Referral Date *</label>
          <input
            type="date"
            id="referralDate"
            name="referralDate"
            value={formData.referralDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="referToFirstName">Refer To - First Name *</label>
            <input
              type="text"
              id="referToFirstName"
              name="referToFirstName"
              value={formData.referToFirstName}
              onChange={handleChange}
              required
              placeholder="First name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="referToLastName">Refer To - Last Name *</label>
            <input
              type="text"
              id="referToLastName"
              name="referToLastName"
              value={formData.referToLastName}
              onChange={handleChange}
              required
              placeholder="Last name"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="referByFirstName">Refer By - First Name *</label>
            <input
              type="text"
              id="referByFirstName"
              name="referByFirstName"
              value={formData.referByFirstName}
              onChange={handleChange}
              required
              placeholder="First name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="referByLastName">Refer By - Last Name *</label>
            <input
              type="text"
              id="referByLastName"
              name="referByLastName"
              value={formData.referByLastName}
              onChange={handleChange}
              required
              placeholder="Last name"
            />
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="button-group">
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Submitting...' : 'Submit Referral'}
          </button>
          <button 
            type="button" 
            onClick={generatePDF} 
            className="pdf-button"
            disabled={loading}
          >
            Generate PDF Letter
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReferralForm;

