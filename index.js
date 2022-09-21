import express from "express";
import axios from "axios";
import { createClient } from "redis"; //https://www.npmjs.com/package/redis

const app = express();

//Create a new redis client and connect to cloud redis instance.
// const client = redis.createClient({
//   socket: {
//     host: <HOST>,
//     port: <PORT>,
//   },
//   password: <PASSWORD>,
// });

// Create a new redis client and connect to local redis instance on the default port 6379.
const client = createClient();

client.on("error", (err) => {
  console.log("Redis Client Error " + err);
});

await client.connect().then(() => {
  console.log("Connected to Redis");
});

//cached endpoint
app.get("/photos", async (req, res) => {
  //first read from cache - redis database
  const photos = await client.get("photos");
  if (photos) res.send(photos);
  //if not in cache, fetch from api and store in cache
  else {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos"
    );

    await client.set("photos", JSON.stringify(data));
    res.json(data);
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
