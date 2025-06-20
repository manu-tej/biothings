#!/usr/bin/env python3
"""Test API locally without external dependencies"""
import requests
import json
import time

def test_api():
    """Test the API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧬 Testing BioThings API")
    print("=" * 50)
    
    # Test 1: Root endpoint
    try:
        print("\n1. Testing root endpoint...")
        response = requests.get(f"{base_url}/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        print("\n⚠️  Make sure the server is running!")
        print("   Run: cd backend && source venv/bin/activate && python -m app.main")
        return
    
    # Test 2: Get agents
    try:
        print("\n2. Testing agents endpoint...")
        response = requests.get(f"{base_url}/api/agents")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Agents: {len(data.get('agents', []))}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Chat with CEO
    try:
        print("\n3. Testing chat with CEO...")
        chat_data = {
            "agent_type": "CEO",
            "message": "What should be our top priority for 2025?"
        }
        response = requests.post(
            f"{base_url}/api/chat",
            json=chat_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            ceo_response = data.get("response", "No response")
            print(f"   CEO says: {ceo_response[:200]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: Health check
    try:
        print("\n4. Testing health endpoint...")
        response = requests.get(f"{base_url}/api/health")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Services: {data.get('services', {})}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n✅ API test completed!")


if __name__ == "__main__":
    # Check if requests is installed
    try:
        import requests
    except ImportError:
        print("❌ 'requests' module not found.")
        print("Install it with: pip install requests")
        exit(1)
    
    test_api()