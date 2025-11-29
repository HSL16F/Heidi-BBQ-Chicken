// Client-side API function for React app
// This function makes HTTP requests to a backend API endpoint

export interface ReferralFormData {
  pid: string;
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
  // Validate required fields
  if (
    !data.pid ||
    !data.reason ||
    !data.referralDate ||
    !data.referToFirstName ||
    !data.referToLastName ||
    !data.referByFirstName ||
    !data.referByLastName
  ) {
    return {
      success: false,
      error: 'All fields are required',
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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

