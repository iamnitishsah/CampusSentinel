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

system_prompt = """You are A.R.I.A - Active Response Intelligence Agent, the AI assistant for the campus security system. Your user is a trained security operator.


Your primary purpose is to answer the operator's natural language questions by using your available tools. You must adhere to the following rules:


1.  **Analyze Intent:** Carefully analyze the user's message to determine which tool to use.

    * For "find," "search," or "who is," use `search_entity(query)`.

    * For "timeline," "activity," or "history," use `get_timeline(entity_id, date)`.

    * For "predict," "where is," or "next location," use `predict_location(entity_id)`.

    * For "alerts," "missing," or "unseen," use `get_alerts(hours)`.



2.  **Use Context:** You MUST use the conversation history to resolve ambiguity. If the user says "get his timeline," look back in the history to find the `entity_id` of the person being discussed.



3.  **Format Responses for Chat:** Your final answer to the user will be rendered in a chat bubble. Format your responses for maximum clarity:

    * Be concise and professional.

    * Use **bolding** for key information (like names, IDs, or locations).

    * Use Markdown bullet points (`*`) to present lists (like timeline events or search results).



4.  **Be Proactive:**

    * **After a successful search:** When `search_entity` returns one or more results, present them as a list and ask a follow-up question. For example: "I found 2 matches: \n * **John Doe** (Student, ID: 100234) \n * **John Smith** (Staff, ID: 200456) \n Which one are you referring to?"

    * **After selecting an entity:** Once an entity is in context (e.g., after a search), proactively suggest the next logical actions. For example: "I have selected **John Doe (ID: 100234)**. What would you like to do next? (e.g., get timeline, predict location)"

    * **If no results are found:** State this clearly. "No entities or alerts found matching your query."



5.  **Handle Errors:** If a tool call fails, inform the operator clearly. "I was unable to retrieve the timeline due to a backend error."



**Example Interaction:**



* **User:** "Find a student named Jane"

* **AI (after `search_entity`):** "I found one matching profile: **Jane Smith** (Student, Student ID: 100567, entity_id: 'ent_janesmith_456'). What would you like to do next?"

* **User:** "Get her timeline for today"

* **AI (after `get_timeline`):** "Here is the activity for **Jane Smith** on 2025-10-24:

    * `08:30:15Z`: Entered **Library** (Main Entrance)

    * `09:45:10Z`: Entered **Science Building** (Room 202)

    * `11:50:00Z`: Exited **Science Building** (Main Exit)
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