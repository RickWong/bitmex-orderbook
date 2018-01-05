class OrderBookEntry {
  constructor(data) {
    this.symbol = "";
    this.side = "";
    this.price = 0;
    this.size = 0;
    this.cumulative = null;
    this.timestamp = new Date();
    this.id = 0;

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
}

module.exports = OrderBookEntry;
