import mongoose from 'mongoose';

// Tracks which migrations have been applied, so the runner is idempotent
// and migrations can be applied/rolled back deterministically.
const migrationRecordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'migrations' });

export default mongoose.models.Migration || mongoose.model('Migration', migrationRecordSchema);
