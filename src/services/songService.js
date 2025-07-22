import SongModel from '../models/song.js';
import { AppError } from '../utils/appError.js';
import { supabaseClient } from '../database/supabase.js';
import { sanitizeFileName } from '../utils/sanitizeFilename.js';
import { parseBuffer } from 'music-metadata';

class SongService {
    // =================== Utility Methods ===================
    /**
     * Espera hasta que el archivo exista y tenga tamaño > 0 (timeout de 10s)
     */
    async waitForFile(filePath, timeout = 10000) {
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
     * Obtiene una canción por su ID.
     */
    async getSongById(songId) {
        const song = await SongModel.findById(songId);
        if (!song) throw new AppError("Song not found", 404, "SongService.getSongById");
        return song;
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
}

export default new SongService();