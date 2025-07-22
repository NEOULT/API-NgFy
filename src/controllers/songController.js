import SongService from '../services/songService.js';
import { catchAsync, sendResponse } from '../utils/appError.js';

class SongController {
    create = catchAsync(async (req, res, next) => {
        // Solo usuarios con role === true pueden crear canciones
        if (!req.user || req.user.role !== 'author') {
            console.log(req.user,req.user.role);
            
            return sendResponse(res, 403, 'No tienes permisos para crear canciones', null);
        }
        const userId = req.user && req.user.user_id;
        const songData = { ...req.body, file: req.file, user: userId };
        const song = await SongService.createSong(songData);
        sendResponse(res, 201, 'Canción creada exitosamente', { song });
    });

    update = catchAsync(async (req, res, next) => {
        const userId = req.user && req.user.user_id;
        const songData = { ...req.body, file: req.file, user: userId };
        const song = await SongService.updateSong(req.params.id, songData);
        if (!song) {
            return sendResponse(res, 404, 'Canción no encontrada', null);
        }
        sendResponse(res, 200, 'Canción actualizada exitosamente', {
            song,
        });
    });

    delete = catchAsync(async (req, res, next) => {
        const song = await SongService.deleteSong(req.params.id);
        if (!song) {
            return sendResponse(res, 404, 'Canción no encontrada', null);
        }
        sendResponse(res, 200, 'Canción eliminada exitosamente', null);
    });

    getSongById = catchAsync(async (req, res, next) => {
        const song = await SongService.getSongById(req.params.id);
        if (!song) {
            return sendResponse(res, 404, 'Canción no encontrada', null);
        }
        sendResponse(res, 200, 'Canción encontrada exitosamente', {
            song,
        });
    });

    paginate = catchAsync(async (req, res, next) => {
        const { currentPage = 1, limit = 10, ...filters } = req.body;
        const options = {currentPage: parseInt(currentPage), limit: parseInt(limit)}
        const songs = await SongService.getPaginatedSongs(filters, options);
        if (!songs || songs.length === 0) {
            return sendResponse(res, 404, 'No se encontraron canciones', null);
        }
        sendResponse(res, 200, 'Canciones encontradas exitosamente', songs);
    });

    getAll = catchAsync(async (req, res, next) => {
        const songs = await SongService.getAllSongs();
        sendResponse(res, 200, 'Canciones encontradas exitosamente', {
            songs,
        });
    });
}

export default new SongController();