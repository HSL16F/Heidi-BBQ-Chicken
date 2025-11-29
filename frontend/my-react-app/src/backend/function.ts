// Client-side API function for React app
// This function makes HTTP requests to a backend API endpoint

export interface ReferralFormData {
  patientFirstName: string;
  patientLastName: string;
  patientDOB: string;
  reason: string;
  referralDate: string;
  referToFirstName: string;
  referToLastName: string;
  referByFirstName: string;
  referByLastName: string;
}

export interface ReferralResponse {
  success: boolean;
  message?: string;
  transactionId?: number;
  error?: string;
}

/**
 * Submits a referral form to the backend API
 * @param data - The referral form data
 * @param apiUrl - Optional API endpoint URL (defaults to /api/referral)
 * @returns Promise with the API response
 */
export async function submitReferral(
  data: ReferralFormData,
  apiUrl: string = '/api/referral'
): Promise<ReferralResponse> {
  // Validate required fields (trim whitespace)
  const trimmedData = {
    patientFirstName: data.patientFirstName?.trim() || '',
    patientLastName: data.patientLastName?.trim() || '',
    patientDOB: data.patientDOB?.trim() || '',
    reason: data.reason?.trim() || '',
    referralDate: data.referralDate?.trim() || '',
    referToFirstName: data.referToFirstName?.trim() || '',
    referToLastName: data.referToLastName?.trim() || '',
    referByFirstName: data.referByFirstName?.trim() || '',
    referByLastName: data.referByLastName?.trim() || '',
  };

  // Check which fields are missing
  const missingFields: string[] = [];
  if (!trimmedData.patientFirstName) missingFields.push('Patient First Name');
  if (!trimmedData.patientLastName) missingFields.push('Patient Last Name');
  // patientDOB is optional for searching; keep it for display/record if provided
  if (!trimmedData.reason) missingFields.push('Reason');
  if (!trimmedData.referralDate) missingFields.push('Referral Date');
  if (!trimmedData.referToFirstName) missingFields.push('Refer To - First Name');
  if (!trimmedData.referToLastName) missingFields.push('Refer To - Last Name');
  if (!trimmedData.referByFirstName) missingFields.push('Refer By - First Name');
  if (!trimmedData.referByLastName) missingFields.push('Refer By - Last Name');

  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  try {
    // Debug: log the data being sent
    console.log('Submitting referral with data:', trimmedData);
    
    // Use trimmed data for the request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trimmedData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP error! status: ${response.status}`,
      };
    }

    return {
      success: true,
      message: result.message,
      transactionId: result.transactionId,
    };
  } catch (error: any) {
    console.error('Error submitting referral:', error);
    return {
      success: false,
      error: `Network error: ${error.message}`,
    };
  }
}

