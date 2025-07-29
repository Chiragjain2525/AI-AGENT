// netlify/functions/google-api-handler.js

// This function acts as a proxy to securely call the Google Gemini API
// from your Netlify serverless environment, preventing your API key
// from being exposed on the client-side.

const fetch = require('node-fetch'); // Node.js native fetch or install 'node-fetch' if not available

exports.handler = async function(event, context) {
    // Ensure the request is a POST request
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ error: 'Method Not Allowed. Only POST requests are supported.' }),
        };
    }

    // Get the API key from Netlify environment variables
    // Make sure to set this in your Netlify site settings under "Build & deploy" -> "Environment variables"
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

    if (!GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY environment variable is not set.");
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: 'Server configuration error: API key missing.' }),
        };
    }

    try {
        // Parse the request body to get the prompt sent from your frontend
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ error: 'Missing "prompt" in request body.' }),
            };
        }

        // Define the Gemini API endpoint and payload
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        // Make the request to the Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Check if the Gemini API call was successful
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API error:', errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: errorData.error.message || 'Error from Gemini API' }),
            };
        }

        const result = await response.json();

        // Extract the generated text content
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            return {
                statusCode: 200,
                body: JSON.stringify({ content: text }), // Send the AI response back to the client
            };
        } else {
            console.warn("Gemini API response structure unexpected:", result);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Unexpected response from AI API.' }),
            };
        }

    } catch (error) {
        console.error('Serverless function error:', error);
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ error: 'Internal server error processing your request.' }),
        };
    }
};
