const debug = require("debug")("bitmex-orderbook");
const FastMap = require("collections/fast-map");
const BitMEXClient = require("./BitMEXClient");

class OrderBook {
  constructor(data) {
    this.client = null;
    this.onUpdate = null;

    this.asks = new FastMap();
    this.bids = new FastMap();

    Object.assign(this, data);
  }

  static async open({
    symbol,
    table = "orderBookL2",
    cumulative = true,
    timestamp = true,
    depth = 10,
    onUpdate,
    socket,
    ...options
  }) {
    if (!symbol) {
      throw new Error("Missing option `symbol`");
    }

    if (socket && typeof socket.on !== "function") {
      throw new Error("Invalid option `socket`");
    }

    const orderBook = new OrderBook({ symbol, onUpdate });
    orderBook.client = new BitMEXClient({ socket, ...options });

    if (!socket) {
      await orderBook.client.open();
    }

    orderBook.client.subscribe(symbol, table);

    orderBook.client.socket.on("message", message => {
      if (!message.length || message[0] !== "{") {
        return;
      }

      const response = JSON.parse(message) || {};
      const now = new Date();
      let dirty = { asks: false, bids: false };

      if (
        table === "orderBookL2" &&
        response.table === table &&
        response.data &&
        response.data[0] &&
        response.data[0].symbol === symbol
      ) {
        switch (response.action) {
          case "partial":
            orderBook.asks.clear();
            orderBook.bids.clear();
          // noinspection FallThroughInSwitchStatementJS
          case "insert":
            response.data.forEach(entry => {
              if (timestamp) {
                entry.timestamp = now;
              }
              const side = entry.side === "Sell" ? "asks" : "bids";
              orderBook[side].set(entry.id, entry);
              dirty[side] = true;
            });
            break;

          case "update":
            response.data.forEach(entry => {
              if (timestamp) {
                entry.timestamp = now;
              }
              const side = entry.side === "Sell" ? "asks" : "bids";
              const existing = orderBook[side].get(entry.id);
              if (!existing) {
                return;
              }
              orderBook[side].set(entry.id, { ...existing, ...entry });
              dirty[side] = true;
            });
            break;

          case "delete":
            response.data.forEach(entry => {
              const side = entry.side === "Sell" ? "asks" : "bids";
              orderBook[side].delete(entry.id);
            });
            break;
        }
      }

      if (
        table === "orderBook10" &&
        response.table === table &&
        response.data &&
        response.data[0] &&
        response.data[0].symbol === symbol
      ) {
        orderBook.asks.clear();
        orderBook.bids.clear();

        response.data[0].asks.forEach(([price, size], id) => {
          const entry = { symbol, id, side: "Sell", size, price };
          if (timestamp) {
            entry.timestamp = now;
          }
          orderBook.asks.set(entry.id, entry);
        });

        response.data[0].bids.forEach(([price, size], id) => {
          const entry = { symbol, id, side: "Buy", size, price };
          if (timestamp) {
            entry.timestamp = now;
          }
          orderBook.bids.set(entry.id, entry);
        });

        dirty.asks = true;
        dirty.bids = true;
      }

      if (dirty.asks) {
        let entries = orderBook.asks.sorted((a1, a2) => a1.price - a2.price);

        if (depth && entries.length > depth * 2) {
          entries = entries.slice(0, depth);
        }

        if (cumulative) {
          entries.reduce((sum, entry) => {
            entry.cumulative = entry.size + sum;
            return sum + entry.size;
          }, 0);
        }

        orderBook.asks.clear();
        entries.forEach(entry => orderBook.asks.set(entry.id, entry));
      }

      if (dirty.bids) {
        let entries = orderBook.bids.sorted((b1, b2) => b2.price - b1.price);

        if (depth && entries.length > depth * 2) {
          entries = entries.slice(0, depth);
        }

        if (cumulative) {
          entries.reduce((sum, entry) => {
            entry.cumulative = sum + 1 * entry.size;
            return sum + 1 * entry.size;
          }, 0);
        }

        orderBook.bids.clear();
        entries.forEach(entry => orderBook.bids.set(entry.id, entry));
      }

      if (orderBook.onUpdate) {
        orderBook.onUpdate();
      }
    });

    return orderBook;
  }

  getAskPrices(start = 0, count = 5) {
    return this.asks.toArray().slice(start, count);
  }

  getBidPrices(start = 0, count = 5) {
    return this.bids.toArray().slice(start, count);
  }
}

module.exports = OrderBook;
