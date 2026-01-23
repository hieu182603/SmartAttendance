import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiAPI() {
    console.log('🔍 Testing Gemini API Configuration...\n');

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY is not set in .env file');
        process.exit(1);
    }

    console.log('✅ API Key found:', apiKey.substring(0, 20) + '...');
    console.log('📝 Model:', 'gemini-1.5-flash\n');

    try {
        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash'
        });

        console.log('🚀 Sending test request to Gemini API...');

        // Test simple generation
        const result = await model.generateContent('Hello, please respond with "API is working"');
        const response = await result.response;
        const text = response.text();

        console.log('✅ SUCCESS! Gemini API is working');
        console.log('📨 Response:', text);
        console.log('\n✨ Chatbot should work now!');

    } catch (error) {
        console.error('\n❌ FAILED! Gemini API Error:\n');

        if (error.status) {
            console.error('Status Code:', error.status);

            switch (error.status) {
                case 400:
                    console.error('Error: Bad Request - Invalid API request');
                    console.error('Possible causes:');
                    console.error('  - Invalid model name');
                    console.error('  - Malformed request');
                    break;

                case 401:
                case 403:
                    console.error('Error: Authentication Failed');
                    console.error('Possible causes:');
                    console.error('  - Invalid API key');
                    console.error('  - API key expired or revoked');
                    console.error('  - API key not enabled for Gemini API');
                    console.error('\n💡 Solution:');
                    console.error('  1. Go to https://aistudio.google.com/app/apikey');
                    console.error('  2. Create a new API key');
                    console.error('  3. Update GEMINI_API_KEY in .env file');
                    break;

                case 429:
                    console.error('Error: Rate Limit Exceeded');
                    console.error('Possible causes:');
                    console.error('  - Too many requests');
                    console.error('  - Quota exceeded');
                    break;

                case 500:
                case 502:
                case 503:
                case 504:
                    console.error('Error: Google Service Unavailable');
                    console.error('Possible causes:');
                    console.error('  - Temporary Google server issue');
                    console.error('  - Try again in a few minutes');
                    break;

                default:
                    console.error('Error: Unknown status code');
            }
        }

        console.error('\nFull error message:', error.message);

        if (error.errorDetails) {
            console.error('Error details:', JSON.stringify(error.errorDetails, null, 2));
        }

        process.exit(1);
    }
}

testGeminiAPI();
