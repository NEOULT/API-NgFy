
import playlist from "../schemas/playlist.js";
import BaseModel from "../utils/baseModel.js";

class PlaylistModel extends BaseModel {

    
    constructor() {
        super(playlist);
    }

    getSongsByPlaylistId = async (playlistId) => {
        const playlistData = await this.model.findById(playlistId).populate('songs');
        if (!playlistData) {
            throw new Error("Playlist not found");
        }
        return playlistData;
    }

    updateSongInPlaylist = async (playlistId, songId, action = 'add') => {
        const playlistData = await this.model.findById(playlistId);
        if (!playlistData) {
            throw new Error("Playlist not found");
        }
        if (action === 'add') {
            if (playlistData.songs.includes(songId)) {
                throw new Error("Song already exists in the playlist");
            }
            playlistData.songs.push(songId);
        } else if (action === 'remove') {
            if (!playlistData.songs.includes(songId)) {
                throw new Error("Song not found in the playlist");
            }
            playlistData.songs = playlistData.songs.filter(song => song.toString() !== songId);
        } else {
            throw new Error("Invalid action. Use 'add' or 'remove'.");
        }
        return await playlistData.save();
    }
    
}

export default new PlaylistModel();
