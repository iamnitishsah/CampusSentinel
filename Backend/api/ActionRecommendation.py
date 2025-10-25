import os
import json
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser  # <-- ADD THIS


# LLMChain is deprecated, so we remove its import


class GeminiAlertRecommender:
    """
    Uses LangChain with Google Gemini LLM to generate intelligent recommendations for campus alerts.
    Replaces generic recommendations with context-aware, actionable suggestions.
    """

    def __init__(self, model: str = "gemini-2.0-flash", prompt_template: str = None):
        """
        Initialize the recommender with Gemini API key using LangChain.
        API key is fetched from the 'GEMINI_API_KEY' environment variable.

        Args:
            model: Model to use (default: "gemini-2.0-flash")
            prompt_template: Custom prompt template (optional)
        """
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set. Cannot initialize GeminiAlertRecommender.")

        self.model = model

        # Initialize LangChain Gemini LLM
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            google_api_key=self.api_key,
            temperature=0.9,
            top_k=40,
            top_p=0.95,
            max_output_tokens=150
        )

        # Create prompt template
        template = prompt_template or self._get_default_prompt_template()
        self.prompt = PromptTemplate(
            input_variables=["alert_type", "count", "context"],
            template=template
        )

        # --- THIS IS CHANGED ---
        # Create modern LangChain Expression Language (LCEL) chain
        # This replaces the deprecated LLMChain
        self.chain = self.prompt | self.llm | StrOutputParser()
        # --- END CHANGE ---

    def _get_default_prompt_template(self) -> str:
        """Returns default prompt template with specific instructions for each alert type."""
        return """You are a campus safety expert. Analyze this alert and provide ONE specific, actionable recommendation.

Alert Type: {alert_type}
Total Alerts: {count}

Details:
{context}

Instructions based on alert type:
- If Missing Person and gap > 12 hours: Suggest checking last known location, contacting emergency contacts, and reviewing security footage
- If Missing Person and gap < 12 hours: Suggest monitoring the situation and checking campus access logs
- If Overcrowding and capacity > 200%: Suggest immediate crowd control, additional entry points, and scheduling changes
- If Overcrowding and capacity < 200%: Suggest capacity monitoring, better space utilization, and booking system improvements
- Each time give unique just use this template but change words only.

Provide ONE clear, actionable recommendation following these guidelines."""

    def generate_recommendations(self, alerts_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate LLM-based recommendations for alerts using LangChain.

        Args:
            alerts_data: Dictionary containing alerts in the format from your API

        Returns:
            Updated alerts data with LLM-generated recommendations
        """
        alerts_list = alerts_data.get('alerts', [])

        # Group alerts by type for better context
        alerts_by_type = self._group_alerts_by_type(alerts_list)

        # Generate recommendations for each alert type
        recommendations_by_type = {}

        for alert_type, alerts in alerts_by_type.items():
            print(f"Generating recommendations for {alert_type}...")
            recommendation = self._get_llm_recommendation(alert_type, alerts)
            recommendations_by_type[alert_type] = recommendation

        # Update original alerts with new recommendations
        updated_alerts = []
        for alert in alerts_list:
            alert_copy = alert.copy()
            alert_type = alert_copy['alert_type']

            # Replace generic recommendation with LLM-generated one
            if alert_type in recommendations_by_type:
                # Replace the original recommendation
                alert_copy['recommendation'] = recommendations_by_type[alert_type]
                # Add a new key 'llm_recommendation' as in the notebook
                alert_copy['llm_recommendation'] = recommendations_by_type[alert_type]
            else:
                # Ensure llm_recommendation key exists even if not generated
                alert_copy['llm_recommendation'] = alert_copy.get('recommendation', 'N/A')

            updated_alerts.append(alert_copy)

        return {
            'alerts': updated_alerts,
            'count': len(updated_alerts),
            'recommendations_summary': recommendations_by_type
        }

    def _group_alerts_by_type(self, alerts: List[Dict]) -> Dict[str, List[Dict]]:
        """Group alerts by alert_type."""
        grouped = {}
        for alert in alerts:
            alert_type = alert['alert_type']
            if alert_type not in grouped:
                grouped[alert_type] = []
            grouped[alert_type].append(alert)
        return grouped

    def _get_llm_recommendation(self, alert_type: str, alerts: List[Dict]) -> str:
        """
        Get recommendation from Gemini LLM using LangChain for a specific alert type.

        Args:
            alert_type: Type of alert (e.g., "Missing Person", "Overcrowding")
            alerts: List of alerts of this type

        Returns:
            LLM-generated recommendation string
        """
        # Prepare context for the LLM
        context = self._prepare_context(alert_type, alerts)

        # Call LangChain chain
        try:
            # --- THIS IS CHANGED ---
            # The new LCEL chain directly returns a string, not a dictionary
            response_str = self.chain.invoke({
                "alert_type": alert_type,
                "count": len(alerts),
                "context": context
            })

            # Extract the generated text
            if response_str:
                return response_str.strip()  # The response is already the text
            else:
                return f"Unable to generate recommendation for {alert_type}."
            # --- END CHANGE ---

        except Exception as e:
            print(f"Error calling Gemini via LangChain: {e}")
            return f"Error generating recommendation: {str(e)}"

    def _prepare_context(self, alert_type: str, alerts: List[Dict]) -> str:
        """Prepare relevant context from alerts for the LLM."""
        if not alerts:
            return "No alerts of this type to analyze."

        if alert_type == "Missing Person":
            # Extract gap patterns
            gaps = [alert['details'].get('gap_hours', 0) for alert in alerts]
            if not gaps: return "No gap hour details found."

            avg_gap = sum(gaps) / len(gaps)
            max_gap = max(gaps)
            min_gap = min(gaps)
            names = [alert['details'].get('name', 'Unknown') for alert in alerts[:3]]  # First 3 names

            context = f"""- Number of people affected: {len(alerts)}
- Average inactivity: {avg_gap:.1f} hours (min: {min_gap:.1f}h, max: {max_gap:.1f}h)
- Affected individuals: {', '.join(names)}{' and others' if len(alerts) > 3 else ''}
- Severity: {'CRITICAL - Extended absence' if avg_gap > 12 else 'MODERATE - Potential absence'}"""

        elif alert_type == "Overcrowding":
            # Extract location patterns
            locations = {}
            for alert in alerts:
                details = alert.get('details', {})
                loc = details.get('location_name', 'Unknown Location')
                capacity = details.get('max_capacity', 1)  # Avoid division by zero
                current_count = details.get('current_count', 0)

                if capacity == 0: capacity = 1  # Avoid division by zero

                if loc not in locations:
                    locations[loc] = {
                        'count': 0,
                        'max_overcapacity': 0,
                        'capacity': capacity,
                        'peak_count': 0
                    }
                locations[loc]['count'] += 1
                overcapacity_pct = (current_count / capacity) * 100
                locations[loc]['max_overcapacity'] = max(locations[loc]['max_overcapacity'], overcapacity_pct)
                locations[loc]['peak_count'] = max(locations[loc]['peak_count'], current_count)

            if not locations: return "No location details found for overcrowding alerts."

            context = "Location-specific overcrowding:\n"
            for loc, data in sorted(locations.items(), key=lambda x: x[1]['max_overcapacity'], reverse=True)[:5]:
                severity = "CRITICAL" if data['max_overcapacity'] > 200 else "HIGH" if data[
                                                                                           'max_overcapacity'] > 150 else "MODERATE"
                context += f"- {loc}: {severity} | {data['count']} incidents | Peak: {data['peak_count']} people (capacity: {data['capacity']}) | {data['max_overcapacity']:.0f}% over capacity\n"

        else:
            # Generic context for other alert types
            context = f"Number of incidents: {len(alerts)}\nSeverity: {alerts[0].get('severity', 'N/A')}"

        return context