import { verifyToken } from "../services/authService.js";
import express from 'express';
import playlistController from "../controllers/playlistController.js";

const router = express.Router();

router.get('/', verifyToken, playlistController.getAllPlaylists);
router.get('/:id', verifyToken, playlistController.getSongsByPlaylistId);
router.post('/', verifyToken, playlistController.createPlaylist);
router.put('/:id', verifyToken, playlistController.updateSongInPlaylist);

export default router;
