// File: netlify/functions/openai-handler.js

// We need to use a library to make calling the OpenAI API easier.
// Run 'npm install openai' in your terminal to get this.
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This uses the secret key from your environment
});

// This is the main function that Netlify will run
export const handler = async (event) => {
  // We only accept POST requests for security
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the data the frontend sent (the prompt)
    const body = JSON.parse(event.body);
    const prompt = body.messages[0].content; // Extract the prompt content

    if (!prompt) {
       return { statusCode: 400, body: 'Bad Request: No prompt provided.' };
    }

    // Make the secure call to OpenAI's API
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: body.model || 'gpt-4o', // Use the model from the frontend or default to gpt-4o
    });

    // Send the AI's response back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify(completion), // Your frontend expects the full completion object
    };

  } catch (error) {
    // Handle any errors
    console.error('Error calling OpenAI API:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch response from AI.' }),
    };
  }
};