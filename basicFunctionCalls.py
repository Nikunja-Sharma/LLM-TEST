import os
from typing import TypedDict, Annotated, Sequence
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langchain_core.tools import tool
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize the LLM with proper chat configuration
llm = ChatOpenAI(
    base_url=os.getenv('OPENROUTER_BASE_URL'),
    api_key=os.getenv('OPENROUTER_API_KEY'),
    model=os.getenv('OPENROUTER_MODEL_NAME'),
    # temperature=0
)

# Define state structure
class AgentState(TypedDict):
    input: str
    output: str | None

# Define calculator as a tool using the new @tool decorator
@tool
def calculate(math_expression: str) -> str:
    """Useful for mathematical calculations. Input should be a valid numerical expression using +, -, *, /, or parentheses."""
    try:
        print(f"Calculator called with expression: {math_expression}")  # Better debug message
        print("Calculator called with expressionnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn: ", math_expression)
        # Strip whitespace and validate input
        math_expression = math_expression.strip()
        if not math_expression:
            return "Error: Empty expression"
            
        expression = re.sub(r'[^\d+\-*/().\s]', '', math_expression)
        allowed_chars = set("0123456789+-*/.()")
        if not all(c in allowed_chars for c in expression.replace(" ", "")):
            return "Error: Invalid characters in expression"
            
        # Additional debug
        print(f"Cleaned expression: {expression}")
        
        result = eval(expression)
        print(f"Calculation result: {result}")  # Debug the result
        return str(result)
    except Exception as e:
        print(f"Calculator error: {str(e)}")  # Debug any errors
        return f"Error: {str(e)}"

# Define the agent function
def agent_node(state: AgentState, tools: Sequence[tool]):
    # Create a prompt that includes tool information
    system_prompt = """You are a helpful assistant with access to the following tools:
    - calculate: Use this for mathematical calculations. Provide numerical expressions using +, -, *, /, or parentheses.

    When you need to perform calculations, use the calculate tool by writing:
    <tool>calculate|your expression here</tool>
    """
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["input"])
    ]
    
    response = llm.invoke(messages)
    
    # Extract tool calls using regex
    tool_pattern = r'<tool>calculate\|(.*?)</tool>'
    matches = re.finditer(tool_pattern, response.content)
    
    # Process any tool calls
    result = response.content
    for match in matches:
        expression = match.group(1)
        calculation_result = calculate(expression)
        result = result.replace(match.group(0), calculation_result)
    
    state["output"] = result
    return {"output": state["output"]}

# Create the graph
workflow = StateGraph(AgentState)

# Add the agent node
workflow.add_node("agent", lambda state: agent_node(state, [calculate]))

# Define the edges
workflow.set_entry_point("agent")
workflow.add_edge("agent", END)

# Compile the graph
app = workflow.compile()

# Test queries
test_cases = [
    "who is the president of the united states?",
    "Calculate (12345 * 6789) / (12 + 34.5)",
    "What is 15 multiplied by 3?"
]

# Run test cases
try:
    for query in test_cases:
        result = app.invoke({"input": query, "output": None})
        print(f"\nQuery: {query}")
        print(f"Result: {result['output']}")
except Exception as e:
    print(f"An error occurred: {str(e)}")