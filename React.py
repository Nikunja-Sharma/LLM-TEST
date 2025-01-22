import os
from typing import TypedDict, Annotated, Sequence
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langchain_core.tools import tool
import re

# Initialize the LLM with proper chat configuration
llm = ChatOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="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",
    model="meta-llama/llama-3-8b-instruct:free",  # Corrected model name
    # temperature=0
)

# Define state structure
class AgentState(TypedDict):
    input: str
    output: str | None
    component_name: str  # Add component name to state
    component_props: dict  # Add component props

# Define calculator as a tool using the new @tool decorator
@tool
def calculate(math_expression: str) -> str:
    """Useful for mathematical calculations. Input should be a valid numerical expression using +, -, *, /, or parentheses."""
    try:
        print(f"Calculator called with expression: {math_expression}")  # Better debug message
        print("asddddddddddddddddddddddddddddddddddddddddmessages")
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

@tool
def create_react_component(component_spec: str) -> str:
    """Creates a React component based on the specification provided."""
    try:
        # Create component directory if it doesn't exist
        os.makedirs("src/components", exist_ok=True)
        
        # Write component to file
        component_path = f"src/components/{component_spec['name']}.tsx"
        with open(component_path, "w") as f:
            f.write(component_spec['code'])
        
        return f"Component {component_spec['name']} created successfully at {component_path}"
    except Exception as e:
        return f"Error creating component: {str(e)}"

# Define the agent function
def agent_node(state: AgentState, tools: Sequence[tool]):
    system_prompt = """You are a React component creation assistant. You can:
    - Create React components using TypeScript
    - Handle component specifications and props
    - Generate clean, modern React code
    
    Available tools:
    - create_react_component: Creates a React component file
    - calculate: For any numerical calculations needed
    
    When creating components, use:
    <tool>create_react_component|{"name": "ComponentName", "code": "component code here"}</tool>
    """
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["input"])
    ]
    
    response = llm.invoke(messages)
    
    # Process tool calls
    tool_pattern = r'<tool>(create_react_component|calculate)\|(.*?)</tool>'
    matches = re.finditer(tool_pattern, response.content)
    
    result = response.content
    for match in matches:
        tool_name = match.group(1)
        tool_input = match.group(2)
        
        if tool_name == "create_react_component":
            component_result = create_react_component(eval(tool_input))
            result = result.replace(match.group(0), component_result)
        elif tool_name == "calculate":
            calculation_result = calculate(tool_input)
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
    "Create a Button component with primary and secondary variants",
    "Create a Card component that accepts title, content, and image props",
    "Create a Navigation component with responsive design"
]

# Run test cases
try:
    for query in test_cases:
        result = app.invoke({"input": query, "output": None})
        print(f"\nQuery: {query}")
        print(f"Result: {result['output']}")
except Exception as e:
    print(f"An error occurred: {str(e)}")