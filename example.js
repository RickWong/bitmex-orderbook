require("console.table");
const OrderBook = require("./src/OrderBook");

const main = async () => {
  let orderBookL2, orderBook10;

  orderBookL2 = await OrderBook.open({
    symbol: "XBTH18",
    table: "orderBookL2",
    onUpdate() {
      // This symbol table recieves updates in real-time.
      console.log("L2");
      console.table([
        ...orderBookL2.getAskPrices().reverse(),
        "---",
        ...orderBookL2.getBidPrices(),
      ]);

      // This symbol table is throttled, thus receives less updates. Let's compare.
      console.log("10");
      console.table([
        ...orderBook10.getAskPrices().reverse(),
        "---",
        ...orderBook10.getBidPrices(),
      ]);
    },
  });

  orderBook10 = await OrderBook.open({
    socket: orderBookL2._client.socket,
    symbol: "XBTH18",
    table: "orderBook10",
    onUpdate() {},
  });
};

main();
