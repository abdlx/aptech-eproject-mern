import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import Migration from './_migrationModel.js';
import { ensureDnsResolver } from '../config/dns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Discover migration files: numbered NNN_*.js, in ascending order.
function loadMigrationFiles() {
  return fs
    .readdirSync(__dirname)
    .filter((file) => /^\d{3}_.+\.js$/.test(file))
    .sort();
}

async function loadMigrations() {
  const files = loadMigrationFiles();
  const migrations = [];
  for (const file of files) {
    const module = await import(pathToFileURL(path.join(__dirname, file)).href);
    const name = module.name || file.replace(/\.js$/, '');
    if (typeof module.up !== 'function') {
      throw new Error(`Migration ${file} is missing an "up" export`);
    }
    migrations.push({ name, up: module.up, down: module.down });
  }
  return migrations;
}

async function connect() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required. Copy server/.env.example to server/.env.');
  }
  ensureDnsResolver();
  const connection = await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'fitness-tracker',
  });
  console.log(`Connected to ${connection.connection.name}`);
}

async function migrateUp() {
  const migrations = await loadMigrations();
  const applied = new Set((await Migration.find().select('name')).map((doc) => doc.name));

  let count = 0;
  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      console.log(`- skipping ${migration.name} (already applied)`);
      continue;
    }
    await migration.up();
    await Migration.create({ name: migration.name });
    console.log(`✓ applied ${migration.name}`);
    count += 1;
  }
  console.log(count ? `Applied ${count} migration(s).` : 'Database already up to date.');
}

async function migrateDown() {
  const last = await Migration.findOne().sort({ appliedAt: -1, name: -1 });
  if (!last) {
    console.log('Nothing to roll back.');
    return;
  }
  const migrations = await loadMigrations();
  const migration = migrations.find((item) => item.name === last.name);
  if (!migration) {
    throw new Error(`Cannot roll back "${last.name}": migration file not found.`);
  }
  if (typeof migration.down !== 'function') {
    throw new Error(`Migration "${last.name}" has no "down" export; cannot roll back.`);
  }
  await migration.down();
  await Migration.deleteOne({ name: last.name });
  console.log(`✓ rolled back ${last.name}`);
}

async function status() {
  const migrations = await loadMigrations();
  const applied = new Map((await Migration.find()).map((doc) => [doc.name, doc.appliedAt]));
  console.log('Migration status:');
  for (const migration of migrations) {
    const at = applied.get(migration.name);
    console.log(`  [${at ? 'x' : ' '}] ${migration.name}${at ? ` (applied ${at.toISOString()})` : ''}`);
  }
}

async function main() {
  const command = process.argv[2] || 'up';
  await connect();
  try {
    if (command === 'up') await migrateUp();
    else if (command === 'down') await migrateDown();
    else if (command === 'status') await status();
    else throw new Error(`Unknown command "${command}". Use: up | down | status`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
  mongoose.disconnect();
});
