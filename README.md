# RetroArch Playlist Editor
This web app allows you to create and edit .lpl playlist files for RetroArch.

**Features:**
* drag and drop existing playlists and/or content
* sorts content automatically
* massive edits content path and core
* renames unknown content automatically by opening a .rdb database, useful when creating playlists for MAME or FB Alpha (see below)
* compatible with old LPL (<1.7.5) and new JSON (>1.7.6) formats
* useful for editing playlists for handheld and console RetroArch versions
* made in vanilla JS, compatible with all current web browsers

### Usage
RetroArch Playlist Editor interface tries to be as minimalist as possible and it's mostly self-explanatory.

**Import content button:** allows you to browse your files and add content to the current playlist (or just drag and drop them in the window). Alternatively, this button can also be used to open an existing .lpl playlist.

**Selecting items:** multiple selection in the playlist can be done by holding Ctrl or Shift keys

**Edit content button:** lets you edit massively the selected items (set core, content path...)




### Rename content by .rdb database
RetroArch does not identify content names in some systems like MAME or FB Alpha when importing content. e.g.: ```mslug3.zip``` should be named **Metal Slug 3**.
RetroArch Playlist Editor can fix that for you.
1. Open your .lpl playlist file (e.g.: ```MAME.lpl```)
2. Drag and drop the needed .rdb database (e.g.: ```databases/MAME.rdb```)
3. Done!
All content will be identified by its filename and will be renamed correctly (and get the crc tag too). Database files are found in every RetroArch distribution.

