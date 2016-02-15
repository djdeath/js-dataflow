const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;

//
let loadFile = function(path) {
  let file = Gio.File.new_for_path(path);
  let [, source] = file.load_contents(null);
  return '' + source;
};

let loadURI = function(uri) {
  let file = Gio.File.new_for_uri(uri);
  let [, source] = file.load_contents(null);
  return '' + source;
};

let _filenames = {};
let _timeout = 0;

let saveFiles = function() {
  for (let filename in _filenames) {
    try {
      GLib.file_set_contents(filename,
                             _filenames[filename],
                             _filenames[filename].length);
    } catch (error) {
      log('Cannot save file ' + filename + ' : ' + error.message);
    }
  }
  _filenames = {};
};

let delayedSaveFile = function(file, content) {
  _filenames[file] = content;
  if (_timeout)
    return;

  _timeout = Mainloop.timeout_add(250, function() {
    saveFiles();
    _timeout = 0;
    return false;
  });
};


//
let allocationToString = function(box) {
  return '[' + box.width + 'x' + box.height + ' @ ' + box.x + 'x' + box.y + ']';
};

let copyArrayRange = function(array, from, to) {
  let ret = [], j = 0;
  for (let i = (from ? from : 0); i < (to ? to : array.length); i++)
    ret[j++] = array[i];
  return ret;
};
