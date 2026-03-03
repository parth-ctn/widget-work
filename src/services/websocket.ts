import { WS_CONFIG } from "../config/constants";
import type { WebSocketMessage, WebSocketSendMessage } from "../types/index";

export type WebSocketMessageHandler = (message: WebSocketMessage) => void;
export type ConnectionStatusHandler = (isConnected: boolean) => void;
export type CleanupHandler = () => void | Promise<void>;

/**
 * WebSocket service class for managing chat connections
 */
export class WebSocketService {
  private ws: WebSocket | null = null;
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private intentionalDisconnect = false;
  private serverError = false; // Track if server sent an error
  private messageHandlers: WebSocketMessageHandler[] = [];
  private connectionHandlers: ConnectionStatusHandler[] = [];
  private cleanupHandlers: CleanupHandler[] = [];

  private socketUrl: string;

  constructor(socketUrl: string) {
    this.socketUrl = socketUrl;
  }

  /**
   * Connect to WebSocket
   */
  connect(): void {
    // Prevent connecting if already connected or connecting
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log("⚠️ WebSocket already connected or connecting, skipping connect() call");
      return;
    }

    console.log("Connecting to socket:", this.socketUrl);
    this.intentionalDisconnect = false;
    this.serverError = false; // Reset server error flag on new connection attempt

    this.ws = new WebSocket(this.socketUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      this.notifyConnectionStatus(true);
      this.startPing();
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket disconnected", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      this.notifyConnectionStatus(false);
      this.stopPing();

      // Don't attempt reconnect if:
      // 1. It was an intentional disconnect
      // 2. Server sent an error (like "No knowledgebase found")
      // 3. Close code indicates a protocol/policy violation (4000-4999)
      const shouldNotReconnect =
        this.intentionalDisconnect ||
        this.serverError ||
        (event.code >= 4000 && event.code < 5000);

      if (shouldNotReconnect) {
        console.log("🚫 Not attempting reconnect:", {
          intentional: this.intentionalDisconnect,
          serverError: this.serverError,
          closeCode: event.code,
        });
        return;
      }

      // Only attempt reconnect for network issues or normal closures
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Check for server errors that should stop reconnection attempts
        if (data.error) {
          console.error("❌ Server error received:", data.error);
          this.serverError = true;

          // Common errors that should not trigger reconnection
          const noReconnectErrors = [
            "No knowledgebase found",
            "Invalid session",
            "Unauthorized",
            "Authentication failed",
            "Invalid agent",
          ];

          if (
            noReconnectErrors.some((err) =>
              data.error.toLowerCase().includes(err.toLowerCase())
            )
          ) {
            console.log(
              "🚫 Fatal server error - will not attempt reconnection"
            );
          }
        }

        this.notifyMessageHandlers(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Execute cleanup handlers
    await this.executeCleanupHandlers();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "close_connection" }));
        } catch (err) {
          console.error("Error sending close_connection message:", err);
        }
        this.ws.close(1000, "Session timed out");
      } else {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  /**
   * Send a message through WebSocket
   */
  send(message: WebSocketSendMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, message not sent");
    }
  }

  /**
   * Register a message handler
   */
  onMessage(handler: WebSocketMessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register a connection status handler
   */
  onConnectionChange(handler: ConnectionStatusHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(
        (h) => h !== handler
      );
    };
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Register a cleanup handler
   */
  onCleanup(handler: CleanupHandler): () => void {
    this.cleanupHandlers.push(handler);
    return () => {
      this.cleanupHandlers = this.cleanupHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, WS_CONFIG.PING_INTERVAL);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.reconnectAttempts < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(
        `🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS}`
      );
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect();
      }, WS_CONFIG.RECONNECT_DELAY);
    } else {
      console.error("❌ Max reconnection attempts (5) reached - will not attempt further reconnects");
    }
  }

  /**
   * Notify all message handlers
   */
  private notifyMessageHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach((handler) => handler(message));
  }

  /**
   * Notify all connection status handlers
   */
  private notifyConnectionStatus(isConnected: boolean): void {
    this.connectionHandlers.forEach((handler) => handler(isConnected));
  }

  /**
   * Execute all cleanup handlers
   */
  private async executeCleanupHandlers(): Promise<void> {
    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        console.error("Error executing cleanup handler:", error);
      }
    }
  }
}
