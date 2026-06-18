const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const apirouter = require("./routers/apirouter");
const mongoose = require("mongoose");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "*", // Allow all origins (for development)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(`${process.env.DB_URL}/${process.env.DB_NAME}`)
  .then(() => {
    console.log("MongoDB database connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });







app.use('/api', apirouter);
app.listen(process.env.PORT, () => { console.log(`Server is running on ${process.env.PORT}`) });

