import express from 'express';
import streamifier from 'streamifier';
const router = express.Router();

import { upload } from '../middlewares/upload.js';
import cloudinary from '../utils/cloudinary.js';

router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    const { type, id, userId, recipeId, groupId, stepId, categoryName } = req.body;

    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const metadata = { userId, recipeId, groupId, categoryName, stepId };

    const folder = getCloudinaryFolder(type, metadata);
    const public_id = id ? `${folder}/${id}-${Date.now()}` : undefined;

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ error: 'Image upload failed' });
        }
        return res.json({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Image upload failed' });
  }
});

function getCloudinaryFolder(type, metadata = {}) {
  switch (type) {
    case 'profile':
      return metadata.userId ? `users/${metadata.userId}/profiles` : 'users/profiles';

    case 'recipe':
      return metadata.recipeId ? `recipes/${metadata.recipeId}/cover` : 'recipes/cover';

    case 'recipe_step':
      return metadata.recipeId
        ? `recipes/${metadata.recipeId}/steps/${metadata.stepId}`
        : 'recipes/steps';

    case 'group':
      return metadata.groupId ? `groups/${metadata.groupId}` : 'groups';

    case 'category':
      return metadata.categoryName
        ? `categories/${metadata.categoryName}`
        : 'categories';

    default:
      return 'misc';
  }
}

export default router;
