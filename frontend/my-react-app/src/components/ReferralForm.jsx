import { useState } from 'react';
import { submitReferral } from '../backend/function';
import './ReferralForm.css';

function ReferralForm() {
  const [formData, setFormData] = useState({
    pid: '',
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
          pid: '',
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

  return (
    <div className="referral-form-container">
      <h2>Referral Form</h2>
      <form onSubmit={handleSubmit} className="referral-form">
        <div className="form-group">
          <label htmlFor="pid">Patient ID *</label>
          <input
            type="text"
            id="pid"
            name="pid"
            value={formData.pid}
            onChange={handleChange}
            required
            placeholder="Enter patient ID"
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

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Submitting...' : 'Submit Referral'}
        </button>
      </form>
    </div>
  );
}

export default ReferralForm;

