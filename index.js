import express from "express";
import axios from "axios";
import { createClient } from "redis"; //https://www.npmjs.com/package/redis

const app = express();

const redisHost = "redis";
const redisPort = 6379;
console.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

const client = createClient({
  socket: {
    host: redisHost,
    port: redisPort,
  },
});

client.on("error", (err) => {
  console.log("Redis Client Error " + err);
});

async function connectWithRetry(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await client.connect();
      console.log("Connected to Redis");
      return;
    } catch (err) {
      console.error(`Redis connection failed (attempt ${i + 1}):`, err.message);
      if (i < retries - 1) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

(async () => {
  try {
    await connectWithRetry();

    //cached endpoint
    app.get("/photos", async (req, res) => {
      //first read from cache - redis database
      const photos = await client.get("photos");
      if (photos) {
        console.log("Data fetched from cache");
        res.send(photos);
      }
      //if not in cache, fetch from api and store in cache
      else {
        const { data } = await axios.get(
          "https://jsonplaceholder.typicode.com/photos"
        );
        console.log("Data fetched from API");

        await client.set("photos", JSON.stringify(data));
        console.log("Data stored in cache");
        res.json(data);
      }
    });

    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }
})();
