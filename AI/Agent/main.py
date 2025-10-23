import os
from datetime import datetime
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv
from tools import login


def perform_initial_login():
    email = os.getenv("AGENT_EMAIL")
    password = os.getenv("AGENT_PASSWORD")

    if not email or not password:
        print("Error: AGENT_EMAIL or AGENT_PASSWORD not found in .env file.")
        return False

    result = login(email=email, password=password)

    if "error" in result:
        print(f"\nFATAL: Login Failed: {result['error']}")
        return False

    print(f"\n{result['status']}")
    return True


def main():
    load_dotenv()
    if "GEMINI_API_KEY" not in os.environ:
        print("Error: GEMINI_API_KEY environment variable not set.")
        return

    if not perform_initial_login():
        print("Exiting due to authentication failure.")
        return

    from agent import app

    print("\n═══════════════════════════════════════")
    print("      Campus Sentinel AI Agent")
    print("═══════════════════════════════════════")
    print("✓ Agent is online with memory enabled")
    print("✓ I remember our conversation!")
    print("\nTip: You can refer to previous searches")
    print("Commands: Type 'exit' to quit\n")

    thread_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    config = {"configurable": {"thread_id": thread_id}}

    print(f"Session ID: {thread_id}\n")

    while True:
        try:
            user_input = input("You: ").strip()

            if not user_input:
                continue

            if user_input.lower() in ['exit', 'quit', 'bye']:
                print("\n👋 Assistant: Goodbye! Stay safe!")
                break

            # Auto-add today's date for timeline queries without dates
            if "timeline" in user_input.lower() and not any(char.isdigit() for char in user_input):
                today_date = datetime.now().strftime("%Y-%m-%d")
                user_input += f" for today ({today_date})"
                print(f"ℹ️  Auto-added date: {today_date}")

            inputs = {"messages": [HumanMessage(content=user_input)]}

            for event in app.stream(inputs, config):
                for key, value in event.items():
                    if key == "agent":
                        response = value['messages'][-1]
                        if response.tool_calls:
                            tool_name = response.tool_calls[0]['name']
                            tool_args = response.tool_calls[0]['args']
                            print(f"\n🤔 Thinking... Using '{tool_name}' tool")
                            print(f"   Parameters: {tool_args}")
                        else:
                            final_answer = response.content
                            if isinstance(final_answer, list):
                                final_answer = final_answer[0].get('text', str(final_answer))
                            print(f"\n💬 Assistant: {final_answer}")
                    elif key == "tools":
                        tool_output = value['messages'][0].content
                        print(f"📊 Tool Result: {tool_output[:200]}..." if len(
                            str(tool_output)) > 200 else f"📊 Tool Result: {tool_output}")

        except KeyboardInterrupt:
            print("\n\n👋 Assistant: Goodbye! Stay safe!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Please try again or type 'exit' to quit.")


if __name__ == "__main__":
    main()