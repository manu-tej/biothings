import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

describe('useWebSocket', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    // Track event listeners
    const eventListeners: { [key: string]: Function[] } = {};
    
    mockWebSocket.addEventListener = jest.fn((event: string, handler: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler);
    });
    
    // Helper to trigger events
    mockWebSocket.triggerEvent = (event: string, data?: any) => {
      const handlers = eventListeners[event] || [];
      handlers.forEach(handler => handler(data));
    };
    
    // Mock WebSocket constructor
    global.WebSocket = jest.fn(() => mockWebSocket) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect to WebSocket', () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws')
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('connecting');
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8000/ws');
  });

  it('should handle successful connection', () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws')
    );

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.triggerEvent('open');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionState).toBe('connected');
  });

  it('should handle incoming messages', () => {
    const onMessage = jest.fn();
    renderHook(() => 
      useWebSocket('ws://localhost:8000/ws', { onMessage })
    );

    const testData = { type: 'test', payload: 'data' };
    
    act(() => {
      mockWebSocket.triggerEvent('message', { 
        data: JSON.stringify(testData) 
      });
    });

    expect(onMessage).toHaveBeenCalledWith(testData);
  });

  it('should handle connection errors', () => {
    const onError = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws', { onError })
    );

    const error = new Event('error');
    
    act(() => {
      mockWebSocket.triggerEvent('error', error);
    });

    expect(result.current.connectionState).toBe('error');
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should handle connection close', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws', { onClose })
    );

    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.triggerEvent('open');
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      mockWebSocket.triggerEvent('close');
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('disconnected');
    expect(onClose).toHaveBeenCalled();
  });

  it('should send messages when connected', () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws')
    );

    // Connect first
    act(() => {
      mockWebSocket.readyState = WebSocket.OPEN;
      mockWebSocket.triggerEvent('open');
    });

    const message = { type: 'test', data: 'hello' };
    
    act(() => {
      result.current.sendMessage(message);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should not send messages when disconnected', () => {
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws')
    );

    const message = { type: 'test', data: 'hello' };
    
    act(() => {
      result.current.sendMessage(message);
    });

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should reconnect automatically after disconnect', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws', { 
        reconnect: true,
        reconnectInterval: 1000 
      })
    );

    // Initial connection
    expect(global.WebSocket).toHaveBeenCalledTimes(1);

    // Simulate disconnect
    act(() => {
      mockWebSocket.triggerEvent('close');
    });

    expect(result.current.connectionState).toBe('disconnected');

    // Fast-forward time to trigger reconnect
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should create new WebSocket
    expect(global.WebSocket).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => 
      useWebSocket('ws://localhost:8000/ws')
    );

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should handle malformed JSON messages', () => {
    const onError = jest.fn();
    const onMessage = jest.fn();
    
    renderHook(() => 
      useWebSocket('ws://localhost:8000/ws', { onMessage, onError })
    );

    act(() => {
      mockWebSocket.triggerEvent('message', { 
        data: 'invalid json{' 
      });
    });

    expect(onMessage).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});