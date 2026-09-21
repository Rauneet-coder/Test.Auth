// This is the code for connecting to a mongoDB database using mongoose.
// And i have added a dotenv package to load the ennviroment variables from a .env 
// file with try and catch block to handle any errors

import mongoose from "mongoose";
import config from "./config.js"


async function connectDB(){
 try{
    await mongoose.connect(config.MONGO_URL);
    console.log("Connected to MongoDB");
}catch(err){
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
}
}   

export default connectDB;