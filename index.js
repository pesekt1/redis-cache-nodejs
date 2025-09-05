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

    // Get all photos, cache key: "photos"
    app.get("/photos", async (req, res) => {
      const photos = await client.get("photos");
      if (photos) {
        console.log("Data fetched from cache (all photos)");
        res.send(photos);
      } else {
        const { data } = await axios.get(
          "https://jsonplaceholder.typicode.com/photos"
        );
        console.log("Data fetched from API (all photos)");
        await client.set("photos", JSON.stringify(data));
        console.log("Data stored in cache (all photos)");
        res.json(data);
      }
    });

    // Get a single photo by id, cache key: "photo:{id}"
    app.get("/photos/:id", async (req, res) => {
      const id = req.params.id;
      const cacheKey = `photo:${id}`;
      const photo = await client.get(cacheKey);
      if (photo) {
        console.log(`Data fetched from cache (photo ${id})`);
        res.send(photo);
      } else {
        const { data } = await axios.get(
          `https://jsonplaceholder.typicode.com/photos/${id}`
        );
        console.log(`Data fetched from API (photo ${id})`);
        await client.set(cacheKey, JSON.stringify(data));
        console.log(`Data stored in cache (photo ${id})`);
        res.json(data);
      }
    });

    // Get photos by albumId, RESTful: "/albums/:albumId/photos", cache key: "photos:album:{albumId}"
    app.get("/albums/:albumId/photos", async (req, res) => {
      const albumId = req.params.albumId;
      const cacheKey = `photos:album:${albumId}`;
      const albumPhotos = await client.get(cacheKey);
      if (albumPhotos) {
        console.log(`Data fetched from cache (album ${albumId})`);
        res.send(albumPhotos);
      } else {
        const { data } = await axios.get(
          `https://jsonplaceholder.typicode.com/albums/${albumId}/photos`
        );
        console.log(`Data fetched from API (album ${albumId})`);
        await client.set(cacheKey, JSON.stringify(data));
        console.log(`Data stored in cache (album ${albumId})`);
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
