# BitMEX OrderBook

The fastest order book implementation for the BitMEX WebSocket API.

## Install

```sh
yarn add bitmex-orderbook
```

Or you can use npm.

## Usage

```js
const OrderBook = require("bitmex-orderbook");

const main = async () => {
    const orderBook = new OrderBook(options = {});
    await orderBook.open();
    
    if (orderBook.connected) {
        orderBook.subscribe('symbol');
            
        orderBook.on("update", () => {
            orderBook.getBidPrices(start = 0, count = 5);
            orderBook.getAskPrices(1, count = 9);
        });
        
        orderBook.on("close", () => {
            orderBook.connect();
        });
        
        const listener = orderBook.on("error", (err) => {});
        listener.remove();
    }
};
```

## License

MIT.

## Copyright

© Rick Wong
