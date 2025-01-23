import dotenv from 'dotenv';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

// Initialize the LLM with proper chat configuration
const llm = new ChatOpenAI({
    configuration: {
        baseURL: process.env.OPENROUTER_BASE_URL,
        defaultHeaders: {
            "HTTP-Referer": process.env.YOUR_SITE_URL,
            "X-Title": process.env.YOUR_SITE_NAME,
        }
    },
    modelName: process.env.OPENROUTER_MODEL_NAME,
    openAIApiKey: process.env.OPENROUTER_API_KEY,
});

// Define calculator tool
const calculate = async (mathExpression) => {
    try {
        console.log(`Calculator called with expressionnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn: ${mathExpression}`);
        
        // Strip whitespace and validate input
        mathExpression = mathExpression.trim();
        if (!mathExpression) {
            return "Error: Empty expression";
        }
        
        // Clean and validate expression
        const expression = mathExpression.replace(/[^\d+\-*/().\s]/g, '');
        const allowedChars = new Set("0123456789+-*/.()")
        if (![...expression.replace(/\s/g, '')].every(c => allowedChars.has(c))) {
            return "Error: Invalid characters in expression";
        }
        
        console.log(`Cleaned expression: ${expression}`);
        
        // Use Function constructor instead of eval for better security
        const result = new Function(`return ${expression}`)();
        console.log(`Calculation result: ${result}`);
        return result.toString();
    } catch (e) {
        console.log(`Calculator error: ${e.message}`);
        return `Error: ${e.message}`;
    }
};

// Define weather report tool
const getWeatherReport = async (location) => {
    try {
        console.log(`Weather report requested for: ${location}`);
        console.log(`Weather report requestedSDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD for: ${location}`);

        // Dummy weather data
        const weatherConditions = [
            'sudasdasnny', 'partlyasdasdasd clasdasdoudy', 'clasddasdasasdoudy', 'raiasdasny', 'stoasdasrmy', 'snowasdasdy'
        ];
        const temperatures = {
            celsius: Math.floor(Math.random() * 35) + 5,  // Random temp between 5-40°C
        };
        temperatures.fahrenheit = Math.round(temperatures.celsius * 9/5 + 32);
        
        const humidity = Math.floor(Math.random() * 60) + 30;  // Random humidity 30-90%
        const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        
        return `Weather report for ${location}:
Temperature: ${temperatures.celsius}°C (${temperatures.fahrenheit}°F)
Condition: ${condition}
Humidity: ${humidity}%`;
    } catch (e) {
        console.log(`Weather report error: ${e.message}`);
        return `Error getting weather report: ${e.message}`;
    }
};

const findExistingFunction = async (fnName) => {
    const files = await fs.readdir('FUNCTION');
    // Look for exact function name match first, ignoring file extensions
    return files.find(file => 
        file.toLowerCase().replace(/\.[^/.]+$/, "") === fnName.toLowerCase() ||
        file.toLowerCase().includes(fnName.toLowerCase())
    );
};

const createAndStoreFunction = async (functionDefinition) => {
    try {
        console.log('🔍 Checking function existence...');
        
        // Extract function name
        const fnNameMatch = functionDefinition.match(/function\s+(\w+)/);
        if (!fnNameMatch) {
            console.log('❌ Error: Invalid function definition format');
            return null;
        }
        const fnName = fnNameMatch[1];
        
        // Create FUNCTION directory if it doesn't exist
        await fs.mkdir('FUNCTION', { recursive: true });

        // Check for existing function
        const existingFile = await findExistingFunction(fnName);
        
        if (existingFile) {
            console.log('📌 Found existing function:', existingFile);
            const existingCode = await fs.readFile(`FUNCTION/${existingFile}`, 'utf8');
            console.log('♻️ Reusing existing function - no new file created');
            return new Function(`return (${existingCode})`)();
        }

        // Only proceed with creation if no existing function was found
        console.log('🆕 No existing function found. Creating new one...');
        
        // Add console.log to the function definition
        const enhancedFunction = functionDefinition.replace(
            /function\s+(\w+)\s*\((.*?)\)\s*{/,
            `function $1($2) {
    console.log('📞 Calling function: $1');
    console.log('📎 Arguments:', $2);`
        );

        // Generate filename based on function name
        const filename = `${fnName.toLowerCase()}.txt`;
        const filepath = `FUNCTION/${filename}`;
        
        await fs.writeFile(filepath, enhancedFunction, 'utf8');

        console.log('✅ New function created successfully');
        console.log('💾 Stored as:', filename);
        
        return new Function(`return (${enhancedFunction})`)();
    } catch (e) {
        console.error('❌ Error in function creation process:', e.message);
        return null;
    }
};

// Modified agent function to be more strict about function reuse
const agentNode = async (state) => {
    console.log('\n🤖 Agent Node Started');
    const systemPrompt = `You are a helpful assistant that can create and execute custom functions.
    When you need to create a function, write it in the following format:
    <function>
    function customFunction(params) {
        // function body
        return result;
    }
    </function>
    
    Then call it using:
    <execute>customFunction(args)</execute>
    `;
    
    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(state.input)
    ];
    
    const response = await llm.invoke(messages);
    let result = response.content;
    
    // Extract and process function definitions
    const functionPattern = /<function>([\s\S]*?)<\/function>/g;
    const functionMatches = result.matchAll(functionPattern);
    const functions = new Map();
    
    for (const match of functionMatches) {
        const functionDef = match[1].trim();
        const fnNameMatch = functionDef.match(/function\s+(\w+)/);
        if (fnNameMatch) {
            const fnName = fnNameMatch[1];
            console.log(`\n🔄 Processing function: ${fnName}`);
            const fn = await createAndStoreFunction(functionDef);
            if (fn) {
                functions.set(fnName, fn);
                result = result.replace(match[0], `Using function: ${fnName}`);
            }
        }
    }
    
    // Execute function calls
    const executePattern = /<execute>(.*?)<\/execute>/g;
    const executeMatches = result.matchAll(executePattern);
    
    for (const match of executeMatches) {
        console.log('\n⚡ Executing function call');
        const call = match[1].trim();
        const fnName = call.match(/(\w+)\(/)[1];
        const fn = functions.get(fnName);
        
        if (fn) {
            try {
                const argsMatch = call.match(/\((.*)\)/)[1];
                const args = eval(`[${argsMatch}]`);
                console.log('📊 Function:', fnName);
                console.log('🔢 Arguments:', args);
                console.log('🎬 Starting execution...');
                const execResult = await fn(...args);
                console.log('✨ Result:', execResult);
                console.log('✅ Execution completed');
                result = result.replace(match[0], String(execResult));
            } catch (e) {
                console.error('❌ Execution error:', e.message);
                result = result.replace(match[0], `Error executing function: ${e.message}`);
            }
        }
    }
    
    return { output: result };
};

// Test function
const runTests = async () => {
    const testCases = [
        `Create a function to calculate the area of a circle and use it:
        <function>
        function calculateCircleArea(radius) {
            return Math.PI * radius * radius;
        }
        </function>
        The area of a circle with radius 5 is: <execute>calculateCircleArea(5)</execute>
        `
    ];

    try {
        for (const query of testCases) {
            const state = { input: query, output: null };
            const result = await agentNode(state);
            console.log(`\nQuery: ${query}`);
            console.log(`Result: ${result.output}`);
        }
    } catch (e) {
        console.error(`An error occurred: ${e.message}`);
    }
};

// Run the tests
runTests(); 