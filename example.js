require("console.table");
const OrderBook = require("./src/OrderBook");

let orderBookL2;
let orderBook10;

const main = async () => {
  orderBookL2 = await OrderBook.open("XBTH18", {
    table: "orderBookL2",
    onUpdate: renderTables,
  });

  orderBook10 = await OrderBook.open("XBTH18", {
    table: "orderBook10",
    onUpdate: renderTables,
    socket: orderBookL2._client.socket, // Choose to re-use existing WebSocket.
  });
};

const renderTables = () => {
  if (!orderBookL2 || !orderBook10) {
    return;
  }

  // The L2 symbol table recieves updates in real-time.
  console.log("L2");
  console.table([...orderBookL2.getAskPrices().reverse(), "", ...orderBookL2.getBidPrices()]);

  // The 10 symbol table is throttled, thus receives less updates.
  console.log("10");
  console.table([...orderBook10.getAskPrices().reverse(), "", ...orderBook10.getBidPrices()]);

  // In the console it will be apparant that L2 changes a lot more often.
};

main();
