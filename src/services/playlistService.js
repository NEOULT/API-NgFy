import PlaylistModel from "../models/playlist.js";
import { AppError } from "../utils/appError.js";
class PlaylistService {

    async getSongsByPlaylistId(playlistId) {
        if (!playlistId) throw new AppError("Playlist ID is required", 400, "PlaylistService.getSongsByPlaylistId");
        
        const playlistData = await PlaylistModel.getSongsByPlaylistId(playlistId);
        if (!playlistData) throw new AppError("Playlist not found", 404, "PlaylistService.getSongsByPlaylistId");
        
        return playlistData;
    }

    async createPlaylist(playlistData) {
        console.log(playlistData);
        
        if (!playlistData || !playlistData.name) {
            throw new AppError("Playlist data is required", 400, "PlaylistService.createPlaylist");
        }

        const existing = await PlaylistModel.findOne({ name: playlistData.name });
        if (existing) {
            throw new AppError("Playlist with this name already exists", 400, "PlaylistService.createPlaylist");
        }

        const newPlaylist = await PlaylistModel.create(playlistData);
        if (!newPlaylist) {
            throw new AppError("Failed to create playlist", 500, "PlaylistService.createPlaylist");
        }

        return newPlaylist;
    }

    async updateSongInPlaylist(playlistId, songId, action) {
        if (!playlistId || !songId || !action) {
            throw new AppError("Playlist ID, Song ID, and action are required", 400, "PlaylistService.updateSongInPlaylist");
        }

        const updatedPlaylist = await PlaylistModel.updateSongInPlaylist(playlistId, songId, action);
        if (!updatedPlaylist) {
            throw new AppError("Failed to update playlist", 500, "PlaylistService.updateSongInPlaylist");
        }

        return updatedPlaylist;
    }

    async getAllPlaylists() {
        const playlists = await PlaylistModel.findAll()
        if (!playlists || playlists.length === 0) {
            throw new AppError("No playlists found", 404, "PlaylistService.getAllPlaylists");
        }
        return playlists;
    }

    async getPlaylistsByUserId(userId, options = { currentPage: 1, limit: 10 }) {
        const filter = { user_id: userId };
        const playlists = await PlaylistModel.paginate(filter, options);
        if (!playlists || playlists.data.length === 0) {
            throw new AppError("No playlist found for this user", 404, "PlaylistService.paginate");
        }
        return playlists;
    }
}

export default new PlaylistService();
