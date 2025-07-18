import express from 'express';
import SongController from '../controllers/songController.js';
import { upload } from '../middlewares/upload.js';
import { verifyToken } from '../services/authService.js';
import songController from '../controllers/songController.js';

const router = express.Router();

router.get('/download', songController.dowloadYoutubeAudio)
router.get('/search', songController.getYoutubeInfoByName) // GET /songs/search

router.get('/paginate', SongController.paginate); // GET /songs/paginate
router.get('/:id', SongController.getSongById); // GET /songs/:id
router.post('/', upload.single('file'), verifyToken, SongController.create); // POST /songs
router.put('/:id', upload.single('file'), verifyToken, SongController.update); // PUT /songs/:id
router.delete('/:id', SongController.delete); // DELETE /songs/:id
export default router;