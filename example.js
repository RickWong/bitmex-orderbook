require("console.table");
const OrderBook = require("./src/OrderBook");

const main = async () => {
  const orderBookL2 = await OrderBook.open({
    symbol: "XBTH18",
    onUpdate() {},
  });

  const orderBook10 = await OrderBook.open({
    socket: orderBookL2._client.socket,
    symbol: "XBTH18",
    table: "orderBook10",
    onUpdate() {
      console.log("L2");
      console.table(orderBookL2.getBidPrices());
      console.log("10");
      console.table(orderBook10.getBidPrices());
    },
  });
};

main();
