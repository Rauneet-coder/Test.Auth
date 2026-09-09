// This the file for loading the environment variables from a .env file using dotenv package.
import dotenv from "dotenv";
dotenv.config();

if(!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is not defined in the environment variables");
}


const config = {
    MONGO_URL: process.env.MONGO_URL
}

export default config;