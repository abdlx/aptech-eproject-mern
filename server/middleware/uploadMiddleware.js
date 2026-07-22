// ============================================================================
// Original author: Munawwar (base Fitness Tracker backend).
// Modified by: Abdullah — added features on top (see AUTHORS.md for what changed).
// ============================================================================

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Builds a multer instance that stores JPG/PNG images in uploads/<subfolder>.
// Shared by profile pictures and forum post images so the rules stay consistent.
function createUploader(subfolder, fieldLabel) {
  const uploadDirectory = path.resolve(__dirname, `../uploads/${subfolder}`);
  fs.mkdirSync(uploadDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDirectory),
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5000000 },
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
      if (extname && mimetype) return cb(null, true);
      const error = new Error(`Only JPG and PNG ${fieldLabel} are supported`);
      error.status = 400;
      cb(error);
    },
  });
}

// Profile pictures — kept as the default export for backward compatibility.
const upload = createUploader('profilePictures', 'profile pictures');

// Forum/workout post images.
export const postUpload = createUploader('posts', 'post images');

export default upload;
