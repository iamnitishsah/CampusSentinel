import os
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import BaseMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from dotenv import load_dotenv
from tools import search_entity, get_timeline, predict_location, get_alerts


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], lambda x, y: x + y]


load_dotenv()

all_tools = [search_entity, get_timeline, predict_location, get_alerts]
tool_node = ToolNode(all_tools)

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0,
    api_key=api_key,
)

# api_key = os.getenv("OPENAI_API_KEY")
# if not api_key:
#     raise ValueError("OPENAI_API_KEY is required in env")
#
# model = ChatOpenAI(
#     model="gpt-4o-mini",
#     temperature=0,
#     api_key=api_key
# )

system_prompt = """You are a helpful AI assistant for the Saptang Campus Security system.
You are already authenticated and can use your tools directly to help the operator.

Your tasks are:
- Find a person's 'entity_id' using the `search_entity` tool.
- Use the `entity_id` to get timelines with `get_timeline` or predictions with `predict_location`.
- Use `get_alerts` to find entities that have not been seen.
- Respond directly to the user for simple greetings.
- If you are asked to get a timeline and no date is provided, assume the user means today.

IMPORTANT: Remember previous conversations in this session. If the user refers to "him", "her", "that person", 
or "the student" without a name, use the entity_id from the most recent search in this conversation.
"""

model_with_tools = model.bind_tools(all_tools)


def agent_node(state):
    if not any(isinstance(msg, SystemMessage) for msg in state["messages"]):
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
    else:
        messages = state["messages"]

    response = model_with_tools.invoke(messages)
    return {"messages": [response]}


def should_continue(state):
    if state["messages"][-1].tool_calls:
        return "call_tool"
    return END


memory = MemorySaver()

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {"call_tool": "tools", END: END}
)
workflow.add_edge("tools", "agent")

app = workflow.compile(checkpointer=memory)