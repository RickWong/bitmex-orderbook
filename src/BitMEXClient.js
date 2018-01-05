const debug = require("debug")("bitmex-orderbook");
const WebSocket = require("ws");

class BitMEXClient {
  constructor(options = {}) {
    this.socket = options.socket || null;
    this.connected = this.ws && this.ws.readyState === WebSocket.OPEN;
    this.authenticated = false;
    this.testmode = options.testmode === true || options.testmode === "true";
    this.endpoint =
      options.endpoint ||
      (this.testmode ? "wss://testnet.bitmex.com/realtime" : "wss://www.bitmex.com/realtime");
    this.heartbeat = options.heartbeat || 15 * 1000;
    this.subscriptions = new Set();
    this.lastError = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        this.socket = new WebSocket(this.endpoint);
        let heartbeatInterval;

        this.socket.on("open", () => {
          debug("Connection opened");
          this.connected = this.socket.readyState === WebSocket.OPEN;
          heartbeatInterval = setInterval(() => this.ping(), this.heartbeat);
          this.subscriptions.forEach(symbol => this.subscribe(symbol));
          return resolve(true);
        });

        this.socket.on("close", () => {
          debug("Connection closed");
          clearInterval(heartbeatInterval);
          if (!this.connected) {
            return reject(this.lastError);
          }
          this.connected = false;
        });

        this.socket.on("error", err => {
          debug("Error:", err);
          this.lastError = err;
        });
      }

      this.socket.on("message", message => {
        // debug("Message:", message);
      });
    });
  }

  async ping() {
    return new Promise((resolve, reject) =>
      this.socket.send("ping", {}, (err, res) => {
        err ? reject(err) : resolve(res);
      }),
    );
  }

  async subscribe(symbol, table = "orderBookL2") {
    this.subscriptions.add(symbol);

    return this.sendMessage({ op: "subscribe", args: `${table}:${symbol}` });
  }

  async unsubscribe(symbol, table = "orderBookL2") {
    this.subscriptions.delete(symbol);

    return this.sendMessage({ op: "unsubscribe", args: `${table}:${symbol}` });
  }

  async sendMessage(data) {
    const json = JSON.stringify(data);

    return new Promise((resolve, reject) =>
      this.socket.send(json, {}, (err, res) => {
        err ? reject(err) : resolve(res);
      }),
    );
  }
}

module.exports = BitMEXClient;
