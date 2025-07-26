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

    deletePlaylist = catchAsync(async (req, res, next) => {
        const { id: playlistId } = req.params;
        await playlistService.deletePlaylist(playlistId);
        sendResponse(res, 200, 'Lista de reproducción eliminada exitosamente');
    });

    updatedPlaylist = catchAsync(async (req, res, next) => {
        const { id: playlistId } = req.params;
        const updatedData = req.body;
        
        const updatedPlaylist = await playlistService.updatePlaylist(playlistId, updatedData);
        sendResponse(res, 200, 'Lista de reproducción actualizada exitosamente', updatedPlaylist);
    });
}

export default new PlaylistController();