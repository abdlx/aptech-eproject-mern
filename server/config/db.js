import mongoose from 'mongoose';
import { ensureDnsResolver } from './dns.js';

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required. Copy server/.env.example to server/.env.');
  }

  ensureDnsResolver();
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'fitness-tracker',
  });
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

export default connectDB;
