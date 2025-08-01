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
        sendResponse(res, 200, 'Canción encontrada exitosamente', song);
    });

    search = catchAsync(async (req, res, next) => {
        const { currentPage, limit, title, category } = req.body;
        const filter = {};

        if (title) {
            filter.title = { $regex: title, $options: 'i' };
        }
        if (category) {
            filter.category = category;
        }

        const options = {
            currentPage: Number(currentPage),
            limit: Number(limit)
        };
        
        const result = await SongService.getPaginatedSongs(filter, options);
        if (!result.data) return sendResponse(res, 404, `No hay Canciones por el término '${title || category}'`);
        sendResponse(res, 200, 'Estas son las Canciones que Encontramos para ti', result);
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

    getYoutubeInfoByName = catchAsync(async (req, res, next) => {
        const name = req.body.name;
        const info = await SongService.getYoutubeInfoByName(name);
        if (!info || info.length === 0) {
            return sendResponse(res, 404, 'No se encontraron resultados para la búsqueda', null);
        }
        sendResponse(res, 200, 'Información de YouTube obtenida exitosamente', {
            info,
        });
    });

    dowloadYoutubeAudio = catchAsync(async (req, res, next) => {
        const url = req.body.url;
        const info = await SongService.downloadYoutubeAudioAndUpload(url);
        if (!info) {
            return sendResponse(res, 404, 'Información de YouTube no encontrada', null);
        }
        sendResponse(res, 200, 'Audio de YouTube descargado exitosamente', {
            info,
        });
    });

    downloadYoutubeMultipleAudios = catchAsync(async (req, res, next) =>{
        const urls = req.body.urls
        const info = await SongService.downloadMultipleYoutubeAudios(urls);
        if (!info) {
            return sendResponse(res, 404, 'Información de YouTube no encontrada', null);
        }
        sendResponse(res, 200, 'Audio de YouTube descargado exitosamente', {
            info,
        });
    })

    getCategoriesSong = catchAsync(async (req, res, next) => {
        const categories = await SongService.getCategoriesSong();
        if (!categories || categories.length === 0) {
            return sendResponse(res, 404, 'No se encontraron categorías', null);
        }
        sendResponse(res, 200, 'Categorías encontradas exitosamente', {
            categories,
        });
    });
}

export default new SongController();