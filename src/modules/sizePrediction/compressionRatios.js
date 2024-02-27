/* eslint-disable object-property-newline, max-len */
'use strict';

const compressionRatios = {
  // Text
  'txt': 0.8, 'html': 0.8, 'css': 0.8, 'js': 0.8, 'xml': 0.8, 'json': 0.8, 'md': 0.8, 'csv': 0.8, 'log': 0.8, 'ini': 0.8, 'yaml': 0.8, 'php': 0.8, 'asp': 0.8, 'jsp': 0.8,
  // Image
  'jpg': 1.0, 'jpeg': 1.0, 'png': 1.0, 'gif': 1.0, 'bmp': 0.8, 'svg': 0.8, 'tif': 0.8, 'tiff': 0.8, 'webp': 1.0, 'ico': 1.0, 'psd': 0.8, 'ai': 0.8, 'heic': 1.0, 'raw': 0.8,
  // Video
  'mp4': 1.0, 'avi': 1.0, 'mkv': 1.0, 'mov': 1.0, 'wmv': 1.0, 'flv': 1.0, 'm4v': 1.0, 'mpg': 1.0, 'mpeg': 1.0, 'webm': 1.0, '3gp': 1.0, 'ogv': 1.0, 'divx': 1.0,
  // Audio
  'mp3': 1.0, 'wav': 0.8, 'aac': 1.0, 'flac': 0.8, 'ogg': 1.0, 'm4a': 1.0, 'wma': 1.0, 'alac': 0.8, 'opus': 1.0, 'ac3': 1.0, 'eac3': 1.0, 'aiff': 0.8, 'amr': 1.0,
  // Archive
  'zip': 1.0, 'rar': 1.0, '7z': 1.0, 'tar': 1.0, 'gz': 1.0, 'bz2': 1.0, 'xz': 1.0, 'lz': 1.0, 'lzma': 1.0, 'tar.gz': 1.0, 'tgz': 1.0, 'zipx': 1.0, 'tar.bz2': 1.0,
  // Document
  'pdf': 0.8, 'docx': 0.8, 'xlsx': 0.8, 'pptx': 0.8, 'odt': 0.8, 'ods': 0.8, 'odp': 0.8, 'doc': 0.8, 'rtf': 0.8, 'epub': 0.8, 'mobi': 0.8,
  // Executable
  'exe': 1.0, 'dll': 1.0, 'so': 1.0, 'bin': 1.0, 'jar': 1.0, 'apk': 1.0, 'dmg': 1.0, 'bat': 1.0, 'sh': 1.0, 'deb': 1.0, 'rpm': 1.0, 'msi': 1.0,
  // Program code
  'c': 0.8, 'cpp': 0.8, 'py': 0.8, 'java': 0.8, 'rb': 0.8, 'swift': 0.8, 'go': 0.8, 'rs': 0.8, 'kt': 0.8, 'ts': 0.8, 'lua': 0.8,
  // Database files
  'sql': 0.8, 'db': 0.8, 'mdb': 0.8, 'accdb': 0.8, 'sqlite': 0.8, 'dbf': 0.8, 'sav': 0.8, 'dat': 0.8,
  // Disk images
  'iso': 0.8, 'img': 0.8, 'vmdk': 0.8, 'vdi': 0.8, 'cue': 0.8, 'nrg': 0.8, 'mdf': 0.8, 'toast': 0.8, 'daa': 0.8, 'gho': 0.8,
  // E-books
  'azw': 0.8, 'azw3': 0.8, 'fb2': 0.8, 'djvu': 0.8, 'ibook': 0.8, 'cbr': 0.8, 'cbz': 0.8, 'lit': 0.8, 'prc': 0.8,
  // 3D models
  'obj': 0.8, 'stl': 0.8, 'fbx': 0.8, 'dae': 0.8, '3ds': 0.8, 'blend': 0.8, 'ply': 0.8, 'max': 0.8, 'c4d': 0.8, 'ma': 0.8, 'mb': 0.8, 'lwo': 0.8,
  // Fonts
  'ttf': 0.8, 'otf': 0.8, 'woff': 0.8, 'woff2': 0.8, 'eot': 0.8, 'sfnt': 0.8, 'pfb': 0.8, 'pfm': 0.8, 'sfd': 0.8, 'fon': 0.8, 'ttc': 0.8,
  // Scientific data
  'nc': 0.8, 'hdf5': 0.8, 'fits': 0.8, 'xls': 0.8, 'mat': 0.8, 'sas7bdat': 0.8, 'sid': 0.8,
  // Vector graphics
  'eps': 0.8, 'swf': 0.8, 'fla': 0.8, 'cdr': 0.8, 'dwg': 0.8, 'dxf': 0.8, 'pl': 0.8, 'sl': 0.8,
  // CAD files
  '3dm': 0.8, 'stp': 0.8, 'step': 0.8, 'igs': 0.8, 'iges': 0.8, 'slt': 0.8, 'skp': 0.8, 'model': 0.8, 'fcstd': 0.8,
  // Script files
  'cmd': 0.8, 'ps1': 0.8, 'vbs': 0.8, 'ahk': 0.8, 'applescript': 0.8, 'bash': 0.8, 'zsh': 0.8, 'fish': 0.8,
  // Email files
  'eml': 0.8, 'msg': 0.8, 'pst': 0.8, 'ost': 0.8, 'mbox': 0.8, 'mbx': 0.8, 'dbx': 0.8, 'emlx': 0.8, 'nws': 0.8, 'vmsg': 0.8, 'tnef': 0.8,
  // Presentations
  'ppt': 0.8, 'pps': 0.8, 'key': 0.8, 'sxi': 0.8, 'prz': 0.8, 'ppsx': 0.8, 'ppsm': 0.8, 'potx': 0.8,
  // Spreadsheets
  'tsv': 0.8, 'slk': 0.8, 'difs': 0.8, 'xlsb': 0.8, 'xlsm': 0.8, 'et': 0.8,
  // Configuration files
  'cfg': 0.8, 'conf': 0.8, 'properties': 0.8, 'toml': 0.8, 'reg': 0.8, 'plist': 0.8,
};

module.exports = { compressionRatios };
