import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

class SSEManager {
  // Active operator dashboard streams
  private operatorClients: Map<string, Response> = new Map();

  // Active customer ticket streams: tokenOrId -> Map<clientId, Response>
  private tokenClients: Map<string, Map<string, Response>> = new Map();

  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Keep-alive ping every 25 seconds to prevent routers/proxies from dropping idle connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const pingMessage = ': keepalive\n\n';

      // Ping operators
      this.operatorClients.forEach((res) => {
        try {
          res.write(pingMessage);
        } catch {
          // Socket closed
        }
      });

      // Ping customers
      this.tokenClients.forEach((clients) => {
        clients.forEach((res) => {
          try {
            res.write(pingMessage);
          } catch {
            // Socket closed
          }
        });
      });
    }, 25000);
  }

  /**
   * Register an Operator POS stream
   */
  addOperatorClient(clientId: string, res: Response): void {
    this.setupSSEHeaders(res);
    this.operatorClients.set(clientId, res);

    // Send initial connected acknowledgement
    this.sendEvent(res, 'CONNECTED', {
      message: 'Operator SSE telemetry stream established',
      activeOperators: this.operatorClients.size,
    });
  }

  /**
   * Remove an Operator stream on client disconnect
   */
  removeOperatorClient(clientId: string): void {
    this.operatorClients.delete(clientId);
  }

  /**
   * Register a Customer Ticket stream for a specific token
   */
  addTokenClient(tokenOrId: string, clientId: string, res: Response): void {
    this.setupSSEHeaders(res);
    const key = tokenOrId.toUpperCase();

    if (!this.tokenClients.has(key)) {
      this.tokenClients.set(key, new Map());
    }

    this.tokenClients.get(key)!.set(clientId, res);

    // Send initial connected acknowledgement
    this.sendEvent(res, 'CONNECTED', {
      message: `Live telemetry connected for ticket ${key}`,
      token: key,
    });
  }

  /**
   * Remove a Customer Ticket stream on client disconnect
   */
  removeTokenClient(tokenOrId: string, clientId: string): void {
    const key = tokenOrId.toUpperCase();
    const clients = this.tokenClients.get(key);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.tokenClients.delete(key);
      }
    }
  }

  /**
   * Broadcast when a new order is created:
   * Alert all operators so the order pops onto their POS queue immediately!
   */
  broadcastOrderCreated(order: any): void {
    this.operatorClients.forEach((res) => {
      this.sendEvent(res, 'ORDER_CREATED', order);
    });
  }

  /**
   * Broadcast when an order's status advances:
   * 1. Updates all Operator dashboards
   * 2. Updates the specific Customer viewing that digital ticket
   */
  broadcastStatusChanged(order: any): void {
    // 1. Alert operators
    this.operatorClients.forEach((res) => {
      this.sendEvent(res, 'STATUS_CHANGED', order);
    });

    // 2. Alert customers watching by token_number or by numeric ID
    const tokenKey = String(order.token_number || '').toUpperCase();
    const idKey = String(order.id);

    const targetSubscribers: Response[] = [];

    if (tokenKey && this.tokenClients.has(tokenKey)) {
      this.tokenClients.get(tokenKey)!.forEach((res) => targetSubscribers.push(res));
    }
    if (idKey && this.tokenClients.has(idKey)) {
      this.tokenClients.get(idKey)!.forEach((res) => targetSubscribers.push(res));
    }

    targetSubscribers.forEach((res) => {
      this.sendEvent(res, 'STATUS_CHANGED', order);
    });
  }

  /**
   * Helper to set standard SSE response headers
   */
  private setupSSEHeaders(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering in NGINX/cloud load balancers
    });
    res.flushHeaders?.();
  }

  /**
   * Helper to format and send a standard SSE frame
   */
  private sendEvent(res: Response, eventType: string, data: any): void {
    try {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Stream write error (handled on close)
    }
  }
}

export const sseManager = new SSEManager();
export default sseManager;
