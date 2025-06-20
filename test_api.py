#!/usr/bin/env python3
"""
Test BioThings API with Google Gemini
Interactive testing of all endpoints
"""
import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, Any

BASE_URL = "http://localhost:8001"


class APITester:
    """Test all BioThings API endpoints"""
    
    def __init__(self):
        self.session = None
        self.test_results = []
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()
    
    async def test_endpoint(self, 
                          method: str,
                          endpoint: str,
                          data: Dict[str, Any] = None,
                          description: str = "") -> Dict[str, Any]:
        """Test a single endpoint"""
        url = f"{BASE_URL}{endpoint}"
        
        print(f"\n🔍 Testing: {description or endpoint}")
        print(f"   Method: {method}")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            start_time = datetime.now()
            
            if method == "GET":
                async with self.session.get(url) as response:
                    result = await self._process_response(response, start_time)
            elif method == "POST":
                async with self.session.post(url, json=data) as response:
                    result = await self._process_response(response, start_time)
            else:
                result = {"error": f"Unsupported method: {method}"}
            
            self.test_results.append({
                "endpoint": endpoint,
                "method": method,
                "description": description,
                "success": result.get("success", False),
                "response_time": result.get("response_time", 0)
            })
            
            return result
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return {"error": str(e), "success": False}
    
    async def _process_response(self, response, start_time) -> Dict[str, Any]:
        """Process API response"""
        response_time = (datetime.now() - start_time).total_seconds()
        
        if response.status == 200:
            data = await response.json()
            print(f"✅ Success ({response_time:.2f}s)")
            print(f"   Response: {json.dumps(data, indent=2)[:500]}...")
            return {
                "success": True,
                "data": data,
                "response_time": response_time
            }
        else:
            error_text = await response.text()
            print(f"❌ Failed with status {response.status}")
            print(f"   Error: {error_text[:200]}")
            return {
                "success": False,
                "status": response.status,
                "error": error_text,
                "response_time": response_time
            }
    
    async def run_all_tests(self):
        """Run all API tests"""
        print("\n" + "="*80)
        print("🧬 BioThings API Test Suite")
        print("="*80)
        
        # Test 1: Root endpoint
        await self.test_endpoint(
            "GET", "/",
            description="Root endpoint - API status"
        )
        
        # Test 2: Get all agents
        await self.test_endpoint(
            "GET", "/api/agents",
            description="Get all active agents"
        )
        
        # Test 3: Chat with CEO
        await self.test_endpoint(
            "POST", "/api/chat",
            data={
                "agent_type": "CEO",
                "message": "What's our strategy for the next quarter?"
            },
            description="Chat with CEO agent"
        )
        
        # Test 4: Assign task to CSO
        await self.test_endpoint(
            "POST", "/api/agents/CSO/task",
            data={
                "task": "Evaluate feasibility of mRNA vaccine platform",
                "context": {
                    "budget": "$10M",
                    "timeline": "18 months",
                    "target_diseases": ["influenza", "RSV"]
                }
            },
            description="Assign task to CSO"
        )
        
        # Test 5: Get experiments
        await self.test_endpoint(
            "GET", "/api/experiments",
            description="Get active experiments"
        )
        
        # Test 6: Get protocols
        await self.test_endpoint(
            "GET", "/api/protocols",
            description="Get available protocols"
        )
        
        # Test 7: Get equipment status
        await self.test_endpoint(
            "GET", "/api/equipment",
            description="Get lab equipment status"
        )
        
        # Test 8: Health check
        await self.test_endpoint(
            "GET", "/api/health",
            description="API health check"
        )
        
        # Test 9: Multi-agent task
        await self.test_endpoint(
            "POST", "/api/agents/CEO/task",
            data={
                "task": "Should we acquire the startup developing novel CRISPR variants?",
                "context": {
                    "acquisition_cost": "$50M",
                    "technology": "Next-gen CRISPR with reduced off-targets",
                    "team_size": "15 scientists",
                    "patents": "12 granted, 8 pending",
                    "revenue_potential": "$200M in 5 years"
                }
            },
            description="Complex decision requiring CEO analysis"
        )
        
        # Test 10: CFO financial analysis
        await self.test_endpoint(
            "POST", "/api/chat",
            data={
                "agent_type": "CFO",
                "message": "Analyze our burn rate and runway with current funding"
            },
            description="CFO financial analysis"
        )
        
        # Print summary
        self._print_summary()
    
    def _print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        
        total = len(self.test_results)
        successful = sum(1 for r in self.test_results if r["success"])
        failed = total - successful
        avg_response_time = sum(r["response_time"] for r in self.test_results) / total if total > 0 else 0
        
        print(f"\nTotal Tests: {total}")
        print(f"✅ Successful: {successful}")
        print(f"❌ Failed: {failed}")
        print(f"⏱️  Average Response Time: {avg_response_time:.2f}s")
        
        if failed > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['description'] or result['endpoint']}")
    
    async def test_websocket(self):
        """Test WebSocket connection"""
        print("\n" + "="*80)
        print("🔌 Testing WebSocket Connection")
        print("="*80)
        
        ws_url = f"ws://localhost:8001/ws"
        print(f"\nConnecting to: {ws_url}")
        
        try:
            async with self.session.ws_connect(ws_url) as ws:
                print("✅ WebSocket connected")
                
                # Send ping
                await ws.send_json({"type": "ping"})
                print("📤 Sent: ping")
                
                # Wait for pong
                msg = await ws.receive_json()
                print(f"📥 Received: {msg}")
                
                # Subscribe to updates
                await ws.send_json({
                    "type": "subscribe",
                    "channel": "agent_updates"
                })
                print("📤 Subscribed to agent_updates")
                
                # Close connection
                await ws.close()
                print("✅ WebSocket test completed")
                
        except Exception as e:
            print(f"❌ WebSocket error: {str(e)}")
    
    async def stress_test(self, concurrent_requests: int = 10):
        """Run stress test with concurrent requests"""
        print("\n" + "="*80)
        print(f"🔥 Stress Test: {concurrent_requests} concurrent requests")
        print("="*80)
        
        tasks = []
        for i in range(concurrent_requests):
            task = self.test_endpoint(
                "POST", "/api/chat",
                data={
                    "agent_type": "CEO",
                    "message": f"Test message {i}: What's our market position?"
                },
                description=f"Concurrent request {i+1}"
            )
            tasks.append(task)
        
        start_time = datetime.now()
        results = await asyncio.gather(*tasks)
        total_time = (datetime.now() - start_time).total_seconds()
        
        successful = sum(1 for r in results if r.get("success", False))
        
        print(f"\n📊 Stress Test Results:")
        print(f"   Total Requests: {concurrent_requests}")
        print(f"   Successful: {successful}")
        print(f"   Failed: {concurrent_requests - successful}")
        print(f"   Total Time: {total_time:.2f}s")
        print(f"   Requests/second: {concurrent_requests / total_time:.2f}")


async def main():
    """Run API tests"""
    print("\n🧬 BioThings API Tester")
    print("Make sure the API server is running on port 8001")
    
    async with APITester() as tester:
        while True:
            print("\n" + "="*60)
            print("Select test option:")
            print("1. Run all API tests")
            print("2. Test WebSocket connection")
            print("3. Stress test (10 concurrent requests)")
            print("4. Custom endpoint test")
            print("5. Exit")
            
            choice = input("\nChoice (1-5): ")
            
            if choice == "1":
                await tester.run_all_tests()
            elif choice == "2":
                await tester.test_websocket()
            elif choice == "3":
                await tester.stress_test()
            elif choice == "4":
                method = input("Method (GET/POST): ").upper()
                endpoint = input("Endpoint (e.g., /api/agents): ")
                
                data = None
                if method == "POST":
                    try:
                        data_str = input("JSON data (or press Enter for none): ")
                        if data_str:
                            data = json.loads(data_str)
                    except json.JSONDecodeError:
                        print("Invalid JSON, proceeding without data")
                
                await tester.test_endpoint(method, endpoint, data)
            elif choice == "5":
                print("\n👋 Goodbye!")
                break
            else:
                print("Invalid choice")
            
            input("\nPress Enter to continue...")


if __name__ == "__main__":
    asyncio.run(main())