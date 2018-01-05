const debug = require("debug")("bitmex-orderbook");
const FastMap = require("collections/fast-map");
const BitMEXClient = require("./BitMEXClient");
const OrderBookEntry = require("./OrderBookEntry");

class OrderBook {
  constructor(data) {
    this.symbol = "";
    this.table = "";
    this.depth = 0;
    this.cumulative = false;
    this.onUpdate = null;

    this._client = null;
    this._asks = new FastMap();
    this._bids = new FastMap();

    this.assign(data);
  }

  assign(data) {
    Object.keys(data).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    });

    return this;
  }

  static async open({
    symbol,
    table = "orderBookL2",
    depth = 10,
    cumulative = true,
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

    const orderBook = new OrderBook({ symbol, table, depth, cumulative, onUpdate });
    orderBook._client = new BitMEXClient({ socket, ...options });

    if (!socket) {
      await orderBook._client.open();
    }

    await orderBook._client.subscribe(orderBook.symbol, orderBook.table);
    orderBook._client.socket.on("message", message => this.onMessage(orderBook, message));

    return orderBook;
  }

  static onMessage(orderBook, message) {
    if (!message.length || message[0] !== "{") {
      return;
    }

    const response = JSON.parse(message) || {};
    const now = new Date();
    let dirty = { _asks: false, _bids: false };

    if (
      response.table === "orderBookL2" &&
      response.table === orderBook.table &&
      response.data &&
      response.data[0] &&
      response.data[0].symbol === orderBook.symbol
    ) {
      switch (response.action) {
        case "partial":
          orderBook._asks.clear();
          orderBook._bids.clear();
        // noinspection FallThroughInSwitchStatementJS
        case "insert":
          response.data.forEach(item => {
            const side = item.side === "Sell" ? "_asks" : "_bids";
            orderBook[side].set(item.id, new OrderBookEntry({ ...item, timestamp: now }));
            dirty[side] = true;
          });
          break;

        case "update":
          response.data.forEach(item => {
            const side = item.side === "Sell" ? "_asks" : "_bids";
            const entry = orderBook[side].get(item.id);
            if (!entry) {
              return;
            }
            entry.assign({ ...item, timestamp: now });
            dirty[side] = true;
          });
          break;

        case "delete":
          response.data.forEach(item => {
            const side = item.side === "Sell" ? "_asks" : "_bids";
            orderBook[side].delete(item.id);
          });
          break;
      }
    } else if (
      response.table === "orderBook10" &&
      response.table === orderBook.table &&
      response.data &&
      response.data[0] &&
      response.data[0].symbol === orderBook.symbol
    ) {
      orderBook._asks.clear();
      orderBook._bids.clear();

      response.data[0].asks.forEach(([price, size], id) => {
        orderBook._asks.set(
          id,
          new OrderBookEntry({
            symbol: orderBook.symbol,
            id,
            side: "Sell",
            price,
            size,
            timestamp: now,
          }),
        );
      });

      response.data[0].bids.forEach(([price, size], id) => {
        orderBook._bids.set(
          id,
          new OrderBookEntry({
            symbol: orderBook.symbol,
            id,
            side: "Buy",
            price,
            size,
            timestamp: now,
          }),
        );
      });

      dirty._asks = true;
      dirty._bids = true;
    }

    if (dirty._asks) {
      let entries = orderBook._asks.sorted((a1, a2) => a1.price - a2.price);

      if (entries.length > orderBook.depth * 2) {
        entries = entries.slice(0, orderBook.depth);
      }

      if (orderBook.cumulative) {
        entries.reduce((sum, entry) => {
          entry.cumulative = entry.size + sum;
          return sum + entry.size;
        }, 0);
      }

      orderBook._asks.clear();
      entries.forEach(entry => entry && orderBook._asks.set(entry.id, entry));
    }

    if (dirty._bids) {
      let entries = orderBook._bids.sorted((b1, b2) => b2.price - b1.price);

      if (entries.length > orderBook.depth * 2) {
        entries = entries.slice(0, orderBook.depth);
      }

      if (orderBook.cumulative) {
        entries.reduce((sum, entry) => {
          entry.cumulative = sum + 1 * entry.size;
          return sum + 1 * entry.size;
        }, 0);
      }

      orderBook._bids.clear();
      entries.forEach(entry => entry && orderBook._bids.set(entry.id, entry));
    }

    if (orderBook.onUpdate) {
      orderBook.onUpdate();
    }
  }

  getAskPrices(start = 0, count = 5) {
    return this._asks.toArray().slice(start, count);
  }

  getBidPrices(start = 0, count = 5) {
    return this._bids.toArray().slice(start, count);
  }
}

module.exports = OrderBook;
