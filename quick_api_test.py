#!/usr/bin/env python3
"""
Quick API test using only standard library
"""
import json
import urllib.request
import urllib.error
import sys


def test_endpoint(url, method="GET", data=None):
    """Test an API endpoint"""
    try:
        if data:
            data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header('Content-Type', 'application/json')
        else:
            req = urllib.request.Request(url, method=method)
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return True, result
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, f"Connection error: {e.reason}"
    except Exception as e:
        return False, str(e)


def main():
    """Run quick API tests"""
    base_url = "http://localhost:8000"
    
    print("🧬 BioThings API Quick Test")
    print("=" * 50)
    
    # Test 1: Root endpoint
    print("\n1️⃣ Testing root endpoint...")
    success, result = test_endpoint(f"{base_url}/")
    if success:
        print("✅ API is running!")
        print(f"   Name: {result.get('name', 'Unknown')}")
        print(f"   Version: {result.get('version', 'Unknown')}")
        print(f"   LLM: {result.get('features', {}).get('llm_integration', 'Unknown')}")
    else:
        print(f"❌ API not reachable: {result}")
        print("\n⚠️  Make sure the server is running:")
        print("   cd backend && source venv/bin/activate && python -m app.main")
        return
    
    # Test 2: Health check
    print("\n2️⃣ Testing health endpoint...")
    success, result = test_endpoint(f"{base_url}/api/health")
    if success:
        print("✅ Health check passed")
        services = result.get('services', {})
        for service, status in services.items():
            print(f"   {service}: {status}")
    else:
        print(f"❌ Health check failed: {result}")
    
    # Test 3: Get agents
    print("\n3️⃣ Testing agents endpoint...")
    success, result = test_endpoint(f"{base_url}/api/agents")
    if success:
        agents = result.get('agents', [])
        print(f"✅ Found {len(agents)} agents")
        for agent in agents[:3]:  # Show first 3
            print(f"   - {agent.get('agent_type', 'Unknown')} ({agent.get('status', 'Unknown')})")
    else:
        print(f"❌ Failed to get agents: {result}")
    
    # Test 4: Chat with CEO
    print("\n4️⃣ Testing chat with CEO...")
    chat_data = {
        "agent_type": "CEO",
        "message": "What's our main goal?"
    }
    success, result = test_endpoint(f"{base_url}/api/chat", "POST", chat_data)
    if success:
        response = result.get('response', 'No response')
        print("✅ CEO responded:")
        print(f"   {response[:100]}...")
    else:
        print(f"❌ Chat failed: {result}")
    
    # Test 5: Monitoring endpoints
    print("\n5️⃣ Testing monitoring endpoints...")
    success, result = test_endpoint(f"{base_url}/api/monitoring/metrics/current")
    if success:
        metrics = result.get('metrics', {})
        print("✅ Current metrics:")
        for key, value in metrics.items():
            print(f"   {key}: {value}")
    else:
        print(f"❌ Metrics failed: {result}")
    
    print("\n" + "="*50)
    print("✅ Quick test completed!")
    
    # Show available endpoints
    print("\n📍 Available endpoints:")
    print("   GET  /api/agents")
    print("   GET  /api/health")
    print("   GET  /api/workflows")
    print("   GET  /api/protocols")
    print("   GET  /api/experiments")
    print("   GET  /api/equipment")
    print("   GET  /api/monitoring/metrics/current")
    print("   GET  /api/monitoring/alerts")
    print("   GET  /api/metrics/dashboard")
    print("   GET  /api/metrics/report")
    print("   POST /api/chat")
    print("   POST /api/agents/{type}/task")
    print("   POST /api/experiments/start")
    print("   POST /api/metrics/record")
    print("   WS   /ws or /ws/{client_id}")


if __name__ == "__main__":
    main()