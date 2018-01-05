# BitMEX OrderBook

The fastest order book implementation for the BitMEX WebSocket API.

## Install

```sh
yarn add bitmex-orderbook
```

Or you can use `npm install`.

## Example

```js
const OrderBook = require("./src/OrderBook");

const main = async () => {
  const orderBookL2 = await OrderBook.open("XBTH18", {
    onUpdate(orderBookL2) {
      // Top 10 ask prices.
      const bestAskPrices = orderBookL2.getAskPrices(10);
      
      // Top 5 bid prices, starting at third best (index: 2).
      const [thirdBestBid] = orderBookL2.getBidprices(5, 2); 
      
      thirdBestBid.side; // "Buy"
      thirdBestBid.price; // 17341.5
      thirdBestBid.size; // 400
      thirdBestBid.cumulative; // 57 + 372 + 400
      thirdBestBid.timestamp; // Date()
    },
  });
};

main();

```

## Documentation

### `OrderBook.open(symbol, options = {}): Promise`

* `symbol: String` - The instrument symbol. Required.

* `options.table: String` - The order book table to subscribe to. Default: `orderBookL2`, the fastest table on BitMEX.

* `options.depth: Integer` - Number of entries to remember for each side bid and ask. The worst prices are evicted. Default: `20`.

* `options.cumulative: Boolean` - Calculate cumulative sizes automatically (at tiny processing cost). Default: `true`, it's very useful.

* `options.socket: WebSocket` - An open BitMEX WebSocket connection. If left empty a new WebSocket connection will be opened, and stored in `orderBook._client.socket`. 

* `options.onUpdate: Function(OrderBook)` - A function that is invoked whenever the prices are updated.

* `options.testmode` - Connect to the BitMEX test environment. Only used if `options.socket` is empty. Default: `false`.

* `options.hearbeat` - Milliseconds between WebSocket connection pings. Default: `15000`.

* `options.endpoint` - Specifies the wss:// address for a new WebSocket connection. Only used if `options.socket` is empty. Default: `wss://www.bitmex.com/realtime`.

### `OrderBook.getAskPrices(count, skip = 0) : OrderBookEntry`
 
* `count: Integer` - Max number of prices to return. Sorted by best price first. Default: `options.depth`.

* `skip: Integer` - Number of best prices to skip. This is useful with highly volatile markets. Default: `0`.

### `OrderBook.getBidPrices(count, skip = 0) : OrderBookEntry`

Same as `getAskPrices`. Also sorted by best price first.

## License

BSD 3-Clause license. Copyright © 2018 Rick Wong.
