import SongModel from '../models/song.js';
import { AppError } from '../utils/appError.js';
import { supabaseClient } from '../database/supabase.js';
import { sanitizeFileName } from '../utils/sanitizeFilename.js';
import { parseBuffer } from 'music-metadata';
import CategoryService  from './categoryService.js';
import { YtDlp } from 'ytdlp-nodejs'
import ytSearch from 'yt-search'
import path from 'path';
import fs from 'fs/promises';
class SongService {
    // =================== Utility Methods ===================
    /**
     * Espera hasta que el archivo exista y tenga tamaño > 0 (timeout de 10s)
     */
    async waitForFile(filePath, timeout = 60000) {
        const start = Date.now();
        const fsSync = await import('fs');
        while (Date.now() - start < timeout) {
            if (fsSync.existsSync(filePath)) {
                const stats = fsSync.statSync(filePath);
                if (stats.size > 0) return true;
            }
            await new Promise(res => setTimeout(res, 200));
        }
        throw new AppError("El archivo de audio no se terminó de escribir a tiempo", 500, { filePath });
    }

    // =================== CRUD Methods ===================
    /**
     * Crea una nueva canción en la base de datos y sube el archivo a Supabase.
     * Si falla la validación o la creación, elimina el archivo de Supabase.
     */
    async createSong(songData) {
        // Validación explícita de título único
        const existing = await SongModel.findOne({ title: songData.title });
        if (existing) {
            throw new AppError("Ya existe una canción con ese título", 400, { title: songData.title });
        }

        // Obtener duración del archivo de audio
        let duration = 0;
        try {
            const metadata = await parseBuffer(songData.file.buffer, songData.file.mimetype);
            duration = Math.round(metadata.format.duration); // duración en segundos
        } catch (error) {
            console.log("No se pudo obtener la duración del archivo:", error);
            throw new AppError("No se pudo obtener la duración del archivo de audio", 400, error);
        }

        // Validar datos usando el modelo Mongoose real
        const { default: Song } = await import('../schemas/song.js');
        const tempSong = new Song({ ...songData, file: undefined, url: 'http://temporal.mp3' });
        try {
            await tempSong.validate();
        } catch (error) {
            console.log(error);
            throw new AppError("Datos de la canción no válidos", 400, error);
        }

        const response = await this.uploadSong(songData.file, songData.title);
        songData.url = process.env.SUPABASE_URL_UPLOAD + "/" + response.path;
        songData.duration = duration; // Asignar duración calculada

        let song;
        try {
            song = await SongModel.create(songData);
            if (!song) throw new AppError("Error al crear la canción", 400, "SongService.createSong");
        } catch (error) {
            await supabaseClient.storage.from('audios').remove([response.path]);
            throw error;
        }

        if (songData.user) {
            const UserModel = (await import('../schemas/user.js')).default;
            try {
                await UserModel.findByIdAndUpdate(
                    songData.user,
                    { $push: { created_songs: song._id } },
                    { new: true }
                );
            } catch (error) {
                await SongModel.findByIdAndDelete(song._id);
                await supabaseClient.storage.from('audios').remove([response.path]);
                throw new AppError("Error al guardar referencia en el usuario. Canción eliminada.", 500, error);
            }
        }

        return song;
    }

    /**
     * Actualiza los datos de una canción. Si hay archivo, lo sube/upserta en Supabase y actualiza la URL.
     * Si el título cambia, elimina el archivo anterior.
     */
    async updateSong(songId, songData) {
        console.log('songData', songData);
        
        const currentSong = await SongModel.findById(songId);
        if (!currentSong) throw new AppError("Song not found", 404, "SongService.updateSong");
        // Validación de título único solo si el título está cambiando
        if (songData.title && songData.title !== currentSong.title) {
            const existing = await SongModel.findOne({ title: songData.title });
            if (existing) {
                throw new AppError("Ya existe una canción con ese título", 400, { title: songData.title });
            }
        }
        let ext = '';
        let safeTitle = '';
        let fileName = '';
        if (songData.file) {
            ext = songData.file.originalname.substring(songData.file.originalname.lastIndexOf('.'));
            safeTitle = sanitizeFileName(songData.title);
            fileName = safeTitle + ext;
            const { data, error } = await supabaseClient.storage.from('audios').upload(
                fileName,
                songData.file.buffer,
                {
                    cacheControl: '3600',
                    upsert: true,
                    contentType: songData.file.mimetype
                }
            );
            if (error) throw new AppError("Error uploading song", 500, error);
            songData.url = process.env.SUPABASE_URL_UPLOAD + "/" + data.path;
        }
        const song = await SongModel.update(songId, songData);
        if (!song) throw new AppError("Song not found", 404, "SongService.updateSong");
        return song;
    }

    /**
     * Elimina una canción de la base de datos y su archivo de Supabase.
     */
    async deleteSong(songId) {
        const song = await SongModel.findById(songId);
        if (!song) throw new AppError("Song not found", 404, "SongService.deleteSong");
        if (song.url) {
            const urlParts = song.url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabaseClient.storage.from('audios').remove([fileName]);
        }
        return song;
    }

    /**
     * Obtiene una canción por su ID y una canción parecida (por título o aleatoria por categoría).
     */
    async getSongById(songId) {
        const song = await SongModel.findById(songId);
        if (!song) throw new AppError("Song not found", 404, "SongService.getSongById");

        // Buscar una canción parecida por título (excluyendo la actual)
        let similarSong = await SongModel.findOne({
            title: { $regex: song.title.split(' ')[0], $options: 'i' },
            _id: { $ne: songId }
        });

        // Si no se encuentra por título, buscar una aleatoria por categoría
        if (!similarSong && song.category) {
            const [randomSong] = await SongModel.model.aggregate([
                { $match: { category: song.category, _id: { $ne: song._id } } },
                { $sample: { size: 1 } }
            ]);
            similarSong = randomSong || null;
        }

        return {
            song,
            similar: similarSong || null
        };
    }

    /**
     * Obtiene canciones paginadas según filtro y opciones.
     */
    async getPaginatedSongs(filter = {}, options = { currentPage: 1, limit: 10 }) {
        const data = await SongModel.paginate(filter, options);
        return data;
    }

    // =================== Upload Methods ===================
    /**
     * Sube un archivo de canción a Supabase usando el título como nombre de archivo.
     */
    async uploadSong(songFile, songTitle) {
        const ext = songFile.originalname.substring(songFile.originalname.lastIndexOf('.'));
        const safeTitle = sanitizeFileName(songTitle);
        const fileName = safeTitle + ext;
        const { data, error } = await supabaseClient.storage.from('audios').upload(
            fileName,
            songFile.buffer,
            {
                cacheControl: '3600',
                upsert: false,
                contentType: songFile.mimetype
            }
        );
        if (error) throw new AppError("Error uploading song", 500, error);
        return data;
    }

    /**
     * Busca videos de YouTube por nombre/título y devuelve los primeros 20 resultados relevantes.
     */
    async getYoutubeInfoByName(name) {
        try {
            const result = await ytSearch(name);
            
            if (!result || !result.videos || result.videos.length === 0) {
                throw new AppError('No se encontró ningún video para ese nombre', 404, name);
            }
            // Filtrar videos que pesen menos de 10MB (estimación)
            // Suponiendo bitrate promedio de 128kbps para audio (16KB/s)
            const MAX_SIZE_MB = 10;
            const BITRATE_KBPS = 128;
            const BYTES_PER_SEC = (BITRATE_KBPS * 1000) / 8;
            
            // Filtrar solo videos y por tamaño estimado
            const videos = result.videos
                .filter(video => {
                    if (video.type !== 'video') return false;
                    let durationSec = 0;
                    if (video.seconds) durationSec = video.seconds;
                    else if (video.duration && typeof video.duration === 'string') {
                        const parts = video.duration.split(':').map(Number);
                        if (parts.length === 3) durationSec = parts[0]*3600 + parts[1]*60 + parts[2];
                        else if (parts.length === 2) durationSec = parts[0]*60 + parts[1];
                    }
                    const estimatedSizeMB = (durationSec * BYTES_PER_SEC) / (1024 * 1024);
                    return estimatedSizeMB <= MAX_SIZE_MB;
                })
                .slice(0, 10); // Limitar a 10 para evitar sobrecarga

            const ytdlp = new YtDlp();
            const promises = videos.map(async video => {
                let durationSec = 0;
                if (video.seconds) durationSec = video.seconds;
                else if (video.duration && typeof video.duration === 'string') {
                    const parts = video.duration.split(':').map(Number);
                    if (parts.length === 3) durationSec = parts[0]*3600 + parts[1]*60 + parts[2];
                    else if (parts.length === 2) durationSec = parts[0]*60 + parts[1];
                }
                let isDashOrHls = false;
                let isDownloadable = false;
                let downloadError = null;
                try {
                    const info = await ytdlp.getInfoAsync(video.url);
                    if (info && info.formats) {
                        const allSegmented = info.formats.every(f => f.protocol === 'dash' || f.protocol === 'm3u8');
                        isDashOrHls = allSegmented;
                    }
                    try {
                        await ytdlp.download(video.url, {
                            output: 'simulate',
                            simulate: true,
                            extractAudio: true,
                            audioFormat: 'm4a'
                        });
                        isDownloadable = true;
                    } catch (err) {
                        isDownloadable = false;
                        downloadError = err?.message || String(err);
                    }
                } catch (err) {
                    downloadError = err?.message || String(err);
                }
                return {

                    url: video.url,

                };
            });
            return await Promise.all(promises);
        } catch (error) {
            throw new AppError('Error buscando video de YouTube por nombre', 500, error);
        }
    }
    /**
     * Descarga el audio de un video de YouTube, lo sube a Supabase, lo asigna a la categoría 'NGFY' y crea el registro en la base de datos.
     * Si ocurre error al crear el modelo, elimina el archivo de Supabase.
     */
    async downloadYoutubeAudioAndUpload(url) {
        const ytdlp = new YtDlp();
        const info = await ytdlp.getInfoAsync(url);
        const baseName = sanitizeFileName(`${info.title || 'audio_youtube'}`);
        const outputPattern = path.resolve(`${baseName}.%(ext)s`);
        let outputPath = null;
        let audioFile = null;
        let categoryId = null;
        let supabasePath = null;
        try {
            // Buscar la categoría por nombre 'NGFY'
            const CategoryModel = (await import('../schemas/category.js')).default;
            const category = await CategoryModel.findOne({ name: 'Pop' });
            console.log(category);
            
            if (!category) throw new AppError("No existe la categoría 'NGFY'", 400, 'downloadYoutubeAudioAndUpload');
            categoryId = category._id;

            ytdlp.download(url, {
                output: outputPattern,
                extractAudio: true,
                audioFormat: 'm4a'
            });

            console.log('yt-dlp download finished');

            const fsSync = await import('fs');
            const waitTimeout = 60000;
            const pollInterval = 200;
            const start = Date.now();
            let found = false;
            const validExts = ['.m4a', '.webm', '.mp3', '.opus', '.ogg'];
            while (Date.now() - start < waitTimeout) {
                const files = fsSync.readdirSync(process.cwd())
                    .filter(f => validExts.some(ext => f.endsWith(ext)) && f.includes(baseName));
                if (files.length > 0) {
                    files.sort((a, b) => fsSync.statSync(b).mtimeMs - fsSync.statSync(a).mtimeMs);
                    for (const f of files) {
                        const stat = fsSync.statSync(f);
                        if (stat.size > 0) {
                            audioFile = f;
                            outputPath = path.resolve(f);
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
                await new Promise(res => setTimeout(res, pollInterval));
            }
            if (!found) {
                throw new AppError("yt-dlp no generó el archivo de audio a tiempo", 500, { baseName });
            }

            console.log('Archivo de audio listo:', audioFile);
            const buffer = await fs.readFile(outputPath);

            const ext = path.extname(audioFile).toLowerCase();
            let contentType = 'audio/mp4';
            if (ext === '.webm') contentType = 'audio/webm';
            else if (ext === '.mp3') contentType = 'audio/mpeg';
            else if (ext === '.opus') contentType = 'audio/ogg';
            else if (ext === '.ogg') contentType = 'audio/ogg';

            const { data, error } = await supabaseClient.storage.from('audios').upload(
                audioFile,
                buffer,
                {
                    cacheControl: '3600',
                    upsert: false,
                    contentType
                }
            );
            if (error) throw new AppError("Error subiendo audio a Supabase", 500, error);
            await fs.unlink(outputPath);
            supabasePath = data?.path || audioFile;

            const songData = {
                title: info.title,
                artist: info.uploader || info.channel || 'Desconocido',
                url: process.env.SUPABASE_URL_UPLOAD + '/' + supabasePath,
                duration: info.duration || 0,
                poster_image: info.thumbnail || undefined,
                category: categoryId
            };
            let song;
            try {
                song = await SongModel.create(songData);
                if (!song) throw new AppError("Error al crear la canción", 400, "downloadYoutubeAudioAndUpload");
            } catch (error) {
                await supabaseClient.storage.from('audios').remove([supabasePath]);
                throw error;
            }
            return song;
        } catch (error) {
            console.error('Error real al procesar audio de YouTube:', error);
            try {
                const fsSync = await import('fs');
                const validExts = ['.m4a', '.webm', '.mp3', '.opus', '.ogg'];
                const files = fsSync.readdirSync(process.cwd());
                await Promise.all(
                    files.filter(f => validExts.some(ext => f.endsWith(ext)) && f.includes(baseName)).map(async f => {
                        try { await fs.unlink(path.resolve(f)); } catch {}
                    })
                );
            } catch {}
            throw new AppError("Error procesando audio de YouTube", 500, error);
        }
    }

    /**
     * Descarga y sube múltiples audios de YouTube desde un array de URLs.
     */
    async downloadMultipleYoutubeAudios(urls = []) {
        // Si recibes [{url: ...}], conviértelo a [url, url, ...]
        if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'object' && urls[0].url) {
            urls = urls.map(obj => obj.url);
        }
        if (!Array.isArray(urls) || urls.length === 0) {
            throw new AppError("Debes proporcionar un array de URLs", 400, "downloadMultipleYoutubeAudios");
        }
        console.log(urls);
        
        const results = [];
        for (const url of urls) {
            try {
                const song = await this.downloadYoutubeAudioAndUpload(url);
                results.push({ url, success: true, song });
            } catch (error) {
                results.push({ url, success: false, error: error.message || error });
            }
        }
        return results;
    }


    async getCategoriesSong() {
        return await CategoryService.getAllCategories();
    }
}

export default new SongService();