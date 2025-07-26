import playlistService from "../services/playlistService.js";
import { catchAsync, sendResponse } from '../utils/appError.js';

class PlaylistController {
    getSongsByPlaylistId = catchAsync(async (req, res, next) => {
        const playlistId = req.params.id;
        const playlistData = await playlistService.getSongsByPlaylistId(playlistId);
        sendResponse(res, 200, 'Canciones de la lista de reproducción obtenidas exitosamente', {
            songs: playlistData.songs,
        });
    });

    createPlaylist = catchAsync(async (req, res, next) => {
        const playlistData = {
            ...req.body,
            user_id: req.user.user_id
        };
        const newPlaylist = await playlistService.createPlaylist(playlistData);
        sendResponse(res, 201, 'Lista de reproducción creada exitosamente', newPlaylist);
    });

    updateSongInPlaylist = catchAsync(async (req, res, next) => {
        const { id: playlistId } = req.params;
        const { song_id, action } = req.body;
        console.log(`Updating playlist ${playlistId} with song ${song_id} action: ${action}`);
        
        const updatedPlaylist = await playlistService.updateSongInPlaylist(playlistId, song_id, action);
        sendResponse(res, 200, 'Lista de reproducción actualizada exitosamente', updatedPlaylist);
    });

    getAllPlaylists = catchAsync(async (req, res, next) => {
        const playlists = await playlistService.getAllPlaylists();
        sendResponse(res, 200, 'Listas de reproducción obtenidas exitosamente', playlists);
    });

    getPlaylistsByUserId = catchAsync(async (req, res, next) => {
        const userId = req.user.user_id;
        const playlists = await playlistService.getPlaylistsByUserId(userId, { currentPage: 1, limit: 10 });
        if (!playlists || playlists.data.length === 0) {
            return sendResponse(res, 404, 'No se encontraron playlists para este usuario', null);
        }
        sendResponse(res, 200, 'Playlists encontradas exitosamente', playlists);
    });
}

export default new PlaylistController();