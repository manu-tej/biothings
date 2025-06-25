import WS from 'jest-websocket-mock'

export class WebSocketTestHelper {
  server: WS
  url: string

  constructor(url: string = 'ws://localhost:8000/ws') {
    this.url = url
    this.server = new WS(url)
  }

  async waitForConnection() {
    await this.server.connected
  }

  async sendMessage(message: any) {
    this.server.send(JSON.stringify(message))
  }

  async sendMetricsUpdate(metrics: any) {
    await this.sendMessage({
      type: 'metrics_update',
      data: metrics,
      timestamp: new Date().toISOString(),
    })
  }

  async sendAgentStatus(agentId: string, status: string) {
    await this.sendMessage({
      type: 'agent_status',
      data: { agent_id: agentId, status },
      timestamp: new Date().toISOString(),
    })
  }

  async expectMessage(expectedMessage: any) {
    await expect(this.server).toReceiveMessage(JSON.stringify(expectedMessage))
  }

  close() {
    this.server.close()
  }

  cleanup() {
    WS.clean()
  }
}

// Mock WebSocket class for unit tests
export class MockWebSocket {
  url: string
  readyState: number
  onopen?: (event: Event) => void
  onclose?: (event: CloseEvent) => void
  onerror?: (event: Event) => void
  onmessage?: (event: MessageEvent) => void

  constructor(url: string) {
    this.url = url
    this.readyState = WebSocket.CONNECTING

    // Simulate connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Echo back for testing
    setTimeout(() => {
      this.onmessage?.(new MessageEvent('message', { data }))
    }, 0)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}
