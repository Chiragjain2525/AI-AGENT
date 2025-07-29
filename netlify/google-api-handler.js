// netlify/functions/google-api-handler.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async function(event, context) {
    console.log("Netlify Function: Handler started."); // New log
    console.log("HTTP Method:", event.httpMethod); // New log

    if (event.httpMethod !== 'POST') {
        console.log("Netlify Function: Method not allowed."); // New log
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed', message: 'Only POST requests are allowed.' })
        };
    }

    try {
        console.log("Netlify Function: Parsing request body."); // New log
        if (!event.body) {
            console.error("Netlify Function: Request body is missing."); // New log
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Bad Request', message: 'Request body is missing.' })
            };
        }
        
        const { prompt } = JSON.parse(event.body);
        console.log("Netlify Function: Prompt received.", prompt.substring(0, 50) + "..."); // New log (truncated prompt)

        const API_KEY = process.env.GEMINI_API_KEY; // Access API key from environment variables
        console.log("Netlify Function: Checking API Key."); // New log

        if (!API_KEY) {
            console.error("Netlify Function: GEMINI_API_KEY is not set in environment variables!");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server Configuration Error', message: 'API Key not configured on the server.' })
            };
        }
        console.log("Netlify Function: API Key found."); // New log

        const genAI = new GoogleGenerativeAI(API_KEY);
        // Using 'gemini-1.5-flash' for potentially faster responses, but 'gemini-pro' is fine too.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
        console.log("Netlify Function: GoogleGenerativeAI model initialized."); // New log

        console.log("Netlify Function: Calling generateContent."); // New log
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Netlify Function: Content generated successfully."); // New log

        return {
            statusCode: 200,
            body: JSON.stringify({ content: text })
        };

    } catch (error) {
        console.error('Netlify Function: Error during execution:', error.message, error.stack); // More detailed error log
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', message: error.message || 'An unknown error occurred on the server.' })
        };
    }
};
