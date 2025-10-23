import uvicorn
import os
from fastapi import FastAPI
from pydantic import BaseModel
from contextlib import asynccontextmanager
from datetime import datetime
from dotenv import load_dotenv
from typing import Optional

from agent import app
from tools import login
from langchain_core.messages import HumanMessage


class Query(BaseModel):
    message: str
    session_id: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Asynchronous context manager for FastAPI lifespan events.
    This will run the login logic on startup.
    """
    load_dotenv()
    print("Loading environment variables...")

    email = os.getenv("AGENT_EMAIL")
    password = os.getenv("AGENT_PASSWORD")

    if not email or not password:
        print("FATAL: AGENT_EMAIL or AGENT_PASSWORD not found in .env file.")
        raise ValueError("AGENT_EMAIL or AGENT_PASSWORD not found in .env file.")

    print("Attempting agent login...")
    result = login(email=email, password=password)

    if "error" in result:
        print(f"FATAL: Login Failed: {result['error']}")
        raise Exception(f"Login Failed: {result['error']}")

    print(f"Login successful: {result['status']}")

    yield

    print("Server shutting down.")


fastapi_app = FastAPI(lifespan=lifespan)


@fastapi_app.post("/chat")
async def chat_endpoint(query: Query):
    """
    Main chat endpoint to interact with the agent.
    """
    thread_id = query.session_id or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    config = {"configurable": {"thread_id": thread_id}}

    inputs = {"messages": [HumanMessage(content=query.message)]}

    final_answer = ""

    try:
        for event in app.stream(inputs, config):
            for key, value in event.items():
                if key == "agent":
                    response = value['messages'][-1]
                    # Check if this is a final response (not a tool call)
                    if not response.tool_calls:
                        final_answer = response.content
                        # Handle varied response content types
                        if isinstance(final_answer, list):
                            # Try to extract text if it's a list of dicts
                            try:
                                final_answer = final_answer[0].get('text', str(final_answer))
                            except:
                                final_answer = str(final_answer)
                        elif isinstance(final_answer, dict):
                            final_answer = str(final_answer)

        return {"response": final_answer, "session_id": thread_id}

    except Exception as e:
        return {"error": str(e), "session_id": thread_id}


@fastapi_app.get("/")
def read_root():
    return {"status": "Agent server is running. POST to /chat to interact."}


if __name__ == "__main__":
    # Run the server
    print("Starting FastAPI server...")
    uvicorn.run(fastapi_app, host="0.0.0.0", port=8080)

