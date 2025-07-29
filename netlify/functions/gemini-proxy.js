// netlify/functions/gemini-proxy.js

// If your Node.js environment (e.g., Netlify's default) is older than Node.js 18,
// you might need to explicitly install and require 'node-fetch':
// npm install node-fetch@2
// const fetch = require('node-fetch'); // Uncomment this line if needed

exports.handler = async function(event, context) {
    // Ensure this function only handles POST requests for API calls
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // IMPORTANT: Get the API key from Netlify Environment Variables.
    // You MUST set a variable named GEMINI_API_KEY in your Netlify site settings.
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
        console.error("GEMINI_API_KEY environment variable is not set.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Gemini API key is missing.' }),
        };
    }

    try {
        // Parse the request body sent from your frontend (which contains the prompt)
        const requestBody = JSON.parse(event.body);
        const promptContents = requestBody.contents;

        // Construct the payload for the actual Gemini API call
        const payload = { contents: promptContents };

        // The Gemini API endpoint
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

        let response;
        let delay = 1000; // Initial delay for retry
        const maxRetries = 5; // Max retry attempts

        // Implement a retry mechanism for transient errors (e.g., rate limits, server errors)
        for (let i = 0; i < maxRetries; i++) {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // If the response is OK, or a client error (not 429/5xx), break and don't retry
            if (response.status !== 429 && response.status < 500) {
                break;
            }

            // If it's a 429 (Too Many Requests) or a 5xx (Server Error), wait and retry
            console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }

        // If after retries, the response is still not OK, return an error to the frontend
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API request failed after retries:', response.status, errorData);
            return {
                statusCode: response.status, // Pass through the original status code
                body: JSON.stringify({ error: `AI API request failed: ${response.statusText}`, details: errorData }),
            };
        }

        // Parse the successful response from Gemini
        const result = await response.json();

        // Extract the generated text from the Gemini response structure
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                body: JSON.stringify({ text: text }), // Send back just the text to your frontend
            };
        } else {
            // Handle cases where the Gemini response structure is unexpected
            console.error("Unexpected Gemini API response structure:", result);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "The AI failed to generate a valid response or had an unexpected structure." }),
            };
        }

    } catch (error) {
        // Catch any other unexpected errors during the function execution
        console.error('Serverless function execution error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error processing AI request.' }),
        };
    }
};
