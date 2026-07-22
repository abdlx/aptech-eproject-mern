// ============================================================================
// Author: Abdullah — created this file (feature work added on top of the original
// Fitness Tracker backend by Munawwar).
// ============================================================================

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ensureDnsResolver } from '../config/dns.js';

// Promotes a user to admin. Usage: node scripts/makeAdmin.js <email>
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: node scripts/makeAdmin.js <email>');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required. Copy server/.env.example to server/.env.');
  }
  ensureDnsResolver();
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'fitness-tracker',
  });

  const user = await User.findOneAndUpdate(
    { email },
    { role: 'admin' },
    { new: true },
  ).select('email role');

  if (!user) {
    console.error(`No user found with email "${email}".`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${user.email} is now ${user.role}.`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
  mongoose.disconnect();
});
