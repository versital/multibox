"use strict";
// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.Synth = exports.Song = exports.Channel = exports.Instrument = exports.EnvelopeSettings = exports.FilterSettings = exports.FilterControlPoint = exports.HarmonicsWave = exports.SpectrumWave = exports.CustomFeedBack = exports.CustomAlgorithm = exports.Operator = exports.Pattern = exports.Note = exports.makeNotePin = exports.parseIntWithDefault = exports.parseFloatWithDefault = exports.clamp = void 0;
var SynthConfig_1 = require("./SynthConfig");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return SynthConfig_1.Config; } });
var EditorConfig_1 = require("../editor/EditorConfig");
var FFT_1 = require("./FFT");
var Deque_1 = require("./Deque");
var Events_1 = require("../global/Events");
var filtering_1 = require("./filtering");
var js_xxhash_1 = require("js-xxhash");
var epsilon = (1.0e-24); // For detecting and avoiding float denormals, which have poor performance.
// For performance debugging:
//let samplesAccumulated: number = 0;
//let samplePerformance: number = 0;
function clamp(min, max, val) {
    max = max - 1;
    if (val <= max) {
        if (val >= min)
            return val;
        else
            return min;
    }
    else {
        return max;
    }
}
exports.clamp = clamp;
function validateRange(min, max, val) {
    if (min <= val && val <= max)
        return val;
    throw new Error("Value ".concat(val, " not in range [").concat(min, ", ").concat(max, "]"));
}
function parseFloatWithDefault(s, defaultValue) {
    var result = parseFloat(s);
    if (Number.isNaN(result))
        result = defaultValue;
    return result;
}
exports.parseFloatWithDefault = parseFloatWithDefault;
function parseIntWithDefault(s, defaultValue) {
    var result = parseInt(s);
    if (Number.isNaN(result))
        result = defaultValue;
    return result;
}
exports.parseIntWithDefault = parseIntWithDefault;
function encode32BitNumber(buffer, x) {
    // 0b11_
    buffer.push(base64IntToCharCode[(x >>> (6 * 5)) & 0x3]);
    //      111111_
    buffer.push(base64IntToCharCode[(x >>> (6 * 4)) & 0x3f]);
    //             111111_
    buffer.push(base64IntToCharCode[(x >>> (6 * 3)) & 0x3f]);
    //                    111111_
    buffer.push(base64IntToCharCode[(x >>> (6 * 2)) & 0x3f]);
    //                           111111_
    buffer.push(base64IntToCharCode[(x >>> (6 * 1)) & 0x3f]);
    //                                  111111
    buffer.push(base64IntToCharCode[(x >>> (6 * 0)) & 0x3f]);
}
// @TODO: This is error-prone, because the caller has to remember to increment
// charIndex by 6 afterwards.
function decode32BitNumber(compressed, charIndex) {
    var x = 0;
    // 0b11_
    x |= base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << (6 * 5);
    //      111111_
    x |= base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << (6 * 4);
    //             111111_
    x |= base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << (6 * 3);
    //                    111111_
    x |= base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << (6 * 2);
    //                           111111_
    x |= base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << (6 * 1);
    //                                  111111
    x |= base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << (6 * 0);
    return x;
}
function encodeUnisonSettings(buffer, v, s, o, e, i) {
    // TODO: make these sign bits more efficient (bundle them together)
    buffer.push(base64IntToCharCode[v]);
    // TODO: make these use bitshifts instead for consistency
    buffer.push(base64IntToCharCode[Number((s > 0))]);
    var cleanS = Math.round(Math.abs(s) * 1000);
    var cleanSDivided = Math.floor(cleanS / 63);
    buffer.push(base64IntToCharCode[cleanS % 63], base64IntToCharCode[cleanSDivided % 63], base64IntToCharCode[Math.floor(cleanSDivided / 63)]);
    buffer.push(base64IntToCharCode[Number((o > 0))]);
    var cleanO = Math.round(Math.abs(o) * 1000);
    var cleanODivided = Math.floor(cleanO / 63);
    buffer.push(base64IntToCharCode[cleanO % 63], base64IntToCharCode[cleanODivided % 63], base64IntToCharCode[Math.floor(cleanODivided / 63)]);
    buffer.push(base64IntToCharCode[Number((e > 0))]);
    var cleanE = Math.round(Math.abs(e) * 1000);
    buffer.push(base64IntToCharCode[cleanE % 63], base64IntToCharCode[Math.floor(cleanE / 63)]);
    buffer.push(base64IntToCharCode[Number((i > 0))]);
    var cleanI = Math.round(Math.abs(i) * 1000);
    buffer.push(base64IntToCharCode[cleanI % 63], base64IntToCharCode[Math.floor(cleanI / 63)]);
}
function convertLegacyKeyToKeyAndOctave(rawKeyIndex) {
    var key = clamp(0, SynthConfig_1.Config.keys.length, rawKeyIndex);
    var octave = 0;
    // This conversion code depends on C through B being
    // available as keys, of course.
    if (rawKeyIndex === 12) {
        // { name: "C+", isWhiteKey: false, basePitch: 24 }
        key = 0;
        octave = 1;
    }
    else if (rawKeyIndex === 13) {
        // { name: "G- (actually F#-)", isWhiteKey: false, basePitch: 6 }
        key = 6;
        octave = -1;
    }
    else if (rawKeyIndex === 14) {
        // { name: "C-", isWhiteKey: true, basePitch: 0 }
        key = 0;
        octave = -1;
    }
    else if (rawKeyIndex === 15) {
        // { name: "oh no (F-)", isWhiteKey: true, basePitch: 5 }
        key = 5;
        octave = -1;
    }
    return [key, octave];
}
var base64IntToCharCode = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 45, 95];
var base64CharCodeToInt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 62, 62, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 0, 0, 0, 0, 63, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 0, 0, 0]; // 62 could be represented by either "-" or "." for historical reasons. New songs should use "-".
var BitFieldReader = /** @class */ (function () {
    function BitFieldReader(source, startIndex, stopIndex) {
        this._bits = [];
        this._readIndex = 0;
        for (var i = startIndex; i < stopIndex; i++) {
            var value = base64CharCodeToInt[source.charCodeAt(i)];
            this._bits.push((value >> 5) & 0x1);
            this._bits.push((value >> 4) & 0x1);
            this._bits.push((value >> 3) & 0x1);
            this._bits.push((value >> 2) & 0x1);
            this._bits.push((value >> 1) & 0x1);
            this._bits.push(value & 0x1);
        }
    }
    BitFieldReader.prototype.read = function (bitCount) {
        var result = 0;
        while (bitCount > 0) {
            result = result << 1;
            result += this._bits[this._readIndex++];
            bitCount--;
        }
        return result;
    };
    BitFieldReader.prototype.readLongTail = function (minValue, minBits) {
        var result = minValue;
        var numBits = minBits;
        while (this._bits[this._readIndex++]) {
            result += 1 << numBits;
            numBits++;
        }
        while (numBits > 0) {
            numBits--;
            if (this._bits[this._readIndex++]) {
                result += 1 << numBits;
            }
        }
        return result;
    };
    BitFieldReader.prototype.readPartDuration = function () {
        return this.readLongTail(1, 3);
    };
    BitFieldReader.prototype.readLegacyPartDuration = function () {
        return this.readLongTail(1, 2);
    };
    BitFieldReader.prototype.readPinCount = function () {
        return this.readLongTail(1, 0);
    };
    BitFieldReader.prototype.readPitchInterval = function () {
        if (this.read(1)) {
            return -this.readLongTail(1, 3);
        }
        else {
            return this.readLongTail(1, 3);
        }
    };
    return BitFieldReader;
}());
var BitFieldWriter = /** @class */ (function () {
    function BitFieldWriter() {
        this._index = 0;
        this._bits = [];
    }
    BitFieldWriter.prototype.clear = function () {
        this._index = 0;
    };
    BitFieldWriter.prototype.write = function (bitCount, value) {
        bitCount--;
        while (bitCount >= 0) {
            this._bits[this._index++] = (value >>> bitCount) & 1;
            bitCount--;
        }
    };
    BitFieldWriter.prototype.writeLongTail = function (minValue, minBits, value) {
        if (value < minValue)
            throw new Error("value out of bounds");
        value -= minValue;
        var numBits = minBits;
        while (value >= (1 << numBits)) {
            this._bits[this._index++] = 1;
            value -= 1 << numBits;
            numBits++;
        }
        this._bits[this._index++] = 0;
        while (numBits > 0) {
            numBits--;
            this._bits[this._index++] = (value >>> numBits) & 1;
        }
    };
    BitFieldWriter.prototype.writePartDuration = function (value) {
        this.writeLongTail(1, 3, value);
    };
    BitFieldWriter.prototype.writePinCount = function (value) {
        this.writeLongTail(1, 0, value);
    };
    BitFieldWriter.prototype.writePitchInterval = function (value) {
        if (value < 0) {
            this.write(1, 1); // sign
            this.writeLongTail(1, 3, -value);
        }
        else {
            this.write(1, 0); // sign
            this.writeLongTail(1, 3, value);
        }
    };
    BitFieldWriter.prototype.concat = function (other) {
        for (var i = 0; i < other._index; i++) {
            this._bits[this._index++] = other._bits[i];
        }
    };
    BitFieldWriter.prototype.encodeBase64 = function (buffer) {
        for (var i = 0; i < this._index; i += 6) {
            var value = (this._bits[i] << 5) | (this._bits[i + 1] << 4) | (this._bits[i + 2] << 3) | (this._bits[i + 3] << 2) | (this._bits[i + 4] << 1) | this._bits[i + 5];
            buffer.push(base64IntToCharCode[value]);
        }
        return buffer;
    };
    BitFieldWriter.prototype.lengthBase64 = function () {
        return Math.ceil(this._index / 6);
    };
    return BitFieldWriter;
}());
function makeNotePin(interval, time, size) {
    return { interval: interval, time: time, size: size };
}
exports.makeNotePin = makeNotePin;
var Note = /** @class */ (function () {
    function Note(pitch, start, end, size, fadeout) {
        if (fadeout === void 0) { fadeout = false; }
        this.uuid = crypto.randomUUID();
        this.pitches = [pitch];
        this.pins = [makeNotePin(0, 0, size), makeNotePin(0, end - start, fadeout ? 0 : size)];
        this.start = start;
        this.end = end;
        this.continuesLastPattern = false;
    }
    Note.prototype.toJSON = function () {
        return {
            uuid: this.uuid,
            pitches: this.pitches,
            pins: this.pins.map(function (p) { return ({ interval: p.interval, time: p.time, size: p.size }); }),
            start: this.start,
            end: this.end,
            continuesLastPattern: this.continuesLastPattern,
        };
    };
    return Note;
}());
exports.Note = Note;
pickMainInterval();
number;
{
    var longestFlatIntervalDuration = 0;
    var mainInterval = 0;
    for (var pinIndex = 1; pinIndex < this.pins.length; pinIndex++) {
        var pinA = this.pins[pinIndex - 1];
        var pinB = this.pins[pinIndex];
        if (pinA.interval == pinB.interval) {
            var duration = pinB.time - pinA.time;
            if (longestFlatIntervalDuration < duration) {
                longestFlatIntervalDuration = duration;
                mainInterval = pinA.interval;
            }
        }
    }
    if (longestFlatIntervalDuration == 0) {
        var loudestSize = 0;
        for (var pinIndex = 0; pinIndex < this.pins.length; pinIndex++) {
            var pin = this.pins[pinIndex];
            if (loudestSize < pin.size) {
                loudestSize = pin.size;
                mainInterval = pin.interval;
            }
        }
    }
    return mainInterval;
}
clone();
Note;
{
    var newNote = new Note(-1, this.start, this.end, 3);
    newNote.pitches = this.pitches.concat();
    newNote.pins = [];
    for (var _i = 0, _a = this.pins; _i < _a.length; _i++) {
        var pin = _a[_i];
        newNote.pins.push(makeNotePin(pin.interval, pin.time, pin.size));
    }
    newNote.continuesLastPattern = this.continuesLastPattern;
    return newNote;
}
getEndPinIndex(part, number);
number;
{
    var endPinIndex = void 0;
    for (endPinIndex = 1; endPinIndex < this.pins.length - 1; endPinIndex++) {
        if (this.pins[endPinIndex].time + this.start > part)
            break;
    }
    return endPinIndex;
}
var Pattern = /** @class */ (function () {
    function Pattern() {
        this.notes = [];
        this.instruments = [0];
    }
    Pattern.prototype.cloneNotes = function () {
        var result = [];
        for (var _i = 0, _a = this.notes; _i < _a.length; _i++) {
            var note = _a[_i];
            result.push(note.clone());
        }
        return result;
    };
    Pattern.prototype.reset = function () {
        this.notes.length = 0;
        this.instruments[0] = 0;
        this.instruments.length = 1;
    };
    Pattern.prototype.toJsonObject = function (song, channel, isModChannel) {
        var noteArray = [];
        for (var _i = 0, _a = this.notes; _i < _a.length; _i++) {
            var note = _a[_i];
            // Only one ins per pattern is enforced in mod channels.
            var instrument = channel.instruments[this.instruments[0]];
            var mod = Math.max(0, SynthConfig_1.Config.modCount - note.pitches[0] - 1);
            var volumeCap = song.getVolumeCapForSetting(isModChannel, instrument.modulators[mod], instrument.modFilterTypes[mod]);
            var pointArray = [];
            for (var _b = 0, _c = note.pins; _b < _c.length; _b++) {
                var pin = _c[_b];
                var useVol = isModChannel ? Math.round(pin.size) : Math.round(pin.size * 100 / volumeCap);
                pointArray.push({
                    "tick": (pin.time + note.start) * SynthConfig_1.Config.rhythms[song.rhythm].stepsPerBeat / SynthConfig_1.Config.partsPerBeat,
                    "pitchBend": pin.interval,
                    "volume": useVol,
                    "forMod": isModChannel,
                });
            }
            var noteObject = {
                "pitches": note.pitches,
                "points": pointArray,
            };
            if (note.start == 0) {
                noteObject["continuesLastPattern"] = note.continuesLastPattern;
            }
            noteArray.push(noteObject);
        }
        var patternObject = { "notes": noteArray };
        if (song.patternInstruments) {
            patternObject["instruments"] = this.instruments.map(function (i) { return i + 1; });
        }
        return patternObject;
    };
    Pattern.prototype.fromJsonObject = function (patternObject, song, channel, importedPartsPerBeat, isNoiseChannel, isModChannel, jsonFormat) {
        if (jsonFormat === void 0) { jsonFormat = "auto"; }
        var format = jsonFormat.toLowerCase();
        if (song.patternInstruments) {
            if (Array.isArray(patternObject["instruments"])) {
                var instruments = patternObject["instruments"];
                var instrumentCount = clamp(SynthConfig_1.Config.instrumentCountMin, song.getMaxInstrumentsPerPatternForChannel(channel) + 1, instruments.length);
                for (var j = 0; j < instrumentCount; j++) {
                    this.instruments[j] = clamp(0, channel.instruments.length, (instruments[j] | 0) - 1);
                }
                this.instruments.length = instrumentCount;
            }
            else {
                this.instruments[0] = clamp(0, channel.instruments.length, (patternObject["instrument"] | 0) - 1);
                this.instruments.length = 1;
            }
        }
        if (patternObject["notes"] && patternObject["notes"].length > 0) {
            var maxNoteCount = Math.min(song.beatsPerBar * SynthConfig_1.Config.partsPerBeat * (isModChannel ? SynthConfig_1.Config.modCount : 1), patternObject["notes"].length >>> 0);
            // TODO: Consider supporting notes specified in any timing order, sorting them and truncating as necessary.
            //let tickClock: number = 0;
            for (var j = 0; j < patternObject["notes"].length; j++) {
                if (j >= maxNoteCount)
                    break;
                var noteObject = patternObject["notes"][j];
                if (!noteObject || !noteObject["pitches"] || !(noteObject["pitches"].length >= 1) || !noteObject["points"] || !(noteObject["points"].length >= 2)) {
                    continue;
                }
                var note = new Note(0, 0, 0, 0);
                note.pitches = [];
                note.pins = [];
                for (var k = 0; k < noteObject["pitches"].length; k++) {
                    var pitch = noteObject["pitches"][k] | 0;
                    if (note.pitches.indexOf(pitch) != -1)
                        continue;
                    note.pitches.push(pitch);
                    if (note.pitches.length >= SynthConfig_1.Config.maxChordSize)
                        break;
                }
                if (note.pitches.length < 1)
                    continue;
                //let noteClock: number = tickClock;
                var startInterval = 0;
                var instrument = channel.instruments[this.instruments[0]];
                var mod = Math.max(0, SynthConfig_1.Config.modCount - note.pitches[0] - 1);
                for (var k = 0; k < noteObject["points"].length; k++) {
                    var pointObject = noteObject["points"][k];
                    if (pointObject == undefined || pointObject["tick"] == undefined)
                        continue;
                    var interval = (pointObject["pitchBend"] == undefined) ? 0 : (pointObject["pitchBend"] | 0);
                    var time = Math.round((+pointObject["tick"]) * SynthConfig_1.Config.partsPerBeat / importedPartsPerBeat);
                    // Only one instrument per pattern allowed in mod channels.
                    var volumeCap = song.getVolumeCapForSetting(isModChannel, instrument.modulators[mod], instrument.modFilterTypes[mod]);
                    // The strange volume formula used for notes is not needed for mods. Some rounding errors were possible.
                    // A "forMod" signifier was added to new JSON export to detect when the higher precision export was used in a file.
                    var size = void 0;
                    if (pointObject["volume"] == undefined) {
                        size = volumeCap;
                    }
                    else if (pointObject["forMod"] == undefined) {
                        size = Math.max(0, Math.min(volumeCap, Math.round((pointObject["volume"] | 0) * volumeCap / 100)));
                    }
                    else {
                        size = ((pointObject["forMod"] | 0) > 0) ? Math.round(pointObject["volume"] | 0) : Math.max(0, Math.min(volumeCap, Math.round((pointObject["volume"] | 0) * volumeCap / 100)));
                    }
                    if (time > song.beatsPerBar * SynthConfig_1.Config.partsPerBeat)
                        continue;
                    if (note.pins.length == 0) {
                        //if (time < noteClock) continue;
                        note.start = time;
                        startInterval = interval;
                    }
                    else {
                        //if (time <= noteClock) continue;
                    }
                    //noteClock = time;
                    note.pins.push(makeNotePin(interval - startInterval, time - note.start, size));
                }
                if (note.pins.length < 2)
                    continue;
                note.end = note.pins[note.pins.length - 1].time + note.start;
                var maxPitch = isNoiseChannel ? SynthConfig_1.Config.drumCount - 1 : SynthConfig_1.Config.maxPitch;
                var lowestPitch = maxPitch;
                var highestPitch = 0;
                for (var k = 0; k < note.pitches.length; k++) {
                    note.pitches[k] += startInterval;
                    if (note.pitches[k] < 0 || note.pitches[k] > maxPitch) {
                        note.pitches.splice(k, 1);
                        k--;
                    }
                    if (note.pitches[k] < lowestPitch)
                        lowestPitch = note.pitches[k];
                    if (note.pitches[k] > highestPitch)
                        highestPitch = note.pitches[k];
                }
                if (note.pitches.length < 1)
                    continue;
                for (var k = 0; k < note.pins.length; k++) {
                    var pin = note.pins[k];
                    if (pin.interval + lowestPitch < 0)
                        pin.interval = -lowestPitch;
                    if (pin.interval + highestPitch > maxPitch)
                        pin.interval = maxPitch - highestPitch;
                    if (k >= 2) {
                        if (pin.interval == note.pins[k - 1].interval &&
                            pin.interval == note.pins[k - 2].interval &&
                            pin.size == note.pins[k - 1].size &&
                            pin.size == note.pins[k - 2].size) {
                            note.pins.splice(k - 1, 1);
                            k--;
                        }
                    }
                }
                if (note.start == 0) {
                    note.continuesLastPattern = (noteObject["continuesLastPattern"] === true);
                }
                else {
                    note.continuesLastPattern = false;
                }
                if ((format != "ultrabox" && format != "slarmoosbox") && instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["tempo"].index) {
                    for (var _i = 0, _a = note.pins; _i < _a.length; _i++) {
                        var pin = _a[_i];
                        var oldMin = 30;
                        var newMin = 1;
                        var old = pin.size + oldMin;
                        pin.size = old - newMin; // convertRealFactor will add back newMin as necessary
                    }
                }
                this.notes.push(note);
            }
        }
    };
    return Pattern;
}());
exports.Pattern = Pattern;
var Operator = /** @class */ (function () {
    function Operator(index) {
        this.frequency = 4;
        this.amplitude = 0;
        this.waveform = 0;
        this.pulseWidth = 0.5;
        this.reset(index);
    }
    Operator.prototype.reset = function (index) {
        this.frequency = 4; //defualt to 1x
        this.amplitude = (index <= 1) ? SynthConfig_1.Config.operatorAmplitudeMax : 0;
        this.waveform = 0;
        this.pulseWidth = 5;
    };
    Operator.prototype.copy = function (other) {
        this.frequency = other.frequency;
        this.amplitude = other.amplitude;
        this.waveform = other.waveform;
        this.pulseWidth = other.pulseWidth;
    };
    return Operator;
}());
exports.Operator = Operator;
var CustomAlgorithm = /** @class */ (function () {
    function CustomAlgorithm() {
        this.name = "";
        this.carrierCount = 0;
        this.modulatedBy = [[], [], [], [], [], []];
        this.associatedCarrier = [];
        this.fromPreset(1);
    }
    CustomAlgorithm.prototype.set = function (carriers, modulation) {
        this.reset();
        this.carrierCount = carriers;
        for (var i = 0; i < this.modulatedBy.length; i++) {
            this.modulatedBy[i] = modulation[i];
            if (i < carriers) {
                this.associatedCarrier[i] = i + 1;
            }
            this.name += (i + 1);
            for (var j = 0; j < modulation[i].length; j++) {
                this.name += modulation[i][j];
                if (modulation[i][j] > carriers - 1) {
                    this.associatedCarrier[modulation[i][j] - 1] = i + 1;
                }
                this.name += ",";
            }
            if (i < carriers) {
                this.name += "|";
            }
            else {
                this.name += ".";
            }
        }
    };
    CustomAlgorithm.prototype.reset = function () {
        this.name = "";
        this.carrierCount = 1;
        this.modulatedBy = [[2, 3, 4, 5, 6], [], [], [], [], []];
        this.associatedCarrier = [1, 1, 1, 1, 1, 1];
    };
    CustomAlgorithm.prototype.copy = function (other) {
        this.name = other.name;
        this.carrierCount = other.carrierCount;
        this.modulatedBy = other.modulatedBy;
        this.associatedCarrier = other.associatedCarrier;
    };
    CustomAlgorithm.prototype.fromPreset = function (other) {
        this.reset();
        var preset = SynthConfig_1.Config.algorithms6Op[other];
        this.name = preset.name;
        this.carrierCount = preset.carrierCount;
        for (var i = 0; i < preset.modulatedBy.length; i++) {
            this.modulatedBy[i] = Array.from(preset.modulatedBy[i]);
            this.associatedCarrier[i] = preset.associatedCarrier[i];
        }
    };
    return CustomAlgorithm;
}());
exports.CustomAlgorithm = CustomAlgorithm;
var CustomFeedBack = /** @class */ (function () {
    function CustomFeedBack() {
        this.name = "";
        this.indices = [[], [], [], [], [], []];
        this.fromPreset(1);
    }
    CustomFeedBack.prototype.set = function (inIndices) {
        this.reset();
        for (var i = 0; i < this.indices.length; i++) {
            this.indices[i] = inIndices[i];
            for (var j = 0; j < inIndices[i].length; j++) {
                this.name += inIndices[i][j];
                this.name += ",";
            }
            this.name += ".";
        }
    };
    CustomFeedBack.prototype.reset = function () {
        this.reset;
        this.name = "";
        this.indices = [[1], [], [], [], [], []];
    };
    CustomFeedBack.prototype.copy = function (other) {
        this.name = other.name;
        this.indices = other.indices;
    };
    CustomFeedBack.prototype.fromPreset = function (other) {
        this.reset();
        var preset = SynthConfig_1.Config.feedbacks6Op[other];
        for (var i = 0; i < preset.indices.length; i++) {
            this.indices[i] = Array.from(preset.indices[i]);
            for (var j = 0; j < preset.indices[i].length; j++) {
                this.name += preset.indices[i][j];
                this.name += ",";
            }
            this.name += ".";
        }
    };
    return CustomFeedBack;
}());
exports.CustomFeedBack = CustomFeedBack;
var SpectrumWave = /** @class */ (function () {
    function SpectrumWave(isNoiseChannel) {
        this.spectrum = [];
        this.hash = -1;
        this.reset(isNoiseChannel);
    }
    SpectrumWave.prototype.reset = function (isNoiseChannel) {
        for (var i = 0; i < SynthConfig_1.Config.spectrumControlPoints; i++) {
            if (isNoiseChannel) {
                this.spectrum[i] = Math.round(SynthConfig_1.Config.spectrumMax * (1 / Math.sqrt(1 + i / 3)));
            }
            else {
                var isHarmonic = i == 0 || i == 7 || i == 11 || i == 14 || i == 16 || i == 18 || i == 21 || i == 23 || i >= 25;
                this.spectrum[i] = isHarmonic ? Math.max(0, Math.round(SynthConfig_1.Config.spectrumMax * (1 - i / 30))) : 0;
            }
        }
        this.markCustomWaveDirty();
    };
    SpectrumWave.prototype.markCustomWaveDirty = function () {
        var hashMult = Synth.fittingPowerOfTwo(SynthConfig_1.Config.spectrumMax + 2) - 1;
        var hash = 0;
        for (var _i = 0, _a = this.spectrum; _i < _a.length; _i++) {
            var point = _a[_i];
            hash = ((hash * hashMult) + point) >>> 0;
        }
        this.hash = hash;
    };
    return SpectrumWave;
}());
exports.SpectrumWave = SpectrumWave;
var SpectrumWaveState = /** @class */ (function () {
    function SpectrumWaveState() {
        this.wave = null;
        this._hash = -1;
    }
    SpectrumWaveState.prototype.getCustomWave = function (settings, lowestOctave) {
        if (this._hash == settings.hash)
            return this.wave;
        this._hash = settings.hash;
        var waveLength = SynthConfig_1.Config.spectrumNoiseLength;
        if (this.wave == null || this.wave.length != waveLength + 1) {
            this.wave = new Float32Array(waveLength + 1);
        }
        var wave = this.wave;
        for (var i = 0; i < waveLength; i++) {
            wave[i] = 0;
        }
        var highestOctave = 14;
        var falloffRatio = 0.25;
        // Nudge the 2/7 and 4/7 control points so that they form harmonic intervals.
        var pitchTweak = [0, 1 / 7, Math.log2(5 / 4), 3 / 7, Math.log2(3 / 2), 5 / 7, 6 / 7];
        function controlPointToOctave(point) {
            return lowestOctave + Math.floor(point / SynthConfig_1.Config.spectrumControlPointsPerOctave) + pitchTweak[(point + SynthConfig_1.Config.spectrumControlPointsPerOctave) % SynthConfig_1.Config.spectrumControlPointsPerOctave];
        }
        var combinedAmplitude = 1;
        for (var i = 0; i < SynthConfig_1.Config.spectrumControlPoints + 1; i++) {
            var value1 = (i <= 0) ? 0 : settings.spectrum[i - 1];
            var value2 = (i >= SynthConfig_1.Config.spectrumControlPoints) ? settings.spectrum[SynthConfig_1.Config.spectrumControlPoints - 1] : settings.spectrum[i];
            var octave1 = controlPointToOctave(i - 1);
            var octave2 = controlPointToOctave(i);
            if (i >= SynthConfig_1.Config.spectrumControlPoints)
                octave2 = highestOctave + (octave2 - highestOctave) * falloffRatio;
            if (value1 == 0 && value2 == 0)
                continue;
            combinedAmplitude += 0.02 * (0, SynthConfig_1.drawNoiseSpectrum)(wave, waveLength, octave1, octave2, value1 / SynthConfig_1.Config.spectrumMax, value2 / SynthConfig_1.Config.spectrumMax, -0.5);
        }
        if (settings.spectrum[SynthConfig_1.Config.spectrumControlPoints - 1] > 0) {
            combinedAmplitude += 0.02 * (0, SynthConfig_1.drawNoiseSpectrum)(wave, waveLength, highestOctave + (controlPointToOctave(SynthConfig_1.Config.spectrumControlPoints) - highestOctave) * falloffRatio, highestOctave, settings.spectrum[SynthConfig_1.Config.spectrumControlPoints - 1] / SynthConfig_1.Config.spectrumMax, 0, -0.5);
        }
        (0, FFT_1.inverseRealFourierTransform)(wave, waveLength);
        (0, FFT_1.scaleElementsByFactor)(wave, 5.0 / (Math.sqrt(waveLength) * Math.pow(combinedAmplitude, 0.75)));
        // Duplicate the first sample at the end for easier wrap-around interpolation.
        wave[waveLength] = wave[0];
        return wave;
    };
    return SpectrumWaveState;
}());
var HarmonicsWave = /** @class */ (function () {
    function HarmonicsWave() {
        this.harmonics = [];
        this.hash = -1;
        this.reset();
    }
    HarmonicsWave.prototype.reset = function () {
        for (var i = 0; i < SynthConfig_1.Config.harmonicsControlPoints; i++) {
            this.harmonics[i] = 0;
        }
        this.harmonics[0] = SynthConfig_1.Config.harmonicsMax;
        this.harmonics[3] = SynthConfig_1.Config.harmonicsMax;
        this.harmonics[6] = SynthConfig_1.Config.harmonicsMax;
        this.markCustomWaveDirty();
    };
    HarmonicsWave.prototype.markCustomWaveDirty = function () {
        var hashMult = Synth.fittingPowerOfTwo(SynthConfig_1.Config.harmonicsMax + 2) - 1;
        var hash = 0;
        for (var _i = 0, _a = this.harmonics; _i < _a.length; _i++) {
            var point = _a[_i];
            hash = ((hash * hashMult) + point) >>> 0;
        }
        this.hash = hash;
    };
    return HarmonicsWave;
}());
exports.HarmonicsWave = HarmonicsWave;
var HarmonicsWaveState = /** @class */ (function () {
    function HarmonicsWaveState() {
        this.wave = null;
        this._hash = -1;
    }
    HarmonicsWaveState.prototype.getCustomWave = function (settings, instrumentType) {
        if (this._hash == settings.hash && this._generatedForType == instrumentType)
            return this.wave;
        this._hash = settings.hash;
        this._generatedForType = instrumentType;
        var harmonicsRendered = (instrumentType == 7 /* InstrumentType.pickedString */) ? SynthConfig_1.Config.harmonicsRenderedForPickedString : SynthConfig_1.Config.harmonicsRendered;
        var waveLength = SynthConfig_1.Config.harmonicsWavelength;
        var retroWave = (0, SynthConfig_1.getDrumWave)(0, null, null);
        if (this.wave == null || this.wave.length != waveLength + 1) {
            this.wave = new Float32Array(waveLength + 1);
        }
        var wave = this.wave;
        for (var i = 0; i < waveLength; i++) {
            wave[i] = 0;
        }
        var overallSlope = -0.25;
        var combinedControlPointAmplitude = 1;
        for (var harmonicIndex = 0; harmonicIndex < harmonicsRendered; harmonicIndex++) {
            var harmonicFreq = harmonicIndex + 1;
            var controlValue = harmonicIndex < SynthConfig_1.Config.harmonicsControlPoints ? settings.harmonics[harmonicIndex] : settings.harmonics[SynthConfig_1.Config.harmonicsControlPoints - 1];
            if (harmonicIndex >= SynthConfig_1.Config.harmonicsControlPoints) {
                controlValue *= 1 - (harmonicIndex - SynthConfig_1.Config.harmonicsControlPoints) / (harmonicsRendered - SynthConfig_1.Config.harmonicsControlPoints);
            }
            var normalizedValue = controlValue / SynthConfig_1.Config.harmonicsMax;
            var amplitude = Math.pow(2, controlValue - SynthConfig_1.Config.harmonicsMax + 1) * Math.sqrt(normalizedValue);
            if (harmonicIndex < SynthConfig_1.Config.harmonicsControlPoints) {
                combinedControlPointAmplitude += amplitude;
            }
            amplitude *= Math.pow(harmonicFreq, overallSlope);
            // Multiply all the sine wave amplitudes by 1 or -1 based on the LFSR
            // retro wave (effectively random) to avoid egregiously tall spikes.
            amplitude *= retroWave[harmonicIndex + 589];
            wave[waveLength - harmonicFreq] = amplitude;
        }
        (0, FFT_1.inverseRealFourierTransform)(wave, waveLength);
        // Limit the maximum wave amplitude.
        var mult = 1 / Math.pow(combinedControlPointAmplitude, 0.7);
        for (var i = 0; i < wave.length; i++)
            wave[i] *= mult;
        (0, SynthConfig_1.performIntegralOld)(wave);
        // The first sample should be zero, and we'll duplicate it at the end for easier interpolation.
        wave[waveLength] = wave[0];
        return wave;
    };
    return HarmonicsWaveState;
}());
var Grain = /** @class */ (function () {
    function Grain() {
        this.delayLinePosition = 0;
        this.ageInSamples = 0;
        this.maxAgeInSamples = 0;
        this.delay = 0;
        this.parabolicEnvelopeAmplitude = 0;
        this.parabolicEnvelopeSlope = 0;
        this.parabolicEnvelopeCurve = 0;
        this.rcbEnvelopeAmplitude = 0;
        this.rcbEnvelopeAttackIndex = 0;
        this.rcbEnvelopeReleaseIndex = 0;
        this.rcbEnvelopeSustain = 0;
    }
    Grain.prototype.initializeParabolicEnvelope = function (durationInSamples, amplitude) {
        this.parabolicEnvelopeAmplitude = 0;
        if (durationInSamples == 0)
            durationInSamples++; //prevent division by 0
        var invDuration = 1.0 / durationInSamples;
        var invDurationSquared = invDuration * invDuration;
        this.parabolicEnvelopeSlope = 4.0 * amplitude * (invDuration - invDurationSquared);
        this.parabolicEnvelopeCurve = -8.0 * amplitude * invDurationSquared;
    };
    Grain.prototype.updateParabolicEnvelope = function () {
        this.parabolicEnvelopeAmplitude += this.parabolicEnvelopeSlope;
        this.parabolicEnvelopeSlope += this.parabolicEnvelopeCurve;
    };
    //rcb is unfinished and unused rn
    Grain.prototype.initializeRCBEnvelope = function (durationInSamples, amplitude) {
        // attack:
        this.rcbEnvelopeAttackIndex = Math.floor(durationInSamples / 6);
        // sustain:
        this.rcbEnvelopeSustain = amplitude;
        // release:
        this.rcbEnvelopeReleaseIndex = Math.floor(durationInSamples * 5 / 6);
    };
    Grain.prototype.updateRCBEnvelope = function () {
        if (this.ageInSamples < this.rcbEnvelopeAttackIndex) { //attack
            this.rcbEnvelopeAmplitude = (1.0 + Math.cos(Math.PI + (Math.PI * (this.ageInSamples / this.rcbEnvelopeAttackIndex) * (this.rcbEnvelopeSustain / 2.0))));
        }
        else if (this.ageInSamples > this.rcbEnvelopeReleaseIndex) { //release
            this.rcbEnvelopeAmplitude = (1.0 + Math.cos(Math.PI * ((this.ageInSamples - this.rcbEnvelopeReleaseIndex) / this.rcbEnvelopeAttackIndex)) * (this.rcbEnvelopeSustain / 2.0));
        } //sustain covered by the end of attack
    };
    Grain.prototype.addDelay = function (delay) {
        this.delay = delay;
    };
    return Grain;
}());
var FilterControlPoint = /** @class */ (function () {
    function FilterControlPoint() {
        this.freq = 0;
        this.gain = SynthConfig_1.Config.filterGainCenter;
        this.type = 2 /* FilterType.peak */;
    }
    FilterControlPoint.prototype.set = function (freqSetting, gainSetting) {
        this.freq = freqSetting;
        this.gain = gainSetting;
    };
    FilterControlPoint.prototype.getHz = function () {
        return FilterControlPoint.getHzFromSettingValue(this.freq);
    };
    FilterControlPoint.getHzFromSettingValue = function (value) {
        return SynthConfig_1.Config.filterFreqReferenceHz * Math.pow(2.0, (value - SynthConfig_1.Config.filterFreqReferenceSetting) * SynthConfig_1.Config.filterFreqStep);
    };
    FilterControlPoint.getSettingValueFromHz = function (hz) {
        return Math.log2(hz / SynthConfig_1.Config.filterFreqReferenceHz) / SynthConfig_1.Config.filterFreqStep + SynthConfig_1.Config.filterFreqReferenceSetting;
    };
    FilterControlPoint.getRoundedSettingValueFromHz = function (hz) {
        return Math.max(0, Math.min(SynthConfig_1.Config.filterFreqRange - 1, Math.round(FilterControlPoint.getSettingValueFromHz(hz))));
    };
    FilterControlPoint.prototype.getLinearGain = function (peakMult) {
        if (peakMult === void 0) { peakMult = 1.0; }
        var power = (this.gain - SynthConfig_1.Config.filterGainCenter) * SynthConfig_1.Config.filterGainStep;
        var neutral = (this.type == 2 /* FilterType.peak */) ? 0.0 : -0.5;
        var interpolatedPower = neutral + (power - neutral) * peakMult;
        return Math.pow(2.0, interpolatedPower);
    };
    FilterControlPoint.getRoundedSettingValueFromLinearGain = function (linearGain) {
        return Math.max(0, Math.min(SynthConfig_1.Config.filterGainRange - 1, Math.round(Math.log2(linearGain) / SynthConfig_1.Config.filterGainStep + SynthConfig_1.Config.filterGainCenter)));
    };
    FilterControlPoint.prototype.toCoefficients = function (filter, sampleRate, freqMult, peakMult) {
        if (freqMult === void 0) { freqMult = 1.0; }
        if (peakMult === void 0) { peakMult = 1.0; }
        var cornerRadiansPerSample = 2.0 * Math.PI * Math.max(SynthConfig_1.Config.filterFreqMinHz, Math.min(SynthConfig_1.Config.filterFreqMaxHz, freqMult * this.getHz())) / sampleRate;
        var linearGain = this.getLinearGain(peakMult);
        switch (this.type) {
            case 0 /* FilterType.lowPass */:
                filter.lowPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
                break;
            case 1 /* FilterType.highPass */:
                filter.highPass2ndOrderButterworth(cornerRadiansPerSample, linearGain);
                break;
            case 2 /* FilterType.peak */:
                filter.peak2ndOrder(cornerRadiansPerSample, linearGain, 1.0);
                break;
            default:
                throw new Error();
        }
    };
    FilterControlPoint.prototype.getVolumeCompensationMult = function () {
        var octave = (this.freq - SynthConfig_1.Config.filterFreqReferenceSetting) * SynthConfig_1.Config.filterFreqStep;
        var gainPow = (this.gain - SynthConfig_1.Config.filterGainCenter) * SynthConfig_1.Config.filterGainStep;
        switch (this.type) {
            case 0 /* FilterType.lowPass */:
                var freqRelativeTo8khz = Math.pow(2.0, octave) * SynthConfig_1.Config.filterFreqReferenceHz / 8000.0;
                // Reverse the frequency warping from importing legacy simplified filters to imitate how the legacy filter cutoff setting affected volume.
                var warpedFreq = (Math.sqrt(1.0 + 4.0 * freqRelativeTo8khz) - 1.0) / 2.0;
                var warpedOctave = Math.log2(warpedFreq);
                return Math.pow(0.5, 0.2 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, Math.max(-3.0, 0.595 * warpedOctave + 0.35 * Math.min(0.0, gainPow + 1.0))));
            case 1 /* FilterType.highPass */:
                return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow + 1.0) + Math.min(0.0, 0.3 * (-octave - Math.log2(SynthConfig_1.Config.filterFreqReferenceHz / 125.0)) + 0.2 * Math.min(0.0, gainPow + 1.0)));
            case 2 /* FilterType.peak */:
                var distanceFromCenter = octave + Math.log2(SynthConfig_1.Config.filterFreqReferenceHz / 2000.0);
                var freqLoudness = Math.pow(1.0 / (1.0 + Math.pow(distanceFromCenter / 3.0, 2.0)), 2.0);
                return Math.pow(0.5, 0.125 * Math.max(0.0, gainPow) + 0.1 * freqLoudness * Math.min(0.0, gainPow));
            default:
                throw new Error();
        }
    };
    return FilterControlPoint;
}());
exports.FilterControlPoint = FilterControlPoint;
var FilterSettings = /** @class */ (function () {
    function FilterSettings() {
        this.controlPoints = [];
        this.controlPointCount = 0;
        this.reset();
    }
    FilterSettings.prototype.reset = function () {
        this.controlPointCount = 0;
    };
    FilterSettings.prototype.addPoint = function (type, freqSetting, gainSetting) {
        var controlPoint;
        if (this.controlPoints.length <= this.controlPointCount) {
            controlPoint = new FilterControlPoint();
            this.controlPoints[this.controlPointCount] = controlPoint;
        }
        else {
            controlPoint = this.controlPoints[this.controlPointCount];
        }
        this.controlPointCount++;
        controlPoint.type = type;
        controlPoint.set(freqSetting, gainSetting);
    };
    FilterSettings.prototype.toJsonObject = function () {
        var filterArray = [];
        for (var i = 0; i < this.controlPointCount; i++) {
            var point = this.controlPoints[i];
            filterArray.push({
                "type": SynthConfig_1.Config.filterTypeNames[point.type],
                "cutoffHz": Math.round(point.getHz() * 100) / 100,
                "linearGain": Math.round(point.getLinearGain() * 10000) / 10000,
            });
        }
        return filterArray;
    };
    FilterSettings.prototype.fromJsonObject = function (filterObject) {
        this.controlPoints.length = 0;
        if (filterObject) {
            for (var _i = 0, filterObject_1 = filterObject; _i < filterObject_1.length; _i++) {
                var pointObject = filterObject_1[_i];
                var point = new FilterControlPoint();
                point.type = SynthConfig_1.Config.filterTypeNames.indexOf(pointObject["type"]);
                if (point.type == -1)
                    point.type = 2 /* FilterType.peak */;
                if (pointObject["cutoffHz"] != undefined) {
                    point.freq = FilterControlPoint.getRoundedSettingValueFromHz(pointObject["cutoffHz"]);
                }
                else {
                    point.freq = 0;
                }
                if (pointObject["linearGain"] != undefined) {
                    point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(pointObject["linearGain"]);
                }
                else {
                    point.gain = SynthConfig_1.Config.filterGainCenter;
                }
                this.controlPoints.push(point);
            }
        }
        this.controlPointCount = this.controlPoints.length;
    };
    // Returns true if all filter control points match in number and type (but not freq/gain)
    FilterSettings.filtersCanMorph = function (filterA, filterB) {
        if (filterA.controlPointCount != filterB.controlPointCount)
            return false;
        for (var i = 0; i < filterA.controlPointCount; i++) {
            if (filterA.controlPoints[i].type != filterB.controlPoints[i].type)
                return false;
        }
        return true;
    };
    // Interpolate two FilterSettings, where pos=0 is filterA and pos=1 is filterB
    FilterSettings.lerpFilters = function (filterA, filterB, pos) {
        var lerpedFilter = new FilterSettings();
        // One setting or another is null, return the other.
        if (filterA == null) {
            return filterA;
        }
        if (filterB == null) {
            return filterB;
        }
        pos = Math.max(0, Math.min(1, pos));
        // Filter control points match in number and type
        if (this.filtersCanMorph(filterA, filterB)) {
            for (var i = 0; i < filterA.controlPointCount; i++) {
                lerpedFilter.controlPoints[i] = new FilterControlPoint();
                lerpedFilter.controlPoints[i].type = filterA.controlPoints[i].type;
                lerpedFilter.controlPoints[i].freq = filterA.controlPoints[i].freq + (filterB.controlPoints[i].freq - filterA.controlPoints[i].freq) * pos;
                lerpedFilter.controlPoints[i].gain = filterA.controlPoints[i].gain + (filterB.controlPoints[i].gain - filterA.controlPoints[i].gain) * pos;
            }
            lerpedFilter.controlPointCount = filterA.controlPointCount;
            return lerpedFilter;
        }
        else {
            // Not allowing morph of unmatching filters for now. It's a hornet's nest of problems, and I had it implemented and mostly working and it didn't sound very interesting since the shape becomes "mushy" in between
            return (pos >= 1) ? filterB : filterA;
        }
    };
    FilterSettings.prototype.convertLegacySettings = function (legacyCutoffSetting, legacyResonanceSetting, legacyEnv) {
        this.reset();
        var legacyFilterCutoffMaxHz = 8000; // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
        var legacyFilterMax = 0.95;
        var legacyFilterMaxRadians = Math.asin(legacyFilterMax / 2.0) * 2.0;
        var legacyFilterMaxResonance = 0.95;
        var legacyFilterCutoffRange = 11;
        var legacyFilterResonanceRange = 8;
        var resonant = (legacyResonanceSetting > 1);
        var firstOrder = (legacyResonanceSetting == 0);
        var cutoffAtMax = (legacyCutoffSetting == legacyFilterCutoffRange - 1);
        var envDecays = (legacyEnv.type == 5 /* EnvelopeType.flare */ || legacyEnv.type == 6 /* EnvelopeType.twang */ || legacyEnv.type == 10 /* EnvelopeType.decay */ || legacyEnv.type == 1 /* EnvelopeType.noteSize */);
        var standardSampleRate = 48000;
        var legacyHz = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
        var legacyRadians = Math.min(legacyFilterMaxRadians, 2 * Math.PI * legacyHz / standardSampleRate);
        if (legacyEnv.type == 0 /* EnvelopeType.none */ && !resonant && cutoffAtMax) {
            // The response is flat and there's no envelopes, so don't even bother adding any control points.
        }
        else if (firstOrder) {
            // In general, a 1st order lowpass can be approximated by a 2nd order lowpass
            // with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
            // However, BeepBox's original lowpass filters behaved oddly as they
            // approach the nyquist frequency, so I've devised this curved conversion
            // to guess at a perceptually appropriate new cutoff frequency and gain.
            var extraOctaves = 3.5;
            var targetRadians = legacyRadians * Math.pow(2.0, extraOctaves);
            var curvedRadians = targetRadians / (1.0 + targetRadians / Math.PI);
            var curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
            var freqSetting = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
            var finalHz = FilterControlPoint.getHzFromSettingValue(freqSetting);
            var finalRadians = 2.0 * Math.PI * finalHz / standardSampleRate;
            var legacyFilter = new filtering_1.FilterCoefficients();
            legacyFilter.lowPass1stOrderSimplified(legacyRadians);
            var response = new filtering_1.FrequencyResponse();
            response.analyze(legacyFilter, finalRadians);
            var legacyFilterGainAtNewRadians = response.magnitude();
            var logGain = Math.log2(legacyFilterGainAtNewRadians);
            // Bias slightly toward 2^(-extraOctaves):
            logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
            // Decaying envelopes move the cutoff frequency back into an area where the best approximation of the first order slope requires a lower gain setting.
            if (envDecays)
                logGain = Math.min(logGain, -1.0);
            var convertedGain = Math.pow(2.0, logGain);
            var gainSetting = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);
            this.addPoint(0 /* FilterType.lowPass */, freqSetting, gainSetting);
        }
        else {
            var intendedGain = 0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
            var invertedGain = 0.5 / intendedGain;
            var maxRadians = 2.0 * Math.PI * legacyFilterCutoffMaxHz / standardSampleRate;
            var freqRatio = legacyRadians / maxRadians;
            var targetRadians = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
            var curvedRadians = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
            var curvedHz = void 0;
            if (envDecays) {
                curvedHz = standardSampleRate * Math.min(curvedRadians, legacyRadians * Math.pow(2, 0.25)) / (2.0 * Math.PI);
            }
            else {
                curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
            }
            var freqSetting = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
            var legacyFilterGain = void 0;
            if (envDecays) {
                legacyFilterGain = intendedGain;
            }
            else {
                var legacyFilter = new filtering_1.FilterCoefficients();
                legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
                var response = new filtering_1.FrequencyResponse();
                response.analyze(legacyFilter, curvedRadians);
                legacyFilterGain = response.magnitude();
            }
            if (!resonant)
                legacyFilterGain = Math.min(legacyFilterGain, Math.sqrt(0.5));
            var gainSetting = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);
            this.addPoint(0 /* FilterType.lowPass */, freqSetting, gainSetting);
        }
        // Added for JummBox - making a 0 point filter does not truncate control points!
        this.controlPoints.length = this.controlPointCount;
    };
    // Similar to above, but purpose-fit for quick conversions in synth calls.
    FilterSettings.prototype.convertLegacySettingsForSynth = function (legacyCutoffSetting, legacyResonanceSetting, allowFirstOrder) {
        if (allowFirstOrder === void 0) { allowFirstOrder = false; }
        this.reset();
        var legacyFilterCutoffMaxHz = 8000; // This was carefully calculated to correspond to no change in response when filtering at 48000 samples per second... when using the legacy simplified low-pass filter.
        var legacyFilterMax = 0.95;
        var legacyFilterMaxRadians = Math.asin(legacyFilterMax / 2.0) * 2.0;
        var legacyFilterMaxResonance = 0.95;
        var legacyFilterCutoffRange = 11;
        var legacyFilterResonanceRange = 8;
        var firstOrder = (legacyResonanceSetting == 0 && allowFirstOrder);
        var standardSampleRate = 48000;
        var legacyHz = legacyFilterCutoffMaxHz * Math.pow(2.0, (legacyCutoffSetting - (legacyFilterCutoffRange - 1)) * 0.5);
        var legacyRadians = Math.min(legacyFilterMaxRadians, 2 * Math.PI * legacyHz / standardSampleRate);
        if (firstOrder) {
            // In general, a 1st order lowpass can be approximated by a 2nd order lowpass
            // with a cutoff ~4 octaves higher (*16) and a gain of 1/16.
            // However, BeepBox's original lowpass filters behaved oddly as they
            // approach the nyquist frequency, so I've devised this curved conversion
            // to guess at a perceptually appropriate new cutoff frequency and gain.
            var extraOctaves = 3.5;
            var targetRadians = legacyRadians * Math.pow(2.0, extraOctaves);
            var curvedRadians = targetRadians / (1.0 + targetRadians / Math.PI);
            var curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
            var freqSetting = FilterControlPoint.getRoundedSettingValueFromHz(curvedHz);
            var finalHz = FilterControlPoint.getHzFromSettingValue(freqSetting);
            var finalRadians = 2.0 * Math.PI * finalHz / standardSampleRate;
            var legacyFilter = new filtering_1.FilterCoefficients();
            legacyFilter.lowPass1stOrderSimplified(legacyRadians);
            var response = new filtering_1.FrequencyResponse();
            response.analyze(legacyFilter, finalRadians);
            var legacyFilterGainAtNewRadians = response.magnitude();
            var logGain = Math.log2(legacyFilterGainAtNewRadians);
            // Bias slightly toward 2^(-extraOctaves):
            logGain = -extraOctaves + (logGain + extraOctaves) * 0.82;
            var convertedGain = Math.pow(2.0, logGain);
            var gainSetting = FilterControlPoint.getRoundedSettingValueFromLinearGain(convertedGain);
            this.addPoint(0 /* FilterType.lowPass */, freqSetting, gainSetting);
        }
        else {
            var intendedGain = 0.5 / (1.0 - legacyFilterMaxResonance * Math.sqrt(Math.max(0.0, legacyResonanceSetting - 1.0) / (legacyFilterResonanceRange - 2.0)));
            var invertedGain = 0.5 / intendedGain;
            var maxRadians = 2.0 * Math.PI * legacyFilterCutoffMaxHz / standardSampleRate;
            var freqRatio = legacyRadians / maxRadians;
            var targetRadians = legacyRadians * (freqRatio * Math.pow(invertedGain, 0.9) + 1.0);
            var curvedRadians = legacyRadians + (targetRadians - legacyRadians) * invertedGain;
            var curvedHz = void 0;
            curvedHz = standardSampleRate * curvedRadians / (2.0 * Math.PI);
            var freqSetting = FilterControlPoint.getSettingValueFromHz(curvedHz);
            var legacyFilterGain = void 0;
            var legacyFilter = new filtering_1.FilterCoefficients();
            legacyFilter.lowPass2ndOrderSimplified(legacyRadians, intendedGain);
            var response = new filtering_1.FrequencyResponse();
            response.analyze(legacyFilter, curvedRadians);
            legacyFilterGain = response.magnitude();
            var gainSetting = FilterControlPoint.getRoundedSettingValueFromLinearGain(legacyFilterGain);
            this.addPoint(0 /* FilterType.lowPass */, freqSetting, gainSetting);
        }
    };
    return FilterSettings;
}());
exports.FilterSettings = FilterSettings;
var EnvelopeSettings = /** @class */ (function () {
    function EnvelopeSettings(isNoiseEnvelope) {
        this.isNoiseEnvelope = isNoiseEnvelope;
        this.target = 0;
        this.index = 0;
        this.envelope = 0;
        //midbox
        this.perEnvelopeSpeed = SynthConfig_1.Config.envelopes[this.envelope].speed;
        this.perEnvelopeLowerBound = 0;
        this.perEnvelopeUpperBound = 1;
        //modulation support
        this.tempEnvelopeSpeed = null;
        this.tempEnvelopeLowerBound = null;
        this.tempEnvelopeUpperBound = null;
        //pseudo random
        this.steps = 2;
        this.seed = 2;
        //lfo and random types
        this.waveform = 0 /* LFOEnvelopeTypes.sine */;
        //moved discrete into here
        this.discrete = false;
        this.reset();
    }
    EnvelopeSettings.prototype.reset = function () {
        this.target = 0;
        this.index = 0;
        this.envelope = 0;
        this.pitchEnvelopeStart = 0;
        this.pitchEnvelopeEnd = this.isNoiseEnvelope ? SynthConfig_1.Config.drumCount - 1 : SynthConfig_1.Config.maxPitch;
        this.inverse = false;
        this.isNoiseEnvelope = false;
        this.perEnvelopeSpeed = SynthConfig_1.Config.envelopes[this.envelope].speed;
        this.perEnvelopeLowerBound = 0;
        this.perEnvelopeUpperBound = 1;
        this.tempEnvelopeSpeed = null;
        this.tempEnvelopeLowerBound = null;
        this.tempEnvelopeUpperBound = null;
        this.steps = 2;
        this.seed = 2;
        this.waveform = 0 /* LFOEnvelopeTypes.sine */;
        this.discrete = false;
    };
    EnvelopeSettings.prototype.toJsonObject = function () {
        var envelopeObject = {
            "target": SynthConfig_1.Config.instrumentAutomationTargets[this.target].name,
            "envelope": SynthConfig_1.Config.newEnvelopes[this.envelope].name,
            "inverse": this.inverse,
            "perEnvelopeSpeed": this.perEnvelopeSpeed,
            "perEnvelopeLowerBound": this.perEnvelopeLowerBound,
            "perEnvelopeUpperBound": this.perEnvelopeUpperBound,
            "discrete": this.discrete,
        };
        if (SynthConfig_1.Config.instrumentAutomationTargets[this.target].maxCount > 1) {
            envelopeObject["index"] = this.index;
        }
        if (SynthConfig_1.Config.newEnvelopes[this.envelope].name == "pitch") {
            envelopeObject["pitchEnvelopeStart"] = this.pitchEnvelopeStart;
            envelopeObject["pitchEnvelopeEnd"] = this.pitchEnvelopeEnd;
        }
        else if (SynthConfig_1.Config.newEnvelopes[this.envelope].name == "random") {
            envelopeObject["steps"] = this.steps;
            envelopeObject["seed"] = this.seed;
            envelopeObject["waveform"] = this.waveform;
        }
        else if (SynthConfig_1.Config.newEnvelopes[this.envelope].name == "lfo") {
            envelopeObject["waveform"] = this.waveform;
            envelopeObject["steps"] = this.steps;
        }
        return envelopeObject;
    };
    EnvelopeSettings.prototype.fromJsonObject = function (envelopeObject, format) {
        this.reset();
        var target = SynthConfig_1.Config.instrumentAutomationTargets.dictionary[envelopeObject["target"]];
        if (target == null)
            target = SynthConfig_1.Config.instrumentAutomationTargets.dictionary["noteVolume"];
        this.target = target.index;
        var envelope = SynthConfig_1.Config.envelopes.dictionary["none"];
        var isTremolo2 = false;
        if (format == "slarmoosbox") {
            if (envelopeObject["envelope"] == "tremolo2") {
                envelope = SynthConfig_1.Config.newEnvelopes[8 /* EnvelopeType.lfo */];
                isTremolo2 = true;
            }
            else if (envelopeObject["envelope"] == "tremolo") {
                envelope = SynthConfig_1.Config.newEnvelopes[8 /* EnvelopeType.lfo */];
                isTremolo2 = false;
            }
            else {
                envelope = SynthConfig_1.Config.newEnvelopes.dictionary[envelopeObject["envelope"]];
            }
        }
        else {
            if (SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type == 9 /* EnvelopeType.tremolo2 */) {
                envelope = SynthConfig_1.Config.newEnvelopes[8 /* EnvelopeType.lfo */];
                isTremolo2 = true;
            }
            else if (SynthConfig_1.Config.newEnvelopes[Math.max(SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1, 0)].index > 8 /* EnvelopeType.lfo */) {
                envelope = SynthConfig_1.Config.newEnvelopes[SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1];
            }
            else {
                envelope = SynthConfig_1.Config.newEnvelopes[SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type];
            }
        }
        if (envelope == undefined) {
            if (SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type == 9 /* EnvelopeType.tremolo2 */) {
                envelope = SynthConfig_1.Config.newEnvelopes[8 /* EnvelopeType.lfo */];
                isTremolo2 = true;
            }
            else if (SynthConfig_1.Config.newEnvelopes[Math.max(SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1, 0)].index > 8 /* EnvelopeType.lfo */) {
                envelope = SynthConfig_1.Config.newEnvelopes[SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type - 1];
            }
            else {
                envelope = SynthConfig_1.Config.newEnvelopes[SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].type];
            }
        }
        if (envelope == null)
            envelope = SynthConfig_1.Config.envelopes.dictionary["none"];
        this.envelope = envelope.index;
        if (envelopeObject["index"] != undefined) {
            this.index = clamp(0, SynthConfig_1.Config.instrumentAutomationTargets[this.target].maxCount, envelopeObject["index"] | 0);
        }
        else {
            this.index = 0;
        }
        if (envelopeObject["pitchEnvelopeStart"] != undefined) {
            this.pitchEnvelopeStart = clamp(0, this.isNoiseEnvelope ? SynthConfig_1.Config.drumCount : SynthConfig_1.Config.maxPitch + 1, envelopeObject["pitchEnvelopeStart"]);
        }
        else {
            this.pitchEnvelopeStart = 0;
        }
        if (envelopeObject["pitchEnvelopeEnd"] != undefined) {
            this.pitchEnvelopeEnd = clamp(0, this.isNoiseEnvelope ? SynthConfig_1.Config.drumCount : SynthConfig_1.Config.maxPitch + 1, envelopeObject["pitchEnvelopeEnd"]);
        }
        else {
            this.pitchEnvelopeEnd = this.isNoiseEnvelope ? SynthConfig_1.Config.drumCount : SynthConfig_1.Config.maxPitch;
        }
        this.inverse = Boolean(envelopeObject["inverse"]);
        if (envelopeObject["perEnvelopeSpeed"] != undefined) {
            this.perEnvelopeSpeed = envelopeObject["perEnvelopeSpeed"];
        }
        else {
            this.perEnvelopeSpeed = SynthConfig_1.Config.envelopes.dictionary[envelopeObject["envelope"]].speed;
        }
        if (envelopeObject["perEnvelopeLowerBound"] != undefined) {
            this.perEnvelopeLowerBound = clamp(SynthConfig_1.Config.perEnvelopeBoundMin, SynthConfig_1.Config.perEnvelopeBoundMax + 1, envelopeObject["perEnvelopeLowerBound"]);
        }
        else {
            this.perEnvelopeLowerBound = 0;
        }
        if (envelopeObject["perEnvelopeUpperBound"] != undefined) {
            this.perEnvelopeUpperBound = clamp(SynthConfig_1.Config.perEnvelopeBoundMin, SynthConfig_1.Config.perEnvelopeBoundMax + 1, envelopeObject["perEnvelopeUpperBound"]);
        }
        else {
            this.perEnvelopeUpperBound = 1;
        }
        //convert tremolo2 settings into lfo
        if (isTremolo2) {
            if (this.inverse) {
                this.perEnvelopeUpperBound = Math.floor((this.perEnvelopeUpperBound / 2) * 10) / 10;
                this.perEnvelopeLowerBound = Math.floor((this.perEnvelopeLowerBound / 2) * 10) / 10;
            }
            else {
                this.perEnvelopeUpperBound = Math.floor((0.5 + (this.perEnvelopeUpperBound - this.perEnvelopeLowerBound) / 2) * 10) / 10;
                this.perEnvelopeLowerBound = 0.5;
            }
        }
        if (envelopeObject["steps"] != undefined) {
            this.steps = clamp(1, SynthConfig_1.Config.randomEnvelopeStepsMax + 1, envelopeObject["steps"]);
        }
        else {
            this.steps = 2;
        }
        if (envelopeObject["seed"] != undefined) {
            this.seed = clamp(1, SynthConfig_1.Config.randomEnvelopeSeedMax + 1, envelopeObject["seed"]);
        }
        else {
            this.seed = 2;
        }
        if (envelopeObject["waveform"] != undefined) {
            this.waveform = envelopeObject["waveform"];
        }
        else {
            this.waveform = 0 /* LFOEnvelopeTypes.sine */;
        }
        if (envelopeObject["discrete"] != undefined) {
            this.discrete = envelopeObject["discrete"];
        }
        else {
            this.discrete = false;
        }
    };
    return EnvelopeSettings;
}());
exports.EnvelopeSettings = EnvelopeSettings;
var Instrument = /** @class */ (function () {
    function Instrument(isNoiseChannel, isModChannel) {
        // @jummbus - My screed on how modulator arrays for instruments work, for the benefit of myself in the future, or whoever else.
        //
        // modulators[mod] is the index in Config.modulators to use, with "none" being the first entry.
        //
        // modChannels[mod] gives the index of a channel set for this mod. Two special values:
        //   -2 "none"
        //   -1 "song"
        //   0+ actual channel index
        //
        // modInstruments[mod] gives the index of an instrument within the channel set for this mod. Again, two special values:
        //   [0 ~ channel.instruments.length-1]     channel's instrument index
        //   channel.instruments.length             "all"
        //   channel.instruments.length+1           "active"
        //
        // modFilterTypes[mod] gives some info about the filter type: 0 is morph, 1+ is index in the dot selection array (dot 1 x, dot 1 y, dot 2 x...)
        //   0  filter morph
        //   1+ filter dot target, starting from dot 1 x and then dot 1 y, then repeating x, y for all dots in order. Note: odd values are always "x" targets, even are "y".
        this.type = 0 /* InstrumentType.chip */;
        this.preset = 0;
        this.chipWave = 2;
        // advloop addition
        this.isUsingAdvancedLoopControls = false;
        this.chipWaveLoopStart = 0;
        this.chipWaveLoopEnd = SynthConfig_1.Config.rawRawChipWaves[this.chipWave].samples.length - 1;
        this.chipWaveLoopMode = 0; // 0: loop, 1: ping-pong, 2: once, 3: play loop once
        this.chipWavePlayBackwards = false;
        this.chipWaveStartOffset = 0;
        // advloop addition
        this.chipNoise = 1;
        this.eqFilter = new FilterSettings();
        this.eqFilterType = false;
        this.eqFilterSimpleCut = SynthConfig_1.Config.filterSimpleCutRange - 1;
        this.eqFilterSimplePeak = 0;
        this.noteFilter = new FilterSettings();
        this.noteFilterType = false;
        this.noteFilterSimpleCut = SynthConfig_1.Config.filterSimpleCutRange - 1;
        this.noteFilterSimplePeak = 0;
        this.eqSubFilters = [];
        this.noteSubFilters = [];
        this.envelopes = [];
        this.fadeIn = 0;
        this.fadeOut = SynthConfig_1.Config.fadeOutNeutral;
        this.envelopeCount = 0;
        this.transition = SynthConfig_1.Config.transitions.dictionary["normal"].index;
        this.pitchShift = 0;
        this.detune = 0;
        this.vibrato = 0;
        this.interval = 0;
        this.vibratoDepth = 0;
        this.vibratoSpeed = 10;
        this.vibratoDelay = 0;
        this.vibratoType = 0;
        this.envelopeSpeed = 12;
        this.unison = 0;
        this.unisonVoices = 1;
        this.unisonSpread = 0.0;
        this.unisonOffset = 0.0;
        this.unisonExpression = 1.4;
        this.unisonSign = 1.0;
        this.unisonInitialized = true;
        this.effects = 0;
        this.chord = 1;
        this.volume = 0;
        this.pan = SynthConfig_1.Config.panCenter;
        this.panDelay = 0;
        this.arpeggioSpeed = 12;
        this.monoChordTone = 0;
        this.fastTwoNoteArp = false;
        this.legacyTieOver = false;
        this.clicklessTransition = false;
        this.aliases = false;
        this.pulseWidth = SynthConfig_1.Config.pulseWidthRange;
        this.decimalOffset = 0;
        this.supersawDynamism = SynthConfig_1.Config.supersawDynamismMax;
        this.supersawSpread = Math.ceil(SynthConfig_1.Config.supersawSpreadMax / 2.0);
        this.supersawShape = 0;
        this.stringSustain = 10;
        this.stringSustainType = 1 /* SustainType.acoustic */;
        this.distortion = 0;
        this.bitcrusherFreq = 0;
        this.bitcrusherQuantization = 0;
        this.ringModulation = SynthConfig_1.Config.ringModRange >> 1;
        this.ringModulationHz = SynthConfig_1.Config.ringModHzRange >> 1;
        this.ringModWaveformIndex = 0;
        this.ringModPulseWidth = SynthConfig_1.Config.pwmOperatorWaves.length >> 1;
        this.ringModHzOffset = 200;
        this.granular = 4;
        this.grainSize = (SynthConfig_1.Config.grainSizeMax - SynthConfig_1.Config.grainSizeMin) / SynthConfig_1.Config.grainSizeStep;
        this.grainAmounts = SynthConfig_1.Config.grainAmountsMax;
        this.grainRange = 40;
        this.chorus = 0;
        this.reverb = 0;
        this.echoSustain = 0;
        this.echoDelay = 0;
        this.phaserFreq = 0;
        this.phaserMix = SynthConfig_1.Config.phaserMixRange - 1;
        this.phaserFeedback = 0;
        this.phaserStages = 2;
        this.invertWave = false;
        this.algorithm = 0;
        this.feedbackType = 0;
        this.algorithm6Op = 1;
        this.feedbackType6Op = 1; //default to not custom
        this.customAlgorithm = new CustomAlgorithm(); //{ name: "1←4(2←5 3←6", carrierCount: 3, associatedCarrier: [1, 2, 3, 1, 2, 3], modulatedBy: [[2, 3, 4], [5], [6], [], [], []] };
        this.customFeedbackType = new CustomFeedBack(); //{ name: "1↔4 2↔5 3↔6", indices: [[3], [5], [6], [1], [2], [3]] };
        this.feedbackAmplitude = 0;
        this.customChipWave = new Float32Array(64);
        this.customChipWaveIntegral = new Float32Array(65); // One extra element for wrap-around in chipSynth.
        this.operators = [];
        this.harmonicsWave = new HarmonicsWave();
        this.drumsetEnvelopes = [];
        this.drumsetSpectrumWaves = [];
        this.modChannels = [];
        this.modInstruments = [];
        this.modulators = [];
        this.modFilterTypes = [];
        this.modEnvelopeNumbers = [];
        this.invalidModulators = [];
        this.upperNoteLimit = SynthConfig_1.Config.maxPitch;
        this.lowerNoteLimit = 0;
        //Literally just for pitch envelopes. 
        this.isNoiseInstrument = false;
        if (isModChannel) {
            for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                this.modChannels.push(-2);
                this.modInstruments.push(0);
                this.modulators.push(SynthConfig_1.Config.modulators.dictionary["none"].index);
            }
        }
        this.spectrumWave = new SpectrumWave(isNoiseChannel);
        for (var i = 0; i < SynthConfig_1.Config.operatorCount + 2; i++) { //hopefully won't break everything
            this.operators[i] = new Operator(i);
        }
        for (var i = 0; i < SynthConfig_1.Config.drumCount; i++) {
            this.drumsetEnvelopes[i] = SynthConfig_1.Config.envelopes.dictionary["twang 2"].index;
            this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
        }
        for (var i = 0; i < 64; i++) {
            this.customChipWave[i] = 24 - Math.floor(i * (48 / 64));
        }
        var sum = 0.0;
        for (var i = 0; i < this.customChipWave.length; i++) {
            sum += this.customChipWave[i];
        }
        var average = sum / this.customChipWave.length;
        // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
        var cumulative = 0;
        var wavePrev = 0;
        for (var i = 0; i < this.customChipWave.length; i++) {
            cumulative += wavePrev;
            wavePrev = this.customChipWave[i] - average;
            this.customChipWaveIntegral[i] = cumulative;
        }
        // 65th, last sample is for anti-aliasing
        this.customChipWaveIntegral[64] = 0.0;
        //properly sets the isNoiseInstrument value
        this.isNoiseInstrument = isNoiseChannel;
    }
    Instrument.prototype.setTypeAndReset = function (type, isNoiseChannel, isModChannel) {
        // Mod channels are forced to one type.
        if (isModChannel)
            type = 10 /* InstrumentType.mod */;
        this.type = type;
        this.preset = type;
        this.volume = 0;
        this.effects = (1 << 2 /* EffectType.panning */); // Panning enabled by default in JB.
        this.chorus = SynthConfig_1.Config.chorusRange - 1;
        this.reverb = 0;
        this.echoSustain = Math.floor((SynthConfig_1.Config.echoSustainRange - 1) * 0.5);
        this.echoDelay = Math.floor((SynthConfig_1.Config.echoDelayRange - 1) * 0.5);
        this.eqFilter.reset();
        this.eqFilterType = false;
        this.eqFilterSimpleCut = SynthConfig_1.Config.filterSimpleCutRange - 1;
        this.eqFilterSimplePeak = 0;
        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
            this.eqSubFilters[i] = null;
            this.noteSubFilters[i] = null;
        }
        this.noteFilter.reset();
        this.noteFilterType = false;
        this.noteFilterSimpleCut = SynthConfig_1.Config.filterSimpleCutRange - 1;
        this.noteFilterSimplePeak = 0;
        this.distortion = Math.floor((SynthConfig_1.Config.distortionRange - 1) * 0.75);
        this.bitcrusherFreq = Math.floor((SynthConfig_1.Config.bitcrusherFreqRange - 1) * 0.5);
        this.bitcrusherQuantization = Math.floor((SynthConfig_1.Config.bitcrusherQuantizationRange - 1) * 0.5);
        this.ringModulation = SynthConfig_1.Config.ringModRange >> 1;
        this.ringModulationHz = SynthConfig_1.Config.ringModHzRange >> 1;
        this.ringModWaveformIndex = 0;
        this.ringModPulseWidth = SynthConfig_1.Config.pwmOperatorWaves.length >> 1;
        this.ringModHzOffset = 200;
        this.granular = 4;
        this.grainSize = (SynthConfig_1.Config.grainSizeMax - SynthConfig_1.Config.grainSizeMin) / SynthConfig_1.Config.grainSizeStep;
        this.grainAmounts = SynthConfig_1.Config.grainAmountsMax;
        this.grainRange = 40;
        this.phaserFreq = 0;
        this.phaserFeedback = 0;
        this.phaserStages = 2;
        this.phaserMix = SynthConfig_1.Config.phaserMixRange - 1;
        this.invertWave = false;
        this.pan = SynthConfig_1.Config.panCenter;
        this.panDelay = 0;
        this.pitchShift = SynthConfig_1.Config.pitchShiftCenter;
        this.detune = SynthConfig_1.Config.detuneCenter;
        this.vibrato = 0;
        this.unison = 0;
        this.stringSustain = 10;
        this.stringSustainType = SynthConfig_1.Config.enableAcousticSustain ? 1 /* SustainType.acoustic */ : 0 /* SustainType.bright */;
        this.clicklessTransition = false;
        this.arpeggioSpeed = 12;
        this.monoChordTone = 1;
        this.envelopeSpeed = 12;
        this.legacyTieOver = false;
        this.aliases = false;
        this.fadeIn = 0;
        this.fadeOut = SynthConfig_1.Config.fadeOutNeutral;
        this.transition = SynthConfig_1.Config.transitions.dictionary["normal"].index;
        this.envelopeCount = 0;
        this.upperNoteLimit = SynthConfig_1.Config.maxPitch;
        this.lowerNoteLimit = 0;
        this.isNoiseInstrument = isNoiseChannel;
        switch (type) {
            case 0 /* InstrumentType.chip */:
                this.chipWave = 2;
                // TODO: enable the chord effect? //slarmoo - My decision is no, others can if they would like though
                this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                // advloop addition
                this.isUsingAdvancedLoopControls = false;
                this.chipWaveLoopStart = 0;
                this.chipWaveLoopEnd = SynthConfig_1.Config.rawRawChipWaves[this.chipWave].samples.length - 1;
                this.chipWaveLoopMode = 0;
                this.chipWavePlayBackwards = false;
                this.chipWaveStartOffset = 0;
                // advloop addition
                break;
            case 9 /* InstrumentType.customChipWave */:
                this.chipWave = 2;
                this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                for (var i = 0; i < 64; i++) {
                    this.customChipWave[i] = 24 - (Math.floor(i * (48 / 64)));
                }
                var sum = 0.0;
                for (var i = 0; i < this.customChipWave.length; i++) {
                    sum += this.customChipWave[i];
                }
                var average = sum / this.customChipWave.length;
                // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                var cumulative = 0;
                var wavePrev = 0;
                for (var i = 0; i < this.customChipWave.length; i++) {
                    cumulative += wavePrev;
                    wavePrev = this.customChipWave[i] - average;
                    this.customChipWaveIntegral[i] = cumulative;
                }
                this.customChipWaveIntegral[64] = 0.0;
                break;
            case 1 /* InstrumentType.fm */:
                this.chord = SynthConfig_1.Config.chords.dictionary["custom interval"].index;
                this.algorithm = 0;
                this.feedbackType = 0;
                this.feedbackAmplitude = 0;
                for (var i = 0; i < this.operators.length; i++) {
                    this.operators[i].reset(i);
                }
                break;
            case 11 /* InstrumentType.fm6op */:
                this.transition = 1;
                this.vibrato = 0;
                this.effects = 1;
                this.chord = 3;
                this.algorithm = 0;
                this.feedbackType = 0;
                this.algorithm6Op = 1;
                this.feedbackType6Op = 1;
                this.customAlgorithm.fromPreset(1);
                this.feedbackAmplitude = 0;
                for (var i = 0; i < this.operators.length; i++) {
                    this.operators[i].reset(i);
                }
                break;
            case 2 /* InstrumentType.noise */:
                this.chipNoise = 1;
                this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                break;
            case 3 /* InstrumentType.spectrum */:
                this.chord = SynthConfig_1.Config.chords.dictionary["simultaneous"].index;
                this.spectrumWave.reset(isNoiseChannel);
                break;
            case 4 /* InstrumentType.drumset */:
                this.chord = SynthConfig_1.Config.chords.dictionary["simultaneous"].index;
                for (var i = 0; i < SynthConfig_1.Config.drumCount; i++) {
                    this.drumsetEnvelopes[i] = SynthConfig_1.Config.envelopes.dictionary["twang 2"].index;
                    if (this.drumsetSpectrumWaves[i] == undefined) {
                        this.drumsetSpectrumWaves[i] = new SpectrumWave(true);
                    }
                    this.drumsetSpectrumWaves[i].reset(isNoiseChannel);
                }
                break;
            case 5 /* InstrumentType.harmonics */:
                this.chord = SynthConfig_1.Config.chords.dictionary["simultaneous"].index;
                this.harmonicsWave.reset();
                break;
            case 6 /* InstrumentType.pwm */:
                this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                this.pulseWidth = SynthConfig_1.Config.pulseWidthRange;
                this.decimalOffset = 0;
                break;
            case 7 /* InstrumentType.pickedString */:
                this.chord = SynthConfig_1.Config.chords.dictionary["strum"].index;
                this.harmonicsWave.reset();
                break;
            case 10 /* InstrumentType.mod */:
                this.transition = 0;
                this.vibrato = 0;
                this.interval = 0;
                this.effects = 0;
                this.chord = 0;
                this.modChannels = [];
                this.modInstruments = [];
                this.modulators = [];
                for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                    this.modChannels.push(-2);
                    this.modInstruments.push(0);
                    this.modulators.push(SynthConfig_1.Config.modulators.dictionary["none"].index);
                    this.invalidModulators[mod] = false;
                    this.modFilterTypes[mod] = 0;
                    this.modEnvelopeNumbers[mod] = 0;
                }
                break;
            case 8 /* InstrumentType.supersaw */:
                this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                this.supersawDynamism = SynthConfig_1.Config.supersawDynamismMax;
                this.supersawSpread = Math.ceil(SynthConfig_1.Config.supersawSpreadMax / 2.0);
                this.supersawShape = 0;
                this.pulseWidth = SynthConfig_1.Config.pulseWidthRange - 1;
                this.decimalOffset = 0;
                break;
            default:
                throw new Error("Unrecognized instrument type: " + type);
        }
        // Chip/noise instruments had arpeggio and FM had custom interval but neither
        // explicitly saved the chorus setting beforeSeven so enable it here. The effects
        // will otherwise get overridden when reading SongTagCode.startInstrument.
        if (this.chord != SynthConfig_1.Config.chords.dictionary["simultaneous"].index) {
            // Enable chord if it was used.
            this.effects = (this.effects | (1 << 11 /* EffectType.chord */));
        }
    };
    // (only) difference for JummBox: Returns whether or not the note filter was chosen for filter conversion.
    Instrument.prototype.convertLegacySettings = function (legacySettings, forceSimpleFilter) {
        var legacyCutoffSetting = legacySettings.filterCutoff;
        var legacyResonanceSetting = legacySettings.filterResonance;
        var legacyFilterEnv = legacySettings.filterEnvelope;
        var legacyPulseEnv = legacySettings.pulseEnvelope;
        var legacyOperatorEnvelopes = legacySettings.operatorEnvelopes;
        var legacyFeedbackEnv = legacySettings.feedbackEnvelope;
        // legacy defaults:
        if (legacyCutoffSetting == undefined)
            legacyCutoffSetting = (this.type == 0 /* InstrumentType.chip */) ? 6 : 10;
        if (legacyResonanceSetting == undefined)
            legacyResonanceSetting = 0;
        if (legacyFilterEnv == undefined)
            legacyFilterEnv = SynthConfig_1.Config.envelopes.dictionary["none"];
        if (legacyPulseEnv == undefined)
            legacyPulseEnv = SynthConfig_1.Config.envelopes.dictionary[(this.type == 6 /* InstrumentType.pwm */) ? "twang 2" : "none"];
        if (legacyOperatorEnvelopes == undefined)
            legacyOperatorEnvelopes = [SynthConfig_1.Config.envelopes.dictionary[(this.type == 1 /* InstrumentType.fm */) ? "note size" : "none"], SynthConfig_1.Config.envelopes.dictionary["none"], SynthConfig_1.Config.envelopes.dictionary["none"], SynthConfig_1.Config.envelopes.dictionary["none"]];
        if (legacyFeedbackEnv == undefined)
            legacyFeedbackEnv = SynthConfig_1.Config.envelopes.dictionary["none"];
        // The "punch" envelope is special: it goes *above* the chosen cutoff. But if the cutoff was already at the max, it couldn't go any higher... except in the current version of BeepBox I raised the max cutoff so it *can* but then it sounds different, so to preserve the original sound let's just remove the punch envelope.
        var legacyFilterCutoffRange = 11;
        var cutoffAtMax = (legacyCutoffSetting == legacyFilterCutoffRange - 1);
        if (cutoffAtMax && legacyFilterEnv.type == 4 /* EnvelopeType.punch */)
            legacyFilterEnv = SynthConfig_1.Config.envelopes.dictionary["none"];
        var carrierCount = SynthConfig_1.Config.algorithms[this.algorithm].carrierCount;
        var noCarriersControlledByNoteSize = true;
        var allCarriersControlledByNoteSize = true;
        var noteSizeControlsSomethingElse = (legacyFilterEnv.type == 1 /* EnvelopeType.noteSize */) || (legacyPulseEnv.type == 1 /* EnvelopeType.noteSize */);
        if (this.type == 1 /* InstrumentType.fm */ || this.type == 11 /* InstrumentType.fm6op */) {
            noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || (legacyFeedbackEnv.type == 1 /* EnvelopeType.noteSize */);
            for (var i = 0; i < legacyOperatorEnvelopes.length; i++) {
                if (i < carrierCount) {
                    if (legacyOperatorEnvelopes[i].type != 1 /* EnvelopeType.noteSize */) {
                        allCarriersControlledByNoteSize = false;
                    }
                    else {
                        noCarriersControlledByNoteSize = false;
                    }
                }
                else {
                    noteSizeControlsSomethingElse = noteSizeControlsSomethingElse || (legacyOperatorEnvelopes[i].type == 1 /* EnvelopeType.noteSize */);
                }
            }
        }
        this.envelopeCount = 0;
        if (this.type == 1 /* InstrumentType.fm */ || this.type == 11 /* InstrumentType.fm6op */) {
            if (allCarriersControlledByNoteSize && noteSizeControlsSomethingElse) {
                this.addEnvelope(SynthConfig_1.Config.instrumentAutomationTargets.dictionary["noteVolume"].index, 0, SynthConfig_1.Config.envelopes.dictionary["note size"].index, false);
            }
            else if (noCarriersControlledByNoteSize && !noteSizeControlsSomethingElse) {
                this.addEnvelope(SynthConfig_1.Config.instrumentAutomationTargets.dictionary["none"].index, 0, SynthConfig_1.Config.envelopes.dictionary["note size"].index, false);
            }
        }
        if (legacyFilterEnv.type == 0 /* EnvelopeType.none */) {
            this.noteFilter.reset();
            this.noteFilterType = false;
            this.eqFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
            this.effects &= ~(1 << 5 /* EffectType.noteFilter */);
            if (forceSimpleFilter || this.eqFilterType) {
                this.eqFilterType = true;
                this.eqFilterSimpleCut = legacyCutoffSetting;
                this.eqFilterSimplePeak = legacyResonanceSetting;
            }
        }
        else {
            this.eqFilter.reset();
            this.eqFilterType = false;
            this.noteFilterType = false;
            this.noteFilter.convertLegacySettings(legacyCutoffSetting, legacyResonanceSetting, legacyFilterEnv);
            this.effects |= 1 << 5 /* EffectType.noteFilter */;
            this.addEnvelope(SynthConfig_1.Config.instrumentAutomationTargets.dictionary["noteFilterAllFreqs"].index, 0, legacyFilterEnv.index, false);
            if (forceSimpleFilter || this.noteFilterType) {
                this.noteFilterType = true;
                this.noteFilterSimpleCut = legacyCutoffSetting;
                this.noteFilterSimplePeak = legacyResonanceSetting;
            }
        }
        if (legacyPulseEnv.type != 0 /* EnvelopeType.none */) {
            this.addEnvelope(SynthConfig_1.Config.instrumentAutomationTargets.dictionary["pulseWidth"].index, 0, legacyPulseEnv.index, false);
        }
        for (var i = 0; i < legacyOperatorEnvelopes.length; i++) {
            if (i < carrierCount && allCarriersControlledByNoteSize)
                continue;
            if (legacyOperatorEnvelopes[i].type != 0 /* EnvelopeType.none */) {
                this.addEnvelope(SynthConfig_1.Config.instrumentAutomationTargets.dictionary["operatorAmplitude"].index, i, legacyOperatorEnvelopes[i].index, false);
            }
        }
        if (legacyFeedbackEnv.type != 0 /* EnvelopeType.none */) {
            this.addEnvelope(SynthConfig_1.Config.instrumentAutomationTargets.dictionary["feedbackAmplitude"].index, 0, legacyFeedbackEnv.index, false);
        }
    };
    Instrument.prototype.toJsonObject = function () {
        var instrumentObject = {
            "type": SynthConfig_1.Config.instrumentTypeNames[this.type],
            "volume": this.volume,
            "eqFilter": this.eqFilter.toJsonObject(),
            "eqFilterType": this.eqFilterType,
            "eqSimpleCut": this.eqFilterSimpleCut,
            "eqSimplePeak": this.eqFilterSimplePeak,
            "envelopeSpeed": this.envelopeSpeed
        };
        if (this.preset != this.type) {
            instrumentObject["preset"] = this.preset;
        }
        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
            if (this.eqSubFilters[i] != null)
                instrumentObject["eqSubFilters" + i] = this.eqSubFilters[i].toJsonObject();
        }
        var effects = [];
        for (var _i = 0, _a = SynthConfig_1.Config.effectOrder; _i < _a.length; _i++) {
            var effect = _a[_i];
            if (this.effects & (1 << effect)) {
                effects.push(SynthConfig_1.Config.effectNames[effect]);
            }
        }
        instrumentObject["effects"] = effects;
        if ((0, SynthConfig_1.effectsIncludeTransition)(this.effects)) {
            instrumentObject["transition"] = SynthConfig_1.Config.transitions[this.transition].name;
            instrumentObject["clicklessTransition"] = this.clicklessTransition;
        }
        if ((0, SynthConfig_1.effectsIncludeChord)(this.effects)) {
            instrumentObject["chord"] = this.getChord().name;
            instrumentObject["fastTwoNoteArp"] = this.fastTwoNoteArp;
            instrumentObject["arpeggioSpeed"] = this.arpeggioSpeed;
            instrumentObject["monoChordTone"] = this.monoChordTone;
        }
        if ((0, SynthConfig_1.effectsIncludePitchShift)(this.effects)) {
            instrumentObject["pitchShiftSemitones"] = this.pitchShift;
        }
        if ((0, SynthConfig_1.effectsIncludeDetune)(this.effects)) {
            instrumentObject["detuneCents"] = Synth.detuneToCents(this.detune);
        }
        if ((0, SynthConfig_1.effectsIncludeVibrato)(this.effects)) {
            if (this.vibrato == -1) {
                this.vibrato = 5;
            }
            if (this.vibrato != 5) {
                instrumentObject["vibrato"] = SynthConfig_1.Config.vibratos[this.vibrato].name;
            }
            else {
                instrumentObject["vibrato"] = "custom";
            }
            instrumentObject["vibratoDepth"] = this.vibratoDepth;
            instrumentObject["vibratoDelay"] = this.vibratoDelay;
            instrumentObject["vibratoSpeed"] = this.vibratoSpeed;
            instrumentObject["vibratoType"] = this.vibratoType;
        }
        if ((0, SynthConfig_1.effectsIncludeNoteFilter)(this.effects)) {
            instrumentObject["noteFilterType"] = this.noteFilterType;
            instrumentObject["noteSimpleCut"] = this.noteFilterSimpleCut;
            instrumentObject["noteSimplePeak"] = this.noteFilterSimplePeak;
            instrumentObject["noteFilter"] = this.noteFilter.toJsonObject();
            for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                if (this.noteSubFilters[i] != null)
                    instrumentObject["noteSubFilters" + i] = this.noteSubFilters[i].toJsonObject();
            }
        }
        if ((0, SynthConfig_1.effectsIncludeGranular)(this.effects)) {
            instrumentObject["granular"] = this.granular;
            instrumentObject["grainSize"] = this.grainSize;
            instrumentObject["grainAmounts"] = this.grainAmounts;
            instrumentObject["grainRange"] = this.grainRange;
        }
        if ((0, SynthConfig_1.effectsIncludeRingModulation)(this.effects)) {
            instrumentObject["ringMod"] = Math.round(100 * this.ringModulation / (SynthConfig_1.Config.ringModRange - 1));
            instrumentObject["ringModHz"] = Math.round(100 * this.ringModulationHz / (SynthConfig_1.Config.ringModHzRange - 1));
            instrumentObject["ringModWaveformIndex"] = this.ringModWaveformIndex;
            instrumentObject["ringModPulseWidth"] = Math.round(100 * this.ringModPulseWidth / (SynthConfig_1.Config.pulseWidthRange - 1));
            instrumentObject["ringModHzOffset"] = Math.round(100 * this.ringModHzOffset / (SynthConfig_1.Config.rmHzOffsetMax));
        }
        if ((0, SynthConfig_1.effectsIncludePhaser)(this.effects)) {
            instrumentObject["phaserMix"] = Math.round(100 * this.phaserMix / (SynthConfig_1.Config.phaserMixRange - 1));
            instrumentObject["phaserFreq"] = Math.round(100 * this.phaserFreq / (SynthConfig_1.Config.phaserFreqRange - 1));
            instrumentObject["phaserFeedback"] = Math.round(100 * this.phaserFeedback / (SynthConfig_1.Config.phaserFeedbackRange - 1));
            instrumentObject["phaserStages"] = Math.round(100 * this.phaserStages / (SynthConfig_1.Config.phaserMaxStages - 1));
        }
        if ((0, SynthConfig_1.effectsIncludeDistortion)(this.effects)) {
            instrumentObject["distortion"] = Math.round(100 * this.distortion / (SynthConfig_1.Config.distortionRange - 1));
            instrumentObject["aliases"] = this.aliases;
        }
        if ((0, SynthConfig_1.effectsIncludeBitcrusher)(this.effects)) {
            instrumentObject["bitcrusherOctave"] = (SynthConfig_1.Config.bitcrusherFreqRange - 1 - this.bitcrusherFreq) * SynthConfig_1.Config.bitcrusherOctaveStep;
            instrumentObject["bitcrusherQuantization"] = Math.round(100 * this.bitcrusherQuantization / (SynthConfig_1.Config.bitcrusherQuantizationRange - 1));
        }
        if ((0, SynthConfig_1.effectsIncludeInvertWave)(this.effects)) {
            instrumentObject["invertWave"] = this.invertWave;
        }
        if ((0, SynthConfig_1.effectsIncludePanning)(this.effects)) {
            instrumentObject["pan"] = Math.round(100 * (this.pan - SynthConfig_1.Config.panCenter) / SynthConfig_1.Config.panCenter);
            instrumentObject["panDelay"] = this.panDelay;
        }
        if ((0, SynthConfig_1.effectsIncludeChorus)(this.effects)) {
            instrumentObject["chorus"] = Math.round(100 * this.chorus / (SynthConfig_1.Config.chorusRange - 1));
        }
        if ((0, SynthConfig_1.effectsIncludeEcho)(this.effects)) {
            instrumentObject["echoSustain"] = Math.round(100 * this.echoSustain / (SynthConfig_1.Config.echoSustainRange - 1));
            instrumentObject["echoDelayBeats"] = Math.round(1000 * (this.echoDelay + 1) * SynthConfig_1.Config.echoDelayStepTicks / (SynthConfig_1.Config.ticksPerPart * SynthConfig_1.Config.partsPerBeat)) / 1000;
        }
        if ((0, SynthConfig_1.effectsIncludeReverb)(this.effects)) {
            instrumentObject["reverb"] = Math.round(100 * this.reverb / (SynthConfig_1.Config.reverbRange - 1));
        }
        if ((0, SynthConfig_1.effectsIncludeNoteRange)(this.effects)) {
            instrumentObject["upperNoteLimit"] = this.upperNoteLimit;
            instrumentObject["lowerNoteLimit"] = this.lowerNoteLimit;
        }
        if (this.type != 4 /* InstrumentType.drumset */) {
            instrumentObject["fadeInSeconds"] = Math.round(10000 * Synth.fadeInSettingToSeconds(this.fadeIn)) / 10000;
            instrumentObject["fadeOutTicks"] = Synth.fadeOutSettingToTicks(this.fadeOut);
        }
        if (this.type == 5 /* InstrumentType.harmonics */ || this.type == 7 /* InstrumentType.pickedString */) {
            instrumentObject["harmonics"] = [];
            for (var i = 0; i < SynthConfig_1.Config.harmonicsControlPoints; i++) {
                instrumentObject["harmonics"][i] = Math.round(100 * this.harmonicsWave.harmonics[i] / SynthConfig_1.Config.harmonicsMax);
            }
        }
        if (this.type == 2 /* InstrumentType.noise */) {
            instrumentObject["wave"] = SynthConfig_1.Config.chipNoises[this.chipNoise].name;
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
        }
        else if (this.type == 3 /* InstrumentType.spectrum */) {
            instrumentObject["spectrum"] = [];
            for (var i = 0; i < SynthConfig_1.Config.spectrumControlPoints; i++) {
                instrumentObject["spectrum"][i] = Math.round(100 * this.spectrumWave.spectrum[i] / SynthConfig_1.Config.spectrumMax);
            }
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
        }
        else if (this.type == 4 /* InstrumentType.drumset */) {
            instrumentObject["drums"] = [];
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
            for (var j = 0; j < SynthConfig_1.Config.drumCount; j++) {
                var spectrum = [];
                for (var i = 0; i < SynthConfig_1.Config.spectrumControlPoints; i++) {
                    spectrum[i] = Math.round(100 * this.drumsetSpectrumWaves[j].spectrum[i] / SynthConfig_1.Config.spectrumMax);
                }
                instrumentObject["drums"][j] = {
                    "filterEnvelope": this.getDrumsetEnvelope(j).name,
                    "spectrum": spectrum,
                };
            }
        }
        else if (this.type == 0 /* InstrumentType.chip */) {
            instrumentObject["wave"] = SynthConfig_1.Config.chipWaves[this.chipWave].name;
            // should this unison pushing code be turned into a function..?
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            // these don't need to be pushed if custom unisons aren't being used
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
            // advloop addition
            instrumentObject["isUsingAdvancedLoopControls"] = this.isUsingAdvancedLoopControls;
            instrumentObject["chipWaveLoopStart"] = this.chipWaveLoopStart;
            instrumentObject["chipWaveLoopEnd"] = this.chipWaveLoopEnd;
            instrumentObject["chipWaveLoopMode"] = this.chipWaveLoopMode;
            instrumentObject["chipWavePlayBackwards"] = this.chipWavePlayBackwards;
            instrumentObject["chipWaveStartOffset"] = this.chipWaveStartOffset;
            // advloop addition
        }
        else if (this.type == 6 /* InstrumentType.pwm */) {
            instrumentObject["pulseWidth"] = this.pulseWidth;
            instrumentObject["decimalOffset"] = this.decimalOffset;
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
        }
        else if (this.type == 8 /* InstrumentType.supersaw */) {
            instrumentObject["pulseWidth"] = this.pulseWidth;
            instrumentObject["decimalOffset"] = this.decimalOffset;
            instrumentObject["dynamism"] = Math.round(100 * this.supersawDynamism / SynthConfig_1.Config.supersawDynamismMax);
            instrumentObject["spread"] = Math.round(100 * this.supersawSpread / SynthConfig_1.Config.supersawSpreadMax);
            instrumentObject["shape"] = Math.round(100 * this.supersawShape / SynthConfig_1.Config.supersawShapeMax);
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
        }
        else if (this.type == 7 /* InstrumentType.pickedString */) {
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
            instrumentObject["stringSustain"] = Math.round(100 * this.stringSustain / (SynthConfig_1.Config.stringSustainRange - 1));
            if (SynthConfig_1.Config.enableAcousticSustain) {
                instrumentObject["stringSustainType"] = SynthConfig_1.Config.sustainTypeNames[this.stringSustainType];
            }
        }
        else if (this.type == 5 /* InstrumentType.harmonics */) {
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
        }
        else if (this.type == 1 /* InstrumentType.fm */ || this.type == 11 /* InstrumentType.fm6op */) {
            var operatorArray = [];
            for (var _b = 0, _c = this.operators; _b < _c.length; _b++) {
                var operator = _c[_b];
                operatorArray.push({
                    "frequency": SynthConfig_1.Config.operatorFrequencies[operator.frequency].name,
                    "amplitude": operator.amplitude,
                    "waveform": SynthConfig_1.Config.operatorWaves[operator.waveform].name,
                    "pulseWidth": operator.pulseWidth,
                });
            }
            if (this.type == 1 /* InstrumentType.fm */) {
                instrumentObject["algorithm"] = SynthConfig_1.Config.algorithms[this.algorithm].name;
                instrumentObject["feedbackType"] = SynthConfig_1.Config.feedbacks[this.feedbackType].name;
                instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
                instrumentObject["operators"] = operatorArray;
            }
            else {
                instrumentObject["algorithm"] = SynthConfig_1.Config.algorithms6Op[this.algorithm6Op].name;
                instrumentObject["feedbackType"] = SynthConfig_1.Config.feedbacks6Op[this.feedbackType6Op].name;
                instrumentObject["feedbackAmplitude"] = this.feedbackAmplitude;
                if (this.algorithm6Op == 0) {
                    var customAlgorithm = {};
                    customAlgorithm["mods"] = this.customAlgorithm.modulatedBy;
                    customAlgorithm["carrierCount"] = this.customAlgorithm.carrierCount;
                    instrumentObject["customAlgorithm"] = customAlgorithm;
                }
                if (this.feedbackType6Op == 0) {
                    var customFeedback = {};
                    customFeedback["mods"] = this.customFeedbackType.indices;
                    instrumentObject["customFeedback"] = customFeedback;
                }
                instrumentObject["operators"] = operatorArray;
            }
        }
        else if (this.type == 9 /* InstrumentType.customChipWave */) {
            instrumentObject["wave"] = SynthConfig_1.Config.chipWaves[this.chipWave].name;
            instrumentObject["unison"] = this.unison == SynthConfig_1.Config.unisons.length ? "custom" : SynthConfig_1.Config.unisons[this.unison].name;
            if (this.unison == SynthConfig_1.Config.unisons.length) {
                instrumentObject["unisonVoices"] = this.unisonVoices;
                instrumentObject["unisonSpread"] = this.unisonSpread;
                instrumentObject["unisonOffset"] = this.unisonOffset;
                instrumentObject["unisonExpression"] = this.unisonExpression;
                instrumentObject["unisonSign"] = this.unisonSign;
            }
            instrumentObject["customChipWave"] = new Float64Array(64);
            instrumentObject["customChipWaveIntegral"] = new Float64Array(65);
            for (var i = 0; i < this.customChipWave.length; i++) {
                instrumentObject["customChipWave"][i] = this.customChipWave[i];
                // Meh, waste of space and can be inaccurate. It will be recalc'ed when instrument loads.
                //instrumentObject["customChipWaveIntegral"][i] = this.customChipWaveIntegral[i];
            }
        }
        else if (this.type == 10 /* InstrumentType.mod */) {
            instrumentObject["modChannels"] = [];
            instrumentObject["modInstruments"] = [];
            instrumentObject["modSettings"] = [];
            instrumentObject["modFilterTypes"] = [];
            instrumentObject["modEnvelopeNumbers"] = [];
            for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                instrumentObject["modChannels"][mod] = this.modChannels[mod];
                instrumentObject["modInstruments"][mod] = this.modInstruments[mod];
                instrumentObject["modSettings"][mod] = this.modulators[mod];
                instrumentObject["modFilterTypes"][mod] = this.modFilterTypes[mod];
                instrumentObject["modEnvelopeNumbers"][mod] = this.modEnvelopeNumbers[mod];
            }
        }
        else {
            throw new Error("Unrecognized instrument type");
        }
        var envelopes = [];
        for (var i = 0; i < this.envelopeCount; i++) {
            envelopes.push(this.envelopes[i].toJsonObject());
        }
        instrumentObject["envelopes"] = envelopes;
        return instrumentObject;
    };
    Instrument.prototype.fromJsonObject = function (instrumentObject, isNoiseChannel, isModChannel, useSlowerRhythm, useFastTwoNoteArp, legacyGlobalReverb, jsonFormat) {
        if (legacyGlobalReverb === void 0) { legacyGlobalReverb = 0; }
        if (jsonFormat === void 0) { jsonFormat = SynthConfig_1.Config.jsonFormat; }
        if (instrumentObject == undefined)
            instrumentObject = {};
        var format = jsonFormat.toLowerCase();
        var type = SynthConfig_1.Config.instrumentTypeNames.indexOf(instrumentObject["type"]);
        // SynthBox support
        if ((format == "synthbox") && (instrumentObject["type"] == "FM"))
            type = SynthConfig_1.Config.instrumentTypeNames.indexOf("FM6op");
        if (type == -1)
            type = isModChannel ? 10 /* InstrumentType.mod */ : (isNoiseChannel ? 2 /* InstrumentType.noise */ : 0 /* InstrumentType.chip */);
        this.setTypeAndReset(type, isNoiseChannel, isModChannel);
        this.effects &= ~(1 << 2 /* EffectType.panning */);
        if (instrumentObject["preset"] != undefined) {
            this.preset = instrumentObject["preset"] >>> 0;
        }
        if (instrumentObject["volume"] != undefined) {
            if (format == "jummbox" || format == "midbox" || format == "synthbox" || format == "goldbox" || format == "paandorasbox" || format == "ultrabox" || format == "slarmoosbox") {
                this.volume = clamp(-SynthConfig_1.Config.volumeRange / 2, (SynthConfig_1.Config.volumeRange / 2) + 1, instrumentObject["volume"] | 0);
            }
            else {
                this.volume = Math.round(-clamp(0, 8, Math.round(5 - (instrumentObject["volume"] | 0) / 20)) * 25.0 / 7.0);
            }
        }
        else {
            this.volume = 0;
        }
        //These can probably be condensed with ternary operators
        this.envelopeSpeed = instrumentObject["envelopeSpeed"] != undefined ? clamp(0, SynthConfig_1.Config.modulators.dictionary["envelope speed"].maxRawVol + 1, instrumentObject["envelopeSpeed"] | 0) : 12;
        if (Array.isArray(instrumentObject["effects"])) {
            var effects = 0;
            for (var i = 0; i < instrumentObject["effects"].length; i++) {
                effects = effects | (1 << SynthConfig_1.Config.effectNames.indexOf(instrumentObject["effects"][i]));
            }
            this.effects = (effects & ((1 << 18 /* EffectType.length */) - 1));
        }
        else {
            // The index of these names is reinterpreted as a bitfield, which relies on reverb and chorus being the first effects!
            var legacyEffectsNames = ["none", "reverb", "chorus", "chorus & reverb"];
            this.effects = legacyEffectsNames.indexOf(instrumentObject["effects"]);
            if (this.effects == -1)
                this.effects = (this.type == 2 /* InstrumentType.noise */) ? 0 : 1;
        }
        this.transition = SynthConfig_1.Config.transitions.dictionary["normal"].index; // default value.
        var transitionProperty = instrumentObject["transition"] || instrumentObject["envelope"]; // the transition property used to be called envelope, so check that too.
        if (transitionProperty != undefined) {
            var transition = SynthConfig_1.Config.transitions.dictionary[transitionProperty];
            if (instrumentObject["fadeInSeconds"] == undefined || instrumentObject["fadeOutTicks"] == undefined) {
                var legacySettings = {
                    "binary": { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                    "seamless": { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                    "sudden": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                    "hard": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                    "smooth": { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                    "soft": { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                    // Note that the old slide transition has the same name as a new slide transition that is different.
                    // Only apply legacy settings if the instrument JSON was created before, based on the presence
                    // of the fade in/out fields.
                    "slide": { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                    "cross fade": { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
                    "hard fade": { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
                    "medium fade": { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
                    "soft fade": { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
                }[transitionProperty];
                if (legacySettings != undefined) {
                    transition = SynthConfig_1.Config.transitions.dictionary[legacySettings.transition];
                    // These may be overridden below.
                    this.fadeIn = Synth.secondsToFadeInSetting(legacySettings.fadeInSeconds);
                    this.fadeOut = Synth.ticksToFadeOutSetting(legacySettings.fadeOutTicks);
                }
            }
            if (transition != undefined)
                this.transition = transition.index;
            if (this.transition != SynthConfig_1.Config.transitions.dictionary["normal"].index) {
                // Enable transition if it was used.
                this.effects = (this.effects | (1 << 10 /* EffectType.transition */));
            }
        }
        // Overrides legacy settings in transition above.
        if (instrumentObject["fadeInSeconds"] != undefined) {
            this.fadeIn = Synth.secondsToFadeInSetting(+instrumentObject["fadeInSeconds"]);
        }
        if (instrumentObject["fadeOutTicks"] != undefined) {
            this.fadeOut = Synth.ticksToFadeOutSetting(+instrumentObject["fadeOutTicks"]);
        }
        {
            // Note that the chord setting may be overridden by instrumentObject["chorus"] below.
            var chordProperty = instrumentObject["chord"];
            var legacyChordNames = { "harmony": "simultaneous" };
            var chord = SynthConfig_1.Config.chords.dictionary[legacyChordNames[chordProperty]] || SynthConfig_1.Config.chords.dictionary[chordProperty];
            if (chord != undefined) {
                this.chord = chord.index;
            }
            else {
                // Different instruments have different default chord types based on historical behaviour.
                if (this.type == 2 /* InstrumentType.noise */) {
                    this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                }
                else if (this.type == 7 /* InstrumentType.pickedString */) {
                    this.chord = SynthConfig_1.Config.chords.dictionary["strum"].index;
                }
                else if (this.type == 0 /* InstrumentType.chip */) {
                    this.chord = SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
                }
                else if (this.type == 1 /* InstrumentType.fm */ || this.type == 11 /* InstrumentType.fm6op */) {
                    this.chord = SynthConfig_1.Config.chords.dictionary["custom interval"].index;
                }
                else {
                    this.chord = SynthConfig_1.Config.chords.dictionary["simultaneous"].index;
                }
            }
        }
        this.unison = SynthConfig_1.Config.unisons.dictionary["none"].index; // default value.
        var unisonProperty = instrumentObject["unison"] || instrumentObject["interval"] || instrumentObject["chorus"]; // The unison property has gone by various names in the past.
        if (unisonProperty != undefined) {
            var legacyChorusNames = { "union": "none", "fifths": "fifth", "octaves": "octave", "error": "voiced" };
            var unison = SynthConfig_1.Config.unisons.dictionary[legacyChorusNames[unisonProperty]] || SynthConfig_1.Config.unisons.dictionary[unisonProperty];
            if (unison != undefined)
                this.unison = unison.index;
            if (unisonProperty == "custom")
                this.unison = SynthConfig_1.Config.unisons.length;
        }
        //clamp these???
        this.unisonVoices = (instrumentObject["unisonVoices"] == undefined) ? SynthConfig_1.Config.unisons[this.unison].voices : instrumentObject["unisonVoices"];
        this.unisonSpread = (instrumentObject["unisonSpread"] == undefined) ? SynthConfig_1.Config.unisons[this.unison].spread : instrumentObject["unisonSpread"];
        this.unisonOffset = (instrumentObject["unisonOffset"] == undefined) ? SynthConfig_1.Config.unisons[this.unison].offset : instrumentObject["unisonOffset"];
        this.unisonExpression = (instrumentObject["unisonExpression"] == undefined) ? SynthConfig_1.Config.unisons[this.unison].expression : instrumentObject["unisonExpression"];
        this.unisonSign = (instrumentObject["unisonSign"] == undefined) ? SynthConfig_1.Config.unisons[this.unison].sign : instrumentObject["unisonSign"];
        if (instrumentObject["chorus"] == "custom harmony") {
            // The original chorus setting had an option that now maps to two different settings. Override those if necessary.
            this.unison = SynthConfig_1.Config.unisons.dictionary["hum"].index;
            this.chord = SynthConfig_1.Config.chords.dictionary["custom interval"].index;
        }
        if (this.chord != SynthConfig_1.Config.chords.dictionary["simultaneous"].index && !Array.isArray(instrumentObject["effects"])) {
            // Enable chord if it was used.
            this.effects = (this.effects | (1 << 11 /* EffectType.chord */));
        }
        if (instrumentObject["pitchShiftSemitones"] != undefined) {
            this.pitchShift = clamp(0, SynthConfig_1.Config.pitchShiftRange, Math.round(+instrumentObject["pitchShiftSemitones"]));
        }
        // modbox pitch shift, known in that mod as "octave offset"
        if (instrumentObject["octoff"] != undefined) {
            var potentialPitchShift = instrumentObject["octoff"];
            this.effects = (this.effects | (1 << 7 /* EffectType.pitchShift */));
            if ((potentialPitchShift == "+1 (octave)") || (potentialPitchShift == "+2 (2 octaves)")) {
                this.pitchShift = 24;
            }
            else if ((potentialPitchShift == "+1/2 (fifth)") || (potentialPitchShift == "+1 1/2 (octave and fifth)")) {
                this.pitchShift = 18;
            }
            else if ((potentialPitchShift == "-1 (octave)") || (potentialPitchShift == "-2 (2 octaves")) { //this typo is in modbox
                this.pitchShift = 0;
            }
            else if ((potentialPitchShift == "-1/2 (fifth)") || (potentialPitchShift == "-1 1/2 (octave and fifth)")) {
                this.pitchShift = 6;
            }
            else {
                this.pitchShift = 12;
            }
        }
        if (instrumentObject["detuneCents"] != undefined) {
            this.detune = clamp(SynthConfig_1.Config.detuneMin, SynthConfig_1.Config.detuneMax + 1, Math.round(Synth.centsToDetune(+instrumentObject["detuneCents"])));
        }
        this.vibrato = SynthConfig_1.Config.vibratos.dictionary["none"].index; // default value.
        var vibratoProperty = instrumentObject["vibrato"] || instrumentObject["effect"]; // The vibrato property was previously called "effect", not to be confused with the current "effects".
        if (vibratoProperty != undefined) {
            var legacyVibratoNames = { "vibrato light": "light", "vibrato delayed": "delayed", "vibrato heavy": "heavy" };
            var vibrato = SynthConfig_1.Config.vibratos.dictionary[legacyVibratoNames[unisonProperty]] || SynthConfig_1.Config.vibratos.dictionary[vibratoProperty];
            if (vibrato != undefined)
                this.vibrato = vibrato.index;
            else if (vibratoProperty == "custom")
                this.vibrato = SynthConfig_1.Config.vibratos.length; // custom
            if (this.vibrato == SynthConfig_1.Config.vibratos.length) {
                this.vibratoDepth = instrumentObject["vibratoDepth"];
                this.vibratoSpeed = instrumentObject["vibratoSpeed"];
                this.vibratoDelay = instrumentObject["vibratoDelay"];
                this.vibratoType = instrumentObject["vibratoType"];
            }
            else { // Set defaults for the vibrato profile
                this.vibratoDepth = SynthConfig_1.Config.vibratos[this.vibrato].amplitude;
                this.vibratoDelay = SynthConfig_1.Config.vibratos[this.vibrato].delayTicks / 2;
                this.vibratoSpeed = 10; // default;
                this.vibratoType = SynthConfig_1.Config.vibratos[this.vibrato].type;
            }
            // Old songs may have a vibrato effect without explicitly enabling it.
            if (vibrato != SynthConfig_1.Config.vibratos.dictionary["none"]) {
                this.effects = (this.effects | (1 << 9 /* EffectType.vibrato */));
            }
        }
        if (instrumentObject["pan"] != undefined) {
            this.pan = clamp(0, SynthConfig_1.Config.panMax + 1, Math.round(SynthConfig_1.Config.panCenter + (instrumentObject["pan"] | 0) * SynthConfig_1.Config.panCenter / 100));
        }
        else if (instrumentObject["ipan"] != undefined) {
            // support for modbox fixed
            this.pan = clamp(0, SynthConfig_1.Config.panMax + 1, SynthConfig_1.Config.panCenter + (instrumentObject["ipan"] * -50));
        }
        else {
            this.pan = SynthConfig_1.Config.panCenter;
        }
        // Old songs may have a panning effect without explicitly enabling it.
        if (this.pan != SynthConfig_1.Config.panCenter) {
            this.effects = (this.effects | (1 << 2 /* EffectType.panning */));
        }
        if (instrumentObject["panDelay"] != undefined) {
            this.panDelay = (instrumentObject["panDelay"] | 0);
        }
        else {
            this.panDelay = 0;
        }
        if (instrumentObject["detune"] != undefined) {
            this.detune = clamp(SynthConfig_1.Config.detuneMin, SynthConfig_1.Config.detuneMax + 1, (instrumentObject["detune"] | 0));
        }
        else if (instrumentObject["detuneCents"] == undefined) {
            this.detune = SynthConfig_1.Config.detuneCenter;
        }
        if (instrumentObject["ringMod"] != undefined) {
            this.ringModulation = clamp(0, SynthConfig_1.Config.ringModRange, Math.round((SynthConfig_1.Config.ringModRange - 1) * (instrumentObject["ringMod"] | 0) / 100));
        }
        if (instrumentObject["ringModHz"] != undefined) {
            this.ringModulationHz = clamp(0, SynthConfig_1.Config.ringModHzRange, Math.round((SynthConfig_1.Config.ringModHzRange - 1) * (instrumentObject["ringModHz"] | 0) / 100));
        }
        if (instrumentObject["ringModWaveformIndex"] != undefined) {
            this.ringModWaveformIndex = clamp(0, SynthConfig_1.Config.operatorWaves.length, instrumentObject["ringModWaveformIndex"]);
        }
        if (instrumentObject["ringModPulseWidth"] != undefined) {
            this.ringModPulseWidth = clamp(0, SynthConfig_1.Config.pulseWidthRange, Math.round((SynthConfig_1.Config.pulseWidthRange - 1) * (instrumentObject["ringModPulseWidth"] | 0) / 100));
        }
        if (instrumentObject["ringModHzOffset"] != undefined) {
            this.ringModHzOffset = clamp(0, SynthConfig_1.Config.rmHzOffsetMax, Math.round((SynthConfig_1.Config.rmHzOffsetMax - 1) * (instrumentObject["ringModHzOffset"] | 0) / 100));
        }
        if (instrumentObject["granular"] != undefined) {
            this.granular = instrumentObject["granular"];
        }
        if (instrumentObject["grainSize"] != undefined) {
            this.grainSize = instrumentObject["grainSize"];
        }
        if (instrumentObject["grainAmounts"] != undefined) {
            this.grainAmounts = instrumentObject["grainAmounts"];
        }
        if (instrumentObject["grainRange"] != undefined) {
            this.grainRange = clamp(0, SynthConfig_1.Config.grainRangeMax / SynthConfig_1.Config.grainSizeStep + 1, instrumentObject["grainRange"]);
        }
        if (instrumentObject["phaserMix"] != undefined) {
            this.phaserMix = clamp(0, SynthConfig_1.Config.phaserMixRange, Math.round((SynthConfig_1.Config.phaserMixRange - 1) * (instrumentObject["phaserMix"] | 0) / 100));
        }
        if (instrumentObject["phaserFreq"] != undefined) {
            this.phaserFreq = clamp(0, SynthConfig_1.Config.phaserFreqRange, Math.round((SynthConfig_1.Config.phaserFreqRange - 1) * (instrumentObject["phaserFreq"] | 0) / 100));
        }
        if (instrumentObject["phaserFeedback"] != undefined) {
            this.phaserFeedback = clamp(0, SynthConfig_1.Config.phaserFeedbackRange, Math.round((SynthConfig_1.Config.phaserFeedbackRange - 1) * (instrumentObject["phaserFeedback"] | 0) / 100));
        }
        if (instrumentObject["phaserStages"] != undefined) {
            this.phaserStages = clamp(0, SynthConfig_1.Config.phaserMaxStages, Math.round((SynthConfig_1.Config.phaserMaxStages - 1) * (instrumentObject["phaserStages"] | 0) / 100));
        }
        if (instrumentObject["distortion"] != undefined) {
            this.distortion = clamp(0, SynthConfig_1.Config.distortionRange, Math.round((SynthConfig_1.Config.distortionRange - 1) * (instrumentObject["distortion"] | 0) / 100));
        }
        if (instrumentObject["bitcrusherOctave"] != undefined) {
            this.bitcrusherFreq = SynthConfig_1.Config.bitcrusherFreqRange - 1 - (+instrumentObject["bitcrusherOctave"]) / SynthConfig_1.Config.bitcrusherOctaveStep;
        }
        if (instrumentObject["bitcrusherQuantization"] != undefined) {
            this.bitcrusherQuantization = clamp(0, SynthConfig_1.Config.bitcrusherQuantizationRange, Math.round((SynthConfig_1.Config.bitcrusherQuantizationRange - 1) * (instrumentObject["bitcrusherQuantization"] | 0) / 100));
        }
        if (instrumentObject["echoSustain"] != undefined) {
            this.echoSustain = clamp(0, SynthConfig_1.Config.echoSustainRange, Math.round((SynthConfig_1.Config.echoSustainRange - 1) * (instrumentObject["echoSustain"] | 0) / 100));
        }
        if (instrumentObject["echoDelayBeats"] != undefined) {
            this.echoDelay = clamp(0, SynthConfig_1.Config.echoDelayRange, Math.round((+instrumentObject["echoDelayBeats"]) * (SynthConfig_1.Config.ticksPerPart * SynthConfig_1.Config.partsPerBeat) / SynthConfig_1.Config.echoDelayStepTicks - 1.0));
        }
        if (!isNaN(instrumentObject["chorus"])) {
            this.chorus = clamp(0, SynthConfig_1.Config.chorusRange, Math.round((SynthConfig_1.Config.chorusRange - 1) * (instrumentObject["chorus"] | 0) / 100));
        }
        if (instrumentObject["reverb"] != undefined) {
            this.reverb = clamp(0, SynthConfig_1.Config.reverbRange, Math.round((SynthConfig_1.Config.reverbRange - 1) * (instrumentObject["reverb"] | 0) / 100));
        }
        else {
            this.reverb = legacyGlobalReverb;
        }
        if (instrumentObject["invertWave"] != undefined) {
            this.invertWave = instrumentObject["invertWave"];
        }
        if (instrumentObject["upperNoteLimit"] != undefined) {
            this.upperNoteLimit = instrumentObject["upperNoteLimit"];
        }
        if (instrumentObject["lowerNoteLimit"] != undefined) {
            this.lowerNoteLimit = instrumentObject["lowerNoteLimit"];
        }
        if (instrumentObject["pulseWidth"] != undefined) {
            this.pulseWidth = clamp(1, SynthConfig_1.Config.pulseWidthRange + 1, Math.round(instrumentObject["pulseWidth"]));
        }
        else {
            this.pulseWidth = SynthConfig_1.Config.pulseWidthRange;
        }
        if (instrumentObject["decimalOffset"] != undefined) {
            this.decimalOffset = clamp(0, 99 + 1, Math.round(instrumentObject["decimalOffset"]));
        }
        else {
            this.decimalOffset = 0;
        }
        if (instrumentObject["dynamism"] != undefined) {
            this.supersawDynamism = clamp(0, SynthConfig_1.Config.supersawDynamismMax + 1, Math.round(SynthConfig_1.Config.supersawDynamismMax * (instrumentObject["dynamism"] | 0) / 100));
        }
        else {
            this.supersawDynamism = SynthConfig_1.Config.supersawDynamismMax;
        }
        if (instrumentObject["spread"] != undefined) {
            this.supersawSpread = clamp(0, SynthConfig_1.Config.supersawSpreadMax + 1, Math.round(SynthConfig_1.Config.supersawSpreadMax * (instrumentObject["spread"] | 0) / 100));
        }
        else {
            this.supersawSpread = Math.ceil(SynthConfig_1.Config.supersawSpreadMax / 2.0);
        }
        if (instrumentObject["shape"] != undefined) {
            this.supersawShape = clamp(0, SynthConfig_1.Config.supersawShapeMax + 1, Math.round(SynthConfig_1.Config.supersawShapeMax * (instrumentObject["shape"] | 0) / 100));
        }
        else {
            this.supersawShape = 0;
        }
        if (instrumentObject["harmonics"] != undefined) {
            for (var i = 0; i < SynthConfig_1.Config.harmonicsControlPoints; i++) {
                this.harmonicsWave.harmonics[i] = Math.max(0, Math.min(SynthConfig_1.Config.harmonicsMax, Math.round(SynthConfig_1.Config.harmonicsMax * (+instrumentObject["harmonics"][i]) / 100)));
            }
            this.harmonicsWave.markCustomWaveDirty();
        }
        else {
            this.harmonicsWave.reset();
        }
        if (instrumentObject["spectrum"] != undefined) {
            for (var i = 0; i < SynthConfig_1.Config.spectrumControlPoints; i++) {
                this.spectrumWave.spectrum[i] = Math.max(0, Math.min(SynthConfig_1.Config.spectrumMax, Math.round(SynthConfig_1.Config.spectrumMax * (+instrumentObject["spectrum"][i]) / 100)));
                this.spectrumWave.markCustomWaveDirty();
            }
        }
        else {
            this.spectrumWave.reset(isNoiseChannel);
        }
        if (instrumentObject["stringSustain"] != undefined) {
            this.stringSustain = clamp(0, SynthConfig_1.Config.stringSustainRange, Math.round((SynthConfig_1.Config.stringSustainRange - 1) * (instrumentObject["stringSustain"] | 0) / 100));
        }
        else {
            this.stringSustain = 10;
        }
        this.stringSustainType = SynthConfig_1.Config.enableAcousticSustain ? SynthConfig_1.Config.sustainTypeNames.indexOf(instrumentObject["stringSustainType"]) : 0 /* SustainType.bright */;
        if (this.stringSustainType == -1)
            this.stringSustainType = 0 /* SustainType.bright */;
        if (this.type == 2 /* InstrumentType.noise */) {
            this.chipNoise = SynthConfig_1.Config.chipNoises.findIndex(function (wave) { return wave.name == instrumentObject["wave"]; });
            if (instrumentObject["wave"] == "pink noise")
                this.chipNoise = SynthConfig_1.Config.chipNoises.findIndex(function (wave) { return wave.name == "pink"; });
            if (instrumentObject["wave"] == "brownian noise")
                this.chipNoise = SynthConfig_1.Config.chipNoises.findIndex(function (wave) { return wave.name == "brownian"; });
            if (this.chipNoise == -1)
                this.chipNoise = 1;
        }
        var legacyEnvelopeNames = { "custom": "note size", "steady": "none", "pluck 1": "twang 1", "pluck 2": "twang 2", "pluck 3": "twang 3" };
        var getEnvelope = function (name) {
            if (legacyEnvelopeNames[name] != undefined)
                return SynthConfig_1.Config.envelopes.dictionary[legacyEnvelopeNames[name]];
            else {
                return SynthConfig_1.Config.envelopes.dictionary[name];
            }
        };
        if (this.type == 4 /* InstrumentType.drumset */) {
            if (instrumentObject["drums"] != undefined) {
                for (var j = 0; j < SynthConfig_1.Config.drumCount; j++) {
                    var drum = instrumentObject["drums"][j];
                    if (drum == undefined)
                        continue;
                    this.drumsetEnvelopes[j] = SynthConfig_1.Config.envelopes.dictionary["twang 2"].index; // default value.
                    if (drum["filterEnvelope"] != undefined) {
                        var envelope = getEnvelope(drum["filterEnvelope"]);
                        if (envelope != undefined)
                            this.drumsetEnvelopes[j] = envelope.index;
                    }
                    if (drum["spectrum"] != undefined) {
                        for (var i = 0; i < SynthConfig_1.Config.spectrumControlPoints; i++) {
                            this.drumsetSpectrumWaves[j].spectrum[i] = Math.max(0, Math.min(SynthConfig_1.Config.spectrumMax, Math.round(SynthConfig_1.Config.spectrumMax * (+drum["spectrum"][i]) / 100)));
                        }
                    }
                    this.drumsetSpectrumWaves[j].markCustomWaveDirty();
                }
            }
        }
        if (this.type == 0 /* InstrumentType.chip */) {
            var legacyWaveNames = { "triangle": 1, "square": 2, "pulse wide": 3, "pulse narrow": 4, "sawtooth": 5, "double saw": 6, "double pulse": 7, "spiky": 8, "plateau": 0 };
            var modboxWaveNames = { "10% pulse": 22, "sunsoft bass": 23, "loud pulse": 24, "sax": 25, "guitar": 26, "atari bass": 28, "atari pulse": 29, "1% pulse": 30, "curved sawtooth": 31, "viola": 32, "brass": 33, "acoustic bass": 34, "lyre": 35, "ramp pulse": 36, "piccolo": 37, "squaretooth": 38, "flatline": 39, "pnryshk a (u5)": 40, "pnryshk b (riff)": 41 };
            var sandboxWaveNames = { "shrill lute": 42, "shrill bass": 44, "nes pulse": 45, "saw bass": 46, "euphonium": 47, "shrill pulse": 48, "r-sawtooth": 49, "recorder": 50, "narrow saw": 51, "deep square": 52, "ring pulse": 53, "double sine": 54, "contrabass": 55, "double bass": 56 };
            var zefboxWaveNames = { "semi-square": 63, "deep square": 64, "squaretal": 40, "saw wide": 65, "saw narrow ": 66, "deep sawtooth": 67, "sawtal": 68, "pulse": 69, "triple pulse": 70, "high pulse": 71, "deep pulse": 72 };
            var miscWaveNames = { "test1": 56, "pokey 4bit lfsr": 57, "pokey 5step bass": 58, "isolated spiky": 59, "unnamed 1": 60, "unnamed 2": 61, "guitar string": 75, "intense": 76, "buzz wave": 77, "pokey square": 57, "pokey bass": 58, "banana wave": 83, "test 1": 84, "test 2": 84, "real snare": 85, "earthbound o. guitar": 86 };
            var paandorasboxWaveNames = { "kick": 87, "snare": 88, "piano1": 89, "WOW": 90, "overdrive": 91, "trumpet": 92, "saxophone": 93, "orchestrahit": 94, "detached violin": 95, "synth": 96, "sonic3snare": 97, "come on": 98, "choir": 99, "overdriveguitar": 100, "flute": 101, "legato violin": 102, "tremolo violin": 103, "amen break": 104, "pizzicato violin": 105, "tim allen grunt": 106, "tuba": 107, "loopingcymbal": 108, "standardkick": 109, "standardsnare": 110, "closedhihat": 111, "foothihat": 112, "openhihat": 113, "crashcymbal": 114, "pianoC4": 115, "liver pad": 116, "marimba": 117, "susdotwav": 118, "wackyboxtts": 119 };
            // const paandorasbetaWaveNames = {"contrabass": 55, "double bass": 56 };
            //this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]);
            this.chipWave = -1;
            var rawName_1 = instrumentObject["wave"];
            for (var _i = 0, _a = [
                legacyWaveNames,
                modboxWaveNames,
                sandboxWaveNames,
                zefboxWaveNames,
                miscWaveNames,
                paandorasboxWaveNames
            ]; _i < _a.length; _i++) {
                var table = _a[_i];
                if (this.chipWave == -1 && table[rawName_1] != undefined && SynthConfig_1.Config.chipWaves[table[rawName_1]] != undefined) {
                    this.chipWave = table[rawName_1];
                    break;
                }
            }
            if (this.chipWave == -1) {
                var potentialChipWaveIndex = SynthConfig_1.Config.chipWaves.findIndex(function (wave) { return wave.name == rawName_1; });
                if (potentialChipWaveIndex != -1)
                    this.chipWave = potentialChipWaveIndex;
            }
            // this.chipWave = legacyWaveNames[instrumentObject["wave"]] != undefined ? legacyWaveNames[instrumentObject["wave"]] : modboxWaveNames[instrumentObject["wave"]] != undefined ? modboxWaveNames[instrumentObject["wave"]] : sandboxWaveNames[instrumentObject["wave"]] != undefined ? sandboxWaveNames[instrumentObject["wave"]] : zefboxWaveNames[instrumentObject["wave"]] != undefined ? zefboxWaveNames[instrumentObject["wave"]] : miscWaveNames[instrumentObject["wave"]] != undefined ? miscWaveNames[instrumentObject["wave"]] : paandorasboxWaveNames[instrumentObject["wave"]] != undefined ? paandorasboxWaveNames[instrumentObject["wave"]] : Config.chipWaves.findIndex(wave => wave.name == instrumentObject["wave"]); 
            if (this.chipWave == -1)
                this.chipWave = 1;
        }
        if (this.type == 1 /* InstrumentType.fm */ || this.type == 11 /* InstrumentType.fm6op */) {
            if (this.type == 1 /* InstrumentType.fm */) {
                this.algorithm = SynthConfig_1.Config.algorithms.findIndex(function (algorithm) { return algorithm.name == instrumentObject["algorithm"]; });
                if (this.algorithm == -1)
                    this.algorithm = 0;
                this.feedbackType = SynthConfig_1.Config.feedbacks.findIndex(function (feedback) { return feedback.name == instrumentObject["feedbackType"]; });
                if (this.feedbackType == -1)
                    this.feedbackType = 0;
            }
            else {
                this.algorithm6Op = SynthConfig_1.Config.algorithms6Op.findIndex(function (algorithm6Op) { return algorithm6Op.name == instrumentObject["algorithm"]; });
                if (this.algorithm6Op == -1)
                    this.algorithm6Op = 1;
                if (this.algorithm6Op == 0) {
                    this.customAlgorithm.set(instrumentObject["customAlgorithm"]["carrierCount"], instrumentObject["customAlgorithm"]["mods"]);
                }
                else {
                    this.customAlgorithm.fromPreset(this.algorithm6Op);
                }
                this.feedbackType6Op = SynthConfig_1.Config.feedbacks6Op.findIndex(function (feedback6Op) { return feedback6Op.name == instrumentObject["feedbackType"]; });
                // SynthBox feedback support
                if (this.feedbackType6Op == -1) {
                    // These are all of the SynthBox feedback presets that aren't present in Gold/UltraBox
                    var synthboxLegacyFeedbacks = (0, SynthConfig_1.toNameMap)([
                        { name: "2⟲ 3⟲", indices: [[], [2], [3], [], [], []] },
                        { name: "3⟲ 4⟲", indices: [[], [], [3], [4], [], []] },
                        { name: "4⟲ 5⟲", indices: [[], [], [], [4], [5], []] },
                        { name: "5⟲ 6⟲", indices: [[], [], [], [], [5], [6]] },
                        { name: "1⟲ 6⟲", indices: [[1], [], [], [], [], [6]] },
                        { name: "1⟲ 3⟲", indices: [[1], [], [3], [], [], []] },
                        { name: "1⟲ 4⟲", indices: [[1], [], [], [4], [], []] },
                        { name: "1⟲ 5⟲", indices: [[1], [], [], [], [5], []] },
                        { name: "4⟲ 6⟲", indices: [[], [], [], [4], [], [6]] },
                        { name: "2⟲ 6⟲", indices: [[], [2], [], [], [], [6]] },
                        { name: "3⟲ 6⟲", indices: [[], [], [3], [], [], [6]] },
                        { name: "4⟲ 5⟲ 6⟲", indices: [[], [], [], [4], [5], [6]] },
                        { name: "1⟲ 3⟲ 6⟲", indices: [[1], [], [3], [], [], [6]] },
                        { name: "2→5", indices: [[], [], [], [], [2], []] },
                        { name: "2→6", indices: [[], [], [], [], [], [2]] },
                        { name: "3→5", indices: [[], [], [], [], [3], []] },
                        { name: "3→6", indices: [[], [], [], [], [], [3]] },
                        { name: "4→6", indices: [[], [], [], [], [], [4]] },
                        { name: "5→6", indices: [[], [], [], [], [], [5]] },
                        { name: "1→3→4", indices: [[], [], [1], [], [3], []] },
                        { name: "2→5→6", indices: [[], [], [], [], [2], [5]] },
                        { name: "2→4→6", indices: [[], [], [], [2], [], [4]] },
                        { name: "4→5→6", indices: [[], [], [], [], [4], [5]] },
                        { name: "3→4→5→6", indices: [[], [], [], [3], [4], [5]] },
                        { name: "2→3→4→5→6", indices: [[], [1], [2], [3], [4], [5]] },
                        { name: "1→2→3→4→5→6", indices: [[], [1], [2], [3], [4], [5]] },
                    ]);
                    var synthboxFeedbackType = synthboxLegacyFeedbacks[synthboxLegacyFeedbacks.findIndex(function (feedback) { return feedback.name == instrumentObject["feedbackType"]; })].indices;
                    if (synthboxFeedbackType != undefined) {
                        this.feedbackType6Op = 0;
                        this.customFeedbackType.set(synthboxFeedbackType);
                    }
                    else {
                        // if the feedback type STILL can't be resolved, default to the first non-custom option
                        this.feedbackType6Op = 1;
                    }
                }
                if ((this.feedbackType6Op == 0) && (instrumentObject["customFeedback"] != undefined)) {
                    this.customFeedbackType.set(instrumentObject["customFeedback"]["mods"]);
                }
                else {
                    this.customFeedbackType.fromPreset(this.feedbackType6Op);
                }
            }
            if (instrumentObject["feedbackAmplitude"] != undefined) {
                this.feedbackAmplitude = clamp(0, SynthConfig_1.Config.operatorAmplitudeMax + 1, instrumentObject["feedbackAmplitude"] | 0);
            }
            else {
                this.feedbackAmplitude = 0;
            }
            var _loop_1 = function (j) {
                var operator = this_1.operators[j];
                var operatorObject = undefined;
                if (instrumentObject["operators"] != undefined)
                    operatorObject = instrumentObject["operators"][j];
                if (operatorObject == undefined)
                    operatorObject = {};
                operator.frequency = SynthConfig_1.Config.operatorFrequencies.findIndex(function (freq) { return freq.name == operatorObject["frequency"]; });
                if (operator.frequency == -1)
                    operator.frequency = 0;
                if (operatorObject["amplitude"] != undefined) {
                    operator.amplitude = clamp(0, SynthConfig_1.Config.operatorAmplitudeMax + 1, operatorObject["amplitude"] | 0);
                }
                else {
                    operator.amplitude = 0;
                }
                if (operatorObject["waveform"] != undefined) {
                    // If the json is from GB, we override the last two waves to be sine to account for a bug
                    if (format == "goldbox" && j > 3) {
                        operator.waveform = 0;
                        return "continue";
                    }
                    operator.waveform = SynthConfig_1.Config.operatorWaves.findIndex(function (wave) { return wave.name == operatorObject["waveform"]; });
                    if (operator.waveform == -1) {
                        // GoldBox compatibility
                        if (operatorObject["waveform"] == "square") {
                            operator.waveform = SynthConfig_1.Config.operatorWaves.dictionary["pulse width"].index;
                            operator.pulseWidth = 5;
                        }
                        else if (operatorObject["waveform"] == "rounded") {
                            operator.waveform = SynthConfig_1.Config.operatorWaves.dictionary["quasi-sine"].index;
                        }
                        else {
                            operator.waveform = 0;
                        }
                    }
                }
                else {
                    operator.waveform = 0;
                }
                if (operatorObject["pulseWidth"] != undefined) {
                    operator.pulseWidth = operatorObject["pulseWidth"] | 0;
                }
                else {
                    operator.pulseWidth = 5;
                }
            };
            var this_1 = this;
            for (var j = 0; j < SynthConfig_1.Config.operatorCount + (this.type == 11 /* InstrumentType.fm6op */ ? 2 : 0); j++) {
                _loop_1(j);
            }
        }
        else if (this.type == 9 /* InstrumentType.customChipWave */) {
            if (instrumentObject["customChipWave"]) {
                for (var i = 0; i < 64; i++) {
                    this.customChipWave[i] = instrumentObject["customChipWave"][i];
                }
                var sum = 0.0;
                for (var i = 0; i < this.customChipWave.length; i++) {
                    sum += this.customChipWave[i];
                }
                var average = sum / this.customChipWave.length;
                // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                var cumulative = 0;
                var wavePrev = 0;
                for (var i = 0; i < this.customChipWave.length; i++) {
                    cumulative += wavePrev;
                    wavePrev = this.customChipWave[i] - average;
                    this.customChipWaveIntegral[i] = cumulative;
                }
                // 65th, last sample is for anti-aliasing
                this.customChipWaveIntegral[64] = 0.0;
            }
        }
        else if (this.type == 10 /* InstrumentType.mod */) {
            if (instrumentObject["modChannels"] != undefined) {
                for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                    this.modChannels[mod] = instrumentObject["modChannels"][mod];
                    this.modInstruments[mod] = instrumentObject["modInstruments"][mod];
                    this.modulators[mod] = instrumentObject["modSettings"][mod];
                    // Due to an oversight, this isn't included in JSONs prior to JB 2.6.
                    if (instrumentObject["modFilterTypes"] != undefined)
                        this.modFilterTypes[mod] = instrumentObject["modFilterTypes"][mod];
                    if (instrumentObject["modEnvelopeNumbers"] != undefined)
                        this.modEnvelopeNumbers[mod] = instrumentObject["modEnvelopeNumbers"][mod];
                }
            }
        }
        if (this.type != 10 /* InstrumentType.mod */) {
            // Arpeggio speed
            if (this.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index && instrumentObject["arpeggioSpeed"] != undefined) {
                this.arpeggioSpeed = instrumentObject["arpeggioSpeed"];
            }
            else {
                this.arpeggioSpeed = (useSlowerRhythm) ? 9 : 12; // Decide whether to import arps as x3/4 speed
            }
            if (this.chord == SynthConfig_1.Config.chords.dictionary["monophonic"].index && instrumentObject["monoChordTone"] != undefined) {
                this.monoChordTone = instrumentObject["monoChordTone"];
            }
            if (instrumentObject["fastTwoNoteArp"] != undefined) {
                this.fastTwoNoteArp = instrumentObject["fastTwoNoteArp"];
            }
            else {
                this.fastTwoNoteArp = useFastTwoNoteArp;
            }
            if (instrumentObject["clicklessTransition"] != undefined) {
                this.clicklessTransition = instrumentObject["clicklessTransition"];
            }
            else {
                this.clicklessTransition = false;
            }
            if (instrumentObject["aliases"] != undefined) {
                this.aliases = instrumentObject["aliases"];
            }
            else {
                // modbox had no anti-aliasing, so enable it for everything if that mode is selected
                if (format == "modbox") {
                    this.effects = (this.effects | (1 << 3 /* EffectType.distortion */));
                    this.aliases = true;
                    this.distortion = 0;
                }
                else {
                    this.aliases = false;
                }
            }
            if (instrumentObject["noteFilterType"] != undefined) {
                this.noteFilterType = instrumentObject["noteFilterType"];
            }
            if (instrumentObject["noteSimpleCut"] != undefined) {
                this.noteFilterSimpleCut = instrumentObject["noteSimpleCut"];
            }
            if (instrumentObject["noteSimplePeak"] != undefined) {
                this.noteFilterSimplePeak = instrumentObject["noteSimplePeak"];
            }
            if (instrumentObject["noteFilter"] != undefined) {
                this.noteFilter.fromJsonObject(instrumentObject["noteFilter"]);
            }
            else {
                this.noteFilter.reset();
            }
            for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                if (Array.isArray(instrumentObject["noteSubFilters" + i])) {
                    this.noteSubFilters[i] = new FilterSettings();
                    this.noteSubFilters[i].fromJsonObject(instrumentObject["noteSubFilters" + i]);
                }
            }
            if (instrumentObject["eqFilterType"] != undefined) {
                this.eqFilterType = instrumentObject["eqFilterType"];
            }
            if (instrumentObject["eqSimpleCut"] != undefined) {
                this.eqFilterSimpleCut = instrumentObject["eqSimpleCut"];
            }
            if (instrumentObject["eqSimplePeak"] != undefined) {
                this.eqFilterSimplePeak = instrumentObject["eqSimplePeak"];
            }
            if (Array.isArray(instrumentObject["eqFilter"])) {
                this.eqFilter.fromJsonObject(instrumentObject["eqFilter"]);
            }
            else {
                this.eqFilter.reset();
                var legacySettings = {};
                // Try converting from legacy filter settings.
                var filterCutoffMaxHz = 8000;
                var filterCutoffRange = 11;
                var filterResonanceRange = 8;
                if (instrumentObject["filterCutoffHz"] != undefined) {
                    legacySettings.filterCutoff = clamp(0, filterCutoffRange, Math.round((filterCutoffRange - 1) + 2.0 * Math.log((instrumentObject["filterCutoffHz"] | 0) / filterCutoffMaxHz) / Math.LN2));
                }
                else {
                    legacySettings.filterCutoff = (this.type == 0 /* InstrumentType.chip */) ? 6 : 10;
                }
                if (instrumentObject["filterResonance"] != undefined) {
                    legacySettings.filterResonance = clamp(0, filterResonanceRange, Math.round((filterResonanceRange - 1) * (instrumentObject["filterResonance"] | 0) / 100));
                }
                else {
                    legacySettings.filterResonance = 0;
                }
                legacySettings.filterEnvelope = getEnvelope(instrumentObject["filterEnvelope"]);
                legacySettings.pulseEnvelope = getEnvelope(instrumentObject["pulseEnvelope"]);
                legacySettings.feedbackEnvelope = getEnvelope(instrumentObject["feedbackEnvelope"]);
                if (Array.isArray(instrumentObject["operators"])) {
                    legacySettings.operatorEnvelopes = [];
                    for (var j = 0; j < SynthConfig_1.Config.operatorCount + (this.type == 11 /* InstrumentType.fm6op */ ? 2 : 0); j++) {
                        var envelope = void 0;
                        if (instrumentObject["operators"][j] != undefined) {
                            envelope = getEnvelope(instrumentObject["operators"][j]["envelope"]);
                        }
                        legacySettings.operatorEnvelopes[j] = (envelope != undefined) ? envelope : SynthConfig_1.Config.envelopes.dictionary["none"];
                    }
                }
                // Try converting from even older legacy filter settings.
                if (instrumentObject["filter"] != undefined) {
                    var legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                    var legacyToEnvelope = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];
                    var filterNames = ["none", "bright", "medium", "soft", "decay bright", "decay medium", "decay soft"];
                    var oldFilterNames = { "sustain sharp": 1, "sustain medium": 2, "sustain soft": 3, "decay sharp": 4 };
                    var legacyFilter = oldFilterNames[instrumentObject["filter"]] != undefined ? oldFilterNames[instrumentObject["filter"]] : filterNames.indexOf(instrumentObject["filter"]);
                    if (legacyFilter == -1)
                        legacyFilter = 0;
                    legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                    legacySettings.filterEnvelope = getEnvelope(legacyToEnvelope[legacyFilter]);
                    legacySettings.filterResonance = 0;
                }
                this.convertLegacySettings(legacySettings, true);
            }
            for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                if (Array.isArray(instrumentObject["eqSubFilters" + i])) {
                    this.eqSubFilters[i] = new FilterSettings();
                    this.eqSubFilters[i].fromJsonObject(instrumentObject["eqSubFilters" + i]);
                }
            }
            if (Array.isArray(instrumentObject["envelopes"])) {
                var envelopeArray = instrumentObject["envelopes"];
                for (var i = 0; i < envelopeArray.length; i++) {
                    if (this.envelopeCount >= SynthConfig_1.Config.maxEnvelopeCount)
                        break;
                    var tempEnvelope = new EnvelopeSettings(this.isNoiseInstrument);
                    tempEnvelope.fromJsonObject(envelopeArray[i], format);
                    //old pitch envelope detection
                    var pitchEnvelopeStart = void 0;
                    if (instrumentObject["pitchEnvelopeStart"] != undefined && instrumentObject["pitchEnvelopeStart"] != null) { //make sure is not null bc for some reason it can be
                        pitchEnvelopeStart = instrumentObject["pitchEnvelopeStart"];
                    }
                    else if (instrumentObject["pitchEnvelopeStart" + i] != undefined && instrumentObject["pitchEnvelopeStart" + i] != undefined) {
                        pitchEnvelopeStart = instrumentObject["pitchEnvelopeStart" + i];
                    }
                    else {
                        pitchEnvelopeStart = tempEnvelope.pitchEnvelopeStart;
                    }
                    var pitchEnvelopeEnd = void 0;
                    if (instrumentObject["pitchEnvelopeEnd"] != undefined && instrumentObject["pitchEnvelopeEnd"] != null) {
                        pitchEnvelopeEnd = instrumentObject["pitchEnvelopeEnd"];
                    }
                    else if (instrumentObject["pitchEnvelopeEnd" + i] != undefined && instrumentObject["pitchEnvelopeEnd" + i] != null) {
                        pitchEnvelopeEnd = instrumentObject["pitchEnvelopeEnd" + i];
                    }
                    else {
                        pitchEnvelopeEnd = tempEnvelope.pitchEnvelopeEnd;
                    }
                    var envelopeInverse = void 0;
                    if (instrumentObject["envelopeInverse" + i] != undefined && instrumentObject["envelopeInverse" + i] != null) {
                        envelopeInverse = instrumentObject["envelopeInverse" + i];
                    }
                    else if (instrumentObject["pitchEnvelopeInverse"] != undefined && instrumentObject["pitchEnvelopeInverse"] != null && SynthConfig_1.Config.envelopes[tempEnvelope.envelope].name == "pitch") { //assign only if a pitch envelope
                        envelopeInverse = instrumentObject["pitchEnvelopeInverse"];
                    }
                    else {
                        envelopeInverse = tempEnvelope.inverse;
                    }
                    var discreteEnvelope = void 0;
                    if (instrumentObject["discreteEnvelope"] != undefined) {
                        discreteEnvelope = instrumentObject["discreteEnvelope"];
                    }
                    else {
                        discreteEnvelope = tempEnvelope.discrete;
                    }
                    this.addEnvelope(tempEnvelope.target, tempEnvelope.index, tempEnvelope.envelope, true, pitchEnvelopeStart, pitchEnvelopeEnd, envelopeInverse, tempEnvelope.perEnvelopeSpeed, tempEnvelope.perEnvelopeLowerBound, tempEnvelope.perEnvelopeUpperBound, tempEnvelope.steps, tempEnvelope.seed, tempEnvelope.waveform, discreteEnvelope);
                }
            }
        }
        // advloop addition
        if (type === 0) {
            if (instrumentObject["isUsingAdvancedLoopControls"] != undefined) {
                this.isUsingAdvancedLoopControls = instrumentObject["isUsingAdvancedLoopControls"];
                this.chipWaveLoopStart = instrumentObject["chipWaveLoopStart"];
                this.chipWaveLoopEnd = instrumentObject["chipWaveLoopEnd"];
                this.chipWaveLoopMode = instrumentObject["chipWaveLoopMode"];
                this.chipWavePlayBackwards = instrumentObject["chipWavePlayBackwards"];
                this.chipWaveStartOffset = instrumentObject["chipWaveStartOffset"];
            }
            else {
                this.isUsingAdvancedLoopControls = false;
                this.chipWaveLoopStart = 0;
                this.chipWaveLoopEnd = SynthConfig_1.Config.rawRawChipWaves[this.chipWave].samples.length - 1;
                this.chipWaveLoopMode = 0;
                this.chipWavePlayBackwards = false;
                this.chipWaveStartOffset = 0;
            }
        }
    };
    // advloop addition
    Instrument.prototype.getLargestControlPointCount = function (forNoteFilter) {
        var largest;
        if (forNoteFilter) {
            largest = this.noteFilter.controlPointCount;
            for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                if (this.noteSubFilters[i] != null && this.noteSubFilters[i].controlPointCount > largest)
                    largest = this.noteSubFilters[i].controlPointCount;
            }
        }
        else {
            largest = this.eqFilter.controlPointCount;
            for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                if (this.eqSubFilters[i] != null && this.eqSubFilters[i].controlPointCount > largest)
                    largest = this.eqSubFilters[i].controlPointCount;
            }
        }
        return largest;
    };
    Instrument.frequencyFromPitch = function (pitch) {
        return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
    };
    Instrument.prototype.addEnvelope = function (target, index, envelope, newEnvelopes, start, end, inverse, perEnvelopeSpeed, perEnvelopeLowerBound, perEnvelopeUpperBound, steps, seed, waveform, discrete) {
        if (start === void 0) { start = 0; }
        if (end === void 0) { end = -1; }
        if (inverse === void 0) { inverse = false; }
        if (perEnvelopeSpeed === void 0) { perEnvelopeSpeed = -1; }
        if (perEnvelopeLowerBound === void 0) { perEnvelopeLowerBound = 0; }
        if (perEnvelopeUpperBound === void 0) { perEnvelopeUpperBound = 1; }
        if (steps === void 0) { steps = 2; }
        if (seed === void 0) { seed = 2; }
        if (waveform === void 0) { waveform = 0 /* LFOEnvelopeTypes.sine */; }
        if (discrete === void 0) { discrete = false; }
        end = end != -1 ? end : this.isNoiseInstrument ? SynthConfig_1.Config.drumCount - 1 : SynthConfig_1.Config.maxPitch; //find default if none is given
        perEnvelopeSpeed = perEnvelopeSpeed != -1 ? perEnvelopeSpeed : newEnvelopes ? 1 : SynthConfig_1.Config.envelopes[envelope].speed; //find default if none is given
        var makeEmpty = false;
        if (!this.supportsEnvelopeTarget(target, index))
            makeEmpty = true;
        if (this.envelopeCount >= SynthConfig_1.Config.maxEnvelopeCount)
            throw new Error();
        while (this.envelopes.length <= this.envelopeCount)
            this.envelopes[this.envelopes.length] = new EnvelopeSettings(this.isNoiseInstrument);
        var envelopeSettings = this.envelopes[this.envelopeCount];
        envelopeSettings.target = makeEmpty ? SynthConfig_1.Config.instrumentAutomationTargets.dictionary["none"].index : target;
        envelopeSettings.index = makeEmpty ? 0 : index;
        if (!newEnvelopes) {
            envelopeSettings.envelope = clamp(0, SynthConfig_1.Config.newEnvelopes.length, SynthConfig_1.Config.envelopes[envelope].type);
        }
        else {
            envelopeSettings.envelope = envelope;
        }
        envelopeSettings.pitchEnvelopeStart = start;
        envelopeSettings.pitchEnvelopeEnd = end;
        envelopeSettings.inverse = inverse;
        envelopeSettings.perEnvelopeSpeed = perEnvelopeSpeed;
        envelopeSettings.perEnvelopeLowerBound = perEnvelopeLowerBound;
        envelopeSettings.perEnvelopeUpperBound = perEnvelopeUpperBound;
        envelopeSettings.steps = steps;
        envelopeSettings.seed = seed;
        envelopeSettings.waveform = waveform;
        envelopeSettings.discrete = discrete;
        this.envelopeCount++;
    };
    Instrument.prototype.supportsEnvelopeTarget = function (target, index) {
        var automationTarget = SynthConfig_1.Config.instrumentAutomationTargets[target];
        if (automationTarget.computeIndex == null && automationTarget.name != "none") {
            return false;
        }
        if (index >= automationTarget.maxCount) {
            return false;
        }
        if (automationTarget.compatibleInstruments != null && automationTarget.compatibleInstruments.indexOf(this.type) == -1) {
            return false;
        }
        if (automationTarget.effect != null && (this.effects & (1 << automationTarget.effect)) == 0) {
            return false;
        }
        if (automationTarget.name == "arpeggioSpeed") {
            return (0, SynthConfig_1.effectsIncludeChord)(this.effects) && this.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index;
        }
        if (automationTarget.isFilter) {
            //if (automationTarget.perNote) {
            var useControlPointCount = this.noteFilter.controlPointCount;
            if (this.noteFilterType)
                useControlPointCount = 1;
            if (index >= useControlPointCount)
                return false;
            //} else {
            //	if (index >= this.eqFilter.controlPointCount)   return false;
            //}
        }
        if ((automationTarget.name == "operatorFrequency") || (automationTarget.name == "operatorAmplitude")) {
            if (index >= 4 + (this.type == 11 /* InstrumentType.fm6op */ ? 2 : 0))
                return false;
        }
        return true;
    };
    Instrument.prototype.clearInvalidEnvelopeTargets = function () {
        for (var envelopeIndex = 0; envelopeIndex < this.envelopeCount; envelopeIndex++) {
            var target = this.envelopes[envelopeIndex].target;
            var index = this.envelopes[envelopeIndex].index;
            if (!this.supportsEnvelopeTarget(target, index)) {
                this.envelopes[envelopeIndex].target = SynthConfig_1.Config.instrumentAutomationTargets.dictionary["none"].index;
                this.envelopes[envelopeIndex].index = 0;
            }
        }
    };
    Instrument.prototype.getTransition = function () {
        return (0, SynthConfig_1.effectsIncludeTransition)(this.effects) ? SynthConfig_1.Config.transitions[this.transition] :
            (this.type == 10 /* InstrumentType.mod */ ? SynthConfig_1.Config.transitions.dictionary["interrupt"] : SynthConfig_1.Config.transitions.dictionary["normal"]);
    };
    Instrument.prototype.getFadeInSeconds = function () {
        return (this.type == 4 /* InstrumentType.drumset */) ? 0.0 : Synth.fadeInSettingToSeconds(this.fadeIn);
    };
    Instrument.prototype.getFadeOutTicks = function () {
        return (this.type == 4 /* InstrumentType.drumset */) ? SynthConfig_1.Config.drumsetFadeOutTicks : Synth.fadeOutSettingToTicks(this.fadeOut);
    };
    Instrument.prototype.getChord = function () {
        return (0, SynthConfig_1.effectsIncludeChord)(this.effects) ? SynthConfig_1.Config.chords[this.chord] : SynthConfig_1.Config.chords.dictionary["simultaneous"];
    };
    Instrument.prototype.getDrumsetEnvelope = function (pitch) {
        if (this.type != 4 /* InstrumentType.drumset */)
            throw new Error("Can't getDrumsetEnvelope() for non-drumset.");
        return SynthConfig_1.Config.envelopes[this.drumsetEnvelopes[pitch]];
    };
    return Instrument;
}());
exports.Instrument = Instrument;
var Channel = /** @class */ (function () {
    function Channel() {
        this.octave = 0;
        this.instruments = [];
        this.patterns = [];
        this.bars = [];
        this.muted = false;
        this.name = "";
    }
    return Channel;
}());
exports.Channel = Channel;
var Song = /** @class */ (function () {
    function Song(string) {
        var _this = this;
        this.scaleCustom = [];
        this.channels = [];
        this.limitDecay = 4.0;
        this.limitRise = 4000.0;
        this.compressionThreshold = 1.0;
        this.limitThreshold = 1.0;
        this.compressionRatio = 1.0;
        this.limitRatio = 1.0;
        this.masterGain = 1.0;
        this.inVolumeCap = 0.0;
        this.outVolumeCap = 0.0;
        this.eqFilter = new FilterSettings();
        this.eqFilterType = false;
        this.eqFilterSimpleCut = SynthConfig_1.Config.filterSimpleCutRange - 1;
        this.eqFilterSimplePeak = 0;
        this.eqSubFilters = [];
        // Returns the ideal new note volume when dragging (max volume for a normal note, a "neutral" value for mod notes based on how they work)
        this.getNewNoteVolume = function (isMod, modChannel, modInstrument, modCount) {
            if (!isMod || modChannel == undefined || modInstrument == undefined || modCount == undefined)
                return SynthConfig_1.Config.noteSizeMax;
            else {
                // Sigh, the way pitches count up and the visual ordering in the UI are flipped.
                modCount = SynthConfig_1.Config.modCount - modCount - 1;
                var instrument = _this.channels[modChannel].instruments[modInstrument];
                var vol = SynthConfig_1.Config.modulators[instrument.modulators[modCount]].newNoteVol;
                var currentIndex = instrument.modulators[modCount];
                // For tempo, actually use user defined tempo
                var tempoIndex = SynthConfig_1.Config.modulators.dictionary["tempo"].index;
                if (currentIndex == tempoIndex)
                    vol = _this.tempo - SynthConfig_1.Config.modulators[tempoIndex].convertRealFactor;
                //for effects and envelopes, use the user defined value of the selected instrument (or the default value if all or active is selected)
                if (!SynthConfig_1.Config.modulators[currentIndex].forSong && instrument.modInstruments[modCount] < _this.channels[instrument.modChannels[modCount]].instruments.length) {
                    var chorusIndex = SynthConfig_1.Config.modulators.dictionary["chorus"].index;
                    var reverbIndex = SynthConfig_1.Config.modulators.dictionary["reverb"].index;
                    var panningIndex = SynthConfig_1.Config.modulators.dictionary["pan"].index;
                    var panDelayIndex = SynthConfig_1.Config.modulators.dictionary["pan delay"].index;
                    var distortionIndex = SynthConfig_1.Config.modulators.dictionary["distortion"].index;
                    var detuneIndex = SynthConfig_1.Config.modulators.dictionary["detune"].index;
                    var vibratoDepthIndex = SynthConfig_1.Config.modulators.dictionary["vibrato depth"].index;
                    var vibratoSpeedIndex = SynthConfig_1.Config.modulators.dictionary["vibrato speed"].index;
                    var vibratoDelayIndex = SynthConfig_1.Config.modulators.dictionary["vibrato delay"].index;
                    var arpSpeedIndex = SynthConfig_1.Config.modulators.dictionary["arp speed"].index;
                    var bitCrushIndex = SynthConfig_1.Config.modulators.dictionary["bit crush"].index;
                    var freqCrushIndex = SynthConfig_1.Config.modulators.dictionary["freq crush"].index;
                    var echoIndex = SynthConfig_1.Config.modulators.dictionary["echo"].index;
                    var echoDelayIndex = SynthConfig_1.Config.modulators.dictionary["echo delay"].index;
                    var pitchShiftIndex = SynthConfig_1.Config.modulators.dictionary["pitch shift"].index;
                    var ringModIndex = SynthConfig_1.Config.modulators.dictionary["ring modulation"].index;
                    var ringModHertzIndex = SynthConfig_1.Config.modulators.dictionary["ring mod hertz"].index;
                    var granularIndex = SynthConfig_1.Config.modulators.dictionary["granular"].index;
                    var grainAmountIndex = SynthConfig_1.Config.modulators.dictionary["grain freq"].index;
                    var grainSizeIndex = SynthConfig_1.Config.modulators.dictionary["grain size"].index;
                    var grainRangeIndex = SynthConfig_1.Config.modulators.dictionary["grain range"].index;
                    var envSpeedIndex = SynthConfig_1.Config.modulators.dictionary["envelope speed"].index;
                    var perEnvSpeedIndex = SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index;
                    var perEnvLowerIndex = SynthConfig_1.Config.modulators.dictionary["individual envelope lower bound"].index;
                    var perEnvUpperIndex = SynthConfig_1.Config.modulators.dictionary["individual envelope upper bound"].index;
                    var instrumentIndex = instrument.modInstruments[modCount];
                    switch (currentIndex) {
                        case chorusIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].chorus - SynthConfig_1.Config.modulators[chorusIndex].convertRealFactor;
                            break;
                        case reverbIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].reverb - SynthConfig_1.Config.modulators[reverbIndex].convertRealFactor;
                            break;
                        case panningIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].pan - SynthConfig_1.Config.modulators[panningIndex].convertRealFactor;
                            break;
                        case panDelayIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].panDelay - SynthConfig_1.Config.modulators[panDelayIndex].convertRealFactor;
                            break;
                        case distortionIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].distortion - SynthConfig_1.Config.modulators[distortionIndex].convertRealFactor;
                            break;
                        case detuneIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].detune;
                            break;
                        case vibratoDepthIndex:
                            vol = Math.round(_this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].vibratoDepth * 25 - SynthConfig_1.Config.modulators[vibratoDepthIndex].convertRealFactor);
                            break;
                        case vibratoSpeedIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].vibratoSpeed - SynthConfig_1.Config.modulators[vibratoSpeedIndex].convertRealFactor;
                            break;
                        case vibratoDelayIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].vibratoDelay - SynthConfig_1.Config.modulators[vibratoDelayIndex].convertRealFactor;
                            break;
                        case arpSpeedIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].arpeggioSpeed - SynthConfig_1.Config.modulators[arpSpeedIndex].convertRealFactor;
                            break;
                        case bitCrushIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].bitcrusherQuantization - SynthConfig_1.Config.modulators[bitCrushIndex].convertRealFactor;
                            break;
                        case freqCrushIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].bitcrusherFreq - SynthConfig_1.Config.modulators[freqCrushIndex].convertRealFactor;
                            break;
                        case echoIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].echoSustain - SynthConfig_1.Config.modulators[echoIndex].convertRealFactor;
                            break;
                        case echoDelayIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].echoDelay - SynthConfig_1.Config.modulators[echoDelayIndex].convertRealFactor;
                            break;
                        case pitchShiftIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].pitchShift;
                            break;
                        case ringModIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].ringModulation - SynthConfig_1.Config.modulators[ringModIndex].convertRealFactor;
                            break;
                        case ringModHertzIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].ringModulationHz - SynthConfig_1.Config.modulators[ringModHertzIndex].convertRealFactor;
                            break;
                        case granularIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].granular - SynthConfig_1.Config.modulators[granularIndex].convertRealFactor;
                            break;
                        case grainAmountIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].grainAmounts - SynthConfig_1.Config.modulators[grainAmountIndex].convertRealFactor;
                            break;
                        case grainSizeIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].grainSize - SynthConfig_1.Config.modulators[grainSizeIndex].convertRealFactor;
                            break;
                        case grainRangeIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].grainRange - SynthConfig_1.Config.modulators[grainRangeIndex].convertRealFactor;
                            break;
                        case envSpeedIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].envelopeSpeed - SynthConfig_1.Config.modulators[envSpeedIndex].convertRealFactor;
                            break;
                        case perEnvSpeedIndex:
                            vol = SynthConfig_1.Config.perEnvelopeSpeedToIndices[_this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].envelopes[instrument.modEnvelopeNumbers[modCount]].perEnvelopeSpeed] - SynthConfig_1.Config.modulators[perEnvSpeedIndex].convertRealFactor;
                            break;
                        case perEnvLowerIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].envelopes[instrument.modEnvelopeNumbers[modCount]].perEnvelopeLowerBound * 10 - SynthConfig_1.Config.modulators[perEnvLowerIndex].convertRealFactor;
                            break;
                        case perEnvUpperIndex:
                            vol = _this.channels[instrument.modChannels[modCount]].instruments[instrumentIndex].envelopes[instrument.modEnvelopeNumbers[modCount]].perEnvelopeUpperBound * 10 - SynthConfig_1.Config.modulators[perEnvUpperIndex].convertRealFactor;
                            break;
                    }
                }
                if (vol != undefined)
                    return vol;
                else
                    return SynthConfig_1.Config.noteSizeMax;
            }
        };
        this.getVolumeCap = function (isMod, modChannel, modInstrument, modCount) {
            if (!isMod || modChannel == undefined || modInstrument == undefined || modCount == undefined)
                return SynthConfig_1.Config.noteSizeMax;
            else {
                // Sigh, the way pitches count up and the visual ordering in the UI are flipped.
                modCount = SynthConfig_1.Config.modCount - modCount - 1;
                var instrument = _this.channels[modChannel].instruments[modInstrument];
                var modulator = SynthConfig_1.Config.modulators[instrument.modulators[modCount]];
                var cap = modulator.maxRawVol;
                if (cap != undefined) {
                    // For filters, cap is dependent on which filter setting is targeted
                    if (modulator.name == "eq filter" || modulator.name == "note filter" || modulator.name == "song eq") {
                        // type 0: number of filter morphs
                        // type 1/odd: number of filter x positions
                        // type 2/even: number of filter y positions
                        cap = SynthConfig_1.Config.filterMorphCount - 1;
                        if (instrument.modFilterTypes[modCount] > 0 && instrument.modFilterTypes[modCount] % 2) {
                            cap = SynthConfig_1.Config.filterFreqRange;
                        }
                        else if (instrument.modFilterTypes[modCount] > 0) {
                            cap = SynthConfig_1.Config.filterGainRange;
                        }
                    }
                    return cap;
                }
                else
                    return SynthConfig_1.Config.noteSizeMax;
            }
        };
        this.getVolumeCapForSetting = function (isMod, modSetting, filterType) {
            if (!isMod)
                return SynthConfig_1.Config.noteSizeMax;
            else {
                var cap = SynthConfig_1.Config.modulators[modSetting].maxRawVol;
                if (cap != undefined) {
                    // For filters, cap is dependent on which filter setting is targeted
                    if (filterType != undefined && (SynthConfig_1.Config.modulators[modSetting].name == "eq filter" || SynthConfig_1.Config.modulators[modSetting].name == "note filter" || SynthConfig_1.Config.modulators[modSetting].name == "song eq")) {
                        // type 0: number of filter morphs
                        // type 1/odd: number of filter x positions
                        // type 2/even: number of filter y positions
                        cap = SynthConfig_1.Config.filterMorphCount - 1;
                        if (filterType > 0 && filterType % 2) {
                            cap = SynthConfig_1.Config.filterFreqRange;
                        }
                        else if (filterType > 0) {
                            cap = SynthConfig_1.Config.filterGainRange;
                        }
                    }
                    return cap;
                }
                else
                    return SynthConfig_1.Config.noteSizeMax;
            }
        };
        if (string != undefined) {
            this.fromBase64String(string);
        }
        else {
            this.initToDefault(true);
        }
    }
    Song.prototype.getChannelCount = function () {
        return this.pitchChannelCount + this.noiseChannelCount + this.modChannelCount;
    };
    Song.prototype.getMaxInstrumentsPerChannel = function () {
        return Math.max(this.layeredInstruments ? SynthConfig_1.Config.layeredInstrumentCountMax : SynthConfig_1.Config.instrumentCountMin, this.patternInstruments ? SynthConfig_1.Config.patternInstrumentCountMax : SynthConfig_1.Config.instrumentCountMin);
    };
    Song.prototype.getMaxInstrumentsPerPattern = function (channelIndex) {
        return this.getMaxInstrumentsPerPatternForChannel(this.channels[channelIndex]);
    };
    Song.prototype.getMaxInstrumentsPerPatternForChannel = function (channel) {
        return this.layeredInstruments
            ? Math.min(SynthConfig_1.Config.layeredInstrumentCountMax, channel.instruments.length)
            : 1;
    };
    Song.prototype.getChannelIsNoise = function (channelIndex) {
        return (channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount);
    };
    Song.prototype.getChannelIsMod = function (channelIndex) {
        return (channelIndex >= this.pitchChannelCount + this.noiseChannelCount);
    };
    Song.prototype.initToDefault = function (andResetChannels) {
        if (andResetChannels === void 0) { andResetChannels = true; }
        this.scale = 0;
        this.scaleCustom = [true, false, false, false, false, false, false, false, false, false, false, false];
        //this.scaleCustom = [true, false, true, true, false, false, false, true, true, false, true, true];
        //this.scaleCustom = [true, false, false, false, false, false, false, false, false, false, false, false];
        this.key = 0;
        this.octave = 0;
        this.loopStart = 0;
        this.loopLength = 4;
        this.tempo = 150; //Default tempo returned to 150 for consistency with BeepBox and JummBox
        this.reverb = 0;
        this.beatsPerBar = 8;
        this.barCount = 16;
        this.patternsPerChannel = 8;
        this.rhythm = 1;
        this.layeredInstruments = false;
        this.patternInstruments = false;
        this.eqFilter.reset();
        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount - 1; i++) {
            this.eqSubFilters[i] = null;
        }
        //This is the tab's display name
        this.title = "Untitled";
        document.title = this.title + " - " + EditorConfig_1.EditorConfig.versionDisplayName;
        if (andResetChannels) {
            this.pitchChannelCount = 5; //Slarmoo's Box: 3
            this.noiseChannelCount = 1;
            this.modChannelCount = 1;
            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                var isNoiseChannel = channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount;
                var isModChannel = channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
                if (this.channels.length <= channelIndex) {
                    this.channels[channelIndex] = new Channel();
                }
                var channel = this.channels[channelIndex];
                channel.octave = Math.max(3 - channelIndex, 0); // [3, 2, 1, 0]; Descending octaves with drums at zero in last channel.
                for (var pattern = 0; pattern < this.patternsPerChannel; pattern++) {
                    if (channel.patterns.length <= pattern) {
                        channel.patterns[pattern] = new Pattern();
                    }
                    else {
                        channel.patterns[pattern].reset();
                    }
                }
                channel.patterns.length = this.patternsPerChannel;
                for (var instrument = 0; instrument < SynthConfig_1.Config.instrumentCountMin; instrument++) {
                    if (channel.instruments.length <= instrument) {
                        channel.instruments[instrument] = new Instrument(isNoiseChannel, isModChannel);
                    }
                    channel.instruments[instrument].setTypeAndReset(isModChannel ? 10 /* InstrumentType.mod */ : (isNoiseChannel ? 2 /* InstrumentType.noise */ : 0 /* InstrumentType.chip */), isNoiseChannel, isModChannel);
                }
                channel.instruments.length = SynthConfig_1.Config.instrumentCountMin;
                for (var bar = 0; bar < this.barCount; bar++) {
                    channel.bars[bar] = bar < 4 ? 1 : 0;
                }
                channel.bars.length = this.barCount;
            }
            this.channels.length = this.getChannelCount();
        }
    };
    //This determines the url
    Song.prototype.toBase64String = function () {
        var bits;
        var buffer = [];
        buffer.push(Song._variant);
        buffer.push(base64IntToCharCode[Song._latestJukeBoxVersion]);
        // Length of the song name string
        buffer.push(78 /* SongTagCode.songTitle */);
        var encodedSongTitle = encodeURIComponent(this.title);
        buffer.push(base64IntToCharCode[encodedSongTitle.length >> 6], base64IntToCharCode[encodedSongTitle.length & 0x3f]);
        // Actual encoded string follows
        for (var i_1 = 0; i_1 < encodedSongTitle.length; i_1++) {
            buffer.push(encodedSongTitle.charCodeAt(i_1));
        }
        buffer.push(110 /* SongTagCode.channelCount */, base64IntToCharCode[this.pitchChannelCount], base64IntToCharCode[this.noiseChannelCount], base64IntToCharCode[this.modChannelCount]);
        buffer.push(115 /* SongTagCode.scale */, base64IntToCharCode[this.scale]);
        if (this.scale == SynthConfig_1.Config.scales["dictionary"]["Custom"].index) {
            for (var i = 1; i < SynthConfig_1.Config.pitchesPerOctave; i++) {
                buffer.push(base64IntToCharCode[this.scaleCustom[i] ? 1 : 0]); // ineffiecent? yes, all we're going to do for now? hell yes
            }
        }
        buffer.push(107 /* SongTagCode.key */, base64IntToCharCode[this.key], base64IntToCharCode[this.octave - SynthConfig_1.Config.octaveMin]);
        buffer.push(108 /* SongTagCode.loopStart */, base64IntToCharCode[this.loopStart >> 6], base64IntToCharCode[this.loopStart & 0x3f]);
        buffer.push(101 /* SongTagCode.loopEnd */, base64IntToCharCode[(this.loopLength - 1) >> 6], base64IntToCharCode[(this.loopLength - 1) & 0x3f]);
        buffer.push(116 /* SongTagCode.tempo */, base64IntToCharCode[this.tempo >> 6], base64IntToCharCode[this.tempo & 0x3F]);
        buffer.push(97 /* SongTagCode.beatCount */, base64IntToCharCode[this.beatsPerBar - 1]);
        buffer.push(103 /* SongTagCode.barCount */, base64IntToCharCode[(this.barCount - 1) >> 6], base64IntToCharCode[(this.barCount - 1) & 0x3f]);
        buffer.push(106 /* SongTagCode.patternCount */, base64IntToCharCode[(this.patternsPerChannel - 1) >> 6], base64IntToCharCode[(this.patternsPerChannel - 1) & 0x3f]);
        buffer.push(114 /* SongTagCode.rhythm */, base64IntToCharCode[this.rhythm]);
        // Push limiter settings, but only if they aren't the default!
        buffer.push(79 /* SongTagCode.limiterSettings */);
        if (this.compressionRatio != 1.0 || this.limitRatio != 1.0 || this.limitRise != 4000.0 || this.limitDecay != 4.0 || this.limitThreshold != 1.0 || this.compressionThreshold != 1.0 || this.masterGain != 1.0) {
            buffer.push(base64IntToCharCode[Math.round(this.compressionRatio < 1 ? this.compressionRatio * 10 : 10 + (this.compressionRatio - 1) * 60)]); // 0 ~ 1.15 uneven, mapped to 0 ~ 20
            buffer.push(base64IntToCharCode[Math.round(this.limitRatio < 1 ? this.limitRatio * 10 : 9 + this.limitRatio)]); // 0 ~ 10 uneven, mapped to 0 ~ 20
            buffer.push(base64IntToCharCode[this.limitDecay]); // directly 1 ~ 30
            buffer.push(base64IntToCharCode[Math.round((this.limitRise - 2000.0) / 250.0)]); // 2000 ~ 10000 by 250, mapped to 0 ~ 32
            buffer.push(base64IntToCharCode[Math.round(this.compressionThreshold * 20)]); // 0 ~ 1.1 by 0.05, mapped to 0 ~ 22
            buffer.push(base64IntToCharCode[Math.round(this.limitThreshold * 20)]); // 0 ~ 2 by 0.05, mapped to 0 ~ 40
            buffer.push(base64IntToCharCode[Math.round(this.masterGain * 50) >> 6], base64IntToCharCode[Math.round(this.masterGain * 50) & 0x3f]); // 0 ~ 5 by 0.02, mapped to 0 ~ 250
        }
        else {
            buffer.push(base64IntToCharCode[0x3f]); // Not using limiter
        }
        //songeq
        buffer.push(99 /* SongTagCode.songEq */);
        if (this.eqFilter == null) {
            // Push null filter settings
            buffer.push(base64IntToCharCode[0]);
            console.log("Null EQ filter settings detected in toBase64String for song");
        }
        else {
            buffer.push(base64IntToCharCode[this.eqFilter.controlPointCount]);
            for (var j = 0; j < this.eqFilter.controlPointCount; j++) {
                var point = this.eqFilter.controlPoints[j];
                buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
            }
        }
        // Push subfilters as well. Skip Index 0, is a copy of the base filter.
        var usingSubFilterBitfield = 0;
        for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
            usingSubFilterBitfield |= (+(this.eqSubFilters[j + 1] != null) << j);
        }
        // Put subfilter usage into 2 chars (12 bits)
        buffer.push(base64IntToCharCode[usingSubFilterBitfield >> 6], base64IntToCharCode[usingSubFilterBitfield & 63]);
        // Put subfilter info in for all used subfilters
        for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
            if (usingSubFilterBitfield & (1 << j)) {
                buffer.push(base64IntToCharCode[this.eqSubFilters[j + 1].controlPointCount]);
                for (var k = 0; k < this.eqSubFilters[j + 1].controlPointCount; k++) {
                    var point = this.eqSubFilters[j + 1].controlPoints[k];
                    buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
                }
            }
        }
        buffer.push(85 /* SongTagCode.channelNames */);
        for (var channel = 0; channel < this.getChannelCount(); channel++) {
            // Length of the channel name string
            var encodedChannelName = encodeURIComponent(this.channels[channel].name);
            buffer.push(base64IntToCharCode[encodedChannelName.length >> 6], base64IntToCharCode[encodedChannelName.length & 0x3f]);
            // Actual encoded string follows
            for (var i_2 = 0; i_2 < encodedChannelName.length; i_2++) {
                buffer.push(encodedChannelName.charCodeAt(i_2));
            }
        }
        buffer.push(105 /* SongTagCode.instrumentCount */, base64IntToCharCode[(this.layeredInstruments << 1) | this.patternInstruments]);
        if (this.layeredInstruments || this.patternInstruments) {
            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                buffer.push(base64IntToCharCode[this.channels[channelIndex].instruments.length - SynthConfig_1.Config.instrumentCountMin]);
            }
        }
        buffer.push(111 /* SongTagCode.channelOctave */);
        for (var channelIndex = 0; channelIndex < this.pitchChannelCount; channelIndex++) {
            buffer.push(base64IntToCharCode[this.channels[channelIndex].octave]);
        }
        //This is for specific instrument stuff to url
        for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
            for (var i_3 = 0; i_3 < this.channels[channelIndex].instruments.length; i_3++) {
                var instrument = this.channels[channelIndex].instruments[i_3];
                buffer.push(84 /* SongTagCode.startInstrument */, base64IntToCharCode[instrument.type]);
                buffer.push(118 /* SongTagCode.volume */, base64IntToCharCode[(instrument.volume + SynthConfig_1.Config.volumeRange / 2) >> 6], base64IntToCharCode[(instrument.volume + SynthConfig_1.Config.volumeRange / 2) & 0x3f]);
                buffer.push(117 /* SongTagCode.preset */, base64IntToCharCode[instrument.preset >> 18], base64IntToCharCode[(instrument.preset >> 12) & 63], base64IntToCharCode[(instrument.preset >> 6) & 63], base64IntToCharCode[instrument.preset & 63]);
                buffer.push(102 /* SongTagCode.eqFilter */);
                buffer.push(base64IntToCharCode[+instrument.eqFilterType]);
                if (instrument.eqFilterType) {
                    buffer.push(base64IntToCharCode[instrument.eqFilterSimpleCut]);
                    buffer.push(base64IntToCharCode[instrument.eqFilterSimplePeak]);
                }
                else {
                    if (instrument.eqFilter == null) {
                        // Push null filter settings
                        buffer.push(base64IntToCharCode[0]);
                        console.log("Null EQ filter settings detected in toBase64String for channelIndex " + channelIndex + ", instrumentIndex " + i_3);
                    }
                    else {
                        buffer.push(base64IntToCharCode[instrument.eqFilter.controlPointCount]);
                        for (var j = 0; j < instrument.eqFilter.controlPointCount; j++) {
                            var point = instrument.eqFilter.controlPoints[j];
                            buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
                        }
                    }
                    // Push subfilters as well. Skip Index 0, is a copy of the base filter.
                    var usingSubFilterBitfield_1 = 0;
                    for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                        usingSubFilterBitfield_1 |= (+(instrument.eqSubFilters[j + 1] != null) << j);
                    }
                    // Put subfilter usage into 2 chars (12 bits)
                    buffer.push(base64IntToCharCode[usingSubFilterBitfield_1 >> 6], base64IntToCharCode[usingSubFilterBitfield_1 & 63]);
                    // Put subfilter info in for all used subfilters
                    for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                        if (usingSubFilterBitfield_1 & (1 << j)) {
                            buffer.push(base64IntToCharCode[instrument.eqSubFilters[j + 1].controlPointCount]);
                            for (var k = 0; k < instrument.eqSubFilters[j + 1].controlPointCount; k++) {
                                var point = instrument.eqSubFilters[j + 1].controlPoints[k];
                                buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
                            }
                        }
                    }
                }
                // The list of enabled effects is represented as a 14-bit bitfield using two six-bit characters.
                buffer.push(113 /* SongTagCode.effects */, base64IntToCharCode[(instrument.effects >> 12) & 63], base64IntToCharCode[(instrument.effects >> 6) & 63], base64IntToCharCode[instrument.effects & 63]);
                if ((0, SynthConfig_1.effectsIncludeNoteFilter)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[+instrument.noteFilterType]);
                    if (instrument.noteFilterType) {
                        buffer.push(base64IntToCharCode[instrument.noteFilterSimpleCut]);
                        buffer.push(base64IntToCharCode[instrument.noteFilterSimplePeak]);
                    }
                    else {
                        if (instrument.noteFilter == null) {
                            // Push null filter settings
                            buffer.push(base64IntToCharCode[0]);
                            console.log("Null note filter settings detected in toBase64String for channelIndex " + channelIndex + ", instrumentIndex " + i_3);
                        }
                        else {
                            buffer.push(base64IntToCharCode[instrument.noteFilter.controlPointCount]);
                            for (var j = 0; j < instrument.noteFilter.controlPointCount; j++) {
                                var point = instrument.noteFilter.controlPoints[j];
                                buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
                            }
                        }
                        // Push subfilters as well. Skip Index 0, is a copy of the base filter.
                        var usingSubFilterBitfield_2 = 0;
                        for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                            usingSubFilterBitfield_2 |= (+(instrument.noteSubFilters[j + 1] != null) << j);
                        }
                        // Put subfilter usage into 2 chars (12 bits)
                        buffer.push(base64IntToCharCode[usingSubFilterBitfield_2 >> 6], base64IntToCharCode[usingSubFilterBitfield_2 & 63]);
                        // Put subfilter info in for all used subfilters
                        for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                            if (usingSubFilterBitfield_2 & (1 << j)) {
                                buffer.push(base64IntToCharCode[instrument.noteSubFilters[j + 1].controlPointCount]);
                                for (var k = 0; k < instrument.noteSubFilters[j + 1].controlPointCount; k++) {
                                    var point = instrument.noteSubFilters[j + 1].controlPoints[k];
                                    buffer.push(base64IntToCharCode[point.type], base64IntToCharCode[Math.round(point.freq)], base64IntToCharCode[Math.round(point.gain)]);
                                }
                            }
                        }
                    }
                }
                if ((0, SynthConfig_1.effectsIncludeTransition)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.transition]);
                }
                if ((0, SynthConfig_1.effectsIncludeChord)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.chord]);
                    // Custom arpeggio speed... only if the instrument arpeggiates.
                    if (instrument.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index) {
                        buffer.push(base64IntToCharCode[instrument.arpeggioSpeed]);
                        buffer.push(base64IntToCharCode[+instrument.fastTwoNoteArp]); // Two note arp setting piggybacks on this
                    }
                    if (instrument.chord == SynthConfig_1.Config.chords.dictionary["monophonic"].index) {
                        buffer.push(base64IntToCharCode[instrument.monoChordTone]); //which note is selected
                    }
                }
                if ((0, SynthConfig_1.effectsIncludePitchShift)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.pitchShift]);
                }
                if ((0, SynthConfig_1.effectsIncludeDetune)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[(instrument.detune - SynthConfig_1.Config.detuneMin) >> 6], base64IntToCharCode[(instrument.detune - SynthConfig_1.Config.detuneMin) & 0x3F]);
                }
                if ((0, SynthConfig_1.effectsIncludeVibrato)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.vibrato]);
                    // Custom vibrato settings
                    if (instrument.vibrato == SynthConfig_1.Config.vibratos.length) {
                        buffer.push(base64IntToCharCode[Math.round(instrument.vibratoDepth * 25)]);
                        buffer.push(base64IntToCharCode[instrument.vibratoSpeed]);
                        buffer.push(base64IntToCharCode[Math.round(instrument.vibratoDelay)]);
                        buffer.push(base64IntToCharCode[instrument.vibratoType]);
                    }
                }
                if ((0, SynthConfig_1.effectsIncludeDistortion)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.distortion]);
                    // Aliasing is tied into distortion for now
                    buffer.push(base64IntToCharCode[+instrument.aliases]);
                }
                if ((0, SynthConfig_1.effectsIncludeBitcrusher)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.bitcrusherFreq], base64IntToCharCode[instrument.bitcrusherQuantization]);
                }
                if ((0, SynthConfig_1.effectsIncludePanning)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.pan >> 6], base64IntToCharCode[instrument.pan & 0x3f]);
                    buffer.push(base64IntToCharCode[instrument.panDelay]);
                }
                if ((0, SynthConfig_1.effectsIncludeChorus)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.chorus]);
                }
                if ((0, SynthConfig_1.effectsIncludeEcho)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.echoSustain], base64IntToCharCode[instrument.echoDelay]);
                }
                if ((0, SynthConfig_1.effectsIncludeReverb)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.reverb]);
                }
                if ((0, SynthConfig_1.effectsIncludeGranular)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.granular]);
                    buffer.push(base64IntToCharCode[instrument.grainSize]);
                    buffer.push(base64IntToCharCode[instrument.grainAmounts]);
                    buffer.push(base64IntToCharCode[instrument.grainRange]);
                }
                if ((0, SynthConfig_1.effectsIncludeRingModulation)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.ringModulation]);
                    buffer.push(base64IntToCharCode[instrument.ringModulationHz]);
                    buffer.push(base64IntToCharCode[instrument.ringModWaveformIndex]);
                    buffer.push(base64IntToCharCode[(instrument.ringModPulseWidth)]);
                    buffer.push(base64IntToCharCode[(instrument.ringModHzOffset - SynthConfig_1.Config.rmHzOffsetMin) >> 6], base64IntToCharCode[(instrument.ringModHzOffset - SynthConfig_1.Config.rmHzOffsetMin) & 0x3F]);
                }
                if ((0, SynthConfig_1.effectsIncludePhaser)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.phaserFreq]);
                    buffer.push(base64IntToCharCode[instrument.phaserFeedback]);
                    buffer.push(base64IntToCharCode[instrument.phaserStages]);
                    buffer.push(base64IntToCharCode[instrument.phaserMix]);
                }
                if ((0, SynthConfig_1.effectsIncludeInvertWave)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[+instrument.invertWave]);
                }
                if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument.effects)) {
                    buffer.push(base64IntToCharCode[instrument.upperNoteLimit >> 6], base64IntToCharCode[instrument.upperNoteLimit & 0x3f]);
                    buffer.push(base64IntToCharCode[instrument.lowerNoteLimit >> 6], base64IntToCharCode[instrument.lowerNoteLimit & 0x3f]);
                }
                if (instrument.type != 4 /* InstrumentType.drumset */) {
                    buffer.push(100 /* SongTagCode.fadeInOut */, base64IntToCharCode[instrument.fadeIn], base64IntToCharCode[instrument.fadeOut]);
                    // Transition info follows transition song tag
                    buffer.push(base64IntToCharCode[+instrument.clicklessTransition]);
                }
                if (instrument.type == 5 /* InstrumentType.harmonics */ || instrument.type == 7 /* InstrumentType.pickedString */) {
                    buffer.push(72 /* SongTagCode.harmonics */);
                    var harmonicsBits = new BitFieldWriter();
                    for (var i_4 = 0; i_4 < SynthConfig_1.Config.harmonicsControlPoints; i_4++) {
                        harmonicsBits.write(SynthConfig_1.Config.harmonicsControlPointBits, instrument.harmonicsWave.harmonics[i_4]);
                    }
                    harmonicsBits.encodeBase64(buffer);
                }
                if (instrument.type == 0 /* InstrumentType.chip */) {
                    if (instrument.chipWave > 186) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave - 186]);
                        buffer.push(base64IntToCharCode[3]);
                    }
                    else if (instrument.chipWave > 124) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave - 124]);
                        buffer.push(base64IntToCharCode[2]);
                    }
                    else if (instrument.chipWave > 62) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave - 62]);
                        buffer.push(base64IntToCharCode[1]);
                    }
                    else {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave]);
                        buffer.push(base64IntToCharCode[0]);
                    }
                    buffer.push(104, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                    // Repurposed for chip wave loop controls.
                    buffer.push(121 /* SongTagCode.loopControls */);
                    // The encoding here is as follows:
                    // 0b11111_1
                    //         ^-- isUsingAdvancedLoopControls
                    //   ^^^^^---- chipWaveLoopMode
                    // This essentially allocates 32 different loop modes,
                    // which should be plenty.
                    var encodedLoopMode = ((clamp(0, 31 + 1, instrument.chipWaveLoopMode) << 1)
                        | (instrument.isUsingAdvancedLoopControls ? 1 : 0));
                    buffer.push(base64IntToCharCode[encodedLoopMode]);
                    // The same encoding above is used here, but with the release mode
                    // (which isn't implemented currently), and the backwards toggle.
                    var encodedReleaseMode = ((clamp(0, 31 + 1, 0) << 1)
                        | (instrument.chipWavePlayBackwards ? 1 : 0));
                    buffer.push(base64IntToCharCode[encodedReleaseMode]);
                    encode32BitNumber(buffer, instrument.chipWaveLoopStart);
                    encode32BitNumber(buffer, instrument.chipWaveLoopEnd);
                    encode32BitNumber(buffer, instrument.chipWaveStartOffset);
                }
                else if (instrument.type == 1 /* InstrumentType.fm */ || instrument.type == 11 /* InstrumentType.fm6op */) {
                    if (instrument.type == 1 /* InstrumentType.fm */) {
                        buffer.push(65 /* SongTagCode.algorithm */, base64IntToCharCode[instrument.algorithm]);
                        buffer.push(70 /* SongTagCode.feedbackType */, base64IntToCharCode[instrument.feedbackType]);
                    }
                    else {
                        buffer.push(65 /* SongTagCode.algorithm */, base64IntToCharCode[instrument.algorithm6Op]);
                        if (instrument.algorithm6Op == 0) {
                            buffer.push(67 /* SongTagCode.chord */, base64IntToCharCode[instrument.customAlgorithm.carrierCount]);
                            buffer.push(113 /* SongTagCode.effects */);
                            for (var o = 0; o < instrument.customAlgorithm.modulatedBy.length; o++) {
                                for (var j = 0; j < instrument.customAlgorithm.modulatedBy[o].length; j++) {
                                    buffer.push(base64IntToCharCode[instrument.customAlgorithm.modulatedBy[o][j]]);
                                }
                                buffer.push(82 /* SongTagCode.operatorWaves */);
                            }
                            buffer.push(113 /* SongTagCode.effects */);
                        }
                        buffer.push(70 /* SongTagCode.feedbackType */, base64IntToCharCode[instrument.feedbackType6Op]);
                        if (instrument.feedbackType6Op == 0) {
                            buffer.push(113 /* SongTagCode.effects */);
                            for (var o = 0; o < instrument.customFeedbackType.indices.length; o++) {
                                for (var j = 0; j < instrument.customFeedbackType.indices[o].length; j++) {
                                    buffer.push(base64IntToCharCode[instrument.customFeedbackType.indices[o][j]]);
                                }
                                buffer.push(82 /* SongTagCode.operatorWaves */);
                            }
                            buffer.push(113 /* SongTagCode.effects */);
                        }
                    }
                    buffer.push(66 /* SongTagCode.feedbackAmplitude */, base64IntToCharCode[instrument.feedbackAmplitude]);
                    buffer.push(81 /* SongTagCode.operatorFrequencies */);
                    for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                        buffer.push(base64IntToCharCode[instrument.operators[o].frequency]);
                    }
                    buffer.push(80 /* SongTagCode.operatorAmplitudes */);
                    for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                        buffer.push(base64IntToCharCode[instrument.operators[o].amplitude]);
                    }
                    buffer.push(82 /* SongTagCode.operatorWaves */);
                    for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                        buffer.push(base64IntToCharCode[instrument.operators[o].waveform]);
                        // Push pulse width if that type is used
                        if (instrument.operators[o].waveform == 2) {
                            buffer.push(base64IntToCharCode[instrument.operators[o].pulseWidth]);
                        }
                    }
                }
                else if (instrument.type == 9 /* InstrumentType.customChipWave */) {
                    if (instrument.chipWave > 186) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave - 186]);
                        buffer.push(base64IntToCharCode[3]);
                    }
                    else if (instrument.chipWave > 124) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave - 124]);
                        buffer.push(base64IntToCharCode[2]);
                    }
                    else if (instrument.chipWave > 62) {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave - 62]);
                        buffer.push(base64IntToCharCode[1]);
                    }
                    else {
                        buffer.push(119, base64IntToCharCode[instrument.chipWave]);
                        buffer.push(base64IntToCharCode[0]);
                    }
                    buffer.push(104, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                    buffer.push(77 /* SongTagCode.customChipWave */);
                    // Push custom wave values
                    for (var j = 0; j < 64; j++) {
                        buffer.push(base64IntToCharCode[(instrument.customChipWave[j] + 24)]);
                    }
                }
                else if (instrument.type == 2 /* InstrumentType.noise */) {
                    buffer.push(119 /* SongTagCode.wave */, base64IntToCharCode[instrument.chipNoise]);
                    buffer.push(104 /* SongTagCode.unison */, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                }
                else if (instrument.type == 3 /* InstrumentType.spectrum */) {
                    buffer.push(83 /* SongTagCode.spectrum */);
                    var spectrumBits = new BitFieldWriter();
                    for (var i_5 = 0; i_5 < SynthConfig_1.Config.spectrumControlPoints; i_5++) {
                        spectrumBits.write(SynthConfig_1.Config.spectrumControlPointBits, instrument.spectrumWave.spectrum[i_5]);
                    }
                    spectrumBits.encodeBase64(buffer);
                    buffer.push(104 /* SongTagCode.unison */, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                }
                else if (instrument.type == 4 /* InstrumentType.drumset */) {
                    buffer.push(122 /* SongTagCode.drumsetEnvelopes */);
                    for (var j = 0; j < SynthConfig_1.Config.drumCount; j++) {
                        buffer.push(base64IntToCharCode[instrument.drumsetEnvelopes[j]]);
                    }
                    buffer.push(83 /* SongTagCode.spectrum */);
                    var spectrumBits = new BitFieldWriter();
                    for (var j = 0; j < SynthConfig_1.Config.drumCount; j++) {
                        for (var i_6 = 0; i_6 < SynthConfig_1.Config.spectrumControlPoints; i_6++) {
                            spectrumBits.write(SynthConfig_1.Config.spectrumControlPointBits, instrument.drumsetSpectrumWaves[j].spectrum[i_6]);
                        }
                    }
                    spectrumBits.encodeBase64(buffer);
                    buffer.push(104 /* SongTagCode.unison */, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                }
                else if (instrument.type == 5 /* InstrumentType.harmonics */) {
                    buffer.push(104 /* SongTagCode.unison */, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                }
                else if (instrument.type == 6 /* InstrumentType.pwm */) {
                    buffer.push(87 /* SongTagCode.pulseWidth */, base64IntToCharCode[instrument.pulseWidth]);
                    buffer.push(base64IntToCharCode[instrument.decimalOffset >> 6], base64IntToCharCode[instrument.decimalOffset & 0x3f]);
                    buffer.push(104 /* SongTagCode.unison */, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                }
                else if (instrument.type == 8 /* InstrumentType.supersaw */) {
                    buffer.push(120 /* SongTagCode.supersaw */, base64IntToCharCode[instrument.supersawDynamism], base64IntToCharCode[instrument.supersawSpread], base64IntToCharCode[instrument.supersawShape]);
                    buffer.push(87 /* SongTagCode.pulseWidth */, base64IntToCharCode[instrument.pulseWidth]);
                    buffer.push(base64IntToCharCode[instrument.decimalOffset >> 6], base64IntToCharCode[instrument.decimalOffset & 0x3f]);
                    buffer.push(104, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                }
                else if (instrument.type == 7 /* InstrumentType.pickedString */) {
                    if (SynthConfig_1.Config.stringSustainRange > 0x20 || 2 /* SustainType.length */ > 2) {
                        throw new Error("Not enough bits to represent sustain value and type in same base64 character.");
                    }
                    buffer.push(104 /* SongTagCode.unison */, base64IntToCharCode[instrument.unison]);
                    if (instrument.unison == SynthConfig_1.Config.unisons.length)
                        encodeUnisonSettings(buffer, instrument.unisonVoices, instrument.unisonSpread, instrument.unisonOffset, instrument.unisonExpression, instrument.unisonSign);
                    buffer.push(73 /* SongTagCode.stringSustain */, base64IntToCharCode[instrument.stringSustain | (instrument.stringSustainType << 5)]);
                }
                else if (instrument.type == 10 /* InstrumentType.mod */) {
                    // Handled down below. Could be moved, but meh.
                }
                else {
                    throw new Error("Unknown instrument type.");
                }
                buffer.push(69 /* SongTagCode.envelopes */, base64IntToCharCode[instrument.envelopeCount]);
                // Added in JB v6: Options for envelopes come next.
                buffer.push(base64IntToCharCode[instrument.envelopeSpeed]);
                for (var envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
                    buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].target]);
                    if (SynthConfig_1.Config.instrumentAutomationTargets[instrument.envelopes[envelopeIndex].target].maxCount > 1) {
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].index]);
                    }
                    buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].envelope]);
                    //run pitch envelope handling
                    if (SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name == "pitch") {
                        if (!instrument.isNoiseInstrument) {
                            buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeStart >> 6], base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeStart & 0x3f]);
                            buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeEnd >> 6], base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeEnd & 0x3f]);
                        }
                        else {
                            buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeStart]);
                            buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].pitchEnvelopeEnd]);
                        }
                        //random
                    }
                    else if (SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name == "random") {
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].steps]);
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].seed]);
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].waveform]);
                        //lfo
                    }
                    else if (SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name == "lfo") {
                        buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].waveform]);
                        if (instrument.envelopes[envelopeIndex].waveform == 5 /* LFOEnvelopeTypes.steppedSaw */ || instrument.envelopes[envelopeIndex].waveform == 6 /* LFOEnvelopeTypes.steppedTri */) {
                            buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].steps]);
                        }
                    }
                    //inverse
                    var checkboxValues = +instrument.envelopes[envelopeIndex].discrete;
                    checkboxValues = checkboxValues << 1;
                    checkboxValues += +instrument.envelopes[envelopeIndex].inverse;
                    buffer.push(base64IntToCharCode[checkboxValues] ? base64IntToCharCode[checkboxValues] : base64IntToCharCode[0]);
                    //midbox envelope port
                    if (SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name != "pitch" && SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name != "note size" && SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name != "punch" && SynthConfig_1.Config.newEnvelopes[instrument.envelopes[envelopeIndex].envelope].name != "none") {
                        buffer.push(base64IntToCharCode[SynthConfig_1.Config.perEnvelopeSpeedToIndices[instrument.envelopes[envelopeIndex].perEnvelopeSpeed]]);
                    }
                    buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].perEnvelopeLowerBound * 10]);
                    buffer.push(base64IntToCharCode[instrument.envelopes[envelopeIndex].perEnvelopeUpperBound * 10]);
                }
            }
        }
        buffer.push(98 /* SongTagCode.bars */);
        bits = new BitFieldWriter();
        var neededBits = 0;
        while ((1 << neededBits) < this.patternsPerChannel + 1)
            neededBits++;
        for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++)
            for (var i_7 = 0; i_7 < this.barCount; i_7++) {
                bits.write(neededBits, this.channels[channelIndex].bars[i_7]);
            }
        bits.encodeBase64(buffer);
        buffer.push(112 /* SongTagCode.patterns */);
        bits = new BitFieldWriter();
        var shapeBits = new BitFieldWriter();
        var bitsPerNoteSize = Song.getNeededBits(SynthConfig_1.Config.noteSizeMax);
        for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
            var channel = this.channels[channelIndex];
            var maxInstrumentsPerPattern = this.getMaxInstrumentsPerPattern(channelIndex);
            var isNoiseChannel = this.getChannelIsNoise(channelIndex);
            var isModChannel = this.getChannelIsMod(channelIndex);
            var neededInstrumentCountBits = Song.getNeededBits(maxInstrumentsPerPattern - SynthConfig_1.Config.instrumentCountMin);
            var neededInstrumentIndexBits = Song.getNeededBits(channel.instruments.length - 1);
            // Some info about modulator settings immediately follows in mod channels.
            if (isModChannel) {
                var neededModInstrumentIndexBits = Song.getNeededBits(this.getMaxInstrumentsPerChannel() + 2);
                for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                    var instrument = this.channels[channelIndex].instruments[instrumentIndex];
                    for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                        var modChannel = instrument.modChannels[mod];
                        var modInstrument = instrument.modInstruments[mod];
                        var modSetting = instrument.modulators[mod];
                        var modFilter = instrument.modFilterTypes[mod];
                        var modEnvelope = instrument.modEnvelopeNumbers[mod];
                        // Still using legacy "mod status" format, but doing it manually as it's only used in the URL now.
                        // 0 - For pitch/noise
                        // 1 - (used to be For noise, not needed)
                        // 2 - For song
                        // 3 - None
                        var status_1 = SynthConfig_1.Config.modulators[modSetting].forSong ? 2 : 0;
                        if (modSetting == SynthConfig_1.Config.modulators.dictionary["none"].index)
                            status_1 = 3;
                        bits.write(2, status_1);
                        // Channel/Instrument is only used if the status isn't "song" or "none".
                        if (status_1 == 0 || status_1 == 1) {
                            bits.write(8, modChannel);
                            bits.write(neededModInstrumentIndexBits, modInstrument);
                        }
                        // Only used if setting isn't "none".
                        if (status_1 != 3) {
                            bits.write(6, modSetting);
                        }
                        // Write mod filter info, only if this is a filter mod
                        if (SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "eq filter" || SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "note filter" || SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "song eq") {
                            bits.write(6, modFilter);
                        }
                        //write envelope info only if needed
                        if (SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "individual envelope speed" ||
                            SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "reset envelope" ||
                            SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "individual envelope lower bound" ||
                            SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "individual envelope upper bound") {
                            bits.write(6, modEnvelope);
                        }
                    }
                }
            }
            var octaveOffset = (isNoiseChannel || isModChannel) ? 0 : channel.octave * SynthConfig_1.Config.pitchesPerOctave;
            var lastPitch = (isNoiseChannel ? 4 : octaveOffset);
            var recentPitches = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12]);
            var recentShapes = [];
            for (var i_8 = 0; i_8 < recentPitches.length; i_8++) {
                recentPitches[i_8] += octaveOffset;
            }
            for (var _i = 0, _a = channel.patterns; _i < _a.length; _i++) {
                var pattern = _a[_i];
                if (this.patternInstruments) {
                    var instrumentCount = validateRange(SynthConfig_1.Config.instrumentCountMin, maxInstrumentsPerPattern, pattern.instruments.length);
                    bits.write(neededInstrumentCountBits, instrumentCount - SynthConfig_1.Config.instrumentCountMin);
                    for (var i_9 = 0; i_9 < instrumentCount; i_9++) {
                        bits.write(neededInstrumentIndexBits, pattern.instruments[i_9]);
                    }
                }
                if (pattern.notes.length > 0) {
                    bits.write(1, 1);
                    var curPart = 0;
                    for (var _b = 0, _c = pattern.notes; _b < _c.length; _b++) {
                        var note = _c[_b];
                        // For mod channels, a negative offset may be necessary.
                        if (note.start < curPart && isModChannel) {
                            bits.write(2, 0); // rest, then...
                            bits.write(1, 1); // negative offset
                            bits.writePartDuration(curPart - note.start);
                        }
                        if (note.start > curPart) {
                            bits.write(2, 0); // rest
                            if (isModChannel)
                                bits.write(1, 0); // positive offset, only needed for mod channels
                            bits.writePartDuration(note.start - curPart);
                        }
                        shapeBits.clear();
                        // Old format was:
                        // 0: 1 pitch, 10: 2 pitches, 110: 3 pitches, 111: 4 pitches
                        // New format is:
                        //      0: 1 pitch
                        // 1[XXX]: 3 bits of binary signifying 2+ pitches
                        if (note.pitches.length == 1) {
                            shapeBits.write(1, 0);
                        }
                        else {
                            shapeBits.write(1, 1);
                            shapeBits.write(3, note.pitches.length - 2);
                        }
                        shapeBits.writePinCount(note.pins.length - 1);
                        if (!isModChannel) {
                            shapeBits.write(bitsPerNoteSize, note.pins[0].size); // volume
                        }
                        else {
                            shapeBits.write(11, note.pins[0].size); // Modulator value. had to change from 9 to 11 for 2000 max tempo
                        }
                        var shapePart = 0;
                        var startPitch = note.pitches[0];
                        var currentPitch = startPitch;
                        var pitchBends = [];
                        for (var i_10 = 1; i_10 < note.pins.length; i_10++) {
                            var pin = note.pins[i_10];
                            var nextPitch = startPitch + pin.interval;
                            if (currentPitch != nextPitch) {
                                shapeBits.write(1, 1);
                                pitchBends.push(nextPitch);
                                currentPitch = nextPitch;
                            }
                            else {
                                shapeBits.write(1, 0);
                            }
                            shapeBits.writePartDuration(pin.time - shapePart);
                            shapePart = pin.time;
                            if (!isModChannel) {
                                shapeBits.write(bitsPerNoteSize, pin.size);
                            }
                            else {
                                shapeBits.write(11, pin.size); // Modulator value. had to change from 9 to 11 for 2000 max tempo
                            }
                        }
                        var shapeString = String.fromCharCode.apply(null, shapeBits.encodeBase64([]));
                        var shapeIndex = recentShapes.indexOf(shapeString);
                        if (shapeIndex == -1) {
                            bits.write(2, 1); // new shape
                            bits.concat(shapeBits);
                        }
                        else {
                            bits.write(1, 1); // old shape
                            bits.writeLongTail(0, 0, shapeIndex);
                            recentShapes.splice(shapeIndex, 1);
                        }
                        recentShapes.unshift(shapeString);
                        if (recentShapes.length > 10)
                            recentShapes.pop();
                        var allPitches = note.pitches.concat(pitchBends);
                        for (var i_11 = 0; i_11 < allPitches.length; i_11++) {
                            var pitch = allPitches[i_11];
                            var pitchIndex = recentPitches.indexOf(pitch);
                            if (pitchIndex == -1) {
                                var interval = 0;
                                var pitchIter = lastPitch;
                                if (pitchIter < pitch) {
                                    while (pitchIter != pitch) {
                                        pitchIter++;
                                        if (recentPitches.indexOf(pitchIter) == -1)
                                            interval++;
                                    }
                                }
                                else {
                                    while (pitchIter != pitch) {
                                        pitchIter--;
                                        if (recentPitches.indexOf(pitchIter) == -1)
                                            interval--;
                                    }
                                }
                                bits.write(1, 0);
                                bits.writePitchInterval(interval);
                            }
                            else {
                                bits.write(1, 1);
                                bits.write(4, pitchIndex);
                                recentPitches.splice(pitchIndex, 1);
                            }
                            recentPitches.unshift(pitch);
                            if (recentPitches.length > 16)
                                recentPitches.pop();
                            if (i_11 == note.pitches.length - 1) {
                                lastPitch = note.pitches[0];
                            }
                            else {
                                lastPitch = pitch;
                            }
                        }
                        if (note.start == 0) {
                            bits.write(1, note.continuesLastPattern ? 1 : 0);
                        }
                        curPart = note.end;
                    }
                    if (curPart < this.beatsPerBar * SynthConfig_1.Config.partsPerBeat + (+isModChannel)) {
                        bits.write(2, 0); // rest
                        if (isModChannel)
                            bits.write(1, 0); // positive offset
                        bits.writePartDuration(this.beatsPerBar * SynthConfig_1.Config.partsPerBeat + (+isModChannel) - curPart);
                    }
                }
                else {
                    bits.write(1, 0);
                }
            }
        }
        var stringLength = bits.lengthBase64();
        var digits = [];
        while (stringLength > 0) {
            digits.unshift(base64IntToCharCode[stringLength & 0x3f]);
            stringLength = stringLength >> 6;
        }
        buffer.push(base64IntToCharCode[digits.length]);
        Array.prototype.push.apply(buffer, digits); // append digits to buffer.
        bits.encodeBase64(buffer);
        var maxApplyArgs = 64000;
        var customSamplesStr = "";
        if (EditorConfig_1.EditorConfig.customSamples != undefined && EditorConfig_1.EditorConfig.customSamples.length > 0) {
            customSamplesStr = "|" + EditorConfig_1.EditorConfig.customSamples.join("|");
        }
        //samplemark
        if (buffer.length < maxApplyArgs) {
            // Note: Function.apply may break for long argument lists. 
            return String.fromCharCode.apply(null, buffer) + customSamplesStr;
            //samplemark
        }
        else {
            var result = "";
            for (var i_12 = 0; i_12 < buffer.length; i_12 += maxApplyArgs) {
                result += String.fromCharCode.apply(null, buffer.slice(i_12, i_12 + maxApplyArgs));
            }
            return result + customSamplesStr;
            //samplemark
        }
    };
    Song._envelopeFromLegacyIndex = function (legacyIndex) {
        // I swapped the order of "custom"/"steady", now "none"/"note size".
        if (legacyIndex == 0)
            legacyIndex = 1;
        else if (legacyIndex == 1)
            legacyIndex = 0;
        return SynthConfig_1.Config.envelopes[clamp(0, SynthConfig_1.Config.envelopes.length, legacyIndex)];
    };
    Song.prototype.fromBase64String = function (compressed, jsonFormat) {
        if (jsonFormat === void 0) { jsonFormat = "auto"; }
        if (compressed == null || compressed == "") {
            Song._clearSamples();
            this.initToDefault(true);
            return;
        }
        var charIndex = 0;
        // skip whitespace.
        while (compressed.charCodeAt(charIndex) <= 32 /* CharCode.SPACE */)
            charIndex++;
        // skip hash mark.
        if (compressed.charCodeAt(charIndex) == 35 /* CharCode.HASH */)
            charIndex++;
        // if it starts with curly brace, treat it as JSON.
        if (compressed.charCodeAt(charIndex) == 123 /* CharCode.LEFT_CURLY_BRACE */) {
            this.fromJsonObject(JSON.parse(charIndex == 0 ? compressed : compressed.substring(charIndex)), jsonFormat);
            return;
        }
        var variantTest = compressed.charCodeAt(charIndex);
        //I cleaned up these boolean setters with an initial value. Idk why this wasn't done earlier...
        var fromBeepBox = false;
        var fromJummBox = false;
        var fromGoldBox = false;
        var fromUltraBox = false;
        var fromSlarmoosBox = false;
        var fromJukeBox = false;
        // let fromMidbox: boolean;
        // let fromDogebox2: boolean;
        // let fromAbyssBox: boolean;
        // Detect variant here. If version doesn't match known variant, assume it is a vanilla string which does not report variant.
        if (variantTest == 0x6A) { //"j"
            fromJummBox = true;
            charIndex++;
        }
        else if (variantTest == 0x67) { //"g"
            fromGoldBox = true;
            charIndex++;
        }
        else if (variantTest == 0x75) { //"u"
            fromUltraBox = true;
            charIndex++;
        }
        else if (variantTest == 0x64) { //"d" 
            fromJummBox = true;
            // to-do: add explicit dogebox2 support
            //fromDogeBox2 = true;
            charIndex++;
        }
        else if (variantTest == 0x61) { //"a" Abyssbox does urls the same as ultrabox //not quite anymore, but oh well
            fromUltraBox = true;
            charIndex++;
        }
        else if (variantTest == 0x73) { //"s"
            fromSlarmoosBox = true;
            charIndex++;
        }
        else if (variantTest == 0x4a) { //"J"
            fromJukeBox = true;
            charIndex++;
        }
        else {
            fromBeepBox = true;
        }
        var version = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
        if (fromBeepBox && (version == -1 || version > Song._latestBeepboxVersion || version < Song._oldestBeepboxVersion))
            return;
        if (fromJummBox && (version == -1 || version > Song._latestJummBoxVersion || version < Song._oldestJummBoxVersion))
            return;
        if (fromGoldBox && (version == -1 || version > Song._latestGoldBoxVersion || version < Song._oldestGoldBoxVersion))
            return;
        if (fromUltraBox && (version == -1 || version > Song._latestUltraBoxVersion || version < Song._oldestUltraBoxVersion))
            return;
        if (fromSlarmoosBox && (version == -1 || version > Song._latestSlarmoosBoxVersion || version < Song._oldestSlarmoosBoxVersion))
            return;
        if (fromJukeBox && (version == -1 || version > Song._latestJukeBoxVersion || version < Song._oldestJukeBoxVersion))
            return;
        var beforeTwo = version < 2;
        var beforeThree = version < 3;
        var beforeFour = version < 4;
        var beforeFive = version < 5;
        var beforeSix = version < 6;
        var beforeSeven = version < 7;
        var beforeEight = version < 8;
        var beforeNine = version < 9;
        this.initToDefault((fromBeepBox && beforeNine) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)));
        var forceSimpleFilter = (fromBeepBox && beforeNine || fromJummBox && beforeFive);
        var willLoadLegacySamplesForOldSongs = false;
        if (fromJukeBox || fromSlarmoosBox || fromUltraBox || fromGoldBox) {
            compressed = compressed.replaceAll("%7C", "|");
            var compressed_array = compressed.split("|");
            compressed = compressed_array.shift();
            if (EditorConfig_1.EditorConfig.customSamples == null || EditorConfig_1.EditorConfig.customSamples.join(", ") != compressed_array.join(", ")) {
                Song._restoreChipWaveListToDefault();
                var willLoadLegacySamples = false;
                var willLoadNintariboxSamples = false;
                var willLoadMarioPaintboxSamples = false;
                var customSampleUrls = [];
                var customSamplePresets = [];
                SynthConfig_1.sampleLoadingState.statusTable = {};
                SynthConfig_1.sampleLoadingState.urlTable = {};
                SynthConfig_1.sampleLoadingState.totalSamples = 0;
                SynthConfig_1.sampleLoadingState.samplesLoaded = 0;
                SynthConfig_1.sampleLoadEvents.dispatchEvent(new SynthConfig_1.SampleLoadedEvent(SynthConfig_1.sampleLoadingState.totalSamples, SynthConfig_1.sampleLoadingState.samplesLoaded));
                for (var _i = 0, compressed_array_1 = compressed_array; _i < compressed_array_1.length; _i++) {
                    var url = compressed_array_1[_i];
                    if (url.toLowerCase() === "legacysamples") {
                        if (!willLoadLegacySamples) {
                            willLoadLegacySamples = true;
                            customSampleUrls.push(url);
                            (0, SynthConfig_1.loadBuiltInSamples)(0);
                        }
                    }
                    else if (url.toLowerCase() === "nintariboxsamples") {
                        if (!willLoadNintariboxSamples) {
                            willLoadNintariboxSamples = true;
                            customSampleUrls.push(url);
                            (0, SynthConfig_1.loadBuiltInSamples)(1);
                        }
                    }
                    else if (url.toLowerCase() === "mariopaintboxsamples") {
                        if (!willLoadMarioPaintboxSamples) {
                            willLoadMarioPaintboxSamples = true;
                            customSampleUrls.push(url);
                            (0, SynthConfig_1.loadBuiltInSamples)(2);
                        }
                    }
                    else {
                        // UB version 2 URLs and below will be using the old syntax, so we do need to parse it in that case.
                        // UB version 3 URLs should only have the new syntax, though, unless the user has edited the URL manually.
                        var parseOldSyntax = beforeThree;
                        var ok = Song._parseAndConfigureCustomSample(url, customSampleUrls, customSamplePresets, SynthConfig_1.sampleLoadingState, parseOldSyntax);
                        if (!ok) {
                            continue;
                        }
                    }
                }
                if (customSampleUrls.length > 0) {
                    EditorConfig_1.EditorConfig.customSamples = customSampleUrls;
                }
                if (customSamplePresets.length > 0) {
                    var customSamplePresetsMap = (0, SynthConfig_1.toNameMap)(customSamplePresets);
                    EditorConfig_1.EditorConfig.presetCategories[EditorConfig_1.EditorConfig.presetCategories.length] = {
                        name: "Custom Sample Presets",
                        presets: customSamplePresetsMap,
                        index: EditorConfig_1.EditorConfig.presetCategories.length,
                    };
                    // EditorConfig.presetCategories.splice(1, 0, {
                    // name: "Custom Sample Presets",
                    // presets: customSamplePresets,
                    // index: EditorConfig.presetCategories.length,
                    // });
                }
            }
            //samplemark
        }
        if (beforeThree && fromBeepBox) {
            // Originally, the only instrument transition was "instant" and the only drum wave was "retro".
            for (var _a = 0, _b = this.channels; _a < _b.length; _a++) {
                var channel = _b[_a];
                channel.instruments[0].transition = SynthConfig_1.Config.transitions.dictionary["interrupt"].index;
                channel.instruments[0].effects |= 1 << 10 /* EffectType.transition */;
            }
            this.channels[3].instruments[0].chipNoise = 0;
        }
        var legacySettingsCache = null;
        if ((fromBeepBox && beforeNine) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
            // Unfortunately, old versions of BeepBox had a variety of different ways of saving
            // filter-and-envelope-related parameters in the URL, and none of them directly
            // correspond to the new way of saving these parameters. We can approximate the old
            // settings by collecting all the old settings for an instrument and passing them to
            // convertLegacySettings(), so I use this data structure to collect the settings
            // for each instrument if necessary.
            legacySettingsCache = [];
            for (var i_13 = legacySettingsCache.length; i_13 < this.getChannelCount(); i_13++) {
                legacySettingsCache[i_13] = [];
                for (var j = 0; j < SynthConfig_1.Config.instrumentCountMin; j++)
                    legacySettingsCache[i_13][j] = {};
            }
        }
        var legacyGlobalReverb = 0; // beforeNine reverb was song-global, record that reverb here and adapt it to instruments as needed.
        var instrumentChannelIterator = 0;
        var instrumentIndexIterator = -1;
        var command;
        var useSlowerArpSpeed = false;
        var useFastTwoNoteArp = false;
        while (charIndex < compressed.length)
            switch (command = compressed.charCodeAt(charIndex++)) {
                case 78 /* SongTagCode.songTitle */:
                    {
                        // Length of song name string
                        var songNameLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.title = decodeURIComponent(compressed.substring(charIndex, charIndex + songNameLength));
                        document.title = this.title + " - " + EditorConfig_1.EditorConfig.versionDisplayName;
                        charIndex += songNameLength;
                    }
                    break;
                case 110 /* SongTagCode.channelCount */:
                    {
                        this.pitchChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        this.noiseChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        if (fromBeepBox || (fromJummBox && beforeTwo)) {
                            // No mod channel support before jummbox v2
                            this.modChannelCount = 0;
                        }
                        else {
                            this.modChannelCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        }
                        this.pitchChannelCount = validateRange(SynthConfig_1.Config.pitchChannelCountMin, SynthConfig_1.Config.pitchChannelCountMax, this.pitchChannelCount);
                        this.noiseChannelCount = validateRange(SynthConfig_1.Config.noiseChannelCountMin, SynthConfig_1.Config.noiseChannelCountMax, this.noiseChannelCount);
                        this.modChannelCount = validateRange(SynthConfig_1.Config.modChannelCountMin, SynthConfig_1.Config.modChannelCountMax, this.modChannelCount);
                        for (var channelIndex = this.channels.length; channelIndex < this.getChannelCount(); channelIndex++) {
                            this.channels[channelIndex] = new Channel();
                        }
                        this.channels.length = this.getChannelCount();
                        if ((fromBeepBox && beforeNine) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            for (var i_14 = legacySettingsCache.length; i_14 < this.getChannelCount(); i_14++) {
                                legacySettingsCache[i_14] = [];
                                for (var j = 0; j < SynthConfig_1.Config.instrumentCountMin; j++)
                                    legacySettingsCache[i_14][j] = {};
                            }
                        }
                    }
                    break;
                case 115 /* SongTagCode.scale */:
                    {
                        this.scale = clamp(0, SynthConfig_1.Config.scales.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        // All the scales were jumbled around by Jummbox. Just convert to free.
                        if (this.scale == SynthConfig_1.Config.scales["dictionary"]["Custom"].index) {
                            for (var i = 1; i < SynthConfig_1.Config.pitchesPerOctave; i++) {
                                this.scaleCustom[i] = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] == 1; // ineffiecent? yes, all we're going to do for now? hell yes
                            }
                        }
                        if (fromBeepBox)
                            this.scale = 0;
                    }
                    break;
                case 107 /* SongTagCode.key */:
                    {
                        if (beforeSeven && fromBeepBox) {
                            this.key = clamp(0, SynthConfig_1.Config.keys.length, 11 - base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            this.octave = 0;
                        }
                        else if (fromBeepBox || fromJummBox) {
                            this.key = clamp(0, SynthConfig_1.Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            this.octave = 0;
                        }
                        else if (fromGoldBox || (beforeThree && fromUltraBox)) {
                            // GoldBox (so far) didn't introduce any new keys, but old
                            // songs made with early versions of UltraBox share the
                            // same URL format, and those can have more keys. This
                            // shouldn't really result in anything other than 0-11 for
                            // the key and 0 for the octave for GoldBox songs.
                            var rawKeyIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            var _c = convertLegacyKeyToKeyAndOctave(rawKeyIndex), key = _c[0], octave = _c[1];
                            this.key = key;
                            this.octave = octave;
                        }
                        else {
                            this.key = clamp(0, SynthConfig_1.Config.keys.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            this.octave = clamp(SynthConfig_1.Config.octaveMin, SynthConfig_1.Config.octaveMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + SynthConfig_1.Config.octaveMin);
                        }
                    }
                    break;
                case 108 /* SongTagCode.loopStart */:
                    {
                        if (beforeFive && fromBeepBox) {
                            this.loopStart = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        }
                        else {
                            this.loopStart = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        }
                    }
                    break;
                case 101 /* SongTagCode.loopEnd */:
                    {
                        if (beforeFive && fromBeepBox) {
                            this.loopLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        }
                        else {
                            this.loopLength = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                        }
                    }
                    break;
                case 116 /* SongTagCode.tempo */:
                    {
                        if (beforeFour && fromBeepBox) {
                            this.tempo = [95, 120, 151, 190][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                        }
                        else if (beforeSeven && fromBeepBox) {
                            this.tempo = [88, 95, 103, 111, 120, 130, 140, 151, 163, 176, 190, 206, 222, 240, 259][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                        }
                        else {
                            this.tempo = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        this.tempo = clamp(SynthConfig_1.Config.tempoMin, SynthConfig_1.Config.tempoMax + 1, this.tempo);
                    }
                    break;
                case 109 /* SongTagCode.reverb */:
                    {
                        if (beforeNine && fromBeepBox) {
                            legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 12;
                            legacyGlobalReverb = clamp(0, SynthConfig_1.Config.reverbRange, legacyGlobalReverb);
                        }
                        else if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
                            legacyGlobalReverb = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            legacyGlobalReverb = clamp(0, SynthConfig_1.Config.reverbRange, legacyGlobalReverb);
                        }
                        else {
                            // Do nothing, BeepBox v9+ do not support song-wide reverb - JummBox still does via modulator.
                        }
                    }
                    break;
                case 97 /* SongTagCode.beatCount */:
                    {
                        if (beforeThree && fromBeepBox) {
                            this.beatsPerBar = [6, 7, 8, 9, 10][base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                        }
                        else {
                            this.beatsPerBar = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                        }
                        this.beatsPerBar = Math.max(SynthConfig_1.Config.beatsPerBarMin, Math.min(SynthConfig_1.Config.beatsPerBarMax, this.beatsPerBar));
                    }
                    break;
                case 103 /* SongTagCode.barCount */:
                    {
                        var barCount = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                        this.barCount = validateRange(SynthConfig_1.Config.barCountMin, SynthConfig_1.Config.barCountMax, barCount);
                        for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                            for (var bar = this.channels[channelIndex].bars.length; bar < this.barCount; bar++) {
                                this.channels[channelIndex].bars[bar] = (bar < 4) ? 1 : 0;
                            }
                            this.channels[channelIndex].bars.length = this.barCount;
                        }
                    }
                    break;
                case 106 /* SongTagCode.patternCount */:
                    {
                        var patternsPerChannel = void 0;
                        if (beforeEight && fromBeepBox) {
                            patternsPerChannel = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                        }
                        else {
                            patternsPerChannel = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1;
                        }
                        this.patternsPerChannel = validateRange(1, SynthConfig_1.Config.barCountMax, patternsPerChannel);
                        var channelCount = this.getChannelCount();
                        for (var channelIndex = 0; channelIndex < channelCount; channelIndex++) {
                            var patterns = this.channels[channelIndex].patterns;
                            for (var pattern = patterns.length; pattern < this.patternsPerChannel; pattern++) {
                                patterns[pattern] = new Pattern();
                            }
                            patterns.length = this.patternsPerChannel;
                        }
                    }
                    break;
                case 105 /* SongTagCode.instrumentCount */:
                    {
                        if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            var instrumentsPerChannel = validateRange(SynthConfig_1.Config.instrumentCountMin, SynthConfig_1.Config.patternInstrumentCountMax, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + SynthConfig_1.Config.instrumentCountMin);
                            this.layeredInstruments = false;
                            this.patternInstruments = (instrumentsPerChannel > 1);
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                var isNoiseChannel = channelIndex >= this.pitchChannelCount && channelIndex < this.pitchChannelCount + this.noiseChannelCount;
                                var isModChannel = channelIndex >= this.pitchChannelCount + this.noiseChannelCount;
                                for (var instrumentIndex = this.channels[channelIndex].instruments.length; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
                                    this.channels[channelIndex].instruments[instrumentIndex] = new Instrument(isNoiseChannel, isModChannel);
                                }
                                this.channels[channelIndex].instruments.length = instrumentsPerChannel;
                                if (beforeSix && fromBeepBox) {
                                    for (var instrumentIndex = 0; instrumentIndex < instrumentsPerChannel; instrumentIndex++) {
                                        this.channels[channelIndex].instruments[instrumentIndex].setTypeAndReset(isNoiseChannel ? 2 /* InstrumentType.noise */ : 0 /* InstrumentType.chip */, isNoiseChannel, isModChannel);
                                    }
                                }
                                for (var j = legacySettingsCache[channelIndex].length; j < instrumentsPerChannel; j++) {
                                    legacySettingsCache[channelIndex][j] = {};
                                }
                            }
                        }
                        else {
                            var instrumentsFlagBits = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.layeredInstruments = (instrumentsFlagBits & (1 << 1)) != 0;
                            this.patternInstruments = (instrumentsFlagBits & (1 << 0)) != 0;
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                var instrumentCount = 1;
                                if (this.layeredInstruments || this.patternInstruments) {
                                    instrumentCount = validateRange(SynthConfig_1.Config.instrumentCountMin, this.getMaxInstrumentsPerChannel(), base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + SynthConfig_1.Config.instrumentCountMin);
                                }
                                var channel = this.channels[channelIndex];
                                var isNoiseChannel = this.getChannelIsNoise(channelIndex);
                                var isModChannel = this.getChannelIsMod(channelIndex);
                                for (var i_15 = channel.instruments.length; i_15 < instrumentCount; i_15++) {
                                    channel.instruments[i_15] = new Instrument(isNoiseChannel, isModChannel);
                                }
                                channel.instruments.length = instrumentCount;
                            }
                        }
                    }
                    break;
                case 114 /* SongTagCode.rhythm */:
                    {
                        if (!fromUltraBox && !fromSlarmoosBox && !fromJukeBox) {
                            var newRhythm = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.rhythm = clamp(0, SynthConfig_1.Config.rhythms.length, newRhythm);
                            if (fromJummBox && beforeThree || fromBeepBox) {
                                if (this.rhythm == SynthConfig_1.Config.rhythms.dictionary["÷3 (triplets)"].index || this.rhythm == SynthConfig_1.Config.rhythms.dictionary["÷6"].index) {
                                    useSlowerArpSpeed = true;
                                }
                                if (this.rhythm >= SynthConfig_1.Config.rhythms.dictionary["÷6"].index) {
                                    // @TODO: This assumes that 6 and 8 are in that order, but
                                    // if someone reorders Config.rhythms that may not be true,
                                    // so this check probably should instead look for those
                                    // specific rhythms.
                                    useFastTwoNoteArp = true;
                                }
                            }
                        }
                        else if ((fromSlarmoosBox && beforeFour) || (fromUltraBox && beforeFive)) {
                            var rhythmMap = [1, 1, 0, 1, 2, 3, 4, 5];
                            this.rhythm = clamp(0, SynthConfig_1.Config.rhythms.length, rhythmMap[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]]);
                        }
                        else {
                            this.rhythm = clamp(0, SynthConfig_1.Config.rhythms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    break;
                case 111 /* SongTagCode.channelOctave */:
                    {
                        if (beforeThree && fromBeepBox) {
                            var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.channels[channelIndex].octave = clamp(0, SynthConfig_1.Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                            if (channelIndex >= this.pitchChannelCount)
                                this.channels[channelIndex].octave = 0;
                        }
                        else if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                this.channels[channelIndex].octave = clamp(0, SynthConfig_1.Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                if (channelIndex >= this.pitchChannelCount)
                                    this.channels[channelIndex].octave = 0;
                            }
                        }
                        else {
                            for (var channelIndex = 0; channelIndex < this.pitchChannelCount; channelIndex++) {
                                this.channels[channelIndex].octave = clamp(0, SynthConfig_1.Config.pitchOctaves, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            for (var channelIndex = this.pitchChannelCount; channelIndex < this.getChannelCount(); channelIndex++) {
                                this.channels[channelIndex].octave = 0;
                            }
                        }
                    }
                    break;
                case 84 /* SongTagCode.startInstrument */:
                    {
                        instrumentIndexIterator++;
                        if (instrumentIndexIterator >= this.channels[instrumentChannelIterator].instruments.length) {
                            instrumentChannelIterator++;
                            instrumentIndexIterator = 0;
                        }
                        validateRange(0, this.channels.length - 1, instrumentChannelIterator);
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        // JB before v5 had custom chip and mod before pickedString and supersaw were added. Index +2.
                        var instrumentType = validateRange(0, 12 /* InstrumentType.length */ - 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
                            if (instrumentType == 7 /* InstrumentType.pickedString */ || instrumentType == 8 /* InstrumentType.supersaw */) {
                                instrumentType += 2;
                            }
                        }
                        // Similar story here, JB before v5 had custom chip and mod before supersaw was added. Index +1.
                        else if ((fromJummBox && beforeSix) || (fromGoldBox && !beforeFour) || (fromUltraBox && beforeFive)) {
                            if (instrumentType == 8 /* InstrumentType.supersaw */ || instrumentType == 9 /* InstrumentType.customChipWave */ || instrumentType == 10 /* InstrumentType.mod */) {
                                instrumentType += 1;
                            }
                        }
                        instrument.setTypeAndReset(instrumentType, instrumentChannelIterator >= this.pitchChannelCount && instrumentChannelIterator < this.pitchChannelCount + this.noiseChannelCount, instrumentChannelIterator >= this.pitchChannelCount + this.noiseChannelCount);
                        // Anti-aliasing was added in BeepBox 3.0 (v6->v7) and JummBox 1.3 (v1->v2 roughly but some leakage possible)
                        if (((beforeSeven && fromBeepBox) || (beforeTwo && fromJummBox)) && (instrumentType == 0 /* InstrumentType.chip */ || instrumentType == 9 /* InstrumentType.customChipWave */ || instrumentType == 6 /* InstrumentType.pwm */)) {
                            instrument.aliases = true;
                            instrument.distortion = 0;
                            instrument.effects |= 1 << 3 /* EffectType.distortion */;
                        }
                        if (useSlowerArpSpeed) {
                            instrument.arpeggioSpeed = 9; // x3/4 speed. This used to be tied to rhythm, but now it is decoupled to each instrument's arp speed slider. This flag gets set when importing older songs to keep things consistent.
                        }
                        if (useFastTwoNoteArp) {
                            instrument.fastTwoNoteArp = true;
                        }
                        if (beforeSeven && fromBeepBox) {
                            // instrument.effects = 0;
                            // Chip/noise instruments had arpeggio and FM had custom interval but neither
                            // explicitly saved the chorus setting beforeSeven so enable it here.
                            if (instrument.chord != SynthConfig_1.Config.chords.dictionary["simultaneous"].index) {
                                // Enable chord if it was used.
                                instrument.effects |= 1 << 11 /* EffectType.chord */;
                            }
                        }
                    }
                    break;
                case 117 /* SongTagCode.preset */:
                    {
                        var presetValue = void 0;
                        if (!fromJukeBox) {
                            presetValue = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 12) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        else {
                            presetValue = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 18) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 12) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = presetValue;
                        // Picked string was inserted before custom chip in JB v5, so bump up preset index.
                        if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
                            if (this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset == 7 /* InstrumentType.pickedString */) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = 9 /* InstrumentType.customChipWave */;
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = 9 /* InstrumentType.customChipWave */;
                            }
                        }
                        // Similar story, supersaw is also before custom chip (and mod, but mods can't have presets).
                        else if ((fromJummBox && beforeSix) || (fromUltraBox && beforeFive)) {
                            if (this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset == 8 /* InstrumentType.supersaw */) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = 9 /* InstrumentType.customChipWave */;
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = 9 /* InstrumentType.customChipWave */;
                            }
                            // ultra code for 6-op fm maybe
                            if (this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset == 10 /* InstrumentType.mod */) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = 11 /* InstrumentType.fm6op */;
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type = 11 /* InstrumentType.fm6op */;
                            }
                        }
                        // BeepBox directly tweaked "grand piano", but JB kept it the same. The most up to date version is now "grand piano 3"
                        if (fromBeepBox && presetValue == EditorConfig_1.EditorConfig.nameToPresetValue("grand piano 1")) {
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].preset = EditorConfig_1.EditorConfig.nameToPresetValue("grand piano 3");
                        }
                    }
                    break;
                case 119 /* SongTagCode.wave */:
                    {
                        if (beforeThree && fromBeepBox) {
                            var legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                            var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            var instrument = this.channels[channelIndex].instruments[0];
                            instrument.chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                            // Version 2 didn't save any settings for settings for filters, or envelopes,
                            // just waves, so initialize them here I guess.
                            instrument.convertLegacySettings(legacySettingsCache[channelIndex][0], forceSimpleFilter);
                        }
                        else if (beforeSix && fromBeepBox) {
                            var legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (var _d = 0, _e = this.channels[channelIndex].instruments; _d < _e.length; _d++) {
                                    var instrument = _e[_d];
                                    if (channelIndex >= this.pitchChannelCount) {
                                        instrument.chipNoise = clamp(0, SynthConfig_1.Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    }
                                    else {
                                        instrument.chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                                    }
                                }
                            }
                        }
                        else if (beforeSeven && fromBeepBox) {
                            var legacyWaves = [1, 2, 3, 4, 5, 6, 7, 8, 0];
                            if (instrumentChannelIterator >= this.pitchChannelCount) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, SynthConfig_1.Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, legacyWaves[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]] | 0);
                            }
                        }
                        else {
                            if (this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].type == 2 /* InstrumentType.noise */) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipNoise = clamp(0, SynthConfig_1.Config.chipNoises.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else {
                                if (fromJukeBox || fromSlarmoosBox || fromUltraBox) {
                                    var chipWaveReal = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    var chipWaveCounter = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    if (chipWaveCounter == 3) {
                                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveReal + 186);
                                    }
                                    else if (chipWaveCounter == 2) {
                                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveReal + 124);
                                    }
                                    else if (chipWaveCounter == 1) {
                                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveReal + 62);
                                    }
                                    else {
                                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveReal);
                                    }
                                }
                                else {
                                    this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                        }
                    }
                    break;
                case 102 /* SongTagCode.eqFilter */:
                    {
                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                            if (beforeSeven && fromBeepBox) {
                                var legacyToCutoff = [10, 6, 3, 0, 8, 5, 2];
                                //const pregoldToEnvelope: number[] = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11];
                                var legacyToEnvelope = ["none", "none", "none", "none", "decay 1", "decay 2", "decay 3"];
                                if (beforeThree && fromBeepBox) {
                                    var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    var instrument = this.channels[channelIndex].instruments[0];
                                    var legacySettings = legacySettingsCache[channelIndex][0];
                                    var legacyFilter = [1, 3, 4, 5][clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                    legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                    legacySettings.filterResonance = 0;
                                    legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                }
                                else if (beforeSix && fromBeepBox) {
                                    for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                        for (var i_16 = 0; i_16 < this.channels[channelIndex].instruments.length; i_16++) {
                                            var instrument = this.channels[channelIndex].instruments[i_16];
                                            var legacySettings = legacySettingsCache[channelIndex][i_16];
                                            var legacyFilter = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 1);
                                            if (channelIndex < this.pitchChannelCount) {
                                                legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                                legacySettings.filterResonance = 0;
                                                legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                                            }
                                            else {
                                                legacySettings.filterCutoff = 10;
                                                legacySettings.filterResonance = 0;
                                                legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary["none"];
                                            }
                                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                        }
                                    }
                                }
                                else {
                                    var legacyFilter = clamp(0, legacyToCutoff.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                    var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                    legacySettings.filterCutoff = legacyToCutoff[legacyFilter];
                                    legacySettings.filterResonance = 0;
                                    legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary[legacyToEnvelope[legacyFilter]];
                                    instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                }
                            }
                            else {
                                var filterCutoffRange = 11;
                                var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                legacySettings.filterCutoff = clamp(0, filterCutoffRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                            }
                        }
                        else {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            var typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            if (fromBeepBox || typeCheck == 0) {
                                instrument.eqFilterType = false;
                                if (fromJukeBox || fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox)
                                    typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]; // Skip to next to get control point count
                                var originalControlPointCount = typeCheck;
                                instrument.eqFilter.controlPointCount = clamp(0, SynthConfig_1.Config.filterMaxPoints + 1, originalControlPointCount);
                                for (var i_17 = instrument.eqFilter.controlPoints.length; i_17 < instrument.eqFilter.controlPointCount; i_17++) {
                                    instrument.eqFilter.controlPoints[i_17] = new FilterControlPoint();
                                }
                                for (var i_18 = 0; i_18 < instrument.eqFilter.controlPointCount; i_18++) {
                                    var point = instrument.eqFilter.controlPoints[i_18];
                                    point.type = clamp(0, 3 /* FilterType.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    point.freq = clamp(0, SynthConfig_1.Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    point.gain = clamp(0, SynthConfig_1.Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                for (var i_19 = instrument.eqFilter.controlPointCount; i_19 < originalControlPointCount; i_19++) {
                                    charIndex += 3;
                                }
                                // Get subfilters as well. Skip Index 0, is a copy of the base filter.
                                instrument.eqSubFilters[0] = instrument.eqFilter;
                                if ((fromJummBox && !beforeFive) || (fromGoldBox && !beforeFour) || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
                                    var usingSubFilterBitfield = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                                        if (usingSubFilterBitfield & (1 << j)) {
                                            // Number of control points
                                            var originalSubfilterControlPointCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                            if (instrument.eqSubFilters[j + 1] == null)
                                                instrument.eqSubFilters[j + 1] = new FilterSettings();
                                            instrument.eqSubFilters[j + 1].controlPointCount = clamp(0, SynthConfig_1.Config.filterMaxPoints + 1, originalSubfilterControlPointCount);
                                            for (var i_20 = instrument.eqSubFilters[j + 1].controlPoints.length; i_20 < instrument.eqSubFilters[j + 1].controlPointCount; i_20++) {
                                                instrument.eqSubFilters[j + 1].controlPoints[i_20] = new FilterControlPoint();
                                            }
                                            for (var i_21 = 0; i_21 < instrument.eqSubFilters[j + 1].controlPointCount; i_21++) {
                                                var point = instrument.eqSubFilters[j + 1].controlPoints[i_21];
                                                point.type = clamp(0, 3 /* FilterType.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                                point.freq = clamp(0, SynthConfig_1.Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                                point.gain = clamp(0, SynthConfig_1.Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            }
                                            for (var i_22 = instrument.eqSubFilters[j + 1].controlPointCount; i_22 < originalSubfilterControlPointCount; i_22++) {
                                                charIndex += 3;
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                instrument.eqFilterType = true;
                                instrument.eqFilterSimpleCut = clamp(0, SynthConfig_1.Config.filterSimpleCutRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.eqFilterSimplePeak = clamp(0, SynthConfig_1.Config.filterSimplePeakRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    break;
                case 121 /* SongTagCode.loopControls */:
                    {
                        if (fromJukeBox || fromSlarmoosBox || fromUltraBox) {
                            if (beforeThree && fromUltraBox) {
                                // Still have to support the old and bad loop control data format written as a test, sigh.
                                var sampleLoopInfoEncodedLength = decode32BitNumber(compressed, charIndex);
                                charIndex += 6;
                                var sampleLoopInfoEncoded = compressed.slice(charIndex, charIndex + sampleLoopInfoEncodedLength);
                                charIndex += sampleLoopInfoEncodedLength;
                                var sampleLoopInfo = JSON.parse(atob(sampleLoopInfoEncoded));
                                for (var _f = 0, sampleLoopInfo_1 = sampleLoopInfo; _f < sampleLoopInfo_1.length; _f++) {
                                    var entry = sampleLoopInfo_1[_f];
                                    var channelIndex = entry["channel"];
                                    var instrumentIndex = entry["instrument"];
                                    var info = entry["info"];
                                    var instrument = this.channels[channelIndex].instruments[instrumentIndex];
                                    instrument.isUsingAdvancedLoopControls = info["isUsingAdvancedLoopControls"];
                                    instrument.chipWaveLoopStart = info["chipWaveLoopStart"];
                                    instrument.chipWaveLoopEnd = info["chipWaveLoopEnd"];
                                    instrument.chipWaveLoopMode = info["chipWaveLoopMode"];
                                    instrument.chipWavePlayBackwards = info["chipWavePlayBackwards"];
                                    instrument.chipWaveStartOffset = info["chipWaveStartOffset"];
                                    // @TODO: Whenever chipWaveReleaseMode is implemented, it should be set here to the default.
                                }
                            }
                            else {
                                // Read the new loop control data format.
                                // See Song.toBase64String for details on the encodings used here.
                                var encodedLoopMode = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var isUsingAdvancedLoopControls = Boolean(encodedLoopMode & 1);
                                var chipWaveLoopMode = encodedLoopMode >> 1;
                                var encodedReleaseMode = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var chipWavePlayBackwards = Boolean(encodedReleaseMode & 1);
                                // const chipWaveReleaseMode: number = encodedReleaseMode >> 1;
                                var chipWaveLoopStart = decode32BitNumber(compressed, charIndex);
                                charIndex += 6;
                                var chipWaveLoopEnd = decode32BitNumber(compressed, charIndex);
                                charIndex += 6;
                                var chipWaveStartOffset = decode32BitNumber(compressed, charIndex);
                                charIndex += 6;
                                var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.isUsingAdvancedLoopControls = isUsingAdvancedLoopControls;
                                instrument.chipWaveLoopStart = chipWaveLoopStart;
                                instrument.chipWaveLoopEnd = chipWaveLoopEnd;
                                instrument.chipWaveLoopMode = chipWaveLoopMode;
                                instrument.chipWavePlayBackwards = chipWavePlayBackwards;
                                instrument.chipWaveStartOffset = chipWaveStartOffset;
                                // instrument.chipWaveReleaseMode = chipWaveReleaseMode;
                            }
                        }
                        else if (fromGoldBox && !beforeFour && beforeSix) {
                            if (document.URL.substring(document.URL.length - 13).toLowerCase() != "legacysamples") {
                                if (!willLoadLegacySamplesForOldSongs) {
                                    willLoadLegacySamplesForOldSongs = true;
                                    SynthConfig_1.Config.willReloadForCustomSamples = true;
                                    EditorConfig_1.EditorConfig.customSamples = ["legacySamples"];
                                    (0, SynthConfig_1.loadBuiltInSamples)(0);
                                }
                            }
                            this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + 125);
                        }
                        else if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            var filterResonanceRange = 8;
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                            legacySettings.filterResonance = clamp(0, filterResonanceRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                    }
                    break;
                case 122 /* SongTagCode.drumsetEnvelopes */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        var pregoldToEnvelope = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11];
                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                            if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)) {
                            }
                            if (instrument.type == 4 /* InstrumentType.drumset */) {
                                for (var i_23 = 0; i_23 < SynthConfig_1.Config.drumCount; i_23++) {
                                    var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox))
                                        aa = pregoldToEnvelope[aa];
                                    instrument.drumsetEnvelopes[i_23] = Song._envelopeFromLegacyIndex(aa).index;
                                }
                            }
                            else {
                                // This used to be used for general filter envelopes.
                                // The presence of an envelope affects how convertLegacySettings
                                // decides the closest possible approximation, so update it.
                                var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox))
                                    aa = pregoldToEnvelope[aa];
                                legacySettings.filterEnvelope = Song._envelopeFromLegacyIndex(aa);
                                instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                            }
                        }
                        else {
                            // This tag is now only used for drumset filter envelopes.
                            for (var i_24 = 0; i_24 < SynthConfig_1.Config.drumCount; i_24++) {
                                var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox))
                                    aa = pregoldToEnvelope[aa];
                                if (!fromSlarmoosBox && !fromJukeBox && aa >= 2)
                                    aa++; //2 for pitch
                                instrument.drumsetEnvelopes[i_24] = clamp(0, SynthConfig_1.Config.envelopes.length, aa);
                            }
                        }
                    }
                    break;
                case 87 /* SongTagCode.pulseWidth */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        instrument.pulseWidth = clamp(0, SynthConfig_1.Config.pulseWidthRange + (+(fromJummBox)) + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        if (fromBeepBox) {
                            // BeepBox formula
                            instrument.pulseWidth = Math.round(Math.pow(0.5, (7 - instrument.pulseWidth) * SynthConfig_1.Config.pulseWidthStepPower) * SynthConfig_1.Config.pulseWidthRange);
                        }
                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                            var pregoldToEnvelope = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11];
                            var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                            var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox))
                                aa = pregoldToEnvelope[aa];
                            legacySettings.pulseEnvelope = Song._envelopeFromLegacyIndex(aa);
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                        if ((fromUltraBox && !beforeFour) || fromSlarmoosBox || fromJukeBox) {
                            instrument.decimalOffset = clamp(0, 99 + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    break;
                case 73 /* SongTagCode.stringSustain */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        var sustainValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        instrument.stringSustain = clamp(0, SynthConfig_1.Config.stringSustainRange, sustainValue & 0x1F);
                        instrument.stringSustainType = SynthConfig_1.Config.enableAcousticSustain ? clamp(0, 2 /* SustainType.length */, sustainValue >> 5) : 0 /* SustainType.bright */;
                    }
                    break;
                case 100 /* SongTagCode.fadeInOut */:
                    {
                        if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            // this tag was used for a combination of transition and fade in/out.
                            var legacySettings = [
                                { transition: "interrupt", fadeInSeconds: 0.0, fadeOutTicks: -1 },
                                { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: -3 },
                                { transition: "normal", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                                { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                                { transition: "normal", fadeInSeconds: 0.04, fadeOutTicks: 6 },
                                { transition: "normal", fadeInSeconds: 0.0, fadeOutTicks: 48 },
                                { transition: "normal", fadeInSeconds: 0.0125, fadeOutTicks: 72 },
                                { transition: "normal", fadeInSeconds: 0.06, fadeOutTicks: 96 },
                                { transition: "slide in pattern", fadeInSeconds: 0.025, fadeOutTicks: -3 },
                            ];
                            if (beforeThree && fromBeepBox) {
                                var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                var instrument = this.channels[channelIndex].instruments[0];
                                instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                instrument.transition = SynthConfig_1.Config.transitions.dictionary[settings.transition].index;
                                if (instrument.transition != SynthConfig_1.Config.transitions.dictionary["normal"].index) {
                                    // Enable transition if it was used.
                                    instrument.effects |= 1 << 10 /* EffectType.transition */;
                                }
                            }
                            else if (beforeSix && fromBeepBox) {
                                for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                    for (var _g = 0, _h = this.channels[channelIndex].instruments; _g < _h.length; _g++) {
                                        var instrument = _h[_g];
                                        var settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                        instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                        instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                        instrument.transition = SynthConfig_1.Config.transitions.dictionary[settings.transition].index;
                                        if (instrument.transition != SynthConfig_1.Config.transitions.dictionary["normal"].index) {
                                            // Enable transition if it was used.
                                            instrument.effects |= 1 << 10 /* EffectType.transition */;
                                        }
                                    }
                                }
                            }
                            else if ((beforeFour && !fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) || fromBeepBox) {
                                var settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                instrument.transition = SynthConfig_1.Config.transitions.dictionary[settings.transition].index;
                                if (instrument.transition != SynthConfig_1.Config.transitions.dictionary["normal"].index) {
                                    // Enable transition if it was used.
                                    instrument.effects |= 1 << 10 /* EffectType.transition */;
                                }
                            }
                            else {
                                var settings = legacySettings[clamp(0, legacySettings.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.fadeIn = Synth.secondsToFadeInSetting(settings.fadeInSeconds);
                                instrument.fadeOut = Synth.ticksToFadeOutSetting(settings.fadeOutTicks);
                                instrument.transition = SynthConfig_1.Config.transitions.dictionary[settings.transition].index;
                                // Read tie-note 
                                if (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] > 0) {
                                    // Set legacy tie over flag, which is only used to port notes in patterns using this instrument as tying.
                                    instrument.legacyTieOver = true;
                                }
                                instrument.clicklessTransition = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
                                if (instrument.transition != SynthConfig_1.Config.transitions.dictionary["normal"].index || instrument.clicklessTransition) {
                                    // Enable transition if it was used.
                                    instrument.effects |= 1 << 10 /* EffectType.transition */;
                                }
                            }
                        }
                        else {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.fadeIn = clamp(0, SynthConfig_1.Config.fadeInRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.fadeOut = clamp(0, SynthConfig_1.Config.fadeOutTicks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            if (fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)
                                instrument.clicklessTransition = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
                        }
                    }
                    break;
                case 99 /* SongTagCode.songEq */:
                    { //deprecated vibrato tag repurposed for songEq
                        if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            if (beforeSeven && fromBeepBox) {
                                if (beforeThree && fromBeepBox) {
                                    var legacyEffects = [0, 3, 2, 0];
                                    var legacyEnvelopes = ["none", "none", "none", "tremolo2"];
                                    var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    var effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    var instrument = this.channels[channelIndex].instruments[0];
                                    var legacySettings = legacySettingsCache[channelIndex][0];
                                    instrument.vibrato = legacyEffects[effect];
                                    if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == 0 /* EnvelopeType.none */) {
                                        // Imitate the legacy tremolo with a filter envelope.
                                        legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                        instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                    }
                                    if (instrument.vibrato != SynthConfig_1.Config.vibratos.dictionary["none"].index) {
                                        // Enable vibrato if it was used.
                                        instrument.effects |= 1 << 9 /* EffectType.vibrato */;
                                    }
                                }
                                else if (beforeSix && fromBeepBox) {
                                    var legacyEffects = [0, 1, 2, 3, 0, 0];
                                    var legacyEnvelopes = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
                                    for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                        for (var i_25 = 0; i_25 < this.channels[channelIndex].instruments.length; i_25++) {
                                            var effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            var instrument = this.channels[channelIndex].instruments[i_25];
                                            var legacySettings = legacySettingsCache[channelIndex][i_25];
                                            instrument.vibrato = legacyEffects[effect];
                                            if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == 0 /* EnvelopeType.none */) {
                                                // Imitate the legacy tremolo with a filter envelope.
                                                legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                                instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                            }
                                            if (instrument.vibrato != SynthConfig_1.Config.vibratos.dictionary["none"].index) {
                                                // Enable vibrato if it was used.
                                                instrument.effects |= 1 << 9 /* EffectType.vibrato */;
                                            }
                                            if ((legacyGlobalReverb != 0 || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) && !this.getChannelIsNoise(channelIndex)) {
                                                // Enable reverb if it was used globaly before. (Global reverb was added before the effects option so I need to pick somewhere else to initialize instrument reverb, and I picked the vibrato command.)
                                                instrument.effects |= 1 << 0 /* EffectType.reverb */;
                                                instrument.reverb = legacyGlobalReverb;
                                            }
                                        }
                                    }
                                }
                                else {
                                    var legacyEffects = [0, 1, 2, 3, 0, 0];
                                    var legacyEnvelopes = ["none", "none", "none", "none", "tremolo5", "tremolo2"];
                                    var effect = clamp(0, legacyEffects.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                    var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                                    instrument.vibrato = legacyEffects[effect];
                                    if (legacySettings.filterEnvelope == undefined || legacySettings.filterEnvelope.type == 0 /* EnvelopeType.none */) {
                                        // Imitate the legacy tremolo with a filter envelope.
                                        legacySettings.filterEnvelope = SynthConfig_1.Config.envelopes.dictionary[legacyEnvelopes[effect]];
                                        instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                                    }
                                    if (instrument.vibrato != SynthConfig_1.Config.vibratos.dictionary["none"].index) {
                                        // Enable vibrato if it was used.
                                        instrument.effects |= 1 << 9 /* EffectType.vibrato */;
                                    }
                                    if (legacyGlobalReverb != 0 || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                                        // Enable reverb if it was used globaly before. (Global reverb was added before the effects option so I need to pick somewhere else to initialize instrument reverb, and I picked the vibrato command.)
                                        instrument.effects |= 1 << 0 /* EffectType.reverb */;
                                        instrument.reverb = legacyGlobalReverb;
                                    }
                                }
                            }
                            else {
                                var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                var vibrato = clamp(0, SynthConfig_1.Config.vibratos.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.vibrato = vibrato;
                                if (instrument.vibrato != SynthConfig_1.Config.vibratos.dictionary["none"].index) {
                                    // Enable vibrato if it was used.
                                    instrument.effects |= 1 << 9 /* EffectType.vibrato */;
                                }
                                // Custom vibrato
                                if (vibrato == SynthConfig_1.Config.vibratos.length) {
                                    instrument.vibratoDepth = clamp(0, SynthConfig_1.Config.modulators.dictionary["vibrato depth"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 50;
                                    instrument.vibratoSpeed = clamp(0, SynthConfig_1.Config.modulators.dictionary["vibrato speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.vibratoDelay = clamp(0, SynthConfig_1.Config.modulators.dictionary["vibrato delay"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 2;
                                    instrument.vibratoType = clamp(0, SynthConfig_1.Config.vibratoTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.effects |= 1 << 9 /* EffectType.vibrato */;
                                }
                                // Enforce standard vibrato settings
                                else {
                                    instrument.vibratoDepth = SynthConfig_1.Config.vibratos[instrument.vibrato].amplitude;
                                    instrument.vibratoSpeed = 10; // Normal speed
                                    instrument.vibratoDelay = SynthConfig_1.Config.vibratos[instrument.vibrato].delayTicks / 2;
                                    instrument.vibratoType = SynthConfig_1.Config.vibratos[instrument.vibrato].type;
                                }
                            }
                        }
                        else {
                            // songeq
                            if (fromJukeBox || (fromSlarmoosBox && !beforeFour)) { //double check that it's from a valid version
                                var originalControlPointCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                this.eqFilter.controlPointCount = clamp(0, SynthConfig_1.Config.filterMaxPoints + 1, originalControlPointCount);
                                for (var i_26 = this.eqFilter.controlPoints.length; i_26 < this.eqFilter.controlPointCount; i_26++) {
                                    this.eqFilter.controlPoints[i_26] = new FilterControlPoint();
                                }
                                for (var i_27 = 0; i_27 < this.eqFilter.controlPointCount; i_27++) {
                                    var point = this.eqFilter.controlPoints[i_27];
                                    point.type = clamp(0, 3 /* FilterType.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    point.freq = clamp(0, SynthConfig_1.Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    point.gain = clamp(0, SynthConfig_1.Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                for (var i_28 = this.eqFilter.controlPointCount; i_28 < originalControlPointCount; i_28++) {
                                    charIndex += 3;
                                }
                                // Get subfilters as well. Skip Index 0, is a copy of the base filter.
                                this.eqSubFilters[0] = this.eqFilter;
                                var usingSubFilterBitfield = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                                    if (usingSubFilterBitfield & (1 << j)) {
                                        // Number of control points
                                        var originalSubfilterControlPointCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                        if (this.eqSubFilters[j + 1] == null)
                                            this.eqSubFilters[j + 1] = new FilterSettings();
                                        this.eqSubFilters[j + 1].controlPointCount = clamp(0, SynthConfig_1.Config.filterMaxPoints + 1, originalSubfilterControlPointCount);
                                        for (var i_29 = this.eqSubFilters[j + 1].controlPoints.length; i_29 < this.eqSubFilters[j + 1].controlPointCount; i_29++) {
                                            this.eqSubFilters[j + 1].controlPoints[i_29] = new FilterControlPoint();
                                        }
                                        for (var i_30 = 0; i_30 < this.eqSubFilters[j + 1].controlPointCount; i_30++) {
                                            var point = this.eqSubFilters[j + 1].controlPoints[i_30];
                                            point.type = clamp(0, 3 /* FilterType.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            point.freq = clamp(0, SynthConfig_1.Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            point.gain = clamp(0, SynthConfig_1.Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                        for (var i_31 = this.eqSubFilters[j + 1].controlPointCount; i_31 < originalSubfilterControlPointCount; i_31++) {
                                            charIndex += 3;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
                case 71 /* SongTagCode.arpeggioSpeed */:
                    {
                        // Deprecated, but supported for legacy purposes
                        if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.arpeggioSpeed = clamp(0, SynthConfig_1.Config.modulators.dictionary["arp speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.fastTwoNoteArp = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false; // Two note arp setting piggybacks on this
                        }
                        else {
                            // Do nothing, deprecated for now
                        }
                    }
                    break;
                case 104 /* SongTagCode.unison */:
                    {
                        if (beforeThree && fromBeepBox) {
                            var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            var instrument = this.channels[channelIndex].instruments[0];
                            instrument.unison = clamp(0, SynthConfig_1.Config.unisons.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.unisonVoices = SynthConfig_1.Config.unisons[instrument.unison].voices;
                            instrument.unisonSpread = SynthConfig_1.Config.unisons[instrument.unison].spread;
                            instrument.unisonOffset = SynthConfig_1.Config.unisons[instrument.unison].offset;
                            instrument.unisonExpression = SynthConfig_1.Config.unisons[instrument.unison].expression;
                            instrument.unisonSign = SynthConfig_1.Config.unisons[instrument.unison].sign;
                        }
                        else if (beforeSix && fromBeepBox) {
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (var _j = 0, _k = this.channels[channelIndex].instruments; _j < _k.length; _j++) {
                                    var instrument = _k[_j];
                                    var originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    var unison = clamp(0, SynthConfig_1.Config.unisons.length, originalValue);
                                    if (originalValue == 8) {
                                        // original "custom harmony" now maps to "hum" and "custom interval".
                                        unison = 2;
                                        instrument.chord = 3;
                                    }
                                    instrument.unison = unison;
                                    instrument.unisonVoices = SynthConfig_1.Config.unisons[instrument.unison].voices;
                                    instrument.unisonSpread = SynthConfig_1.Config.unisons[instrument.unison].spread;
                                    instrument.unisonOffset = SynthConfig_1.Config.unisons[instrument.unison].offset;
                                    instrument.unisonExpression = SynthConfig_1.Config.unisons[instrument.unison].expression;
                                    instrument.unisonSign = SynthConfig_1.Config.unisons[instrument.unison].sign;
                                }
                            }
                        }
                        else if (beforeSeven && fromBeepBox) {
                            var originalValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            var unison = clamp(0, SynthConfig_1.Config.unisons.length, originalValue);
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            if (originalValue == 8) {
                                // original "custom harmony" now maps to "hum" and "custom interval".
                                unison = 2;
                                instrument.chord = 3;
                            }
                            instrument.unison = unison;
                            instrument.unisonVoices = SynthConfig_1.Config.unisons[instrument.unison].voices;
                            instrument.unisonSpread = SynthConfig_1.Config.unisons[instrument.unison].spread;
                            instrument.unisonOffset = SynthConfig_1.Config.unisons[instrument.unison].offset;
                            instrument.unisonExpression = SynthConfig_1.Config.unisons[instrument.unison].expression;
                            instrument.unisonSign = SynthConfig_1.Config.unisons[instrument.unison].sign;
                        }
                        else {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.unison = clamp(0, SynthConfig_1.Config.unisons.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            var unisonLength = ((beforeFive || !fromSlarmoosBox) && !fromJukeBox) ? 27 : SynthConfig_1.Config.unisons.length; //27 was the old length before I added >2 voice presets
                            if (((fromUltraBox && !beforeFive) || fromSlarmoosBox || fromJukeBox) && (instrument.unison == unisonLength)) {
                                // if (instrument.unison == Config.unisons.length) {
                                instrument.unison = SynthConfig_1.Config.unisons.length;
                                instrument.unisonVoices = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var unisonSpreadNegative = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var unisonSpread = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63)) * 63);
                                var unisonOffsetNegative = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var unisonOffset = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63)) * 63);
                                var unisonExpressionNegative = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var unisonExpression = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63);
                                var unisonSignNegative = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                var unisonSign = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] + (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 63);
                                instrument.unisonSpread = unisonSpread / 1000;
                                if (unisonSpreadNegative == 0)
                                    instrument.unisonSpread *= -1;
                                instrument.unisonOffset = unisonOffset / 1000;
                                if (unisonOffsetNegative == 0)
                                    instrument.unisonOffset *= -1;
                                instrument.unisonExpression = unisonExpression / 1000;
                                if (unisonExpressionNegative == 0)
                                    instrument.unisonExpression *= -1;
                                instrument.unisonSign = unisonSign / 1000;
                                if (unisonSignNegative == 0)
                                    instrument.unisonSign *= -1;
                            }
                            else {
                                instrument.unisonVoices = SynthConfig_1.Config.unisons[instrument.unison].voices;
                                instrument.unisonSpread = SynthConfig_1.Config.unisons[instrument.unison].spread;
                                instrument.unisonOffset = SynthConfig_1.Config.unisons[instrument.unison].offset;
                                instrument.unisonExpression = SynthConfig_1.Config.unisons[instrument.unison].expression;
                                instrument.unisonSign = SynthConfig_1.Config.unisons[instrument.unison].sign;
                            }
                        }
                    }
                    break;
                case 67 /* SongTagCode.chord */:
                    {
                        if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.chord = clamp(0, SynthConfig_1.Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            if (instrument.chord != SynthConfig_1.Config.chords.dictionary["simultaneous"].index) {
                                // Enable chord if it was used.
                                instrument.effects |= 1 << 11 /* EffectType.chord */;
                            }
                        }
                        else {
                            // Do nothing? This song tag code is deprecated for now.
                        }
                    }
                    break;
                case 113 /* SongTagCode.effects */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if ((beforeNine && fromBeepBox) || ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                            instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] & ((1 << 18 /* EffectType.length */) - 1));
                            if (legacyGlobalReverb == 0 && !((fromJummBox && beforeFive) || (beforeFour && fromGoldBox))) {
                                // Disable reverb if legacy song reverb was zero.
                                instrument.effects &= ~(1 << 0 /* EffectType.reverb */);
                            }
                            else if ((0, SynthConfig_1.effectsIncludeReverb)(instrument.effects)) {
                                instrument.reverb = legacyGlobalReverb;
                            }
                            // @jummbus - Enabling pan effect on song import no matter what to make it a default.
                            //if (instrument.pan != Config.panCenter) {
                            instrument.effects |= 1 << 2 /* EffectType.panning */;
                            //}
                            if (instrument.vibrato != SynthConfig_1.Config.vibratos.dictionary["none"].index) {
                                // Enable vibrato if it was used.
                                instrument.effects |= 1 << 9 /* EffectType.vibrato */;
                            }
                            if (instrument.detune != SynthConfig_1.Config.detuneCenter) {
                                // Enable detune if it was used.
                                instrument.effects |= 1 << 8 /* EffectType.detune */;
                            }
                            if (instrument.aliases)
                                instrument.effects |= 1 << 3 /* EffectType.distortion */;
                            else
                                instrument.effects &= ~(1 << 3 /* EffectType.distortion */);
                            // convertLegacySettings may need to force-enable note filter, call
                            // it again here to make sure that this override takes precedence.
                            var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                        else {
                            // BeepBox currently uses three base64 characters at 6 bits each for a bitfield representing all the enabled effects.
                            if (18 /* EffectType.length */ > 18)
                                throw new Error();
                            if (fromJukeBox || (fromSlarmoosBox && !beforeFive)) {
                                instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 12) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            else {
                                instrument.effects = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludeNoteFilter)(instrument.effects)) {
                                var typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                if (fromBeepBox || typeCheck == 0) {
                                    instrument.noteFilterType = false;
                                    if (fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)
                                        typeCheck = base64CharCodeToInt[compressed.charCodeAt(charIndex++)]; // Skip to next index in jummbox to get actual count
                                    instrument.noteFilter.controlPointCount = clamp(0, SynthConfig_1.Config.filterMaxPoints + 1, typeCheck);
                                    for (var i_32 = instrument.noteFilter.controlPoints.length; i_32 < instrument.noteFilter.controlPointCount; i_32++) {
                                        instrument.noteFilter.controlPoints[i_32] = new FilterControlPoint();
                                    }
                                    for (var i_33 = 0; i_33 < instrument.noteFilter.controlPointCount; i_33++) {
                                        var point = instrument.noteFilter.controlPoints[i_33];
                                        point.type = clamp(0, 3 /* FilterType.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        point.freq = clamp(0, SynthConfig_1.Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        point.gain = clamp(0, SynthConfig_1.Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    }
                                    for (var i_34 = instrument.noteFilter.controlPointCount; i_34 < typeCheck; i_34++) {
                                        charIndex += 3;
                                    }
                                    // Get subfilters as well. Skip Index 0, is a copy of the base filter.
                                    instrument.noteSubFilters[0] = instrument.noteFilter;
                                    if ((fromJummBox && !beforeFive) || (fromGoldBox) || (fromUltraBox) || (fromSlarmoosBox) || fromJukeBox) {
                                        var usingSubFilterBitfield = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        for (var j = 0; j < SynthConfig_1.Config.filterMorphCount - 1; j++) {
                                            if (usingSubFilterBitfield & (1 << j)) {
                                                // Number of control points
                                                var originalSubfilterControlPointCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                                if (instrument.noteSubFilters[j + 1] == null)
                                                    instrument.noteSubFilters[j + 1] = new FilterSettings();
                                                instrument.noteSubFilters[j + 1].controlPointCount = clamp(0, SynthConfig_1.Config.filterMaxPoints + 1, originalSubfilterControlPointCount);
                                                for (var i_35 = instrument.noteSubFilters[j + 1].controlPoints.length; i_35 < instrument.noteSubFilters[j + 1].controlPointCount; i_35++) {
                                                    instrument.noteSubFilters[j + 1].controlPoints[i_35] = new FilterControlPoint();
                                                }
                                                for (var i_36 = 0; i_36 < instrument.noteSubFilters[j + 1].controlPointCount; i_36++) {
                                                    var point = instrument.noteSubFilters[j + 1].controlPoints[i_36];
                                                    point.type = clamp(0, 3 /* FilterType.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                                    point.freq = clamp(0, SynthConfig_1.Config.filterFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                                    point.gain = clamp(0, SynthConfig_1.Config.filterGainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                                }
                                                for (var i_37 = instrument.noteSubFilters[j + 1].controlPointCount; i_37 < originalSubfilterControlPointCount; i_37++) {
                                                    charIndex += 3;
                                                }
                                            }
                                        }
                                    }
                                }
                                else {
                                    instrument.noteFilterType = true;
                                    instrument.noteFilter.reset();
                                    instrument.noteFilterSimpleCut = clamp(0, SynthConfig_1.Config.filterSimpleCutRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.noteFilterSimplePeak = clamp(0, SynthConfig_1.Config.filterSimplePeakRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                            if ((0, SynthConfig_1.effectsIncludeTransition)(instrument.effects)) {
                                instrument.transition = clamp(0, SynthConfig_1.Config.transitions.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludeChord)(instrument.effects)) {
                                instrument.chord = clamp(0, SynthConfig_1.Config.chords.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                // Custom arpeggio speed... only in JB, and only if the instrument arpeggiates.
                                if (instrument.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index && (fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)) {
                                    instrument.arpeggioSpeed = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    instrument.fastTwoNoteArp = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) ? true : false;
                                }
                                if (instrument.chord == SynthConfig_1.Config.chords.dictionary["monophonic"].index && ((fromSlarmoosBox && !beforeFive) || fromJukeBox)) {
                                    instrument.monoChordTone = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                }
                            }
                            if ((0, SynthConfig_1.effectsIncludePitchShift)(instrument.effects)) {
                                instrument.pitchShift = clamp(0, SynthConfig_1.Config.pitchShiftRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludeDetune)(instrument.effects)) {
                                if (fromBeepBox) {
                                    // Convert from BeepBox's formula
                                    instrument.detune = clamp(SynthConfig_1.Config.detuneMin, SynthConfig_1.Config.detuneMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.detune = Math.round((instrument.detune - 9) * (Math.abs(instrument.detune - 9) + 1) / 2 + SynthConfig_1.Config.detuneCenter);
                                }
                                else {
                                    instrument.detune = clamp(SynthConfig_1.Config.detuneMin, SynthConfig_1.Config.detuneMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                            if ((0, SynthConfig_1.effectsIncludeVibrato)(instrument.effects)) {
                                instrument.vibrato = clamp(0, SynthConfig_1.Config.vibratos.length + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                // Custom vibrato
                                if (instrument.vibrato == SynthConfig_1.Config.vibratos.length && (fromJummBox || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)) {
                                    instrument.vibratoDepth = clamp(0, SynthConfig_1.Config.modulators.dictionary["vibrato depth"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 25;
                                    instrument.vibratoSpeed = clamp(0, SynthConfig_1.Config.modulators.dictionary["vibrato speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.vibratoDelay = clamp(0, SynthConfig_1.Config.modulators.dictionary["vibrato delay"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                    instrument.vibratoType = clamp(0, SynthConfig_1.Config.vibratoTypes.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                // Enforce standard vibrato settings
                                else {
                                    instrument.vibratoDepth = SynthConfig_1.Config.vibratos[instrument.vibrato].amplitude;
                                    instrument.vibratoSpeed = 10; // Normal speed
                                    instrument.vibratoDelay = SynthConfig_1.Config.vibratos[instrument.vibrato].delayTicks / 2;
                                    instrument.vibratoType = SynthConfig_1.Config.vibratos[instrument.vibrato].type;
                                }
                            }
                            if ((0, SynthConfig_1.effectsIncludeDistortion)(instrument.effects)) {
                                instrument.distortion = clamp(0, SynthConfig_1.Config.distortionRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if ((fromJummBox && !beforeFive) || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)
                                    instrument.aliases = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
                            }
                            if ((0, SynthConfig_1.effectsIncludeBitcrusher)(instrument.effects)) {
                                instrument.bitcrusherFreq = clamp(0, SynthConfig_1.Config.bitcrusherFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.bitcrusherQuantization = clamp(0, SynthConfig_1.Config.bitcrusherQuantizationRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludePanning)(instrument.effects)) {
                                if (fromBeepBox) {
                                    // Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
                                    instrument.pan = clamp(0, SynthConfig_1.Config.panMax + 1, Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * ((SynthConfig_1.Config.panMax) / 8.0)));
                                }
                                else {
                                    instrument.pan = clamp(0, SynthConfig_1.Config.panMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                // Now, pan delay follows on new versions of jummbox.
                                if ((fromJummBox && !beforeTwo) || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox)
                                    instrument.panDelay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                            if ((0, SynthConfig_1.effectsIncludeChorus)(instrument.effects)) {
                                if (fromBeepBox) {
                                    // BeepBox has 4 chorus values vs. JB's 8
                                    instrument.chorus = clamp(0, (SynthConfig_1.Config.chorusRange / 2) + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 2;
                                }
                                else {
                                    instrument.chorus = clamp(0, SynthConfig_1.Config.chorusRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                            if ((0, SynthConfig_1.effectsIncludeEcho)(instrument.effects)) {
                                instrument.echoSustain = clamp(0, SynthConfig_1.Config.echoSustainRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.echoDelay = clamp(0, SynthConfig_1.Config.echoDelayRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludeReverb)(instrument.effects)) {
                                if (fromBeepBox) {
                                    instrument.reverb = clamp(0, SynthConfig_1.Config.reverbRange, Math.round(base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * SynthConfig_1.Config.reverbRange / 3.0));
                                }
                                else {
                                    instrument.reverb = clamp(0, SynthConfig_1.Config.reverbRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                            if ((0, SynthConfig_1.effectsIncludeGranular)(instrument.effects)) {
                                instrument.granular = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrument.grainSize = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrument.grainAmounts = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrument.grainRange = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                            if ((0, SynthConfig_1.effectsIncludeRingModulation)(instrument.effects)) {
                                instrument.ringModulation = clamp(0, SynthConfig_1.Config.ringModRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.ringModulationHz = clamp(0, SynthConfig_1.Config.ringModHzRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.ringModWaveformIndex = clamp(0, SynthConfig_1.Config.operatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.ringModPulseWidth = clamp(0, SynthConfig_1.Config.pulseWidthRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.ringModHzOffset = clamp(SynthConfig_1.Config.rmHzOffsetMin, SynthConfig_1.Config.rmHzOffsetMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludePhaser)(instrument.effects)) {
                                instrument.phaserFreq = clamp(0, SynthConfig_1.Config.phaserFreqRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.phaserFeedback = clamp(0, SynthConfig_1.Config.phaserFeedbackRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.phaserStages = clamp(0, SynthConfig_1.Config.phaserMaxStages + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                instrument.phaserMix = clamp(0, SynthConfig_1.Config.phaserMixRange, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                            if ((0, SynthConfig_1.effectsIncludeInvertWave)(instrument.effects)) {
                                instrument.invertWave = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] ? true : false;
                            }
                            if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument.effects)) {
                                instrument.upperNoteLimit = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrument.lowerNoteLimit = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                        }
                        // Clamp the range.
                        instrument.effects &= (1 << 18 /* EffectType.length */) - 1;
                    }
                    break;
                case 118 /* SongTagCode.volume */:
                    {
                        if (beforeThree && fromBeepBox) {
                            var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            var instrument = this.channels[channelIndex].instruments[0];
                            instrument.volume = Math.round(clamp(-SynthConfig_1.Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                        }
                        else if (beforeSix && fromBeepBox) {
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (var _l = 0, _m = this.channels[channelIndex].instruments; _l < _m.length; _l++) {
                                    var instrument = _m[_l];
                                    instrument.volume = Math.round(clamp(-SynthConfig_1.Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                                }
                            }
                        }
                        else if (beforeSeven && fromBeepBox) {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.volume = Math.round(clamp(-SynthConfig_1.Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 5.0));
                        }
                        else if (fromBeepBox) {
                            // Beepbox v9's volume range is 0-7 (0 is max, 7 is mute)
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.volume = Math.round(clamp(-SynthConfig_1.Config.volumeRange / 2, 1, -base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 25.0 / 7.0));
                        }
                        else {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            // Volume is stored in two bytes in jummbox just in case range ever exceeds one byte, e.g. through later waffling on the subject.
                            instrument.volume = Math.round(clamp(-SynthConfig_1.Config.volumeRange / 2, SynthConfig_1.Config.volumeRange / 2 + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) | (base64CharCodeToInt[compressed.charCodeAt(charIndex++)])) - SynthConfig_1.Config.volumeRange / 2));
                        }
                    }
                    break;
                case 76 /* SongTagCode.pan */:
                    {
                        if (beforeNine && fromBeepBox) {
                            // Beepbox has a panMax of 8 (9 total positions), Jummbox has a panMax of 100 (101 total positions)
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.pan = clamp(0, SynthConfig_1.Config.panMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * ((SynthConfig_1.Config.panMax) / 8.0));
                        }
                        else if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.pan = clamp(0, SynthConfig_1.Config.panMax + 1, (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            // Pan delay follows on v3 + v4
                            if (fromJummBox && !beforeThree || fromGoldBox || fromUltraBox || fromSlarmoosBox || fromJukeBox) {
                                instrument.panDelay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            }
                        }
                        else {
                            // Do nothing? This song tag code is deprecated for now.
                        }
                    }
                    break;
                case 68 /* SongTagCode.detune */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if ((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) {
                            // Before jummbox v5, detune was -50 to 50. Now it is 0 to 400
                            instrument.detune = clamp(SynthConfig_1.Config.detuneMin, SynthConfig_1.Config.detuneMax + 1, ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) * 4);
                            instrument.effects |= 1 << 8 /* EffectType.detune */;
                        }
                        else {
                            // Now in v5, tag code is deprecated and handled thru detune effects.
                        }
                    }
                    break;
                case 77 /* SongTagCode.customChipWave */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        // Pop custom wave values
                        for (var j = 0; j < 64; j++) {
                            instrument.customChipWave[j]
                                = clamp(-24, 25, base64CharCodeToInt[compressed.charCodeAt(charIndex++)] - 24);
                        }
                        var sum = 0.0;
                        for (var i_38 = 0; i_38 < instrument.customChipWave.length; i_38++) {
                            sum += instrument.customChipWave[i_38];
                        }
                        var average = sum / instrument.customChipWave.length;
                        // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                        var cumulative = 0;
                        var wavePrev = 0;
                        for (var i_39 = 0; i_39 < instrument.customChipWave.length; i_39++) {
                            cumulative += wavePrev;
                            wavePrev = instrument.customChipWave[i_39] - average;
                            instrument.customChipWaveIntegral[i_39] = cumulative;
                        }
                        // 65th, last sample is for anti-aliasing
                        instrument.customChipWaveIntegral[64] = 0.0;
                    }
                    break;
                case 79 /* SongTagCode.limiterSettings */:
                    {
                        var nextValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        // Check if limiter settings are used... if not, restore to default
                        if (nextValue == 0x3f) {
                            this.restoreLimiterDefaults();
                        }
                        else {
                            // Limiter is used, grab values
                            this.compressionRatio = (nextValue < 10 ? nextValue / 10 : (1 + (nextValue - 10) / 60));
                            nextValue = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.limitRatio = (nextValue < 10 ? nextValue / 10 : (nextValue - 9));
                            this.limitDecay = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            this.limitRise = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)] * 250.0) + 2000.0;
                            this.compressionThreshold = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 20.0;
                            this.limitThreshold = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 20.0;
                            this.masterGain = ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) / 50.0;
                        }
                    }
                    break;
                case 85 /* SongTagCode.channelNames */:
                    {
                        for (var channel = 0; channel < this.getChannelCount(); channel++) {
                            // Length of channel name string. Due to some crazy Unicode characters this needs to be 2 bytes...
                            var channelNameLength;
                            if (beforeFour && !fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox)
                                channelNameLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            else
                                channelNameLength = ((base64CharCodeToInt[compressed.charCodeAt(charIndex++)] << 6) + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            this.channels[channel].name = decodeURIComponent(compressed.substring(charIndex, charIndex + channelNameLength));
                            charIndex += channelNameLength;
                        }
                    }
                    break;
                case 65 /* SongTagCode.algorithm */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if (instrument.type == 1 /* InstrumentType.fm */) {
                            instrument.algorithm = clamp(0, SynthConfig_1.Config.algorithms.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        else {
                            instrument.algorithm6Op = clamp(0, SynthConfig_1.Config.algorithms6Op.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.customAlgorithm.fromPreset(instrument.algorithm6Op);
                            if (compressed.charCodeAt(charIndex) == 67 /* SongTagCode.chord */) {
                                var carrierCountTemp = clamp(1, SynthConfig_1.Config.operatorCount + 2 + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex + 1)]);
                                charIndex++;
                                var tempModArray = [];
                                if (compressed.charCodeAt(charIndex + 1) == 113 /* SongTagCode.effects */) {
                                    charIndex++;
                                    var j = 0;
                                    charIndex++;
                                    while (compressed.charCodeAt(charIndex) != 113 /* SongTagCode.effects */) {
                                        tempModArray[j] = [];
                                        var o = 0;
                                        while (compressed.charCodeAt(charIndex) != 82 /* SongTagCode.operatorWaves */) {
                                            tempModArray[j][o] = clamp(1, SynthConfig_1.Config.operatorCount + 3, base64CharCodeToInt[compressed.charCodeAt(charIndex)]);
                                            o++;
                                            charIndex++;
                                        }
                                        j++;
                                        charIndex++;
                                    }
                                    instrument.customAlgorithm.set(carrierCountTemp, tempModArray);
                                    charIndex++; //????
                                }
                            }
                        }
                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                            // The algorithm determines the carrier count, which affects how legacy settings are imported.
                            var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                    }
                    break;
                case 120 /* SongTagCode.supersaw */:
                    {
                        if (fromGoldBox && !beforeFour && beforeSix) {
                            //is it more useful to save base64 characters or url length?
                            var chipWaveForCompat = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            if ((chipWaveForCompat + 62) > 85) {
                                if (document.URL.substring(document.URL.length - 13).toLowerCase() != "legacysamples") {
                                    if (!willLoadLegacySamplesForOldSongs) {
                                        willLoadLegacySamplesForOldSongs = true;
                                        SynthConfig_1.Config.willReloadForCustomSamples = true;
                                        EditorConfig_1.EditorConfig.customSamples = ["legacySamples"];
                                        (0, SynthConfig_1.loadBuiltInSamples)(0);
                                    }
                                }
                            }
                            if ((chipWaveForCompat + 62) > 78) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveForCompat + 63);
                            }
                            else if ((chipWaveForCompat + 62) > 67) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveForCompat + 61);
                            }
                            else if ((chipWaveForCompat + 62) == 67) {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = 40;
                            }
                            else {
                                this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].chipWave = clamp(0, SynthConfig_1.Config.chipWaves.length, chipWaveForCompat + 62);
                            }
                        }
                        else {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.supersawDynamism = clamp(0, SynthConfig_1.Config.supersawDynamismMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.supersawSpread = clamp(0, SynthConfig_1.Config.supersawSpreadMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.supersawShape = clamp(0, SynthConfig_1.Config.supersawShapeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    break;
                case 70 /* SongTagCode.feedbackType */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if (instrument.type == 1 /* InstrumentType.fm */) {
                            instrument.feedbackType = clamp(0, SynthConfig_1.Config.feedbacks.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                        else {
                            instrument.feedbackType6Op = clamp(0, SynthConfig_1.Config.feedbacks6Op.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            instrument.customFeedbackType.fromPreset(instrument.feedbackType6Op);
                            var tempModArray = [];
                            if (compressed.charCodeAt(charIndex) == 113 /* SongTagCode.effects */) {
                                var j = 0;
                                charIndex++;
                                while (compressed.charCodeAt(charIndex) != 113 /* SongTagCode.effects */) {
                                    tempModArray[j] = [];
                                    var o = 0;
                                    while (compressed.charCodeAt(charIndex) != 82 /* SongTagCode.operatorWaves */) {
                                        tempModArray[j][o] = clamp(1, SynthConfig_1.Config.operatorCount + 2, base64CharCodeToInt[compressed.charCodeAt(charIndex)]);
                                        o++;
                                        charIndex++;
                                    }
                                    j++;
                                    charIndex++;
                                }
                                instrument.customFeedbackType.set(tempModArray);
                                charIndex++; //???? weirdly needs to skip the end character or it'll use that next loop instead of like just moving to the next one itself
                            }
                        }
                    }
                    break;
                case 66 /* SongTagCode.feedbackAmplitude */:
                    {
                        this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator].feedbackAmplitude = clamp(0, SynthConfig_1.Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                    }
                    break;
                case 86 /* SongTagCode.feedbackEnvelope */:
                    {
                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                            var pregoldToEnvelope = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11];
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                            var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            if ((beforeTwo && fromGoldBox) || (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox))
                                aa = pregoldToEnvelope[aa];
                            legacySettings.feedbackEnvelope = Song._envelopeFromLegacyIndex(base64CharCodeToInt[aa]);
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                        else {
                            // Do nothing? This song tag code is deprecated for now.
                        }
                    }
                    break;
                case 81 /* SongTagCode.operatorFrequencies */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if (beforeThree && fromGoldBox) {
                            var freqToGold3 = [4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 18, 20, 22, 24, 2, 1, 9, 17, 19, 21, 23, 0, 3];
                            for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                                instrument.operators[o].frequency = freqToGold3[clamp(0, freqToGold3.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                            }
                        }
                        else if (!fromGoldBox && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) {
                            var freqToUltraBox = [4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 18, 20, 23, 27, 2, 1, 9, 17, 19, 21, 23, 0, 3];
                            for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                                instrument.operators[o].frequency = freqToUltraBox[clamp(0, freqToUltraBox.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                            }
                        }
                        else {
                            for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                                instrument.operators[o].frequency = clamp(0, SynthConfig_1.Config.operatorFrequencies.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    break;
                case 80 /* SongTagCode.operatorAmplitudes */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                            instrument.operators[o].amplitude = clamp(0, SynthConfig_1.Config.operatorAmplitudeMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                        }
                    }
                    break;
                case 69 /* SongTagCode.envelopes */:
                    {
                        var pregoldToEnvelope = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 27, 28, 29, 32, 33, 34, 31, 11];
                        var jummToUltraEnvelope = [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 58, 59, 60];
                        var slarURL3toURL4Envelope = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 13, 14];
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                            var legacySettings = legacySettingsCache[instrumentChannelIterator][instrumentIndexIterator];
                            legacySettings.operatorEnvelopes = [];
                            for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                                var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                if ((beforeTwo && fromGoldBox) || (fromBeepBox))
                                    aa = pregoldToEnvelope[aa];
                                if (fromJummBox)
                                    aa = jummToUltraEnvelope[aa];
                                legacySettings.operatorEnvelopes[o] = Song._envelopeFromLegacyIndex(aa);
                            }
                            instrument.convertLegacySettings(legacySettings, forceSimpleFilter);
                        }
                        else {
                            var envelopeCount = clamp(0, SynthConfig_1.Config.maxEnvelopeCount + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            // JB v6 adds some envelope options here in the sequence.
                            var envelopeDiscrete = false;
                            if ((fromJummBox && !beforeSix) || (fromUltraBox && !beforeFive) || (fromSlarmoosBox) || fromJukeBox) {
                                instrument.envelopeSpeed = clamp(0, SynthConfig_1.Config.modulators.dictionary["envelope speed"].maxRawVol + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if ((!fromSlarmoosBox || beforeFive) && !fromJukeBox) {
                                    envelopeDiscrete = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) ? true : false;
                                }
                            }
                            for (var i_40 = 0; i_40 < envelopeCount; i_40++) {
                                var target = clamp(0, SynthConfig_1.Config.instrumentAutomationTargets.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                var index = 0;
                                var maxCount = SynthConfig_1.Config.instrumentAutomationTargets[target].maxCount;
                                if (maxCount > 1) {
                                    index = clamp(0, maxCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                var aa = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                if ((beforeTwo && fromGoldBox) || (fromBeepBox))
                                    aa = pregoldToEnvelope[aa];
                                if (fromJummBox)
                                    aa = jummToUltraEnvelope[aa];
                                if (!fromJukeBox && !fromSlarmoosBox && aa >= 2)
                                    aa++; //2 for pitch
                                var updatedEnvelopes = false;
                                var perEnvelopeSpeed = 1;
                                if (!fromJukeBox && (!fromSlarmoosBox || beforeThree)) {
                                    updatedEnvelopes = true;
                                    perEnvelopeSpeed = SynthConfig_1.Config.envelopes[aa].speed;
                                    aa = SynthConfig_1.Config.envelopes[aa].type; //update envelopes
                                }
                                else if (!fromJukeBox && beforeFour && aa >= 3)
                                    aa++; //3 for random
                                var isTremolo2 = false;
                                if ((fromSlarmoosBox && !beforeThree && beforeFour) || updatedEnvelopes) { //remove tremolo2
                                    if (aa == 9)
                                        isTremolo2 = true;
                                    aa = slarURL3toURL4Envelope[aa];
                                }
                                var envelope = clamp(0, ((fromJukeBox || (fromSlarmoosBox && !beforeThree) || updatedEnvelopes) ? SynthConfig_1.Config.newEnvelopes.length : SynthConfig_1.Config.envelopes.length), aa);
                                var pitchEnvelopeStart = 0;
                                var pitchEnvelopeEnd = SynthConfig_1.Config.maxPitch;
                                var envelopeInverse = false;
                                perEnvelopeSpeed = (fromJukeBox || (fromSlarmoosBox && !beforeThree)) ? SynthConfig_1.Config.newEnvelopes[envelope].speed : perEnvelopeSpeed;
                                var perEnvelopeLowerBound = 0;
                                var perEnvelopeUpperBound = 1;
                                var steps = 2;
                                var seed = 2;
                                var waveform = 0 /* LFOEnvelopeTypes.sine */;
                                //pull out unique envelope setting values first, then general ones
                                if (fromJukeBox || (fromSlarmoosBox && !beforeFour)) {
                                    if (SynthConfig_1.Config.newEnvelopes[envelope].name == "lfo") {
                                        waveform = clamp(0, 7 /* LFOEnvelopeTypes.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        if (waveform == 5 /* LFOEnvelopeTypes.steppedSaw */ || waveform == 6 /* LFOEnvelopeTypes.steppedTri */) {
                                            steps = clamp(1, SynthConfig_1.Config.randomEnvelopeStepsMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                    }
                                    else if (SynthConfig_1.Config.newEnvelopes[envelope].name == "random") {
                                        steps = clamp(1, SynthConfig_1.Config.randomEnvelopeStepsMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        seed = clamp(1, SynthConfig_1.Config.randomEnvelopeSeedMax + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        waveform = clamp(0, 4 /* RandomEnvelopeTypes.length */, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]); //we use waveform for the random type as well
                                    }
                                }
                                if (fromJukeBox || (fromSlarmoosBox && !beforeThree)) {
                                    if (SynthConfig_1.Config.newEnvelopes[envelope].name == "pitch") {
                                        if (!instrument.isNoiseInstrument) {
                                            var pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                            pitchEnvelopeStart = clamp(0, SynthConfig_1.Config.maxPitch + 1, pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                            pitchEnvelopeEnd = clamp(0, SynthConfig_1.Config.maxPitch + 1, pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                        else {
                                            pitchEnvelopeStart = clamp(0, SynthConfig_1.Config.drumCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                            pitchEnvelopeEnd = clamp(0, SynthConfig_1.Config.drumCount, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                        }
                                    }
                                    var checkboxValues = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    if (fromJukeBox || (fromSlarmoosBox && !beforeFive)) {
                                        envelopeDiscrete = (checkboxValues >> 1) == 1 ? true : false;
                                    }
                                    envelopeInverse = (checkboxValues & 1) == 1 ? true : false;
                                    if (SynthConfig_1.Config.newEnvelopes[envelope].name != "pitch" && SynthConfig_1.Config.newEnvelopes[envelope].name != "note size" && SynthConfig_1.Config.newEnvelopes[envelope].name != "punch" && SynthConfig_1.Config.newEnvelopes[envelope].name != "none") {
                                        perEnvelopeSpeed = SynthConfig_1.Config.perEnvelopeSpeedIndices[base64CharCodeToInt[compressed.charCodeAt(charIndex++)]];
                                    }
                                    perEnvelopeLowerBound = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 10;
                                    perEnvelopeUpperBound = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] / 10;
                                }
                                if ((!fromSlarmoosBox && !fromJukeBox) || beforeFour) { //update tremolo2
                                    if (isTremolo2) {
                                        waveform = 0 /* LFOEnvelopeTypes.sine */;
                                        if (envelopeInverse) {
                                            perEnvelopeUpperBound = Math.floor((perEnvelopeUpperBound / 2) * 10) / 10;
                                            perEnvelopeLowerBound = Math.floor((perEnvelopeLowerBound / 2) * 10) / 10;
                                        }
                                        else {
                                            perEnvelopeUpperBound = Math.floor((0.5 + (perEnvelopeUpperBound - perEnvelopeLowerBound) / 2) * 10) / 10;
                                            perEnvelopeLowerBound = 0.5;
                                        }
                                    }
                                }
                                instrument.addEnvelope(target, index, envelope, true, pitchEnvelopeStart, pitchEnvelopeEnd, envelopeInverse, perEnvelopeSpeed, perEnvelopeLowerBound, perEnvelopeUpperBound, steps, seed, waveform, envelopeDiscrete);
                                if (fromSlarmoosBox && beforeThree && !beforeTwo) {
                                    var pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    instrument.envelopes[i_40].pitchEnvelopeStart = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    instrument.envelopes[i_40].pitchEnvelopeEnd = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                    instrument.envelopes[i_40].inverse = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] == 1 ? true : false;
                                }
                            }
                            var instrumentPitchEnvelopeStart = 0;
                            var instrumentPitchEnvelopeEnd = SynthConfig_1.Config.maxPitch;
                            var instrumentEnvelopeInverse = false;
                            if (fromSlarmoosBox && beforeTwo) {
                                var pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrumentPitchEnvelopeStart = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                pitchEnvelopeCompact = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrumentPitchEnvelopeEnd = pitchEnvelopeCompact * 64 + base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                instrumentEnvelopeInverse = base64CharCodeToInt[compressed.charCodeAt(charIndex++)] === 1 ? true : false;
                                for (var i_41 = 0; i_41 < envelopeCount; i_41++) {
                                    instrument.envelopes[i_41].pitchEnvelopeStart = instrumentPitchEnvelopeStart;
                                    instrument.envelopes[i_41].pitchEnvelopeEnd = instrumentPitchEnvelopeEnd;
                                    instrument.envelopes[i_41].inverse = SynthConfig_1.Config.envelopes[instrument.envelopes[i_41].envelope].name == "pitch" ? instrumentEnvelopeInverse : false;
                                }
                            }
                        }
                    }
                    break;
                case 82 /* SongTagCode.operatorWaves */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if (beforeThree && fromGoldBox) {
                            for (var o = 0; o < SynthConfig_1.Config.operatorCount; o++) {
                                var pre3To3g = [0, 1, 3, 2, 2, 2, 4, 5];
                                var old = clamp(0, pre3To3g.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                if (old == 3) {
                                    instrument.operators[o].pulseWidth = 5;
                                }
                                else if (old == 4) {
                                    instrument.operators[o].pulseWidth = 4;
                                }
                                else if (old == 5) {
                                    instrument.operators[o].pulseWidth = 6;
                                }
                                instrument.operators[o].waveform = pre3To3g[old];
                            }
                        }
                        else {
                            for (var o = 0; o < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); o++) {
                                if (fromJummBox) {
                                    var jummToG = [0, 1, 3, 2, 4, 5];
                                    instrument.operators[o].waveform = jummToG[clamp(0, SynthConfig_1.Config.operatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)])];
                                }
                                else {
                                    instrument.operators[o].waveform = clamp(0, SynthConfig_1.Config.operatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                                // Pulse width follows, if it is a pulse width operator wave
                                if (instrument.operators[o].waveform == 2) {
                                    instrument.operators[o].pulseWidth = clamp(0, SynthConfig_1.Config.pwmOperatorWaves.length, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                                }
                            }
                        }
                    }
                    break;
                case 83 /* SongTagCode.spectrum */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        if (instrument.type == 3 /* InstrumentType.spectrum */) {
                            var byteCount = Math.ceil(SynthConfig_1.Config.spectrumControlPoints * SynthConfig_1.Config.spectrumControlPointBits / 6);
                            var bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                            for (var i_42 = 0; i_42 < SynthConfig_1.Config.spectrumControlPoints; i_42++) {
                                instrument.spectrumWave.spectrum[i_42] = bits.read(SynthConfig_1.Config.spectrumControlPointBits);
                            }
                            instrument.spectrumWave.markCustomWaveDirty();
                            charIndex += byteCount;
                        }
                        else if (instrument.type == 4 /* InstrumentType.drumset */) {
                            var byteCount = Math.ceil(SynthConfig_1.Config.drumCount * SynthConfig_1.Config.spectrumControlPoints * SynthConfig_1.Config.spectrumControlPointBits / 6);
                            var bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                            for (var j = 0; j < SynthConfig_1.Config.drumCount; j++) {
                                for (var i_43 = 0; i_43 < SynthConfig_1.Config.spectrumControlPoints; i_43++) {
                                    instrument.drumsetSpectrumWaves[j].spectrum[i_43] = bits.read(SynthConfig_1.Config.spectrumControlPointBits);
                                }
                                instrument.drumsetSpectrumWaves[j].markCustomWaveDirty();
                            }
                            charIndex += byteCount;
                        }
                        else {
                            throw new Error("Unhandled instrument type for spectrum song tag code.");
                        }
                    }
                    break;
                case 72 /* SongTagCode.harmonics */:
                    {
                        var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                        var byteCount = Math.ceil(SynthConfig_1.Config.harmonicsControlPoints * SynthConfig_1.Config.harmonicsControlPointBits / 6);
                        var bits = new BitFieldReader(compressed, charIndex, charIndex + byteCount);
                        for (var i_44 = 0; i_44 < SynthConfig_1.Config.harmonicsControlPoints; i_44++) {
                            instrument.harmonicsWave.harmonics[i_44] = bits.read(SynthConfig_1.Config.harmonicsControlPointBits);
                        }
                        instrument.harmonicsWave.markCustomWaveDirty();
                        charIndex += byteCount;
                    }
                    break;
                case 88 /* SongTagCode.aliases */:
                    {
                        if ((fromJummBox && beforeFive) || (fromGoldBox && beforeFour)) {
                            var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                            instrument.aliases = (base64CharCodeToInt[compressed.charCodeAt(charIndex++)]) ? true : false;
                            if (instrument.aliases) {
                                instrument.distortion = 0;
                                instrument.effects |= 1 << 3 /* EffectType.distortion */;
                            }
                        }
                        else {
                            if (fromUltraBox || fromSlarmoosBox || fromJukeBox) {
                                var instrument = this.channels[instrumentChannelIterator].instruments[instrumentIndexIterator];
                                instrument.decimalOffset = clamp(0, 50 + 1, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            }
                        }
                    }
                    break;
                case 98 /* SongTagCode.bars */:
                    {
                        var subStringLength = void 0;
                        if (beforeThree && fromBeepBox) {
                            var channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            var barCount = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            subStringLength = Math.ceil(barCount * 0.5);
                            var bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                            for (var i_45 = 0; i_45 < barCount; i_45++) {
                                this.channels[channelIndex].bars[i_45] = bits.read(3) + 1;
                            }
                        }
                        else if (beforeFive && fromBeepBox) {
                            var neededBits = 0;
                            while ((1 << neededBits) < this.patternsPerChannel)
                                neededBits++;
                            subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                            var bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (var i_46 = 0; i_46 < this.barCount; i_46++) {
                                    this.channels[channelIndex].bars[i_46] = bits.read(neededBits) + 1;
                                }
                            }
                        }
                        else {
                            var neededBits = 0;
                            while ((1 << neededBits) < this.patternsPerChannel + 1)
                                neededBits++;
                            subStringLength = Math.ceil(this.getChannelCount() * this.barCount * neededBits / 6);
                            var bits = new BitFieldReader(compressed, charIndex, charIndex + subStringLength);
                            for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
                                for (var i_47 = 0; i_47 < this.barCount; i_47++) {
                                    this.channels[channelIndex].bars[i_47] = bits.read(neededBits);
                                }
                            }
                        }
                        charIndex += subStringLength;
                    }
                    break;
                case 112 /* SongTagCode.patterns */:
                    {
                        var bitStringLength = 0;
                        var channelIndex = void 0;
                        var largerChords = !((beforeFour && fromJummBox) || fromBeepBox);
                        var recentPitchBitLength = (largerChords ? 4 : 3);
                        var recentPitchLength = (largerChords ? 16 : 8);
                        if (beforeThree && fromBeepBox) {
                            channelIndex = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            // The old format used the next character to represent the number of patterns in the channel, which is usually eight, the default. 
                            charIndex++; //let patternCount: number = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            bitStringLength = base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                            bitStringLength = bitStringLength << 6;
                            bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                        }
                        else {
                            channelIndex = 0;
                            var bitStringLengthLength = validateRange(1, 4, base64CharCodeToInt[compressed.charCodeAt(charIndex++)]);
                            while (bitStringLengthLength > 0) {
                                bitStringLength = bitStringLength << 6;
                                bitStringLength += base64CharCodeToInt[compressed.charCodeAt(charIndex++)];
                                bitStringLengthLength--;
                            }
                        }
                        var bits = new BitFieldReader(compressed, charIndex, charIndex + bitStringLength);
                        charIndex += bitStringLength;
                        var bitsPerNoteSize = Song.getNeededBits(SynthConfig_1.Config.noteSizeMax);
                        var songReverbChannel = -1;
                        var songReverbInstrument = -1;
                        var songReverbIndex = -1;
                        //TODO: Goldbox detecting (ultrabox used the goldbox tag for a bit, sadly making things more complicated)
                        var shouldCorrectTempoMods = fromJummBox;
                        var jummboxTempoMin = 30;
                        while (true) {
                            var channel = this.channels[channelIndex];
                            var isNoiseChannel = this.getChannelIsNoise(channelIndex);
                            var isModChannel = this.getChannelIsMod(channelIndex);
                            var maxInstrumentsPerPattern = this.getMaxInstrumentsPerPattern(channelIndex);
                            var neededInstrumentCountBits = Song.getNeededBits(maxInstrumentsPerPattern - SynthConfig_1.Config.instrumentCountMin);
                            var neededInstrumentIndexBits = Song.getNeededBits(channel.instruments.length - 1);
                            // Some info about modulator settings immediately follows in mod channels.
                            if (isModChannel) {
                                var jumfive = (beforeFive && fromJummBox) || (beforeFour && fromGoldBox);
                                // 2 more indices for 'all' and 'active'
                                var neededModInstrumentIndexBits = (jumfive) ? neededInstrumentIndexBits : Song.getNeededBits(this.getMaxInstrumentsPerChannel() + 2);
                                for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                                    var instrument = channel.instruments[instrumentIndex];
                                    for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                                        // Still using legacy "mod status" format, but doing it manually as it's only used in the URL now.
                                        // 0 - For pitch/noise
                                        // 1 - (used to be For noise, not needed)
                                        // 2 - For song
                                        // 3 - None
                                        var status_2 = bits.read(2);
                                        switch (status_2) {
                                            case 0: // Pitch
                                                instrument.modChannels[mod] = clamp(0, this.pitchChannelCount + this.noiseChannelCount + 1, bits.read(8));
                                                instrument.modInstruments[mod] = clamp(0, this.channels[instrument.modChannels[mod]].instruments.length + 2, bits.read(neededModInstrumentIndexBits));
                                                break;
                                            case 1: // Noise
                                                // Getting a status of 1 means this is legacy mod info. Need to add pitch channel count, as it used to just store noise channel index and not overall channel index
                                                instrument.modChannels[mod] = this.pitchChannelCount + clamp(0, this.noiseChannelCount + 1, bits.read(8));
                                                instrument.modInstruments[mod] = clamp(0, this.channels[instrument.modChannels[mod]].instruments.length + 2, bits.read(neededInstrumentIndexBits));
                                                break;
                                            case 2: // For song
                                                instrument.modChannels[mod] = -1;
                                                break;
                                            case 3: // None
                                                instrument.modChannels[mod] = -2;
                                                break;
                                        }
                                        // Mod setting is only used if the status isn't "none".
                                        if (status_2 != 3) {
                                            instrument.modulators[mod] = bits.read(6);
                                        }
                                        if (!jumfive && (SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "eq filter" || SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "note filter" || SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "song eq")) {
                                            instrument.modFilterTypes[mod] = bits.read(6);
                                        }
                                        if (SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "individual envelope speed" ||
                                            SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "reset envelope" ||
                                            SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "individual envelope lower bound" ||
                                            SynthConfig_1.Config.modulators[instrument.modulators[mod]].name == "individual envelope upper bound") {
                                            instrument.modEnvelopeNumbers[mod] = bits.read(6);
                                        }
                                        if (jumfive && instrument.modChannels[mod] >= 0) {
                                            var forNoteFilter = (0, SynthConfig_1.effectsIncludeNoteFilter)(this.channels[instrument.modChannels[mod]].instruments[instrument.modInstruments[mod]].effects);
                                            // For legacy filter cut/peak, need to denote since scaling must be applied
                                            if (instrument.modulators[mod] == 7) {
                                                // Legacy filter cut index
                                                // Check if there is no filter dot on prospective filter. If so, add a low pass at max possible freq.
                                                if (forNoteFilter) {
                                                    instrument.modulators[mod] = SynthConfig_1.Config.modulators.dictionary["note filt cut"].index;
                                                }
                                                else {
                                                    instrument.modulators[mod] = SynthConfig_1.Config.modulators.dictionary["eq filt cut"].index;
                                                }
                                                instrument.modFilterTypes[mod] = 1; // Dot 1 X
                                            }
                                            else if (instrument.modulators[mod] == 8) {
                                                // Legacy filter peak index
                                                if (forNoteFilter) {
                                                    instrument.modulators[mod] = SynthConfig_1.Config.modulators.dictionary["note filt peak"].index;
                                                }
                                                else {
                                                    instrument.modulators[mod] = SynthConfig_1.Config.modulators.dictionary["eq filt peak"].index;
                                                }
                                                instrument.modFilterTypes[mod] = 2; // Dot 1 Y
                                            }
                                        }
                                        else if (jumfive) {
                                            // Check for song reverb mod, which must be handled differently now that it is a multiplier
                                            if (instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["song reverb"].index) {
                                                songReverbChannel = channelIndex;
                                                songReverbInstrument = instrumentIndex;
                                                songReverbIndex = mod;
                                            }
                                        }
                                        // Based on setting, enable some effects for the modulated instrument. This isn't always set, say if the instrument's pan was right in the center.
                                        // Only used on import of old songs, because sometimes an invalid effect can be set in a mod in the new version that is actually unused. In that case,
                                        // keeping the mod invalid is better since it preserves the state.
                                        if (jumfive && SynthConfig_1.Config.modulators[instrument.modulators[mod]].associatedEffect != 18 /* EffectType.length */) {
                                            this.channels[instrument.modChannels[mod]].instruments[instrument.modInstruments[mod]].effects |= 1 << SynthConfig_1.Config.modulators[instrument.modulators[mod]].associatedEffect;
                                        }
                                    }
                                }
                            }
                            // Scalar applied to detune mods since its granularity was upped. Could be repurposed later if any other granularity changes occur.
                            var detuneScaleNotes = [];
                            for (var j = 0; j < channel.instruments.length; j++) {
                                detuneScaleNotes[j] = [];
                                for (var i_48 = 0; i_48 < SynthConfig_1.Config.modCount; i_48++) {
                                    detuneScaleNotes[j][SynthConfig_1.Config.modCount - 1 - i_48] = 1 + 3 * +(((beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) && isModChannel && (channel.instruments[j].modulators[i_48] == SynthConfig_1.Config.modulators.dictionary["detune"].index));
                                }
                            }
                            var octaveOffset = (isNoiseChannel || isModChannel) ? 0 : channel.octave * 12;
                            var lastPitch = ((isNoiseChannel || isModChannel) ? 4 : octaveOffset);
                            var recentPitches = isModChannel ? [0, 1, 2, 3, 4, 5] : (isNoiseChannel ? [4, 6, 7, 2, 3, 8, 0, 10] : [0, 7, 12, 19, 24, -5, -12]);
                            var recentShapes = [];
                            for (var i_49 = 0; i_49 < recentPitches.length; i_49++) {
                                recentPitches[i_49] += octaveOffset;
                            }
                            for (var i_50 = 0; i_50 < this.patternsPerChannel; i_50++) {
                                var newPattern = channel.patterns[i_50];
                                if ((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox)) {
                                    newPattern.instruments[0] = validateRange(0, channel.instruments.length - 1, bits.read(neededInstrumentIndexBits));
                                    newPattern.instruments.length = 1;
                                }
                                else {
                                    if (this.patternInstruments) {
                                        var instrumentCount = validateRange(SynthConfig_1.Config.instrumentCountMin, maxInstrumentsPerPattern, bits.read(neededInstrumentCountBits) + SynthConfig_1.Config.instrumentCountMin);
                                        for (var j = 0; j < instrumentCount; j++) {
                                            newPattern.instruments[j] = validateRange(0, channel.instruments.length - 1 + +(isModChannel) * 2, bits.read(neededInstrumentIndexBits));
                                        }
                                        newPattern.instruments.length = instrumentCount;
                                    }
                                    else {
                                        newPattern.instruments[0] = 0;
                                        newPattern.instruments.length = SynthConfig_1.Config.instrumentCountMin;
                                    }
                                }
                                if (!(fromBeepBox && beforeThree) && bits.read(1) == 0) {
                                    newPattern.notes.length = 0;
                                    continue;
                                }
                                var curPart = 0;
                                var newNotes = newPattern.notes;
                                var noteCount = 0;
                                // Due to arbitrary note positioning, mod channels don't end the count until curPart actually exceeds the max
                                while (curPart < this.beatsPerBar * SynthConfig_1.Config.partsPerBeat + (+isModChannel)) {
                                    var useOldShape = bits.read(1) == 1;
                                    var newNote = false;
                                    var shapeIndex = 0;
                                    if (useOldShape) {
                                        shapeIndex = validateRange(0, recentShapes.length - 1, bits.readLongTail(0, 0));
                                    }
                                    else {
                                        newNote = bits.read(1) == 1;
                                    }
                                    if (!useOldShape && !newNote) {
                                        // For mod channels, check if you need to move backward too (notes can appear in any order and offset from each other).
                                        if (isModChannel) {
                                            var isBackwards = bits.read(1) == 1;
                                            var restLength = bits.readPartDuration();
                                            if (isBackwards) {
                                                curPart -= restLength;
                                            }
                                            else {
                                                curPart += restLength;
                                            }
                                        }
                                        else {
                                            var restLength = (beforeSeven && fromBeepBox)
                                                ? bits.readLegacyPartDuration() * SynthConfig_1.Config.partsPerBeat / SynthConfig_1.Config.rhythms[this.rhythm].stepsPerBeat
                                                : bits.readPartDuration();
                                            curPart += restLength;
                                        }
                                    }
                                    else {
                                        var shape = void 0;
                                        if (useOldShape) {
                                            shape = recentShapes[shapeIndex];
                                            recentShapes.splice(shapeIndex, 1);
                                        }
                                        else {
                                            shape = {};
                                            if (!largerChords) {
                                                // Old format: X 1's followed by a 0 => X+1 pitches, up to 4
                                                shape.pitchCount = 1;
                                                while (shape.pitchCount < 4 && bits.read(1) == 1)
                                                    shape.pitchCount++;
                                            }
                                            else {
                                                // New format is:
                                                //      0: 1 pitch
                                                // 1[XXX]: 3 bits of binary signifying 2+ pitches
                                                if (bits.read(1) == 1) {
                                                    shape.pitchCount = bits.read(3) + 2;
                                                }
                                                else {
                                                    shape.pitchCount = 1;
                                                }
                                            }
                                            shape.pinCount = bits.readPinCount();
                                            if (fromBeepBox) {
                                                shape.initialSize = bits.read(2) * 2;
                                            }
                                            else if (!isModChannel) {
                                                shape.initialSize = bits.read(bitsPerNoteSize);
                                            }
                                            else if (fromJukeBox && !beforeThree) {
                                                shape.initialSize = bits.read(11); //mod channels use 11 bits for 2000 tempo now
                                            }
                                            else {
                                                shape.initialSize = bits.read(9);
                                            }
                                            shape.pins = [];
                                            shape.length = 0;
                                            shape.bendCount = 0;
                                            for (var j = 0; j < shape.pinCount; j++) {
                                                var pinObj = {};
                                                pinObj.pitchBend = bits.read(1) == 1;
                                                if (pinObj.pitchBend)
                                                    shape.bendCount++;
                                                shape.length += (beforeSeven && fromBeepBox)
                                                    ? bits.readLegacyPartDuration() * SynthConfig_1.Config.partsPerBeat / SynthConfig_1.Config.rhythms[this.rhythm].stepsPerBeat
                                                    : bits.readPartDuration();
                                                pinObj.time = shape.length;
                                                if (fromBeepBox) {
                                                    pinObj.size = bits.read(2) * 2;
                                                }
                                                else if (!isModChannel) {
                                                    pinObj.size = bits.read(bitsPerNoteSize);
                                                }
                                                else if (fromJukeBox && !beforeThree) {
                                                    pinObj.size = bits.read(11); //mod channels use 11 bits for 2000 tempo now
                                                }
                                                else {
                                                    pinObj.size = bits.read(9);
                                                }
                                                shape.pins.push(pinObj);
                                            }
                                        }
                                        recentShapes.unshift(shape);
                                        if (recentShapes.length > 10)
                                            recentShapes.pop(); // TODO: Use Deque?
                                        var note = void 0;
                                        if (newNotes.length <= noteCount) {
                                            note = new Note(0, curPart, curPart + shape.length, shape.initialSize);
                                            newNotes[noteCount++] = note;
                                        }
                                        else {
                                            note = newNotes[noteCount++];
                                            note.start = curPart;
                                            note.end = curPart + shape.length;
                                            note.pins[0].size = shape.initialSize;
                                        }
                                        var pitch = void 0;
                                        var pitchCount = 0;
                                        var pitchBends = []; // TODO: allocate this array only once! keep separate length and iterator index. Use Deque?
                                        for (var j = 0; j < shape.pitchCount + shape.bendCount; j++) {
                                            var useOldPitch = bits.read(1) == 1;
                                            if (!useOldPitch) {
                                                var interval = bits.readPitchInterval();
                                                pitch = lastPitch;
                                                var intervalIter = interval;
                                                while (intervalIter > 0) {
                                                    pitch++;
                                                    while (recentPitches.indexOf(pitch) != -1)
                                                        pitch++;
                                                    intervalIter--;
                                                }
                                                while (intervalIter < 0) {
                                                    pitch--;
                                                    while (recentPitches.indexOf(pitch) != -1)
                                                        pitch--;
                                                    intervalIter++;
                                                }
                                            }
                                            else {
                                                var pitchIndex = validateRange(0, recentPitches.length - 1, bits.read(recentPitchBitLength));
                                                pitch = recentPitches[pitchIndex];
                                                recentPitches.splice(pitchIndex, 1);
                                            }
                                            recentPitches.unshift(pitch);
                                            if (recentPitches.length > recentPitchLength)
                                                recentPitches.pop();
                                            if (j < shape.pitchCount) {
                                                note.pitches[pitchCount++] = pitch;
                                            }
                                            else {
                                                pitchBends.push(pitch);
                                            }
                                            if (j == shape.pitchCount - 1) {
                                                lastPitch = note.pitches[0];
                                            }
                                            else {
                                                lastPitch = pitch;
                                            }
                                        }
                                        note.pitches.length = pitchCount;
                                        pitchBends.unshift(note.pitches[0]); // TODO: Use Deque?
                                        var noteIsForTempoMod = isModChannel && channel.instruments[newPattern.instruments[0]].modulators[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] === SynthConfig_1.Config.modulators.dictionary["tempo"].index;
                                        var tempoOffset = 0;
                                        if (shouldCorrectTempoMods && noteIsForTempoMod) {
                                            tempoOffset = jummboxTempoMin - SynthConfig_1.Config.tempoMin; // convertRealFactor will add back Config.tempoMin as necessary
                                        }
                                        if (isModChannel) {
                                            note.pins[0].size += tempoOffset;
                                            note.pins[0].size *= detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]];
                                        }
                                        var pinCount = 1;
                                        for (var _o = 0, _p = shape.pins; _o < _p.length; _o++) {
                                            var pinObj = _p[_o];
                                            if (pinObj.pitchBend)
                                                pitchBends.shift();
                                            var interval = pitchBends[0] - note.pitches[0];
                                            if (note.pins.length <= pinCount) {
                                                if (isModChannel) {
                                                    note.pins[pinCount++] = makeNotePin(interval, pinObj.time, pinObj.size * detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]] + tempoOffset);
                                                }
                                                else {
                                                    note.pins[pinCount++] = makeNotePin(interval, pinObj.time, pinObj.size);
                                                }
                                            }
                                            else {
                                                var pin = note.pins[pinCount++];
                                                pin.interval = interval;
                                                pin.time = pinObj.time;
                                                if (isModChannel) {
                                                    pin.size = pinObj.size * detuneScaleNotes[newPattern.instruments[0]][note.pitches[0]] + tempoOffset;
                                                }
                                                else {
                                                    pin.size = pinObj.size;
                                                }
                                            }
                                        }
                                        note.pins.length = pinCount;
                                        if (note.start == 0) {
                                            if (!((beforeNine && fromBeepBox) || (beforeFive && fromJummBox) || (beforeFour && fromGoldBox))) {
                                                note.continuesLastPattern = (bits.read(1) == 1);
                                            }
                                            else {
                                                if ((beforeFour && !fromUltraBox && !fromSlarmoosBox && !fromJukeBox) || fromBeepBox) {
                                                    note.continuesLastPattern = false;
                                                }
                                                else {
                                                    note.continuesLastPattern = channel.instruments[newPattern.instruments[0]].legacyTieOver;
                                                }
                                            }
                                        }
                                        curPart = validateRange(0, this.beatsPerBar * SynthConfig_1.Config.partsPerBeat, note.end);
                                    }
                                }
                                newNotes.length = noteCount;
                            }
                            if (beforeThree && fromBeepBox) {
                                break;
                            }
                            else {
                                channelIndex++;
                                if (channelIndex >= this.getChannelCount())
                                    break;
                            }
                        } // while (true)
                        // Correction for old JB songs that had song reverb mods. Change all instruments using reverb to max reverb
                        if (((fromJummBox && beforeFive) || (beforeFour && fromGoldBox)) && songReverbIndex >= 0) {
                            for (var channelIndex_1 = 0; channelIndex_1 < this.channels.length; channelIndex_1++) {
                                for (var instrumentIndex = 0; instrumentIndex < this.channels[channelIndex_1].instruments.length; instrumentIndex++) {
                                    var instrument = this.channels[channelIndex_1].instruments[instrumentIndex];
                                    if ((0, SynthConfig_1.effectsIncludeReverb)(instrument.effects)) {
                                        instrument.reverb = SynthConfig_1.Config.reverbRange - 1;
                                    }
                                    // Set song reverb via mod to the old setting at song start.
                                    if (songReverbChannel == channelIndex_1 && songReverbInstrument == instrumentIndex) {
                                        var patternIndex = this.channels[channelIndex_1].bars[0];
                                        if (patternIndex > 0) {
                                            // Doesn't work if 1st pattern isn't using the right ins for song reverb...
                                            // Add note to start of pattern
                                            var pattern = this.channels[channelIndex_1].patterns[patternIndex - 1];
                                            var lowestPart = 6;
                                            for (var _q = 0, _r = pattern.notes; _q < _r.length; _q++) {
                                                var note = _r[_q];
                                                if (note.pitches[0] == SynthConfig_1.Config.modCount - 1 - songReverbIndex) {
                                                    lowestPart = Math.min(lowestPart, note.start);
                                                }
                                            }
                                            if (lowestPart > 0) {
                                                pattern.notes.push(new Note(SynthConfig_1.Config.modCount - 1 - songReverbIndex, 0, lowestPart, legacyGlobalReverb));
                                            }
                                        }
                                        else {
                                            // Add pattern
                                            if (this.channels[channelIndex_1].patterns.length < SynthConfig_1.Config.barCountMax) {
                                                var pattern = new Pattern();
                                                this.channels[channelIndex_1].patterns.push(pattern);
                                                this.channels[channelIndex_1].bars[0] = this.channels[channelIndex_1].patterns.length;
                                                if (this.channels[channelIndex_1].patterns.length > this.patternsPerChannel) {
                                                    for (var chn = 0; chn < this.channels.length; chn++) {
                                                        if (this.channels[chn].patterns.length <= this.patternsPerChannel) {
                                                            this.channels[chn].patterns.push(new Pattern());
                                                        }
                                                    }
                                                    this.patternsPerChannel++;
                                                }
                                                pattern.instruments.length = 1;
                                                pattern.instruments[0] = songReverbInstrument;
                                                pattern.notes.length = 0;
                                                pattern.notes.push(new Note(SynthConfig_1.Config.modCount - 1 - songReverbIndex, 0, 6, legacyGlobalReverb));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    break;
                default:
                    {
                        throw new Error("Unrecognized song tag code " + String.fromCharCode(command) + " at index " + (charIndex - 1) + " " + compressed.substring(/*charIndex - 2*/ 0, charIndex));
                    }
                    break;
            }
        if (SynthConfig_1.Config.willReloadForCustomSamples) {
            window.location.hash = this.toBase64String();
            setTimeout(function () { location.reload(); }, 50);
        }
    };
    Song._isProperUrl = function (string) {
        try {
            if (OFFLINE) {
                return Boolean(string);
            }
            else {
                return Boolean(new URL(string));
            }
        }
        catch (x) {
            return false;
        }
    };
    // @TODO: Share more of this code with AddSamplesPrompt.
    Song._parseAndConfigureCustomSample = function (url, customSampleUrls, customSamplePresets, sampleLoadingState, parseOldSyntax) {
        var defaultIndex = 0;
        var defaultIntegratedSamples = SynthConfig_1.Config.chipWaves[defaultIndex].samples;
        var defaultSamples = SynthConfig_1.Config.rawRawChipWaves[defaultIndex].samples;
        var customSampleUrlIndex = customSampleUrls.length;
        customSampleUrls.push(url);
        // This depends on `Config.chipWaves` being the same
        // length as `Config.rawRawChipWaves`.
        var chipWaveIndex = SynthConfig_1.Config.chipWaves.length;
        var urlSliced = url;
        var customSampleRate = 44100;
        var isCustomPercussive = false;
        var customRootKey = 60;
        var presetIsUsingAdvancedLoopControls = false;
        var presetChipWaveLoopStart = null;
        var presetChipWaveLoopEnd = null;
        var presetChipWaveStartOffset = null;
        var presetChipWaveLoopMode = null;
        var presetChipWavePlayBackwards = false;
        var parsedSampleOptions = false;
        var optionsStartIndex = url.indexOf("!");
        var optionsEndIndex = -1;
        if (optionsStartIndex === 0) {
            optionsEndIndex = url.indexOf("!", optionsStartIndex + 1);
            if (optionsEndIndex !== -1) {
                var rawOptions = url.slice(optionsStartIndex + 1, optionsEndIndex).split(",");
                for (var _i = 0, rawOptions_1 = rawOptions; _i < rawOptions_1.length; _i++) {
                    var rawOption = rawOptions_1[_i];
                    var optionCode = rawOption.charAt(0);
                    var optionData = rawOption.slice(1, rawOption.length);
                    if (optionCode === "s") {
                        customSampleRate = clamp(8000, 96000 + 1, parseFloatWithDefault(optionData, 44100));
                    }
                    else if (optionCode === "r") {
                        customRootKey = parseFloatWithDefault(optionData, 60);
                    }
                    else if (optionCode === "p") {
                        isCustomPercussive = true;
                    }
                    else if (optionCode === "a") {
                        presetChipWaveLoopStart = parseIntWithDefault(optionData, null);
                        if (presetChipWaveLoopStart != null) {
                            presetIsUsingAdvancedLoopControls = true;
                        }
                    }
                    else if (optionCode === "b") {
                        presetChipWaveLoopEnd = parseIntWithDefault(optionData, null);
                        if (presetChipWaveLoopEnd != null) {
                            presetIsUsingAdvancedLoopControls = true;
                        }
                    }
                    else if (optionCode === "c") {
                        presetChipWaveStartOffset = parseIntWithDefault(optionData, null);
                        if (presetChipWaveStartOffset != null) {
                            presetIsUsingAdvancedLoopControls = true;
                        }
                    }
                    else if (optionCode === "d") {
                        presetChipWaveLoopMode = parseIntWithDefault(optionData, null);
                        if (presetChipWaveLoopMode != null) {
                            // @TODO: Error-prone. This should be automatically
                            // derived from the list of available loop modes.
                            presetChipWaveLoopMode = clamp(0, 3 + 1, presetChipWaveLoopMode);
                            presetIsUsingAdvancedLoopControls = true;
                        }
                    }
                    else if (optionCode === "e") {
                        presetChipWavePlayBackwards = true;
                        presetIsUsingAdvancedLoopControls = true;
                    }
                }
                urlSliced = url.slice(optionsEndIndex + 1, url.length);
                parsedSampleOptions = true;
            }
        }
        var parsedUrl = null;
        if (Song._isProperUrl(urlSliced)) {
            if (OFFLINE) {
                parsedUrl = urlSliced;
            }
            else {
                parsedUrl = new URL(urlSliced);
            }
        }
        else {
            alert(url + " is not a valid url");
            return false;
        }
        if (parseOldSyntax) {
            if (!parsedSampleOptions && parsedUrl != null) {
                if (url.indexOf("@") != -1) {
                    //urlSliced = url.slice(url.indexOf("@"), url.indexOf("@"));
                    urlSliced = url.replaceAll("@", "");
                    if (OFFLINE) {
                        parsedUrl = urlSliced;
                    }
                    else {
                        parsedUrl = new URL(urlSliced);
                    }
                    isCustomPercussive = true;
                }
                function sliceForSampleRate() {
                    urlSliced = url.slice(0, url.indexOf(","));
                    if (OFFLINE) {
                        parsedUrl = urlSliced;
                    }
                    else {
                        parsedUrl = new URL(urlSliced);
                    }
                    customSampleRate = clamp(8000, 96000 + 1, parseFloatWithDefault(url.slice(url.indexOf(",") + 1), 44100));
                    //should this be parseFloat or parseInt?
                    //ig floats let you do decimals and such, but idk where that would be useful
                }
                function sliceForRootKey() {
                    urlSliced = url.slice(0, url.indexOf("!"));
                    if (OFFLINE) {
                        parsedUrl = urlSliced;
                    }
                    else {
                        parsedUrl = new URL(urlSliced);
                    }
                    customRootKey = parseFloatWithDefault(url.slice(url.indexOf("!") + 1), 60);
                }
                if (url.indexOf(",") != -1 && url.indexOf("!") != -1) {
                    if (url.indexOf(",") < url.indexOf("!")) {
                        sliceForRootKey();
                        sliceForSampleRate();
                    }
                    else {
                        sliceForSampleRate();
                        sliceForRootKey();
                    }
                }
                else {
                    if (url.indexOf(",") != -1) {
                        sliceForSampleRate();
                    }
                    if (url.indexOf("!") != -1) {
                        sliceForRootKey();
                    }
                }
            }
        }
        if (parsedUrl != null) {
            // Store in the new format.
            var urlWithNamedOptions = urlSliced;
            var namedOptions = [];
            if (customSampleRate !== 44100)
                namedOptions.push("s" + customSampleRate);
            if (customRootKey !== 60)
                namedOptions.push("r" + customRootKey);
            if (isCustomPercussive)
                namedOptions.push("p");
            if (presetIsUsingAdvancedLoopControls) {
                if (presetChipWaveLoopStart != null)
                    namedOptions.push("a" + presetChipWaveLoopStart);
                if (presetChipWaveLoopEnd != null)
                    namedOptions.push("b" + presetChipWaveLoopEnd);
                if (presetChipWaveStartOffset != null)
                    namedOptions.push("c" + presetChipWaveStartOffset);
                if (presetChipWaveLoopMode != null)
                    namedOptions.push("d" + presetChipWaveLoopMode);
                if (presetChipWavePlayBackwards)
                    namedOptions.push("e");
            }
            if (namedOptions.length > 0) {
                urlWithNamedOptions = "!" + namedOptions.join(",") + "!" + urlSliced;
            }
            customSampleUrls[customSampleUrlIndex] = urlWithNamedOptions;
            // @TODO: Could also remove known extensions, but it
            // would probably be much better to be able to specify
            // a custom name.
            // @TODO: If for whatever inexplicable reason someone
            // uses an url like `https://example.com`, this will
            // result in an empty name here.
            var name_1;
            if (OFFLINE) {
                //@ts-ignore
                name_1 = decodeURIComponent(parsedUrl.replace(/^([^\/]*\/)+/, ""));
            }
            else {
                //@ts-ignore
                name_1 = decodeURIComponent(parsedUrl.pathname.replace(/^([^\/]*\/)+/, ""));
            }
            // @TODO: What to do about samples with the same name?
            // The problem with using the url is that the name is
            // user-facing and long names break assumptions of the
            // UI.
            var expression = 1.0;
            SynthConfig_1.Config.chipWaves[chipWaveIndex] = {
                name: name_1,
                expression: expression,
                isCustomSampled: true,
                isPercussion: isCustomPercussive,
                rootKey: customRootKey,
                sampleRate: customSampleRate,
                samples: defaultIntegratedSamples,
                index: chipWaveIndex,
            };
            SynthConfig_1.Config.rawChipWaves[chipWaveIndex] = {
                name: name_1,
                expression: expression,
                isCustomSampled: true,
                isPercussion: isCustomPercussive,
                rootKey: customRootKey,
                sampleRate: customSampleRate,
                samples: defaultSamples,
                index: chipWaveIndex,
            };
            SynthConfig_1.Config.rawRawChipWaves[chipWaveIndex] = {
                name: name_1,
                expression: expression,
                isCustomSampled: true,
                isPercussion: isCustomPercussive,
                rootKey: customRootKey,
                sampleRate: customSampleRate,
                samples: defaultSamples,
                index: chipWaveIndex,
            };
            var customSamplePresetSettings = {
                "type": "chip",
                "eqFilter": [],
                "effects": [],
                "transition": "normal",
                "fadeInSeconds": 0,
                "fadeOutTicks": -3,
                "chord": "harmony",
                "wave": name_1,
                "unison": "none",
                "envelopes": [],
            };
            if (presetIsUsingAdvancedLoopControls) {
                customSamplePresetSettings["isUsingAdvancedLoopControls"] = true;
                customSamplePresetSettings["chipWaveLoopStart"] = presetChipWaveLoopStart != null ? presetChipWaveLoopStart : 0;
                customSamplePresetSettings["chipWaveLoopEnd"] = presetChipWaveLoopEnd != null ? presetChipWaveLoopEnd : 2;
                customSamplePresetSettings["chipWaveLoopMode"] = presetChipWaveLoopMode != null ? presetChipWaveLoopMode : 0;
                customSamplePresetSettings["chipWavePlayBackwards"] = presetChipWavePlayBackwards;
                customSamplePresetSettings["chipWaveStartOffset"] = presetChipWaveStartOffset != null ? presetChipWaveStartOffset : 0;
            }
            var customSamplePreset = {
                index: 0, // This should be overwritten by toNameMap, in our caller.
                name: name_1,
                midiProgram: 80,
                settings: customSamplePresetSettings,
            };
            customSamplePresets.push(customSamplePreset);
            if (!SynthConfig_1.Config.willReloadForCustomSamples) {
                var rawLoopOptions = {
                    "isUsingAdvancedLoopControls": presetIsUsingAdvancedLoopControls,
                    "chipWaveLoopStart": presetChipWaveLoopStart,
                    "chipWaveLoopEnd": presetChipWaveLoopEnd,
                    "chipWaveLoopMode": presetChipWaveLoopMode,
                    "chipWavePlayBackwards": presetChipWavePlayBackwards,
                    "chipWaveStartOffset": presetChipWaveStartOffset,
                };
                (0, SynthConfig_1.startLoadingSample)(urlSliced, chipWaveIndex, customSamplePresetSettings, rawLoopOptions, customSampleRate);
            }
            sampleLoadingState.statusTable[chipWaveIndex] = 0 /* SampleLoadingStatus.loading */;
            sampleLoadingState.urlTable[chipWaveIndex] = urlSliced;
            sampleLoadingState.totalSamples++;
        }
        return true;
    };
    Song._restoreChipWaveListToDefault = function () {
        SynthConfig_1.Config.chipWaves = (0, SynthConfig_1.toNameMap)(SynthConfig_1.Config.chipWaves.slice(0, SynthConfig_1.Config.firstIndexForSamplesInChipWaveList));
        SynthConfig_1.Config.rawChipWaves = (0, SynthConfig_1.toNameMap)(SynthConfig_1.Config.rawChipWaves.slice(0, SynthConfig_1.Config.firstIndexForSamplesInChipWaveList));
        SynthConfig_1.Config.rawRawChipWaves = (0, SynthConfig_1.toNameMap)(SynthConfig_1.Config.rawRawChipWaves.slice(0, SynthConfig_1.Config.firstIndexForSamplesInChipWaveList));
    };
    Song._clearSamples = function () {
        EditorConfig_1.EditorConfig.customSamples = null;
        Song._restoreChipWaveListToDefault();
        SynthConfig_1.sampleLoadingState.statusTable = {};
        SynthConfig_1.sampleLoadingState.urlTable = {};
        SynthConfig_1.sampleLoadingState.totalSamples = 0;
        SynthConfig_1.sampleLoadingState.samplesLoaded = 0;
        SynthConfig_1.sampleLoadEvents.dispatchEvent(new SynthConfig_1.SampleLoadedEvent(SynthConfig_1.sampleLoadingState.totalSamples, SynthConfig_1.sampleLoadingState.samplesLoaded));
    };
    Song.prototype.toJsonObject = function (enableIntro, loopCount, enableOutro) {
        if (enableIntro === void 0) { enableIntro = true; }
        if (loopCount === void 0) { loopCount = 1; }
        if (enableOutro === void 0) { enableOutro = true; }
        var channelArray = [];
        for (var channelIndex = 0; channelIndex < this.getChannelCount(); channelIndex++) {
            var channel = this.channels[channelIndex];
            var instrumentArray = [];
            var isNoiseChannel = this.getChannelIsNoise(channelIndex);
            var isModChannel = this.getChannelIsMod(channelIndex);
            for (var _i = 0, _a = channel.instruments; _i < _a.length; _i++) {
                var instrument = _a[_i];
                instrumentArray.push(instrument.toJsonObject());
            }
            var patternArray = [];
            for (var _b = 0, _c = channel.patterns; _b < _c.length; _b++) {
                var pattern = _c[_b];
                patternArray.push(pattern.toJsonObject(this, channel, isModChannel));
            }
            var sequenceArray = [];
            if (enableIntro)
                for (var i = 0; i < this.loopStart; i++) {
                    sequenceArray.push(channel.bars[i]);
                }
            for (var l = 0; l < loopCount; l++)
                for (var i = this.loopStart; i < this.loopStart + this.loopLength; i++) {
                    sequenceArray.push(channel.bars[i]);
                }
            if (enableOutro)
                for (var i = this.loopStart + this.loopLength; i < this.barCount; i++) {
                    sequenceArray.push(channel.bars[i]);
                }
            var channelObject = {
                "type": isModChannel ? "mod" : (isNoiseChannel ? "drum" : "pitch"),
                "name": channel.name,
                "instruments": instrumentArray,
                "patterns": patternArray,
                "sequence": sequenceArray,
            };
            if (!isNoiseChannel) {
                // For compatibility with old versions the octave is offset by one.
                channelObject["octaveScrollBar"] = channel.octave - 1;
            }
            channelArray.push(channelObject);
        }
        var result = {
            "name": this.title,
            "format": Song._format,
            "version": Song._latestJukeBoxVersion,
            "scale": SynthConfig_1.Config.scales[this.scale].name,
            "customScale": this.scaleCustom,
            "key": SynthConfig_1.Config.keys[this.key].name,
            "keyOctave": this.octave,
            "introBars": this.loopStart,
            "loopBars": this.loopLength,
            "beatsPerBar": this.beatsPerBar,
            "ticksPerBeat": SynthConfig_1.Config.rhythms[this.rhythm].stepsPerBeat,
            "beatsPerMinute": this.tempo,
            "reverb": this.reverb,
            "masterGain": this.masterGain,
            "compressionThreshold": this.compressionThreshold,
            "limitThreshold": this.limitThreshold,
            "limitDecay": this.limitDecay,
            "limitRise": this.limitRise,
            "limitRatio": this.limitRatio,
            "compressionRatio": this.compressionRatio,
            //"outroBars": this.barCount - this.loopStart - this.loopLength; // derive this from bar arrays?
            //"patternCount": this.patternsPerChannel, // derive this from pattern arrays?
            "songEq": this.eqFilter.toJsonObject(),
            "layeredInstruments": this.layeredInstruments,
            "patternInstruments": this.patternInstruments,
            "channels": channelArray,
        };
        //song eq subfilters
        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount - 1; i++) {
            result["songEq" + i] = this.eqSubFilters[i];
        }
        if (EditorConfig_1.EditorConfig.customSamples != null && EditorConfig_1.EditorConfig.customSamples.length > 0) {
            result["customSamples"] = EditorConfig_1.EditorConfig.customSamples;
        }
        return result;
    };
    Song.prototype.fromJsonObject = function (jsonObject, jsonFormat) {
        if (jsonFormat === void 0) { jsonFormat = "auto"; }
        this.initToDefault(true);
        if (!jsonObject)
            return;
        //const version: number = jsonObject["version"] | 0;
        //if (version > Song._latestVersion) return; // Go ahead and try to parse something from the future I guess? JSON is pretty easy-going!
        // Code for auto-detect mode; if statements that are lower down have 'higher priority'
        if (jsonFormat == "auto") {
            if (jsonObject["format"] == "BeepBox") {
                // Assume that if there is a "riff" song setting then it must be modbox
                if (jsonObject["riff"] != undefined) {
                    jsonFormat = "modbox";
                }
                // Assume that if there are limiter song settings then it must be jummbox
                // Despite being added in JB 2.1, json export for the limiter settings wasn't added until 2.3
                if (jsonObject["masterGain"] != undefined) {
                    jsonFormat = "jummbox";
                }
            }
        }
        var format = (jsonFormat == "auto" ? jsonObject["format"] : jsonFormat).toLowerCase();
        if (jsonObject["name"] != undefined) {
            this.title = jsonObject["name"];
        }
        if (jsonObject["customSamples"] != undefined) {
            var customSamples = jsonObject["customSamples"];
            if (EditorConfig_1.EditorConfig.customSamples == null || EditorConfig_1.EditorConfig.customSamples.join(", ") != customSamples.join(", ")) {
                // Have to duplicate the work done in Song.fromBase64String
                // early here, because Instrument.fromJsonObject depends on the
                // chip wave list having the correct items already in memory.
                SynthConfig_1.Config.willReloadForCustomSamples = true;
                Song._restoreChipWaveListToDefault();
                var willLoadLegacySamples = false;
                var willLoadNintariboxSamples = false;
                var willLoadMarioPaintboxSamples = false;
                var customSampleUrls = [];
                var customSamplePresets = [];
                for (var _i = 0, customSamples_1 = customSamples; _i < customSamples_1.length; _i++) {
                    var url = customSamples_1[_i];
                    if (url.toLowerCase() === "legacysamples") {
                        if (!willLoadLegacySamples) {
                            willLoadLegacySamples = true;
                            customSampleUrls.push(url);
                            (0, SynthConfig_1.loadBuiltInSamples)(0);
                        }
                    }
                    else if (url.toLowerCase() === "nintariboxsamples") {
                        if (!willLoadNintariboxSamples) {
                            willLoadNintariboxSamples = true;
                            customSampleUrls.push(url);
                            (0, SynthConfig_1.loadBuiltInSamples)(1);
                        }
                    }
                    else if (url.toLowerCase() === "mariopaintboxsamples") {
                        if (!willLoadMarioPaintboxSamples) {
                            willLoadMarioPaintboxSamples = true;
                            customSampleUrls.push(url);
                            (0, SynthConfig_1.loadBuiltInSamples)(2);
                        }
                    }
                    else {
                        // When EditorConfig.customSamples is saved in the json
                        // export, it should be using the new syntax, unless
                        // the user has manually modified the URL, so we don't
                        // really need to parse the old syntax here.
                        var parseOldSyntax = false;
                        Song._parseAndConfigureCustomSample(url, customSampleUrls, customSamplePresets, SynthConfig_1.sampleLoadingState, parseOldSyntax);
                    }
                }
                if (customSampleUrls.length > 0) {
                    EditorConfig_1.EditorConfig.customSamples = customSampleUrls;
                }
                if (customSamplePresets.length > 0) {
                    var customSamplePresetsMap = (0, SynthConfig_1.toNameMap)(customSamplePresets);
                    EditorConfig_1.EditorConfig.presetCategories[EditorConfig_1.EditorConfig.presetCategories.length] = {
                        name: "Custom Sample Presets",
                        presets: customSamplePresetsMap,
                        index: EditorConfig_1.EditorConfig.presetCategories.length,
                    };
                }
            }
        }
        else {
            // No custom samples, so the only possibility at this point is that
            // we need to load the legacy samples. Let's check whether that's
            // necessary.
            var shouldLoadLegacySamples = false;
            if (jsonObject["channels"] != undefined) {
                for (var channelIndex = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
                    var channelObject = jsonObject["channels"][channelIndex];
                    if (channelObject["type"] !== "pitch") {
                        // Legacy samples can only exist in pitch channels.
                        continue;
                    }
                    if (Array.isArray(channelObject["instruments"])) {
                        var instrumentObjects = channelObject["instruments"];
                        var _loop_2 = function (i_51) {
                            var instrumentObject = instrumentObjects[i_51];
                            if (instrumentObject["type"] !== "chip") {
                                return "continue";
                            }
                            if (instrumentObject["wave"] == null) {
                                return "continue";
                            }
                            var waveName = instrumentObject["wave"];
                            // @TODO: Avoid this duplication.
                            var names = [
                                "paandorasbox kick",
                                "paandorasbox snare",
                                "paandorasbox piano1",
                                "paandorasbox WOW",
                                "paandorasbox overdrive",
                                "paandorasbox trumpet",
                                "paandorasbox saxophone",
                                "paandorasbox orchestrahit",
                                "paandorasbox detatched violin",
                                "paandorasbox synth",
                                "paandorasbox sonic3snare",
                                "paandorasbox come on",
                                "paandorasbox choir",
                                "paandorasbox overdriveguitar",
                                "paandorasbox flute",
                                "paandorasbox legato violin",
                                "paandorasbox tremolo violin",
                                "paandorasbox amen break",
                                "paandorasbox pizzicato violin",
                                "paandorasbox tim allen grunt",
                                "paandorasbox tuba",
                                "paandorasbox loopingcymbal",
                                "paandorasbox standardkick",
                                "paandorasbox standardsnare",
                                "paandorasbox closedhihat",
                                "paandorasbox foothihat",
                                "paandorasbox openhihat",
                                "paandorasbox crashcymbal",
                                "paandorasbox pianoC4",
                                "paandorasbox liver pad",
                                "paandorasbox marimba",
                                "paandorasbox susdotwav",
                                "paandorasbox wackyboxtts",
                                "paandorasbox peppersteak_1",
                                "paandorasbox peppersteak_2",
                                "paandorasbox vinyl_noise",
                                "paandorasbeta slap bass",
                                "paandorasbeta HD EB overdrive guitar",
                                "paandorasbeta sunsoft bass",
                                "paandorasbeta masculine choir",
                                "paandorasbeta feminine choir",
                                "paandorasbeta tololoche",
                                "paandorasbeta harp",
                                "paandorasbeta pan flute",
                                "paandorasbeta krumhorn",
                                "paandorasbeta timpani",
                                "paandorasbeta crowd hey",
                                "paandorasbeta wario land 4 brass",
                                "paandorasbeta wario land 4 rock organ",
                                "paandorasbeta wario land 4 DAOW",
                                "paandorasbeta wario land 4 hour chime",
                                "paandorasbeta wario land 4 tick",
                                "paandorasbeta kirby kick",
                                "paandorasbeta kirby snare",
                                "paandorasbeta kirby bongo",
                                "paandorasbeta kirby click",
                                "paandorasbeta sonor kick",
                                "paandorasbeta sonor snare",
                                "paandorasbeta sonor snare (left hand)",
                                "paandorasbeta sonor snare (right hand)",
                                "paandorasbeta sonor high tom",
                                "paandorasbeta sonor low tom",
                                "paandorasbeta sonor hihat (closed)",
                                "paandorasbeta sonor hihat (half opened)",
                                "paandorasbeta sonor hihat (open)",
                                "paandorasbeta sonor hihat (open tip)",
                                "paandorasbeta sonor hihat (pedal)",
                                "paandorasbeta sonor crash",
                                "paandorasbeta sonor crash (tip)",
                                "paandorasbeta sonor ride"
                            ];
                            // The difference for these is in the doubled a.
                            var oldNames = [
                                "pandoraasbox kick",
                                "pandoraasbox snare",
                                "pandoraasbox piano1",
                                "pandoraasbox WOW",
                                "pandoraasbox overdrive",
                                "pandoraasbox trumpet",
                                "pandoraasbox saxophone",
                                "pandoraasbox orchestrahit",
                                "pandoraasbox detatched violin",
                                "pandoraasbox synth",
                                "pandoraasbox sonic3snare",
                                "pandoraasbox come on",
                                "pandoraasbox choir",
                                "pandoraasbox overdriveguitar",
                                "pandoraasbox flute",
                                "pandoraasbox legato violin",
                                "pandoraasbox tremolo violin",
                                "pandoraasbox amen break",
                                "pandoraasbox pizzicato violin",
                                "pandoraasbox tim allen grunt",
                                "pandoraasbox tuba",
                                "pandoraasbox loopingcymbal",
                                "pandoraasbox standardkick",
                                "pandoraasbox standardsnare",
                                "pandoraasbox closedhihat",
                                "pandoraasbox foothihat",
                                "pandoraasbox openhihat",
                                "pandoraasbox crashcymbal",
                                "pandoraasbox pianoC4",
                                "pandoraasbox liver pad",
                                "pandoraasbox marimba",
                                "pandoraasbox susdotwav",
                                "pandoraasbox wackyboxtts",
                                "pandoraasbox peppersteak_1",
                                "pandoraasbox peppersteak_2",
                                "pandoraasbox vinyl_noise",
                                "pandoraasbeta slap bass",
                                "pandoraasbeta HD EB overdrive guitar",
                                "pandoraasbeta sunsoft bass",
                                "pandoraasbeta masculine choir",
                                "pandoraasbeta feminine choir",
                                "pandoraasbeta tololoche",
                                "pandoraasbeta harp",
                                "pandoraasbeta pan flute",
                                "pandoraasbeta krumhorn",
                                "pandoraasbeta timpani",
                                "pandoraasbeta crowd hey",
                                "pandoraasbeta wario land 4 brass",
                                "pandoraasbeta wario land 4 rock organ",
                                "pandoraasbeta wario land 4 DAOW",
                                "pandoraasbeta wario land 4 hour chime",
                                "pandoraasbeta wario land 4 tick",
                                "pandoraasbeta kirby kick",
                                "pandoraasbeta kirby snare",
                                "pandoraasbeta kirby bongo",
                                "pandoraasbeta kirby click",
                                "pandoraasbeta sonor kick",
                                "pandoraasbeta sonor snare",
                                "pandoraasbeta sonor snare (left hand)",
                                "pandoraasbeta sonor snare (right hand)",
                                "pandoraasbeta sonor high tom",
                                "pandoraasbeta sonor low tom",
                                "pandoraasbeta sonor hihat (closed)",
                                "pandoraasbeta sonor hihat (half opened)",
                                "pandoraasbeta sonor hihat (open)",
                                "pandoraasbeta sonor hihat (open tip)",
                                "pandoraasbeta sonor hihat (pedal)",
                                "pandoraasbeta sonor crash",
                                "pandoraasbeta sonor crash (tip)",
                                "pandoraasbeta sonor ride"
                            ];
                            // This mirrors paandorasboxWaveNames, which is unprefixed.
                            var veryOldNames = [
                                "kick",
                                "snare",
                                "piano1",
                                "WOW",
                                "overdrive",
                                "trumpet",
                                "saxophone",
                                "orchestrahit",
                                "detatched violin",
                                "synth",
                                "sonic3snare",
                                "come on",
                                "choir",
                                "overdriveguitar",
                                "flute",
                                "legato violin",
                                "tremolo violin",
                                "amen break",
                                "pizzicato violin",
                                "tim allen grunt",
                                "tuba",
                                "loopingcymbal",
                                "standardkick",
                                "standardsnare",
                                "closedhihat",
                                "foothihat",
                                "openhihat",
                                "crashcymbal",
                                "pianoC4",
                                "liver pad",
                                "marimba",
                                "susdotwav",
                                "wackyboxtts"
                            ];
                            if (names.includes(waveName)) {
                                shouldLoadLegacySamples = true;
                            }
                            else if (oldNames.includes(waveName)) {
                                shouldLoadLegacySamples = true;
                                // If we see one of these old names, update it
                                // to the corresponding new name.
                                instrumentObject["wave"] = names[oldNames.findIndex(function (x) { return x === waveName; })];
                            }
                            else if (veryOldNames.includes(waveName)) {
                                if ((waveName === "trumpet" || waveName === "flute") && (format != "paandorasbox")) {
                                    // If we see chip waves named trumpet or flute, and if the format isn't PaandorasBox, we leave them as-is
                                }
                                else {
                                    // There's no other chip waves with ambiguous names like that, so it should
                                    // be okay to assume we'll need to load the legacy samples now.
                                    shouldLoadLegacySamples = true;
                                    // If we see one of these old names, update it
                                    // to the corresponding new name.
                                    instrumentObject["wave"] = names[veryOldNames.findIndex(function (x) { return x === waveName; })];
                                }
                            }
                        };
                        for (var i_51 = 0; i_51 < instrumentObjects.length; i_51++) {
                            _loop_2(i_51);
                        }
                    }
                }
            }
            if (shouldLoadLegacySamples) {
                SynthConfig_1.Config.willReloadForCustomSamples = true;
                Song._restoreChipWaveListToDefault();
                (0, SynthConfig_1.loadBuiltInSamples)(0);
                EditorConfig_1.EditorConfig.customSamples = ["legacySamples"];
            }
            else {
                // We don't need to load the legacy samples, but we may have
                // leftover samples in memory. If we do, clear them.
                if (EditorConfig_1.EditorConfig.customSamples != null && EditorConfig_1.EditorConfig.customSamples.length > 0) {
                    // We need to reload anyway in this case, because (for now)
                    // the chip wave lists won't be correctly updated.
                    SynthConfig_1.Config.willReloadForCustomSamples = true;
                    Song._clearSamples();
                }
            }
        }
        this.scale = 0; // default to free.
        if (jsonObject["scale"] != undefined) {
            var oldScaleNames = {
                "romani :)": "double harmonic :)",
                "romani :(": "double harmonic :(",
                "dbl harmonic :)": "double harmonic :)",
                "dbl harmonic :(": "double harmonic :(",
                "enigma": "strange",
            };
            var scaleName_1 = (oldScaleNames[jsonObject["scale"]] != undefined) ? oldScaleNames[jsonObject["scale"]] : jsonObject["scale"];
            var scale = SynthConfig_1.Config.scales.findIndex(function (scale) { return scale.name == scaleName_1; });
            if (scale != -1)
                this.scale = scale;
            if (this.scale == SynthConfig_1.Config.scales["dictionary"]["Custom"].index) {
                if (jsonObject["customScale"] != undefined) {
                    for (var _a = 0, _b = jsonObject["customScale"].keys(); _a < _b.length; _a++) {
                        var i = _b[_a];
                        this.scaleCustom[i] = jsonObject["customScale"][i];
                    }
                }
            }
        }
        if (jsonObject["key"] != undefined) {
            if (typeof (jsonObject["key"]) == "number") {
                this.key = ((jsonObject["key"] + 1200) >>> 0) % SynthConfig_1.Config.keys.length;
            }
            else if (typeof (jsonObject["key"]) == "string") {
                var key = jsonObject["key"];
                // This conversion code depends on C through B being
                // available as keys, of course.
                if (key === "C+") {
                    this.key = 0;
                    this.octave = 1;
                }
                else if (key === "G- (actually F#-)") {
                    this.key = 6;
                    this.octave = -1;
                }
                else if (key === "C-") {
                    this.key = 0;
                    this.octave = -1;
                }
                else if (key === "oh no (F-)") {
                    this.key = 5;
                    this.octave = -1;
                }
                else {
                    var letter = key.charAt(0).toUpperCase();
                    var symbol = key.charAt(1).toLowerCase();
                    var letterMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
                    var accidentalMap = { "#": 1, "♯": 1, "b": -1, "♭": -1 };
                    var index = letterMap[letter];
                    var offset = accidentalMap[symbol];
                    if (index != undefined) {
                        if (offset != undefined)
                            index += offset;
                        if (index < 0)
                            index += 12;
                        index = index % 12;
                        this.key = index;
                    }
                }
            }
        }
        if (jsonObject["beatsPerMinute"] != undefined) {
            this.tempo = clamp(SynthConfig_1.Config.tempoMin, SynthConfig_1.Config.tempoMax + 1, jsonObject["beatsPerMinute"] | 0);
        }
        if (jsonObject["keyOctave"] != undefined) {
            this.octave = clamp(SynthConfig_1.Config.octaveMin, SynthConfig_1.Config.octaveMax + 1, jsonObject["keyOctave"] | 0);
        }
        var legacyGlobalReverb = 0; // In older songs, reverb was song-global, record that here and pass it to Instrument.fromJsonObject() for context.
        if (jsonObject["reverb"] != undefined) {
            legacyGlobalReverb = clamp(0, 32, jsonObject["reverb"] | 0);
        }
        if (jsonObject["beatsPerBar"] != undefined) {
            this.beatsPerBar = Math.max(SynthConfig_1.Config.beatsPerBarMin, Math.min(SynthConfig_1.Config.beatsPerBarMax, jsonObject["beatsPerBar"] | 0));
        }
        var importedPartsPerBeat = 4;
        if (jsonObject["ticksPerBeat"] != undefined) {
            importedPartsPerBeat = (jsonObject["ticksPerBeat"] | 0) || 4;
            this.rhythm = SynthConfig_1.Config.rhythms.findIndex(function (rhythm) { return rhythm.stepsPerBeat == importedPartsPerBeat; });
            if (this.rhythm == -1) {
                this.rhythm = 1; //default rhythm
            }
        }
        // Read limiter settings. Ranges and defaults are based on slider settings
        if (jsonObject["masterGain"] != undefined) {
            this.masterGain = Math.max(0.0, Math.min(5.0, jsonObject["masterGain"] || 0));
        }
        else {
            this.masterGain = 1.0;
        }
        if (jsonObject["limitThreshold"] != undefined) {
            this.limitThreshold = Math.max(0.0, Math.min(2.0, jsonObject["limitThreshold"] || 0));
        }
        else {
            this.limitThreshold = 1.0;
        }
        if (jsonObject["compressionThreshold"] != undefined) {
            this.compressionThreshold = Math.max(0.0, Math.min(1.1, jsonObject["compressionThreshold"] || 0));
        }
        else {
            this.compressionThreshold = 1.0;
        }
        if (jsonObject["limitRise"] != undefined) {
            this.limitRise = Math.max(2000.0, Math.min(10000.0, jsonObject["limitRise"] || 0));
        }
        else {
            this.limitRise = 4000.0;
        }
        if (jsonObject["limitDecay"] != undefined) {
            this.limitDecay = Math.max(1.0, Math.min(30.0, jsonObject["limitDecay"] || 0));
        }
        else {
            this.limitDecay = 4.0;
        }
        if (jsonObject["limitRatio"] != undefined) {
            this.limitRatio = Math.max(0.0, Math.min(11.0, jsonObject["limitRatio"] || 0));
        }
        else {
            this.limitRatio = 1.0;
        }
        if (jsonObject["compressionRatio"] != undefined) {
            this.compressionRatio = Math.max(0.0, Math.min(1.168, jsonObject["compressionRatio"] || 0));
        }
        else {
            this.compressionRatio = 1.0;
        }
        if (jsonObject["songEq"] != undefined) {
            this.eqFilter.fromJsonObject(jsonObject["songEq"]);
        }
        else {
            this.eqFilter.reset();
        }
        for (var i_52 = 0; i_52 < SynthConfig_1.Config.filterMorphCount - 1; i_52++) {
            if (jsonObject["songEq" + i_52]) {
                this.eqSubFilters[i_52] = jsonObject["songEq" + i_52];
            }
            else {
                this.eqSubFilters[i_52] = null;
            }
        }
        var maxInstruments = 1;
        var maxPatterns = 1;
        var maxBars = 1;
        if (jsonObject["channels"] != undefined) {
            for (var _c = 0, _d = jsonObject["channels"]; _c < _d.length; _c++) {
                var channelObject = _d[_c];
                if (channelObject["instruments"])
                    maxInstruments = Math.max(maxInstruments, channelObject["instruments"].length | 0);
                if (channelObject["patterns"])
                    maxPatterns = Math.max(maxPatterns, channelObject["patterns"].length | 0);
                if (channelObject["sequence"])
                    maxBars = Math.max(maxBars, channelObject["sequence"].length | 0);
            }
        }
        if (jsonObject["layeredInstruments"] != undefined) {
            this.layeredInstruments = !!jsonObject["layeredInstruments"];
        }
        else {
            this.layeredInstruments = false;
        }
        if (jsonObject["patternInstruments"] != undefined) {
            this.patternInstruments = !!jsonObject["patternInstruments"];
        }
        else {
            this.patternInstruments = (maxInstruments > 1);
        }
        this.patternsPerChannel = Math.min(maxPatterns, SynthConfig_1.Config.barCountMax);
        this.barCount = Math.min(maxBars, SynthConfig_1.Config.barCountMax);
        if (jsonObject["introBars"] != undefined) {
            this.loopStart = clamp(0, this.barCount, jsonObject["introBars"] | 0);
        }
        if (jsonObject["loopBars"] != undefined) {
            this.loopLength = clamp(1, this.barCount - this.loopStart + 1, jsonObject["loopBars"] | 0);
        }
        var newPitchChannels = [];
        var newNoiseChannels = [];
        var newModChannels = [];
        if (jsonObject["channels"] != undefined) {
            for (var channelIndex = 0; channelIndex < jsonObject["channels"].length; channelIndex++) {
                var channelObject = jsonObject["channels"][channelIndex];
                var channel = new Channel();
                var isNoiseChannel = false;
                var isModChannel = false;
                if (channelObject["type"] != undefined) {
                    isNoiseChannel = (channelObject["type"] == "drum");
                    isModChannel = (channelObject["type"] == "mod");
                }
                else {
                    // for older files, assume drums are channel 3.
                    isNoiseChannel = (channelIndex >= 3);
                }
                if (isNoiseChannel) {
                    newNoiseChannels.push(channel);
                }
                else if (isModChannel) {
                    newModChannels.push(channel);
                }
                else {
                    newPitchChannels.push(channel);
                }
                if (channelObject["octaveScrollBar"] != undefined) {
                    channel.octave = clamp(0, SynthConfig_1.Config.pitchOctaves, (channelObject["octaveScrollBar"] | 0) + 1);
                    if (isNoiseChannel)
                        channel.octave = 0;
                }
                if (channelObject["name"] != undefined) {
                    channel.name = channelObject["name"];
                }
                else {
                    channel.name = "";
                }
                if (Array.isArray(channelObject["instruments"])) {
                    var instrumentObjects = channelObject["instruments"];
                    for (var i_53 = 0; i_53 < instrumentObjects.length; i_53++) {
                        if (i_53 >= this.getMaxInstrumentsPerChannel())
                            break;
                        var instrument = new Instrument(isNoiseChannel, isModChannel);
                        channel.instruments[i_53] = instrument;
                        instrument.fromJsonObject(instrumentObjects[i_53], isNoiseChannel, isModChannel, false, false, legacyGlobalReverb, format);
                    }
                }
                for (var i_54 = 0; i_54 < this.patternsPerChannel; i_54++) {
                    var pattern = new Pattern();
                    channel.patterns[i_54] = pattern;
                    var patternObject = undefined;
                    if (channelObject["patterns"])
                        patternObject = channelObject["patterns"][i_54];
                    if (patternObject == undefined)
                        continue;
                    pattern.fromJsonObject(patternObject, this, channel, importedPartsPerBeat, isNoiseChannel, isModChannel, format);
                }
                channel.patterns.length = this.patternsPerChannel;
                for (var i_55 = 0; i_55 < this.barCount; i_55++) {
                    channel.bars[i_55] = (channelObject["sequence"] != undefined) ? Math.min(this.patternsPerChannel, channelObject["sequence"][i_55] >>> 0) : 0;
                }
                channel.bars.length = this.barCount;
            }
        }
        if (newPitchChannels.length > SynthConfig_1.Config.pitchChannelCountMax)
            newPitchChannels.length = SynthConfig_1.Config.pitchChannelCountMax;
        if (newNoiseChannels.length > SynthConfig_1.Config.noiseChannelCountMax)
            newNoiseChannels.length = SynthConfig_1.Config.noiseChannelCountMax;
        if (newModChannels.length > SynthConfig_1.Config.modChannelCountMax)
            newModChannels.length = SynthConfig_1.Config.modChannelCountMax;
        this.pitchChannelCount = newPitchChannels.length;
        this.noiseChannelCount = newNoiseChannels.length;
        this.modChannelCount = newModChannels.length;
        this.channels.length = 0;
        Array.prototype.push.apply(this.channels, newPitchChannels);
        Array.prototype.push.apply(this.channels, newNoiseChannels);
        Array.prototype.push.apply(this.channels, newModChannels);
        if (SynthConfig_1.Config.willReloadForCustomSamples) {
            window.location.hash = this.toBase64String();
            // The prompt seems to get stuck if reloading is done too quickly.
            setTimeout(function () { location.reload(); }, 50);
        }
    };
    Song.prototype.getPattern = function (channelIndex, bar) {
        if (bar < 0 || bar >= this.barCount)
            return null;
        var patternIndex = this.channels[channelIndex].bars[bar];
        if (patternIndex == 0)
            return null;
        return this.channels[channelIndex].patterns[patternIndex - 1];
    };
    Song.prototype.getBeatsPerMinute = function () {
        return this.tempo;
    };
    Song.getNeededBits = function (maxValue) {
        return 32 - Math.clz32(Math.ceil(maxValue + 1) - 1);
    };
    Song.prototype.restoreLimiterDefaults = function () {
        this.compressionRatio = 1.0;
        this.limitRatio = 1.0;
        this.limitRise = 4000.0;
        this.limitDecay = 4.0;
        this.limitThreshold = 1.0;
        this.compressionThreshold = 1.0;
        this.masterGain = 1.0;
    };
    Song._format = SynthConfig_1.Config.jsonFormat;
    Song._oldestBeepboxVersion = 2;
    Song._latestBeepboxVersion = 9;
    Song._oldestJummBoxVersion = 1;
    Song._latestJummBoxVersion = 6;
    Song._oldestGoldBoxVersion = 1;
    Song._latestGoldBoxVersion = 4;
    Song._oldestUltraBoxVersion = 1;
    Song._latestUltraBoxVersion = 5;
    Song._oldestSlarmoosBoxVersion = 1;
    Song._latestSlarmoosBoxVersion = 5;
    Song._oldestJukeBoxVersion = 1;
    Song._latestJukeBoxVersion = 4;
    // One-character variant detection at the start of URL to distinguish variants such as JummBox, Or Goldbox. "j" and "g" respectively
    //also "u" is ultrabox lol
    // private static readonly _variant = 0x73; //"S" - Slarmoo's Box
    Song._variant = 0x4a; //"J" is for JukeBox
    return Song;
}());
exports.Song = Song;
var PickedString = /** @class */ (function () {
    function PickedString() {
        this.delayLine = null;
        this.allPassG = 0.0;
        this.allPassGDelta = 0.0;
        this.sustainFilterA1 = 0.0;
        this.sustainFilterA1Delta = 0.0;
        this.sustainFilterA2 = 0.0;
        this.sustainFilterA2Delta = 0.0;
        this.sustainFilterB0 = 0.0;
        this.sustainFilterB0Delta = 0.0;
        this.sustainFilterB1 = 0.0;
        this.sustainFilterB1Delta = 0.0;
        this.sustainFilterB2 = 0.0;
        this.sustainFilterB2Delta = 0.0;
        this.reset();
    }
    PickedString.prototype.reset = function () {
        this.delayIndex = -1;
        this.allPassSample = 0.0;
        this.allPassPrevInput = 0.0;
        this.sustainFilterSample = 0.0;
        this.sustainFilterPrevOutput2 = 0.0;
        this.sustainFilterPrevInput1 = 0.0;
        this.sustainFilterPrevInput2 = 0.0;
        this.fractionalDelaySample = 0.0;
        this.prevDelayLength = -1.0;
        this.delayResetOffset = 0;
    };
    PickedString.prototype.update = function (synth, instrumentState, tone, stringIndex, roundedSamplesPerTick, stringDecayStart, stringDecayEnd, sustainType) {
        var allPassCenter = 2.0 * Math.PI * SynthConfig_1.Config.pickedStringDispersionCenterFreq / synth.samplesPerSecond;
        var prevDelayLength = this.prevDelayLength;
        var phaseDeltaStart = tone.phaseDeltas[stringIndex];
        var phaseDeltaScale = tone.phaseDeltaScales[stringIndex];
        var phaseDeltaEnd = phaseDeltaStart * Math.pow(phaseDeltaScale, roundedSamplesPerTick);
        var radiansPerSampleStart = Math.PI * 2.0 * phaseDeltaStart;
        var radiansPerSampleEnd = Math.PI * 2.0 * phaseDeltaEnd;
        var centerHarmonicStart = radiansPerSampleStart * 2.0;
        var centerHarmonicEnd = radiansPerSampleEnd * 2.0;
        var allPassRadiansStart = Math.min(Math.PI, radiansPerSampleStart * SynthConfig_1.Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleStart, SynthConfig_1.Config.pickedStringDispersionFreqScale));
        var allPassRadiansEnd = Math.min(Math.PI, radiansPerSampleEnd * SynthConfig_1.Config.pickedStringDispersionFreqMult * Math.pow(allPassCenter / radiansPerSampleEnd, SynthConfig_1.Config.pickedStringDispersionFreqScale));
        var shelfRadians = 2.0 * Math.PI * SynthConfig_1.Config.pickedStringShelfHz / synth.samplesPerSecond;
        var decayCurveStart = (Math.pow(100.0, stringDecayStart) - 1.0) / 99.0;
        var decayCurveEnd = (Math.pow(100.0, stringDecayEnd) - 1.0) / 99.0;
        var register = sustainType == 1 /* SustainType.acoustic */ ? 0.25 : 0.0;
        var registerShelfCenter = 15.6;
        var registerLowpassCenter = 3.0 * synth.samplesPerSecond / 48000;
        //const decayRateStart: number = Math.pow(0.5, decayCurveStart * shelfRadians / radiansPerSampleStart);
        //const decayRateEnd: number   = Math.pow(0.5, decayCurveEnd   * shelfRadians / radiansPerSampleEnd);
        var decayRateStart = Math.pow(0.5, decayCurveStart * Math.pow(shelfRadians / (radiansPerSampleStart * registerShelfCenter), (1.0 + 2.0 * register)) * registerShelfCenter);
        var decayRateEnd = Math.pow(0.5, decayCurveEnd * Math.pow(shelfRadians / (radiansPerSampleEnd * registerShelfCenter), (1.0 + 2.0 * register)) * registerShelfCenter);
        var expressionDecayStart = Math.pow(decayRateStart, 0.002);
        var expressionDecayEnd = Math.pow(decayRateEnd, 0.002);
        Synth.tempFilterStartCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansStart);
        synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart);
        var allPassGStart = Synth.tempFilterStartCoefficients.b[0]; /* same as a[1] */
        var allPassPhaseDelayStart = -synth.tempFrequencyResponse.angle() / centerHarmonicStart;
        Synth.tempFilterEndCoefficients.allPass1stOrderInvertPhaseAbove(allPassRadiansEnd);
        synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd);
        var allPassGEnd = Synth.tempFilterEndCoefficients.b[0]; /* same as a[1] */
        var allPassPhaseDelayEnd = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd;
        var brightnessType = sustainType == 0 /* SustainType.bright */ ? 0 /* PickedStringBrightnessType.bright */ : 1 /* PickedStringBrightnessType.normal */;
        if (brightnessType == 0 /* PickedStringBrightnessType.bright */) {
            var shelfGainStart = Math.pow(decayRateStart, SynthConfig_1.Config.stringDecayRate);
            var shelfGainEnd = Math.pow(decayRateEnd, SynthConfig_1.Config.stringDecayRate);
            Synth.tempFilterStartCoefficients.highShelf2ndOrder(shelfRadians, shelfGainStart, 0.5);
            Synth.tempFilterEndCoefficients.highShelf2ndOrder(shelfRadians, shelfGainEnd, 0.5);
        }
        else {
            var cornerHardness = Math.pow(brightnessType == 1 /* PickedStringBrightnessType.normal */ ? 0.0 : 1.0, 0.25);
            var lowpass1stOrderCutoffRadiansStart = Math.pow(registerLowpassCenter * registerLowpassCenter * radiansPerSampleStart * 3.3 * 48000 / synth.samplesPerSecond, 0.5 + register) / registerLowpassCenter / Math.pow(decayCurveStart, .5);
            var lowpass1stOrderCutoffRadiansEnd = Math.pow(registerLowpassCenter * registerLowpassCenter * radiansPerSampleEnd * 3.3 * 48000 / synth.samplesPerSecond, 0.5 + register) / registerLowpassCenter / Math.pow(decayCurveEnd, .5);
            var lowpass2ndOrderCutoffRadiansStart = lowpass1stOrderCutoffRadiansStart * Math.pow(2.0, 0.5 - 1.75 * (1.0 - Math.pow(1.0 - cornerHardness, 0.85)));
            var lowpass2ndOrderCutoffRadiansEnd = lowpass1stOrderCutoffRadiansEnd * Math.pow(2.0, 0.5 - 1.75 * (1.0 - Math.pow(1.0 - cornerHardness, 0.85)));
            var lowpass2ndOrderGainStart = Math.pow(2.0, -Math.pow(2.0, -Math.pow(cornerHardness, 0.9)));
            var lowpass2ndOrderGainEnd = Math.pow(2.0, -Math.pow(2.0, -Math.pow(cornerHardness, 0.9)));
            Synth.tempFilterStartCoefficients.lowPass2ndOrderButterworth((0, filtering_1.warpInfinityToNyquist)(lowpass2ndOrderCutoffRadiansStart), lowpass2ndOrderGainStart);
            Synth.tempFilterEndCoefficients.lowPass2ndOrderButterworth((0, filtering_1.warpInfinityToNyquist)(lowpass2ndOrderCutoffRadiansEnd), lowpass2ndOrderGainEnd);
        }
        synth.tempFrequencyResponse.analyze(Synth.tempFilterStartCoefficients, centerHarmonicStart);
        var sustainFilterA1Start = Synth.tempFilterStartCoefficients.a[1];
        var sustainFilterA2Start = Synth.tempFilterStartCoefficients.a[2];
        var sustainFilterB0Start = Synth.tempFilterStartCoefficients.b[0] * expressionDecayStart;
        var sustainFilterB1Start = Synth.tempFilterStartCoefficients.b[1] * expressionDecayStart;
        var sustainFilterB2Start = Synth.tempFilterStartCoefficients.b[2] * expressionDecayStart;
        var sustainFilterPhaseDelayStart = -synth.tempFrequencyResponse.angle() / centerHarmonicStart;
        synth.tempFrequencyResponse.analyze(Synth.tempFilterEndCoefficients, centerHarmonicEnd);
        var sustainFilterA1End = Synth.tempFilterEndCoefficients.a[1];
        var sustainFilterA2End = Synth.tempFilterEndCoefficients.a[2];
        var sustainFilterB0End = Synth.tempFilterEndCoefficients.b[0] * expressionDecayEnd;
        var sustainFilterB1End = Synth.tempFilterEndCoefficients.b[1] * expressionDecayEnd;
        var sustainFilterB2End = Synth.tempFilterEndCoefficients.b[2] * expressionDecayEnd;
        var sustainFilterPhaseDelayEnd = -synth.tempFrequencyResponse.angle() / centerHarmonicEnd;
        var periodLengthStart = 1.0 / phaseDeltaStart;
        var periodLengthEnd = 1.0 / phaseDeltaEnd;
        var minBufferLength = Math.ceil(Math.max(periodLengthStart, periodLengthEnd) * 2);
        var delayLength = periodLengthStart - allPassPhaseDelayStart - sustainFilterPhaseDelayStart;
        var delayLengthEnd = periodLengthEnd - allPassPhaseDelayEnd - sustainFilterPhaseDelayEnd;
        this.prevDelayLength = delayLength;
        this.delayLengthDelta = (delayLengthEnd - delayLength) / roundedSamplesPerTick;
        this.allPassG = allPassGStart;
        this.sustainFilterA1 = sustainFilterA1Start;
        this.sustainFilterA2 = sustainFilterA2Start;
        this.sustainFilterB0 = sustainFilterB0Start;
        this.sustainFilterB1 = sustainFilterB1Start;
        this.sustainFilterB2 = sustainFilterB2Start;
        this.allPassGDelta = (allPassGEnd - allPassGStart) / roundedSamplesPerTick;
        this.sustainFilterA1Delta = (sustainFilterA1End - sustainFilterA1Start) / roundedSamplesPerTick;
        this.sustainFilterA2Delta = (sustainFilterA2End - sustainFilterA2Start) / roundedSamplesPerTick;
        this.sustainFilterB0Delta = (sustainFilterB0End - sustainFilterB0Start) / roundedSamplesPerTick;
        this.sustainFilterB1Delta = (sustainFilterB1End - sustainFilterB1Start) / roundedSamplesPerTick;
        this.sustainFilterB2Delta = (sustainFilterB2End - sustainFilterB2Start) / roundedSamplesPerTick;
        var pitchChanged = Math.abs(Math.log2(delayLength / prevDelayLength)) > 0.01;
        var reinitializeImpulse = (this.delayIndex == -1 || pitchChanged);
        if (this.delayLine == null || this.delayLine.length <= minBufferLength) {
            // The delay line buffer will get reused for other tones so might as well
            // start off with a buffer size that is big enough for most notes.
            var likelyMaximumLength = Math.ceil(2 * synth.samplesPerSecond / Instrument.frequencyFromPitch(12));
            var newDelayLine = new Float32Array(Synth.fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength)));
            if (!reinitializeImpulse && this.delayLine != null) {
                // If the tone has already started but the buffer needs to be reallocated,
                // transfer the old data to the new buffer.
                var oldDelayBufferMask = (this.delayLine.length - 1) >> 0;
                var startCopyingFromIndex = this.delayIndex + this.delayResetOffset;
                this.delayIndex = this.delayLine.length - this.delayResetOffset;
                for (var i = 0; i < this.delayLine.length; i++) {
                    newDelayLine[i] = this.delayLine[(startCopyingFromIndex + i) & oldDelayBufferMask];
                }
            }
            this.delayLine = newDelayLine;
        }
        var delayLine = this.delayLine;
        var delayBufferMask = (delayLine.length - 1) >> 0;
        if (reinitializeImpulse) {
            // -1 delay index means the tone was reset.
            // Also, if the pitch changed suddenly (e.g. from seamless or arpeggio) then reset the wave.
            this.delayIndex = 0;
            this.allPassSample = 0.0;
            this.allPassPrevInput = 0.0;
            this.sustainFilterSample = 0.0;
            this.sustainFilterPrevOutput2 = 0.0;
            this.sustainFilterPrevInput1 = 0.0;
            this.sustainFilterPrevInput2 = 0.0;
            this.fractionalDelaySample = 0.0;
            // Clear away a region of the delay buffer for the new impulse.
            var startImpulseFrom = -delayLength;
            var startZerosFrom = Math.floor(startImpulseFrom - periodLengthStart / 2);
            var stopZerosAt = Math.ceil(startZerosFrom + periodLengthStart * 2);
            this.delayResetOffset = stopZerosAt; // And continue clearing the area in front of the delay line.
            for (var i = startZerosFrom; i <= stopZerosAt; i++) {
                delayLine[i & delayBufferMask] = 0.0;
            }
            var impulseWave = instrumentState.wave;
            var impulseWaveLength = impulseWave.length - 1; // The first sample is duplicated at the end, don't double-count it.
            var impulsePhaseDelta = impulseWaveLength / periodLengthStart;
            var fadeDuration = Math.min(periodLengthStart * 0.2, synth.samplesPerSecond * 0.003);
            var startImpulseFromSample = Math.ceil(startImpulseFrom);
            var stopImpulseAt = startImpulseFrom + periodLengthStart + fadeDuration;
            var stopImpulseAtSample = stopImpulseAt;
            var impulsePhase = (startImpulseFromSample - startImpulseFrom) * impulsePhaseDelta;
            var prevWaveIntegral = 0.0;
            for (var i = startImpulseFromSample; i <= stopImpulseAtSample; i++) {
                var impulsePhaseInt = impulsePhase | 0;
                var index = impulsePhaseInt % impulseWaveLength;
                var nextWaveIntegral = impulseWave[index];
                var phaseRatio = impulsePhase - impulsePhaseInt;
                nextWaveIntegral += (impulseWave[index + 1] - nextWaveIntegral) * phaseRatio;
                var sample = (nextWaveIntegral - prevWaveIntegral) / impulsePhaseDelta;
                var fadeIn = Math.min(1.0, (i - startImpulseFrom) / fadeDuration);
                var fadeOut = Math.min(1.0, (stopImpulseAt - i) / fadeDuration);
                var combinedFade = fadeIn * fadeOut;
                var curvedFade = combinedFade * combinedFade * (3.0 - 2.0 * combinedFade); // A cubic sigmoid from 0 to 1.
                delayLine[i & delayBufferMask] += sample * curvedFade;
                prevWaveIntegral = nextWaveIntegral;
                impulsePhase += impulsePhaseDelta;
            }
        }
    };
    return PickedString;
}());
var EnvelopeComputer = /** @class */ (function () {
    function EnvelopeComputer( /*private _perNote: boolean*/) {
        // "Unscaled" values do not increase with Envelope Speed's timescale factor. Thus they are "real" seconds since the start of the note.
        // Fade envelopes notably use unscaled values instead of being tied to Envelope Speed.
        this.noteSecondsStart = [];
        this.noteSecondsStartUnscaled = 0.0;
        this.noteSecondsEnd = [];
        this.noteSecondsEndUnscaled = 0.0;
        this.noteTicksStart = 0.0;
        this.noteTicksEnd = 0.0;
        this.noteSizeStart = SynthConfig_1.Config.noteSizeMax;
        this.noteSizeEnd = SynthConfig_1.Config.noteSizeMax;
        this.prevNoteSize = SynthConfig_1.Config.noteSizeMax;
        this.nextNoteSize = SynthConfig_1.Config.noteSizeMax;
        this._noteSizeFinal = SynthConfig_1.Config.noteSizeMax;
        this.prevNoteSecondsStart = [];
        this.prevNoteSecondsStartUnscaled = 0.0;
        this.prevNoteSecondsEnd = [];
        this.prevNoteSecondsEndUnscaled = 0.0;
        this.prevNoteTicksStart = 0.0;
        this.prevNoteTicksEnd = 0.0;
        this._prevNoteSizeFinal = SynthConfig_1.Config.noteSizeMax;
        this.tickTimeEnd = [];
        this.drumsetFilterEnvelopeStart = 0.0;
        this.drumsetFilterEnvelopeEnd = 0.0;
        this.prevSlideStart = false;
        this.prevSlideEnd = false;
        this.nextSlideStart = false;
        this.nextSlideEnd = false;
        this.prevSlideRatioStart = 0.0;
        this.prevSlideRatioEnd = 0.0;
        this.nextSlideRatioStart = 0.0;
        this.nextSlideRatioEnd = 0.0;
        this.startPinTickAbsolute = null;
        this.startPinTickDefaultPitch = null;
        this.startPinTickPitch = null;
        this.envelopeStarts = [];
        this.envelopeEnds = [];
        this._modifiedEnvelopeIndices = [];
        this._modifiedEnvelopeCount = 0;
        this.lowpassCutoffDecayVolumeCompensation = 1.0;
        //const length: number = this._perNote ? EnvelopeComputeIndex.length : InstrumentAutomationIndex.length;
        var length = 61 /* EnvelopeComputeIndex.length */;
        for (var i = 0; i < length; i++) {
            this.envelopeStarts[i] = 1.0;
            this.envelopeEnds[i] = 1.0;
        }
        this.reset();
    }
    EnvelopeComputer.prototype.reset = function () {
        for (var envelopeIndex = 0; envelopeIndex < SynthConfig_1.Config.maxEnvelopeCount + 1; envelopeIndex++) {
            this.noteSecondsEnd[envelopeIndex] = 0.0;
            this.prevNoteSecondsEnd[envelopeIndex] = 0.0;
        }
        this.noteSecondsEndUnscaled = 0.0;
        this.noteTicksEnd = 0.0;
        this._noteSizeFinal = SynthConfig_1.Config.noteSizeMax;
        this.prevNoteSecondsEndUnscaled = 0.0;
        this.prevNoteTicksEnd = 0.0;
        this._prevNoteSizeFinal = SynthConfig_1.Config.noteSizeMax;
        this._modifiedEnvelopeCount = 0;
        this.drumsetFilterEnvelopeStart = 0.0;
        this.drumsetFilterEnvelopeEnd = 0.0;
        this.startPinTickAbsolute = null;
        this.startPinTickDefaultPitch = null;
        this.startPinTickPitch = null;
    };
    EnvelopeComputer.prototype.computeEnvelopes = function (instrument, currentPart, tickTimeStart, tickTimeStartReal, secondsPerTick, tone, timeScale, instrumentState, synth, channelIndex, instrumentIndex, perNote) {
        var secondsPerTickUnscaled = secondsPerTick;
        var transition = instrument.getTransition();
        if (tone != null && tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
            this.prevNoteSecondsEndUnscaled = this.noteSecondsEndUnscaled;
            this.prevNoteTicksEnd = this.noteTicksEnd;
            this._prevNoteSizeFinal = this._noteSizeFinal;
            this.noteSecondsEndUnscaled = 0.0;
            this.noteTicksEnd = 0.0;
            for (var envelopeIndex = 0; envelopeIndex < SynthConfig_1.Config.maxEnvelopeCount + 1; envelopeIndex++) {
                this.prevNoteSecondsEnd[envelopeIndex] = this.noteSecondsEnd[envelopeIndex];
                this.noteSecondsEnd[envelopeIndex] = 0.0;
            }
        }
        if (tone != null) {
            if (tone.note != null) {
                this._noteSizeFinal = tone.note.pins[tone.note.pins.length - 1].size;
            }
            else {
                this._noteSizeFinal = SynthConfig_1.Config.noteSizeMax;
            }
        }
        var tickTimeEnd = [];
        var tickTimeEndReal = tickTimeStartReal + 1.0;
        var noteSecondsStart = [];
        var noteSecondsStartUnscaled = this.noteSecondsEndUnscaled;
        var noteSecondsEnd = [];
        var noteSecondsEndUnscaled = noteSecondsStartUnscaled + secondsPerTickUnscaled;
        var noteTicksStart = this.noteTicksEnd;
        var noteTicksEnd = noteTicksStart + 1.0;
        var prevNoteSecondsStart = [];
        var prevNoteSecondsEnd = [];
        var prevNoteSecondsStartUnscaled = this.prevNoteSecondsEndUnscaled;
        var prevNoteSecondsEndUnscaled = prevNoteSecondsStartUnscaled + secondsPerTickUnscaled;
        var prevNoteTicksStart = this.prevNoteTicksEnd;
        var prevNoteTicksEnd = prevNoteTicksStart + 1.0;
        var beatsPerTick = 1.0 / (SynthConfig_1.Config.ticksPerPart * SynthConfig_1.Config.partsPerBeat);
        var beatTimeStart = [];
        var beatTimeEnd = [];
        var noteSizeStart = this._noteSizeFinal;
        var noteSizeEnd = this._noteSizeFinal;
        var prevNoteSize = this._prevNoteSizeFinal;
        var nextNoteSize = 0;
        var prevSlideStart = false;
        var prevSlideEnd = false;
        var nextSlideStart = false;
        var nextSlideEnd = false;
        var prevSlideRatioStart = 0.0;
        var prevSlideRatioEnd = 0.0;
        var nextSlideRatioStart = 0.0;
        var nextSlideRatioEnd = 0.0;
        if (tone == null) {
            this.startPinTickAbsolute = null;
            this.startPinTickDefaultPitch = null;
        }
        if (tone != null && tone.note != null && !tone.passedEndOfNote) {
            var endPinIndex = tone.note.getEndPinIndex(currentPart);
            var startPin = tone.note.pins[endPinIndex - 1];
            var endPin = tone.note.pins[endPinIndex];
            var startPinTick = (tone.note.start + startPin.time) * SynthConfig_1.Config.ticksPerPart;
            if (this.startPinTickAbsolute == null || (!(transition.continues || transition.slides)) && tone.passedEndOfNote)
                this.startPinTickAbsolute = startPinTick + synth.computeTicksSinceStart(true); //for random per note
            if (this.startPinTickDefaultPitch == null || /* (!(transition.continues || transition.slides)) &&*/ tone.passedEndOfNote)
                this.startPinTickDefaultPitch = this.getPitchValue(instrument, tone, instrumentState, false);
            if (!tone.passedEndOfNote)
                this.startPinTickPitch = this.getPitchValue(instrument, tone, instrumentState, true);
            var endPinTick = (tone.note.start + endPin.time) * SynthConfig_1.Config.ticksPerPart;
            var ratioStart = (tickTimeStartReal - startPinTick) / (endPinTick - startPinTick);
            var ratioEnd = (tickTimeEndReal - startPinTick) / (endPinTick - startPinTick);
            noteSizeStart = startPin.size + (endPin.size - startPin.size) * ratioStart;
            noteSizeEnd = startPin.size + (endPin.size - startPin.size) * ratioEnd;
            if (transition.slides) {
                var noteStartTick = tone.noteStartPart * SynthConfig_1.Config.ticksPerPart;
                var noteEndTick = tone.noteEndPart * SynthConfig_1.Config.ticksPerPart;
                var noteLengthTicks = noteEndTick - noteStartTick;
                var maximumSlideTicks = noteLengthTicks * 0.5;
                var slideTicks = Math.min(maximumSlideTicks, transition.slideTicks);
                if (tone.prevNote != null && !tone.forceContinueAtStart) {
                    if (tickTimeStartReal - noteStartTick < slideTicks) {
                        prevSlideStart = true;
                        prevSlideRatioStart = 0.5 * (1.0 - (tickTimeStartReal - noteStartTick) / slideTicks);
                    }
                    if (tickTimeEndReal - noteStartTick < slideTicks) {
                        prevSlideEnd = true;
                        prevSlideRatioEnd = 0.5 * (1.0 - (tickTimeEndReal - noteStartTick) / slideTicks);
                    }
                }
                if (tone.nextNote != null && !tone.forceContinueAtEnd) {
                    nextNoteSize = tone.nextNote.pins[0].size;
                    if (noteEndTick - tickTimeStartReal < slideTicks) {
                        nextSlideStart = true;
                        nextSlideRatioStart = 0.5 * (1.0 - (noteEndTick - tickTimeStartReal) / slideTicks);
                    }
                    if (noteEndTick - tickTimeEndReal < slideTicks) {
                        nextSlideEnd = true;
                        nextSlideRatioEnd = 0.5 * (1.0 - (noteEndTick - tickTimeEndReal) / slideTicks);
                    }
                }
            }
        }
        var lowpassCutoffDecayVolumeCompensation = 1.0;
        var usedNoteSize = false;
        for (var envelopeIndex = 0; envelopeIndex <= instrument.envelopeCount; envelopeIndex++) {
            var automationTarget = void 0;
            var targetIndex = void 0;
            var envelope = void 0;
            var inverse = false;
            var isDiscrete = false;
            var perEnvelopeSpeed = 1;
            var globalEnvelopeSpeed = 1;
            var envelopeSpeed = perEnvelopeSpeed * globalEnvelopeSpeed;
            var perEnvelopeLowerBound = 0;
            var perEnvelopeUpperBound = 1;
            var timeSinceStart = 0;
            var steps = 2;
            var seed = 2;
            var waveform = 0 /* LFOEnvelopeTypes.sine */;
            var startPinTickAbsolute = this.startPinTickAbsolute || 0.0;
            var defaultPitch = this.startPinTickDefaultPitch || 0.0;
            if (envelopeIndex == instrument.envelopeCount) {
                if (usedNoteSize /*|| !this._perNote*/)
                    break;
                // Special case: if no other envelopes used note size, default to applying it to note volume.
                automationTarget = SynthConfig_1.Config.instrumentAutomationTargets.dictionary["noteVolume"];
                targetIndex = 0;
                envelope = SynthConfig_1.Config.newEnvelopes.dictionary["note size"];
            }
            else {
                var envelopeSettings = instrument.envelopes[envelopeIndex];
                automationTarget = SynthConfig_1.Config.instrumentAutomationTargets[envelopeSettings.target];
                targetIndex = envelopeSettings.index;
                envelope = SynthConfig_1.Config.newEnvelopes[envelopeSettings.envelope];
                inverse = instrument.envelopes[envelopeIndex].inverse;
                isDiscrete = instrument.envelopes[envelopeIndex].discrete;
                perEnvelopeSpeed = instrument.envelopes[envelopeIndex].perEnvelopeSpeed;
                globalEnvelopeSpeed = Math.pow(instrument.envelopeSpeed, 2) / 144;
                envelopeSpeed = perEnvelopeSpeed * globalEnvelopeSpeed;
                perEnvelopeLowerBound = instrument.envelopes[envelopeIndex].perEnvelopeLowerBound;
                perEnvelopeUpperBound = instrument.envelopes[envelopeIndex].perEnvelopeUpperBound;
                if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["individual envelope lower bound"].index, channelIndex, instrumentIndex) && instrument.envelopes[envelopeIndex].tempEnvelopeLowerBound != null) { //modulation
                    perEnvelopeLowerBound = instrument.envelopes[envelopeIndex].tempEnvelopeLowerBound;
                }
                if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["individual envelope upper bound"].index, channelIndex, instrumentIndex) && instrument.envelopes[envelopeIndex].tempEnvelopeUpperBound != null) { //modulation
                    perEnvelopeUpperBound = instrument.envelopes[envelopeIndex].tempEnvelopeUpperBound;
                }
                if (!(perEnvelopeLowerBound <= perEnvelopeUpperBound)) { //reset bounds if incorrect
                    perEnvelopeLowerBound = 0;
                    perEnvelopeUpperBound = 1;
                }
                timeSinceStart = synth.computeTicksSinceStart();
                steps = instrument.envelopes[envelopeIndex].steps;
                seed = instrument.envelopes[envelopeIndex].seed;
                if (instrument.envelopes[envelopeIndex].waveform >= (envelope.name == "lfo" ? 7 /* LFOEnvelopeTypes.length */ : 4 /* RandomEnvelopeTypes.length */)) {
                    instrument.envelopes[envelopeIndex].waveform = 0; //make sure that waveform is a proper index
                }
                waveform = instrument.envelopes[envelopeIndex].waveform;
                if (!timeScale[envelopeIndex])
                    timeScale[envelopeIndex] = 0;
                var secondsPerTickScaled = secondsPerTick * timeScale[envelopeIndex];
                if (!tickTimeStart[envelopeIndex])
                    tickTimeStart[envelopeIndex] = 0; //prevents tremolos from causing a NaN width error
                tickTimeEnd[envelopeIndex] = tickTimeStart[envelopeIndex] ? tickTimeStart[envelopeIndex] + timeScale[envelopeIndex] : timeScale[envelopeIndex];
                noteSecondsStart[envelopeIndex] = this.noteSecondsEnd[envelopeIndex] ? this.noteSecondsEnd[envelopeIndex] : 0;
                prevNoteSecondsStart[envelopeIndex] = this.prevNoteSecondsEnd[envelopeIndex] ? this.prevNoteSecondsEnd[envelopeIndex] : 0;
                noteSecondsEnd[envelopeIndex] = noteSecondsStart[envelopeIndex] ? noteSecondsStart[envelopeIndex] + secondsPerTickScaled : secondsPerTickScaled;
                prevNoteSecondsEnd[envelopeIndex] = prevNoteSecondsStart[envelopeIndex] ? prevNoteSecondsStart[envelopeIndex] + secondsPerTickScaled : secondsPerTickScaled;
                beatTimeStart[envelopeIndex] = tickTimeStart[envelopeIndex] ? beatsPerTick * tickTimeStart[envelopeIndex] : beatsPerTick;
                beatTimeEnd[envelopeIndex] = tickTimeEnd[envelopeIndex] ? beatsPerTick * tickTimeEnd[envelopeIndex] : beatsPerTick;
                if (envelope.type == 1 /* EnvelopeType.noteSize */)
                    usedNoteSize = true;
            }
            //only calculate pitch if needed
            var pitch = (envelope.type == 2 /* EnvelopeType.pitch */) ? this.computePitchEnvelope(instrument, envelopeIndex, (this.startPinTickPitch || this.getPitchValue(instrument, tone, instrumentState, true))) : 0;
            //calculate envelope values if target isn't null or part of the other envelope computer's job
            if (automationTarget.computeIndex != null && automationTarget.perNote == perNote) {
                var computeIndex = automationTarget.computeIndex + targetIndex;
                var envelopeStart = EnvelopeComputer.computeEnvelope(envelope, envelopeSpeed, globalEnvelopeSpeed, noteSecondsStartUnscaled, noteSecondsStart[envelopeIndex], beatTimeStart[envelopeIndex], timeSinceStart, noteSizeStart, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, false, steps, seed, waveform, defaultPitch, startPinTickAbsolute);
                if (prevSlideStart) {
                    var other = EnvelopeComputer.computeEnvelope(envelope, envelopeSpeed, globalEnvelopeSpeed, prevNoteSecondsStartUnscaled, prevNoteSecondsStart[envelopeIndex], beatTimeStart[envelopeIndex], timeSinceStart, prevNoteSize, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, false, steps, seed, waveform, defaultPitch, startPinTickAbsolute);
                    envelopeStart += (other - envelopeStart) * prevSlideRatioStart;
                }
                if (nextSlideStart) {
                    var other = EnvelopeComputer.computeEnvelope(envelope, envelopeSpeed, globalEnvelopeSpeed, 0.0, 0.0, beatTimeStart[envelopeIndex], timeSinceStart, nextNoteSize, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, false, steps, seed, waveform, defaultPitch, startPinTickAbsolute);
                    envelopeStart += (other - envelopeStart) * nextSlideRatioStart;
                }
                var envelopeEnd = envelopeStart;
                if (isDiscrete == false) {
                    envelopeEnd = EnvelopeComputer.computeEnvelope(envelope, envelopeSpeed, globalEnvelopeSpeed, noteSecondsEndUnscaled, noteSecondsEnd[envelopeIndex], beatTimeEnd[envelopeIndex], timeSinceStart, noteSizeEnd, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, false, steps, seed, waveform, defaultPitch, startPinTickAbsolute);
                    if (prevSlideEnd) {
                        var other = EnvelopeComputer.computeEnvelope(envelope, envelopeSpeed, globalEnvelopeSpeed, prevNoteSecondsEndUnscaled, prevNoteSecondsEnd[envelopeIndex], beatTimeEnd[envelopeIndex], timeSinceStart, prevNoteSize, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, false, steps, seed, waveform, defaultPitch, startPinTickAbsolute);
                        envelopeEnd += (other - envelopeEnd) * prevSlideRatioEnd;
                    }
                    if (nextSlideEnd) {
                        var other = EnvelopeComputer.computeEnvelope(envelope, envelopeSpeed, globalEnvelopeSpeed, 0.0, 0.0, beatTimeEnd[envelopeIndex], timeSinceStart, nextNoteSize, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, false, steps, seed, waveform, defaultPitch, startPinTickAbsolute);
                        envelopeEnd += (other - envelopeEnd) * nextSlideRatioEnd;
                    }
                }
                this.envelopeStarts[computeIndex] *= envelopeStart;
                this.envelopeEnds[computeIndex] *= envelopeEnd;
                this._modifiedEnvelopeIndices[this._modifiedEnvelopeCount++] = computeIndex;
                if (automationTarget.isFilter) {
                    var filterSettings = /*this._perNote ?*/ (instrument.tmpNoteFilterStart != null) ? instrument.tmpNoteFilterStart : instrument.noteFilter /*: instrument.eqFilter*/;
                    if (filterSettings.controlPointCount > targetIndex && filterSettings.controlPoints[targetIndex].type == 0 /* FilterType.lowPass */) {
                        lowpassCutoffDecayVolumeCompensation = Math.max(lowpassCutoffDecayVolumeCompensation, EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(envelope, perEnvelopeSpeed));
                    }
                }
            }
        }
        this.noteSecondsStartUnscaled = noteSecondsStartUnscaled;
        this.noteSecondsEndUnscaled = noteSecondsEndUnscaled;
        this.noteTicksStart = noteTicksStart;
        this.noteTicksEnd = noteTicksEnd;
        this.prevNoteSecondsStartUnscaled = prevNoteSecondsStartUnscaled;
        this.prevNoteSecondsEndUnscaled = prevNoteSecondsEndUnscaled;
        this.prevNoteTicksStart = prevNoteTicksStart;
        this.prevNoteTicksEnd = prevNoteTicksEnd;
        for (var envelopeIndex = 0; envelopeIndex < SynthConfig_1.Config.maxEnvelopeCount + 1; envelopeIndex++) {
            this.noteSecondsStart[envelopeIndex] = noteSecondsStart[envelopeIndex];
            this.noteSecondsEnd[envelopeIndex] = noteSecondsEnd[envelopeIndex];
            this.prevNoteSecondsStart[envelopeIndex] = prevNoteSecondsStart[envelopeIndex];
            this.prevNoteSecondsEnd[envelopeIndex] = prevNoteSecondsEnd[envelopeIndex];
        }
        this.prevNoteSize = prevNoteSize;
        this.nextNoteSize = nextNoteSize;
        this.noteSizeStart = noteSizeStart;
        this.noteSizeEnd = noteSizeEnd;
        this.prevSlideStart = prevSlideStart;
        this.prevSlideEnd = prevSlideEnd;
        this.nextSlideStart = nextSlideStart;
        this.nextSlideEnd = nextSlideEnd;
        this.prevSlideRatioStart = prevSlideRatioStart;
        this.prevSlideRatioEnd = prevSlideRatioEnd;
        this.nextSlideRatioStart = nextSlideRatioStart;
        this.nextSlideRatioEnd = nextSlideRatioEnd;
        this.lowpassCutoffDecayVolumeCompensation = lowpassCutoffDecayVolumeCompensation;
    };
    EnvelopeComputer.prototype.clearEnvelopes = function () {
        for (var envelopeIndex = 0; envelopeIndex < this._modifiedEnvelopeCount; envelopeIndex++) {
            var computeIndex = this._modifiedEnvelopeIndices[envelopeIndex];
            this.envelopeStarts[computeIndex] = 1.0;
            this.envelopeEnds[computeIndex] = 1.0;
        }
        this._modifiedEnvelopeCount = 0;
    };
    EnvelopeComputer.computeEnvelope = function (envelope, perEnvelopeSpeed, globalEnvelopeSpeed, unspedTime, time, beats, timeSinceStart, noteSize, pitch, inverse, perEnvelopeLowerBound, perEnvelopeUpperBound, isDrumset, steps, seed, waveform, defaultPitch, notePinStart) {
        if (isDrumset === void 0) { isDrumset = false; }
        var envelopeSpeed = isDrumset ? envelope.speed : 1;
        var boundAdjust = (perEnvelopeUpperBound - perEnvelopeLowerBound);
        switch (envelope.type) {
            case 0 /* EnvelopeType.none */: return perEnvelopeUpperBound;
            case 1 /* EnvelopeType.noteSize */:
                if (!inverse) {
                    return Synth.noteSizeToVolumeMult(noteSize) * (boundAdjust) + perEnvelopeLowerBound;
                }
                else {
                    return perEnvelopeUpperBound - Synth.noteSizeToVolumeMult(noteSize) * (boundAdjust);
                }
            case 2 /* EnvelopeType.pitch */:
                //inversion and bounds are handled in the pitch calculation that we did prior
                return pitch;
            case 3 /* EnvelopeType.pseudorandom */:
                //randomization is essentially just a complex hashing function which appears random to us, but is repeatable every time
                //we can use either the time passed from the beginning of our song or the pitch of the note for what we hash
                var hashMax = 0xffffffff;
                var step = steps;
                switch (waveform) {
                    case 0 /* RandomEnvelopeTypes.time */:
                        if (step <= 1)
                            return 1;
                        var timeHash = (0, js_xxhash_1.xxHash32)((perEnvelopeSpeed == 0 ? 0 : Math.floor((timeSinceStart * perEnvelopeSpeed) / (256))) + "", seed);
                        if (inverse) {
                            return perEnvelopeUpperBound - boundAdjust * (step / (step - 1)) * Math.floor(timeHash * step / (hashMax + 1)) / step;
                        }
                        else {
                            return boundAdjust * (step / (step - 1)) * Math.floor(timeHash * (step) / (hashMax + 1)) / step + perEnvelopeLowerBound;
                        }
                    case 1 /* RandomEnvelopeTypes.pitch */:
                        var pitchHash = (0, js_xxhash_1.xxHash32)(defaultPitch + "", seed);
                        if (inverse) {
                            return perEnvelopeUpperBound - boundAdjust * pitchHash / (hashMax + 1);
                        }
                        else {
                            return boundAdjust * pitchHash / (hashMax + 1) + perEnvelopeLowerBound;
                        }
                    case 2 /* RandomEnvelopeTypes.note */:
                        if (step <= 1)
                            return 1;
                        var noteHash = (0, js_xxhash_1.xxHash32)(notePinStart + "", seed);
                        if (inverse) {
                            return perEnvelopeUpperBound - boundAdjust * (step / (step - 1)) * Math.floor(noteHash * step / (hashMax + 1)) / step;
                        }
                        else {
                            return boundAdjust * (step / (step - 1)) * Math.floor(noteHash * (step) / (hashMax + 1)) / step + perEnvelopeLowerBound;
                        }
                    case 3 /* RandomEnvelopeTypes.timeSmooth */:
                        var timeHashA = (0, js_xxhash_1.xxHash32)((perEnvelopeSpeed == 0 ? 0 : Math.floor((timeSinceStart * perEnvelopeSpeed) / (256))) + "", seed);
                        var timeHashB = (0, js_xxhash_1.xxHash32)((perEnvelopeSpeed == 0 ? 0 : Math.floor((timeSinceStart * perEnvelopeSpeed + 256) / (256))) + "", seed);
                        var weightedAverage = timeHashA * (1 - ((timeSinceStart * perEnvelopeSpeed) / (256)) % 1) + timeHashB * (((timeSinceStart * perEnvelopeSpeed) / (256)) % 1);
                        if (inverse) {
                            return perEnvelopeUpperBound - boundAdjust * weightedAverage / (hashMax + 1);
                        }
                        else {
                            return boundAdjust * weightedAverage / (hashMax + 1) + perEnvelopeLowerBound;
                        }
                    default: throw new Error("Unrecognized operator envelope waveform type: " + waveform);
                }
            case 6 /* EnvelopeType.twang */:
                if (inverse) {
                    return perEnvelopeUpperBound - boundAdjust * (1.0 / (1.0 + time * envelopeSpeed));
                }
                else {
                    return boundAdjust / (1.0 + time * envelopeSpeed) + perEnvelopeLowerBound;
                }
            case 7 /* EnvelopeType.swell */:
                if (inverse) {
                    return boundAdjust / (1.0 + time * envelopeSpeed) + perEnvelopeLowerBound; //swell is twang's inverse... I wonder if it would be worth it to just merge the two :/
                }
                else {
                    return perEnvelopeUpperBound - boundAdjust / (1.0 + time * envelopeSpeed);
                }
            case 8 /* EnvelopeType.lfo */:
                switch (waveform) {
                    case 0 /* LFOEnvelopeTypes.sine */:
                        if (inverse) {
                            return (perEnvelopeUpperBound / 2) + boundAdjust * Math.cos(beats * 2.0 * Math.PI * envelopeSpeed) * 0.5 + (perEnvelopeLowerBound / 2);
                        }
                        else {
                            return (perEnvelopeUpperBound / 2) - boundAdjust * Math.cos(beats * 2.0 * Math.PI * envelopeSpeed) * 0.5 + (perEnvelopeLowerBound / 2);
                        }
                    case 1 /* LFOEnvelopeTypes.square */:
                        if (inverse) {
                            return (Math.cos(beats * 2.0 * Math.PI * envelopeSpeed + 3 * Math.PI / 2) < 0) ? perEnvelopeUpperBound : perEnvelopeLowerBound;
                        }
                        else {
                            return (Math.cos(beats * 2.0 * Math.PI * envelopeSpeed + 3 * Math.PI / 2) < 0) ? perEnvelopeLowerBound : perEnvelopeUpperBound;
                        }
                    case 2 /* LFOEnvelopeTypes.triangle */:
                        if (inverse) {
                            return (perEnvelopeUpperBound / 2) - (boundAdjust / Math.PI) * Math.asin(Math.sin((Math.PI / 2) + beats * Math.PI * 2.0 * envelopeSpeed)) + (perEnvelopeLowerBound / 2);
                        }
                        else {
                            return (perEnvelopeUpperBound / 2) + (boundAdjust / Math.PI) * Math.asin(Math.sin((Math.PI / 2) + beats * Math.PI * 2.0 * envelopeSpeed)) + (perEnvelopeLowerBound / 2);
                        }
                    case 3 /* LFOEnvelopeTypes.sawtooth */:
                        if (inverse) {
                            return perEnvelopeUpperBound - (beats * envelopeSpeed) % 1 * boundAdjust;
                        }
                        else {
                            return (beats * envelopeSpeed) % 1 * boundAdjust + perEnvelopeLowerBound;
                        }
                    case 4 /* LFOEnvelopeTypes.trapezoid */:
                        var trap = 0;
                        if (inverse) {
                            trap = (perEnvelopeUpperBound / 2) - (boundAdjust * 2 / Math.PI) * Math.asin(Math.sin((Math.PI / 2) + beats * Math.PI * 2.0 * envelopeSpeed)) + (perEnvelopeLowerBound / 2);
                        }
                        else {
                            trap = (perEnvelopeUpperBound / 2) + (boundAdjust * 2 / Math.PI) * Math.asin(Math.sin((Math.PI / 2) + beats * Math.PI * 2.0 * envelopeSpeed)) + (perEnvelopeLowerBound / 2);
                        }
                        return Math.max(perEnvelopeLowerBound, Math.min(perEnvelopeUpperBound, trap));
                    case 5 /* LFOEnvelopeTypes.steppedSaw */:
                        if (steps <= 1)
                            return 1;
                        var saw = (beats * envelopeSpeed) % 1;
                        if (inverse) {
                            return perEnvelopeUpperBound - Math.floor(saw * steps) * boundAdjust / (steps - 1);
                        }
                        else {
                            return Math.floor(saw * steps) * boundAdjust / (steps - 1) + perEnvelopeLowerBound;
                        }
                    case 6 /* LFOEnvelopeTypes.steppedTri */:
                        if (steps <= 1)
                            return 1;
                        var tri = 0.5 + (inverse ? -1 : 1) * (1 / Math.PI) * Math.asin(Math.sin((Math.PI / 2) + beats * Math.PI * 2.0 * envelopeSpeed));
                        return Math.round(tri * (steps - 1)) * boundAdjust / (steps - 1) + perEnvelopeLowerBound;
                    default: throw new Error("Unrecognized operator envelope waveform type: " + waveform);
                }
            case 9 /* EnvelopeType.tremolo2 */: //kept only for drumsets right now
                if (inverse) {
                    return (perEnvelopeUpperBound / 4) + boundAdjust * Math.cos(beats * 2.0 * Math.PI * envelopeSpeed) * 0.25 + (perEnvelopeLowerBound / 4); //inverse works strangely with tremolo2. If I ever update this I'll need to turn all current versions into tremolo with bounds
                }
                else {
                    return 0.5 + (perEnvelopeUpperBound / 4) - boundAdjust * Math.cos(beats * 2.0 * Math.PI * envelopeSpeed) * 0.25 - (perEnvelopeLowerBound / 4);
                }
            case 4 /* EnvelopeType.punch */:
                if (inverse) {
                    return Math.max(0, perEnvelopeUpperBound + 1.0 - Math.max(1.0 - perEnvelopeLowerBound, 1.0 - perEnvelopeUpperBound - unspedTime * globalEnvelopeSpeed * 10.0)); //punch special case: 2- instead of 1-
                }
                else {
                    return Math.max(1.0 + perEnvelopeLowerBound, 1.0 + perEnvelopeUpperBound - unspedTime * globalEnvelopeSpeed * 10.0); //punch only uses global envelope speed
                }
            case 5 /* EnvelopeType.flare */:
                var attack = 0.25 / Math.sqrt(envelopeSpeed * perEnvelopeSpeed); //flare and blip need to be handled a little differently with envelope speeds. I have to use the old system
                if (inverse) {
                    return perEnvelopeUpperBound - boundAdjust * (unspedTime < attack ? unspedTime / attack : 1.0 / (1.0 + (unspedTime - attack) * envelopeSpeed * perEnvelopeSpeed));
                }
                else {
                    return boundAdjust * (unspedTime < attack ? unspedTime / attack : 1.0 / (1.0 + (unspedTime - attack) * envelopeSpeed * perEnvelopeSpeed)) + perEnvelopeLowerBound;
                }
            case 10 /* EnvelopeType.decay */:
                if (inverse) {
                    return perEnvelopeUpperBound - boundAdjust * Math.pow(2, -envelopeSpeed * time);
                }
                else {
                    return boundAdjust * Math.pow(2, -envelopeSpeed * time) + perEnvelopeLowerBound;
                }
            case 14 /* EnvelopeType.blip */:
                if (inverse) {
                    return perEnvelopeUpperBound - boundAdjust * +(unspedTime < (0.25 / Math.sqrt(envelopeSpeed * perEnvelopeSpeed)));
                }
                else {
                    return boundAdjust * +(unspedTime < (0.25 / Math.sqrt(envelopeSpeed * perEnvelopeSpeed))) + perEnvelopeLowerBound;
                }
            case 11 /* EnvelopeType.wibble */:
                var temp = 0.5 - Math.cos(beats * envelopeSpeed) * 0.5;
                temp = 1.0 / (1.0 + time * (envelopeSpeed - (temp / (1.5 / envelopeSpeed))));
                temp = temp > 0.0 ? temp : 0.0;
                if (inverse) {
                    return perEnvelopeUpperBound - boundAdjust * temp;
                }
                else {
                    return boundAdjust * temp + perEnvelopeLowerBound;
                }
            case 12 /* EnvelopeType.linear */: {
                var lin = (1.0 - (time / (16 / envelopeSpeed)));
                lin = lin > 0.0 ? lin : 0.0;
                if (inverse) { //another case where linear's inverse is rise. Do I merge them?
                    return perEnvelopeUpperBound - boundAdjust * lin;
                }
                else {
                    return boundAdjust * lin + perEnvelopeLowerBound;
                }
            }
            case 13 /* EnvelopeType.rise */: {
                var lin = (time / (16 / envelopeSpeed));
                lin = lin < 1.0 ? lin : 1.0;
                if (inverse) {
                    return perEnvelopeUpperBound - boundAdjust * lin;
                }
                else {
                    return boundAdjust * lin + perEnvelopeLowerBound;
                }
            }
            case 15 /* EnvelopeType.fall */: {
                if (inverse) {
                    return Math.min(Math.max(perEnvelopeLowerBound, perEnvelopeUpperBound - boundAdjust * Math.sqrt(Math.max(1.0 - envelopeSpeed * time / 2, 0))), perEnvelopeUpperBound);
                }
                else {
                    return Math.max(perEnvelopeLowerBound, boundAdjust * Math.sqrt(Math.max(1.0 - envelopeSpeed * time / 2, 0)) + perEnvelopeLowerBound);
                }
            }
            default: throw new Error("Unrecognized operator envelope type.");
        }
    };
    EnvelopeComputer.prototype.getPitchValue = function (instrument, tone, instrumentState, calculateBends) {
        if (calculateBends === void 0) { calculateBends = true; }
        if (tone && tone.pitchCount >= 1) {
            var chord = instrument.getChord();
            var arpeggiates = chord.arpeggiates;
            var monophonic = chord.name == "monophonic";
            var arpeggio = Math.floor(instrumentState.arpTime / SynthConfig_1.Config.ticksPerArpeggio); //calculate arpeggiation
            var tonePitch = tone.pitches[arpeggiates ? (0, SynthConfig_1.getArpeggioPitchIndex)(tone.pitchCount, instrument.fastTwoNoteArp, arpeggio) : monophonic ? instrument.monoChordTone : 0];
            if (calculateBends) {
                return tone.lastInterval != tonePitch ? tonePitch + tone.lastInterval : tonePitch; //account for pitch bends
            }
            else {
                return tonePitch;
            }
        }
        return 0;
    };
    EnvelopeComputer.prototype.computePitchEnvelope = function (instrument, index, pitch) {
        if (pitch === void 0) { pitch = 0; }
        var startNote = 0;
        var endNote = SynthConfig_1.Config.maxPitch;
        var inverse = false;
        var envelopeLowerBound = 0;
        var envelopeUpperBound = 1;
        if (instrument.isNoiseInstrument) {
            endNote = SynthConfig_1.Config.drumCount - 1;
        }
        if (index < instrument.envelopeCount && index !== -2) {
            startNote = instrument.envelopes[index].pitchEnvelopeStart;
            endNote = instrument.envelopes[index].pitchEnvelopeEnd;
            inverse = instrument.envelopes[index].inverse;
            envelopeLowerBound = instrument.envelopes[index].perEnvelopeLowerBound;
            envelopeUpperBound = instrument.envelopes[index].perEnvelopeUpperBound;
        }
        if (startNote > endNote) { //Reset if values are improper
            startNote = 0;
            endNote = instrument.isNoiseInstrument ? SynthConfig_1.Config.drumCount - 1 : SynthConfig_1.Config.maxPitch;
        }
        var range = endNote - startNote + 1;
        if (!inverse) {
            if (pitch <= startNote) {
                return envelopeLowerBound;
            }
            else if (pitch >= endNote) {
                return envelopeUpperBound;
            }
            else {
                return (pitch - startNote) * (envelopeUpperBound - envelopeLowerBound) / range + envelopeLowerBound;
            }
        }
        else {
            if (pitch <= startNote) {
                return envelopeUpperBound;
            }
            else if (pitch >= endNote) {
                return envelopeLowerBound;
            }
            else {
                return envelopeUpperBound - (pitch - startNote) * (envelopeUpperBound - envelopeLowerBound) / range;
            }
        }
    };
    EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation = function (envelope, perEnvelopeSpeed) {
        if (perEnvelopeSpeed === void 0) { perEnvelopeSpeed = 1; }
        // This is a little hokey in the details, but I designed it a while ago and keep it 
        // around for compatibility. This decides how much to increase the volume (or
        // expression) to compensate for a decaying lowpass cutoff to maintain perceived
        // volume overall.
        if (envelope.type == 10 /* EnvelopeType.decay */)
            return 1.25 + 0.025 * /*envelope.speed */ perEnvelopeSpeed;
        if (envelope.type == 6 /* EnvelopeType.twang */)
            return 1.0 + 0.02 * /*envelope.speed */ perEnvelopeSpeed;
        return 1.0;
    };
    EnvelopeComputer.prototype.computeDrumsetEnvelopes = function (instrument, drumsetFilterEnvelope, beatsPerPart, partTimeStart, partTimeEnd) {
        var pitch = 1;
        function computeDrumsetEnvelope(unspedTime, time, beats, noteSize) {
            return EnvelopeComputer.computeEnvelope(drumsetFilterEnvelope, 1, 1, unspedTime, time, beats, 0, noteSize, pitch, false, 0, 1, true, 2, 2, 0 /* LFOEnvelopeTypes.sine */, pitch, 0);
        }
        // Drumset filters use the same envelope timing as the rest of the envelopes, but do not include support for slide transitions.
        var drumsetFilterEnvelopeStart = computeDrumsetEnvelope(this.noteSecondsStartUnscaled, this.noteSecondsStartUnscaled, beatsPerPart * partTimeStart, this.noteSizeStart); //doesn't have/need pitchStart, pitchEnd, pitchInvert, steps, seed, timeSinceBeginning, etc
        // Apply slide interpolation to drumset envelope.
        if (this.prevSlideStart) {
            var other = computeDrumsetEnvelope(this.prevNoteSecondsStartUnscaled, this.prevNoteSecondsStartUnscaled, beatsPerPart * partTimeStart, this.prevNoteSize);
            drumsetFilterEnvelopeStart += (other - drumsetFilterEnvelopeStart) * this.prevSlideRatioStart;
        }
        if (this.nextSlideStart) {
            var other = computeDrumsetEnvelope(0.0, 0.0, beatsPerPart * partTimeStart, this.nextNoteSize);
            drumsetFilterEnvelopeStart += (other - drumsetFilterEnvelopeStart) * this.nextSlideRatioStart;
        }
        var drumsetFilterEnvelopeEnd = drumsetFilterEnvelopeStart;
        //hmm, I guess making discrete per envelope leaves out drumsets....
        drumsetFilterEnvelopeEnd = computeDrumsetEnvelope(this.noteSecondsEndUnscaled, this.noteSecondsEndUnscaled, beatsPerPart * partTimeEnd, this.noteSizeEnd);
        if (this.prevSlideEnd) {
            var other = computeDrumsetEnvelope(this.prevNoteSecondsEndUnscaled, this.prevNoteSecondsEndUnscaled, beatsPerPart * partTimeEnd, this.prevNoteSize);
            drumsetFilterEnvelopeEnd += (other - drumsetFilterEnvelopeEnd) * this.prevSlideRatioEnd;
        }
        if (this.nextSlideEnd) {
            var other = computeDrumsetEnvelope(0.0, 0.0, beatsPerPart * partTimeEnd, this.nextNoteSize);
            drumsetFilterEnvelopeEnd += (other - drumsetFilterEnvelopeEnd) * this.nextSlideRatioEnd;
        }
        this.drumsetFilterEnvelopeStart = drumsetFilterEnvelopeStart;
        this.drumsetFilterEnvelopeEnd = drumsetFilterEnvelopeEnd;
    };
    return EnvelopeComputer;
}());
var Tone = /** @class */ (function () {
    function Tone() {
        this.pitches = Array(SynthConfig_1.Config.maxChordSize + 2).fill(0);
        this.pitchCount = 0;
        this.chordSize = 0;
        this.drumsetPitch = null;
        this.note = null;
        this.prevNote = null;
        this.nextNote = null;
        this.prevNotePitchIndex = 0;
        this.nextNotePitchIndex = 0;
        this.freshlyAllocated = true;
        this.atNoteStart = false;
        this.isOnLastTick = false; // Whether the tone is finished fading out and ready to be freed.
        this.passedEndOfNote = false;
        this.forceContinueAtStart = false;
        this.forceContinueAtEnd = false;
        this.noteStartPart = 0;
        this.noteEndPart = 0;
        this.ticksSinceReleased = 0;
        this.liveInputSamplesHeld = 0;
        this.lastInterval = 0;
        // public noiseSample: number = 0.0;
        // public noiseSampleB: number = 0.0;
        this.stringSustainStart = 0;
        this.stringSustainEnd = 0;
        this.noiseSamples = [];
        this.phases = [];
        this.operatorWaves = [];
        this.phaseDeltas = [];
        // advloop addition
        this.directions = [];
        this.chipWaveCompletions = [];
        this.chipWavePrevWaves = [];
        this.chipWaveCompletionsLastWave = [];
        // advloop addition
        this.phaseDeltaScales = [];
        this.expression = 0.0;
        this.expressionDelta = 0.0;
        this.operatorExpressions = [];
        this.operatorExpressionDeltas = [];
        this.prevPitchExpressions = Array(SynthConfig_1.Config.maxPitchOrOperatorCount).fill(null);
        this.prevVibrato = null;
        this.prevStringDecay = null;
        this.pulseWidth = 0.0;
        this.pulseWidthDelta = 0.0;
        this.decimalOffset = 0.0;
        this.supersawDynamism = 0.0;
        this.supersawDynamismDelta = 0.0;
        this.supersawUnisonDetunes = []; // These can change over time, but slowly enough that I'm not including corresponding delta values within a tick run.
        this.supersawShape = 0.0;
        this.supersawShapeDelta = 0.0;
        this.supersawDelayLength = 0.0;
        this.supersawDelayLengthDelta = 0.0;
        this.supersawDelayLine = null;
        this.supersawDelayIndex = -1;
        this.supersawPrevPhaseDelta = null;
        this.pickedStrings = [];
        this.noteFilters = [];
        this.noteFilterCount = 0;
        this.initialNoteFilterInput1 = 0.0;
        this.initialNoteFilterInput2 = 0.0;
        this.specialIntervalExpressionMult = 1.0;
        this.feedbackOutputs = [];
        this.feedbackMult = 0.0;
        this.feedbackDelta = 0.0;
        this.stereoVolumeLStart = 0.0;
        this.stereoVolumeRStart = 0.0;
        this.stereoVolumeLDelta = 0.0;
        this.stereoVolumeRDelta = 0.0;
        this.stereoDelayStart = 0.0;
        this.stereoDelayEnd = 0.0;
        this.stereoDelayDelta = 0.0;
        this.customVolumeStart = 0.0;
        this.customVolumeEnd = 0.0;
        this.filterResonanceStart = 0.0;
        this.filterResonanceDelta = 0.0;
        this.isFirstOrder = false;
        this.envelopeComputer = new EnvelopeComputer( /*true*/);
        this.reset();
    }
    Tone.prototype.reset = function () {
        // this.noiseSample = 0.0;
        for (var i = 0; i < SynthConfig_1.Config.unisonVoicesMax; i++) {
            this.noiseSamples[i] = 0.0;
        }
        for (var i = 0; i < SynthConfig_1.Config.maxPitchOrOperatorCount; i++) {
            this.phases[i] = 0.0;
            // advloop addition
            this.directions[i] = 1;
            this.chipWaveCompletions[i] = 0;
            this.chipWavePrevWaves[i] = 0;
            this.chipWaveCompletionsLastWave[i] = 0;
            // advloop addition
            this.operatorWaves[i] = SynthConfig_1.Config.operatorWaves[0];
            this.feedbackOutputs[i] = 0.0;
            this.prevPitchExpressions[i] = null;
        }
        for (var i = 0; i < this.noteFilterCount; i++) {
            this.noteFilters[i].resetOutput();
        }
        this.noteFilterCount = 0;
        this.initialNoteFilterInput1 = 0.0;
        this.initialNoteFilterInput2 = 0.0;
        this.liveInputSamplesHeld = 0;
        this.supersawDelayIndex = -1;
        for (var _i = 0, _a = this.pickedStrings; _i < _a.length; _i++) {
            var pickedString = _a[_i];
            pickedString.reset();
        }
        this.envelopeComputer.reset();
        this.prevVibrato = null;
        this.prevStringDecay = null;
        this.supersawPrevPhaseDelta = null;
        this.drumsetPitch = null;
    };
    return Tone;
}());
var InstrumentState = /** @class */ (function () {
    function InstrumentState() {
        this.awake = false; // Whether the instrument's effects-processing loop should continue.
        this.computed = false; // Whether the effects-processing parameters are up-to-date for the current synth run.
        this.tonesAddedInThisTick = false; // Whether any instrument tones are currently active.
        this.flushingDelayLines = false; // If no tones were active recently, enter a mode where the delay lines are filled with zeros to reset them for later use.
        this.deactivateAfterThisTick = false; // Whether the instrument is ready to be deactivated because the delay lines, if any, are fully zeroed.
        this.attentuationProgress = 0.0; // How long since an active tone introduced an input signal to the delay lines, normalized from 0 to 1 based on how long to wait until the delay lines signal will have audibly dissapated.
        this.flushedSamples = 0; // How many delay line samples have been flushed to zero.
        this.activeTones = new Deque_1.Deque();
        this.activeModTones = new Deque_1.Deque();
        this.releasedTones = new Deque_1.Deque(); // Tones that are in the process of fading out after the corresponding notes ended.
        this.liveInputTones = new Deque_1.Deque(); // Tones that are initiated by a source external to the loaded song data.
        this.type = 0 /* InstrumentType.chip */;
        this.synthesizer = null;
        this.wave = null;
        // advloop addition
        this.isUsingAdvancedLoopControls = false;
        this.chipWaveLoopStart = 0;
        this.chipWaveLoopEnd = 0;
        this.chipWaveLoopMode = 0;
        this.chipWavePlayBackwards = false;
        this.chipWaveStartOffset = 0;
        // advloop addition
        this.noisePitchFilterMult = 1.0;
        this.unison = null;
        this.unisonVoices = 1;
        this.unisonSpread = 0.0;
        this.unisonOffset = 0.0;
        this.unisonExpression = 1.4;
        this.unisonSign = 1.0;
        this.chord = null;
        this.effects = 0;
        this.volumeScale = 0;
        this.aliases = false;
        this.arpTime = 0;
        this.vibratoTime = 0;
        this.nextVibratoTime = 0;
        this.envelopeTime = [];
        this.eqFilterVolume = 1.0;
        this.eqFilterVolumeDelta = 0.0;
        this.mixVolume = 1.0;
        this.mixVolumeDelta = 0.0;
        this.delayInputMult = 0.0;
        this.delayInputMultDelta = 0.0;
        this.granularMix = 1.0;
        this.granularMixDelta = 0.0;
        this.granularDelayLine = null;
        this.granularDelayLineIndex = 0;
        this.granularMaximumDelayTimeInSeconds = 1;
        this.usesRandomGrainLocation = true; //eventually I might use the granular code for sample pitch shifting, but we'll see
        this.granularDelayLineDirty = false;
        this.computeGrains = true;
        this.ringModMix = 0;
        this.ringModMixDelta = 0;
        this.ringModPhase = 0;
        this.ringModPhaseDelta = 0;
        this.ringModPhaseDeltaScale = 1.0;
        this.ringModWaveformIndex = 0.0;
        this.ringModPulseWidth = 0.0;
        this.ringModHzOffset = 0.0;
        this.ringModMixFade = 1.0;
        this.ringModMixFadeDelta = 0;
        this.distortion = 0.0;
        this.distortionDelta = 0.0;
        this.distortionDrive = 0.0;
        this.distortionDriveDelta = 0.0;
        this.distortionFractionalInput1 = 0.0;
        this.distortionFractionalInput2 = 0.0;
        this.distortionFractionalInput3 = 0.0;
        this.distortionPrevInput = 0.0;
        this.distortionNextOutput = 0.0;
        this.bitcrusherPrevInput = 0.0;
        this.bitcrusherCurrentOutput = 0.0;
        this.bitcrusherPhase = 1.0;
        this.bitcrusherPhaseDelta = 0.0;
        this.bitcrusherPhaseDeltaScale = 1.0;
        this.bitcrusherScale = 1.0;
        this.bitcrusherScaleScale = 1.0;
        this.bitcrusherFoldLevel = 1.0;
        this.bitcrusherFoldLevelScale = 1.0;
        this.eqFilters = [];
        this.eqFilterCount = 0;
        this.initialEqFilterInput1 = 0.0;
        this.initialEqFilterInput2 = 0.0;
        this.panningDelayLine = null;
        this.panningDelayPos = 0;
        this.panningVolumeL = 0.0;
        this.panningVolumeR = 0.0;
        this.panningVolumeDeltaL = 0.0;
        this.panningVolumeDeltaR = 0.0;
        this.panningOffsetL = 0.0;
        this.panningOffsetR = 0.0;
        this.panningOffsetDeltaL = 0.0;
        this.panningOffsetDeltaR = 0.0;
        this.chorusDelayLineL = null;
        this.chorusDelayLineR = null;
        this.chorusDelayLineDirty = false;
        this.chorusDelayPos = 0;
        this.chorusPhase = 0;
        this.chorusVoiceMult = 0;
        this.chorusVoiceMultDelta = 0;
        this.chorusCombinedMult = 0;
        this.chorusCombinedMultDelta = 0;
        this.echoDelayLineL = null;
        this.echoDelayLineR = null;
        this.echoDelayLineDirty = false;
        this.echoDelayPos = 0;
        this.echoDelayOffsetStart = 0;
        this.echoDelayOffsetEnd = null;
        this.echoDelayOffsetRatio = 0.0;
        this.echoDelayOffsetRatioDelta = 0.0;
        this.echoMult = 0.0;
        this.echoMultDelta = 0.0;
        this.echoShelfA1 = 0.0;
        this.echoShelfB0 = 0.0;
        this.echoShelfB1 = 0.0;
        this.echoShelfSampleL = 0.0;
        this.echoShelfSampleR = 0.0;
        this.echoShelfPrevInputL = 0.0;
        this.echoShelfPrevInputR = 0.0;
        this.reverbDelayLine = null;
        this.reverbDelayLineDirty = false;
        this.reverbDelayPos = 0;
        this.reverbMult = 0.0;
        this.reverbMultDelta = 0.0;
        this.reverbShelfA1 = 0.0;
        this.reverbShelfB0 = 0.0;
        this.reverbShelfB1 = 0.0;
        this.reverbShelfSample0 = 0.0;
        this.reverbShelfSample1 = 0.0;
        this.reverbShelfSample2 = 0.0;
        this.reverbShelfSample3 = 0.0;
        this.reverbShelfPrevInput0 = 0.0;
        this.reverbShelfPrevInput1 = 0.0;
        this.reverbShelfPrevInput2 = 0.0;
        this.reverbShelfPrevInput3 = 0.0;
        this.invertWave = false;
        this.phaserSamples = null;
        this.phaserPrevInputs = null;
        this.phaserFeedbackMult = 0.0;
        this.phaserFeedbackMultDelta = 0.0;
        this.phaserMix = 0.0;
        this.phaserMixDelta = 0.0;
        this.phaserBreakCoef = 0.0;
        this.phaserBreakCoefDelta = 0.0;
        this.phaserStages = 0;
        this.phaserStagesDelta = 0;
        this.spectrumWave = new SpectrumWaveState();
        this.harmonicsWave = new HarmonicsWaveState();
        this.drumsetSpectrumWaves = [];
        this.envelopeComputer = new EnvelopeComputer();
        for (var i = 0; i < SynthConfig_1.Config.drumCount; i++) {
            this.drumsetSpectrumWaves[i] = new SpectrumWaveState();
        }
        // Allocate all grains to be used ahead of time.
        // granularGrainsLength is what indicates how many grains actually "exist".
        this.granularGrains = [];
        this.granularMaximumGrains = 256;
        for (var i = 0; i < this.granularMaximumGrains; i++) {
            this.granularGrains.push(new Grain());
        }
        this.granularGrainsLength = 0;
    }
    InstrumentState.prototype.allocateNecessaryBuffers = function (synth, instrument, samplesPerTick) {
        if ((0, SynthConfig_1.effectsIncludePanning)(instrument.effects)) {
            if (this.panningDelayLine == null || this.panningDelayLine.length < synth.panningDelayBufferSize) {
                this.panningDelayLine = new Float32Array(synth.panningDelayBufferSize);
            }
        }
        if ((0, SynthConfig_1.effectsIncludeChorus)(instrument.effects)) {
            if (this.chorusDelayLineL == null || this.chorusDelayLineL.length < synth.chorusDelayBufferSize) {
                this.chorusDelayLineL = new Float32Array(synth.chorusDelayBufferSize);
            }
            if (this.chorusDelayLineR == null || this.chorusDelayLineR.length < synth.chorusDelayBufferSize) {
                this.chorusDelayLineR = new Float32Array(synth.chorusDelayBufferSize);
            }
        }
        if ((0, SynthConfig_1.effectsIncludeEcho)(instrument.effects)) {
            this.allocateEchoBuffers(samplesPerTick, instrument.echoDelay);
        }
        if ((0, SynthConfig_1.effectsIncludeReverb)(instrument.effects)) {
            // TODO: Make reverb delay line sample rate agnostic. Maybe just double buffer size for 96KHz? Adjust attenuation and shelf cutoff appropriately?
            if (this.reverbDelayLine == null) {
                this.reverbDelayLine = new Float32Array(SynthConfig_1.Config.reverbDelayBufferSize);
            }
        }
        if ((0, SynthConfig_1.effectsIncludePhaser)(instrument.effects)) {
            if (this.phaserSamples == null) {
                this.phaserSamples = new Float32Array(SynthConfig_1.Config.phaserMaxStages);
                this.phaserPrevInputs = new Float32Array(SynthConfig_1.Config.phaserMaxStages);
            }
        }
        if ((0, SynthConfig_1.effectsIncludeGranular)(instrument.effects)) {
            var granularDelayLineSizeInMilliseconds = 2500;
            var granularDelayLineSizeInSeconds = granularDelayLineSizeInMilliseconds / 1000; // Maximum possible delay time
            this.granularMaximumDelayTimeInSeconds = granularDelayLineSizeInSeconds;
            var granularDelayLineSizeInSamples = Synth.fittingPowerOfTwo(Math.floor(granularDelayLineSizeInSeconds * synth.samplesPerSecond));
            if (this.granularDelayLine == null || this.granularDelayLine.length != granularDelayLineSizeInSamples) {
                this.granularDelayLine = new Float32Array(granularDelayLineSizeInSamples);
                this.granularDelayLineIndex = 0;
            }
            var oldGrainsLength = this.granularGrains.length;
            if (this.granularMaximumGrains > oldGrainsLength) { //increase grain amount if it changes
                for (var i = oldGrainsLength; i < this.granularMaximumGrains + 1; i++) {
                    this.granularGrains.push(new Grain());
                }
            }
            if (this.granularMaximumGrains < this.granularGrainsLength) {
                this.granularGrainsLength = Math.round(this.granularMaximumGrains);
            }
        }
    };
    InstrumentState.prototype.allocateEchoBuffers = function (samplesPerTick, echoDelay) {
        // account for tempo and delay automation changing delay length during a tick?
        var safeEchoDelaySteps = Math.max(SynthConfig_1.Config.echoDelayRange >> 1, (echoDelay + 1)); // The delay may be very short now, but if it increases later make sure we have enough sample history.
        var baseEchoDelayBufferSize = Synth.fittingPowerOfTwo(safeEchoDelaySteps * SynthConfig_1.Config.echoDelayStepTicks * samplesPerTick);
        var safeEchoDelayBufferSize = baseEchoDelayBufferSize * 2; // If the tempo or delay changes and we suddenly need a longer delay, make sure that we have enough sample history to accomodate the longer delay.
        if (this.echoDelayLineL == null || this.echoDelayLineR == null) {
            this.echoDelayLineL = new Float32Array(safeEchoDelayBufferSize);
            this.echoDelayLineR = new Float32Array(safeEchoDelayBufferSize);
        }
        else if (this.echoDelayLineL.length < safeEchoDelayBufferSize || this.echoDelayLineR.length < safeEchoDelayBufferSize) {
            // The echo delay length may change while the song is playing if tempo changes,
            // so buffers may need to be reallocated, but we don't want to lose any echoes
            // so we need to copy the contents of the old buffer to the new one.
            var newDelayLineL = new Float32Array(safeEchoDelayBufferSize);
            var newDelayLineR = new Float32Array(safeEchoDelayBufferSize);
            var oldMask = this.echoDelayLineL.length - 1;
            for (var i = 0; i < this.echoDelayLineL.length; i++) {
                newDelayLineL[i] = this.echoDelayLineL[(this.echoDelayPos + i) & oldMask];
                newDelayLineR[i] = this.echoDelayLineL[(this.echoDelayPos + i) & oldMask];
            }
            this.echoDelayPos = this.echoDelayLineL.length;
            this.echoDelayLineL = newDelayLineL;
            this.echoDelayLineR = newDelayLineR;
        }
    };
    InstrumentState.prototype.deactivate = function () {
        this.bitcrusherPrevInput = 0.0;
        this.bitcrusherCurrentOutput = 0.0;
        this.bitcrusherPhase = 1.0;
        for (var i = 0; i < this.eqFilterCount; i++) {
            this.eqFilters[i].resetOutput();
        }
        this.eqFilterCount = 0;
        this.initialEqFilterInput1 = 0.0;
        this.initialEqFilterInput2 = 0.0;
        this.distortionFractionalInput1 = 0.0;
        this.distortionFractionalInput2 = 0.0;
        this.distortionFractionalInput3 = 0.0;
        this.distortionPrevInput = 0.0;
        this.distortionNextOutput = 0.0;
        this.panningDelayPos = 0;
        if (this.panningDelayLine != null)
            for (var i = 0; i < this.panningDelayLine.length; i++)
                this.panningDelayLine[i] = 0.0;
        this.echoDelayOffsetEnd = null;
        this.echoShelfSampleL = 0.0;
        this.echoShelfSampleR = 0.0;
        this.echoShelfPrevInputL = 0.0;
        this.echoShelfPrevInputR = 0.0;
        this.reverbShelfSample0 = 0.0;
        this.reverbShelfSample1 = 0.0;
        this.reverbShelfSample2 = 0.0;
        this.reverbShelfSample3 = 0.0;
        this.reverbShelfPrevInput0 = 0.0;
        this.reverbShelfPrevInput1 = 0.0;
        this.reverbShelfPrevInput2 = 0.0;
        this.reverbShelfPrevInput3 = 0.0;
        if (this.phaserSamples != null)
            for (var i = 0; i < this.phaserSamples.length; i++)
                this.phaserSamples[i] = 0.0;
        if (this.phaserPrevInputs != null)
            for (var i = 0; i < this.phaserPrevInputs.length; i++)
                this.phaserPrevInputs[i] = 0.0;
        this.volumeScale = 1.0;
        this.aliases = false;
        this.invertWave = false;
        this.awake = false;
        this.flushingDelayLines = false;
        this.deactivateAfterThisTick = false;
        this.attentuationProgress = 0.0;
        this.flushedSamples = 0;
    };
    InstrumentState.prototype.resetAllEffects = function () {
        this.deactivate();
        // LFOs are reset here rather than in deactivate() for periodic oscillation that stays "on the beat". Resetting in deactivate() will cause it to reset with each note.
        this.vibratoTime = 0;
        this.nextVibratoTime = 0;
        this.arpTime = 0;
        for (var envelopeIndex = 0; envelopeIndex < SynthConfig_1.Config.maxEnvelopeCount + 1; envelopeIndex++)
            this.envelopeTime[envelopeIndex] = 0;
        this.envelopeComputer.reset();
        if (this.chorusDelayLineDirty) {
            for (var i = 0; i < this.chorusDelayLineL.length; i++)
                this.chorusDelayLineL[i] = 0.0;
            for (var i = 0; i < this.chorusDelayLineR.length; i++)
                this.chorusDelayLineR[i] = 0.0;
        }
        if (this.echoDelayLineDirty) {
            for (var i = 0; i < this.echoDelayLineL.length; i++)
                this.echoDelayLineL[i] = 0.0;
            for (var i = 0; i < this.echoDelayLineR.length; i++)
                this.echoDelayLineR[i] = 0.0;
        }
        if (this.reverbDelayLineDirty) {
            for (var i = 0; i < this.reverbDelayLine.length; i++)
                this.reverbDelayLine[i] = 0.0;
        }
        if (this.granularDelayLineDirty) {
            for (var i = 0; i < this.granularDelayLine.length; i++)
                this.granularDelayLine[i] = 0.0;
        }
        this.chorusPhase = 0.0;
        this.ringModPhase = 0.0;
        this.ringModMixFade = 1.0;
    };
    InstrumentState.prototype.compute = function (synth, instrument, samplesPerTick, roundedSamplesPerTick, tone, channelIndex, instrumentIndex) {
        this.computed = true;
        this.type = instrument.type;
        this.synthesizer = Synth.getInstrumentSynthFunction(instrument);
        this.unison = SynthConfig_1.Config.unisons[instrument.unison];
        this.chord = instrument.getChord();
        this.noisePitchFilterMult = SynthConfig_1.Config.chipNoises[instrument.chipNoise].pitchFilterMult;
        this.effects = instrument.effects;
        this.aliases = instrument.aliases;
        this.invertWave = instrument.invertWave;
        var usesInvertWave = (0, SynthConfig_1.effectsIncludeInvertWave)(this.effects);
        if (usesInvertWave) {
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["invert wave"].index, channelIndex, instrumentIndex)) {
                this.invertWave = Boolean(Math.floor(synth.getModValue(SynthConfig_1.Config.modulators.dictionary["invert wave"].index, channelIndex, instrumentIndex, false)));
            }
        }
        this.volumeScale = 1.0;
        this.allocateNecessaryBuffers(synth, instrument, samplesPerTick);
        var samplesPerSecond = synth.samplesPerSecond;
        this.updateWaves(instrument, samplesPerSecond);
        var ticksIntoBar = synth.getTicksIntoBar();
        var tickTimeStart = ticksIntoBar;
        var secondsPerTick = samplesPerTick / synth.samplesPerSecond;
        var currentPart = synth.getCurrentPart();
        /* slarmoo --

            There are two(ish) envelopeComputers:
            One in the instrumentState, and one in each tone.
            The instrumentState one handles all sound-based effects,
            whereas the tone envelopeComputers handle all of the instrument settings and behavior-effects

        */
        //handle instrumentState envelopeComputer
        var envelopeSpeeds = [];
        for (var i = 0; i < SynthConfig_1.Config.maxEnvelopeCount; i++) {
            envelopeSpeeds[i] = 0;
        }
        var useEnvelopeSpeed = SynthConfig_1.Config.arpSpeedScale[instrument.envelopeSpeed];
        if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["envelope speed"].index, channelIndex, instrumentIndex)) {
            useEnvelopeSpeed = Math.max(0, Math.min(SynthConfig_1.Config.arpSpeedScale.length - 1, synth.getModValue(SynthConfig_1.Config.modulators.dictionary["envelope speed"].index, channelIndex, instrumentIndex, false)));
            if (Number.isInteger(useEnvelopeSpeed)) {
                useEnvelopeSpeed = SynthConfig_1.Config.arpSpeedScale[useEnvelopeSpeed];
            }
            else {
                // Linear interpolate envelope values
                useEnvelopeSpeed = ((1 - (useEnvelopeSpeed % 1)) * SynthConfig_1.Config.arpSpeedScale[Math.floor(useEnvelopeSpeed)] + (useEnvelopeSpeed % 1) * SynthConfig_1.Config.arpSpeedScale[Math.ceil(useEnvelopeSpeed)]);
            }
        }
        for (var envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
            var perEnvelopeSpeed = instrument.envelopes[envelopeIndex].perEnvelopeSpeed;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index, channelIndex, instrumentIndex) && instrument.envelopes[envelopeIndex].tempEnvelopeSpeed != null) {
                perEnvelopeSpeed = instrument.envelopes[envelopeIndex].tempEnvelopeSpeed;
            }
            envelopeSpeeds[envelopeIndex] = useEnvelopeSpeed * perEnvelopeSpeed;
        }
        this.envelopeComputer.computeEnvelopes(instrument, currentPart, this.envelopeTime, tickTimeStart, secondsPerTick, tone, envelopeSpeeds, this, synth, channelIndex, instrumentIndex, false);
        var envelopeStarts = this.envelopeComputer.envelopeStarts;
        var envelopeEnds = this.envelopeComputer.envelopeEnds;
        var usesGranular = (0, SynthConfig_1.effectsIncludeGranular)(this.effects);
        var usesRingModulation = (0, SynthConfig_1.effectsIncludeRingModulation)(this.effects);
        var usesDistortion = (0, SynthConfig_1.effectsIncludeDistortion)(this.effects);
        var usesBitcrusher = (0, SynthConfig_1.effectsIncludeBitcrusher)(this.effects);
        var usesPanning = (0, SynthConfig_1.effectsIncludePanning)(this.effects);
        var usesChorus = (0, SynthConfig_1.effectsIncludeChorus)(this.effects);
        var usesEcho = (0, SynthConfig_1.effectsIncludeEcho)(this.effects);
        var usesReverb = (0, SynthConfig_1.effectsIncludeReverb)(this.effects);
        var usesPhaser = (0, SynthConfig_1.effectsIncludePhaser)(this.effects);
        var granularChance = 0;
        if (usesGranular) { //has to happen before buffer allocation
            granularChance = (instrument.grainAmounts + 1);
            this.granularMaximumGrains = instrument.grainAmounts;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["grain freq"].index, channelIndex, instrumentIndex)) {
                this.granularMaximumGrains = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["grain freq"].index, channelIndex, instrumentIndex, false);
                granularChance = (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["grain freq"].index, channelIndex, instrumentIndex, false) + 1);
            }
            this.granularMaximumGrains = Math.floor(Math.pow(2, this.granularMaximumGrains * envelopeStarts[52 /* EnvelopeComputeIndex.grainAmount */]));
            granularChance = granularChance * envelopeStarts[52 /* EnvelopeComputeIndex.grainAmount */];
        }
        this.allocateNecessaryBuffers(synth, instrument, samplesPerTick);
        if (usesGranular) {
            this.granularMix = instrument.granular / SynthConfig_1.Config.granularRange;
            this.computeGrains = true;
            var granularMixEnd = this.granularMix;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["granular"].index, channelIndex, instrumentIndex)) {
                this.granularMix = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["granular"].index, channelIndex, instrumentIndex, false) / SynthConfig_1.Config.granularRange;
                granularMixEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["granular"].index, channelIndex, instrumentIndex, true) / SynthConfig_1.Config.granularRange;
            }
            this.granularMix *= envelopeStarts[51 /* EnvelopeComputeIndex.granular */];
            granularMixEnd *= envelopeEnds[51 /* EnvelopeComputeIndex.granular */];
            this.granularMixDelta = (granularMixEnd - this.granularMix) / roundedSamplesPerTick;
            for (var iterations = 0; iterations < Math.ceil(Math.random() * Math.random() * 10); iterations++) { //dirty weighting toward lower numbers
                //create a grain
                if (this.granularGrainsLength < this.granularMaximumGrains && Math.random() <= granularChance) { //only create a grain if there's room and based on grainFreq
                    var granularMinGrainSizeInMilliseconds = instrument.grainSize;
                    if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["grain size"].index, channelIndex, instrumentIndex)) {
                        granularMinGrainSizeInMilliseconds = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["grain size"].index, channelIndex, instrumentIndex, false);
                    }
                    granularMinGrainSizeInMilliseconds *= envelopeStarts[53 /* EnvelopeComputeIndex.grainSize */];
                    var grainRange = instrument.grainRange;
                    if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["grain range"].index, channelIndex, instrumentIndex)) {
                        grainRange = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["grain range"].index, channelIndex, instrumentIndex, false);
                    }
                    grainRange *= envelopeStarts[54 /* EnvelopeComputeIndex.grainRange */];
                    var granularMaxGrainSizeInMilliseconds = granularMinGrainSizeInMilliseconds + grainRange;
                    var granularGrainSizeInMilliseconds = granularMinGrainSizeInMilliseconds + (granularMaxGrainSizeInMilliseconds - granularMinGrainSizeInMilliseconds) * Math.random();
                    var granularGrainSizeInSeconds = granularGrainSizeInMilliseconds / 1000.0;
                    var granularGrainSizeInSamples = Math.floor(granularGrainSizeInSeconds * samplesPerSecond);
                    var granularDelayLineLength = this.granularDelayLine.length;
                    var grainIndex = this.granularGrainsLength;
                    this.granularGrainsLength++;
                    var grain = this.granularGrains[grainIndex];
                    grain.ageInSamples = 0;
                    grain.maxAgeInSamples = granularGrainSizeInSamples;
                    // const minDelayTimeInMilliseconds: number = 2;
                    // const minDelayTimeInSeconds: number = minDelayTimeInMilliseconds / 1000.0;
                    var minDelayTimeInSeconds = 0.02;
                    // const maxDelayTimeInSeconds: number = this.granularMaximumDelayTimeInSeconds;
                    var maxDelayTimeInSeconds = 2.4;
                    grain.delayLinePosition = this.usesRandomGrainLocation ? (minDelayTimeInSeconds + (maxDelayTimeInSeconds - minDelayTimeInSeconds) * Math.random() * Math.random() * samplesPerSecond) % (granularDelayLineLength - 1) : minDelayTimeInSeconds; //dirty weighting toward lower numbers ; The clamp was clumping everything at the end, so I decided to use a modulo instead
                    if (SynthConfig_1.Config.granularEnvelopeType == 0 /* GranularEnvelopeType.parabolic */) {
                        grain.initializeParabolicEnvelope(grain.maxAgeInSamples, 1.0);
                    }
                    else if (SynthConfig_1.Config.granularEnvelopeType == 1 /* GranularEnvelopeType.raisedCosineBell */) {
                        grain.initializeRCBEnvelope(grain.maxAgeInSamples, 1.0);
                    }
                    // if (this.usesRandomGrainLocation) {
                    grain.addDelay(Math.random() * samplesPerTick * 4); //offset when grains begin playing ; This is different from the above delay, which delays how far back in time the grain looks for samples
                    // }
                }
            }
        }
        if (usesDistortion) {
            var useDistortionStart = instrument.distortion;
            var useDistortionEnd = instrument.distortion;
            // Check for distortion mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["distortion"].index, channelIndex, instrumentIndex)) {
                useDistortionStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["distortion"].index, channelIndex, instrumentIndex, false);
                useDistortionEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["distortion"].index, channelIndex, instrumentIndex, true);
            }
            var distortionSliderStart = Math.min(1.0, envelopeStarts[42 /* EnvelopeComputeIndex.distortion */] * useDistortionStart / (SynthConfig_1.Config.distortionRange - 1));
            var distortionSliderEnd = Math.min(1.0, envelopeEnds[42 /* EnvelopeComputeIndex.distortion */] * useDistortionEnd / (SynthConfig_1.Config.distortionRange - 1));
            var distortionStart = Math.pow(1.0 - 0.895 * (Math.pow(20.0, distortionSliderStart) - 1.0) / 19.0, 2.0);
            var distortionEnd = Math.pow(1.0 - 0.895 * (Math.pow(20.0, distortionSliderEnd) - 1.0) / 19.0, 2.0);
            var distortionDriveStart = (1.0 + 2.0 * distortionSliderStart) / SynthConfig_1.Config.distortionBaseVolume;
            var distortionDriveEnd = (1.0 + 2.0 * distortionSliderEnd) / SynthConfig_1.Config.distortionBaseVolume;
            this.distortion = distortionStart;
            this.distortionDelta = (distortionEnd - distortionStart) / roundedSamplesPerTick;
            this.distortionDrive = distortionDriveStart;
            this.distortionDriveDelta = (distortionDriveEnd - distortionDriveStart) / roundedSamplesPerTick;
        }
        if (usesBitcrusher) {
            var freqSettingStart = instrument.bitcrusherFreq * Math.sqrt(envelopeStarts[44 /* EnvelopeComputeIndex.bitcrusherFrequency */]);
            var freqSettingEnd = instrument.bitcrusherFreq * Math.sqrt(envelopeEnds[44 /* EnvelopeComputeIndex.bitcrusherFrequency */]);
            // Check for freq crush mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["freq crush"].index, channelIndex, instrumentIndex)) {
                freqSettingStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["freq crush"].index, channelIndex, instrumentIndex, false) * Math.sqrt(envelopeStarts[44 /* EnvelopeComputeIndex.bitcrusherFrequency */]);
                freqSettingEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["freq crush"].index, channelIndex, instrumentIndex, true) * Math.sqrt(envelopeEnds[44 /* EnvelopeComputeIndex.bitcrusherFrequency */]);
            }
            var quantizationSettingStart = instrument.bitcrusherQuantization * Math.sqrt(envelopeStarts[43 /* EnvelopeComputeIndex.bitcrusherQuantization */]);
            var quantizationSettingEnd = instrument.bitcrusherQuantization * Math.sqrt(envelopeEnds[43 /* EnvelopeComputeIndex.bitcrusherQuantization */]);
            // Check for bitcrush mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["bit crush"].index, channelIndex, instrumentIndex)) {
                quantizationSettingStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["bit crush"].index, channelIndex, instrumentIndex, false) * Math.sqrt(envelopeStarts[43 /* EnvelopeComputeIndex.bitcrusherQuantization */]);
                quantizationSettingEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["bit crush"].index, channelIndex, instrumentIndex, true) * Math.sqrt(envelopeEnds[43 /* EnvelopeComputeIndex.bitcrusherQuantization */]);
            }
            var basePitch = SynthConfig_1.Config.keys[synth.song.key].basePitch + (SynthConfig_1.Config.pitchesPerOctave * synth.song.octave); // TODO: What if there's a key change mid-song?
            var freqStart = Instrument.frequencyFromPitch(basePitch + 60) * Math.pow(2.0, (SynthConfig_1.Config.bitcrusherFreqRange - 1 - freqSettingStart) * SynthConfig_1.Config.bitcrusherOctaveStep);
            var freqEnd = Instrument.frequencyFromPitch(basePitch + 60) * Math.pow(2.0, (SynthConfig_1.Config.bitcrusherFreqRange - 1 - freqSettingEnd) * SynthConfig_1.Config.bitcrusherOctaveStep);
            var phaseDeltaStart = Math.min(1.0, freqStart / samplesPerSecond);
            var phaseDeltaEnd = Math.min(1.0, freqEnd / samplesPerSecond);
            this.bitcrusherPhaseDelta = phaseDeltaStart;
            this.bitcrusherPhaseDeltaScale = Math.pow(phaseDeltaEnd / phaseDeltaStart, 1.0 / roundedSamplesPerTick);
            var scaleStart = 2.0 * SynthConfig_1.Config.bitcrusherBaseVolume * Math.pow(2.0, 1.0 - Math.pow(2.0, (SynthConfig_1.Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart) * 0.5));
            var scaleEnd = 2.0 * SynthConfig_1.Config.bitcrusherBaseVolume * Math.pow(2.0, 1.0 - Math.pow(2.0, (SynthConfig_1.Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd) * 0.5));
            this.bitcrusherScale = scaleStart;
            this.bitcrusherScaleScale = Math.pow(scaleEnd / scaleStart, 1.0 / roundedSamplesPerTick);
            var foldLevelStart = 2.0 * SynthConfig_1.Config.bitcrusherBaseVolume * Math.pow(1.5, SynthConfig_1.Config.bitcrusherQuantizationRange - 1 - quantizationSettingStart);
            var foldLevelEnd = 2.0 * SynthConfig_1.Config.bitcrusherBaseVolume * Math.pow(1.5, SynthConfig_1.Config.bitcrusherQuantizationRange - 1 - quantizationSettingEnd);
            this.bitcrusherFoldLevel = foldLevelStart;
            this.bitcrusherFoldLevelScale = Math.pow(foldLevelEnd / foldLevelStart, 1.0 / roundedSamplesPerTick);
        }
        var eqFilterVolume = 1.0; //this.envelopeComputer.lowpassCutoffDecayVolumeCompensation;
        if (instrument.eqFilterType) {
            // Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
            var eqFilterSettingsStart = instrument.eqFilter;
            if (instrument.eqSubFilters[1] == null)
                instrument.eqSubFilters[1] = new FilterSettings();
            var eqFilterSettingsEnd = instrument.eqSubFilters[1];
            // Change location based on slider values
            var startSimpleFreq = instrument.eqFilterSimpleCut;
            var startSimpleGain = instrument.eqFilterSimplePeak;
            var endSimpleFreq = instrument.eqFilterSimpleCut;
            var endSimpleGain = instrument.eqFilterSimplePeak;
            var filterChanges = false;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex)) {
                startSimpleFreq = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex, false);
                endSimpleFreq = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex, true);
                filterChanges = true;
            }
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex)) {
                startSimpleGain = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex, false);
                endSimpleGain = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex, true);
                filterChanges = true;
            }
            var startPoint = void 0;
            if (filterChanges) {
                eqFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain);
                eqFilterSettingsEnd.convertLegacySettingsForSynth(endSimpleFreq, endSimpleGain);
                startPoint = eqFilterSettingsStart.controlPoints[0];
                var endPoint = eqFilterSettingsEnd.controlPoints[0];
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, 1.0, 1.0);
                if (this.eqFilters.length < 1)
                    this.eqFilters[0] = new filtering_1.DynamicBiquadFilter();
                this.eqFilters[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
            }
            else {
                eqFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain, true);
                startPoint = eqFilterSettingsStart.controlPoints[0];
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
                if (this.eqFilters.length < 1)
                    this.eqFilters[0] = new filtering_1.DynamicBiquadFilter();
                this.eqFilters[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterStartCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
            }
            eqFilterVolume *= startPoint.getVolumeCompensationMult();
            this.eqFilterCount = 1;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
        }
        else {
            var eqFilterSettings = (instrument.tmpEqFilterStart != null) ? instrument.tmpEqFilterStart : instrument.eqFilter;
            //const eqAllFreqsEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterAllFreqs];
            //const eqAllFreqsEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterAllFreqs];
            for (var i = 0; i < eqFilterSettings.controlPointCount; i++) {
                //const eqFreqEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterFreq0 + i];
                //const eqFreqEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterFreq0 + i];
                //const eqPeakEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterGain0 + i];
                //const eqPeakEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterGain0 + i];
                var startPoint = eqFilterSettings.controlPoints[i];
                var endPoint = (instrument.tmpEqFilterEnd != null && instrument.tmpEqFilterEnd.controlPoints[i] != null) ? instrument.tmpEqFilterEnd.controlPoints[i] : eqFilterSettings.controlPoints[i];
                // If switching dot type, do it all at once and do not try to interpolate since no valid interpolation exists.
                if (startPoint.type != endPoint.type) {
                    startPoint = endPoint;
                }
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, /*eqAllFreqsEnvelopeStart * eqFreqEnvelopeStart*/ 1.0, /*eqPeakEnvelopeStart*/ 1.0);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, /*eqAllFreqsEnvelopeEnd   * eqFreqEnvelopeEnd*/ 1.0, /*eqPeakEnvelopeEnd*/ 1.0);
                if (this.eqFilters.length <= i)
                    this.eqFilters[i] = new filtering_1.DynamicBiquadFilter();
                this.eqFilters[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
                eqFilterVolume *= startPoint.getVolumeCompensationMult();
            }
            this.eqFilterCount = eqFilterSettings.controlPointCount;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
        }
        var mainInstrumentVolume = Synth.instrumentVolumeToVolumeMult(instrument.volume);
        this.mixVolume = mainInstrumentVolume /** envelopeStarts[InstrumentAutomationIndex.mixVolume]*/;
        var mixVolumeEnd = mainInstrumentVolume /** envelopeEnds[  InstrumentAutomationIndex.mixVolume]*/;
        // Check for mod-related volume delta
        if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["mix volume"].index, channelIndex, instrumentIndex)) {
            // Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
            var startVal = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["mix volume"].index, channelIndex, instrumentIndex, false);
            var endVal = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["mix volume"].index, channelIndex, instrumentIndex, true);
            this.mixVolume *= ((startVal <= 0) ? ((startVal + SynthConfig_1.Config.volumeRange / 2) / (SynthConfig_1.Config.volumeRange / 2)) : Synth.instrumentVolumeToVolumeMult(startVal));
            mixVolumeEnd *= ((endVal <= 0) ? ((endVal + SynthConfig_1.Config.volumeRange / 2) / (SynthConfig_1.Config.volumeRange / 2)) : Synth.instrumentVolumeToVolumeMult(endVal));
        }
        // Check for SONG mod-related volume delta
        if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["song volume"].index)) {
            this.mixVolume *= (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["song volume"].index, undefined, undefined, false)) / 100.0;
            mixVolumeEnd *= (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["song volume"].index, undefined, undefined, true)) / 100.0;
        }
        this.mixVolumeDelta = (mixVolumeEnd - this.mixVolume) / roundedSamplesPerTick;
        var eqFilterVolumeStart = eqFilterVolume;
        var eqFilterVolumeEnd = eqFilterVolume;
        var delayInputMultStart = 1.0;
        var delayInputMultEnd = 1.0;
        if (usesPanning) {
            var panEnvelopeStart = envelopeStarts[41 /* EnvelopeComputeIndex.panning */] * 2.0 - 1.0;
            var panEnvelopeEnd = envelopeEnds[41 /* EnvelopeComputeIndex.panning */] * 2.0 - 1.0;
            var usePanStart = instrument.pan;
            var usePanEnd = instrument.pan;
            // Check for pan mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["pan"].index, channelIndex, instrumentIndex)) {
                usePanStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["pan"].index, channelIndex, instrumentIndex, false);
                usePanEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["pan"].index, channelIndex, instrumentIndex, true);
            }
            var panStart = Math.max(-1.0, Math.min(1.0, (usePanStart - SynthConfig_1.Config.panCenter) / SynthConfig_1.Config.panCenter * panEnvelopeStart));
            var panEnd = Math.max(-1.0, Math.min(1.0, (usePanEnd - SynthConfig_1.Config.panCenter) / SynthConfig_1.Config.panCenter * panEnvelopeEnd));
            var volumeStartL = Math.cos((1 + panStart) * Math.PI * 0.25) * 1.414;
            var volumeStartR = Math.cos((1 - panStart) * Math.PI * 0.25) * 1.414;
            var volumeEndL = Math.cos((1 + panEnd) * Math.PI * 0.25) * 1.414;
            var volumeEndR = Math.cos((1 - panEnd) * Math.PI * 0.25) * 1.414;
            var maxDelaySamples = samplesPerSecond * SynthConfig_1.Config.panDelaySecondsMax;
            var usePanDelayStart = instrument.panDelay;
            var usePanDelayEnd = instrument.panDelay;
            // Check for pan delay mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["pan delay"].index, channelIndex, instrumentIndex)) {
                usePanDelayStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["pan delay"].index, channelIndex, instrumentIndex, false);
                usePanDelayEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["pan delay"].index, channelIndex, instrumentIndex, true);
            }
            var delayStart = panStart * usePanDelayStart * maxDelaySamples / 10;
            var delayEnd = panEnd * usePanDelayEnd * maxDelaySamples / 10;
            var delayStartL = Math.max(0.0, delayStart);
            var delayStartR = Math.max(0.0, -delayStart);
            var delayEndL = Math.max(0.0, delayEnd);
            var delayEndR = Math.max(0.0, -delayEnd);
            this.panningVolumeL = volumeStartL;
            this.panningVolumeR = volumeStartR;
            this.panningVolumeDeltaL = (volumeEndL - volumeStartL) / roundedSamplesPerTick;
            this.panningVolumeDeltaR = (volumeEndR - volumeStartR) / roundedSamplesPerTick;
            this.panningOffsetL = this.panningDelayPos - delayStartL + synth.panningDelayBufferSize;
            this.panningOffsetR = this.panningDelayPos - delayStartR + synth.panningDelayBufferSize;
            this.panningOffsetDeltaL = (delayEndL - delayStartL) / roundedSamplesPerTick;
            this.panningOffsetDeltaR = (delayEndR - delayStartR) / roundedSamplesPerTick;
        }
        if (usesChorus) {
            var chorusEnvelopeStart = envelopeStarts[45 /* EnvelopeComputeIndex.chorus */];
            var chorusEnvelopeEnd = envelopeEnds[45 /* EnvelopeComputeIndex.chorus */];
            var useChorusStart = instrument.chorus;
            var useChorusEnd = instrument.chorus;
            // Check for chorus mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["chorus"].index, channelIndex, instrumentIndex)) {
                useChorusStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["chorus"].index, channelIndex, instrumentIndex, false);
                useChorusEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["chorus"].index, channelIndex, instrumentIndex, true);
            }
            var chorusStart = Math.min(1.0, chorusEnvelopeStart * useChorusStart / (SynthConfig_1.Config.chorusRange - 1));
            var chorusEnd = Math.min(1.0, chorusEnvelopeEnd * useChorusEnd / (SynthConfig_1.Config.chorusRange - 1));
            chorusStart = chorusStart * 0.6 + (Math.pow(chorusStart, 6.0)) * 0.4;
            chorusEnd = chorusEnd * 0.6 + (Math.pow(chorusEnd, 6.0)) * 0.4;
            var chorusCombinedMultStart = 1.0 / Math.sqrt(3.0 * chorusStart * chorusStart + 1.0);
            var chorusCombinedMultEnd = 1.0 / Math.sqrt(3.0 * chorusEnd * chorusEnd + 1.0);
            this.chorusVoiceMult = chorusStart;
            this.chorusVoiceMultDelta = (chorusEnd - chorusStart) / roundedSamplesPerTick;
            this.chorusCombinedMult = chorusCombinedMultStart;
            this.chorusCombinedMultDelta = (chorusCombinedMultEnd - chorusCombinedMultStart) / roundedSamplesPerTick;
        }
        if (usesRingModulation) {
            var useRingModStart = instrument.ringModulation;
            var useRingModEnd = instrument.ringModulation;
            var useRingModEnvelopeStart = envelopeStarts[49 /* EnvelopeComputeIndex.ringModulation */];
            var useRingModEnvelopeEnd = envelopeEnds[49 /* EnvelopeComputeIndex.ringModulation */];
            var useRingModHzStart = Math.min(1.0, instrument.ringModulationHz / (SynthConfig_1.Config.ringModHzRange - 1));
            var useRingModHzEnd = Math.min(1.0, instrument.ringModulationHz / (SynthConfig_1.Config.ringModHzRange - 1));
            var useRingModHzEnvelopeStart = envelopeStarts[50 /* EnvelopeComputeIndex.ringModulationHz */];
            var useRingModHzEnvelopeEnd = envelopeEnds[50 /* EnvelopeComputeIndex.ringModulationHz */];
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["ring modulation"].index, channelIndex, instrumentIndex)) {
                useRingModStart = (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["ring modulation"].index, channelIndex, instrumentIndex, false));
                useRingModEnd = (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["ring modulation"].index, channelIndex, instrumentIndex, true));
            }
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["ring mod hertz"].index, channelIndex, instrumentIndex)) {
                useRingModHzStart = Math.min(1.0, Math.max(0.0, (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["ring mod hertz"].index, channelIndex, instrumentIndex, false)) / (SynthConfig_1.Config.ringModHzRange - 1)));
                useRingModHzEnd = Math.min(1.0, Math.max(0.0, (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["ring mod hertz"].index, channelIndex, instrumentIndex, false)) / (SynthConfig_1.Config.ringModHzRange - 1)));
            }
            useRingModHzStart *= useRingModHzEnvelopeStart;
            useRingModHzEnd *= useRingModHzEnvelopeEnd;
            var ringModStart = Math.min(1.0, (useRingModStart * useRingModEnvelopeStart) / (SynthConfig_1.Config.ringModRange - 1));
            var ringModEnd = Math.min(1.0, (useRingModEnd * useRingModEnvelopeEnd) / (SynthConfig_1.Config.ringModRange - 1));
            this.ringModMix = ringModStart;
            this.ringModMixDelta = (ringModEnd - ringModStart) / roundedSamplesPerTick;
            this.ringModHzOffset = instrument.ringModHzOffset;
            var ringModPhaseDeltaStart = (Math.max(0, (0, SynthConfig_1.calculateRingModHertz)(useRingModHzStart))) / synth.samplesPerSecond;
            var ringModPhaseDeltaEnd = (Math.max(0, (0, SynthConfig_1.calculateRingModHertz)(useRingModHzEnd))) / synth.samplesPerSecond;
            if (useRingModHzStart < 1 / (SynthConfig_1.Config.ringModHzRange - 1) || useRingModHzEnd < 1 / (SynthConfig_1.Config.ringModHzRange - 1)) {
                ringModPhaseDeltaStart *= useRingModHzStart * (SynthConfig_1.Config.ringModHzRange - 1);
                ringModPhaseDeltaEnd *= useRingModHzEnd * (SynthConfig_1.Config.ringModHzRange - 1);
            }
            this.ringModMixFadeDelta = 0;
            if (this.ringModMixFade < 0)
                this.ringModMixFade = 0;
            if (ringModPhaseDeltaStart <= 0 && ringModPhaseDeltaEnd <= 0 && this.ringModMixFade != 0) {
                this.ringModMixFadeDelta = this.ringModMixFade / -40;
            }
            else if (ringModPhaseDeltaStart > 0 && ringModPhaseDeltaEnd > 0) {
                this.ringModMixFade = 1.0;
            }
            this.ringModPhaseDelta = ringModPhaseDeltaStart;
            this.ringModPhaseDeltaScale = ringModPhaseDeltaStart == 0 ? 1 : Math.pow(ringModPhaseDeltaEnd / ringModPhaseDeltaStart, 1.0 / roundedSamplesPerTick);
            this.ringModWaveformIndex = instrument.ringModWaveformIndex;
            this.ringModPulseWidth = instrument.ringModPulseWidth;
        }
        var maxEchoMult = 0.0;
        var averageEchoDelaySeconds = 0.0;
        if (usesEcho) {
            var echoSustainEnvelopeStart = envelopeStarts[46 /* EnvelopeComputeIndex.echoSustain */];
            var echoSustainEnvelopeEnd = envelopeEnds[46 /* EnvelopeComputeIndex.echoSustain */];
            var useEchoSustainStart = instrument.echoSustain;
            var useEchoSustainEnd = instrument.echoSustain;
            // Check for echo mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["echo"].index, channelIndex, instrumentIndex)) {
                useEchoSustainStart = Math.max(0.0, synth.getModValue(SynthConfig_1.Config.modulators.dictionary["echo"].index, channelIndex, instrumentIndex, false));
                useEchoSustainEnd = Math.max(0.0, synth.getModValue(SynthConfig_1.Config.modulators.dictionary["echo"].index, channelIndex, instrumentIndex, true));
            }
            var echoMultStart = Math.min(1.0, Math.pow(echoSustainEnvelopeStart * useEchoSustainStart / SynthConfig_1.Config.echoSustainRange, 1.1)) * 0.9;
            var echoMultEnd = Math.min(1.0, Math.pow(echoSustainEnvelopeEnd * useEchoSustainEnd / SynthConfig_1.Config.echoSustainRange, 1.1)) * 0.9;
            this.echoMult = echoMultStart;
            this.echoMultDelta = Math.max(0.0, (echoMultEnd - echoMultStart) / roundedSamplesPerTick);
            maxEchoMult = Math.max(echoMultStart, echoMultEnd);
            // TODO: After computing a tick's settings once for multiple run lengths (which is
            // good for audio worklet threads), compute the echo delay envelopes at tick (or
            // part) boundaries to interpolate between two delay taps.
            // slarmoo - I decided instead to enable and have the artifacts be part of the sound. 
            // Worst case scenario I add a toggle for if upstream it gets done differently
            var echoDelayEnvelopeStart = envelopeStarts[55 /* EnvelopeComputeIndex.echoDelay */];
            var echoDelayEnvelopeEnd = envelopeEnds[55 /* EnvelopeComputeIndex.echoDelay */];
            var useEchoDelayStart = instrument.echoDelay * echoDelayEnvelopeStart;
            var useEchoDelayEnd = instrument.echoDelay * echoDelayEnvelopeEnd;
            // Check for echo delay mods
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["echo delay"].index, channelIndex, instrumentIndex)) {
                useEchoDelayStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["echo delay"].index, channelIndex, instrumentIndex, false) * echoDelayEnvelopeStart;
                useEchoDelayEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["echo delay"].index, channelIndex, instrumentIndex, true) * echoDelayEnvelopeEnd;
            }
            var tmpEchoDelayOffsetStart = Math.round((useEchoDelayStart + 1) * SynthConfig_1.Config.echoDelayStepTicks * samplesPerTick);
            var tmpEchoDelayOffsetEnd = Math.round((useEchoDelayEnd + 1) * SynthConfig_1.Config.echoDelayStepTicks * samplesPerTick);
            if (this.echoDelayOffsetEnd != null) {
                this.echoDelayOffsetStart = this.echoDelayOffsetEnd;
            }
            else {
                this.echoDelayOffsetStart = tmpEchoDelayOffsetStart;
            }
            this.echoDelayOffsetEnd = tmpEchoDelayOffsetEnd;
            averageEchoDelaySeconds = (this.echoDelayOffsetStart + this.echoDelayOffsetEnd) * 0.5 / samplesPerSecond;
            this.echoDelayOffsetRatio = 0.0;
            this.echoDelayOffsetRatioDelta = 1.0 / roundedSamplesPerTick;
            var shelfRadians = 2.0 * Math.PI * SynthConfig_1.Config.echoShelfHz / synth.samplesPerSecond;
            Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, SynthConfig_1.Config.echoShelfGain);
            this.echoShelfA1 = Synth.tempFilterStartCoefficients.a[1];
            this.echoShelfB0 = Synth.tempFilterStartCoefficients.b[0];
            this.echoShelfB1 = Synth.tempFilterStartCoefficients.b[1];
        }
        var maxReverbMult = 0.0;
        if (usesPhaser) {
            var phaserMinFeedback = 0.0;
            var phaserMaxFeedback = 0.95;
            var phaserFeedbackMultSlider = instrument.phaserFeedback / SynthConfig_1.Config.phaserFeedbackRange;
            var phaserFeedbackMultEnvelopeStart = envelopeStarts[58 /* EnvelopeComputeIndex.phaserFeedback */];
            var phaserFeedbackMultEnvelopeEnd = envelopeEnds[58 /* EnvelopeComputeIndex.phaserFeedback */];
            var phaserFeedbackMultRawStart = phaserFeedbackMultSlider * phaserFeedbackMultEnvelopeStart;
            var phaserFeedbackMultRawEnd = phaserFeedbackMultSlider * phaserFeedbackMultEnvelopeEnd;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["phaser feedback"].index, channelIndex, instrumentIndex)) {
                phaserFeedbackMultRawStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser feedback"].index, channelIndex, instrumentIndex, false) / (SynthConfig_1.Config.phaserFeedbackRange);
                phaserFeedbackMultRawEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser feedback"].index, channelIndex, instrumentIndex, true) / (SynthConfig_1.Config.phaserFeedbackRange);
            }
            var phaserFeedbackMultStart = Math.max(phaserMinFeedback, Math.min(phaserMaxFeedback, phaserFeedbackMultRawStart));
            var phaserFeedbackMultEnd = Math.max(phaserMinFeedback, Math.min(phaserMaxFeedback, phaserFeedbackMultRawEnd));
            this.phaserFeedbackMult = phaserFeedbackMultStart;
            this.phaserFeedbackMultDelta = (phaserFeedbackMultEnd - phaserFeedbackMultStart) / roundedSamplesPerTick;
            var phaserMixSlider = instrument.phaserMix / (SynthConfig_1.Config.phaserMixRange - 1);
            var phaserMixEnvelopeStart = envelopeStarts[57 /* EnvelopeComputeIndex.phaserMix */];
            var phaserMixEnvelopeEnd = envelopeEnds[57 /* EnvelopeComputeIndex.phaserMix */];
            var phaserMixStart = phaserMixSlider * phaserMixEnvelopeStart;
            var phaserMixEnd = phaserMixSlider * phaserMixEnvelopeEnd;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["phaser"].index, channelIndex, instrumentIndex)) {
                phaserMixStart = Math.max(0, Math.min(SynthConfig_1.Config.phaserMixRange - 1, synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser"].index, channelIndex, instrumentIndex, false))) / (SynthConfig_1.Config.phaserMixRange - 1);
                phaserMixEnd = Math.max(0, Math.min(SynthConfig_1.Config.phaserMixRange - 1, synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser"].index, channelIndex, instrumentIndex, true))) / (SynthConfig_1.Config.phaserMixRange - 1);
            }
            this.phaserMix = phaserMixStart;
            this.phaserMixDelta = (phaserMixEnd - phaserMixStart) / roundedSamplesPerTick;
            // @TODO: Use filtering.ts
            var phaserBreakFreqSlider = instrument.phaserFreq / (SynthConfig_1.Config.phaserFreqRange - 1);
            var phaserBreakFreqEnvelopeStart = envelopeStarts[56 /* EnvelopeComputeIndex.phaserFreq */];
            var phaserBreakFreqEnvelopeEnd = envelopeEnds[56 /* EnvelopeComputeIndex.phaserFreq */];
            var phaserBreakFreqRawStart = phaserBreakFreqSlider * phaserBreakFreqEnvelopeStart;
            var phaserBreakFreqRawEnd = phaserBreakFreqSlider * phaserBreakFreqEnvelopeEnd;
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["phaser frequency"].index, channelIndex, instrumentIndex)) {
                phaserBreakFreqRawStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser frequency"].index, channelIndex, instrumentIndex, false) / (SynthConfig_1.Config.phaserFreqRange);
                phaserBreakFreqRawEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser frequency"].index, channelIndex, instrumentIndex, true) / (SynthConfig_1.Config.phaserFreqRange);
            }
            var phaserBreakFreqRemappedStart = SynthConfig_1.Config.phaserMinFreq * Math.pow(SynthConfig_1.Config.phaserMaxFreq / SynthConfig_1.Config.phaserMinFreq, phaserBreakFreqRawStart);
            var phaserBreakFreqRemappedEnd = SynthConfig_1.Config.phaserMinFreq * Math.pow(SynthConfig_1.Config.phaserMaxFreq / SynthConfig_1.Config.phaserMinFreq, phaserBreakFreqRawEnd);
            var phaserBreakFreqStart = Math.max(SynthConfig_1.Config.phaserMinFreq, Math.min(SynthConfig_1.Config.phaserMaxFreq, phaserBreakFreqRemappedStart));
            var phaserBreakFreqStartT = Math.tan(Math.PI * phaserBreakFreqStart / samplesPerSecond);
            var phaserBreakCoefStart = (phaserBreakFreqStartT - 1) / (phaserBreakFreqStartT + 1);
            var phaserBreakFreqEnd = Math.max(SynthConfig_1.Config.phaserMinFreq, Math.min(SynthConfig_1.Config.phaserMaxFreq, phaserBreakFreqRemappedEnd));
            var phaserBreakFreqEndT = Math.tan(Math.PI * phaserBreakFreqEnd / samplesPerSecond);
            var phaserBreakCoefEnd = (phaserBreakFreqEndT - 1) / (phaserBreakFreqEndT + 1);
            this.phaserBreakCoef = phaserBreakCoefStart;
            this.phaserBreakCoefDelta = (phaserBreakCoefEnd - phaserBreakCoefStart) / roundedSamplesPerTick;
            var phaserStagesEnvelopeStart = envelopeStarts[59 /* EnvelopeComputeIndex.phaserStages */];
            var phaserStagesEnvelopeEnd = envelopeEnds[59 /* EnvelopeComputeIndex.phaserStages */];
            var phaserStagesSlider = instrument.phaserStages;
            var phaserStagesStart = Math.max(SynthConfig_1.Config.phaserMinStages, Math.min(SynthConfig_1.Config.phaserMaxStages, phaserStagesSlider * phaserStagesEnvelopeStart));
            var phaserStagesEnd = Math.max(SynthConfig_1.Config.phaserMinStages, Math.min(SynthConfig_1.Config.phaserMaxStages, phaserStagesSlider * phaserStagesEnvelopeEnd));
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["phaser stages"].index, channelIndex, instrumentIndex)) {
                phaserStagesStart = Math.round(synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser stages"].index, channelIndex, instrumentIndex, false));
                phaserStagesEnd = Math.round(synth.getModValue(SynthConfig_1.Config.modulators.dictionary["phaser stages"].index, channelIndex, instrumentIndex, false));
            }
            this.phaserStages = phaserStagesStart;
            this.phaserStagesDelta = (phaserStagesEnd - phaserStagesStart) / roundedSamplesPerTick;
        }
        if (usesReverb) {
            var reverbEnvelopeStart = envelopeStarts[47 /* EnvelopeComputeIndex.reverb */];
            var reverbEnvelopeEnd = envelopeEnds[47 /* EnvelopeComputeIndex.reverb */];
            var useReverbStart = instrument.reverb;
            var useReverbEnd = instrument.reverb;
            // Check for mod reverb, instrument level
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["reverb"].index, channelIndex, instrumentIndex)) {
                useReverbStart = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["reverb"].index, channelIndex, instrumentIndex, false);
                useReverbEnd = synth.getModValue(SynthConfig_1.Config.modulators.dictionary["reverb"].index, channelIndex, instrumentIndex, true);
            }
            // Check for mod reverb, song scalar
            if (synth.isModActive(SynthConfig_1.Config.modulators.dictionary["song reverb"].index, channelIndex, instrumentIndex)) {
                useReverbStart *= (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["song reverb"].index, undefined, undefined, false) - SynthConfig_1.Config.modulators.dictionary["song reverb"].convertRealFactor) / SynthConfig_1.Config.reverbRange;
                useReverbEnd *= (synth.getModValue(SynthConfig_1.Config.modulators.dictionary["song reverb"].index, undefined, undefined, true) - SynthConfig_1.Config.modulators.dictionary["song reverb"].convertRealFactor) / SynthConfig_1.Config.reverbRange;
            }
            var reverbStart = Math.min(1.0, Math.pow(reverbEnvelopeStart * useReverbStart / SynthConfig_1.Config.reverbRange, 0.667)) * 0.425;
            var reverbEnd = Math.min(1.0, Math.pow(reverbEnvelopeEnd * useReverbEnd / SynthConfig_1.Config.reverbRange, 0.667)) * 0.425;
            this.reverbMult = reverbStart;
            this.reverbMultDelta = (reverbEnd - reverbStart) / roundedSamplesPerTick;
            maxReverbMult = Math.max(reverbStart, reverbEnd);
            var shelfRadians = 2.0 * Math.PI * SynthConfig_1.Config.reverbShelfHz / synth.samplesPerSecond;
            Synth.tempFilterStartCoefficients.highShelf1stOrder(shelfRadians, SynthConfig_1.Config.reverbShelfGain);
            this.reverbShelfA1 = Synth.tempFilterStartCoefficients.a[1];
            this.reverbShelfB0 = Synth.tempFilterStartCoefficients.b[0];
            this.reverbShelfB1 = Synth.tempFilterStartCoefficients.b[1];
        }
        if (this.tonesAddedInThisTick) {
            this.attentuationProgress = 0.0;
            this.flushedSamples = 0;
            this.flushingDelayLines = false;
        }
        else if (!this.flushingDelayLines) {
            // If this instrument isn't playing tones anymore, the volume can fade out by the
            // end of the first tick. It's possible for filters and the panning delay line to
            // continue past the end of the tone but they should have mostly dissipated by the
            // end of the tick anyway.
            if (this.attentuationProgress == 0.0) {
                eqFilterVolumeEnd = 0.0;
            }
            else {
                eqFilterVolumeStart = 0.0;
                eqFilterVolumeEnd = 0.0;
            }
            var attenuationThreshold = 1.0 / 256.0; // when the delay line signal has attenuated this much, it should be inaudible and should be flushed to zero.
            var halfLifeMult = -Math.log2(attenuationThreshold);
            var delayDuration = 0.0;
            if (usesChorus) {
                delayDuration += SynthConfig_1.Config.chorusMaxDelay;
            }
            if (usesEcho) {
                var attenuationPerSecond = Math.pow(maxEchoMult, 1.0 / averageEchoDelaySeconds);
                var halfLife = -1.0 / Math.log2(attenuationPerSecond);
                var echoDuration = halfLife * halfLifeMult;
                delayDuration += echoDuration;
            }
            if (usesReverb) {
                var averageMult = maxReverbMult * 2.0;
                var averageReverbDelaySeconds = (SynthConfig_1.Config.reverbDelayBufferSize / 4.0) / samplesPerSecond;
                var attenuationPerSecond = Math.pow(averageMult, 1.0 / averageReverbDelaySeconds);
                var halfLife = -1.0 / Math.log2(attenuationPerSecond);
                var reverbDuration = halfLife * halfLifeMult;
                delayDuration += reverbDuration;
            }
            if (usesGranular) {
                this.computeGrains = false;
            }
            var secondsInTick = samplesPerTick / samplesPerSecond;
            var progressInTick = secondsInTick / delayDuration;
            var progressAtEndOfTick = this.attentuationProgress + progressInTick;
            if (progressAtEndOfTick >= 1.0) {
                delayInputMultEnd = 0.0;
            }
            this.attentuationProgress = progressAtEndOfTick;
            if (this.attentuationProgress >= 1.0) {
                this.flushingDelayLines = true;
            }
        }
        else {
            // Flushing delay lines to zero since the signal has mostly dissipated.
            eqFilterVolumeStart = 0.0;
            eqFilterVolumeEnd = 0.0;
            delayInputMultStart = 0.0;
            delayInputMultEnd = 0.0;
            var totalDelaySamples = 0;
            if (usesChorus)
                totalDelaySamples += synth.chorusDelayBufferSize;
            if (usesEcho)
                totalDelaySamples += this.echoDelayLineL.length;
            if (usesReverb)
                totalDelaySamples += SynthConfig_1.Config.reverbDelayBufferSize;
            if (usesGranular)
                totalDelaySamples += this.granularMaximumDelayTimeInSeconds;
            this.flushedSamples += roundedSamplesPerTick;
            if (this.flushedSamples >= totalDelaySamples) {
                this.deactivateAfterThisTick = true;
            }
        }
        this.eqFilterVolume = eqFilterVolumeStart;
        this.eqFilterVolumeDelta = (eqFilterVolumeEnd - eqFilterVolumeStart) / roundedSamplesPerTick;
        this.delayInputMult = delayInputMultStart;
        this.delayInputMultDelta = (delayInputMultEnd - delayInputMultStart) / roundedSamplesPerTick;
        this.envelopeComputer.clearEnvelopes();
    };
    InstrumentState.prototype.updateWaves = function (instrument, samplesPerSecond) {
        this.volumeScale = 1.0;
        if (instrument.type == 0 /* InstrumentType.chip */) {
            this.wave = (this.aliases) ? SynthConfig_1.Config.rawChipWaves[instrument.chipWave].samples : SynthConfig_1.Config.chipWaves[instrument.chipWave].samples;
            // advloop addition
            this.isUsingAdvancedLoopControls = instrument.isUsingAdvancedLoopControls;
            this.chipWaveLoopStart = instrument.chipWaveLoopStart;
            this.chipWaveLoopEnd = instrument.chipWaveLoopEnd;
            this.chipWaveLoopMode = instrument.chipWaveLoopMode;
            this.chipWavePlayBackwards = instrument.chipWavePlayBackwards;
            this.chipWaveStartOffset = instrument.chipWaveStartOffset;
            // advloop addition
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 6 /* InstrumentType.pwm */) {
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 9 /* InstrumentType.customChipWave */) {
            this.wave = (this.aliases) ? instrument.customChipWave : instrument.customChipWaveIntegral;
            this.volumeScale = 0.05;
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 2 /* InstrumentType.noise */) {
            this.wave = (0, SynthConfig_1.getDrumWave)(instrument.chipNoise, FFT_1.inverseRealFourierTransform, FFT_1.scaleElementsByFactor);
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 5 /* InstrumentType.harmonics */) {
            this.wave = this.harmonicsWave.getCustomWave(instrument.harmonicsWave, instrument.type);
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 7 /* InstrumentType.pickedString */) {
            this.wave = this.harmonicsWave.getCustomWave(instrument.harmonicsWave, instrument.type);
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 3 /* InstrumentType.spectrum */) {
            this.wave = this.spectrumWave.getCustomWave(instrument.spectrumWave, 8);
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 4 /* InstrumentType.drumset */) {
            for (var i = 0; i < SynthConfig_1.Config.drumCount; i++) {
                this.drumsetSpectrumWaves[i].getCustomWave(instrument.drumsetSpectrumWaves[i], InstrumentState._drumsetIndexToSpectrumOctave(i));
            }
            this.wave = null;
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else if (instrument.type == 8 /* InstrumentType.supersaw */) {
            this.unisonVoices = instrument.unisonVoices;
            this.unisonSpread = instrument.unisonSpread;
            this.unisonOffset = instrument.unisonOffset;
            this.unisonExpression = instrument.unisonExpression;
            this.unisonSign = instrument.unisonSign;
        }
        else {
            this.wave = null;
        }
    };
    InstrumentState.prototype.getDrumsetWave = function (pitch) {
        if (this.type == 4 /* InstrumentType.drumset */) {
            return this.drumsetSpectrumWaves[pitch].wave;
        }
        else {
            throw new Error("Unhandled instrument type in getDrumsetWave");
        }
    };
    InstrumentState.drumsetIndexReferenceDelta = function (index) {
        return Instrument.frequencyFromPitch(SynthConfig_1.Config.spectrumBasePitch + index * 6) / 44100;
    };
    InstrumentState._drumsetIndexToSpectrumOctave = function (index) {
        return 15 + Math.log2(InstrumentState.drumsetIndexReferenceDelta(index));
    };
    return InstrumentState;
}());
var ChannelState = /** @class */ (function () {
    function ChannelState() {
        this.instruments = [];
        this.muted = false;
        this.singleSeamlessInstrument = null; // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
    }
    return ChannelState;
}());
function generateRandomNotes(beatsPerBar, rhythm) {
    var notes = [];
    var ticksPerBeat = SynthConfig_1.Config.rhythms[rhythm].stepsPerBeat;
    var totalTicks = beatsPerBar * ticksPerBeat;
    var scaleDegrees = [0, 2, 4, 5, 7, 9, 11];
    var currentTick = 0;
    while (currentTick < totalTicks) {
        var lengths = [ticksPerBeat, ticksPerBeat * 2];
        var length = lengths[Math.floor(Math.random() * lengths.length)];
        var end = Math.min(currentTick + length, totalTicks);
        if (Math.random() > 0.3) {
            var octave = 3 + Math.floor(Math.random() * 2);
            var degree = scaleDegrees[Math.floor(Math.random() * scaleDegrees.length)];
            var pitch = octave * 12 + degree;
            var size = 60 + Math.floor(Math.random() * 40);
            notes.push(new Note(pitch, currentTick, end, size, false));
        }
        currentTick = end;
    }
    return notes;
}

function generateRandomSong() {
    var song = new Song();
    song.initToDefault(true);
    song.title = "AI Generated";
    song.tempo = 120 + Math.floor(Math.random() * 60);
    song.scale = Math.floor(Math.random() * SynthConfig_1.Config.scales.length);
    song.key = Math.floor(Math.random() * 12);
    song.beatsPerBar = 4;
    song.barCount = 4;
    song.loopStart = 0;
    song.loopLength = song.barCount;
    song.rhythm = Math.floor(Math.random() * SynthConfig_1.Config.rhythms.length);
    for (var i = 0; i < song.channels.length; i++) {
        var channel = song.channels[i];
        for (var j = 0; j < channel.patterns.length; j++) {
            var pattern = channel.patterns[j];
            pattern.notes = generateRandomNotes(song.beatsPerBar, song.rhythm);
        }
    }
    return song.toBase64String();
}
window.generateRandomSong = generateRandomSong;
window.generateRandomNotes = generateRandomNotes;

var Synth = /** @class */ (function () {
    function Synth(song) {
        if (song === void 0) { song = null; }
        var _this = this;
        this.samplesPerSecond = 44100;
        // TODO: reverb
        this.song = null;
        this.preferLowerLatency = false; // enable when recording performances from keyboard or MIDI. Takes effect next time you activate audio.
        this.anticipatePoorPerformance = false; // enable on mobile devices to reduce audio stutter glitches. Takes effect next time you activate audio.
        this.liveInputDuration = 0;
        this.liveBassInputDuration = 0;
        this.liveInputStarted = false;
        this.liveBassInputStarted = false;
        this.liveInputPitches = [];
        this.liveBassInputPitches = [];
        this.liveInputChannel = 0;
        this.liveBassInputChannel = 0;
        this.liveInputInstruments = [];
        this.liveBassInputInstruments = [];
        this.loopRepeatCount = -1;
        this.volume = 1.0;
        this.oscRefreshEventTimer = 0;
        this.oscEnabled = true;
        this.enableMetronome = false;
        this.countInMetronome = false;
        this.renderingSong = false;
        this.heldMods = [];
        this.wantToSkip = false;
        this.playheadInternal = 0.0;
        this.bar = 0;
        this.prevBar = null;
        this.nextBar = null;
        this.beat = 0;
        this.part = 0;
        this.tick = 0;
        this.isAtStartOfTick = true;
        this.isAtEndOfTick = true;
        this.tickSampleCountdown = 0;
        this.modValues = [];
        this.modInsValues = [];
        this.nextModValues = [];
        this.nextModInsValues = [];
        this.isPlayingSong = false;
        this.isRecording = false;
        this.liveInputEndTime = 0.0;
        this.browserAutomaticallyClearsAudioBuffer = true; // Assume true until proven otherwise. Older Chrome does not clear the buffer so it needs to be cleared manually.
        this.tempDrumSetControlPoint = new FilterControlPoint();
        this.tempFrequencyResponse = new filtering_1.FrequencyResponse();
        this.loopBarStart = -1;
        this.loopBarEnd = -1;
        this.channels = [];
        this.tonePool = new Deque_1.Deque();
        this.tempMatchedPitchTones = Array(SynthConfig_1.Config.maxChordSize).fill(null);
        this.startedMetronome = false;
        this.metronomeSamplesRemaining = -1;
        this.metronomeAmplitude = 0.0;
        this.metronomePrevAmplitude = 0.0;
        this.metronomeFilter = 0.0;
        this.limit = 0.0;
        this.songEqFilterVolume = 1.0;
        this.songEqFilterVolumeDelta = 0.0;
        this.songEqFiltersL = [];
        this.songEqFiltersR = [];
        this.songEqFilterCount = 0;
        this.initialSongEqFilterInput1L = 0.0;
        this.initialSongEqFilterInput2L = 0.0;
        this.initialSongEqFilterInput1R = 0.0;
        this.initialSongEqFilterInput2R = 0.0;
        this.tempMonoInstrumentSampleBuffer = null;
        this.outputDataLUnfiltered = null;
        this.outputDataRUnfiltered = null;
        this.audioCtx = null;
        this.scriptNode = null;
        this.audioProcessCallback = function (audioProcessingEvent) {
            var outputBuffer = audioProcessingEvent.outputBuffer;
            var outputDataL = outputBuffer.getChannelData(0);
            var outputDataR = outputBuffer.getChannelData(1);
            if (_this.browserAutomaticallyClearsAudioBuffer && (outputDataL[0] != 0.0 || outputDataR[0] != 0.0 || outputDataL[outputBuffer.length - 1] != 0.0 || outputDataR[outputBuffer.length - 1] != 0.0)) {
                // If the buffer is ever initially nonzero, then this must be an older browser that doesn't automatically clear the audio buffer.
                _this.browserAutomaticallyClearsAudioBuffer = false;
            }
            if (!_this.browserAutomaticallyClearsAudioBuffer) {
                // If this browser does not clear the buffer automatically, do so manually before continuing.
                var length_1 = outputBuffer.length;
                for (var i = 0; i < length_1; i++) {
                    outputDataL[i] = 0.0;
                    outputDataR[i] = 0.0;
                }
            }
            if (!_this.isPlayingSong && performance.now() >= _this.liveInputEndTime) {
                _this.deactivateAudio();
            }
            else {
                _this.synthesize(outputDataL, outputDataR, outputBuffer.length, _this.isPlayingSong);
                if (_this.oscEnabled) {
                    if (_this.oscRefreshEventTimer <= 0) {
                        Events_1.events.raise("oscilloscopeUpdate", outputDataL, outputDataR);
                        _this.oscRefreshEventTimer = 2;
                    }
                    else {
                        _this.oscRefreshEventTimer--;
                    }
                }
            }
        };
        this.computeDelayBufferSizes();
        if (song != null)
            this.setSong(song);
    }
    Synth.prototype.syncSongState = function () {
        var channelCount = this.song.getChannelCount();
        for (var i = this.channels.length; i < channelCount; i++) {
            this.channels[i] = new ChannelState();
        }
        this.channels.length = channelCount;
        for (var i = 0; i < channelCount; i++) {
            var channel = this.song.channels[i];
            var channelState = this.channels[i];
            for (var j = channelState.instruments.length; j < channel.instruments.length; j++) {
                channelState.instruments[j] = new InstrumentState();
            }
            channelState.instruments.length = channel.instruments.length;
            if (channelState.muted != channel.muted) {
                channelState.muted = channel.muted;
                if (channelState.muted) {
                    for (var _i = 0, _a = channelState.instruments; _i < _a.length; _i++) {
                        var instrumentState = _a[_i];
                        instrumentState.resetAllEffects();
                    }
                }
            }
        }
    };
    Synth.prototype.initModFilters = function (song) {
        if (song != null) {
            song.tmpEqFilterStart = song.eqFilter;
            song.tmpEqFilterEnd = null;
            for (var channelIndex = 0; channelIndex < song.getChannelCount(); channelIndex++) {
                for (var instrumentIndex = 0; instrumentIndex < song.channels[channelIndex].instruments.length; instrumentIndex++) {
                    var instrument = song.channels[channelIndex].instruments[instrumentIndex];
                    instrument.tmpEqFilterStart = instrument.eqFilter;
                    instrument.tmpEqFilterEnd = null;
                    instrument.tmpNoteFilterStart = instrument.noteFilter;
                    instrument.tmpNoteFilterEnd = null;
                }
            }
        }
    };
    Synth.prototype.warmUpSynthesizer = function (song) {
        // Don't bother to generate the drum waves unless the song actually
        // uses them, since they may require a lot of computation.
        if (song != null) {
            this.syncSongState();
            var samplesPerTick = this.getSamplesPerTick();
            for (var channelIndex = 0; channelIndex < song.getChannelCount(); channelIndex++) {
                for (var instrumentIndex = 0; instrumentIndex < song.channels[channelIndex].instruments.length; instrumentIndex++) {
                    var instrument = song.channels[channelIndex].instruments[instrumentIndex];
                    var instrumentState = this.channels[channelIndex].instruments[instrumentIndex];
                    Synth.getInstrumentSynthFunction(instrument);
                    instrumentState.vibratoTime = 0;
                    instrumentState.nextVibratoTime = 0;
                    for (var envelopeIndex = 0; envelopeIndex < SynthConfig_1.Config.maxEnvelopeCount + 1; envelopeIndex++)
                        instrumentState.envelopeTime[envelopeIndex] = 0;
                    instrumentState.arpTime = 0;
                    instrumentState.updateWaves(instrument, this.samplesPerSecond);
                    instrumentState.allocateNecessaryBuffers(this, instrument, samplesPerTick);
                }
            }
        }
        // JummBox needs to run synth functions for at least one sample (for JIT purposes)
        // before starting audio callbacks to avoid skipping the initial output.
        var dummyArray = new Float32Array(1);
        this.isPlayingSong = true;
        this.synthesize(dummyArray, dummyArray, 1, true);
        this.isPlayingSong = false;
    };
    Synth.prototype.computeLatestModValues = function () {
        if (this.song != null && this.song.modChannelCount > 0) {
            // Clear all mod values, and set up temp variables for the time a mod would be set at.
            var latestModTimes = [];
            var latestModInsTimes = [];
            this.modValues = [];
            this.nextModValues = [];
            this.modInsValues = [];
            this.nextModInsValues = [];
            this.heldMods = [];
            for (var channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                latestModInsTimes[channel] = [];
                this.modInsValues[channel] = [];
                this.nextModInsValues[channel] = [];
                for (var instrument = 0; instrument < this.song.channels[channel].instruments.length; instrument++) {
                    this.modInsValues[channel][instrument] = [];
                    this.nextModInsValues[channel][instrument] = [];
                    latestModInsTimes[channel][instrument] = [];
                }
            }
            // Find out where we're at in the fraction of the current bar.
            var currentPart = this.beat * SynthConfig_1.Config.partsPerBeat + this.part;
            // For mod channels, calculate last set value for each mod
            for (var channelIndex = this.song.pitchChannelCount + this.song.noiseChannelCount; channelIndex < this.song.getChannelCount(); channelIndex++) {
                if (!(this.song.channels[channelIndex].muted)) {
                    var pattern = void 0;
                    for (var currentBar = this.bar; currentBar >= 0; currentBar--) {
                        pattern = this.song.getPattern(channelIndex, currentBar);
                        if (pattern != null) {
                            var instrumentIdx = pattern.instruments[0];
                            var instrument = this.song.channels[channelIndex].instruments[instrumentIdx];
                            var latestPinParts = [];
                            var latestPinValues = [];
                            var partsInBar = (currentBar == this.bar)
                                ? currentPart
                                : this.findPartsInBar(currentBar);
                            for (var _i = 0, _a = pattern.notes; _i < _a.length; _i++) {
                                var note = _a[_i];
                                if (note.start <= partsInBar && (latestPinParts[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] == null || note.end > latestPinParts[SynthConfig_1.Config.modCount - 1 - note.pitches[0]])) {
                                    if (note.start == partsInBar) { // This can happen with next bar mods, and the value of the aligned note's start pin will be used.
                                        latestPinParts[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] = note.start;
                                        latestPinValues[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] = note.pins[0].size;
                                    }
                                    if (note.end <= partsInBar) {
                                        latestPinParts[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] = note.end;
                                        latestPinValues[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] = note.pins[note.pins.length - 1].size;
                                    }
                                    else {
                                        latestPinParts[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] = partsInBar;
                                        // Find the pin where bar change happens, and compute where pin volume would be at that time
                                        for (var pinIdx = 0; pinIdx < note.pins.length; pinIdx++) {
                                            if (note.pins[pinIdx].time + note.start > partsInBar) {
                                                var transitionLength = note.pins[pinIdx].time - note.pins[pinIdx - 1].time;
                                                var toNextBarLength = partsInBar - note.start - note.pins[pinIdx - 1].time;
                                                var deltaVolume = note.pins[pinIdx].size - note.pins[pinIdx - 1].size;
                                                latestPinValues[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] = Math.round(note.pins[pinIdx - 1].size + deltaVolume * toNextBarLength / transitionLength);
                                                pinIdx = note.pins.length;
                                            }
                                        }
                                    }
                                }
                            }
                            // Set modulator value, if it wasn't set in another pattern already scanned
                            for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                                if (latestPinParts[mod] != null) {
                                    if (SynthConfig_1.Config.modulators[instrument.modulators[mod]].forSong) {
                                        var songFilterParam = instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["song eq"].index;
                                        if (latestModTimes[instrument.modulators[mod]] == null || currentBar * SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod] > latestModTimes[instrument.modulators[mod]]) {
                                            if (songFilterParam) {
                                                var tgtSong = this.song;
                                                if (instrument.modFilterTypes[mod] == 0) {
                                                    tgtSong.tmpEqFilterStart = tgtSong.eqSubFilters[latestPinValues[mod]];
                                                }
                                                else {
                                                    for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                                                        if (tgtSong.tmpEqFilterStart != null && tgtSong.tmpEqFilterStart == tgtSong.eqSubFilters[i]) {
                                                            tgtSong.tmpEqFilterStart = new FilterSettings();
                                                            tgtSong.tmpEqFilterStart.fromJsonObject(tgtSong.eqSubFilters[i].toJsonObject());
                                                            i = SynthConfig_1.Config.filterMorphCount;
                                                        }
                                                    }
                                                    if (tgtSong.tmpEqFilterStart != null && Math.floor((instrument.modFilterTypes[mod] - 1) / 2) < tgtSong.tmpEqFilterStart.controlPointCount) {
                                                        if (instrument.modFilterTypes[mod] % 2)
                                                            tgtSong.tmpEqFilterStart.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].freq = latestPinValues[mod];
                                                        else
                                                            tgtSong.tmpEqFilterStart.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].gain = latestPinValues[mod];
                                                    }
                                                }
                                                tgtSong.tmpEqFilterEnd = tgtSong.tmpEqFilterStart;
                                            }
                                            this.setModValue(latestPinValues[mod], latestPinValues[mod], instrument.modChannels[mod], instrument.modInstruments[mod], instrument.modulators[mod]);
                                            latestModTimes[instrument.modulators[mod]] = currentBar * SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod];
                                        }
                                    }
                                    else {
                                        // Generate list of used instruments
                                        var usedInstruments = [];
                                        // All
                                        if (instrument.modInstruments[mod] == this.song.channels[instrument.modChannels[mod]].instruments.length) {
                                            for (var i = 0; i < this.song.channels[instrument.modChannels[mod]].instruments.length; i++) {
                                                usedInstruments.push(i);
                                            }
                                        } // Active
                                        else if (instrument.modInstruments[mod] > this.song.channels[instrument.modChannels[mod]].instruments.length) {
                                            var tgtPattern = this.song.getPattern(instrument.modChannels[mod], currentBar);
                                            if (tgtPattern != null)
                                                usedInstruments = tgtPattern.instruments;
                                        }
                                        else {
                                            usedInstruments.push(instrument.modInstruments[mod]);
                                        }
                                        for (var instrumentIndex = 0; instrumentIndex < usedInstruments.length; instrumentIndex++) {
                                            // Iterate through all used instruments by this modulator
                                            // Special indices for mod filter targets, since they control multiple things.
                                            var eqFilterParam = instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["eq filter"].index;
                                            var noteFilterParam = instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["note filter"].index;
                                            var modulatorAdjust = instrument.modulators[mod];
                                            if (eqFilterParam) {
                                                modulatorAdjust = SynthConfig_1.Config.modulators.length + (instrument.modFilterTypes[mod] | 0);
                                            }
                                            else if (noteFilterParam) {
                                                // Skip all possible indices for eq filter
                                                modulatorAdjust = SynthConfig_1.Config.modulators.length + 1 + (2 * SynthConfig_1.Config.filterMaxPoints) + (instrument.modFilterTypes[mod] | 0);
                                            }
                                            if (latestModInsTimes[instrument.modChannels[mod]][usedInstruments[instrumentIndex]][modulatorAdjust] == null
                                                || currentBar * SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod] > latestModInsTimes[instrument.modChannels[mod]][usedInstruments[instrumentIndex]][modulatorAdjust]) {
                                                if (eqFilterParam) {
                                                    var tgtInstrument = this.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                                                    if (instrument.modFilterTypes[mod] == 0) {
                                                        tgtInstrument.tmpEqFilterStart = tgtInstrument.eqSubFilters[latestPinValues[mod]];
                                                    }
                                                    else {
                                                        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                                                            if (tgtInstrument.tmpEqFilterStart != null && tgtInstrument.tmpEqFilterStart == tgtInstrument.eqSubFilters[i]) {
                                                                tgtInstrument.tmpEqFilterStart = new FilterSettings();
                                                                tgtInstrument.tmpEqFilterStart.fromJsonObject(tgtInstrument.eqSubFilters[i].toJsonObject());
                                                                i = SynthConfig_1.Config.filterMorphCount;
                                                            }
                                                        }
                                                        if (tgtInstrument.tmpEqFilterStart != null && Math.floor((instrument.modFilterTypes[mod] - 1) / 2) < tgtInstrument.tmpEqFilterStart.controlPointCount) {
                                                            if (instrument.modFilterTypes[mod] % 2)
                                                                tgtInstrument.tmpEqFilterStart.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].freq = latestPinValues[mod];
                                                            else
                                                                tgtInstrument.tmpEqFilterStart.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].gain = latestPinValues[mod];
                                                        }
                                                    }
                                                    tgtInstrument.tmpEqFilterEnd = tgtInstrument.tmpEqFilterStart;
                                                }
                                                else if (noteFilterParam) {
                                                    var tgtInstrument = this.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                                                    if (instrument.modFilterTypes[mod] == 0) {
                                                        tgtInstrument.tmpNoteFilterStart = tgtInstrument.noteSubFilters[latestPinValues[mod]];
                                                    }
                                                    else {
                                                        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                                                            if (tgtInstrument.tmpNoteFilterStart != null && tgtInstrument.tmpNoteFilterStart == tgtInstrument.noteSubFilters[i]) {
                                                                tgtInstrument.tmpNoteFilterStart = new FilterSettings();
                                                                tgtInstrument.tmpNoteFilterStart.fromJsonObject(tgtInstrument.noteSubFilters[i].toJsonObject());
                                                                i = SynthConfig_1.Config.filterMorphCount;
                                                            }
                                                        }
                                                        if (tgtInstrument.tmpNoteFilterStart != null && Math.floor((instrument.modFilterTypes[mod] - 1) / 2) < tgtInstrument.tmpNoteFilterStart.controlPointCount) {
                                                            if (instrument.modFilterTypes[mod] % 2)
                                                                tgtInstrument.tmpNoteFilterStart.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].freq = latestPinValues[mod];
                                                            else
                                                                tgtInstrument.tmpNoteFilterStart.controlPoints[Math.floor((instrument.modFilterTypes[mod] - 1) / 2)].gain = latestPinValues[mod];
                                                        }
                                                    }
                                                    tgtInstrument.tmpNoteFilterEnd = tgtInstrument.tmpNoteFilterStart;
                                                }
                                                else
                                                    this.setModValue(latestPinValues[mod], latestPinValues[mod], instrument.modChannels[mod], usedInstruments[instrumentIndex], modulatorAdjust);
                                                latestModInsTimes[instrument.modChannels[mod]][usedInstruments[instrumentIndex]][modulatorAdjust] = currentBar * SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar + latestPinParts[mod];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    // Detects if a modulator is set, but not valid for the current effects/instrument type/filter type
    // Note, setting 'none' or the intermediary steps when clicking to add a mod, like an unset channel/unset instrument, counts as valid.
    // TODO: This kind of check is mirrored in SongEditor.ts' whenUpdated. Creates a lot of redundancy for adding new mods. Can be moved into new properties for mods, to avoid this later.
    Synth.prototype.determineInvalidModulators = function (instrument) {
        if (this.song == null)
            return;
        for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
            instrument.invalidModulators[mod] = true;
            // For song modulator, valid if any setting used
            if (instrument.modChannels[mod] == -1) {
                if (instrument.modulators[mod] != 0)
                    instrument.invalidModulators[mod] = false;
                continue;
            }
            var channel = this.song.channels[instrument.modChannels[mod]];
            if (channel == null)
                continue;
            var tgtInstrumentList = [];
            if (instrument.modInstruments[mod] >= channel.instruments.length) { // All or active
                tgtInstrumentList = channel.instruments;
            }
            else {
                tgtInstrumentList = [channel.instruments[instrument.modInstruments[mod]]];
            }
            for (var i = 0; i < tgtInstrumentList.length; i++) {
                var tgtInstrument = tgtInstrumentList[i];
                if (tgtInstrument == null)
                    continue;
                var str = SynthConfig_1.Config.modulators[instrument.modulators[mod]].name;
                // Check effects
                if (!((SynthConfig_1.Config.modulators[instrument.modulators[mod]].associatedEffect != 18 /* EffectType.length */ && !(tgtInstrument.effects & (1 << SynthConfig_1.Config.modulators[instrument.modulators[mod]].associatedEffect)))
                    // Instrument type specific
                    || ((tgtInstrument.type != 1 /* InstrumentType.fm */ && tgtInstrument.type != 11 /* InstrumentType.fm6op */) && (str == "fm slider 1" || str == "fm slider 2" || str == "fm slider 3" || str == "fm slider 4" || str == "fm feedback"))
                    || tgtInstrument.type != 11 /* InstrumentType.fm6op */ && (str == "fm slider 5" || str == "fm slider 6")
                    || ((tgtInstrument.type != 6 /* InstrumentType.pwm */ && tgtInstrument.type != 8 /* InstrumentType.supersaw */) && (str == "pulse width" || str == "decimal offset"))
                    || ((tgtInstrument.type != 8 /* InstrumentType.supersaw */) && (str == "dynamism" || str == "spread" || str == "saw shape"))
                    // Arp check
                    || (!tgtInstrument.getChord().arpeggiates && (str == "arp speed" || str == "reset arp"))
                    // EQ Filter check
                    || (tgtInstrument.eqFilterType && str == "eq filter")
                    || (!tgtInstrument.eqFilterType && (str == "eq filt cut" || str == "eq filt peak"))
                    || (str == "eq filter" && Math.floor((instrument.modFilterTypes[mod] + 1) / 2) > tgtInstrument.getLargestControlPointCount(false))
                    // Note Filter check
                    || (tgtInstrument.noteFilterType && str == "note filter")
                    || (!tgtInstrument.noteFilterType && (str == "note filt cut" || str == "note filt peak"))
                    || (str == "note filter" && Math.floor((instrument.modFilterTypes[mod] + 1) / 2) > tgtInstrument.getLargestControlPointCount(true)))) {
                    instrument.invalidModulators[mod] = false;
                    i = tgtInstrumentList.length;
                }
            }
        }
    };
    Synth.operatorAmplitudeCurve = function (amplitude) {
        return (Math.pow(16.0, amplitude / 15.0) - 1.0) / 15.0;
    };
    Object.defineProperty(Synth.prototype, "playing", {
        get: function () {
            return this.isPlayingSong;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Synth.prototype, "recording", {
        get: function () {
            return this.isRecording;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Synth.prototype, "playhead", {
        get: function () {
            return this.playheadInternal;
        },
        set: function (value) {
            if (this.song != null) {
                this.playheadInternal = Math.max(0, Math.min(this.song.barCount, value));
                var remainder = this.playheadInternal;
                this.bar = Math.floor(remainder);
                remainder = this.song.beatsPerBar * (remainder - this.bar);
                this.beat = Math.floor(remainder);
                remainder = SynthConfig_1.Config.partsPerBeat * (remainder - this.beat);
                this.part = Math.floor(remainder);
                remainder = SynthConfig_1.Config.ticksPerPart * (remainder - this.part);
                this.tick = Math.floor(remainder);
                this.tickSampleCountdown = 0;
                this.isAtStartOfTick = true;
                this.prevBar = null;
            }
        },
        enumerable: false,
        configurable: true
    });
    Synth.prototype.getSamplesPerBar = function () {
        if (this.song == null)
            throw new Error();
        return this.getSamplesPerTick() * SynthConfig_1.Config.ticksPerPart * SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar;
    };
    Synth.prototype.getTicksIntoBar = function () {
        return (this.beat * SynthConfig_1.Config.partsPerBeat + this.part) * SynthConfig_1.Config.ticksPerPart + this.tick;
    };
    Synth.prototype.getCurrentPart = function () {
        return (this.beat * SynthConfig_1.Config.partsPerBeat + this.part);
    };
    Synth.prototype.findPartsInBar = function (bar) {
        if (this.song == null)
            return 0;
        var partsInBar = SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar;
        for (var channel = this.song.pitchChannelCount + this.song.noiseChannelCount; channel < this.song.getChannelCount(); channel++) {
            var pattern = this.song.getPattern(channel, bar);
            if (pattern != null) {
                var instrument = this.song.channels[channel].instruments[pattern.instruments[0]];
                for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                    if (instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["next bar"].index) {
                        for (var _i = 0, _a = pattern.notes; _i < _a.length; _i++) {
                            var note = _a[_i];
                            if (note.pitches[0] == (SynthConfig_1.Config.modCount - 1 - mod)) {
                                // Find the earliest next bar note.
                                if (partsInBar > note.start)
                                    partsInBar = note.start;
                            }
                        }
                    }
                }
            }
        }
        return partsInBar;
    };
    // Returns the total samples in the song
    Synth.prototype.getTotalSamples = function (enableIntro, enableOutro, loop) {
        if (this.song == null)
            return -1;
        // Compute the window to be checked (start bar to end bar)
        var startBar = enableIntro ? 0 : this.song.loopStart;
        var endBar = enableOutro ? this.song.barCount : (this.song.loopStart + this.song.loopLength);
        var hasTempoMods = false;
        var hasNextBarMods = false;
        var prevTempo = this.song.tempo;
        // Determine if any tempo or next bar mods happen anywhere in the window
        for (var channel = this.song.getChannelCount() - 1; channel >= this.song.pitchChannelCount + this.song.noiseChannelCount; channel--) {
            for (var bar = startBar; bar < endBar; bar++) {
                var pattern = this.song.getPattern(channel, bar);
                if (pattern != null) {
                    var instrument = this.song.channels[channel].instruments[pattern.instruments[0]];
                    for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                        if (instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["tempo"].index) {
                            hasTempoMods = true;
                        }
                        if (instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["next bar"].index) {
                            hasNextBarMods = true;
                        }
                    }
                }
            }
        }
        // If intro is not zero length, determine what the "entry" tempo is going into the start part, by looking at mods that came before...
        if (startBar > 0) {
            var latestTempoPin = null;
            var latestTempoValue = 0;
            for (var bar = startBar - 1; bar >= 0; bar--) {
                for (var channel = this.song.getChannelCount() - 1; channel >= this.song.pitchChannelCount + this.song.noiseChannelCount; channel--) {
                    var pattern = this.song.getPattern(channel, bar);
                    if (pattern != null) {
                        var instrumentIdx = pattern.instruments[0];
                        var instrument = this.song.channels[channel].instruments[instrumentIdx];
                        var partsInBar = this.findPartsInBar(bar);
                        for (var _i = 0, _a = pattern.notes; _i < _a.length; _i++) {
                            var note = _a[_i];
                            if (instrument.modulators[SynthConfig_1.Config.modCount - 1 - note.pitches[0]] == SynthConfig_1.Config.modulators.dictionary["tempo"].index) {
                                if (note.start < partsInBar && (latestTempoPin == null || note.end > latestTempoPin)) {
                                    if (note.end <= partsInBar) {
                                        latestTempoPin = note.end;
                                        latestTempoValue = note.pins[note.pins.length - 1].size;
                                    }
                                    else {
                                        latestTempoPin = partsInBar;
                                        // Find the pin where bar change happens, and compute where pin volume would be at that time
                                        for (var pinIdx = 0; pinIdx < note.pins.length; pinIdx++) {
                                            if (note.pins[pinIdx].time + note.start > partsInBar) {
                                                var transitionLength = note.pins[pinIdx].time - note.pins[pinIdx - 1].time;
                                                var toNextBarLength = partsInBar - note.start - note.pins[pinIdx - 1].time;
                                                var deltaVolume = note.pins[pinIdx].size - note.pins[pinIdx - 1].size;
                                                latestTempoValue = Math.round(note.pins[pinIdx - 1].size + deltaVolume * toNextBarLength / transitionLength);
                                                pinIdx = note.pins.length;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // Done once you process a pattern where tempo mods happened, since the search happens backward
                if (latestTempoPin != null) {
                    prevTempo = latestTempoValue + SynthConfig_1.Config.modulators.dictionary["tempo"].convertRealFactor;
                    bar = -1;
                }
            }
        }
        if (hasTempoMods || hasNextBarMods) {
            // Run from start bar to end bar and observe looping, computing average tempo across each bar
            var bar = startBar;
            var ended = false;
            var totalSamples = 0;
            while (!ended) {
                // Compute the subsection of the pattern that will play
                var partsInBar = SynthConfig_1.Config.partsPerBeat * this.song.beatsPerBar;
                var currentPart = 0;
                if (hasNextBarMods) {
                    partsInBar = this.findPartsInBar(bar);
                }
                // Compute average tempo in this tick window, or use last tempo if nothing happened
                if (hasTempoMods) {
                    var foundMod = false;
                    for (var channel = this.song.getChannelCount() - 1; channel >= this.song.pitchChannelCount + this.song.noiseChannelCount; channel--) {
                        if (foundMod == false) {
                            var pattern = this.song.getPattern(channel, bar);
                            if (pattern != null) {
                                var instrument = this.song.channels[channel].instruments[pattern.instruments[0]];
                                var _loop_3 = function (mod) {
                                    if (foundMod == false && instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["tempo"].index
                                        && pattern.notes.find(function (n) { return n.pitches[0] == (SynthConfig_1.Config.modCount - 1 - mod); })) {
                                        // Only the first tempo mod instrument for this bar will be checked (well, the first with a note in this bar).
                                        foundMod = true;
                                        // Need to re-sort the notes by start time to make the next part much less painful.
                                        pattern.notes.sort(function (a, b) { return (a.start == b.start) ? a.pitches[0] - b.pitches[0] : a.start - b.start; });
                                        for (var _b = 0, _c = pattern.notes; _b < _c.length; _b++) {
                                            var note = _c[_b];
                                            if (note.pitches[0] == (SynthConfig_1.Config.modCount - 1 - mod)) {
                                                // Compute samples up to this note
                                                totalSamples += (Math.min(partsInBar - currentPart, note.start - currentPart)) * SynthConfig_1.Config.ticksPerPart * this_2.getSamplesPerTickSpecificBPM(prevTempo);
                                                if (note.start < partsInBar) {
                                                    for (var pinIdx = 1; pinIdx < note.pins.length; pinIdx++) {
                                                        // Compute samples up to this pin
                                                        if (note.pins[pinIdx - 1].time + note.start <= partsInBar) {
                                                            var tickLength = SynthConfig_1.Config.ticksPerPart * Math.min(partsInBar - (note.start + note.pins[pinIdx - 1].time), note.pins[pinIdx].time - note.pins[pinIdx - 1].time);
                                                            var prevPinTempo = note.pins[pinIdx - 1].size + SynthConfig_1.Config.modulators.dictionary["tempo"].convertRealFactor;
                                                            var currPinTempo = note.pins[pinIdx].size + SynthConfig_1.Config.modulators.dictionary["tempo"].convertRealFactor;
                                                            if (note.pins[pinIdx].time + note.start > partsInBar) {
                                                                // Compute an intermediary tempo since bar changed over mid-pin. Maybe I'm deep in "what if" territory now!
                                                                currPinTempo = note.pins[pinIdx - 1].size + (note.pins[pinIdx].size - note.pins[pinIdx - 1].size) * (partsInBar - (note.start + note.pins[pinIdx - 1].time)) / (note.pins[pinIdx].time - note.pins[pinIdx - 1].time) + SynthConfig_1.Config.modulators.dictionary["tempo"].convertRealFactor;
                                                            }
                                                            var bpmScalar = SynthConfig_1.Config.partsPerBeat * SynthConfig_1.Config.ticksPerPart / 60;
                                                            if (currPinTempo != prevPinTempo) {
                                                                // Definite integral of SamplesPerTick w/r/t beats to find total samples from start point to end point for a variable tempo
                                                                // The starting formula is
                                                                // SamplesPerTick = SamplesPerSec / ((PartsPerBeat * TicksPerPart) / SecPerMin) * BeatsPerMin )
                                                                //
                                                                // This is an expression of samples per tick "instantaneously", and it can be multiplied by a number of ticks to get a sample count.
                                                                // But this isn't the full story. BeatsPerMin, e.g. tempo, changes throughout the interval so it has to be expressed in terms of ticks, "t"
                                                                // ( Also from now on PartsPerBeat, TicksPerPart, and SecPerMin are combined into one scalar, called "BPMScalar" )
                                                                // Substituting BPM for a step variable that moves with respect to the current tick, we get
                                                                // SamplesPerTick = SamplesPerSec / (BPMScalar * ( (EndTempo - StartTempo / TickLength) * t + StartTempo ) )
                                                                //
                                                                // When this equation is integrated from 0 to TickLength with respect to t, we get the following expression:
                                                                //   Samples = - SamplesPerSec * TickLength * ( log( BPMScalar * EndTempo * TickLength ) - log( BPMScalar * StartTempo * TickLength ) ) / BPMScalar * ( StartTempo - EndTempo )
                                                                totalSamples += -this_2.samplesPerSecond * tickLength * (Math.log(bpmScalar * currPinTempo * tickLength) - Math.log(bpmScalar * prevPinTempo * tickLength)) / (bpmScalar * (prevPinTempo - currPinTempo));
                                                            }
                                                            else {
                                                                // No tempo change between the two pins.
                                                                totalSamples += tickLength * this_2.getSamplesPerTickSpecificBPM(currPinTempo);
                                                            }
                                                            prevTempo = currPinTempo;
                                                        }
                                                        currentPart = Math.min(note.start + note.pins[pinIdx].time, partsInBar);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                };
                                var this_2 = this;
                                for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                                    _loop_3(mod);
                                }
                            }
                        }
                    }
                }
                // Compute samples for the rest of the bar
                totalSamples += (partsInBar - currentPart) * SynthConfig_1.Config.ticksPerPart * this.getSamplesPerTickSpecificBPM(prevTempo);
                bar++;
                if (loop != 0 && bar == this.song.loopStart + this.song.loopLength) {
                    bar = this.song.loopStart;
                    if (loop > 0)
                        loop--;
                }
                if (bar >= endBar) {
                    ended = true;
                }
            }
            return Math.ceil(totalSamples);
        }
        else {
            // No tempo or next bar mods... phew! Just calculate normally.
            return this.getSamplesPerBar() * this.getTotalBars(enableIntro, enableOutro, loop);
        }
    };
    Synth.prototype.getTotalBars = function (enableIntro, enableOutro, useLoopCount) {
        if (useLoopCount === void 0) { useLoopCount = this.loopRepeatCount; }
        if (this.song == null)
            throw new Error();
        var bars = this.song.loopLength * (useLoopCount + 1);
        if (enableIntro)
            bars += this.song.loopStart;
        if (enableOutro)
            bars += this.song.barCount - (this.song.loopStart + this.song.loopLength);
        return bars;
    };
    Synth.prototype.setSong = function (song) {
        if (typeof (song) == "string") {
            this.song = new Song(song);
        }
        else if (song instanceof Song) {
            this.song = song;
        }
        this.prevBar = null;
    };
    Synth.prototype.computeDelayBufferSizes = function () {
        this.panningDelayBufferSize = Synth.fittingPowerOfTwo(this.samplesPerSecond * SynthConfig_1.Config.panDelaySecondsMax);
        this.panningDelayBufferMask = this.panningDelayBufferSize - 1;
        this.chorusDelayBufferSize = Synth.fittingPowerOfTwo(this.samplesPerSecond * SynthConfig_1.Config.chorusMaxDelay);
        this.chorusDelayBufferMask = this.chorusDelayBufferSize - 1;
    };
    Synth.prototype.activateAudio = function () {
        var bufferSize = this.anticipatePoorPerformance ? (this.preferLowerLatency ? 2048 : 4096) : (this.preferLowerLatency ? 512 : 2048);
        if (this.audioCtx == null || this.scriptNode == null || this.scriptNode.bufferSize != bufferSize) {
            if (this.scriptNode != null)
                this.deactivateAudio();
            var latencyHint = this.anticipatePoorPerformance ? (this.preferLowerLatency ? "balanced" : "playback") : (this.preferLowerLatency ? "interactive" : "balanced");
            this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: latencyHint });
            this.samplesPerSecond = this.audioCtx.sampleRate;
            this.scriptNode = this.audioCtx.createScriptProcessor ? this.audioCtx.createScriptProcessor(bufferSize, 0, 2) : this.audioCtx.createJavaScriptNode(bufferSize, 0, 2); // bufferSize samples per callback buffer, 0 input channels, 2 output channels (left/right)
            this.scriptNode.onaudioprocess = this.audioProcessCallback;
            this.scriptNode.channelCountMode = 'explicit';
            this.scriptNode.channelInterpretation = 'speakers';
            this.scriptNode.connect(this.audioCtx.destination);
            this.computeDelayBufferSizes();
        }
        this.audioCtx.resume();
    };
    Synth.prototype.deactivateAudio = function () {
        if (this.audioCtx != null && this.scriptNode != null) {
            this.scriptNode.disconnect(this.audioCtx.destination);
            this.scriptNode = null;
            if (this.audioCtx.close)
                this.audioCtx.close(); // firefox is missing this function?
            this.audioCtx = null;
        }
    };
    Synth.prototype.maintainLiveInput = function () {
        this.activateAudio();
        this.liveInputEndTime = performance.now() + 10000.0;
    };
    Synth.prototype.play = function () {
        if (this.isPlayingSong)
            return;
        this.initModFilters(this.song);
        this.computeLatestModValues();
        this.activateAudio();
        this.warmUpSynthesizer(this.song);
        this.isPlayingSong = true;
    };
    Synth.prototype.pause = function () {
        if (!this.isPlayingSong)
            return;
        this.isPlayingSong = false;
        this.isRecording = false;
        this.preferLowerLatency = false;
        this.modValues = [];
        this.nextModValues = [];
        this.heldMods = [];
        if (this.song != null) {
            this.song.inVolumeCap = 0.0;
            this.song.outVolumeCap = 0.0;
            this.song.tmpEqFilterStart = null;
            this.song.tmpEqFilterEnd = null;
            for (var channelIndex = 0; channelIndex < this.song.pitchChannelCount + this.song.noiseChannelCount; channelIndex++) {
                this.modInsValues[channelIndex] = [];
                this.nextModInsValues[channelIndex] = [];
            }
        }
    };
    Synth.prototype.startRecording = function () {
        this.preferLowerLatency = true;
        this.isRecording = true;
        this.play();
    };
    Synth.prototype.resetEffects = function () {
        this.limit = 0.0;
        this.freeAllTones();
        if (this.song != null) {
            for (var _i = 0, _a = this.channels; _i < _a.length; _i++) {
                var channelState = _a[_i];
                for (var _b = 0, _c = channelState.instruments; _b < _c.length; _b++) {
                    var instrumentState = _c[_b];
                    instrumentState.resetAllEffects();
                }
            }
        }
    };
    Synth.prototype.setModValue = function (volumeStart, volumeEnd, channelIndex, instrumentIndex, setting) {
        var val = volumeStart + SynthConfig_1.Config.modulators[setting].convertRealFactor;
        var nextVal = volumeEnd + SynthConfig_1.Config.modulators[setting].convertRealFactor;
        if (SynthConfig_1.Config.modulators[setting].forSong) {
            if (this.modValues[setting] == null || this.modValues[setting] != val || this.nextModValues[setting] != nextVal) {
                this.modValues[setting] = val;
                this.nextModValues[setting] = nextVal;
            }
        }
        else {
            if (this.modInsValues[channelIndex][instrumentIndex][setting] == null
                || this.modInsValues[channelIndex][instrumentIndex][setting] != val
                || this.nextModInsValues[channelIndex][instrumentIndex][setting] != nextVal) {
                this.modInsValues[channelIndex][instrumentIndex][setting] = val;
                this.nextModInsValues[channelIndex][instrumentIndex][setting] = nextVal;
            }
        }
        return val;
    };
    Synth.prototype.getModValue = function (setting, channel, instrument, nextVal) {
        var forSong = SynthConfig_1.Config.modulators[setting].forSong;
        if (forSong) {
            if (this.modValues[setting] != null && this.nextModValues[setting] != null) {
                return nextVal ? this.nextModValues[setting] : this.modValues[setting];
            }
        }
        else if (channel != undefined && instrument != undefined) {
            if (this.modInsValues[channel][instrument][setting] != null && this.nextModInsValues[channel][instrument][setting] != null) {
                return nextVal ? this.nextModInsValues[channel][instrument][setting] : this.modInsValues[channel][instrument][setting];
            }
        }
        return -1;
    };
    // Checks if any mod is active for the given channel/instrument OR if any mod is active for the song scope. Could split the logic if needed later.
    Synth.prototype.isAnyModActive = function (channel, instrument) {
        for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
            if ((this.modValues != undefined && this.modValues[setting] != null)
                || (this.modInsValues != undefined && this.modInsValues[channel] != undefined && this.modInsValues[channel][instrument] != undefined && this.modInsValues[channel][instrument][setting] != null)) {
                return true;
            }
        }
        return false;
    };
    Synth.prototype.unsetMod = function (setting, channel, instrument) {
        if (this.isModActive(setting) || (channel != undefined && instrument != undefined && this.isModActive(setting, channel, instrument))) {
            this.modValues[setting] = null;
            this.nextModValues[setting] = null;
            for (var i = 0; i < this.heldMods.length; i++) {
                if (channel != undefined && instrument != undefined) {
                    if (this.heldMods[i].channelIndex == channel && this.heldMods[i].instrumentIndex == instrument && this.heldMods[i].setting == setting)
                        this.heldMods.splice(i, 1);
                }
                else {
                    if (this.heldMods[i].setting == setting)
                        this.heldMods.splice(i, 1);
                }
            }
            if (channel != undefined && instrument != undefined) {
                this.modInsValues[channel][instrument][setting] = null;
                this.nextModInsValues[channel][instrument][setting] = null;
            }
        }
    };
    Synth.prototype.isFilterModActive = function (forNoteFilter, channelIdx, instrumentIdx, forSong) {
        var _a;
        var instrument = this.song.channels[channelIdx].instruments[instrumentIdx];
        if (forNoteFilter) {
            if (instrument.noteFilterType)
                return false;
            if (instrument.tmpNoteFilterEnd != null)
                return true;
        }
        else {
            if (forSong) {
                if (((_a = this === null || this === void 0 ? void 0 : this.song) === null || _a === void 0 ? void 0 : _a.tmpEqFilterEnd) != null)
                    return true;
            }
            else {
                if (instrument.eqFilterType)
                    return false;
                if (instrument.tmpEqFilterEnd != null)
                    return true;
            }
        }
        return false;
    };
    Synth.prototype.isModActive = function (setting, channel, instrument) {
        var forSong = SynthConfig_1.Config.modulators[setting].forSong;
        if (forSong) {
            return (this.modValues != undefined && this.modValues[setting] != null);
        }
        else if (channel != undefined && instrument != undefined && this.modInsValues != undefined && this.modInsValues[channel] != null && this.modInsValues[channel][instrument] != null) {
            return (this.modInsValues[channel][instrument][setting] != null);
        }
        return false;
    };
    // Force a modulator to be held at the given volumeStart for a brief duration.
    Synth.prototype.forceHoldMods = function (volumeStart, channelIndex, instrumentIndex, setting) {
        var found = false;
        for (var i = 0; i < this.heldMods.length; i++) {
            if (this.heldMods[i].channelIndex == channelIndex && this.heldMods[i].instrumentIndex == instrumentIndex && this.heldMods[i].setting == setting) {
                this.heldMods[i].volume = volumeStart;
                this.heldMods[i].holdFor = 24;
                found = true;
            }
        }
        // Default: hold for 24 ticks / 12 parts (half a beat).
        if (!found)
            this.heldMods.push({ volume: volumeStart, channelIndex: channelIndex, instrumentIndex: instrumentIndex, setting: setting, holdFor: 24 });
    };
    Synth.prototype.snapToStart = function () {
        this.bar = 0;
        this.resetEffects();
        this.snapToBar();
    };
    Synth.prototype.goToBar = function (bar) {
        this.bar = bar;
        this.resetEffects();
        this.playheadInternal = this.bar;
    };
    Synth.prototype.snapToBar = function () {
        this.playheadInternal = this.bar;
        this.beat = 0;
        this.part = 0;
        this.tick = 0;
        this.tickSampleCountdown = 0;
    };
    Synth.prototype.jumpIntoLoop = function () {
        if (!this.song)
            return;
        if (this.bar < this.song.loopStart || this.bar >= this.song.loopStart + this.song.loopLength) {
            var oldBar = this.bar;
            this.bar = this.song.loopStart;
            this.playheadInternal += this.bar - oldBar;
            if (this.playing)
                this.computeLatestModValues();
        }
    };
    Synth.prototype.goToNextBar = function () {
        if (!this.song)
            return;
        this.prevBar = this.bar;
        var oldBar = this.bar;
        this.bar++;
        if (this.bar >= this.song.barCount) {
            this.bar = 0;
        }
        this.playheadInternal += this.bar - oldBar;
        if (this.playing)
            this.computeLatestModValues();
    };
    Synth.prototype.goToPrevBar = function () {
        if (!this.song)
            return;
        this.prevBar = null;
        var oldBar = this.bar;
        this.bar--;
        if (this.bar < 0 || this.bar >= this.song.barCount) {
            this.bar = this.song.barCount - 1;
        }
        this.playheadInternal += this.bar - oldBar;
        if (this.playing)
            this.computeLatestModValues();
    };
    Synth.prototype.getNextBar = function () {
        var nextBar = this.bar + 1;
        if (this.isRecording) {
            if (nextBar >= this.song.barCount) {
                nextBar = this.song.barCount - 1;
            }
        }
        else if (this.bar == this.loopBarEnd && !this.renderingSong) {
            nextBar = this.loopBarStart;
        }
        else if (this.loopRepeatCount != 0 && nextBar == Math.max(this.loopBarEnd + 1, this.song.loopStart + this.song.loopLength)) {
            nextBar = this.song.loopStart;
        }
        return nextBar;
    };
    Synth.prototype.skipBar = function () {
        if (!this.song)
            return;
        var samplesPerTick = this.getSamplesPerTick();
        this.prevBar = this.bar; // Bugfix by LeoV
        if (this.loopBarEnd != this.bar)
            this.bar++;
        else {
            this.bar = this.loopBarStart;
        }
        this.beat = 0;
        this.part = 0;
        this.tick = 0;
        this.tickSampleCountdown = samplesPerTick;
        this.isAtStartOfTick = true;
        if (this.loopRepeatCount != 0 && this.bar == Math.max(this.song.loopStart + this.song.loopLength, this.loopBarEnd)) {
            this.bar = this.song.loopStart;
            if (this.loopBarStart != -1)
                this.bar = this.loopBarStart;
            if (this.loopRepeatCount > 0)
                this.loopRepeatCount--;
        }
    };
    Synth.prototype.computeSongState = function (samplesPerTick) {
        if (this.song == null)
            return;
        var roundedSamplesPerTick = Math.ceil(samplesPerTick);
        var samplesPerSecond = this.samplesPerSecond;
        var eqFilterVolume = 1.0; //this.envelopeComputer.lowpassCutoffDecayVolumeCompensation;
        if (this.song.eqFilterType) {
            // Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
            var eqFilterSettingsStart = this.song.eqFilter;
            if (this.song.eqSubFilters[1] == null)
                this.song.eqSubFilters[1] = new FilterSettings();
            var eqFilterSettingsEnd = this.song.eqSubFilters[1];
            // Change location based on slider values
            var startSimpleFreq = this.song.eqFilterSimpleCut;
            var startSimpleGain = this.song.eqFilterSimplePeak;
            var endSimpleFreq = this.song.eqFilterSimpleCut;
            var endSimpleGain = this.song.eqFilterSimplePeak;
            var filterChanges = false;
            // if (synth.isModActive(Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex)) {
            //     startSimpleFreq = synth.getModValue(Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex, false);
            //     endSimpleFreq = synth.getModValue(Config.modulators.dictionary["eq filt cut"].index, channelIndex, instrumentIndex, true);
            //     filterChanges = true;
            // }
            // if (synth.isModActive(Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex)) {
            //     startSimpleGain = synth.getModValue(Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex, false);
            //     endSimpleGain = synth.getModValue(Config.modulators.dictionary["eq filt peak"].index, channelIndex, instrumentIndex, true);
            //     filterChanges = true;
            // }
            var startPoint = void 0;
            if (filterChanges) {
                eqFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain);
                eqFilterSettingsEnd.convertLegacySettingsForSynth(endSimpleFreq, endSimpleGain);
                startPoint = eqFilterSettingsStart.controlPoints[0];
                var endPoint = eqFilterSettingsEnd.controlPoints[0];
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, 1.0, 1.0);
                if (this.songEqFiltersL.length < 1)
                    this.songEqFiltersL[0] = new filtering_1.DynamicBiquadFilter();
                this.songEqFiltersL[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
                if (this.songEqFiltersR.length < 1)
                    this.songEqFiltersR[0] = new filtering_1.DynamicBiquadFilter();
                this.songEqFiltersR[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
            }
            else {
                eqFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain, true);
                startPoint = eqFilterSettingsStart.controlPoints[0];
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, 1.0, 1.0);
                if (this.songEqFiltersL.length < 1)
                    this.songEqFiltersL[0] = new filtering_1.DynamicBiquadFilter();
                this.songEqFiltersL[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterStartCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
                if (this.songEqFiltersR.length < 1)
                    this.songEqFiltersR[0] = new filtering_1.DynamicBiquadFilter();
                this.songEqFiltersR[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterStartCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
            }
            eqFilterVolume *= startPoint.getVolumeCompensationMult();
            this.songEqFilterCount = 1;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
        }
        else {
            var eqFilterSettings = (this.song.tmpEqFilterStart != null) ? this.song.tmpEqFilterStart : this.song.eqFilter;
            //const eqAllFreqsEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterAllFreqs];
            //const eqAllFreqsEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterAllFreqs];
            for (var i = 0; i < eqFilterSettings.controlPointCount; i++) {
                //const eqFreqEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterFreq0 + i];
                //const eqFreqEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterFreq0 + i];
                //const eqPeakEnvelopeStart: number = envelopeStarts[InstrumentAutomationIndex.eqFilterGain0 + i];
                //const eqPeakEnvelopeEnd:   number = envelopeEnds[  InstrumentAutomationIndex.eqFilterGain0 + i];
                var startPoint = eqFilterSettings.controlPoints[i];
                var endPoint = (this.song.tmpEqFilterEnd != null && this.song.tmpEqFilterEnd.controlPoints[i] != null) ? this.song.tmpEqFilterEnd.controlPoints[i] : eqFilterSettings.controlPoints[i];
                // If switching dot type, do it all at once and do not try to interpolate since no valid interpolation exists.
                if (startPoint.type != endPoint.type) {
                    startPoint = endPoint;
                }
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, samplesPerSecond, /*eqAllFreqsEnvelopeStart * eqFreqEnvelopeStart*/ 1.0, /*eqPeakEnvelopeStart*/ 1.0);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, samplesPerSecond, /*eqAllFreqsEnvelopeEnd   * eqFreqEnvelopeEnd*/ 1.0, /*eqPeakEnvelopeEnd*/ 1.0);
                if (this.songEqFiltersL.length <= i)
                    this.songEqFiltersL[i] = new filtering_1.DynamicBiquadFilter();
                this.songEqFiltersL[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
                if (this.songEqFiltersR.length <= i)
                    this.songEqFiltersR[i] = new filtering_1.DynamicBiquadFilter();
                this.songEqFiltersR[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
                eqFilterVolume *= startPoint.getVolumeCompensationMult();
            }
            this.songEqFilterCount = eqFilterSettings.controlPointCount;
            eqFilterVolume = Math.min(3.0, eqFilterVolume);
        }
        var eqFilterVolumeStart = eqFilterVolume;
        var eqFilterVolumeEnd = eqFilterVolume;
        this.songEqFilterVolume = eqFilterVolumeStart;
        this.songEqFilterVolumeDelta = (eqFilterVolumeEnd - eqFilterVolumeStart) / roundedSamplesPerTick;
    };
    Synth.prototype.synthesize = function (outputDataL, outputDataR, outputBufferLength, playSong) {
        if (playSong === void 0) { playSong = true; }
        if (this.song == null) {
            outputDataL.fill(0.0);
            outputDataR.fill(0.0);
            this.deactivateAudio();
            return;
        }
        //clear the unfiltered (not affected by song eq) output
        if (this.outputDataLUnfiltered == null || this.outputDataLUnfiltered.length < outputBufferLength) {
            this.outputDataLUnfiltered = new Float32Array(outputBufferLength);
            this.outputDataRUnfiltered = new Float32Array(outputBufferLength);
        }
        else {
            this.outputDataLUnfiltered.fill(0.0);
            this.outputDataRUnfiltered.fill(0.0);
        }
        var song = this.song;
        this.song.inVolumeCap = 0.0; // Reset volume cap for this run
        this.song.outVolumeCap = 0.0;
        var samplesPerTick = this.getSamplesPerTick();
        var ended = false;
        // Check the bounds of the playhead:
        if (this.tickSampleCountdown <= 0 || this.tickSampleCountdown > samplesPerTick) {
            this.tickSampleCountdown = samplesPerTick;
            this.isAtStartOfTick = true;
        }
        if (playSong) {
            if (this.beat >= song.beatsPerBar) {
                this.beat = 0;
                this.part = 0;
                this.tick = 0;
                this.tickSampleCountdown = samplesPerTick;
                this.isAtStartOfTick = true;
                this.prevBar = this.bar;
                this.bar = this.getNextBar();
                if (this.bar <= this.prevBar && this.loopRepeatCount > 0)
                    this.loopRepeatCount--;
            }
            if (this.bar >= song.barCount) {
                this.bar = 0;
                if (this.loopRepeatCount != -1) {
                    ended = true;
                    this.pause();
                }
            }
        }
        //const synthStartTime: number = performance.now();
        this.syncSongState();
        if (this.tempMonoInstrumentSampleBuffer == null || this.tempMonoInstrumentSampleBuffer.length < outputBufferLength) {
            this.tempMonoInstrumentSampleBuffer = new Float32Array(outputBufferLength);
        }
        // Post processing parameters:
        var volume = +this.volume;
        var limitDecay = 1.0 - Math.pow(0.5, this.song.limitDecay / this.samplesPerSecond);
        var limitRise = 1.0 - Math.pow(0.5, this.song.limitRise / this.samplesPerSecond);
        var limit = +this.limit;
        var skippedBars = [];
        var firstSkippedBufferIndex = -1;
        var bufferIndex = 0;
        while (bufferIndex < outputBufferLength && !ended) {
            this.nextBar = this.getNextBar();
            if (this.nextBar >= song.barCount)
                this.nextBar = null;
            var samplesLeftInBuffer = outputBufferLength - bufferIndex;
            var samplesLeftInTick = Math.ceil(this.tickSampleCountdown);
            var runLength = Math.min(samplesLeftInTick, samplesLeftInBuffer);
            var runEnd = bufferIndex + runLength;
            // Handle mod synth
            if (this.isPlayingSong || this.renderingSong) {
                // First modulation pass. Determines active tones.
                // Runs everything but Dot X/Y mods, to let them always come after morph.
                for (var channelIndex = song.pitchChannelCount + song.noiseChannelCount; channelIndex < song.getChannelCount(); channelIndex++) {
                    var channel = song.channels[channelIndex];
                    var channelState = this.channels[channelIndex];
                    this.determineCurrentActiveTones(song, channelIndex, samplesPerTick, playSong);
                    for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                        var instrumentState = channelState.instruments[instrumentIndex];
                        for (var i = 0; i < instrumentState.activeModTones.count(); i++) {
                            var tone = instrumentState.activeModTones.get(i);
                            var channel_1 = song.channels[channelIndex];
                            var instrument = channel_1.instruments[tone.instrumentIndex];
                            var mod = SynthConfig_1.Config.modCount - 1 - tone.pitches[0];
                            if ((instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["note filter"].index
                                || instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["eq filter"].index
                                || instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["song eq"].index)
                                && instrument.modFilterTypes[mod] != null && instrument.modFilterTypes[mod] > 0) {
                                continue;
                            }
                            this.playModTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                        }
                    }
                }
                // Second modulation pass.
                // Only for Dot X/Y mods.
                for (var channelIndex = song.pitchChannelCount + song.noiseChannelCount; channelIndex < song.getChannelCount(); channelIndex++) {
                    var channel = song.channels[channelIndex];
                    var channelState = this.channels[channelIndex];
                    for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                        var instrumentState = channelState.instruments[instrumentIndex];
                        for (var i = 0; i < instrumentState.activeModTones.count(); i++) {
                            var tone = instrumentState.activeModTones.get(i);
                            var channel_2 = song.channels[channelIndex];
                            var instrument = channel_2.instruments[tone.instrumentIndex];
                            var mod = SynthConfig_1.Config.modCount - 1 - tone.pitches[0];
                            if ((instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["note filter"].index
                                || instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["eq filter"].index
                                || instrument.modulators[mod] == SynthConfig_1.Config.modulators.dictionary["song eq"].index)
                                && instrument.modFilterTypes[mod] != null && instrument.modFilterTypes[mod] > 0) {
                                this.playModTone(song, channelIndex, samplesPerTick, bufferIndex, runLength, tone, false, false);
                            }
                        }
                    }
                }
            }
            // Handle next bar mods if they were set
            if (this.wantToSkip) {
                // Unable to continue, as we have skipped back to a previously visited bar without generating new samples, which means we are infinitely skipping.
                // In this case processing will return before the designated number of samples are processed. In other words, silence will be generated.
                var barVisited = skippedBars.includes(this.bar);
                if (barVisited && bufferIndex == firstSkippedBufferIndex) {
                    this.pause();
                    return;
                }
                if (firstSkippedBufferIndex == -1) {
                    firstSkippedBufferIndex = bufferIndex;
                }
                if (!barVisited)
                    skippedBars.push(this.bar);
                this.wantToSkip = false;
                this.skipBar();
                continue;
            }
            this.computeSongState(samplesPerTick);
            if (!this.isPlayingSong && (this.liveInputPitches.length > 0 || this.liveBassInputPitches.length > 0)) { //set up modulation for live input tones
                this.computeLatestModValues();
            }
            for (var channelIndex = 0; channelIndex < song.pitchChannelCount + song.noiseChannelCount; channelIndex++) {
                var channel = song.channels[channelIndex];
                var channelState = this.channels[channelIndex];
                if (this.isAtStartOfTick) {
                    this.determineCurrentActiveTones(song, channelIndex, samplesPerTick, playSong && !this.countInMetronome);
                    this.determineLiveInputTones(song, channelIndex, samplesPerTick);
                }
                for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                    var instrument = channel.instruments[instrumentIndex];
                    var instrumentState = channelState.instruments[instrumentIndex];
                    if (this.isAtStartOfTick) {
                        var tonesPlayedInThisInstrument = instrumentState.activeTones.count() + instrumentState.liveInputTones.count();
                        for (var i = 0; i < instrumentState.releasedTones.count(); i++) {
                            var tone = instrumentState.releasedTones.get(i);
                            if (tone.ticksSinceReleased >= Math.abs(instrument.getFadeOutTicks())) {
                                this.freeReleasedTone(instrumentState, i);
                                i--;
                                continue;
                            }
                            var shouldFadeOutFast = (tonesPlayedInThisInstrument >= SynthConfig_1.Config.maximumTonesPerChannel);
                            this.computeTone(song, channelIndex, samplesPerTick, tone, true, shouldFadeOutFast);
                            tonesPlayedInThisInstrument++;
                        }
                        if (instrumentState.awake) {
                            if (!instrumentState.computed) {
                                instrumentState.compute(this, instrument, samplesPerTick, Math.ceil(samplesPerTick), null, channelIndex, instrumentIndex);
                            }
                            instrumentState.computed = false;
                            instrumentState.envelopeComputer.clearEnvelopes();
                        }
                    }
                    for (var i = 0; i < instrumentState.activeTones.count(); i++) {
                        var tone = instrumentState.activeTones.get(i);
                        this.playTone(channelIndex, bufferIndex, runLength, tone);
                    }
                    for (var i = 0; i < instrumentState.liveInputTones.count(); i++) {
                        var tone = instrumentState.liveInputTones.get(i);
                        this.playTone(channelIndex, bufferIndex, runLength, tone);
                    }
                    for (var i = 0; i < instrumentState.releasedTones.count(); i++) {
                        var tone = instrumentState.releasedTones.get(i);
                        this.playTone(channelIndex, bufferIndex, runLength, tone);
                    }
                    if (instrumentState.awake) {
                        Synth.effectsSynth(this, outputDataL, outputDataR, bufferIndex, runLength, instrumentState);
                    }
                    // Update LFO time for instruments (used to be deterministic based on bar position but now vibrato/arp speed messes that up!)
                    var tickSampleCountdown = this.tickSampleCountdown;
                    var startRatio = 1.0 - (tickSampleCountdown) / samplesPerTick;
                    var endRatio = 1.0 - (tickSampleCountdown - runLength) / samplesPerTick;
                    var ticksIntoBar = (this.beat * SynthConfig_1.Config.partsPerBeat + this.part) * SynthConfig_1.Config.ticksPerPart + this.tick;
                    var partTimeTickStart = (ticksIntoBar) / SynthConfig_1.Config.ticksPerPart;
                    var partTimeTickEnd = (ticksIntoBar + 1) / SynthConfig_1.Config.ticksPerPart;
                    var partTimeStart = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
                    var partTimeEnd = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
                    var useVibratoSpeed = instrument.vibratoSpeed;
                    instrumentState.vibratoTime = instrumentState.nextVibratoTime;
                    //envelopeable vibrato speed?
                    if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["vibrato speed"].index, channelIndex, instrumentIndex)) {
                        useVibratoSpeed = this.getModValue(SynthConfig_1.Config.modulators.dictionary["vibrato speed"].index, channelIndex, instrumentIndex);
                    }
                    if (useVibratoSpeed == 0) {
                        instrumentState.vibratoTime = 0;
                        instrumentState.nextVibratoTime = 0;
                    }
                    else {
                        instrumentState.nextVibratoTime += useVibratoSpeed * 0.1 * (partTimeEnd - partTimeStart);
                    }
                }
            }
            if (this.enableMetronome || this.countInMetronome) {
                if (this.part == 0) {
                    if (!this.startedMetronome) {
                        var midBeat = (song.beatsPerBar > 4 && (song.beatsPerBar % 2 == 0) && this.beat == song.beatsPerBar / 2);
                        var periods = (this.beat == 0) ? 8 : midBeat ? 6 : 4;
                        var hz = (this.beat == 0) ? 1600 : midBeat ? 1200 : 800;
                        var amplitude = (this.beat == 0) ? 0.06 : midBeat ? 0.05 : 0.04;
                        var samplesPerPeriod = this.samplesPerSecond / hz;
                        var radiansPerSample = Math.PI * 2.0 / samplesPerPeriod;
                        this.metronomeSamplesRemaining = Math.floor(samplesPerPeriod * periods);
                        this.metronomeFilter = 2.0 * Math.cos(radiansPerSample);
                        this.metronomeAmplitude = amplitude * Math.sin(radiansPerSample);
                        this.metronomePrevAmplitude = 0.0;
                        this.startedMetronome = true;
                    }
                    if (this.metronomeSamplesRemaining > 0) {
                        var stopIndex = Math.min(runEnd, bufferIndex + this.metronomeSamplesRemaining);
                        this.metronomeSamplesRemaining -= stopIndex - bufferIndex;
                        for (var i = bufferIndex; i < stopIndex; i++) {
                            this.outputDataLUnfiltered[i] += this.metronomeAmplitude;
                            this.outputDataRUnfiltered[i] += this.metronomeAmplitude;
                            var tempAmplitude = this.metronomeFilter * this.metronomeAmplitude - this.metronomePrevAmplitude;
                            this.metronomePrevAmplitude = this.metronomeAmplitude;
                            this.metronomeAmplitude = tempAmplitude;
                        }
                    }
                }
                else {
                    this.startedMetronome = false;
                }
            }
            // Post processing:
            for (var i = bufferIndex; i < runEnd; i++) {
                //Song EQ
                {
                    var filtersL = this.songEqFiltersL;
                    var filtersR = this.songEqFiltersR;
                    var filterCount = this.songEqFilterCount | 0;
                    var initialFilterInput1L = +this.initialSongEqFilterInput1L;
                    var initialFilterInput2L = +this.initialSongEqFilterInput2L;
                    var initialFilterInput1R = +this.initialSongEqFilterInput1R;
                    var initialFilterInput2R = +this.initialSongEqFilterInput2R;
                    var applyFilters = Synth.applyFilters;
                    var eqFilterVolume = +this.songEqFilterVolume;
                    var eqFilterVolumeDelta = +this.songEqFilterVolumeDelta;
                    var inputSampleL = outputDataL[i];
                    var sampleL_1 = inputSampleL;
                    sampleL_1 = applyFilters(sampleL_1, initialFilterInput1L, initialFilterInput2L, filterCount, filtersL);
                    initialFilterInput2L = initialFilterInput1L;
                    initialFilterInput1L = inputSampleL;
                    sampleL_1 *= eqFilterVolume;
                    outputDataL[i] = sampleL_1;
                    var inputSampleR = outputDataR[i];
                    var sampleR_1 = inputSampleR;
                    sampleR_1 = applyFilters(sampleR_1, initialFilterInput1R, initialFilterInput2R, filterCount, filtersR);
                    initialFilterInput2R = initialFilterInput1R;
                    initialFilterInput1R = inputSampleR;
                    sampleR_1 *= eqFilterVolume;
                    outputDataR[i] = sampleR_1;
                    eqFilterVolume += eqFilterVolumeDelta;
                    this.sanitizeFilters(filtersL);
                    // The filter input here is downstream from another filter so we
                    // better make sure it's safe too.
                    if (!(initialFilterInput1L < 100) || !(initialFilterInput2L < 100)) {
                        initialFilterInput1L = 0.0;
                        initialFilterInput2L = 0.0;
                    }
                    if (Math.abs(initialFilterInput1L) < epsilon)
                        initialFilterInput1L = 0.0;
                    if (Math.abs(initialFilterInput2L) < epsilon)
                        initialFilterInput2L = 0.0;
                    this.initialSongEqFilterInput1L = initialFilterInput1L;
                    this.initialSongEqFilterInput2L = initialFilterInput2L;
                    this.sanitizeFilters(filtersR);
                    if (!(initialFilterInput1R < 100) || !(initialFilterInput2R < 100)) {
                        initialFilterInput1R = 0.0;
                        initialFilterInput2R = 0.0;
                    }
                    if (Math.abs(initialFilterInput1R) < epsilon)
                        initialFilterInput1R = 0.0;
                    if (Math.abs(initialFilterInput2R) < epsilon)
                        initialFilterInput2R = 0.0;
                    this.initialSongEqFilterInput1R = initialFilterInput1R;
                    this.initialSongEqFilterInput2R = initialFilterInput2R;
                }
                // A compressor/limiter.
                var sampleL = (outputDataL[i] + this.outputDataLUnfiltered[i]) * song.masterGain * song.masterGain;
                var sampleR = (outputDataR[i] + this.outputDataRUnfiltered[i]) * song.masterGain * song.masterGain;
                var absL = sampleL < 0.0 ? -sampleL : sampleL;
                var absR = sampleR < 0.0 ? -sampleR : sampleR;
                var abs = absL > absR ? absL : absR;
                this.song.inVolumeCap = (this.song.inVolumeCap > abs ? this.song.inVolumeCap : abs); // Analytics, spit out raw input volume
                // Determines which formula to use. 0 when volume is between [0, compressionThreshold], 1 when between (compressionThreshold, limitThreshold], 2 above
                var limitRange = (+(abs > song.compressionThreshold)) + (+(abs > song.limitThreshold));
                // Determine the target amplification based on the range of the curve
                var limitTarget = (+(limitRange == 0)) * (((abs + 1 - song.compressionThreshold) * 0.8 + 0.25) * song.compressionRatio + 1.05 * (1 - song.compressionRatio))
                    + (+(limitRange == 1)) * (1.05)
                    + (+(limitRange == 2)) * (1.05 * ((abs + 1 - song.limitThreshold) * song.limitRatio + (1 - song.limitThreshold)));
                // Move the limit towards the target
                limit += ((limitTarget - limit) * (limit < limitTarget ? limitRise : limitDecay));
                var limitedVolume = volume / (limit >= 1 ? limit * 1.05 : limit * 0.8 + 0.25);
                outputDataL[i] = sampleL * limitedVolume;
                outputDataR[i] = sampleR * limitedVolume;
                this.song.outVolumeCap = (this.song.outVolumeCap > abs * limitedVolume ? this.song.outVolumeCap : abs * limitedVolume); // Analytics, spit out limited output volume
            }
            bufferIndex += runLength;
            this.isAtStartOfTick = false;
            this.tickSampleCountdown -= runLength;
            if (this.tickSampleCountdown <= 0) {
                this.isAtStartOfTick = true;
                // Track how long tones have been released, and free them if there are too many.
                // Also reset awake InstrumentStates that didn't have any Tones during this tick.
                for (var _i = 0, _a = this.channels; _i < _a.length; _i++) {
                    var channelState = _a[_i];
                    for (var _b = 0, _c = channelState.instruments; _b < _c.length; _b++) {
                        var instrumentState = _c[_b];
                        for (var i = 0; i < instrumentState.releasedTones.count(); i++) {
                            var tone = instrumentState.releasedTones.get(i);
                            if (tone.isOnLastTick) {
                                this.freeReleasedTone(instrumentState, i);
                                i--;
                            }
                            else {
                                tone.ticksSinceReleased++;
                            }
                        }
                        if (instrumentState.deactivateAfterThisTick) {
                            instrumentState.deactivate();
                        }
                        instrumentState.tonesAddedInThisTick = false;
                    }
                }
                var ticksIntoBar = this.getTicksIntoBar();
                var tickTimeStart = ticksIntoBar;
                var secondsPerTick = samplesPerTick / this.samplesPerSecond;
                var currentPart = this.getCurrentPart();
                for (var channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    for (var instrumentIdx = 0; instrumentIdx < this.song.channels[channel].instruments.length; instrumentIdx++) {
                        var instrument = this.song.channels[channel].instruments[instrumentIdx];
                        var instrumentState = this.channels[channel].instruments[instrumentIdx];
                        // Update envelope time, which is used to calculate tone-based envelopes' position position
                        var envelopeComputer = instrumentState.envelopeComputer;
                        var envelopeSpeeds = [];
                        for (var i = 0; i < SynthConfig_1.Config.maxEnvelopeCount; i++) {
                            envelopeSpeeds[i] = 0;
                        }
                        for (var envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
                            var useEnvelopeSpeed = instrument.envelopeSpeed;
                            var perEnvelopeSpeed = instrument.envelopes[envelopeIndex].perEnvelopeSpeed;
                            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index, channel, instrumentIdx) && instrument.envelopes[envelopeIndex].tempEnvelopeSpeed != null) {
                                perEnvelopeSpeed = instrument.envelopes[envelopeIndex].tempEnvelopeSpeed;
                            }
                            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["envelope speed"].index, channel, instrumentIdx)) {
                                useEnvelopeSpeed = Math.max(0, Math.min(SynthConfig_1.Config.arpSpeedScale.length - 1, this.getModValue(SynthConfig_1.Config.modulators.dictionary["envelope speed"].index, channel, instrumentIdx, false)));
                                if (Number.isInteger(useEnvelopeSpeed)) {
                                    instrumentState.envelopeTime[envelopeIndex] += SynthConfig_1.Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
                                }
                                else {
                                    // Linear interpolate envelope values
                                    instrumentState.envelopeTime[envelopeIndex] += ((1 - (useEnvelopeSpeed % 1)) * SynthConfig_1.Config.arpSpeedScale[Math.floor(useEnvelopeSpeed)] + (useEnvelopeSpeed % 1) * SynthConfig_1.Config.arpSpeedScale[Math.ceil(useEnvelopeSpeed)]) * perEnvelopeSpeed;
                                }
                            }
                            else {
                                instrumentState.envelopeTime[envelopeIndex] += SynthConfig_1.Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
                            }
                        }
                        //annoyingly arp speed is calculated in a completely separate place from everything else, and thus we need to run compute envelopes just for it. 
                        // This uses the instrumentState envelopeComputer, but is effectively per tone to the user given that arpeggios cause only one tone to play at a time
                        if (instrumentState.activeTones.count() > 0) {
                            var tone = instrumentState.activeTones.get(0);
                            envelopeComputer.computeEnvelopes(instrument, currentPart, instrumentState.envelopeTime, tickTimeStart, secondsPerTick, tone, envelopeSpeeds, instrumentState, this, channel, instrumentIdx, false);
                        }
                        var envelopeStarts = envelopeComputer.envelopeStarts;
                        //const envelopeEnds: number[] = envelopeComputer.envelopeEnds;
                        // Update arpeggio time, which is used to calculate arpeggio position
                        var arpEnvelopeStart = envelopeStarts[48 /* EnvelopeComputeIndex.arpeggioSpeed */]; //only discrete for now
                        //const arpEnvelopeEnd: number = envelopeEnds[EnvelopeComputeIndex.arpeggioSpeed];
                        var useArpeggioSpeed = instrument.arpeggioSpeed;
                        if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["arp speed"].index, channel, instrumentIdx)) {
                            useArpeggioSpeed = clamp(0, SynthConfig_1.Config.arpSpeedScale.length, arpEnvelopeStart * this.getModValue(SynthConfig_1.Config.modulators.dictionary["arp speed"].index, channel, instrumentIdx, false));
                            if (Number.isInteger(useArpeggioSpeed)) {
                                instrumentState.arpTime += SynthConfig_1.Config.arpSpeedScale[useArpeggioSpeed];
                            }
                            else {
                                // Linear interpolate arpeggio values
                                instrumentState.arpTime += (1 - (useArpeggioSpeed % 1)) * SynthConfig_1.Config.arpSpeedScale[Math.floor(useArpeggioSpeed)] + (useArpeggioSpeed % 1) * SynthConfig_1.Config.arpSpeedScale[Math.ceil(useArpeggioSpeed)];
                            }
                        }
                        else {
                            useArpeggioSpeed = clamp(0, SynthConfig_1.Config.arpSpeedScale.length, arpEnvelopeStart * useArpeggioSpeed);
                            if (Number.isInteger(useArpeggioSpeed)) {
                                instrumentState.arpTime += SynthConfig_1.Config.arpSpeedScale[useArpeggioSpeed];
                            }
                            else {
                                // Linear interpolate arpeggio values
                                instrumentState.arpTime += (1 - (useArpeggioSpeed % 1)) * SynthConfig_1.Config.arpSpeedScale[Math.floor(useArpeggioSpeed)] + (useArpeggioSpeed % 1) * SynthConfig_1.Config.arpSpeedScale[Math.ceil(useArpeggioSpeed)];
                            }
                        }
                        envelopeComputer.clearEnvelopes();
                    }
                }
                // Update next-used filters after each run
                for (var channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    for (var instrumentIdx = 0; instrumentIdx < this.song.channels[channel].instruments.length; instrumentIdx++) {
                        var instrument = this.song.channels[channel].instruments[instrumentIdx];
                        if (instrument.tmpEqFilterEnd != null) {
                            instrument.tmpEqFilterStart = instrument.tmpEqFilterEnd;
                        }
                        else {
                            instrument.tmpEqFilterStart = instrument.eqFilter;
                        }
                        if (instrument.tmpNoteFilterEnd != null) {
                            instrument.tmpNoteFilterStart = instrument.tmpNoteFilterEnd;
                        }
                        else {
                            instrument.tmpNoteFilterStart = instrument.noteFilter;
                        }
                    }
                }
                if (song.tmpEqFilterEnd != null) {
                    song.tmpEqFilterStart = song.tmpEqFilterEnd;
                }
                else {
                    song.tmpEqFilterStart = song.eqFilter;
                }
                this.tick++;
                this.tickSampleCountdown += samplesPerTick;
                if (this.tick == SynthConfig_1.Config.ticksPerPart) {
                    this.tick = 0;
                    this.part++;
                    this.liveInputDuration--;
                    this.liveBassInputDuration--;
                    // Decrement held modulator counters after each run
                    for (var i = 0; i < this.heldMods.length; i++) {
                        this.heldMods[i].holdFor--;
                        if (this.heldMods[i].holdFor <= 0) {
                            this.heldMods.splice(i, 1);
                        }
                    }
                    if (this.part == SynthConfig_1.Config.partsPerBeat) {
                        this.part = 0;
                        if (playSong) {
                            this.beat++;
                            if (this.beat == song.beatsPerBar) {
                                // bar changed, reset for next bar:
                                this.beat = 0;
                                if (this.countInMetronome) {
                                    this.countInMetronome = false;
                                }
                                else {
                                    this.prevBar = this.bar;
                                    this.bar = this.getNextBar();
                                    if (this.bar <= this.prevBar && this.loopRepeatCount > 0)
                                        this.loopRepeatCount--;
                                    if (this.bar >= song.barCount) {
                                        this.bar = 0;
                                        if (this.loopRepeatCount != -1) {
                                            ended = true;
                                            this.resetEffects();
                                            this.pause();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Update mod values so that next values copy to current values
            for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
                if (this.nextModValues != null && this.nextModValues[setting] != null)
                    this.modValues[setting] = this.nextModValues[setting];
            }
            // Set samples per tick if song tempo mods changed it
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["tempo"].index)) {
                samplesPerTick = this.getSamplesPerTick();
                this.tickSampleCountdown = Math.min(this.tickSampleCountdown, samplesPerTick);
            }
            // Bound LFO times to be within their period (to keep values from getting large)
            // I figured this modulo math probably doesn't have to happen every LFO tick.
            for (var channelIndex = 0; channelIndex < this.song.pitchChannelCount + this.song.noiseChannelCount; channelIndex++) {
                for (var instrumentIndex = 0; instrumentIndex < this.channels[channelIndex].instruments.length; instrumentIndex++) {
                    var instrumentState = this.channels[channelIndex].instruments[instrumentIndex];
                    var instrument = this.song.channels[channelIndex].instruments[instrumentIndex];
                    instrumentState.nextVibratoTime = (instrumentState.nextVibratoTime % (SynthConfig_1.Config.vibratoTypes[instrument.vibratoType].period / (SynthConfig_1.Config.ticksPerPart * samplesPerTick / this.samplesPerSecond)));
                    instrumentState.arpTime = (instrumentState.arpTime % (2520 * SynthConfig_1.Config.ticksPerArpeggio)); // 2520 = LCM of 4, 5, 6, 7, 8, 9 (arp sizes)
                    for (var envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
                        instrumentState.envelopeTime[envelopeIndex] = (instrumentState.envelopeTime[envelopeIndex] % (SynthConfig_1.Config.partsPerBeat * SynthConfig_1.Config.ticksPerPart * this.song.beatsPerBar));
                    }
                }
            }
            var maxInstrumentsPerChannel = this.song.getMaxInstrumentsPerChannel();
            for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
                for (var channel = 0; channel < this.song.pitchChannelCount + this.song.noiseChannelCount; channel++) {
                    for (var instrument = 0; instrument < maxInstrumentsPerChannel; instrument++) {
                        if (this.nextModInsValues != null && this.nextModInsValues[channel] != null && this.nextModInsValues[channel][instrument] != null && this.nextModInsValues[channel][instrument][setting] != null) {
                            this.modInsValues[channel][instrument][setting] = this.nextModInsValues[channel][instrument][setting];
                        }
                    }
                }
            }
        }
        // Optimization: Avoid persistent reverb values in the float denormal range.
        if (!Number.isFinite(limit) || Math.abs(limit) < epsilon)
            limit = 0.0;
        this.limit = limit;
        if (playSong && !this.countInMetronome) {
            this.playheadInternal = (((this.tick + 1.0 - this.tickSampleCountdown / samplesPerTick) / 2.0 + this.part) / SynthConfig_1.Config.partsPerBeat + this.beat) / song.beatsPerBar + this.bar;
        }
        /*
        const synthDuration: number = performance.now() - synthStartTime;
        // Performance measurements:
        samplesAccumulated += outputBufferLength;
        samplePerformance += synthDuration;
        
        if (samplesAccumulated >= 44100 * 4) {
            const secondsGenerated = samplesAccumulated / 44100;
            const secondsRequired = samplePerformance / 1000;
            const ratio = secondsRequired / secondsGenerated;
            console.log(ratio);
            samplePerformance = 0;
            samplesAccumulated = 0;
        }
        */
    };
    Synth.prototype.freeTone = function (tone) {
        this.tonePool.pushBack(tone);
    };
    Synth.prototype.newTone = function () {
        if (this.tonePool.count() > 0) {
            var tone = this.tonePool.popBack();
            tone.freshlyAllocated = true;
            return tone;
        }
        return new Tone();
    };
    Synth.prototype.releaseTone = function (instrumentState, tone) {
        instrumentState.releasedTones.pushFront(tone);
        tone.atNoteStart = false;
        tone.passedEndOfNote = true;
    };
    Synth.prototype.freeReleasedTone = function (instrumentState, toneIndex) {
        this.freeTone(instrumentState.releasedTones.get(toneIndex));
        instrumentState.releasedTones.remove(toneIndex);
    };
    Synth.prototype.freeAllTones = function () {
        for (var _i = 0, _a = this.channels; _i < _a.length; _i++) {
            var channelState = _a[_i];
            for (var _b = 0, _c = channelState.instruments; _b < _c.length; _b++) {
                var instrumentState = _c[_b];
                while (instrumentState.activeTones.count() > 0)
                    this.freeTone(instrumentState.activeTones.popBack());
                while (instrumentState.activeModTones.count() > 0)
                    this.freeTone(instrumentState.activeModTones.popBack());
                while (instrumentState.releasedTones.count() > 0)
                    this.freeTone(instrumentState.releasedTones.popBack());
                while (instrumentState.liveInputTones.count() > 0)
                    this.freeTone(instrumentState.liveInputTones.popBack());
            }
        }
    };
    Synth.prototype.determineLiveInputTones = function (song, channelIndex, samplesPerTick) {
        var channel = song.channels[channelIndex];
        var channelState = this.channels[channelIndex];
        var pitches = this.liveInputPitches;
        var bassPitches = this.liveBassInputPitches;
        var _loop_4 = function (instrumentIndex) {
            var instrumentState = channelState.instruments[instrumentIndex];
            var toneList = instrumentState.liveInputTones;
            var toneCount = 0;
            var instrument = channel.instruments[instrumentIndex];
            var filteredPitches = pitches;
            if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument.effects))
                filteredPitches = pitches.filter(function (pitch) { return pitch >= instrument.lowerNoteLimit && pitch <= instrument.upperNoteLimit; });
            var filteredBassPitches = bassPitches;
            if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument.effects))
                filteredBassPitches = bassPitches.filter(function (pitch) { return pitch >= instrument.lowerNoteLimit && pitch <= instrument.upperNoteLimit; });
            if (this_3.liveInputDuration > 0 && (channelIndex == this_3.liveInputChannel) && pitches.length > 0 && this_3.liveInputInstruments.indexOf(instrumentIndex) != -1) {
                var instrument_1 = channel.instruments[instrumentIndex];
                if (instrument_1.getChord().singleTone) {
                    var tone = void 0;
                    if (toneList.count() <= toneCount) {
                        tone = this_3.newTone();
                        toneList.pushBack(tone);
                    }
                    else if (!instrument_1.getTransition().isSeamless && this_3.liveInputStarted) {
                        this_3.releaseTone(instrumentState, toneList.get(toneCount));
                        tone = this_3.newTone();
                        toneList.set(toneCount, tone);
                    }
                    else {
                        tone = toneList.get(toneCount);
                    }
                    toneCount++;
                    for (var i = 0; i < filteredPitches.length; i++) {
                        tone.pitches[i] = filteredPitches[i];
                    }
                    tone.pitchCount = filteredPitches.length;
                    tone.chordSize = 1;
                    tone.instrumentIndex = instrumentIndex;
                    tone.note = tone.prevNote = tone.nextNote = null;
                    tone.atNoteStart = this_3.liveInputStarted;
                    tone.forceContinueAtStart = false;
                    tone.forceContinueAtEnd = false;
                    this_3.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
                }
                else {
                    //const transition: Transition = instrument.getTransition();
                    this_3.moveTonesIntoOrderedTempMatchedList(toneList, filteredPitches);
                    for (var i = 0; i < filteredPitches.length; i++) {
                        //const strumOffsetParts: number = i * instrument.getChord().strumParts;
                        var tone = void 0;
                        if (this_3.tempMatchedPitchTones[toneCount] != null) {
                            tone = this_3.tempMatchedPitchTones[toneCount];
                            this_3.tempMatchedPitchTones[toneCount] = null;
                            if (tone.pitchCount != 1 || tone.pitches[0] != filteredPitches[i]) {
                                this_3.releaseTone(instrumentState, tone);
                                tone = this_3.newTone();
                            }
                            toneList.pushBack(tone);
                        }
                        else {
                            tone = this_3.newTone();
                            toneList.pushBack(tone);
                        }
                        toneCount++;
                        tone.pitches[0] = filteredPitches[i];
                        tone.pitchCount = 1;
                        tone.chordSize = filteredPitches.length;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = tone.prevNote = tone.nextNote = null;
                        tone.atNoteStart = this_3.liveInputStarted;
                        tone.forceContinueAtStart = false;
                        tone.forceContinueAtEnd = false;
                        this_3.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
                    }
                }
            }
            if (this_3.liveBassInputDuration > 0 && (channelIndex == this_3.liveBassInputChannel) && filteredBassPitches.length > 0 && this_3.liveBassInputInstruments.indexOf(instrumentIndex) != -1) {
                var instrument_2 = channel.instruments[instrumentIndex];
                if (instrument_2.getChord().singleTone) {
                    var tone = void 0;
                    if (toneList.count() <= toneCount) {
                        tone = this_3.newTone();
                        toneList.pushBack(tone);
                    }
                    else if (!instrument_2.getTransition().isSeamless && this_3.liveInputStarted) {
                        this_3.releaseTone(instrumentState, toneList.get(toneCount));
                        tone = this_3.newTone();
                        toneList.set(toneCount, tone);
                    }
                    else {
                        tone = toneList.get(toneCount);
                    }
                    toneCount++;
                    for (var i = 0; i < filteredBassPitches.length; i++) {
                        tone.pitches[i] = filteredBassPitches[i];
                    }
                    tone.pitchCount = filteredBassPitches.length;
                    tone.chordSize = 1;
                    tone.instrumentIndex = instrumentIndex;
                    tone.note = tone.prevNote = tone.nextNote = null;
                    tone.atNoteStart = this_3.liveBassInputStarted;
                    tone.forceContinueAtStart = false;
                    tone.forceContinueAtEnd = false;
                    this_3.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
                }
                else {
                    //const transition: Transition = instrument.getTransition();
                    this_3.moveTonesIntoOrderedTempMatchedList(toneList, filteredBassPitches);
                    for (var i = 0; i < filteredBassPitches.length; i++) {
                        //const strumOffsetParts: number = i * instrument.getChord().strumParts;
                        var tone = void 0;
                        if (this_3.tempMatchedPitchTones[toneCount] != null) {
                            tone = this_3.tempMatchedPitchTones[toneCount];
                            this_3.tempMatchedPitchTones[toneCount] = null;
                            if (tone.pitchCount != 1 || tone.pitches[0] != filteredBassPitches[i]) {
                                this_3.releaseTone(instrumentState, tone);
                                tone = this_3.newTone();
                            }
                            toneList.pushBack(tone);
                        }
                        else {
                            tone = this_3.newTone();
                            toneList.pushBack(tone);
                        }
                        toneCount++;
                        tone.pitches[0] = filteredBassPitches[i];
                        tone.pitchCount = 1;
                        tone.chordSize = filteredBassPitches.length;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = tone.prevNote = tone.nextNote = null;
                        tone.atNoteStart = this_3.liveBassInputStarted;
                        tone.forceContinueAtStart = false;
                        tone.forceContinueAtEnd = false;
                        this_3.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
                    }
                }
            }
            while (toneList.count() > toneCount) {
                this_3.releaseTone(instrumentState, toneList.popBack());
            }
            this_3.clearTempMatchedPitchTones(toneCount, instrumentState);
        };
        var this_3 = this;
        for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
            _loop_4(instrumentIndex);
        }
        this.liveInputStarted = false;
        this.liveBassInputStarted = false;
    };
    // Returns the chord type of the instrument in the adjacent pattern if it is compatible for a
    // seamless transition across patterns, otherwise returns null.
    Synth.prototype.adjacentPatternHasCompatibleInstrumentTransition = function (song, channel, pattern, otherPattern, instrumentIndex, transition, chord, note, otherNote, forceContinue) {
        if (song.patternInstruments && otherPattern.instruments.indexOf(instrumentIndex) == -1) {
            // The adjacent pattern does not contain the same instrument as the current pattern.
            if (pattern.instruments.length > 1 || otherPattern.instruments.length > 1) {
                // The current or adjacent pattern contains more than one instrument, don't bother
                // trying to connect them.
                return null;
            }
            // Otherwise, the two patterns each contain one instrument, but not the same instrument.
            // Try to connect them.
            var otherInstrument = channel.instruments[otherPattern.instruments[0]];
            if (forceContinue) {
                // Even non-seamless instruments can be connected across patterns if forced.
                return otherInstrument.getChord();
            }
            // Otherwise, check that both instruments are seamless across patterns.
            var otherTransition = otherInstrument.getTransition();
            if (transition.includeAdjacentPatterns && otherTransition.includeAdjacentPatterns && otherTransition.slides == transition.slides) {
                return otherInstrument.getChord();
            }
            else {
                return null;
            }
        }
        else {
            // If both patterns contain the same instrument, check that it is seamless across patterns.
            return (forceContinue || transition.includeAdjacentPatterns) ? chord : null;
        }
    };
    Synth.adjacentNotesHaveMatchingPitches = function (firstNote, secondNote) {
        if (firstNote.pitches.length != secondNote.pitches.length)
            return false;
        var firstNoteInterval = firstNote.pins[firstNote.pins.length - 1].interval;
        for (var _i = 0, _a = firstNote.pitches; _i < _a.length; _i++) {
            var pitch = _a[_i];
            if (secondNote.pitches.indexOf(pitch + firstNoteInterval) == -1)
                return false;
        }
        return true;
    };
    Synth.prototype.moveTonesIntoOrderedTempMatchedList = function (toneList, notePitches) {
        // The tones are about to seamlessly transition to a new note. The pitches
        // from the old note may or may not match any of the pitches in the new
        // note, and not necessarily in order, but if any do match, they'll sound
        // better if those tones continue to have the same pitch. Attempt to find
        // the right spot for each old tone in the new chord if possible.
        for (var i = 0; i < toneList.count(); i++) {
            var tone = toneList.get(i);
            var pitch = tone.pitches[0] + tone.lastInterval;
            for (var j = 0; j < notePitches.length; j++) {
                if (notePitches[j] == pitch) {
                    this.tempMatchedPitchTones[j] = tone;
                    toneList.remove(i);
                    i--;
                    break;
                }
            }
        }
        // Any tones that didn't get matched should just fill in the gaps.
        while (toneList.count() > 0) {
            var tone = toneList.popFront();
            for (var j = 0; j < this.tempMatchedPitchTones.length; j++) {
                if (this.tempMatchedPitchTones[j] == null) {
                    this.tempMatchedPitchTones[j] = tone;
                    break;
                }
            }
        }
    };
    Synth.prototype.determineCurrentActiveTones = function (song, channelIndex, samplesPerTick, playSong) {
        var channel = song.channels[channelIndex];
        var channelState = this.channels[channelIndex];
        var pattern = song.getPattern(channelIndex, this.bar);
        var currentPart = this.getCurrentPart();
        var currentTick = this.tick + SynthConfig_1.Config.ticksPerPart * currentPart;
        if (playSong && song.getChannelIsMod(channelIndex)) {
            // For mod channels, notes aren't strictly arranged chronologically. Also, each pitch value could play or not play at a given time. So... a bit more computation involved!
            // The same transition logic should apply though, even though it isn't really used by mod channels.
            var notes = [];
            var prevNotes = [];
            var nextNotes = [];
            var fillCount = SynthConfig_1.Config.modCount;
            while (fillCount--) {
                notes.push(null);
                prevNotes.push(null);
                nextNotes.push(null);
            }
            if (pattern != null && !channel.muted) {
                for (var i = 0; i < pattern.notes.length; i++) {
                    if (pattern.notes[i].end <= currentPart) {
                        // Actually need to check which note starts closer to the start of this note.
                        if (prevNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].end > prevNotes[pattern.notes[i].pitches[0]].start) {
                            prevNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                        }
                    }
                    else if (pattern.notes[i].start <= currentPart && pattern.notes[i].end > currentPart) {
                        notes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start > currentPart) {
                        // Actually need to check which note starts closer to the end of this note.
                        if (nextNotes[pattern.notes[i].pitches[0]] == null || pattern.notes[i].start < nextNotes[pattern.notes[i].pitches[0]].start) {
                            nextNotes[pattern.notes[i].pitches[0]] = pattern.notes[i];
                        }
                    }
                }
            }
            var modToneCount = 0;
            var newInstrumentIndex = (song.patternInstruments && (pattern != null)) ? pattern.instruments[0] : 0;
            var instrumentState = channelState.instruments[newInstrumentIndex];
            var toneList = instrumentState.activeModTones;
            for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                if (notes[mod] != null) {
                    if (prevNotes[mod] != null && prevNotes[mod].end != notes[mod].start)
                        prevNotes[mod] = null;
                    if (nextNotes[mod] != null && nextNotes[mod].start != notes[mod].end)
                        nextNotes[mod] = null;
                }
                if (channelState.singleSeamlessInstrument != null && channelState.singleSeamlessInstrument != newInstrumentIndex && channelState.singleSeamlessInstrument < channelState.instruments.length) {
                    var sourceInstrumentState = channelState.instruments[channelState.singleSeamlessInstrument];
                    var destInstrumentState = channelState.instruments[newInstrumentIndex];
                    while (sourceInstrumentState.activeModTones.count() > 0) {
                        destInstrumentState.activeModTones.pushFront(sourceInstrumentState.activeModTones.popBack());
                    }
                }
                channelState.singleSeamlessInstrument = newInstrumentIndex;
                if (notes[mod] != null) {
                    var prevNoteForThisInstrument = prevNotes[mod];
                    var nextNoteForThisInstrument = nextNotes[mod];
                    var forceContinueAtStart = false;
                    var forceContinueAtEnd = false;
                    var atNoteStart = (SynthConfig_1.Config.ticksPerPart * notes[mod].start == currentTick) && this.isAtStartOfTick;
                    var tone = void 0;
                    if (toneList.count() <= modToneCount) {
                        tone = this.newTone();
                        toneList.pushBack(tone);
                    }
                    else if (atNoteStart && (prevNoteForThisInstrument == null)) {
                        var oldTone = toneList.get(modToneCount);
                        if (oldTone.isOnLastTick) {
                            this.freeTone(oldTone);
                        }
                        else {
                            this.releaseTone(instrumentState, oldTone);
                        }
                        tone = this.newTone();
                        toneList.set(modToneCount, tone);
                    }
                    else {
                        tone = toneList.get(modToneCount);
                    }
                    modToneCount++;
                    for (var i = 0; i < notes[mod].pitches.length; i++) {
                        tone.pitches[i] = notes[mod].pitches[i];
                    }
                    tone.pitchCount = notes[mod].pitches.length;
                    tone.chordSize = 1;
                    tone.instrumentIndex = newInstrumentIndex;
                    tone.note = notes[mod];
                    tone.noteStartPart = notes[mod].start;
                    tone.noteEndPart = notes[mod].end;
                    tone.prevNote = prevNoteForThisInstrument;
                    tone.nextNote = nextNoteForThisInstrument;
                    tone.prevNotePitchIndex = 0;
                    tone.nextNotePitchIndex = 0;
                    tone.atNoteStart = atNoteStart;
                    tone.passedEndOfNote = false;
                    tone.forceContinueAtStart = forceContinueAtStart;
                    tone.forceContinueAtEnd = forceContinueAtEnd;
                }
            }
            // Automatically free or release seamless tones if there's no new note to take over.
            while (toneList.count() > modToneCount) {
                var tone = toneList.popBack();
                var channel_3 = song.channels[channelIndex];
                if (tone.instrumentIndex < channel_3.instruments.length && !tone.isOnLastTick) {
                    var instrumentState_1 = this.channels[channelIndex].instruments[tone.instrumentIndex];
                    this.releaseTone(instrumentState_1, tone);
                }
                else {
                    this.freeTone(tone);
                }
            }
        }
        else if (!song.getChannelIsMod(channelIndex)) {
            var note = null;
            var prevNote = null;
            var nextNote = null;
            if (playSong && pattern != null && !channel.muted && (!this.isRecording || this.liveInputChannel != channelIndex)) {
                for (var i = 0; i < pattern.notes.length; i++) {
                    if (pattern.notes[i].end <= currentPart) {
                        prevNote = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start <= currentPart && pattern.notes[i].end > currentPart) {
                        note = pattern.notes[i];
                    }
                    else if (pattern.notes[i].start > currentPart) {
                        nextNote = pattern.notes[i];
                        break;
                    }
                }
                if (note != null) {
                    if (prevNote != null && prevNote.end != note.start)
                        prevNote = null;
                    if (nextNote != null && nextNote.start != note.end)
                        nextNote = null;
                }
            }
            // Seamless tones from a pattern with a single instrument can be transferred to a different single seamless instrument in the next pattern.
            if (pattern != null && (!song.layeredInstruments || channel.instruments.length == 1 || (song.patternInstruments && pattern.instruments.length == 1))) {
                var newInstrumentIndex = song.patternInstruments ? pattern.instruments[0] : 0;
                if (channelState.singleSeamlessInstrument != null && channelState.singleSeamlessInstrument != newInstrumentIndex && channelState.singleSeamlessInstrument < channelState.instruments.length) {
                    var sourceInstrumentState = channelState.instruments[channelState.singleSeamlessInstrument];
                    var destInstrumentState = channelState.instruments[newInstrumentIndex];
                    while (sourceInstrumentState.activeTones.count() > 0) {
                        destInstrumentState.activeTones.pushFront(sourceInstrumentState.activeTones.popBack());
                    }
                }
                channelState.singleSeamlessInstrument = newInstrumentIndex;
            }
            else {
                channelState.singleSeamlessInstrument = null;
            }
            var _loop_5 = function (instrumentIndex) {
                var instrumentState = channelState.instruments[instrumentIndex];
                var toneList = instrumentState.activeTones;
                var toneCount = 0;
                if ((note != null) && (!song.patternInstruments || (pattern.instruments.indexOf(instrumentIndex) != -1))) {
                    var instrument_3 = channel.instruments[instrumentIndex];
                    var prevNoteForThisInstrument = prevNote;
                    var nextNoteForThisInstrument = nextNote;
                    var partsPerBar = SynthConfig_1.Config.partsPerBeat * song.beatsPerBar;
                    var transition = instrument_3.getTransition();
                    var chord = instrument_3.getChord();
                    var forceContinueAtStart = false;
                    var forceContinueAtEnd = false;
                    var tonesInPrevNote = 0;
                    var tonesInNextNote = 0;
                    if (note.start == 0) {
                        // If the beginning of the note coincides with the beginning of the pattern,
                        var prevPattern = (this_4.prevBar == null) ? null : song.getPattern(channelIndex, this_4.prevBar);
                        if (prevPattern != null) {
                            var lastNote = (prevPattern.notes.length <= 0) ? null : prevPattern.notes[prevPattern.notes.length - 1];
                            if (lastNote != null && lastNote.end == partsPerBar) {
                                var patternForcesContinueAtStart = note.continuesLastPattern && Synth.adjacentNotesHaveMatchingPitches(lastNote, note);
                                var chordOfCompatibleInstrument = this_4.adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern, prevPattern, instrumentIndex, transition, chord, note, lastNote, patternForcesContinueAtStart);
                                if (chordOfCompatibleInstrument != null) {
                                    prevNoteForThisInstrument = lastNote;
                                    var prevPitchesForThisInstrument = prevNoteForThisInstrument.pitches;
                                    tonesInPrevNote = chordOfCompatibleInstrument.singleTone ? 1 : prevPitchesForThisInstrument.length;
                                    forceContinueAtStart = patternForcesContinueAtStart;
                                }
                            }
                        }
                    }
                    else if (prevNoteForThisInstrument != null) {
                        var prevPitchesForThisInstrument = prevNoteForThisInstrument.pitches;
                        tonesInPrevNote = chord.singleTone ? 1 : prevPitchesForThisInstrument.length;
                    }
                    if (note.end == partsPerBar) {
                        // If the end of the note coincides with the end of the pattern, look for an
                        // adjacent note at the beginning of the next pattern.
                        var nextPattern = (this_4.nextBar == null) ? null : song.getPattern(channelIndex, this_4.nextBar);
                        if (nextPattern != null) {
                            var firstNote = (nextPattern.notes.length <= 0) ? null : nextPattern.notes[0];
                            if (firstNote != null && firstNote.start == 0) {
                                var nextPatternForcesContinueAtStart = firstNote.continuesLastPattern && Synth.adjacentNotesHaveMatchingPitches(note, firstNote);
                                var chordOfCompatibleInstrument = this_4.adjacentPatternHasCompatibleInstrumentTransition(song, channel, pattern, nextPattern, instrumentIndex, transition, chord, note, firstNote, nextPatternForcesContinueAtStart);
                                if (chordOfCompatibleInstrument != null) {
                                    nextNoteForThisInstrument = firstNote;
                                    tonesInNextNote = chordOfCompatibleInstrument.singleTone ? 1 : nextNoteForThisInstrument.pitches.length;
                                    forceContinueAtEnd = nextPatternForcesContinueAtStart;
                                }
                            }
                        }
                    }
                    else if (nextNoteForThisInstrument != null) {
                        tonesInNextNote = chord.singleTone ? 1 : nextNoteForThisInstrument.pitches.length;
                    }
                    var filteredPitches = note.pitches;
                    if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument_3.effects))
                        filteredPitches = note.pitches.filter(function (pitch) { return pitch >= instrument_3.lowerNoteLimit && pitch <= instrument_3.upperNoteLimit; });
                    if (chord.singleTone && !(filteredPitches.length <= 0)) {
                        var atNoteStart = (SynthConfig_1.Config.ticksPerPart * note.start == currentTick);
                        var tone = void 0;
                        if (toneList.count() <= toneCount) {
                            tone = this_4.newTone();
                            toneList.pushBack(tone);
                        }
                        else if (atNoteStart && ((!(transition.isSeamless || instrument_3.clicklessTransition) && !forceContinueAtStart) || prevNoteForThisInstrument == null)) {
                            var oldTone = toneList.get(toneCount);
                            if (oldTone.isOnLastTick) {
                                this_4.freeTone(oldTone);
                            }
                            else {
                                this_4.releaseTone(instrumentState, oldTone);
                            }
                            tone = this_4.newTone();
                            toneList.set(toneCount, tone);
                        }
                        else {
                            tone = toneList.get(toneCount);
                        }
                        toneCount++;
                        for (var i = 0; i < filteredPitches.length; i++) {
                            tone.pitches[i] = filteredPitches[i];
                        }
                        tone.pitchCount = filteredPitches.length;
                        tone.chordSize = 1;
                        tone.instrumentIndex = instrumentIndex;
                        tone.note = note;
                        tone.noteStartPart = note.start;
                        tone.noteEndPart = note.end;
                        tone.prevNote = prevNoteForThisInstrument;
                        tone.nextNote = nextNoteForThisInstrument;
                        tone.prevNotePitchIndex = 0;
                        tone.nextNotePitchIndex = 0;
                        tone.atNoteStart = atNoteStart;
                        tone.passedEndOfNote = false;
                        tone.forceContinueAtStart = forceContinueAtStart;
                        tone.forceContinueAtEnd = forceContinueAtEnd;
                        this_4.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
                    }
                    else {
                        var transition_1 = instrument_3.getTransition();
                        if (((transition_1.isSeamless && !transition_1.slides && chord.strumParts == 0) || forceContinueAtStart) && (SynthConfig_1.Config.ticksPerPart * note.start == currentTick) && prevNoteForThisInstrument != null) {
                            this_4.moveTonesIntoOrderedTempMatchedList(toneList, filteredPitches);
                        }
                        var strumOffsetParts = 0;
                        for (var i = 0; i < filteredPitches.length; i++) {
                            var prevNoteForThisTone = (tonesInPrevNote > i) ? prevNoteForThisInstrument : null;
                            var noteForThisTone = note;
                            var pitchesForThisTone = filteredPitches;
                            var nextNoteForThisTone = (tonesInNextNote > i) ? nextNoteForThisInstrument : null;
                            var noteStartPart = noteForThisTone.start + strumOffsetParts;
                            var passedEndOfNote = false;
                            // Strumming may mean that a note's actual start time may be after the
                            // note's displayed start time. If the note start hasn't been reached yet,
                            // carry over the previous tone if available and seamless, otherwise skip
                            // the new tone until it is ready to start.
                            if (noteStartPart > currentPart) {
                                if (toneList.count() > i && (transition_1.isSeamless || forceContinueAtStart) && prevNoteForThisTone != null) {
                                    // Continue the previous note's chord until the current one takes over.
                                    nextNoteForThisTone = noteForThisTone;
                                    noteForThisTone = prevNoteForThisTone;
                                    pitchesForThisTone = noteForThisTone.pitches;
                                    if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument_3.effects))
                                        pitchesForThisTone = pitchesForThisTone.filter(function (pitch) { return pitch >= instrument_3.lowerNoteLimit && pitch <= instrument_3.upperNoteLimit; });
                                    prevNoteForThisTone = null;
                                    noteStartPart = noteForThisTone.start + strumOffsetParts;
                                    passedEndOfNote = true;
                                }
                                else {
                                    // This and the rest of the tones in the chord shouldn't start yet.
                                    break;
                                }
                            }
                            var noteEndPart = noteForThisTone.end;
                            if ((transition_1.isSeamless || forceContinueAtStart) && nextNoteForThisTone != null) {
                                noteEndPart = Math.min(SynthConfig_1.Config.partsPerBeat * this_4.song.beatsPerBar, noteEndPart + strumOffsetParts);
                            }
                            if ((!transition_1.continues && !forceContinueAtStart) || prevNoteForThisTone == null) {
                                strumOffsetParts += chord.strumParts;
                            }
                            var atNoteStart = (SynthConfig_1.Config.ticksPerPart * noteStartPart == currentTick);
                            var tone = void 0;
                            if (this_4.tempMatchedPitchTones[toneCount] != null) {
                                tone = this_4.tempMatchedPitchTones[toneCount];
                                this_4.tempMatchedPitchTones[toneCount] = null;
                                toneList.pushBack(tone);
                            }
                            else if (toneList.count() <= toneCount) {
                                tone = this_4.newTone();
                                toneList.pushBack(tone);
                            }
                            else if (atNoteStart && ((!transition_1.isSeamless && !forceContinueAtStart) || prevNoteForThisTone == null)) {
                                var oldTone = toneList.get(toneCount);
                                if (oldTone.isOnLastTick) {
                                    this_4.freeTone(oldTone);
                                }
                                else {
                                    this_4.releaseTone(instrumentState, oldTone);
                                }
                                tone = this_4.newTone();
                                toneList.set(toneCount, tone);
                            }
                            else {
                                tone = toneList.get(toneCount);
                            }
                            toneCount++;
                            tone.pitches[0] = noteForThisTone.pitches[i];
                            tone.pitchCount = 1;
                            tone.chordSize = noteForThisTone.pitches.length;
                            tone.instrumentIndex = instrumentIndex;
                            tone.note = noteForThisTone;
                            tone.noteStartPart = noteStartPart;
                            tone.noteEndPart = noteEndPart;
                            tone.prevNote = prevNoteForThisTone;
                            tone.nextNote = nextNoteForThisTone;
                            tone.prevNotePitchIndex = i;
                            tone.nextNotePitchIndex = i;
                            tone.atNoteStart = atNoteStart;
                            tone.passedEndOfNote = passedEndOfNote;
                            tone.forceContinueAtStart = forceContinueAtStart && prevNoteForThisTone != null;
                            tone.forceContinueAtEnd = forceContinueAtEnd && nextNoteForThisTone != null;
                            this_4.computeTone(song, channelIndex, samplesPerTick, tone, false, false);
                        }
                    }
                    if (transition.continues && (toneList.count() <= 0) || (note.pitches.length <= 0))
                        instrumentState.envelopeComputer.reset(); //stop computing effects envelopes
                }
                // Automatically free or release seamless tones if there's no new note to take over.
                while (toneList.count() > toneCount) {
                    var tone = toneList.popBack();
                    var channel_4 = song.channels[channelIndex];
                    if (tone.instrumentIndex < channel_4.instruments.length && !tone.isOnLastTick) {
                        var instrumentState_2 = channelState.instruments[tone.instrumentIndex];
                        this_4.releaseTone(instrumentState_2, tone);
                    }
                    else {
                        this_4.freeTone(tone);
                    }
                }
                this_4.clearTempMatchedPitchTones(toneCount, instrumentState);
            };
            var this_4 = this;
            for (var instrumentIndex = 0; instrumentIndex < channel.instruments.length; instrumentIndex++) {
                _loop_5(instrumentIndex);
            }
        }
    };
    Synth.prototype.clearTempMatchedPitchTones = function (toneCount, instrumentState) {
        for (var i = toneCount; i < this.tempMatchedPitchTones.length; i++) {
            var oldTone = this.tempMatchedPitchTones[i];
            if (oldTone != null) {
                if (oldTone.isOnLastTick) {
                    this.freeTone(oldTone);
                }
                else {
                    this.releaseTone(instrumentState, oldTone);
                }
                this.tempMatchedPitchTones[i] = null;
            }
        }
    };
    Synth.prototype.playTone = function (channelIndex, bufferIndex, runLength, tone) {
        var channelState = this.channels[channelIndex];
        var instrumentState = channelState.instruments[tone.instrumentIndex];
        if (instrumentState.synthesizer != null)
            instrumentState.synthesizer(this, bufferIndex, runLength, tone, instrumentState);
        tone.envelopeComputer.clearEnvelopes();
        instrumentState.envelopeComputer.clearEnvelopes();
    };
    // Computes mod note position at the start and end of the window and "plays" the mod tone, setting appropriate mod data.
    Synth.prototype.playModTone = function (song, channelIndex, samplesPerTick, bufferIndex, roundedSamplesPerTick, tone, released, shouldFadeOutFast) {
        var channel = song.channels[channelIndex];
        var instrument = channel.instruments[tone.instrumentIndex];
        if (tone.note != null) {
            var ticksIntoBar = this.getTicksIntoBar();
            var partTimeTickStart = (ticksIntoBar) / SynthConfig_1.Config.ticksPerPart;
            var partTimeTickEnd = (ticksIntoBar + 1) / SynthConfig_1.Config.ticksPerPart;
            var tickSampleCountdown = this.tickSampleCountdown;
            var startRatio = 1.0 - (tickSampleCountdown) / samplesPerTick;
            var endRatio = 1.0 - (tickSampleCountdown - roundedSamplesPerTick) / samplesPerTick;
            var partTimeStart = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * startRatio;
            var partTimeEnd = partTimeTickStart + (partTimeTickEnd - partTimeTickStart) * endRatio;
            var tickTimeStart = SynthConfig_1.Config.ticksPerPart * partTimeStart;
            var tickTimeEnd = SynthConfig_1.Config.ticksPerPart * partTimeEnd;
            var endPinIndex = tone.note.getEndPinIndex(this.getCurrentPart());
            var startPin = tone.note.pins[endPinIndex - 1];
            var endPin = tone.note.pins[endPinIndex];
            var startPinTick = (tone.note.start + startPin.time) * SynthConfig_1.Config.ticksPerPart;
            var endPinTick = (tone.note.start + endPin.time) * SynthConfig_1.Config.ticksPerPart;
            var ratioStart = (tickTimeStart - startPinTick) / (endPinTick - startPinTick);
            var ratioEnd = (tickTimeEnd - startPinTick) / (endPinTick - startPinTick);
            tone.expression = startPin.size + (endPin.size - startPin.size) * ratioStart;
            tone.expressionDelta = (startPin.size + (endPin.size - startPin.size) * ratioEnd) - tone.expression;
            Synth.modSynth(this, bufferIndex, roundedSamplesPerTick, tone, instrument);
        }
    };
    Synth.computeChordExpression = function (chordSize) {
        return 1.0 / ((chordSize - 1) * 0.25 + 1.0);
    };
    Synth.prototype.computeTone = function (song, channelIndex, samplesPerTick, tone, released, shouldFadeOutFast) {
        var roundedSamplesPerTick = Math.ceil(samplesPerTick);
        var channel = song.channels[channelIndex];
        var channelState = this.channels[channelIndex];
        var instrument = channel.instruments[tone.instrumentIndex];
        var instrumentState = channelState.instruments[tone.instrumentIndex];
        instrumentState.awake = true;
        instrumentState.tonesAddedInThisTick = true;
        if (!instrumentState.computed) {
            instrumentState.compute(this, instrument, samplesPerTick, roundedSamplesPerTick, tone, channelIndex, tone.instrumentIndex);
        }
        var transition = instrument.getTransition();
        var chord = instrument.getChord();
        var chordExpression = chord.singleTone ? 1.0 : Synth.computeChordExpression(tone.chordSize);
        var isNoiseChannel = song.getChannelIsNoise(channelIndex);
        var intervalScale = isNoiseChannel ? SynthConfig_1.Config.noiseInterval : 1;
        var secondsPerPart = SynthConfig_1.Config.ticksPerPart * samplesPerTick / this.samplesPerSecond;
        var sampleTime = 1.0 / this.samplesPerSecond;
        var beatsPerPart = 1.0 / SynthConfig_1.Config.partsPerBeat;
        var ticksIntoBar = this.getTicksIntoBar();
        var partTimeStart = (ticksIntoBar) / SynthConfig_1.Config.ticksPerPart;
        var partTimeEnd = (ticksIntoBar + 1.0) / SynthConfig_1.Config.ticksPerPart;
        var currentPart = this.getCurrentPart();
        var specialIntervalMult = 1.0;
        tone.specialIntervalExpressionMult = 1.0;
        //if (synth.isModActive(ModSetting.mstPan, channelIndex, tone.instrumentIndex)) {
        //    startPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, false);
        //    endPan = synth.getModValue(ModSetting.mstPan, false, channel, instrumentIdx, true);
        //}
        var toneIsOnLastTick = shouldFadeOutFast;
        var intervalStart = 0.0;
        var intervalEnd = 0.0;
        var fadeExpressionStart = 1.0;
        var fadeExpressionEnd = 1.0;
        var chordExpressionStart = chordExpression;
        var chordExpressionEnd = chordExpression;
        var expressionReferencePitch = 16; // A low "E" as a MIDI pitch.
        var basePitch = SynthConfig_1.Config.keys[song.key].basePitch + (SynthConfig_1.Config.pitchesPerOctave * song.octave);
        var baseExpression = 1.0;
        var pitchDamping = 48;
        if (instrument.type == 3 /* InstrumentType.spectrum */) {
            baseExpression = SynthConfig_1.Config.spectrumBaseExpression;
            if (isNoiseChannel) {
                basePitch = SynthConfig_1.Config.spectrumBasePitch;
                baseExpression *= 2.0; // Note: spectrum is louder for drum channels than pitch channels!
            }
            expressionReferencePitch = SynthConfig_1.Config.spectrumBasePitch;
            pitchDamping = 28;
        }
        else if (instrument.type == 4 /* InstrumentType.drumset */) {
            basePitch = SynthConfig_1.Config.spectrumBasePitch;
            baseExpression = SynthConfig_1.Config.drumsetBaseExpression;
            expressionReferencePitch = basePitch;
        }
        else if (instrument.type == 2 /* InstrumentType.noise */) {
            // dogebox2 code, makes basic noise affected by keys in pitch channels
            basePitch = isNoiseChannel ? SynthConfig_1.Config.chipNoises[instrument.chipNoise].basePitch : basePitch + SynthConfig_1.Config.chipNoises[instrument.chipNoise].basePitch - 12;
            // maybe also lower expression in pitch channels?
            baseExpression = SynthConfig_1.Config.noiseBaseExpression;
            expressionReferencePitch = basePitch;
            pitchDamping = SynthConfig_1.Config.chipNoises[instrument.chipNoise].isSoft ? 24.0 : 60.0;
        }
        else if (instrument.type == 1 /* InstrumentType.fm */ || instrument.type == 11 /* InstrumentType.fm6op */) {
            baseExpression = SynthConfig_1.Config.fmBaseExpression;
        }
        else if (instrument.type == 0 /* InstrumentType.chip */) {
            baseExpression = SynthConfig_1.Config.chipBaseExpression;
            if (SynthConfig_1.Config.chipWaves[instrument.chipWave].isCustomSampled) {
                if (SynthConfig_1.Config.chipWaves[instrument.chipWave].isPercussion) {
                    basePitch = -84.37 + Math.log2(SynthConfig_1.Config.chipWaves[instrument.chipWave].samples.length / SynthConfig_1.Config.chipWaves[instrument.chipWave].sampleRate) * -12 - (-60 + SynthConfig_1.Config.chipWaves[instrument.chipWave].rootKey);
                }
                else {
                    basePitch += -96.37 + Math.log2(SynthConfig_1.Config.chipWaves[instrument.chipWave].samples.length / SynthConfig_1.Config.chipWaves[instrument.chipWave].sampleRate) * -12 - (-60 + SynthConfig_1.Config.chipWaves[instrument.chipWave].rootKey);
                }
            }
            else {
                if (SynthConfig_1.Config.chipWaves[instrument.chipWave].isSampled && !SynthConfig_1.Config.chipWaves[instrument.chipWave].isPercussion) {
                    basePitch = basePitch - 63 + SynthConfig_1.Config.chipWaves[instrument.chipWave].extraSampleDetune;
                }
                else if (SynthConfig_1.Config.chipWaves[instrument.chipWave].isSampled && SynthConfig_1.Config.chipWaves[instrument.chipWave].isPercussion) {
                    basePitch = -51 + SynthConfig_1.Config.chipWaves[instrument.chipWave].extraSampleDetune;
                }
            }
        }
        else if (instrument.type == 9 /* InstrumentType.customChipWave */) {
            baseExpression = SynthConfig_1.Config.chipBaseExpression;
        }
        else if (instrument.type == 5 /* InstrumentType.harmonics */) {
            baseExpression = SynthConfig_1.Config.harmonicsBaseExpression;
        }
        else if (instrument.type == 6 /* InstrumentType.pwm */) {
            baseExpression = SynthConfig_1.Config.pwmBaseExpression;
        }
        else if (instrument.type == 8 /* InstrumentType.supersaw */) {
            baseExpression = SynthConfig_1.Config.supersawBaseExpression;
        }
        else if (instrument.type == 7 /* InstrumentType.pickedString */) {
            baseExpression = SynthConfig_1.Config.pickedStringBaseExpression;
        }
        else if (instrument.type == 10 /* InstrumentType.mod */) {
            baseExpression = 1.0;
            expressionReferencePitch = 0;
            pitchDamping = 1.0;
            basePitch = 0;
        }
        else {
            throw new Error("Unknown instrument type in computeTone.");
        }
        if ((tone.atNoteStart && !transition.isSeamless && !tone.forceContinueAtStart) || tone.freshlyAllocated) {
            tone.reset();
            instrumentState.envelopeComputer.reset();
            // advloop addition
            if (instrument.type == 0 /* InstrumentType.chip */ && instrument.isUsingAdvancedLoopControls) {
                var chipWaveLength = SynthConfig_1.Config.rawRawChipWaves[instrument.chipWave].samples.length - 1;
                var firstOffset = instrument.chipWaveStartOffset / chipWaveLength;
                // const lastOffset = (chipWaveLength - 0.01) / chipWaveLength;
                // @TODO: This is silly and I should actually figure out how to
                // properly keep lastOffset as 1.0 and not get it wrapped back
                // to 0 once it's in `Synth.loopableChipSynth`.
                var lastOffset = 0.999999999999999;
                for (var i = 0; i < SynthConfig_1.Config.maxPitchOrOperatorCount; i++) {
                    tone.phases[i] = instrument.chipWavePlayBackwards ? Math.max(0, Math.min(lastOffset, firstOffset)) : Math.max(0, firstOffset);
                    tone.directions[i] = instrument.chipWavePlayBackwards ? -1 : 1;
                    tone.chipWaveCompletions[i] = 0;
                    tone.chipWavePrevWaves[i] = 0;
                    tone.chipWaveCompletionsLastWave[i] = 0;
                }
            }
            // advloop addition
        }
        tone.freshlyAllocated = false;
        for (var i = 0; i < SynthConfig_1.Config.maxPitchOrOperatorCount; i++) {
            tone.phaseDeltas[i] = 0.0;
            tone.phaseDeltaScales[i] = 0.0;
            tone.operatorExpressions[i] = 0.0;
            tone.operatorExpressionDeltas[i] = 0.0;
        }
        tone.expression = 0.0;
        tone.expressionDelta = 0.0;
        for (var i = 0; i < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); i++) {
            tone.operatorWaves[i] = Synth.getOperatorWave(instrument.operators[i].waveform, instrument.operators[i].pulseWidth);
        }
        if (released) {
            var startTicksSinceReleased = tone.ticksSinceReleased;
            var endTicksSinceReleased = tone.ticksSinceReleased + 1.0;
            intervalStart = intervalEnd = tone.lastInterval;
            var fadeOutTicks = Math.abs(instrument.getFadeOutTicks());
            fadeExpressionStart = Synth.noteSizeToVolumeMult((1.0 - startTicksSinceReleased / fadeOutTicks) * SynthConfig_1.Config.noteSizeMax);
            fadeExpressionEnd = Synth.noteSizeToVolumeMult((1.0 - endTicksSinceReleased / fadeOutTicks) * SynthConfig_1.Config.noteSizeMax);
            if (shouldFadeOutFast) {
                fadeExpressionEnd = 0.0;
            }
            if (tone.ticksSinceReleased + 1 >= fadeOutTicks)
                toneIsOnLastTick = true;
        }
        else if (tone.note == null) {
            fadeExpressionStart = fadeExpressionEnd = 1.0;
            tone.lastInterval = 0;
            tone.ticksSinceReleased = 0;
            tone.liveInputSamplesHeld += roundedSamplesPerTick;
        }
        else {
            var note = tone.note;
            var nextNote = tone.nextNote;
            var noteStartPart = tone.noteStartPart;
            var noteEndPart = tone.noteEndPart;
            var endPinIndex = note.getEndPinIndex(currentPart);
            var startPin = note.pins[endPinIndex - 1];
            var endPin = note.pins[endPinIndex];
            var noteStartTick = noteStartPart * SynthConfig_1.Config.ticksPerPart;
            var noteEndTick = noteEndPart * SynthConfig_1.Config.ticksPerPart;
            var pinStart = (note.start + startPin.time) * SynthConfig_1.Config.ticksPerPart;
            var pinEnd = (note.start + endPin.time) * SynthConfig_1.Config.ticksPerPart;
            tone.ticksSinceReleased = 0;
            var tickTimeStart = currentPart * SynthConfig_1.Config.ticksPerPart + this.tick;
            var tickTimeEnd = tickTimeStart + 1.0;
            var noteTicksPassedTickStart = tickTimeStart - noteStartTick;
            var noteTicksPassedTickEnd = tickTimeEnd - noteStartTick;
            var pinRatioStart = Math.min(1.0, (tickTimeStart - pinStart) / (pinEnd - pinStart));
            var pinRatioEnd = Math.min(1.0, (tickTimeEnd - pinStart) / (pinEnd - pinStart));
            fadeExpressionStart = 1.0;
            fadeExpressionEnd = 1.0;
            intervalStart = startPin.interval + (endPin.interval - startPin.interval) * pinRatioStart;
            intervalEnd = startPin.interval + (endPin.interval - startPin.interval) * pinRatioEnd;
            tone.lastInterval = intervalEnd;
            if ((!transition.isSeamless && !tone.forceContinueAtEnd) || nextNote == null) {
                var fadeOutTicks = -instrument.getFadeOutTicks();
                if (fadeOutTicks > 0.0) {
                    // If the tone should fade out before the end of the note, do so here.
                    var noteLengthTicks = noteEndTick - noteStartTick;
                    fadeExpressionStart *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickStart) / fadeOutTicks);
                    fadeExpressionEnd *= Math.min(1.0, (noteLengthTicks - noteTicksPassedTickEnd) / fadeOutTicks);
                    if (tickTimeEnd >= noteStartTick + noteLengthTicks)
                        toneIsOnLastTick = true;
                }
            }
        }
        tone.isOnLastTick = toneIsOnLastTick;
        var tmpNoteFilter = instrument.noteFilter;
        var startPoint;
        var endPoint;
        if (instrument.noteFilterType) {
            // Simple EQ filter (old style). For analysis, using random filters from normal style since they are N/A in this context.
            var noteFilterSettingsStart = instrument.noteFilter;
            if (instrument.noteSubFilters[1] == null)
                instrument.noteSubFilters[1] = new FilterSettings();
            var noteFilterSettingsEnd = instrument.noteSubFilters[1];
            // Change location based on slider values
            var startSimpleFreq = instrument.noteFilterSimpleCut;
            var startSimpleGain = instrument.noteFilterSimplePeak;
            var endSimpleFreq = instrument.noteFilterSimpleCut;
            var endSimpleGain = instrument.noteFilterSimplePeak;
            var filterChanges = false;
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["note filt cut"].index, channelIndex, tone.instrumentIndex)) {
                startSimpleFreq = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note filt cut"].index, channelIndex, tone.instrumentIndex, false);
                endSimpleFreq = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note filt cut"].index, channelIndex, tone.instrumentIndex, true);
                filterChanges = true;
            }
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["note filt peak"].index, channelIndex, tone.instrumentIndex)) {
                startSimpleGain = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note filt peak"].index, channelIndex, tone.instrumentIndex, false);
                endSimpleGain = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note filt peak"].index, channelIndex, tone.instrumentIndex, true);
                filterChanges = true;
            }
            noteFilterSettingsStart.convertLegacySettingsForSynth(startSimpleFreq, startSimpleGain, !filterChanges);
            noteFilterSettingsEnd.convertLegacySettingsForSynth(endSimpleFreq, endSimpleGain, !filterChanges);
            startPoint = noteFilterSettingsStart.controlPoints[0];
            endPoint = noteFilterSettingsEnd.controlPoints[0];
            // Temporarily override so that envelope computer uses appropriate computed note filter
            instrument.noteFilter = noteFilterSettingsStart;
            instrument.tmpNoteFilterStart = noteFilterSettingsStart;
        }
        // Compute envelopes *after* resetting the tone, otherwise the envelope computer gets reset too!
        var envelopeComputer = tone.envelopeComputer;
        var envelopeSpeeds = [];
        for (var i = 0; i < SynthConfig_1.Config.maxEnvelopeCount; i++) {
            envelopeSpeeds[i] = 0;
        }
        for (var envelopeIndex = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
            var perEnvelopeSpeed = instrument.envelopes[envelopeIndex].perEnvelopeSpeed;
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index, channelIndex, tone.instrumentIndex) && instrument.envelopes[envelopeIndex].tempEnvelopeSpeed != null) {
                perEnvelopeSpeed = instrument.envelopes[envelopeIndex].tempEnvelopeSpeed;
            }
            var useEnvelopeSpeed = SynthConfig_1.Config.arpSpeedScale[instrument.envelopeSpeed] * perEnvelopeSpeed;
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["envelope speed"].index, channelIndex, tone.instrumentIndex)) {
                useEnvelopeSpeed = Math.max(0, Math.min(SynthConfig_1.Config.arpSpeedScale.length - 1, this.getModValue(SynthConfig_1.Config.modulators.dictionary["envelope speed"].index, channelIndex, tone.instrumentIndex, false)));
                if (Number.isInteger(useEnvelopeSpeed)) {
                    useEnvelopeSpeed = SynthConfig_1.Config.arpSpeedScale[useEnvelopeSpeed] * perEnvelopeSpeed;
                }
                else {
                    // Linear interpolate envelope values
                    useEnvelopeSpeed = (1 - (useEnvelopeSpeed % 1)) * SynthConfig_1.Config.arpSpeedScale[Math.floor(useEnvelopeSpeed)] + (useEnvelopeSpeed % 1) * SynthConfig_1.Config.arpSpeedScale[Math.ceil(useEnvelopeSpeed)] * perEnvelopeSpeed;
                }
            }
            envelopeSpeeds[envelopeIndex] = useEnvelopeSpeed;
        }
        //the perTone envelopeComputer
        envelopeComputer.computeEnvelopes(instrument, currentPart, instrumentState.envelopeTime, SynthConfig_1.Config.ticksPerPart * partTimeStart, samplesPerTick / this.samplesPerSecond, tone, envelopeSpeeds, instrumentState, this, channelIndex, tone.instrumentIndex, true);
        var envelopeStarts = tone.envelopeComputer.envelopeStarts;
        var envelopeEnds = tone.envelopeComputer.envelopeEnds;
        instrument.noteFilter = tmpNoteFilter;
        if (transition.continues && (tone.prevNote == null || tone.note == null)) {
            instrumentState.envelopeComputer.reset();
        }
        if (tone.note != null && transition.slides) {
            // Slide interval and chordExpression at the start and/or end of the note if necessary.
            var prevNote = tone.prevNote;
            var nextNote = tone.nextNote;
            if (prevNote != null) {
                var intervalDiff = prevNote.pitches[tone.prevNotePitchIndex] + prevNote.pins[prevNote.pins.length - 1].interval - tone.pitches[0];
                if (envelopeComputer.prevSlideStart)
                    intervalStart += intervalDiff * envelopeComputer.prevSlideRatioStart;
                if (envelopeComputer.prevSlideEnd)
                    intervalEnd += intervalDiff * envelopeComputer.prevSlideRatioEnd;
                if (!chord.singleTone) {
                    var chordSizeDiff = prevNote.pitches.length - tone.chordSize;
                    if (envelopeComputer.prevSlideStart)
                        chordExpressionStart = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.prevSlideRatioStart);
                    if (envelopeComputer.prevSlideEnd)
                        chordExpressionEnd = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.prevSlideRatioEnd);
                }
            }
            if (nextNote != null) {
                var intervalDiff = nextNote.pitches[tone.nextNotePitchIndex] - (tone.pitches[0] + tone.note.pins[tone.note.pins.length - 1].interval);
                if (envelopeComputer.nextSlideStart)
                    intervalStart += intervalDiff * envelopeComputer.nextSlideRatioStart;
                if (envelopeComputer.nextSlideEnd)
                    intervalEnd += intervalDiff * envelopeComputer.nextSlideRatioEnd;
                if (!chord.singleTone) {
                    var chordSizeDiff = nextNote.pitches.length - tone.chordSize;
                    if (envelopeComputer.nextSlideStart)
                        chordExpressionStart = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.nextSlideRatioStart);
                    if (envelopeComputer.nextSlideEnd)
                        chordExpressionEnd = Synth.computeChordExpression(tone.chordSize + chordSizeDiff * envelopeComputer.nextSlideRatioEnd);
                }
            }
        }
        if ((0, SynthConfig_1.effectsIncludePitchShift)(instrument.effects)) {
            var pitchShift = SynthConfig_1.Config.justIntonationSemitones[instrument.pitchShift] / intervalScale;
            var pitchShiftScalarStart = 1.0;
            var pitchShiftScalarEnd = 1.0;
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["pitch shift"].index, channelIndex, tone.instrumentIndex)) {
                pitchShift = SynthConfig_1.Config.justIntonationSemitones[SynthConfig_1.Config.justIntonationSemitones.length - 1];
                pitchShiftScalarStart = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["pitch shift"].index, channelIndex, tone.instrumentIndex, false)) / (SynthConfig_1.Config.pitchShiftCenter);
                pitchShiftScalarEnd = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["pitch shift"].index, channelIndex, tone.instrumentIndex, true)) / (SynthConfig_1.Config.pitchShiftCenter);
            }
            var envelopeStart = envelopeStarts[18 /* EnvelopeComputeIndex.pitchShift */];
            var envelopeEnd = envelopeEnds[18 /* EnvelopeComputeIndex.pitchShift */];
            intervalStart += pitchShift * envelopeStart * pitchShiftScalarStart;
            intervalEnd += pitchShift * envelopeEnd * pitchShiftScalarEnd;
        }
        if ((0, SynthConfig_1.effectsIncludeDetune)(instrument.effects) || this.isModActive(SynthConfig_1.Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex)) {
            var envelopeStart = envelopeStarts[19 /* EnvelopeComputeIndex.detune */];
            var envelopeEnd = envelopeEnds[19 /* EnvelopeComputeIndex.detune */];
            var modDetuneStart = instrument.detune;
            var modDetuneEnd = instrument.detune;
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["detune"].index, channelIndex, tone.instrumentIndex)) {
                modDetuneStart = this.getModValue(SynthConfig_1.Config.modulators.dictionary["detune"].index, channelIndex, tone.instrumentIndex, false) + SynthConfig_1.Config.detuneCenter;
                modDetuneEnd = this.getModValue(SynthConfig_1.Config.modulators.dictionary["detune"].index, channelIndex, tone.instrumentIndex, true) + SynthConfig_1.Config.detuneCenter;
            }
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex)) {
                modDetuneStart += 4 * this.getModValue(SynthConfig_1.Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex, false);
                modDetuneEnd += 4 * this.getModValue(SynthConfig_1.Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex, true);
            }
            intervalStart += Synth.detuneToCents(modDetuneStart) * envelopeStart * SynthConfig_1.Config.pitchesPerOctave / (12.0 * 100.0);
            intervalEnd += Synth.detuneToCents(modDetuneEnd) * envelopeEnd * SynthConfig_1.Config.pitchesPerOctave / (12.0 * 100.0);
            // //envelopes should not affect song detune
            // if (this.isModActive(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex)) {
            //     modDetuneStart = 4 * this.getModValue(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex, false);
            //     modDetuneEnd = 4 * this.getModValue(Config.modulators.dictionary["song detune"].index, channelIndex, tone.instrumentIndex, true);
            //     intervalStart += modDetuneStart * Config.pitchesPerOctave / (12.0 * 100.0);
            //     intervalEnd += modDetuneEnd * Config.pitchesPerOctave / (12.0 * 100.0);
            // }
        }
        if ((0, SynthConfig_1.effectsIncludeVibrato)(instrument.effects)) {
            var delayTicks = void 0;
            var vibratoAmplitudeStart = void 0;
            var vibratoAmplitudeEnd = void 0;
            // Custom vibrato
            if (instrument.vibrato == SynthConfig_1.Config.vibratos.length) {
                delayTicks = instrument.vibratoDelay * 2; // Delay was changed from parts to ticks in BB v9
                // Special case: if vibrato delay is max, NEVER vibrato.
                if (instrument.vibratoDelay == SynthConfig_1.Config.modulators.dictionary["vibrato delay"].maxRawVol)
                    delayTicks = Number.POSITIVE_INFINITY;
                vibratoAmplitudeStart = instrument.vibratoDepth;
                vibratoAmplitudeEnd = vibratoAmplitudeStart;
            }
            else {
                delayTicks = SynthConfig_1.Config.vibratos[instrument.vibrato].delayTicks;
                vibratoAmplitudeStart = SynthConfig_1.Config.vibratos[instrument.vibrato].amplitude;
                vibratoAmplitudeEnd = vibratoAmplitudeStart;
            }
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["vibrato delay"].index, channelIndex, tone.instrumentIndex)) {
                delayTicks = this.getModValue(SynthConfig_1.Config.modulators.dictionary["vibrato delay"].index, channelIndex, tone.instrumentIndex, false) * 2; // Delay was changed from parts to ticks in BB v9
                if (delayTicks == SynthConfig_1.Config.modulators.dictionary["vibrato delay"].maxRawVol * 2)
                    delayTicks = Number.POSITIVE_INFINITY;
            }
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["vibrato depth"].index, channelIndex, tone.instrumentIndex)) {
                vibratoAmplitudeStart = this.getModValue(SynthConfig_1.Config.modulators.dictionary["vibrato depth"].index, channelIndex, tone.instrumentIndex, false) / 25;
                vibratoAmplitudeEnd = this.getModValue(SynthConfig_1.Config.modulators.dictionary["vibrato depth"].index, channelIndex, tone.instrumentIndex, true) / 25;
            }
            // To maintain pitch continuity, (mostly for picked string which retriggers impulse
            // otherwise) remember the vibrato at the end of this run and reuse it at the start
            // of the next run if available.
            var vibratoStart = void 0;
            if (tone.prevVibrato != null) {
                vibratoStart = tone.prevVibrato;
            }
            else {
                var vibratoLfoStart = Synth.getLFOAmplitude(instrument, secondsPerPart * instrumentState.vibratoTime);
                var vibratoDepthEnvelopeStart = envelopeStarts[20 /* EnvelopeComputeIndex.vibratoDepth */];
                vibratoStart = vibratoAmplitudeStart * vibratoLfoStart * vibratoDepthEnvelopeStart;
                if (delayTicks > 0.0) {
                    var ticksUntilVibratoStart = delayTicks - envelopeComputer.noteTicksStart;
                    vibratoStart *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoStart / 2.0));
                }
            }
            var vibratoLfoEnd = Synth.getLFOAmplitude(instrument, secondsPerPart * instrumentState.nextVibratoTime);
            var vibratoDepthEnvelopeEnd = envelopeEnds[20 /* EnvelopeComputeIndex.vibratoDepth */];
            if (instrument.type != 10 /* InstrumentType.mod */) {
                var vibratoEnd = vibratoAmplitudeEnd * vibratoLfoEnd * vibratoDepthEnvelopeEnd;
                if (delayTicks > 0.0) {
                    var ticksUntilVibratoEnd = delayTicks - envelopeComputer.noteTicksEnd;
                    vibratoEnd *= Math.max(0.0, Math.min(1.0, 1.0 - ticksUntilVibratoEnd / 2.0));
                }
                tone.prevVibrato = vibratoEnd;
                intervalStart += vibratoStart;
                intervalEnd += vibratoEnd;
            }
        }
        if ((!transition.isSeamless && !tone.forceContinueAtStart) || tone.prevNote == null) {
            // Fade in the beginning of the note.
            var fadeInSeconds = instrument.getFadeInSeconds();
            if (fadeInSeconds > 0.0) {
                fadeExpressionStart *= Math.min(1.0, envelopeComputer.noteSecondsStartUnscaled / fadeInSeconds);
                fadeExpressionEnd *= Math.min(1.0, envelopeComputer.noteSecondsEndUnscaled / fadeInSeconds);
            }
        }
        if (instrument.type == 4 /* InstrumentType.drumset */ && tone.drumsetPitch == null) {
            // It's possible that the note will change while the user is editing it,
            // but the tone's pitches don't get updated because the tone has already
            // ended and is fading out. To avoid an array index out of bounds error, clamp the pitch.
            tone.drumsetPitch = tone.pitches[0];
            if (tone.note != null)
                tone.drumsetPitch += tone.note.pickMainInterval();
            tone.drumsetPitch = Math.max(0, Math.min(SynthConfig_1.Config.drumCount - 1, tone.drumsetPitch));
        }
        var noteFilterExpression = envelopeComputer.lowpassCutoffDecayVolumeCompensation;
        if (!(0, SynthConfig_1.effectsIncludeNoteFilter)(instrument.effects)) {
            tone.noteFilterCount = 0;
        }
        else {
            var noteAllFreqsEnvelopeStart = envelopeStarts[1 /* EnvelopeComputeIndex.noteFilterAllFreqs */];
            var noteAllFreqsEnvelopeEnd = envelopeEnds[1 /* EnvelopeComputeIndex.noteFilterAllFreqs */];
            // Simple note filter
            if (instrument.noteFilterType) {
                var noteFreqEnvelopeStart = envelopeStarts[21 /* EnvelopeComputeIndex.noteFilterFreq0 */];
                var noteFreqEnvelopeEnd = envelopeEnds[21 /* EnvelopeComputeIndex.noteFilterFreq0 */];
                var notePeakEnvelopeStart = envelopeStarts[29 /* EnvelopeComputeIndex.noteFilterGain0 */];
                var notePeakEnvelopeEnd = envelopeEnds[29 /* EnvelopeComputeIndex.noteFilterGain0 */];
                startPoint.toCoefficients(Synth.tempFilterStartCoefficients, this.samplesPerSecond, noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart, notePeakEnvelopeStart);
                endPoint.toCoefficients(Synth.tempFilterEndCoefficients, this.samplesPerSecond, noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd, notePeakEnvelopeEnd);
                if (tone.noteFilters.length < 1)
                    tone.noteFilters[0] = new filtering_1.DynamicBiquadFilter();
                tone.noteFilters[0].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint.type == 0 /* FilterType.lowPass */);
                noteFilterExpression *= startPoint.getVolumeCompensationMult();
                tone.noteFilterCount = 1;
            }
            else {
                var noteFilterSettings = (instrument.tmpNoteFilterStart != null) ? instrument.tmpNoteFilterStart : instrument.noteFilter;
                for (var i = 0; i < noteFilterSettings.controlPointCount; i++) {
                    var noteFreqEnvelopeStart = envelopeStarts[21 /* EnvelopeComputeIndex.noteFilterFreq0 */ + i];
                    var noteFreqEnvelopeEnd = envelopeEnds[21 /* EnvelopeComputeIndex.noteFilterFreq0 */ + i];
                    var notePeakEnvelopeStart = envelopeStarts[29 /* EnvelopeComputeIndex.noteFilterGain0 */ + i];
                    var notePeakEnvelopeEnd = envelopeEnds[29 /* EnvelopeComputeIndex.noteFilterGain0 */ + i];
                    var startPoint_1 = noteFilterSettings.controlPoints[i];
                    var endPoint_1 = (instrument.tmpNoteFilterEnd != null && instrument.tmpNoteFilterEnd.controlPoints[i] != null) ? instrument.tmpNoteFilterEnd.controlPoints[i] : noteFilterSettings.controlPoints[i];
                    // If switching dot type, do it all at once and do not try to interpolate since no valid interpolation exists.
                    if (startPoint_1.type != endPoint_1.type) {
                        startPoint_1 = endPoint_1;
                    }
                    startPoint_1.toCoefficients(Synth.tempFilterStartCoefficients, this.samplesPerSecond, noteAllFreqsEnvelopeStart * noteFreqEnvelopeStart, notePeakEnvelopeStart);
                    endPoint_1.toCoefficients(Synth.tempFilterEndCoefficients, this.samplesPerSecond, noteAllFreqsEnvelopeEnd * noteFreqEnvelopeEnd, notePeakEnvelopeEnd);
                    if (tone.noteFilters.length <= i)
                        tone.noteFilters[i] = new filtering_1.DynamicBiquadFilter();
                    tone.noteFilters[i].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, startPoint_1.type == 0 /* FilterType.lowPass */);
                    noteFilterExpression *= startPoint_1.getVolumeCompensationMult();
                }
                tone.noteFilterCount = noteFilterSettings.controlPointCount;
            }
        }
        if (instrument.type == 4 /* InstrumentType.drumset */) {
            var drumsetEnvelopeComputer = tone.envelopeComputer;
            var drumsetFilterEnvelope = instrument.getDrumsetEnvelope(tone.drumsetPitch);
            // If the drumset lowpass cutoff decays, compensate by increasing expression.
            noteFilterExpression *= EnvelopeComputer.getLowpassCutoffDecayVolumeCompensation(drumsetFilterEnvelope);
            drumsetEnvelopeComputer.computeDrumsetEnvelopes(instrument, drumsetFilterEnvelope, beatsPerPart, partTimeStart, partTimeEnd);
            var drumsetFilterEnvelopeStart = drumsetEnvelopeComputer.drumsetFilterEnvelopeStart;
            var drumsetFilterEnvelopeEnd = drumsetEnvelopeComputer.drumsetFilterEnvelopeEnd;
            var point = this.tempDrumSetControlPoint;
            point.type = 0 /* FilterType.lowPass */;
            point.gain = FilterControlPoint.getRoundedSettingValueFromLinearGain(0.50);
            point.freq = FilterControlPoint.getRoundedSettingValueFromHz(8000.0);
            // Drumset envelopes are warped to better imitate the legacy simplified 2nd order lowpass at ~48000Hz that I used to use.
            point.toCoefficients(Synth.tempFilterStartCoefficients, this.samplesPerSecond, drumsetFilterEnvelopeStart * (1.0 + drumsetFilterEnvelopeStart), 1.0);
            point.toCoefficients(Synth.tempFilterEndCoefficients, this.samplesPerSecond, drumsetFilterEnvelopeEnd * (1.0 + drumsetFilterEnvelopeEnd), 1.0);
            if (tone.noteFilters.length == tone.noteFilterCount)
                tone.noteFilters[tone.noteFilterCount] = new filtering_1.DynamicBiquadFilter();
            tone.noteFilters[tone.noteFilterCount].loadCoefficientsWithGradient(Synth.tempFilterStartCoefficients, Synth.tempFilterEndCoefficients, 1.0 / roundedSamplesPerTick, true);
            tone.noteFilterCount++;
        }
        noteFilterExpression = Math.min(3.0, noteFilterExpression);
        if (instrument.type == 1 /* InstrumentType.fm */ || instrument.type == 11 /* InstrumentType.fm6op */) {
            // phase modulation!
            var sineExpressionBoost = 1.0;
            var totalCarrierExpression = 0.0;
            var arpeggioInterval = 0;
            var arpeggiates = chord.arpeggiates;
            var isMono = chord.name == "monophonic";
            if (tone.pitchCount > 1 && arpeggiates) {
                var arpeggio = Math.floor(instrumentState.arpTime / SynthConfig_1.Config.ticksPerArpeggio);
                arpeggioInterval = tone.pitches[(0, SynthConfig_1.getArpeggioPitchIndex)(tone.pitchCount, instrument.fastTwoNoteArp, arpeggio)] - tone.pitches[0];
            }
            var carrierCount = (instrument.type == 11 /* InstrumentType.fm6op */ ? instrument.customAlgorithm.carrierCount : SynthConfig_1.Config.algorithms[instrument.algorithm].carrierCount);
            for (var i = 0; i < (instrument.type == 11 /* InstrumentType.fm6op */ ? 6 : SynthConfig_1.Config.operatorCount); i++) {
                var associatedCarrierIndex = (instrument.type == 11 /* InstrumentType.fm6op */ ? instrument.customAlgorithm.associatedCarrier[i] - 1 : SynthConfig_1.Config.algorithms[instrument.algorithm].associatedCarrier[i] - 1);
                var pitch = tone.pitches[arpeggiates ? 0 : isMono ? instrument.monoChordTone : ((i < tone.pitchCount) ? i : ((associatedCarrierIndex < tone.pitchCount) ? associatedCarrierIndex : 0))];
                var freqMult = SynthConfig_1.Config.operatorFrequencies[instrument.operators[i].frequency].mult;
                var interval = SynthConfig_1.Config.operatorCarrierInterval[associatedCarrierIndex] + arpeggioInterval;
                var pitchStart = basePitch + (pitch + intervalStart) * intervalScale + interval;
                var pitchEnd = basePitch + (pitch + intervalEnd) * intervalScale + interval;
                var baseFreqStart = Instrument.frequencyFromPitch(pitchStart);
                var baseFreqEnd = Instrument.frequencyFromPitch(pitchEnd);
                var hzOffset = SynthConfig_1.Config.operatorFrequencies[instrument.operators[i].frequency].hzOffset;
                var targetFreqStart = freqMult * baseFreqStart + hzOffset;
                var targetFreqEnd = freqMult * baseFreqEnd + hzOffset;
                var freqEnvelopeStart = envelopeStarts[5 /* EnvelopeComputeIndex.operatorFrequency0 */ + i];
                var freqEnvelopeEnd = envelopeEnds[5 /* EnvelopeComputeIndex.operatorFrequency0 */ + i];
                var freqStart = void 0;
                var freqEnd = void 0;
                if (freqEnvelopeStart != 1.0 || freqEnvelopeEnd != 1.0) {
                    freqStart = Math.pow(2.0, Math.log2(targetFreqStart / baseFreqStart) * freqEnvelopeStart) * baseFreqStart;
                    freqEnd = Math.pow(2.0, Math.log2(targetFreqEnd / baseFreqEnd) * freqEnvelopeEnd) * baseFreqEnd;
                }
                else {
                    freqStart = targetFreqStart;
                    freqEnd = targetFreqEnd;
                }
                tone.phaseDeltas[i] = freqStart * sampleTime;
                tone.phaseDeltaScales[i] = Math.pow(freqEnd / freqStart, 1.0 / roundedSamplesPerTick);
                var amplitudeStart = instrument.operators[i].amplitude;
                var amplitudeEnd = instrument.operators[i].amplitude;
                if (i < 4) {
                    if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["fm slider 1"].index + i, channelIndex, tone.instrumentIndex)) {
                        amplitudeStart *= this.getModValue(SynthConfig_1.Config.modulators.dictionary["fm slider 1"].index + i, channelIndex, tone.instrumentIndex, false) / 15.0;
                        amplitudeEnd *= this.getModValue(SynthConfig_1.Config.modulators.dictionary["fm slider 1"].index + i, channelIndex, tone.instrumentIndex, true) / 15.0;
                    }
                }
                else {
                    if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["fm slider 5"].index + i - 4, channelIndex, tone.instrumentIndex)) {
                        amplitudeStart *= this.getModValue(SynthConfig_1.Config.modulators.dictionary["fm slider 5"].index + i - 4, channelIndex, tone.instrumentIndex, false) / 15.0;
                        amplitudeEnd *= this.getModValue(SynthConfig_1.Config.modulators.dictionary["fm slider 5"].index + i - 4, channelIndex, tone.instrumentIndex, true) / 15.0;
                    }
                }
                var amplitudeCurveStart = Synth.operatorAmplitudeCurve(amplitudeStart);
                var amplitudeCurveEnd = Synth.operatorAmplitudeCurve(amplitudeEnd);
                var amplitudeMultStart = amplitudeCurveStart * SynthConfig_1.Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                var amplitudeMultEnd = amplitudeCurveEnd * SynthConfig_1.Config.operatorFrequencies[instrument.operators[i].frequency].amplitudeSign;
                var expressionStart_1 = amplitudeMultStart;
                var expressionEnd_1 = amplitudeMultEnd;
                if (i < carrierCount) {
                    // carrier
                    var pitchExpressionStart = void 0;
                    if (tone.prevPitchExpressions[i] != null) {
                        pitchExpressionStart = tone.prevPitchExpressions[i];
                    }
                    else {
                        pitchExpressionStart = Math.pow(2.0, -(pitchStart - expressionReferencePitch) / pitchDamping);
                    }
                    var pitchExpressionEnd = Math.pow(2.0, -(pitchEnd - expressionReferencePitch) / pitchDamping);
                    tone.prevPitchExpressions[i] = pitchExpressionEnd;
                    expressionStart_1 *= pitchExpressionStart;
                    expressionEnd_1 *= pitchExpressionEnd;
                    totalCarrierExpression += amplitudeCurveEnd;
                }
                else {
                    // modulator
                    expressionStart_1 *= SynthConfig_1.Config.sineWaveLength * 1.5;
                    expressionEnd_1 *= SynthConfig_1.Config.sineWaveLength * 1.5;
                    sineExpressionBoost *= 1.0 - Math.min(1.0, instrument.operators[i].amplitude / 15);
                }
                expressionStart_1 *= envelopeStarts[11 /* EnvelopeComputeIndex.operatorAmplitude0 */ + i];
                expressionEnd_1 *= envelopeEnds[11 /* EnvelopeComputeIndex.operatorAmplitude0 */ + i];
                // Check for mod-related volume delta
                // @jummbus - This amplification is also applied to modulator FM operators which distorts the sound.
                // The fix is to apply this only to carriers, but as this is a legacy bug and it can cause some interesting sounds, it's left in.
                // You can use the mix volume modulator instead to avoid this effect.
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["note volume"].index, channelIndex, tone.instrumentIndex)) {
                    // Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
                    var startVal = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note volume"].index, channelIndex, tone.instrumentIndex, false);
                    var endVal = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note volume"].index, channelIndex, tone.instrumentIndex, true);
                    expressionStart_1 *= ((startVal <= 0) ? ((startVal + SynthConfig_1.Config.volumeRange / 2) / (SynthConfig_1.Config.volumeRange / 2)) : Synth.instrumentVolumeToVolumeMult(startVal));
                    expressionEnd_1 *= ((endVal <= 0) ? ((endVal + SynthConfig_1.Config.volumeRange / 2) / (SynthConfig_1.Config.volumeRange / 2)) : Synth.instrumentVolumeToVolumeMult(endVal));
                }
                tone.operatorExpressions[i] = expressionStart_1;
                tone.operatorExpressionDeltas[i] = (expressionEnd_1 - expressionStart_1) / roundedSamplesPerTick;
            }
            sineExpressionBoost *= (Math.pow(2.0, (2.0 - 1.4 * instrument.feedbackAmplitude / 15.0)) - 1.0) / 3.0;
            sineExpressionBoost *= 1.0 - Math.min(1.0, Math.max(0.0, totalCarrierExpression - 1) / 2.0);
            sineExpressionBoost = 1.0 + sineExpressionBoost * 3.0;
            var expressionStart = baseExpression * sineExpressionBoost * noteFilterExpression * fadeExpressionStart * chordExpressionStart * envelopeStarts[0 /* EnvelopeComputeIndex.noteVolume */];
            var expressionEnd = baseExpression * sineExpressionBoost * noteFilterExpression * fadeExpressionEnd * chordExpressionEnd * envelopeEnds[0 /* EnvelopeComputeIndex.noteVolume */];
            if (isMono && tone.pitchCount <= instrument.monoChordTone) { //silence if tone doesn't exist
                expressionStart = 0;
                expressionEnd = 0;
            }
            tone.expression = expressionStart;
            tone.expressionDelta = (expressionEnd - expressionStart) / roundedSamplesPerTick;
            var useFeedbackAmplitudeStart = instrument.feedbackAmplitude;
            var useFeedbackAmplitudeEnd = instrument.feedbackAmplitude;
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["fm feedback"].index, channelIndex, tone.instrumentIndex)) {
                useFeedbackAmplitudeStart *= this.getModValue(SynthConfig_1.Config.modulators.dictionary["fm feedback"].index, channelIndex, tone.instrumentIndex, false) / 15.0;
                useFeedbackAmplitudeEnd *= this.getModValue(SynthConfig_1.Config.modulators.dictionary["fm feedback"].index, channelIndex, tone.instrumentIndex, true) / 15.0;
            }
            var feedbackAmplitudeStart = SynthConfig_1.Config.sineWaveLength * 0.3 * useFeedbackAmplitudeStart / 15.0;
            var feedbackAmplitudeEnd = SynthConfig_1.Config.sineWaveLength * 0.3 * useFeedbackAmplitudeEnd / 15.0;
            var feedbackStart = feedbackAmplitudeStart * envelopeStarts[17 /* EnvelopeComputeIndex.feedbackAmplitude */];
            var feedbackEnd = feedbackAmplitudeEnd * envelopeEnds[17 /* EnvelopeComputeIndex.feedbackAmplitude */];
            tone.feedbackMult = feedbackStart;
            tone.feedbackDelta = (feedbackEnd - feedbackStart) / roundedSamplesPerTick;
        }
        else {
            var freqEndRatio = Math.pow(2.0, (intervalEnd - intervalStart) * intervalScale / 12.0);
            var basePhaseDeltaScale = Math.pow(freqEndRatio, 1.0 / roundedSamplesPerTick);
            var isMono = chord.name == "monophonic";
            var pitch = tone.pitches[0];
            if (tone.pitchCount > 1 && (chord.arpeggiates || chord.customInterval || isMono)) {
                var arpeggio = Math.floor(instrumentState.arpTime / SynthConfig_1.Config.ticksPerArpeggio);
                if (chord.customInterval) {
                    var intervalOffset = tone.pitches[1 + (0, SynthConfig_1.getArpeggioPitchIndex)(tone.pitchCount - 1, instrument.fastTwoNoteArp, arpeggio)] - tone.pitches[0];
                    specialIntervalMult = Math.pow(2.0, intervalOffset / 12.0);
                    tone.specialIntervalExpressionMult = Math.pow(2.0, -intervalOffset / pitchDamping);
                }
                else if (chord.arpeggiates) {
                    pitch = tone.pitches[(0, SynthConfig_1.getArpeggioPitchIndex)(tone.pitchCount, instrument.fastTwoNoteArp, arpeggio)];
                }
                else {
                    pitch = tone.pitches[instrument.monoChordTone];
                }
            }
            var startPitch = basePitch + (pitch + intervalStart) * intervalScale;
            var endPitch = basePitch + (pitch + intervalEnd) * intervalScale;
            var pitchExpressionStart = void 0;
            // TODO: use the second element of prevPitchExpressions for the unison voice, compute a separate expression delta for it.
            if (tone.prevPitchExpressions[0] != null) {
                pitchExpressionStart = tone.prevPitchExpressions[0];
            }
            else {
                pitchExpressionStart = Math.pow(2.0, -(startPitch - expressionReferencePitch) / pitchDamping);
            }
            var pitchExpressionEnd = Math.pow(2.0, -(endPitch - expressionReferencePitch) / pitchDamping);
            tone.prevPitchExpressions[0] = pitchExpressionEnd;
            var settingsExpressionMult = baseExpression * noteFilterExpression;
            if (instrument.type == 2 /* InstrumentType.noise */) {
                settingsExpressionMult *= SynthConfig_1.Config.chipNoises[instrument.chipNoise].expression;
            }
            if (instrument.type == 0 /* InstrumentType.chip */) {
                settingsExpressionMult *= SynthConfig_1.Config.chipWaves[instrument.chipWave].expression;
            }
            if (instrument.type == 6 /* InstrumentType.pwm */) {
                var basePulseWidth = (0, SynthConfig_1.getPulseWidthRatio)(instrument.pulseWidth);
                // Check for PWM mods to this instrument
                var pulseWidthModStart = basePulseWidth;
                var pulseWidthModEnd = basePulseWidth;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex)) {
                    pulseWidthModStart = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex, false)) / (SynthConfig_1.Config.pulseWidthRange * 2);
                    pulseWidthModEnd = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex, true)) / (SynthConfig_1.Config.pulseWidthRange * 2);
                }
                var pulseWidthStart = pulseWidthModStart * envelopeStarts[2 /* EnvelopeComputeIndex.pulseWidth */];
                var pulseWidthEnd = pulseWidthModEnd * envelopeEnds[2 /* EnvelopeComputeIndex.pulseWidth */];
                tone.pulseWidth = pulseWidthStart;
                tone.pulseWidthDelta = (pulseWidthEnd - pulseWidthStart) / roundedSamplesPerTick;
                //decimal offset mods
                var decimalOffsetModStart = instrument.decimalOffset;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["decimal offset"].index, channelIndex, tone.instrumentIndex)) {
                    decimalOffsetModStart = this.getModValue(SynthConfig_1.Config.modulators.dictionary["decimal offset"].index, channelIndex, tone.instrumentIndex, false);
                }
                var decimalOffsetStart = decimalOffsetModStart * envelopeStarts[37 /* EnvelopeComputeIndex.decimalOffset */];
                tone.decimalOffset = decimalOffsetStart;
                tone.pulseWidth -= (tone.decimalOffset) / 10000;
            }
            if (instrument.type == 7 /* InstrumentType.pickedString */) {
                // Check for sustain mods
                var useSustainStart = instrument.stringSustain;
                var useSustainEnd = instrument.stringSustain;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["sustain"].index, channelIndex, tone.instrumentIndex)) {
                    useSustainStart = this.getModValue(SynthConfig_1.Config.modulators.dictionary["sustain"].index, channelIndex, tone.instrumentIndex, false);
                    useSustainEnd = this.getModValue(SynthConfig_1.Config.modulators.dictionary["sustain"].index, channelIndex, tone.instrumentIndex, true);
                }
                tone.stringSustainStart = useSustainStart;
                tone.stringSustainEnd = useSustainEnd;
                // Increase expression to compensate for string decay.
                settingsExpressionMult *= Math.pow(2.0, 0.7 * (1.0 - useSustainStart / (SynthConfig_1.Config.stringSustainRange - 1)));
            }
            var startFreq = Instrument.frequencyFromPitch(startPitch);
            if (instrument.type == 0 /* InstrumentType.chip */ || instrument.type == 9 /* InstrumentType.customChipWave */ || instrument.type == 5 /* InstrumentType.harmonics */ || instrument.type == 7 /* InstrumentType.pickedString */ || instrument.type == 3 /* InstrumentType.spectrum */ || instrument.type == 6 /* InstrumentType.pwm */ || instrument.type == 2 /* InstrumentType.noise */ || instrument.type == 4 /* InstrumentType.drumset */) {
                var unisonVoices = instrument.unisonVoices;
                var unisonSpread = instrument.unisonSpread;
                var unisonOffset = instrument.unisonOffset;
                var unisonExpression = instrument.unisonExpression;
                var voiceCountExpression = (instrument.type == 7 /* InstrumentType.pickedString */) ? 1 : unisonVoices / 2.0;
                settingsExpressionMult *= unisonExpression * voiceCountExpression;
                var unisonEnvelopeStart = envelopeStarts[4 /* EnvelopeComputeIndex.unison */];
                var unisonEnvelopeEnd = envelopeEnds[4 /* EnvelopeComputeIndex.unison */];
                var unisonStartA = Math.pow(2.0, (unisonOffset + unisonSpread) * unisonEnvelopeStart / 12.0);
                var unisonEndA = Math.pow(2.0, (unisonOffset + unisonSpread) * unisonEnvelopeEnd / 12.0);
                tone.phaseDeltas[0] = startFreq * sampleTime * unisonStartA;
                tone.phaseDeltaScales[0] = basePhaseDeltaScale * Math.pow(unisonEndA / unisonStartA, 1.0 / roundedSamplesPerTick);
                var divisor = (unisonVoices == 1) ? 1 : (unisonVoices - 1);
                for (var i = 1; i <= unisonVoices; i++) {
                    var unisonStart = Math.pow(2.0, (unisonOffset + unisonSpread - (2 * i * unisonSpread / divisor)) * unisonEnvelopeStart / 12.0) * (specialIntervalMult);
                    var unisonEnd = Math.pow(2.0, (unisonOffset + unisonSpread - (2 * i * unisonSpread / divisor)) * unisonEnvelopeEnd / 12.0) * (specialIntervalMult);
                    tone.phaseDeltas[i] = startFreq * sampleTime * unisonStart;
                    tone.phaseDeltaScales[i] = basePhaseDeltaScale * Math.pow(unisonEnd / unisonStart, 1.0 / roundedSamplesPerTick);
                }
                for (var i = unisonVoices + 1; i < SynthConfig_1.Config.unisonVoicesMax; i++) {
                    if (i == 2) {
                        var unisonBStart = Math.pow(2.0, (unisonOffset - unisonSpread) * unisonEnvelopeStart / 12.0) * specialIntervalMult;
                        var unisonBEnd = Math.pow(2.0, (unisonOffset - unisonSpread) * unisonEnvelopeEnd / 12.0) * specialIntervalMult;
                        tone.phaseDeltas[i] = startFreq * sampleTime * unisonBStart;
                        tone.phaseDeltaScales[i] = basePhaseDeltaScale * Math.pow(unisonBEnd / unisonBStart, 1.0 / roundedSamplesPerTick);
                    }
                    else {
                        tone.phaseDeltas[i] = tone.phaseDeltas[0];
                        tone.phaseDeltaScales[i] = tone.phaseDeltaScales[0];
                    }
                }
            }
            else if (instrument.type == 8 /* InstrumentType.supersaw */) {
                var unisonVoices = instrument.unisonVoices;
                var unisonSpread = instrument.unisonSpread;
                var unisonOffset = instrument.unisonOffset;
                var unisonEnvelopeStart = envelopeStarts[4 /* EnvelopeComputeIndex.unison */];
                var unisonEnvelopeEnd = envelopeEnds[4 /* EnvelopeComputeIndex.unison */];
                var unisonStartA = Math.pow(2.0, (unisonOffset + unisonSpread) * unisonEnvelopeStart / 12.0);
                var unisonEndA = Math.pow(2.0, (unisonOffset + unisonSpread) * unisonEnvelopeEnd / 12.0);
                tone.phaseDeltas[0] = startFreq * sampleTime * unisonStartA;
                tone.phaseDeltaScales[0] = basePhaseDeltaScale * Math.pow(unisonEndA / unisonStartA, 1.0 / roundedSamplesPerTick);
                var divisor = (unisonVoices == 1) ? 1 : (unisonVoices - 1);
                for (var voice = 1; voice < unisonVoices; voice++) {
                    var unisonStart = Math.pow(2.0, (unisonOffset + unisonSpread - (2 * voice * unisonSpread / divisor)) * unisonEnvelopeStart / 12.0) * (specialIntervalMult);
                    var unisonEnd = Math.pow(2.0, (unisonOffset + unisonSpread - (2 * voice * unisonSpread / divisor)) * unisonEnvelopeEnd / 12.0) * (specialIntervalMult);
                    tone.phaseDeltas[voice] = startFreq * sampleTime * unisonStart;
                    tone.phaseDeltaScales[voice] = basePhaseDeltaScale * Math.pow(unisonEnd / unisonStart, 1.0 / roundedSamplesPerTick);
                }
            }
            else {
                tone.phaseDeltas[0] = startFreq * sampleTime;
                tone.phaseDeltaScales[0] = basePhaseDeltaScale;
            }
            // TODO: make expressionStart and expressionEnd variables earlier and modify those
            // instead of these supersawExpression variables.
            var supersawExpressionStart = 1.0;
            var supersawExpressionEnd = 1.0;
            if (instrument.type == 8 /* InstrumentType.supersaw */) {
                supersawExpressionStart = instrument.unisonExpression * instrument.unisonVoices / 1.4;
                supersawExpressionEnd = instrument.unisonExpression * instrument.unisonVoices / 1.4;
                var minFirstVoiceAmplitude = 1.0 / Math.sqrt(SynthConfig_1.Config.supersawVoiceCount);
                // Dynamism mods
                var useDynamismStart = instrument.supersawDynamism / SynthConfig_1.Config.supersawDynamismMax;
                var useDynamismEnd = instrument.supersawDynamism / SynthConfig_1.Config.supersawDynamismMax;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["dynamism"].index, channelIndex, tone.instrumentIndex)) {
                    useDynamismStart = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["dynamism"].index, channelIndex, tone.instrumentIndex, false)) / SynthConfig_1.Config.supersawDynamismMax;
                    useDynamismEnd = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["dynamism"].index, channelIndex, tone.instrumentIndex, true)) / SynthConfig_1.Config.supersawDynamismMax;
                }
                var curvedDynamismStart = 1.0 - Math.pow(Math.max(0.0, 1.0 - useDynamismStart * envelopeStarts[38 /* EnvelopeComputeIndex.supersawDynamism */]), 0.2);
                var curvedDynamismEnd = 1.0 - Math.pow(Math.max(0.0, 1.0 - useDynamismEnd * envelopeEnds[38 /* EnvelopeComputeIndex.supersawDynamism */]), 0.2);
                var firstVoiceAmplitudeStart = Math.pow(2.0, Math.log2(minFirstVoiceAmplitude) * curvedDynamismStart);
                var firstVoiceAmplitudeEnd = Math.pow(2.0, Math.log2(minFirstVoiceAmplitude) * curvedDynamismEnd);
                var dynamismStart = Math.sqrt((1.0 / Math.pow(firstVoiceAmplitudeStart, 2.0) - 1.0) / (SynthConfig_1.Config.supersawVoiceCount - 1.0));
                var dynamismEnd = Math.sqrt((1.0 / Math.pow(firstVoiceAmplitudeEnd, 2.0) - 1.0) / (SynthConfig_1.Config.supersawVoiceCount - 1.0));
                tone.supersawDynamism = dynamismStart;
                tone.supersawDynamismDelta = (dynamismEnd - dynamismStart) / roundedSamplesPerTick;
                var initializeSupersaw = (tone.supersawDelayIndex == -1);
                if (initializeSupersaw || !instrumentState.unisonInitialized) {
                    // Goal: generate sawtooth phases such that the combined initial amplitude
                    // cancel out to minimize pop. Algorithm: generate sorted phases, iterate over
                    // their sawtooth drop points to find a combined zero crossing, then offset the
                    // phases so they start there.
                    // Generate random phases in ascending order by adding positive randomly
                    // sized gaps between adjacent phases. For a proper distribution of random
                    // events, the gaps sizes should be an "exponential distribution", which is
                    // just: -Math.log(Math.random()). At the end, normalize the phases to a 0-1
                    // range by dividing by the final value of the accumulator.
                    var voiceCount = false ? SynthConfig_1.Config.supersawVoiceCount * SynthConfig_1.Config.unisonVoicesMax : SynthConfig_1.Config.supersawVoiceCount;
                    var accumulator = 0.0;
                    for (var i = 0; i < voiceCount; i++) {
                        tone.phases[i] = accumulator;
                        accumulator += -Math.log(Math.random());
                    }
                    var amplitudeSum = 1.0 + (voiceCount - 1.0) * dynamismStart;
                    var slope = amplitudeSum;
                    // Find the initial amplitude of the sum of sawtooths with the normalized
                    // set of phases.
                    var sample = 0.0;
                    for (var i = 0; i < voiceCount; i++) {
                        var amplitude = (i == 0) ? 1.0 : dynamismStart;
                        var normalizedPhase = tone.phases[i] / accumulator;
                        tone.phases[i] = normalizedPhase;
                        sample += (normalizedPhase - 0.5) * amplitude;
                    }
                    // Find the phase of the zero crossing of the sum of the sawtooths. You can
                    // use a constant slope and the distance between sawtooth drops to determine if
                    // the zero crossing occurs between them. Note that a small phase means that
                    // the corresponding drop for that wave is far away, and a big phase means the
                    // drop is nearby, so to iterate forward through the drops we iterate backward
                    // through the phases.
                    var zeroCrossingPhase = 1.0;
                    var prevDrop = 0.0;
                    for (var i = voiceCount - 1; i >= 0; i--) {
                        var nextDrop = 1.0 - tone.phases[i];
                        var phaseDelta = nextDrop - prevDrop;
                        if (sample < 0.0) {
                            var distanceToZeroCrossing = -sample / slope;
                            if (distanceToZeroCrossing < phaseDelta) {
                                zeroCrossingPhase = prevDrop + distanceToZeroCrossing;
                                break;
                            }
                        }
                        var amplitude = (i == 0) ? 1.0 : dynamismStart;
                        sample += phaseDelta * slope - amplitude;
                        prevDrop = nextDrop;
                    }
                    for (var i = 0; i < voiceCount; i++) {
                        tone.phases[i] += zeroCrossingPhase;
                    }
                    // Randomize the (initially sorted) order of the phases (aside from the
                    // first one) so that they don't correlate to the detunes that are also
                    // based on index.
                    for (var i = 1; i < voiceCount - 1; i++) {
                        var swappedIndex = i + Math.floor(Math.random() * (voiceCount - i));
                        var temp = tone.phases[i];
                        tone.phases[i] = tone.phases[swappedIndex];
                        tone.phases[swappedIndex] = temp;
                    }
                    instrumentState.unisonInitialized = true;
                }
                var baseSpreadSlider = instrument.supersawSpread / SynthConfig_1.Config.supersawSpreadMax;
                // Spread mods
                var useSpreadStart = baseSpreadSlider;
                var useSpreadEnd = baseSpreadSlider;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["spread"].index, channelIndex, tone.instrumentIndex)) {
                    useSpreadStart = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["spread"].index, channelIndex, tone.instrumentIndex, false)) / SynthConfig_1.Config.supersawSpreadMax;
                    useSpreadEnd = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["spread"].index, channelIndex, tone.instrumentIndex, true)) / SynthConfig_1.Config.supersawSpreadMax;
                }
                //clamp the spread values to prevent negative ones polluting the output
                useSpreadStart = Math.max(0, useSpreadStart);
                useSpreadEnd = Math.max(0, useSpreadEnd);
                var spreadSliderStart = useSpreadStart * envelopeStarts[39 /* EnvelopeComputeIndex.supersawSpread */];
                var spreadSliderEnd = useSpreadEnd * envelopeEnds[39 /* EnvelopeComputeIndex.supersawSpread */];
                // Just use the average detune for the current tick in the below loop.
                var averageSpreadSlider = (spreadSliderStart + spreadSliderEnd) * 0.5;
                var curvedSpread = Math.pow(1.0 - Math.sqrt(Math.max(0.0, 1.0 - averageSpreadSlider)), 1.75);
                for (var i = 0; i < SynthConfig_1.Config.supersawVoiceCount; i++) {
                    // Spread out the detunes around the center;
                    var offset = (i == 0) ? 0.0 : Math.pow((((i + 1) >> 1) - 0.5 + 0.025 * ((i & 2) - 1)) / (SynthConfig_1.Config.supersawVoiceCount >> 1), 1.1) * ((i & 1) * 2 - 1);
                    tone.supersawUnisonDetunes[i] = Math.pow(2.0, curvedSpread * offset / 12.0);
                }
                var baseShape = instrument.supersawShape / SynthConfig_1.Config.supersawShapeMax;
                // Saw shape mods
                var useShapeStart = baseShape * envelopeStarts[40 /* EnvelopeComputeIndex.supersawShape */];
                var useShapeEnd = baseShape * envelopeEnds[40 /* EnvelopeComputeIndex.supersawShape */];
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["saw shape"].index, channelIndex, tone.instrumentIndex)) {
                    useShapeStart = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["saw shape"].index, channelIndex, tone.instrumentIndex, false)) / SynthConfig_1.Config.supersawShapeMax;
                    useShapeEnd = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["saw shape"].index, channelIndex, tone.instrumentIndex, true)) / SynthConfig_1.Config.supersawShapeMax;
                }
                var shapeStart = useShapeStart * envelopeStarts[40 /* EnvelopeComputeIndex.supersawShape */];
                var shapeEnd = useShapeEnd * envelopeEnds[40 /* EnvelopeComputeIndex.supersawShape */];
                tone.supersawShape = shapeStart;
                tone.supersawShapeDelta = (shapeEnd - shapeStart) / roundedSamplesPerTick;
                //decimal offset mods
                var decimalOffsetModStart = instrument.decimalOffset;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["decimal offset"].index, channelIndex, tone.instrumentIndex)) {
                    decimalOffsetModStart = this.getModValue(SynthConfig_1.Config.modulators.dictionary["decimal offset"].index, channelIndex, tone.instrumentIndex, false);
                }
                var decimalOffsetStart = decimalOffsetModStart * envelopeStarts[37 /* EnvelopeComputeIndex.decimalOffset */];
                // ...is including tone.decimalOffset still necessary?
                tone.decimalOffset = decimalOffsetStart;
                var basePulseWidth = (0, SynthConfig_1.getPulseWidthRatio)(instrument.pulseWidth);
                // Check for PWM mods to this instrument
                var pulseWidthModStart = basePulseWidth;
                var pulseWidthModEnd = basePulseWidth;
                if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex)) {
                    pulseWidthModStart = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex, false)) / (SynthConfig_1.Config.pulseWidthRange * 2);
                    pulseWidthModEnd = (this.getModValue(SynthConfig_1.Config.modulators.dictionary["pulse width"].index, channelIndex, tone.instrumentIndex, true)) / (SynthConfig_1.Config.pulseWidthRange * 2);
                }
                var pulseWidthStart = pulseWidthModStart * envelopeStarts[2 /* EnvelopeComputeIndex.pulseWidth */];
                var pulseWidthEnd = pulseWidthModEnd * envelopeEnds[2 /* EnvelopeComputeIndex.pulseWidth */];
                pulseWidthStart -= decimalOffsetStart / 10000;
                pulseWidthEnd -= decimalOffsetStart / 10000;
                var phaseDeltaStart = (tone.supersawPrevPhaseDelta != null) ? tone.supersawPrevPhaseDelta : startFreq * sampleTime;
                var phaseDeltaEnd = startFreq * sampleTime * freqEndRatio;
                tone.supersawPrevPhaseDelta = phaseDeltaEnd;
                var delayLengthStart = pulseWidthStart / phaseDeltaStart;
                var delayLengthEnd = pulseWidthEnd / phaseDeltaEnd;
                tone.supersawDelayLength = delayLengthStart;
                tone.supersawDelayLengthDelta = (delayLengthEnd - delayLengthStart) / roundedSamplesPerTick;
                var minBufferLength = Math.ceil(Math.max(delayLengthStart, delayLengthEnd)) + 2;
                if (tone.supersawDelayLine == null || tone.supersawDelayLine.length <= minBufferLength) {
                    // The delay line buffer will get reused for other tones so might as well
                    // start off with a buffer size that is big enough for most notes.
                    var likelyMaximumLength = Math.ceil(0.5 * this.samplesPerSecond / Instrument.frequencyFromPitch(24));
                    var newDelayLine = new Float32Array(Synth.fittingPowerOfTwo(Math.max(likelyMaximumLength, minBufferLength)));
                    if (!initializeSupersaw && tone.supersawDelayLine != null) {
                        // If the tone has already started but the buffer needs to be reallocated,
                        // transfer the old data to the new buffer.
                        var oldDelayBufferMask = (tone.supersawDelayLine.length - 1) >> 0;
                        var startCopyingFromIndex = tone.supersawDelayIndex;
                        for (var i = 0; i < tone.supersawDelayLine.length; i++) {
                            newDelayLine[i] = tone.supersawDelayLine[(startCopyingFromIndex + i) & oldDelayBufferMask];
                        }
                    }
                    tone.supersawDelayLine = newDelayLine;
                    tone.supersawDelayIndex = tone.supersawDelayLine.length;
                }
                else if (initializeSupersaw) {
                    tone.supersawDelayLine.fill(0.0);
                    tone.supersawDelayIndex = tone.supersawDelayLine.length;
                }
                var pulseExpressionRatio = SynthConfig_1.Config.pwmBaseExpression / SynthConfig_1.Config.supersawBaseExpression;
                supersawExpressionStart *= (1.0 + (pulseExpressionRatio - 1.0) * shapeStart) / Math.sqrt(1.0 + (SynthConfig_1.Config.supersawVoiceCount - 1.0) * dynamismStart * dynamismStart);
                supersawExpressionEnd *= (1.0 + (pulseExpressionRatio - 1.0) * shapeEnd) / Math.sqrt(1.0 + (SynthConfig_1.Config.supersawVoiceCount - 1.0) * dynamismEnd * dynamismEnd);
            }
            var expressionStart = settingsExpressionMult * fadeExpressionStart * chordExpressionStart * pitchExpressionStart * envelopeStarts[0 /* EnvelopeComputeIndex.noteVolume */] * supersawExpressionStart;
            var expressionEnd = settingsExpressionMult * fadeExpressionEnd * chordExpressionEnd * pitchExpressionEnd * envelopeEnds[0 /* EnvelopeComputeIndex.noteVolume */] * supersawExpressionEnd;
            // Check for mod-related volume delta
            if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["note volume"].index, channelIndex, tone.instrumentIndex)) {
                // Linear falloff below 0, normal volume formula above 0. Seems to work best for scaling since the normal volume mult formula has a big gap from -25 to -24.
                var startVal = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note volume"].index, channelIndex, tone.instrumentIndex, false);
                var endVal = this.getModValue(SynthConfig_1.Config.modulators.dictionary["note volume"].index, channelIndex, tone.instrumentIndex, true);
                expressionStart *= ((startVal <= 0) ? ((startVal + SynthConfig_1.Config.volumeRange / 2) / (SynthConfig_1.Config.volumeRange / 2)) : Synth.instrumentVolumeToVolumeMult(startVal));
                expressionEnd *= ((endVal <= 0) ? ((endVal + SynthConfig_1.Config.volumeRange / 2) / (SynthConfig_1.Config.volumeRange / 2)) : Synth.instrumentVolumeToVolumeMult(endVal));
            }
            if (isMono && tone.pitchCount <= instrument.monoChordTone) { //silence if tone doesn't exist
                expressionStart = 0;
                expressionEnd = 0;
                instrumentState.awake = false;
            }
            tone.expression = expressionStart;
            tone.expressionDelta = (expressionEnd - expressionStart) / roundedSamplesPerTick;
            if (instrument.type == 7 /* InstrumentType.pickedString */) {
                var stringDecayStart = void 0;
                if (tone.prevStringDecay != null) {
                    stringDecayStart = tone.prevStringDecay;
                }
                else {
                    var sustainEnvelopeStart = tone.envelopeComputer.envelopeStarts[3 /* EnvelopeComputeIndex.stringSustain */];
                    stringDecayStart = 1.0 - Math.min(1.0, sustainEnvelopeStart * tone.stringSustainStart / (SynthConfig_1.Config.stringSustainRange - 1));
                }
                var sustainEnvelopeEnd = tone.envelopeComputer.envelopeEnds[3 /* EnvelopeComputeIndex.stringSustain */];
                var stringDecayEnd = 1.0 - Math.min(1.0, sustainEnvelopeEnd * tone.stringSustainEnd / (SynthConfig_1.Config.stringSustainRange - 1));
                tone.prevStringDecay = stringDecayEnd;
                //const unison: Unison = Config.unisons[instrument.unison];
                var unisonVoices = instrument.unisonVoices;
                for (var i = tone.pickedStrings.length; i < unisonVoices; i++) {
                    tone.pickedStrings[i] = new PickedString();
                }
                if (tone.atNoteStart && !transition.continues && !tone.forceContinueAtStart) {
                    for (var _i = 0, _a = tone.pickedStrings; _i < _a.length; _i++) {
                        var pickedString = _a[_i];
                        // Force the picked string to retrigger the attack impulse at the start of the note.
                        pickedString.delayIndex = -1;
                    }
                }
                for (var i = 0; i < unisonVoices; i++) {
                    tone.pickedStrings[i].update(this, instrumentState, tone, i, roundedSamplesPerTick, stringDecayStart, stringDecayEnd, instrument.stringSustainType);
                }
            }
        }
    };
    Synth.getLFOAmplitude = function (instrument, secondsIntoBar) {
        var effect = 0.0;
        for (var _i = 0, _a = SynthConfig_1.Config.vibratoTypes[instrument.vibratoType].periodsSeconds; _i < _a.length; _i++) {
            var vibratoPeriodSeconds = _a[_i];
            effect += Math.sin(Math.PI * 2.0 * secondsIntoBar / vibratoPeriodSeconds);
        }
        return effect;
    };
    Synth.getInstrumentSynthFunction = function (instrument) {
        if (instrument.type == 1 /* InstrumentType.fm */) {
            var fingerprint = instrument.algorithm + "_" + instrument.feedbackType;
            if (Synth.fmSynthFunctionCache[fingerprint] == undefined) {
                var synthSource = [];
                for (var _i = 0, _a = Synth.fmSourceTemplate; _i < _a.length; _i++) {
                    var line = _a[_i];
                    if (line.indexOf("// CARRIER OUTPUTS") != -1) {
                        var outputs = [];
                        for (var j = 0; j < SynthConfig_1.Config.algorithms[instrument.algorithm].carrierCount; j++) {
                            outputs.push("operator" + j + "Scaled");
                        }
                        synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
                    }
                    else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
                        for (var j = SynthConfig_1.Config.operatorCount - 1; j >= 0; j--) {
                            for (var _b = 0, _c = Synth.operatorSourceTemplate; _b < _c.length; _b++) {
                                var operatorLine = _c[_b];
                                if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
                                    var modulators = "";
                                    for (var _d = 0, _e = SynthConfig_1.Config.algorithms[instrument.algorithm].modulatedBy[j]; _d < _e.length; _d++) {
                                        var modulatorNumber = _e[_d];
                                        modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
                                    }
                                    var feedbackIndices = SynthConfig_1.Config.feedbacks[instrument.feedbackType].indices[j];
                                    if (feedbackIndices.length > 0) {
                                        modulators += " + feedbackMult * (";
                                        var feedbacks = [];
                                        for (var _f = 0, feedbackIndices_1 = feedbackIndices; _f < feedbackIndices_1.length; _f++) {
                                            var modulatorNumber = feedbackIndices_1[_f];
                                            feedbacks.push("operator" + (modulatorNumber - 1) + "Output");
                                        }
                                        modulators += feedbacks.join(" + ") + ")";
                                    }
                                    synthSource.push(operatorLine.replace(/\#/g, j + "").replace("/* + operator@Scaled*/", modulators));
                                }
                                else {
                                    synthSource.push(operatorLine.replace(/\#/g, j + ""));
                                }
                            }
                        }
                    }
                    else if (line.indexOf("#") != -1) {
                        for (var j = 0; j < SynthConfig_1.Config.operatorCount; j++) {
                            synthSource.push(line.replace(/\#/g, j + ""));
                        }
                    }
                    else {
                        synthSource.push(line);
                    }
                }
                //console.log(synthSource.join("\n"));
                var wrappedFmSynth = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrument) => {" + synthSource.join("\n") + "}";
                Synth.fmSynthFunctionCache[fingerprint] = new Function("Config", "Synth", wrappedFmSynth)(SynthConfig_1.Config, Synth);
            }
            return Synth.fmSynthFunctionCache[fingerprint];
        }
        else if (instrument.type == 0 /* InstrumentType.chip */) {
            // advloop addition
            if (instrument.isUsingAdvancedLoopControls) {
                return Synth.loopableChipSynth;
            }
            // advloop addition
            return Synth.chipSynth;
        }
        else if (instrument.type == 9 /* InstrumentType.customChipWave */) {
            return Synth.chipSynth;
        }
        else if (instrument.type == 5 /* InstrumentType.harmonics */) {
            return Synth.harmonicsSynth;
        }
        else if (instrument.type == 6 /* InstrumentType.pwm */) {
            return Synth.pulseWidthSynth;
        }
        else if (instrument.type == 8 /* InstrumentType.supersaw */) {
            return Synth.supersawSynth;
        }
        else if (instrument.type == 7 /* InstrumentType.pickedString */) {
            return Synth.pickedStringSynth;
        }
        else if (instrument.type == 2 /* InstrumentType.noise */) {
            return Synth.noiseSynth;
        }
        else if (instrument.type == 3 /* InstrumentType.spectrum */) {
            return Synth.spectrumSynth;
        }
        else if (instrument.type == 4 /* InstrumentType.drumset */) {
            return Synth.drumsetSynth;
        }
        else if (instrument.type == 10 /* InstrumentType.mod */) {
            return Synth.modSynth;
        }
        else if (instrument.type == 11 /* InstrumentType.fm6op */) {
            var fingerprint = instrument.customAlgorithm.name + "_" + instrument.customFeedbackType.name;
            if (Synth.fm6SynthFunctionCache[fingerprint] == undefined) {
                var synthSource = [];
                for (var _g = 0, _h = Synth.fmSourceTemplate; _g < _h.length; _g++) {
                    var line = _h[_g];
                    if (line.indexOf("// CARRIER OUTPUTS") != -1) {
                        var outputs = [];
                        for (var j = 0; j < instrument.customAlgorithm.carrierCount; j++) {
                            outputs.push("operator" + j + "Scaled");
                        }
                        synthSource.push(line.replace("/*operator#Scaled*/", outputs.join(" + ")));
                    }
                    else if (line.indexOf("// INSERT OPERATOR COMPUTATION HERE") != -1) {
                        for (var j = SynthConfig_1.Config.operatorCount + 2 - 1; j >= 0; j--) {
                            for (var _j = 0, _k = Synth.operatorSourceTemplate; _j < _k.length; _j++) {
                                var operatorLine = _k[_j];
                                if (operatorLine.indexOf("/* + operator@Scaled*/") != -1) {
                                    var modulators = "";
                                    for (var _l = 0, _m = instrument.customAlgorithm.modulatedBy[j]; _l < _m.length; _l++) {
                                        var modulatorNumber = _m[_l];
                                        modulators += " + operator" + (modulatorNumber - 1) + "Scaled";
                                    }
                                    var feedbackIndices = instrument.customFeedbackType.indices[j];
                                    if (feedbackIndices.length > 0) {
                                        modulators += " + feedbackMult * (";
                                        var feedbacks = [];
                                        for (var _o = 0, feedbackIndices_2 = feedbackIndices; _o < feedbackIndices_2.length; _o++) {
                                            var modulatorNumber = feedbackIndices_2[_o];
                                            feedbacks.push("operator" + (modulatorNumber - 1) + "Output");
                                        }
                                        modulators += feedbacks.join(" + ") + ")";
                                    }
                                    synthSource.push(operatorLine.replace(/\#/g, j + "").replace("/* + operator@Scaled*/", modulators));
                                }
                                else {
                                    synthSource.push(operatorLine.replace(/\#/g, j + ""));
                                }
                            }
                        }
                    }
                    else if (line.indexOf("#") != -1) {
                        for (var j = 0; j < SynthConfig_1.Config.operatorCount + 2; j++) {
                            synthSource.push(line.replace(/\#/g, j + ""));
                        }
                    }
                    else {
                        synthSource.push(line);
                    }
                }
                //console.log(synthSource.join("\n"));
                var wrappedFm6Synth = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrument) => {" + synthSource.join("\n") + "}";
                Synth.fm6SynthFunctionCache[fingerprint] = new Function("Config", "Synth", wrappedFm6Synth)(SynthConfig_1.Config, Synth);
            }
            return Synth.fm6SynthFunctionCache[fingerprint];
        }
        else {
            throw new Error("Unrecognized instrument type: " + instrument.type);
        }
    };
    // advloop addition
    Synth.wrap = function (x, b) {
        return (x % b + b) % b;
    };
    Synth.loopableChipSynth = function (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) {
        // @TODO:
        // - Longer declicking? This is more difficult than I thought.
        //   When determining this automatically is difficult (or the input
        //   samples are expected to vary too much), this is left up to the
        //   user.
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var chipFunction = Synth.loopableChipFunctionCache[instrumentState.unisonVoices];
        if (chipFunction == undefined) {
            var chipSource = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";
            chipSource += "\n            const aliases = (effectsIncludeDistortion(instrumentState.effects) && instrumentState.aliases);\n            // const aliases = false;\n            const data = synth.tempMonoInstrumentSampleBuffer;\n            const wave = instrumentState.wave;\n            const volumeScale = instrumentState.volumeScale;\n            const waveLength = (aliases && instrumentState.type == 8) ? wave.length : wave.length - 1;\n\n            let chipWaveLoopEnd = Math.max(0, Math.min(waveLength, instrumentState.chipWaveLoopEnd));\n            let chipWaveLoopStart = Math.max(0, Math.min(chipWaveLoopEnd - 1, instrumentState.chipWaveLoopStart));\n            ";
            // @TODO: This is where to set things up for the release loop mode.
            // const ticksSinceReleased = tone.ticksSinceReleased;
            // if (ticksSinceReleased > 0) {
            //     chipWaveLoopStart = 0;
            //     chipWaveLoopEnd = waveLength - 1;
            // }
            chipSource += "\n            let chipWaveLoopLength = chipWaveLoopEnd - chipWaveLoopStart;\n            if (chipWaveLoopLength < 2) {\n                chipWaveLoopStart = 0;\n                chipWaveLoopEnd = waveLength;\n                chipWaveLoopLength = waveLength;\n            }\n            const chipWaveLoopMode = instrumentState.chipWaveLoopMode;\n            const chipWavePlayBackwards = instrumentState.chipWavePlayBackwards;\n            const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n            if(instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {\n            ";
            for (var i = 1; i < voiceCount; i++) {
                chipSource += "\n                if (instrumentState.unisonVoices <= #)\n                    tone.phases[#] = tone.phases[#-1];\n                ".replaceAll("#", i + "");
            }
            chipSource += "\n            }";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                let phaseDelta# = tone.phaseDeltas[#] * waveLength;\n                let direction# = tone.directions[#];\n                let chipWaveCompletion# = tone.chipWaveCompletions[#];\n\n                ".replaceAll("#", i + "");
            }
            chipSource += "\n            if (chipWaveLoopMode === 3 || chipWaveLoopMode === 2 || chipWaveLoopMode === 0) {\n                // If playing once or looping, we force the correct direction,\n                // since it shouldn't really change. This is mostly so that if\n                // the mode is changed midway through playback, it won't get\n                // stuck on the wrong direction.\n                if (!chipWavePlayBackwards) {";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        direction# = 1;\n                        ".replaceAll("#", i + "");
            }
            chipSource += "} else {";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        direction# = -1;\n                        ".replaceAll("#", i + "");
            }
            chipSource += "\n                }\n            }\n            if (chipWaveLoopMode === 0 || chipWaveLoopMode === 1) {";
            // If looping or ping-ponging, we clear the completion status,
            // as it's not relevant anymore. This is mostly so that if the
            // mode is changed midway through playback, it won't get stuck
            // on zero volume.
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                    chipWaveCompletion# = 0;\n                    ".replaceAll("#", i + "");
            }
            chipSource += "    \n            }\n            \n            const chipWaveCompletionFadeLength = 1000;\n            let expression = +tone.expression;\n            const expressionDelta = +tone.expressionDelta;\n            ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                let lastWave# = tone.chipWaveCompletionsLastWave[#];\n                const phaseDeltaScale# = +tone.phaseDeltaScales[#];\n                let phase# = Synth.wrap(tone.phases[#], 1) * waveLength;\n                let prevWaveIntegral# = 0;\n\n                ".replaceAll("#", i + "");
            }
            chipSource += "\n            if (!aliases) {\n            ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                    const phase#Int = Math.floor(phase#);\n                    const index# = Synth.wrap(phase#Int, waveLength);\n                    const phaseRatio# = phase# - phase#Int;\n                    prevWaveIntegral# = +wave[index#];\n                    prevWaveIntegral# += (wave[Synth.wrap(index# + 1, waveLength)] - prevWaveIntegral#) * phaseRatio#;\n                    ".replaceAll("#", i + "");
            }
            chipSource += "\n            }\n            const filters = tone.noteFilters;\n            const filterCount = tone.noteFilterCount | 0;\n            let initialFilterInput1 = +tone.initialNoteFilterInput1;\n            let initialFilterInput2 = +tone.initialNoteFilterInput2;\n            const applyFilters = Synth.applyFilters;\n            const stopIndex = bufferIndex + roundedSamplesPerTick;\n            ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                let prevWave# = tone.chipWavePrevWaves[#];\n\n                ".replaceAll("#", i + "");
            }
            chipSource += "\n            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n                let wrapped = 0;\n            ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                    if (chipWaveCompletion# > 0 && chipWaveCompletion# < chipWaveCompletionFadeLength) {\n                        chipWaveCompletion#++;\n                    }\n                    phase# += phaseDelta# * direction#;\n\n                    ".replaceAll("#", i + "");
            }
            chipSource += "\n                if (chipWaveLoopMode === 2) {\n                ";
            // once
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        if (direction# === 1) {\n                            if (phase# > waveLength) {\n                                if (chipWaveCompletion# <= 0) {\n                                    lastWave# = prevWave#;\n                                    chipWaveCompletion#++;\n                                }\n                                wrapped = #;\n                            }\n                        } else if (direction# === -1) {\n                            if (phase# < 0) {\n                                if (chipWaveCompletion# <= 0) {\n                                    lastWave# = prevWave#;\n                                    chipWaveCompletion#++;\n                                }\n                                wrapped = 1;\n                            }\n                        }\n\n                        ".replaceAll("#", i + "");
            }
            chipSource += "\n                } else if (chipWaveLoopMode === 3) {\n                ";
            // loop once
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        if (direction# === 1) {\n                            if (phase# > chipWaveLoopEnd) {\n                                if (chipWaveCompletion# <= 0) {\n                                    lastWave# = prevWave#;\n                                    chipWaveCompletion#++;\n                                }\n                                wrapped = 1;\n                            }\n                        } else if (direction# === -1) {\n                            if (phase# < chipWaveLoopStart) {\n                                if (chipWaveCompletion# <= 0) {\n                                    lastWave# = prevWave#;\n                                    chipWaveCompletion#++;\n                                }\n                                wrapped = 1;\n                            }\n                        }\n\n                        ".replaceAll("#", i + "");
            }
            chipSource += "\n                } else if (chipWaveLoopMode === 0) {\n                ";
            // loop
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        if (direction# === 1) {\n                            if (phase# > chipWaveLoopEnd) {\n                                phase# = chipWaveLoopStart + Synth.wrap(phase# - chipWaveLoopEnd, chipWaveLoopLength);\n                                // phase# = chipWaveLoopStart;\n                                wrapped = 1;\n                            }\n                        } else if (direction# === -1) {\n                            if (phase# < chipWaveLoopStart) {\n                                phase# = chipWaveLoopEnd - Synth.wrap(chipWaveLoopStart - phase#, chipWaveLoopLength);\n                                // phase# = chipWaveLoopEnd;\n                                wrapped = 1;\n                            }\n                        }\n\n                        ".replaceAll("#", i + "");
            }
            chipSource += "    \n                } else if (chipWaveLoopMode === 1) {\n                ";
            // ping-pong
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        if (direction# === 1) {\n                            if (phase# > chipWaveLoopEnd) {\n                                phase# = chipWaveLoopEnd - Synth.wrap(phase# - chipWaveLoopEnd, chipWaveLoopLength);\n                                // phase# = chipWaveLoopEnd;\n                                direction# = -1;\n                                wrapped = 1;\n                            }\n                        } else if (direction# === -1) {\n                            if (phase# < chipWaveLoopStart) {\n                                phase# = chipWaveLoopStart + Synth.wrap(chipWaveLoopStart - phase#, chipWaveLoopLength);\n                                // phase# = chipWaveLoopStart;\n                                direction# = 1;\n                                wrapped = 1;\n                            }\n                        }\n\n                        ".replaceAll("#", i + "");
            }
            chipSource += "    \n                }\n                ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                    let wave# = 0;\n                    ".replaceAll("#", i + "");
            }
            chipSource += "    \n                let inputSample = 0;\n                if (aliases) {\n                    inputSample = 0;\n                ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        wave# = wave[Synth.wrap(Math.floor(phase#), waveLength)];\n                        prevWave# = wave#;\n                        const completionFade# = chipWaveCompletion# > 0 ? ((chipWaveCompletionFadeLength - Math.min(chipWaveCompletion#, chipWaveCompletionFadeLength)) / chipWaveCompletionFadeLength) : 1;\n                        \n                        if (chipWaveCompletion# > 0) {\n                            inputSample += lastWave# * completionFade#;\n                        } else {\n                            inputSample += wave#;\n                        }\n                        ".replaceAll("#", i + "");
            }
            chipSource += "   \n                } else {\n                ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        const phase#Int = Math.floor(phase#);\n                        const index# = Synth.wrap(phase#Int, waveLength);\n                        let nextWaveIntegral# = wave[index#];\n                        const phaseRatio# = phase# - phase#Int;\n                        nextWaveIntegral# += (wave[Synth.wrap(index# + 1, waveLength)] - nextWaveIntegral#) * phaseRatio#;\n                        ".replaceAll("#", i + "");
            }
            chipSource += "\n                    if (!(chipWaveLoopMode === 0 && chipWaveLoopStart === 0 && chipWaveLoopEnd === waveLength) && wrapped !== 0) {\n                    ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                            let pwi# = 0;\n                            const phase#_ = Math.max(0, phase# - phaseDelta# * direction#);\n                            const phase#Int = Math.floor(phase#_);\n                            const index# = Synth.wrap(phase#Int, waveLength);\n                            pwi# = wave[index#];\n                            pwi# += (wave[Synth.wrap(index# + 1, waveLength)] - pwi#) * (phase#_ - phase#Int) * direction#;\n                            prevWaveIntegral# = pwi#;\n                            ".replaceAll("#", i + "");
            }
            chipSource += "    \n                    }\n                    if (chipWaveLoopMode === 1 && wrapped !== 0) {\n                    ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                            wave# = prevWave#;\n                            ".replaceAll("#", i + "");
            }
            chipSource += "\n                    } else {\n                    ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                            wave# = (nextWaveIntegral# - prevWaveIntegral#) / (phaseDelta# * direction#);\n                            ".replaceAll("#", i + "");
            }
            chipSource += "\n                    }\n                    ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                        prevWave# = wave#;\n                        prevWaveIntegral# = nextWaveIntegral#;\n                        const completionFade# = chipWaveCompletion# > 0 ? ((chipWaveCompletionFadeLength - Math.min(chipWaveCompletion#, chipWaveCompletionFadeLength)) / chipWaveCompletionFadeLength) : 1;\n                        if (chipWaveCompletion# > 0) {\n                            inputSample += lastWave# * completionFade#;\n                        } else {\n                            inputSample += wave#;\n                        }\n                        ".replaceAll("#", i + "");
            }
            chipSource += "\n                }\n                const sample = applyFilters(inputSample * volumeScale, initialFilterInput1, initialFilterInput2, filterCount, filters);\n                initialFilterInput2 = initialFilterInput1;\n                initialFilterInput1 = inputSample * volumeScale;\n                const output = sample * expression;\n                expression += expressionDelta;\n                data[sampleIndex] += output;\n                ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                    phaseDelta# *= phaseDeltaScale#;\n                    ".replaceAll("#", i + "");
            }
            chipSource += "\n            }\n            ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                tone.phases[#] = phase# / waveLength;\n                tone.phaseDeltas[#] = phaseDelta# / waveLength;\n                tone.directions[#] = direction#;\n                tone.chipWaveCompletions[#] = chipWaveCompletion#;\n                tone.chipWavePrevWaves[#] = prevWave#;\n                tone.chipWaveCompletionsLastWave[#] = lastWave#;\n                \n                ".replaceAll("#", i + "");
            }
            chipSource += "\n            tone.expression = expression;\n            synth.sanitizeFilters(filters);\n            tone.initialNoteFilterInput1 = initialFilterInput1;\n            tone.initialNoteFilterInput2 = initialFilterInput2;\n        }";
            chipFunction = new Function("Config", "Synth", "effectsIncludeDistortion", chipSource)(SynthConfig_1.Config, Synth, SynthConfig_1.effectsIncludeDistortion);
            Synth.loopableChipFunctionCache[instrumentState.unisonVoices] = chipFunction;
        }
        chipFunction(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
    };
    Synth.chipSynth = function (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) {
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var chipFunction = Synth.chipFunctionCache[instrumentState.unisonVoices];
        if (chipFunction == undefined) {
            var chipSource = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";
            chipSource += "\n        const aliases = (effectsIncludeDistortion(instrumentState.effects) && instrumentState.aliases);\n        const data = synth.tempMonoInstrumentSampleBuffer;\n        const wave = instrumentState.wave;\n        const volumeScale = instrumentState.volumeScale;\n\n        const waveLength = (aliases && instrumentState.type == 8) ? wave.length : wave.length - 1;\n\n        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n        let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "let phaseDelta# = tone.phaseDeltas[#] * waveLength;\n            let phaseDeltaScale# = +tone.phaseDeltaScales[#];\n\n            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];\n            ".replaceAll("#", i + "");
            }
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * waveLength;\n            let prevWaveIntegral# = 0.0;\n            ".replaceAll("#", i + "");
            }
            chipSource += "const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;\n\n        if (!aliases) {\n        ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "const phase#Int = phase# | 0;\n                const index# = phase#Int % waveLength;\n                prevWaveIntegral# = +wave[index#]\n                const phase#Ratio = phase# - phase#Int;\n                prevWaveIntegral# += (wave[index# + 1] - prevWaveIntegral#) * phase#Ratio;\n                ".replaceAll("#", i + "");
            }
            chipSource += "\n        } \n\n        const stopIndex = bufferIndex + roundedSamplesPerTick;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n        let inputSample = 0;\n            if (aliases) {\n                ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "phase# += phaseDelta#;\n\n                    const inputSample# = wave[(0 | phase#) % waveLength];\n                    ".replaceAll("#", i + "");
            }
            var sampleListA = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleListA.push("inputSample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            chipSource += "inputSample = " + sampleListA.join(" + ") + ";";
            chipSource += "} else {\n                    ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "phase# += phaseDelta#;\n\n                     \n                        const phase#Int = phase# | 0;\n                        const index# = phase#Int % waveLength;\n                        let nextWaveIntegral# = wave[index#]\n                        const phase#Ratio = phase# - phase#Int;\n                        nextWaveIntegral# += (wave[index# + 1] - nextWaveIntegral#) * phase#Ratio;\n                        const wave# = (nextWaveIntegral# - prevWaveIntegral#) / phaseDelta#;\n                        prevWaveIntegral# = nextWaveIntegral#;\n                        let inputSample# = wave#;\n                        ".replaceAll("#", i + "");
            }
            var sampleListB = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleListB.push("inputSample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            chipSource += "inputSample = " + sampleListB.join(" + ") + ";";
            chipSource += "}\n        ";
            chipSource += "const sample = applyFilters(inputSample * volumeScale, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample * volumeScale;";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "\n                phaseDelta# *= phaseDeltaScale#;\n                ".replaceAll("#", i + "");
            }
            chipSource += "const output = sample * expression;\n            expression += expressionDelta;\n            data[sampleIndex] += output;\n        }\n            ";
            for (var i = 0; i < voiceCount; i++) {
                chipSource += "tone.phases[#] = phase# / waveLength;\n            tone.phaseDeltas[#] = phaseDelta# / waveLength;\n            ".replaceAll("#", i + "");
            }
            chipSource += "tone.expression = expression;";
            chipSource += "\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n    }";
            chipFunction = new Function("Config", "Synth", "effectsIncludeDistortion", chipSource)(SynthConfig_1.Config, Synth, SynthConfig_1.effectsIncludeDistortion);
            Synth.chipFunctionCache[instrumentState.unisonVoices] = chipFunction;
        }
        chipFunction(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
    };
    Synth.harmonicsSynth = function (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) {
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var harmonicsFunction = Synth.harmonicsFunctionCache[instrumentState.unisonVoices];
        if (harmonicsFunction == undefined) {
            var harmonicsSource = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";
            harmonicsSource += "\n        const data = synth.tempMonoInstrumentSampleBuffer;\n        const wave = instrumentState.wave;\n        const waveLength = wave.length - 1; // The first sample is duplicated at the end, don't double-count it.\n\n        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n        let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n         ";
            for (var i = 0; i < voiceCount; i++) {
                harmonicsSource += "let phaseDelta# = tone.phaseDeltas[#] * waveLength;\n            let phaseDeltaScale# = +tone.phaseDeltaScales[#];\n\n            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];\n            ".replaceAll("#", i + "");
            }
            for (var i = 0; i < voiceCount; i++) {
                harmonicsSource += "let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * waveLength;\n            ".replaceAll("#", i + "");
            }
            harmonicsSource += "const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                harmonicsSource += "const phase#Int = phase# | 0;\n            const index# = phase#Int % waveLength;\n            prevWaveIntegral# = +wave[index#]\n            const phase#Ratio = phase# - phase#Int;\n            prevWaveIntegral# += (wave[index# + 1] - prevWaveIntegral#) * phase#Ratio;\n            ".replaceAll("#", i + "");
            }
            harmonicsSource += "const stopIndex = bufferIndex + roundedSamplesPerTick;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n        ";
            for (var i = 0; i < voiceCount; i++) {
                harmonicsSource += "\n                        phase# += phaseDelta#;\n                        const phase#Int = phase# | 0;\n                        const index# = phase#Int % waveLength;\n                        let nextWaveIntegral# = wave[index#]\n                        const phase#Ratio = phase# - phase#Int;\n                        nextWaveIntegral# += (wave[index# + 1] - nextWaveIntegral#) * phase#Ratio;\n                        const wave# = (nextWaveIntegral# - prevWaveIntegral#) / phaseDelta#;\n                        prevWaveIntegral# = nextWaveIntegral#;\n                        let inputSample# = wave#;\n                        ".replaceAll("#", i + "");
            }
            var sampleList = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleList.push("inputSample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            harmonicsSource += "inputSample = " + sampleList.join(" + ") + ";";
            harmonicsSource += "const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample;";
            for (var i = 0; i < voiceCount; i++) {
                harmonicsSource += "\n                phaseDelta# *= phaseDeltaScale#;\n                ".replaceAll("#", i + "");
            }
            harmonicsSource += "const output = sample * expression;\n            expression += expressionDelta;\n            data[sampleIndex] += output;\n        }\n            ";
            for (var i = 0; i < voiceCount; i++) {
                harmonicsSource += "tone.phases[#] = phase# / waveLength;\n            tone.phaseDeltas[#] = phaseDelta# / waveLength;\n            ".replaceAll("#", i + "");
            }
            harmonicsSource += "tone.expression = expression;";
            harmonicsSource += "\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n    }";
            harmonicsFunction = new Function("Config", "Synth", harmonicsSource)(SynthConfig_1.Config, Synth);
            Synth.harmonicsFunctionCache[instrumentState.unisonVoices] = harmonicsFunction;
        }
        harmonicsFunction(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
    };
    Synth.pickedStringSynth = function (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) {
        // This algorithm is similar to the Karpluss-Strong algorithm in principle, but with an
        // all-pass filter for dispersion and with more control over the impulse harmonics.
        // The source code is processed as a string before being compiled, in order to
        // handle the unison feature. If unison is disabled or set to none, then only one
        // string voice is required, otherwise two string voices are required. We only want
        // to compute the minimum possible number of string voices, so omit the code for
        // processing extra ones if possible. Any line containing a "#" is duplicated for
        // each required voice, replacing the "#" with the voice index.
        var voiceCount = instrumentState.unisonVoices;
        var pickedStringFunction = Synth.pickedStringFunctionCache[voiceCount];
        if (pickedStringFunction == undefined) {
            var pickedStringSource = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";
            pickedStringSource += "\n\t\t\t\tconst Config = beepbox.Config;\n\t\t\t\tconst Synth = beepbox.Synth;\n\t\t\t\tconst data = synth.tempMonoInstrumentSampleBuffer;\n\t\t\t\t\n\t\t\t\tlet pickedString# = tone.pickedStrings[#];\n\t\t\t\tlet allPassSample# = +pickedString#.allPassSample;\n\t\t\t\tlet allPassPrevInput# = +pickedString#.allPassPrevInput;\n\t\t\t\tlet sustainFilterSample# = +pickedString#.sustainFilterSample;\n\t\t\t\tlet sustainFilterPrevOutput2# = +pickedString#.sustainFilterPrevOutput2;\n\t\t\t\tlet sustainFilterPrevInput1# = +pickedString#.sustainFilterPrevInput1;\n\t\t\t\tlet sustainFilterPrevInput2# = +pickedString#.sustainFilterPrevInput2;\n\t\t\t\tlet fractionalDelaySample# = +pickedString#.fractionalDelaySample;\n\t\t\t\tconst delayLine# = pickedString#.delayLine;\n\t\t\t\tconst delayBufferMask# = (delayLine#.length - 1) >> 0;\n\t\t\t\tlet delayIndex# = pickedString#.delayIndex|0;\n\t\t\t\tdelayIndex# = (delayIndex# & delayBufferMask#) + delayLine#.length;\n\t\t\t\tlet delayLength# = +pickedString#.prevDelayLength;\n\t\t\t\tconst delayLengthDelta# = +pickedString#.delayLengthDelta;\n\t\t\t\tlet allPassG# = +pickedString#.allPassG;\n\t\t\t\tlet sustainFilterA1# = +pickedString#.sustainFilterA1;\n\t\t\t\tlet sustainFilterA2# = +pickedString#.sustainFilterA2;\n\t\t\t\tlet sustainFilterB0# = +pickedString#.sustainFilterB0;\n\t\t\t\tlet sustainFilterB1# = +pickedString#.sustainFilterB1;\n\t\t\t\tlet sustainFilterB2# = +pickedString#.sustainFilterB2;\n\t\t\t\tconst allPassGDelta# = +pickedString#.allPassGDelta;\n\t\t\t\tconst sustainFilterA1Delta# = +pickedString#.sustainFilterA1Delta;\n\t\t\t\tconst sustainFilterA2Delta# = +pickedString#.sustainFilterA2Delta;\n\t\t\t\tconst sustainFilterB0Delta# = +pickedString#.sustainFilterB0Delta;\n\t\t\t\tconst sustainFilterB1Delta# = +pickedString#.sustainFilterB1Delta;\n\t\t\t\tconst sustainFilterB2Delta# = +pickedString#.sustainFilterB2Delta;\n\t\t\t\t\n\t\t\t\tlet expression = +tone.expression;\n\t\t\t\tconst expressionDelta = +tone.expressionDelta;\n\t\t\t\t\n\t\t\t\tconst unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n                if (instrumentState.unisonVoices == 1 && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[1] = tone.phases[0];\n\t\t\t\tconst delayResetOffset# = pickedString#.delayResetOffset|0;\n\t\t\t\t\n\t\t\t\tconst filters = tone.noteFilters;\n\t\t\t\tconst filterCount = tone.noteFilterCount|0;\n\t\t\t\tlet initialFilterInput1 = +tone.initialNoteFilterInput1;\n\t\t\t\tlet initialFilterInput2 = +tone.initialNoteFilterInput2;\n\t\t\t\tconst applyFilters = Synth.applyFilters;\n\t\t\t\t\n\t\t\t\tconst stopIndex = bufferIndex + runLength;\n\t\t\t\tfor (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n\t\t\t\t\tconst targetSampleTime# = delayIndex# - delayLength#;\n\t\t\t\t\tconst lowerIndex# = (targetSampleTime# + 0.125) | 0; // Offset to improve stability of all-pass filter.\n\t\t\t\t\tconst upperIndex# = lowerIndex# + 1;\n\t\t\t\t\tconst fractionalDelay# = upperIndex# - targetSampleTime#;\n\t\t\t\t\tconst fractionalDelayG# = (1.0 - fractionalDelay#) / (1.0 + fractionalDelay#); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay\n\t\t\t\t\tconst prevInput# = delayLine#[lowerIndex# & delayBufferMask#];\n\t\t\t\t\tconst input# = delayLine#[upperIndex# & delayBufferMask#];\n\t\t\t\t\tfractionalDelaySample# = fractionalDelayG# * input# + prevInput# - fractionalDelayG# * fractionalDelaySample#;\n\t\t\t\t\t\n\t\t\t\t\tallPassSample# = fractionalDelaySample# * allPassG# + allPassPrevInput# - allPassG# * allPassSample#;\n\t\t\t\t\tallPassPrevInput# = fractionalDelaySample#;\n\t\t\t\t\t\n\t\t\t\t\tconst sustainFilterPrevOutput1# = sustainFilterSample#;\n\t\t\t\t\tsustainFilterSample# = sustainFilterB0# * allPassSample# + sustainFilterB1# * sustainFilterPrevInput1# + sustainFilterB2# * sustainFilterPrevInput2# - sustainFilterA1# * sustainFilterSample# - sustainFilterA2# * sustainFilterPrevOutput2#;\n\t\t\t\t\tsustainFilterPrevOutput2# = sustainFilterPrevOutput1#;\n\t\t\t\t\tsustainFilterPrevInput2# = sustainFilterPrevInput1#;\n\t\t\t\t\tsustainFilterPrevInput1# = allPassSample#;\n\t\t\t\t\t\n\t\t\t\t\tdelayLine#[delayIndex# & delayBufferMask#] += sustainFilterSample#;\n\t\t\t\t\tdelayLine#[(delayIndex# + delayResetOffset#) & delayBufferMask#] = 0.0;\n\t\t\t\t\tdelayIndex#++;\n\t\t\t\t\t\n\t\t\t\t\tconst inputSample = (";
            var sampleList = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleList.push("fractionalDelaySample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            pickedStringSource += sampleList.join(" + ");
            pickedStringSource += ") * expression;\n\t\t\t\t\tconst sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n\t\t\t\t\tinitialFilterInput2 = initialFilterInput1;\n\t\t\t\t\tinitialFilterInput1 = inputSample;\n\t\t\t\t\tdata[sampleIndex] += sample;\n\t\t\t\t\t\n\t\t\t\t\texpression += expressionDelta;\n\t\t\t\t\tdelayLength# += delayLengthDelta#;\n\t\t\t\t\tallPassG# += allPassGDelta#;\n\t\t\t\t\tsustainFilterA1# += sustainFilterA1Delta#;\n\t\t\t\t\tsustainFilterA2# += sustainFilterA2Delta#;\n\t\t\t\t\tsustainFilterB0# += sustainFilterB0Delta#;\n\t\t\t\t\tsustainFilterB1# += sustainFilterB1Delta#;\n\t\t\t\t\tsustainFilterB2# += sustainFilterB2Delta#;\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\t// Avoid persistent denormal or NaN values in the delay buffers and filter history.\n\t\t\t\tconst epsilon = (1.0e-24);\n\t\t\t\tif (!Number.isFinite(allPassSample#) || Math.abs(allPassSample#) < epsilon) allPassSample# = 0.0;\n\t\t\t\tif (!Number.isFinite(allPassPrevInput#) || Math.abs(allPassPrevInput#) < epsilon) allPassPrevInput# = 0.0;\n\t\t\t\tif (!Number.isFinite(sustainFilterSample#) || Math.abs(sustainFilterSample#) < epsilon) sustainFilterSample# = 0.0;\n\t\t\t\tif (!Number.isFinite(sustainFilterPrevOutput2#) || Math.abs(sustainFilterPrevOutput2#) < epsilon) sustainFilterPrevOutput2# = 0.0;\n\t\t\t\tif (!Number.isFinite(sustainFilterPrevInput1#) || Math.abs(sustainFilterPrevInput1#) < epsilon) sustainFilterPrevInput1# = 0.0;\n\t\t\t\tif (!Number.isFinite(sustainFilterPrevInput2#) || Math.abs(sustainFilterPrevInput2#) < epsilon) sustainFilterPrevInput2# = 0.0;\n\t\t\t\tif (!Number.isFinite(fractionalDelaySample#) || Math.abs(fractionalDelaySample#) < epsilon) fractionalDelaySample# = 0.0;\n\t\t\t\tpickedString#.allPassSample = allPassSample#;\n\t\t\t\tpickedString#.allPassPrevInput = allPassPrevInput#;\n\t\t\t\tpickedString#.sustainFilterSample = sustainFilterSample#;\n\t\t\t\tpickedString#.sustainFilterPrevOutput2 = sustainFilterPrevOutput2#;\n\t\t\t\tpickedString#.sustainFilterPrevInput1 = sustainFilterPrevInput1#;\n\t\t\t\tpickedString#.sustainFilterPrevInput2 = sustainFilterPrevInput2#;\n\t\t\t\tpickedString#.fractionalDelaySample = fractionalDelaySample#;\n\t\t\t\tpickedString#.delayIndex = delayIndex#;\n\t\t\t\tpickedString#.prevDelayLength = delayLength#;\n\t\t\t\tpickedString#.allPassG = allPassG#;\n\t\t\t\tpickedString#.sustainFilterA1 = sustainFilterA1#;\n\t\t\t\tpickedString#.sustainFilterA2 = sustainFilterA2#;\n\t\t\t\tpickedString#.sustainFilterB0 = sustainFilterB0#;\n\t\t\t\tpickedString#.sustainFilterB1 = sustainFilterB1#;\n\t\t\t\tpickedString#.sustainFilterB2 = sustainFilterB2#;\n\t\t\t\t\n\t\t\t\ttone.expression = expression;\n\t\t\t\t\n\t\t\t\tsynth.sanitizeFilters(filters);\n\t\t\t\ttone.initialNoteFilterInput1 = initialFilterInput1;\n\t\t\t\ttone.initialNoteFilterInput2 = initialFilterInput2;\n\t\t\t}";
            // Duplicate lines containing "#" for each voice and replace the "#" with the voice index.
            pickedStringSource = pickedStringSource.replace(/^.*\#.*$/mg, function (line) {
                var lines = [];
                for (var voice = 0; voice < voiceCount; voice++) {
                    lines.push(line.replace(/\#/g, String(voice)));
                }
                return lines.join("\n");
            });
            pickedStringFunction = new Function("Config", "Synth", pickedStringSource)(SynthConfig_1.Config, Synth);
            Synth.pickedStringFunctionCache[voiceCount] = pickedStringFunction;
        }
        pickedStringFunction(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
    };
    Synth.effectsSynth = function (synth, outputDataL, outputDataR, bufferIndex, runLength, instrumentState) {
        // TODO: If automation is involved, don't assume sliders will stay at zero.
        // @jummbus - ^ Correct, removed the non-zero checks as modulation can change them.
        var usesDistortion = (0, SynthConfig_1.effectsIncludeDistortion)(instrumentState.effects);
        var usesBitcrusher = (0, SynthConfig_1.effectsIncludeBitcrusher)(instrumentState.effects);
        var usesEqFilter = instrumentState.eqFilterCount > 0;
        var usesPanning = (0, SynthConfig_1.effectsIncludePanning)(instrumentState.effects);
        var usesChorus = (0, SynthConfig_1.effectsIncludeChorus)(instrumentState.effects);
        var usesEcho = (0, SynthConfig_1.effectsIncludeEcho)(instrumentState.effects);
        var usesReverb = (0, SynthConfig_1.effectsIncludeReverb)(instrumentState.effects);
        var usesGranular = (0, SynthConfig_1.effectsIncludeGranular)(instrumentState.effects);
        var usesRingModulation = (0, SynthConfig_1.effectsIncludeRingModulation)(instrumentState.effects);
        var usesPhaser = (0, SynthConfig_1.effectsIncludePhaser)(instrumentState.effects);
        var usesInvertWave = (0, SynthConfig_1.effectsIncludeInvertWave)(instrumentState.effects) && instrumentState.invertWave;
        var signature = 0;
        if (usesDistortion)
            signature = signature | 1;
        signature = signature << 1;
        if (usesBitcrusher)
            signature = signature | 1;
        signature = signature << 1;
        if (usesEqFilter)
            signature = signature | 1;
        signature = signature << 1;
        if (usesPanning)
            signature = signature | 1;
        signature = signature << 1;
        if (usesChorus)
            signature = signature | 1;
        signature = signature << 1;
        if (usesEcho)
            signature = signature | 1;
        signature = signature << 1;
        if (usesReverb)
            signature = signature | 1;
        signature = signature << 1;
        if (usesGranular)
            signature = signature | 1;
        signature = signature << 1;
        if (usesRingModulation)
            signature = signature | 1;
        signature = signature << 1;
        if (usesPhaser)
            signature = signature | 1;
        signature = signature << 1;
        if (usesInvertWave)
            signature = signature | 1;
        var effectsFunction = Synth.effectsFunctionCache[signature];
        if (effectsFunction == undefined) {
            var effectsSource = "return (synth, outputDataL, outputDataR, bufferIndex, runLength, instrumentState) => {";
            var usesDelays = usesChorus || usesReverb || usesEcho || usesGranular;
            effectsSource += "\n\t\t\t\tconst tempMonoInstrumentSampleBuffer = synth.tempMonoInstrumentSampleBuffer;\n\t\t\t\t\n\t\t\t\tlet mixVolume = +instrumentState.mixVolume;\n\t\t\t\tconst mixVolumeDelta = +instrumentState.mixVolumeDelta;\n                ";
            if (usesDelays) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tlet delayInputMult = +instrumentState.delayInputMult;\n\t\t\t\tconst delayInputMultDelta = +instrumentState.delayInputMultDelta;";
            }
            if (usesGranular) {
                effectsSource += "\n                let granularWet = instrumentState.granularMix;\n                const granularMixDelta = instrumentState.granularMixDelta;\n                let granularDry = 1.0 - granularWet; \n                const granularDelayLine = instrumentState.granularDelayLine;\n                const granularGrains = instrumentState.granularGrains;\n                let granularGrainCount = instrumentState.granularGrainsLength;\n                const granularDelayLineLength = granularDelayLine.length;\n                const granularDelayLineMask = granularDelayLineLength - 1;\n                let granularDelayLineIndex = instrumentState.granularDelayLineIndex;\n                const usesRandomGrainLocation = instrumentState.usesRandomGrainLocation;\n                const computeGrains = instrumentState.computeGrains;\n                instrumentState.granularDelayLineDirty = true;\n                ";
            }
            if (usesDistortion) {
                // Distortion can sometimes create noticeable aliasing.
                // It seems the established industry best practice for distortion antialiasing
                // is to upsample the inputs ("zero stuffing" followed by a brick wall lowpass
                // at the original nyquist frequency), perform the distortion, then downsample
                // (the lowpass again followed by dropping in-between samples). This is
                // "mathematically correct" in that it preserves only the intended frequencies,
                // but it has several unfortunate tradeoffs depending on the choice of filter,
                // introducing latency and/or time smearing, since no true brick wall filter
                // exists. For the time being, I've opted to instead generate in-between input
                // samples using fractional delay all-pass filters, and after distorting them,
                // I "downsample" these with a simple weighted sum.
                effectsSource += "\n\t\t\t\t\n\t\t\t\tconst distortionBaseVolume = +Config.distortionBaseVolume;\n\t\t\t\tlet distortion = instrumentState.distortion;\n\t\t\t\tconst distortionDelta = instrumentState.distortionDelta;\n\t\t\t\tlet distortionDrive = instrumentState.distortionDrive;\n\t\t\t\tconst distortionDriveDelta = instrumentState.distortionDriveDelta;\n\t\t\t\tconst distortionFractionalResolution = 4.0;\n\t\t\t\tconst distortionOversampleCompensation = distortionBaseVolume / distortionFractionalResolution;\n\t\t\t\tconst distortionFractionalDelay1 = 1.0 / distortionFractionalResolution;\n\t\t\t\tconst distortionFractionalDelay2 = 2.0 / distortionFractionalResolution;\n\t\t\t\tconst distortionFractionalDelay3 = 3.0 / distortionFractionalResolution;\n\t\t\t\tconst distortionFractionalDelayG1 = (1.0 - distortionFractionalDelay1) / (1.0 + distortionFractionalDelay1); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay\n\t\t\t\tconst distortionFractionalDelayG2 = (1.0 - distortionFractionalDelay2) / (1.0 + distortionFractionalDelay2); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay\n\t\t\t\tconst distortionFractionalDelayG3 = (1.0 - distortionFractionalDelay3) / (1.0 + distortionFractionalDelay3); // Inlined version of FilterCoefficients.prototype.allPass1stOrderFractionalDelay\n\t\t\t\tconst distortionNextOutputWeight1 = Math.cos(Math.PI * distortionFractionalDelay1) * 0.5 + 0.5;\n\t\t\t\tconst distortionNextOutputWeight2 = Math.cos(Math.PI * distortionFractionalDelay2) * 0.5 + 0.5;\n\t\t\t\tconst distortionNextOutputWeight3 = Math.cos(Math.PI * distortionFractionalDelay3) * 0.5 + 0.5;\n\t\t\t\tconst distortionPrevOutputWeight1 = 1.0 - distortionNextOutputWeight1;\n\t\t\t\tconst distortionPrevOutputWeight2 = 1.0 - distortionNextOutputWeight2;\n\t\t\t\tconst distortionPrevOutputWeight3 = 1.0 - distortionNextOutputWeight3;\n\t\t\t\t\n\t\t\t\tlet distortionFractionalInput1 = +instrumentState.distortionFractionalInput1;\n\t\t\t\tlet distortionFractionalInput2 = +instrumentState.distortionFractionalInput2;\n\t\t\t\tlet distortionFractionalInput3 = +instrumentState.distortionFractionalInput3;\n\t\t\t\tlet distortionPrevInput = +instrumentState.distortionPrevInput;\n\t\t\t\tlet distortionNextOutput = +instrumentState.distortionNextOutput;";
            }
            if (usesBitcrusher) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tlet bitcrusherPrevInput = +instrumentState.bitcrusherPrevInput;\n\t\t\t\tlet bitcrusherCurrentOutput = +instrumentState.bitcrusherCurrentOutput;\n\t\t\t\tlet bitcrusherPhase = +instrumentState.bitcrusherPhase;\n\t\t\t\tlet bitcrusherPhaseDelta = +instrumentState.bitcrusherPhaseDelta;\n\t\t\t\tconst bitcrusherPhaseDeltaScale = +instrumentState.bitcrusherPhaseDeltaScale;\n\t\t\t\tlet bitcrusherScale = +instrumentState.bitcrusherScale;\n\t\t\t\tconst bitcrusherScaleScale = +instrumentState.bitcrusherScaleScale;\n\t\t\t\tlet bitcrusherFoldLevel = +instrumentState.bitcrusherFoldLevel;\n\t\t\t\tconst bitcrusherFoldLevelScale = +instrumentState.bitcrusherFoldLevelScale;";
            }
            if (usesRingModulation) {
                effectsSource += "\n\t\t\t\t\n                let ringModMix = +instrumentState.ringModMix;\n                let ringModMixDelta = +instrumentState.ringModMixDelta;\n                let ringModPhase = +instrumentState.ringModPhase;\n                let ringModPhaseDelta = +instrumentState.ringModPhaseDelta;\n                let ringModPhaseDeltaScale = +instrumentState.ringModPhaseDeltaScale;\n                let ringModWaveformIndex = +instrumentState.ringModWaveformIndex;\n                let ringModMixFade = +instrumentState.ringModMixFade;\n                let ringModMixFadeDelta = +instrumentState.ringModMixFadeDelta;\n                \n                let ringModPulseWidth = +instrumentState.ringModPulseWidth;\n\n                let waveform = Config.operatorWaves[ringModWaveformIndex].samples; \n                if (ringModWaveformIndex == Config.operatorWaves.dictionary['pulse width'].index) {\n                    waveform = Synth.getOperatorWave(ringModWaveformIndex, ringModPulseWidth).samples;\n                }\n                const waveformLength = waveform.length - 1;\n                ";
            }
            if (usesPhaser) {
                effectsSource += "\n                \n                const phaserSamples = instrumentState.phaserSamples;\n                const phaserPrevInputs = instrumentState.phaserPrevInputs;\n                let phaserStages = instrumentState.phaserStages;\n                let phaserStagesInt = Math.floor(phaserStages);\n                const phaserStagesDelta = instrumentState.phaserStagesDelta;\n                const phaserFeedbackMultDelta = +instrumentState.phaserFeedbackMultDelta;\n                let phaserFeedbackMult = +instrumentState.phaserFeedbackMult;\n                const phaserMixDelta = +instrumentState.phaserMixDelta;\n                let phaserMix = +instrumentState.phaserMix;\n                const phaserBreakCoefDelta = +instrumentState.phaserBreakCoefDelta;\n                let phaserBreakCoef = +instrumentState.phaserBreakCoef;\n                ";
            }
            if (usesInvertWave) {
                effectsSource += "\n                let isInverted = +instrumentState.invertWave;\n                ";
            }
            if (usesEqFilter) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tlet filters = instrumentState.eqFilters;\n\t\t\t\tconst filterCount = instrumentState.eqFilterCount|0;\n\t\t\t\tlet initialFilterInput1 = +instrumentState.initialEqFilterInput1;\n\t\t\t\tlet initialFilterInput2 = +instrumentState.initialEqFilterInput2;\n\t\t\t\tconst applyFilters = Synth.applyFilters;";
            }
            // The eq filter volume is also used to fade out the instrument state, so always include it.
            effectsSource += "\n\t\t\t\t\n\t\t\t\tlet eqFilterVolume = +instrumentState.eqFilterVolume;\n\t\t\t\tconst eqFilterVolumeDelta = +instrumentState.eqFilterVolumeDelta;";
            if (usesPanning) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tconst panningMask = synth.panningDelayBufferMask >>> 0;\n\t\t\t\tconst panningDelayLine = instrumentState.panningDelayLine;\n\t\t\t\tlet panningDelayPos = instrumentState.panningDelayPos & panningMask;\n\t\t\t\tlet   panningVolumeL      = +instrumentState.panningVolumeL;\n\t\t\t\tlet   panningVolumeR      = +instrumentState.panningVolumeR;\n\t\t\t\tconst panningVolumeDeltaL = +instrumentState.panningVolumeDeltaL;\n\t\t\t\tconst panningVolumeDeltaR = +instrumentState.panningVolumeDeltaR;\n\t\t\t\tlet   panningOffsetL      = +instrumentState.panningOffsetL;\n\t\t\t\tlet   panningOffsetR      = +instrumentState.panningOffsetR;\n\t\t\t\tconst panningOffsetDeltaL = 1.0 - instrumentState.panningOffsetDeltaL;\n\t\t\t\tconst panningOffsetDeltaR = 1.0 - instrumentState.panningOffsetDeltaR;";
            }
            if (usesChorus) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tconst chorusMask = synth.chorusDelayBufferMask >>> 0;\n\t\t\t\tconst chorusDelayLineL = instrumentState.chorusDelayLineL;\n\t\t\t\tconst chorusDelayLineR = instrumentState.chorusDelayLineR;\n\t\t\t\tinstrumentState.chorusDelayLineDirty = true;\n\t\t\t\tlet chorusDelayPos = instrumentState.chorusDelayPos & chorusMask;\n\t\t\t\t\n\t\t\t\tlet chorusVoiceMult = +instrumentState.chorusVoiceMult;\n\t\t\t\tconst chorusVoiceMultDelta = +instrumentState.chorusVoiceMultDelta;\n\t\t\t\tlet chorusCombinedMult = +instrumentState.chorusCombinedMult;\n\t\t\t\tconst chorusCombinedMultDelta = +instrumentState.chorusCombinedMultDelta;\n\t\t\t\t\n\t\t\t\tconst chorusDuration = +beepbox.Config.chorusPeriodSeconds;\n\t\t\t\tconst chorusAngle = Math.PI * 2.0 / (chorusDuration * synth.samplesPerSecond);\n\t\t\t\tconst chorusRange = synth.samplesPerSecond * beepbox.Config.chorusDelayRange;\n\t\t\t\tconst chorusOffset0 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][0] * chorusRange;\n\t\t\t\tconst chorusOffset1 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][1] * chorusRange;\n\t\t\t\tconst chorusOffset2 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[0][2] * chorusRange;\n\t\t\t\tconst chorusOffset3 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][0] * chorusRange;\n\t\t\t\tconst chorusOffset4 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][1] * chorusRange;\n\t\t\t\tconst chorusOffset5 = synth.chorusDelayBufferSize - beepbox.Config.chorusDelayOffsets[1][2] * chorusRange;\n\t\t\t\tlet chorusPhase = instrumentState.chorusPhase % (Math.PI * 2.0);\n\t\t\t\tlet chorusTap0Index = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]);\n\t\t\t\tlet chorusTap1Index = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]);\n\t\t\t\tlet chorusTap2Index = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]);\n\t\t\t\tlet chorusTap3Index = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]);\n\t\t\t\tlet chorusTap4Index = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]);\n\t\t\t\tlet chorusTap5Index = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]);\n\t\t\t\tchorusPhase += chorusAngle * runLength;\n\t\t\t\tconst chorusTap0End = chorusDelayPos + chorusOffset0 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][0]) + runLength;\n\t\t\t\tconst chorusTap1End = chorusDelayPos + chorusOffset1 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][1]) + runLength;\n\t\t\t\tconst chorusTap2End = chorusDelayPos + chorusOffset2 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[0][2]) + runLength;\n\t\t\t\tconst chorusTap3End = chorusDelayPos + chorusOffset3 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][0]) + runLength;\n\t\t\t\tconst chorusTap4End = chorusDelayPos + chorusOffset4 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][1]) + runLength;\n\t\t\t\tconst chorusTap5End = chorusDelayPos + chorusOffset5 - chorusRange * Math.sin(chorusPhase + beepbox.Config.chorusPhaseOffsets[1][2]) + runLength;\n\t\t\t\tconst chorusTap0Delta = (chorusTap0End - chorusTap0Index) / runLength;\n\t\t\t\tconst chorusTap1Delta = (chorusTap1End - chorusTap1Index) / runLength;\n\t\t\t\tconst chorusTap2Delta = (chorusTap2End - chorusTap2Index) / runLength;\n\t\t\t\tconst chorusTap3Delta = (chorusTap3End - chorusTap3Index) / runLength;\n\t\t\t\tconst chorusTap4Delta = (chorusTap4End - chorusTap4Index) / runLength;\n\t\t\t\tconst chorusTap5Delta = (chorusTap5End - chorusTap5Index) / runLength;";
            }
            if (usesEcho) {
                effectsSource += "\n\t\t\t\tlet echoMult = +instrumentState.echoMult;\n\t\t\t\tconst echoMultDelta = +instrumentState.echoMultDelta;\n\t\t\t\t\n\t\t\t\tconst echoDelayLineL = instrumentState.echoDelayLineL;\n\t\t\t\tconst echoDelayLineR = instrumentState.echoDelayLineR;\n\t\t\t\tconst echoMask = (echoDelayLineL.length - 1) >>> 0;\n\t\t\t\tinstrumentState.echoDelayLineDirty = true;\n\t\t\t\t\n\t\t\t\tlet echoDelayPos = instrumentState.echoDelayPos & echoMask;\n\t\t\t\tconst echoDelayOffsetStart = (echoDelayLineL.length - instrumentState.echoDelayOffsetStart) & echoMask;\n\t\t\t\tconst echoDelayOffsetEnd   = (echoDelayLineL.length - instrumentState.echoDelayOffsetEnd) & echoMask;\n\t\t\t\tlet echoDelayOffsetRatio = +instrumentState.echoDelayOffsetRatio;\n\t\t\t\tconst echoDelayOffsetRatioDelta = +instrumentState.echoDelayOffsetRatioDelta;\n\t\t\t\t\n\t\t\t\tconst echoShelfA1 = +instrumentState.echoShelfA1;\n\t\t\t\tconst echoShelfB0 = +instrumentState.echoShelfB0;\n\t\t\t\tconst echoShelfB1 = +instrumentState.echoShelfB1;\n\t\t\t\tlet echoShelfSampleL = +instrumentState.echoShelfSampleL;\n\t\t\t\tlet echoShelfSampleR = +instrumentState.echoShelfSampleR;\n\t\t\t\tlet echoShelfPrevInputL = +instrumentState.echoShelfPrevInputL;\n\t\t\t\tlet echoShelfPrevInputR = +instrumentState.echoShelfPrevInputR;";
            }
            if (usesReverb) { //TODO: reverb wet/dry?
                effectsSource += "\n\t\t\t\t\n\t\t\t\tconst reverbMask = Config.reverbDelayBufferMask >>> 0; //TODO: Dynamic reverb buffer size.\n\t\t\t\tconst reverbDelayLine = instrumentState.reverbDelayLine;\n\t\t\t\tinstrumentState.reverbDelayLineDirty = true;\n\t\t\t\tlet reverbDelayPos = instrumentState.reverbDelayPos & reverbMask;\n\t\t\t\t\n\t\t\t\tlet reverb = +instrumentState.reverbMult;\n\t\t\t\tconst reverbDelta = +instrumentState.reverbMultDelta;\n\t\t\t\t\n\t\t\t\tconst reverbShelfA1 = +instrumentState.reverbShelfA1;\n\t\t\t\tconst reverbShelfB0 = +instrumentState.reverbShelfB0;\n\t\t\t\tconst reverbShelfB1 = +instrumentState.reverbShelfB1;\n\t\t\t\tlet reverbShelfSample0 = +instrumentState.reverbShelfSample0;\n\t\t\t\tlet reverbShelfSample1 = +instrumentState.reverbShelfSample1;\n\t\t\t\tlet reverbShelfSample2 = +instrumentState.reverbShelfSample2;\n\t\t\t\tlet reverbShelfSample3 = +instrumentState.reverbShelfSample3;\n\t\t\t\tlet reverbShelfPrevInput0 = +instrumentState.reverbShelfPrevInput0;\n\t\t\t\tlet reverbShelfPrevInput1 = +instrumentState.reverbShelfPrevInput1;\n\t\t\t\tlet reverbShelfPrevInput2 = +instrumentState.reverbShelfPrevInput2;\n\t\t\t\tlet reverbShelfPrevInput3 = +instrumentState.reverbShelfPrevInput3;";
            }
            effectsSource += "\n\t\t\t\t\n\t\t\t\tconst stopIndex = bufferIndex + runLength;\n            for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n                    ";
            if (usesGranular) {
                effectsSource += "\n                let sample = tempMonoInstrumentSampleBuffer[sampleIndex];\n                let granularOutput = 0;\n                for (let grainIndex = 0; grainIndex < granularGrainCount; grainIndex++) {\n                    const grain = granularGrains[grainIndex];\n                    if(computeGrains) {\n                        if(grain.delay > 0) {\n                            grain.delay--;\n                        } else {\n                            const grainDelayLinePosition = grain.delayLinePosition;\n                            const grainDelayLinePositionInt = grainDelayLinePosition | 0;\n                            // const grainDelayLinePositionT = grainDelayLinePosition - grainDelayLinePositionInt;\n                            let grainAgeInSamples = grain.ageInSamples;\n                            const grainMaxAgeInSamples = grain.maxAgeInSamples;\n                            // const grainSample0 = granularDelayLine[((granularDelayLineIndex + (granularDelayLineLength - grainDelayLinePositionInt))    ) & granularDelayLineMask];\n                            // const grainSample1 = granularDelayLine[((granularDelayLineIndex + (granularDelayLineLength - grainDelayLinePositionInt)) + 1) & granularDelayLineMask];\n                            // let grainSample = grainSample0 + (grainSample1 - grainSample0) * grainDelayLinePositionT; // Linear interpolation (@TODO: sounds quite bad?)\n                            let grainSample = granularDelayLine[((granularDelayLineIndex + (granularDelayLineLength - grainDelayLinePositionInt))    ) & granularDelayLineMask]; // No interpolation\n                            ";
                if (SynthConfig_1.Config.granularEnvelopeType == 0 /* GranularEnvelopeType.parabolic */) {
                    effectsSource += "\n                                const grainEnvelope = grain.parabolicEnvelopeAmplitude;\n                                ";
                }
                else if (SynthConfig_1.Config.granularEnvelopeType == 1 /* GranularEnvelopeType.raisedCosineBell */) {
                    effectsSource += "\n                                const grainEnvelope = grain.rcbEnvelopeAmplitude;\n                                ";
                }
                effectsSource += "\n                            grainSample *= grainEnvelope;\n                            granularOutput += grainSample;\n                            if (grainAgeInSamples > grainMaxAgeInSamples) {\n                                if (granularGrainCount > 0) {\n                                    // Faster equivalent of .pop, ignoring the order in the array.\n                                    const lastGrainIndex = granularGrainCount - 1;\n                                    const lastGrain = granularGrains[lastGrainIndex];\n                                    granularGrains[grainIndex] = lastGrain;\n                                    granularGrains[lastGrainIndex] = grain;\n                                    granularGrainCount--;\n                                    grainIndex--;\n                                    // ^ Dangerous, since this could end up causing an infinite loop,\n                                    // but should be okay in this case.\n                                }\n                            } else {\n                                grainAgeInSamples++;\n                            ";
                if (SynthConfig_1.Config.granularEnvelopeType == 0 /* GranularEnvelopeType.parabolic */) {
                    // grain.updateParabolicEnvelope();
                    // Inlined:
                    effectsSource += "\n                                    grain.parabolicEnvelopeAmplitude += grain.parabolicEnvelopeSlope;\n                                    grain.parabolicEnvelopeSlope += grain.parabolicEnvelopeCurve;\n                                    ";
                }
                else if (SynthConfig_1.Config.granularEnvelopeType == 1 /* GranularEnvelopeType.raisedCosineBell */) {
                    effectsSource += "\n                                    grain.updateRCBEnvelope();\n                                    ";
                }
                effectsSource += "\n                                grain.ageInSamples = grainAgeInSamples;\n                                // if(usesRandomGrainLocation) {\n                                //     grain.delayLine -= grainPitchShift;\n                                // }\n                            }\n                        }\n                    }\n                }\n                granularWet += granularMixDelta;\n                granularDry -= granularMixDelta;\n                granularOutput *= Config.granularOutputLoudnessCompensation;\n                granularDelayLine[granularDelayLineIndex] = sample;\n                granularDelayLineIndex = (granularDelayLineIndex + 1) & granularDelayLineMask;\n                sample = sample * granularDry + granularOutput * granularWet;\n                tempMonoInstrumentSampleBuffer[sampleIndex] = 0.0;\n                ";
            }
            else {
                effectsSource += "let sample = tempMonoInstrumentSampleBuffer[sampleIndex];\n                tempMonoInstrumentSampleBuffer[sampleIndex] = 0.0;";
            }
            if (usesInvertWave) {
                effectsSource += "\n                    sample = sample*-1;\n                ";
            }
            if (usesDistortion) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tconst distortionReverse = 1.0 - distortion;\n\t\t\t\t\tconst distortionNextInput = sample * distortionDrive;\n\t\t\t\t\tsample = distortionNextOutput;\n\t\t\t\t\tdistortionNextOutput = distortionNextInput / (distortionReverse * Math.abs(distortionNextInput) + distortion);\n\t\t\t\t\tdistortionFractionalInput1 = distortionFractionalDelayG1 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG1 * distortionFractionalInput1;\n\t\t\t\t\tdistortionFractionalInput2 = distortionFractionalDelayG2 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG2 * distortionFractionalInput2;\n\t\t\t\t\tdistortionFractionalInput3 = distortionFractionalDelayG3 * distortionNextInput + distortionPrevInput - distortionFractionalDelayG3 * distortionFractionalInput3;\n\t\t\t\t\tconst distortionOutput1 = distortionFractionalInput1 / (distortionReverse * Math.abs(distortionFractionalInput1) + distortion);\n\t\t\t\t\tconst distortionOutput2 = distortionFractionalInput2 / (distortionReverse * Math.abs(distortionFractionalInput2) + distortion);\n\t\t\t\t\tconst distortionOutput3 = distortionFractionalInput3 / (distortionReverse * Math.abs(distortionFractionalInput3) + distortion);\n\t\t\t\t\tdistortionNextOutput += distortionOutput1 * distortionNextOutputWeight1 + distortionOutput2 * distortionNextOutputWeight2 + distortionOutput3 * distortionNextOutputWeight3;\n\t\t\t\t\tsample += distortionOutput1 * distortionPrevOutputWeight1 + distortionOutput2 * distortionPrevOutputWeight2 + distortionOutput3 * distortionPrevOutputWeight3;\n\t\t\t\t\tsample *= distortionOversampleCompensation;\n\t\t\t\t\tdistortionPrevInput = distortionNextInput;\n\t\t\t\t\tdistortion += distortionDelta;\n\t\t\t\t\tdistortionDrive += distortionDriveDelta;";
            }
            if (usesBitcrusher) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tbitcrusherPhase += bitcrusherPhaseDelta;\n\t\t\t\t\tif (bitcrusherPhase < 1.0) {\n\t\t\t\t\t\tbitcrusherPrevInput = sample;\n\t\t\t\t\t\tsample = bitcrusherCurrentOutput;\n\t\t\t\t\t} else {\n\t\t\t\t\t\tbitcrusherPhase -= (bitcrusherPhase | 0);\n\t\t\t\t\t\tconst ratio = bitcrusherPhase / bitcrusherPhaseDelta;\n\t\t\t\t\t\t\n\t\t\t\t\t\tconst lerpedInput = sample + (bitcrusherPrevInput - sample) * ratio;\n\t\t\t\t\t\tbitcrusherPrevInput = sample;\n\t\t\t\t\t\t\n\t\t\t\t\t\tconst bitcrusherWrapLevel = bitcrusherFoldLevel * 4.0;\n\t\t\t\t\t\tconst wrappedSample = (((lerpedInput + bitcrusherFoldLevel) % bitcrusherWrapLevel) + bitcrusherWrapLevel) % bitcrusherWrapLevel;\n\t\t\t\t\t\tconst foldedSample = bitcrusherFoldLevel - Math.abs(bitcrusherFoldLevel * 2.0 - wrappedSample);\n\t\t\t\t\t\tconst scaledSample = foldedSample / bitcrusherScale;\n\t\t\t\t\t\tconst oldValue = bitcrusherCurrentOutput;\n\t\t\t\t\t\tconst newValue = (((scaledSample > 0 ? scaledSample + 1 : scaledSample)|0)-.5) * bitcrusherScale;\n\t\t\t\t\t\t\n\t\t\t\t\t\tsample = oldValue + (newValue - oldValue) * ratio;\n\t\t\t\t\t\tbitcrusherCurrentOutput = newValue;\n\t\t\t\t\t}\n\t\t\t\t\tbitcrusherPhaseDelta *= bitcrusherPhaseDeltaScale;\n\t\t\t\t\tbitcrusherScale *= bitcrusherScaleScale;\n\t\t\t\t\tbitcrusherFoldLevel *= bitcrusherFoldLevelScale;";
            }
            if (usesRingModulation) {
                effectsSource += " \n                \n                const ringModOutput = sample * waveform[(ringModPhase*waveformLength)|0];\n                const ringModMixF = Math.max(0, ringModMix * ringModMixFade);\n                sample = sample * (1 - ringModMixF) + ringModOutput * ringModMixF;\n\n                ringModMix += ringModMixDelta;\n                ringModPhase += ringModPhaseDelta;\n                ringModPhase -= ringModPhase | 0;\n                ringModPhaseDelta *= ringModPhaseDeltaScale;\n                ringModMixFade += ringModMixFadeDelta;\n                ";
            }
            if (usesPhaser) {
                effectsSource += "\n                        const phaserFeedback = phaserSamples[Math.max(0,phaserStagesInt - 1)] * phaserFeedbackMult;\n                        for (let stage = 0; stage < phaserStagesInt; stage++) {\n                            const phaserInput = stage === 0 ? sample + phaserFeedback : phaserSamples[stage - 1];\n                            const phaserPrevInput = phaserPrevInputs[stage];\n                            const phaserSample = phaserSamples[stage];\n                            const phaserNextOutput = phaserBreakCoef * phaserInput + phaserPrevInput - phaserBreakCoef * phaserSample;\n                            phaserPrevInputs[stage] = phaserInput;\n                            phaserSamples[stage] = phaserNextOutput;\n                        }\n                        const phaserOutput = phaserSamples[Math.max(0,phaserStagesInt - 1)];\n                        sample = sample + phaserOutput * phaserMix;\n                        phaserFeedbackMult += phaserFeedbackMultDelta;\n                        phaserBreakCoef += phaserBreakCoefDelta;\n                        phaserMix += phaserMixDelta;\n                        phaserStages += phaserStagesDelta;\n                        /*phaserStagesInt = Math.floor(phaserStages);*/\n                    ";
            }
            if (usesEqFilter) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tconst inputSample = sample;\n\t\t\t\t\tsample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n\t\t\t\t\tinitialFilterInput2 = initialFilterInput1;\n\t\t\t\t\tinitialFilterInput1 = inputSample;";
            }
            // The eq filter volume is also used to fade out the instrument state, so always include it.
            effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tsample *= eqFilterVolume;\n\t\t\t\t\teqFilterVolume += eqFilterVolumeDelta;";
            if (usesPanning) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tpanningDelayLine[panningDelayPos] = sample;\n\t\t\t\t\tconst panningRatioL  = panningOffsetL - (panningOffsetL | 0);\n\t\t\t\t\tconst panningRatioR  = panningOffsetR - (panningOffsetR | 0);\n\t\t\t\t\tconst panningTapLA   = panningDelayLine[(panningOffsetL) & panningMask];\n\t\t\t\t\tconst panningTapLB   = panningDelayLine[(panningOffsetL + 1) & panningMask];\n\t\t\t\t\tconst panningTapRA   = panningDelayLine[(panningOffsetR) & panningMask];\n\t\t\t\t\tconst panningTapRB   = panningDelayLine[(panningOffsetR + 1) & panningMask];\n\t\t\t\t\tconst panningTapL    = panningTapLA + (panningTapLB - panningTapLA) * panningRatioL;\n\t\t\t\t\tconst panningTapR    = panningTapRA + (panningTapRB - panningTapRA) * panningRatioR;\n\t\t\t\t\tlet sampleL = panningTapL * panningVolumeL;\n\t\t\t\t\tlet sampleR = panningTapR * panningVolumeR;\n\t\t\t\t\tpanningDelayPos = (panningDelayPos + 1) & panningMask;\n\t\t\t\t\tpanningVolumeL += panningVolumeDeltaL;\n\t\t\t\t\tpanningVolumeR += panningVolumeDeltaR;\n\t\t\t\t\tpanningOffsetL += panningOffsetDeltaL;\n\t\t\t\t\tpanningOffsetR += panningOffsetDeltaR;";
            }
            else {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tlet sampleL = sample;\n\t\t\t\t\tlet sampleR = sample;";
            }
            if (usesChorus) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tconst chorusTap0Ratio = chorusTap0Index - (chorusTap0Index | 0);\n\t\t\t\t\tconst chorusTap1Ratio = chorusTap1Index - (chorusTap1Index | 0);\n\t\t\t\t\tconst chorusTap2Ratio = chorusTap2Index - (chorusTap2Index | 0);\n\t\t\t\t\tconst chorusTap3Ratio = chorusTap3Index - (chorusTap3Index | 0);\n\t\t\t\t\tconst chorusTap4Ratio = chorusTap4Index - (chorusTap4Index | 0);\n\t\t\t\t\tconst chorusTap5Ratio = chorusTap5Index - (chorusTap5Index | 0);\n\t\t\t\t\tconst chorusTap0A = chorusDelayLineL[(chorusTap0Index) & chorusMask];\n\t\t\t\t\tconst chorusTap0B = chorusDelayLineL[(chorusTap0Index + 1) & chorusMask];\n\t\t\t\t\tconst chorusTap1A = chorusDelayLineL[(chorusTap1Index) & chorusMask];\n\t\t\t\t\tconst chorusTap1B = chorusDelayLineL[(chorusTap1Index + 1) & chorusMask];\n\t\t\t\t\tconst chorusTap2A = chorusDelayLineL[(chorusTap2Index) & chorusMask];\n\t\t\t\t\tconst chorusTap2B = chorusDelayLineL[(chorusTap2Index + 1) & chorusMask];\n\t\t\t\t\tconst chorusTap3A = chorusDelayLineR[(chorusTap3Index) & chorusMask];\n\t\t\t\t\tconst chorusTap3B = chorusDelayLineR[(chorusTap3Index + 1) & chorusMask];\n\t\t\t\t\tconst chorusTap4A = chorusDelayLineR[(chorusTap4Index) & chorusMask];\n\t\t\t\t\tconst chorusTap4B = chorusDelayLineR[(chorusTap4Index + 1) & chorusMask];\n\t\t\t\t\tconst chorusTap5A = chorusDelayLineR[(chorusTap5Index) & chorusMask];\n\t\t\t\t\tconst chorusTap5B = chorusDelayLineR[(chorusTap5Index + 1) & chorusMask];\n\t\t\t\t\tconst chorusTap0 = chorusTap0A + (chorusTap0B - chorusTap0A) * chorusTap0Ratio;\n\t\t\t\t\tconst chorusTap1 = chorusTap1A + (chorusTap1B - chorusTap1A) * chorusTap1Ratio;\n\t\t\t\t\tconst chorusTap2 = chorusTap2A + (chorusTap2B - chorusTap2A) * chorusTap2Ratio;\n\t\t\t\t\tconst chorusTap3 = chorusTap3A + (chorusTap3B - chorusTap3A) * chorusTap3Ratio;\n\t\t\t\t\tconst chorusTap4 = chorusTap4A + (chorusTap4B - chorusTap4A) * chorusTap4Ratio;\n\t\t\t\t\tconst chorusTap5 = chorusTap5A + (chorusTap5B - chorusTap5A) * chorusTap5Ratio;\n\t\t\t\t\tchorusDelayLineL[chorusDelayPos] = sampleL * delayInputMult;\n\t\t\t\t\tchorusDelayLineR[chorusDelayPos] = sampleR * delayInputMult;\n\t\t\t\t\tsampleL = chorusCombinedMult * (sampleL + chorusVoiceMult * (chorusTap1 - chorusTap0 - chorusTap2));\n\t\t\t\t\tsampleR = chorusCombinedMult * (sampleR + chorusVoiceMult * (chorusTap4 - chorusTap3 - chorusTap5));\n\t\t\t\t\tchorusDelayPos = (chorusDelayPos + 1) & chorusMask;\n\t\t\t\t\tchorusTap0Index += chorusTap0Delta;\n\t\t\t\t\tchorusTap1Index += chorusTap1Delta;\n\t\t\t\t\tchorusTap2Index += chorusTap2Delta;\n\t\t\t\t\tchorusTap3Index += chorusTap3Delta;\n\t\t\t\t\tchorusTap4Index += chorusTap4Delta;\n\t\t\t\t\tchorusTap5Index += chorusTap5Delta;\n\t\t\t\t\tchorusVoiceMult += chorusVoiceMultDelta;\n\t\t\t\t\tchorusCombinedMult += chorusCombinedMultDelta;";
            }
            if (usesEcho) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tconst echoTapStartIndex = (echoDelayPos + echoDelayOffsetStart) & echoMask;\n\t\t\t\t\tconst echoTapEndIndex   = (echoDelayPos + echoDelayOffsetEnd  ) & echoMask;\n\t\t\t\t\tconst echoTapStartL = echoDelayLineL[echoTapStartIndex];\n\t\t\t\t\tconst echoTapEndL   = echoDelayLineL[echoTapEndIndex];\n\t\t\t\t\tconst echoTapStartR = echoDelayLineR[echoTapStartIndex];\n\t\t\t\t\tconst echoTapEndR   = echoDelayLineR[echoTapEndIndex];\n\t\t\t\t\tconst echoTapL = (echoTapStartL + (echoTapEndL - echoTapStartL) * echoDelayOffsetRatio) * echoMult;\n\t\t\t\t\tconst echoTapR = (echoTapStartR + (echoTapEndR - echoTapStartR) * echoDelayOffsetRatio) * echoMult;\n\t\t\t\t\t\n\t\t\t\t\techoShelfSampleL = echoShelfB0 * echoTapL + echoShelfB1 * echoShelfPrevInputL - echoShelfA1 * echoShelfSampleL;\n\t\t\t\t\techoShelfSampleR = echoShelfB0 * echoTapR + echoShelfB1 * echoShelfPrevInputR - echoShelfA1 * echoShelfSampleR;\n\t\t\t\t\techoShelfPrevInputL = echoTapL;\n\t\t\t\t\techoShelfPrevInputR = echoTapR;\n\t\t\t\t\tsampleL += echoShelfSampleL;\n\t\t\t\t\tsampleR += echoShelfSampleR;\n\t\t\t\t\t\n\t\t\t\t\techoDelayLineL[echoDelayPos] = sampleL * delayInputMult;\n\t\t\t\t\techoDelayLineR[echoDelayPos] = sampleR * delayInputMult;\n\t\t\t\t\techoDelayPos = (echoDelayPos + 1) & echoMask;\n\t\t\t\t\techoDelayOffsetRatio += echoDelayOffsetRatioDelta;\n\t\t\t\t\techoMult += echoMultDelta;\n                    ";
            }
            if (usesReverb) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\t// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.\n\t\t\t\t\t// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268\n\t\t\t\t\t// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14\n\t\t\t\t\t// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384\n\t\t\t\t\tconst reverbDelayPos1 = (reverbDelayPos +  3041) & reverbMask;\n\t\t\t\t\tconst reverbDelayPos2 = (reverbDelayPos +  6426) & reverbMask;\n\t\t\t\t\tconst reverbDelayPos3 = (reverbDelayPos + 10907) & reverbMask;\n\t\t\t\t\tconst reverbSample0 = (reverbDelayLine[reverbDelayPos]);\n\t\t\t\t\tconst reverbSample1 = reverbDelayLine[reverbDelayPos1];\n\t\t\t\t\tconst reverbSample2 = reverbDelayLine[reverbDelayPos2];\n\t\t\t\t\tconst reverbSample3 = reverbDelayLine[reverbDelayPos3];\n\t\t\t\t\tconst reverbTemp0 = -(reverbSample0 + sampleL) + reverbSample1;\n\t\t\t\t\tconst reverbTemp1 = -(reverbSample0 + sampleR) - reverbSample1;\n\t\t\t\t\tconst reverbTemp2 = -reverbSample2 + reverbSample3;\n\t\t\t\t\tconst reverbTemp3 = -reverbSample2 - reverbSample3;\n\t\t\t\t\tconst reverbShelfInput0 = (reverbTemp0 + reverbTemp2) * reverb;\n\t\t\t\t\tconst reverbShelfInput1 = (reverbTemp1 + reverbTemp3) * reverb;\n\t\t\t\t\tconst reverbShelfInput2 = (reverbTemp0 - reverbTemp2) * reverb;\n\t\t\t\t\tconst reverbShelfInput3 = (reverbTemp1 - reverbTemp3) * reverb;\n\t\t\t\t\treverbShelfSample0 = reverbShelfB0 * reverbShelfInput0 + reverbShelfB1 * reverbShelfPrevInput0 - reverbShelfA1 * reverbShelfSample0;\n\t\t\t\t\treverbShelfSample1 = reverbShelfB0 * reverbShelfInput1 + reverbShelfB1 * reverbShelfPrevInput1 - reverbShelfA1 * reverbShelfSample1;\n\t\t\t\t\treverbShelfSample2 = reverbShelfB0 * reverbShelfInput2 + reverbShelfB1 * reverbShelfPrevInput2 - reverbShelfA1 * reverbShelfSample2;\n\t\t\t\t\treverbShelfSample3 = reverbShelfB0 * reverbShelfInput3 + reverbShelfB1 * reverbShelfPrevInput3 - reverbShelfA1 * reverbShelfSample3;\n\t\t\t\t\treverbShelfPrevInput0 = reverbShelfInput0;\n\t\t\t\t\treverbShelfPrevInput1 = reverbShelfInput1;\n\t\t\t\t\treverbShelfPrevInput2 = reverbShelfInput2;\n\t\t\t\t\treverbShelfPrevInput3 = reverbShelfInput3;\n\t\t\t\t\treverbDelayLine[reverbDelayPos1] = reverbShelfSample0 * delayInputMult;\n\t\t\t\t\treverbDelayLine[reverbDelayPos2] = reverbShelfSample1 * delayInputMult;\n\t\t\t\t\treverbDelayLine[reverbDelayPos3] = reverbShelfSample2 * delayInputMult;\n\t\t\t\t\treverbDelayLine[reverbDelayPos ] = reverbShelfSample3 * delayInputMult;\n\t\t\t\t\treverbDelayPos = (reverbDelayPos + 1) & reverbMask;\n\t\t\t\t\tsampleL += reverbSample1 + reverbSample2 + reverbSample3;\n\t\t\t\t\tsampleR += reverbSample0 + reverbSample2 - reverbSample3;\n\t\t\t\t\treverb += reverbDelta;";
            }
            effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\toutputDataL[sampleIndex] += sampleL * mixVolume;\n\t\t\t\t\toutputDataR[sampleIndex] += sampleR * mixVolume;\n\t\t\t\t\tmixVolume += mixVolumeDelta;";
            if (usesDelays) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\t\tdelayInputMult += delayInputMultDelta;";
            }
            effectsSource += "\n\t\t\t\t}\n\t\t\t\t\n\t\t\t\tinstrumentState.mixVolume = mixVolume;\n\t\t\t\tinstrumentState.eqFilterVolume = eqFilterVolume;\n\t\t\t\t\n\t\t\t\t// Avoid persistent denormal or NaN values in the delay buffers and filter history.\n\t\t\t\tconst epsilon = (1.0e-24);";
            if (usesDelays) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tinstrumentState.delayInputMult = delayInputMult;";
            }
            if (usesGranular) {
                effectsSource += "\n                    instrumentState.granularMix = granularWet;\n                    instrumentState.granularGrainsLength = granularGrainCount;\n                    instrumentState.granularDelayLineIndex = granularDelayLineIndex;\n                ";
            }
            if (usesDistortion) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tinstrumentState.distortion = distortion;\n\t\t\t\tinstrumentState.distortionDrive = distortionDrive;\n\t\t\t\t\n\t\t\t\tif (!Number.isFinite(distortionFractionalInput1) || Math.abs(distortionFractionalInput1) < epsilon) distortionFractionalInput1 = 0.0;\n\t\t\t\tif (!Number.isFinite(distortionFractionalInput2) || Math.abs(distortionFractionalInput2) < epsilon) distortionFractionalInput2 = 0.0;\n\t\t\t\tif (!Number.isFinite(distortionFractionalInput3) || Math.abs(distortionFractionalInput3) < epsilon) distortionFractionalInput3 = 0.0;\n\t\t\t\tif (!Number.isFinite(distortionPrevInput) || Math.abs(distortionPrevInput) < epsilon) distortionPrevInput = 0.0;\n\t\t\t\tif (!Number.isFinite(distortionNextOutput) || Math.abs(distortionNextOutput) < epsilon) distortionNextOutput = 0.0;\n\t\t\t\t\n\t\t\t\tinstrumentState.distortionFractionalInput1 = distortionFractionalInput1;\n\t\t\t\tinstrumentState.distortionFractionalInput2 = distortionFractionalInput2;\n\t\t\t\tinstrumentState.distortionFractionalInput3 = distortionFractionalInput3;\n\t\t\t\tinstrumentState.distortionPrevInput = distortionPrevInput;\n\t\t\t\tinstrumentState.distortionNextOutput = distortionNextOutput;";
            }
            if (usesBitcrusher) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\tif (Math.abs(bitcrusherPrevInput) < epsilon) bitcrusherPrevInput = 0.0;\n\t\t\t\tif (Math.abs(bitcrusherCurrentOutput) < epsilon) bitcrusherCurrentOutput = 0.0;\n\t\t\t\tinstrumentState.bitcrusherPrevInput = bitcrusherPrevInput;\n\t\t\t\tinstrumentState.bitcrusherCurrentOutput = bitcrusherCurrentOutput;\n\t\t\t\tinstrumentState.bitcrusherPhase = bitcrusherPhase;\n\t\t\t\tinstrumentState.bitcrusherPhaseDelta = bitcrusherPhaseDelta;\n\t\t\t\tinstrumentState.bitcrusherScale = bitcrusherScale;\n\t\t\t\tinstrumentState.bitcrusherFoldLevel = bitcrusherFoldLevel;";
            }
            if (usesRingModulation) {
                effectsSource += " \n                instrumentState.ringModMix = ringModMix;\n                instrumentState.ringModMixDelta = ringModMixDelta;\n                instrumentState.ringModPhase = ringModPhase;\n                instrumentState.ringModPhaseDelta = ringModPhaseDelta;\n                instrumentState.ringModPhaseDeltaScale = ringModPhaseDeltaScale;\n                instrumentState.ringModWaveformIndex = ringModWaveformIndex;\n                instrumentState.ringModPulseWidth = ringModPulseWidth;\n                instrumentState.ringModMixFade = ringModMixFade;\n                 ";
            }
            if (usesPhaser) {
                effectsSource += "\n                \n                for (let stage = 0; stage < phaserStages; stage++) {\n                    if (!Number.isFinite(phaserPrevInputs[stage]) || Math.abs(phaserPrevInputs[stage]) < epsilon) phaserPrevInputs[stage] = 0.0;\n                    if (!Number.isFinite(phaserSamples[stage]) || Math.abs(phaserSamples[stage]) < epsilon) phaserSamples[stage] = 0.0;\n                }\n                \n                instrumentState.phaserMix = phaserMix;\n                instrumentState.phaserFeedbackMult = phaserFeedbackMult;\n                instrumentState.phaserBreakCoef = phaserBreakCoef;\n                ";
            }
            if (usesEqFilter) {
                effectsSource += "\n\t\t\t\t\t\n\t\t\t\tsynth.sanitizeFilters(filters);\n\t\t\t\t// The filter input here is downstream from another filter so we\n\t\t\t\t// better make sure it's safe too.\n\t\t\t\tif (!(initialFilterInput1 < 100) || !(initialFilterInput2 < 100)) {\n\t\t\t\t\tinitialFilterInput1 = 0.0;\n\t\t\t\t\tinitialFilterInput2 = 0.0;\n\t\t\t\t}\n\t\t\t\tif (Math.abs(initialFilterInput1) < epsilon) initialFilterInput1 = 0.0;\n\t\t\t\tif (Math.abs(initialFilterInput2) < epsilon) initialFilterInput2 = 0.0;\n\t\t\t\tinstrumentState.initialEqFilterInput1 = initialFilterInput1;\n\t\t\t\tinstrumentState.initialEqFilterInput2 = initialFilterInput2;";
            }
            if (usesPanning) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tSynth.sanitizeDelayLine(panningDelayLine, panningDelayPos, panningMask);\n\t\t\t\tinstrumentState.panningDelayPos = panningDelayPos;\n\t\t\t\tinstrumentState.panningVolumeL = panningVolumeL;\n\t\t\t\tinstrumentState.panningVolumeR = panningVolumeR;\n\t\t\t\tinstrumentState.panningOffsetL = panningOffsetL;\n\t\t\t\tinstrumentState.panningOffsetR = panningOffsetR;";
            }
            if (usesChorus) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tSynth.sanitizeDelayLine(chorusDelayLineL, chorusDelayPos, chorusMask);\n\t\t\t\tSynth.sanitizeDelayLine(chorusDelayLineR, chorusDelayPos, chorusMask);\n\t\t\t\tinstrumentState.chorusPhase = chorusPhase;\n\t\t\t\tinstrumentState.chorusDelayPos = chorusDelayPos;\n\t\t\t\tinstrumentState.chorusVoiceMult = chorusVoiceMult;\n\t\t\t\tinstrumentState.chorusCombinedMult = chorusCombinedMult;";
            }
            if (usesEcho) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tSynth.sanitizeDelayLine(echoDelayLineL, echoDelayPos, echoMask);\n\t\t\t\tSynth.sanitizeDelayLine(echoDelayLineR, echoDelayPos, echoMask);\n\t\t\t\tinstrumentState.echoDelayPos = echoDelayPos;\n\t\t\t\tinstrumentState.echoMult = echoMult;\n\t\t\t\tinstrumentState.echoDelayOffsetRatio = echoDelayOffsetRatio;\n\t\t\t\t\n\t\t\t\tif (!Number.isFinite(echoShelfSampleL) || Math.abs(echoShelfSampleL) < epsilon) echoShelfSampleL = 0.0;\n\t\t\t\tif (!Number.isFinite(echoShelfSampleR) || Math.abs(echoShelfSampleR) < epsilon) echoShelfSampleR = 0.0;\n\t\t\t\tif (!Number.isFinite(echoShelfPrevInputL) || Math.abs(echoShelfPrevInputL) < epsilon) echoShelfPrevInputL = 0.0;\n\t\t\t\tif (!Number.isFinite(echoShelfPrevInputR) || Math.abs(echoShelfPrevInputR) < epsilon) echoShelfPrevInputR = 0.0;\n\t\t\t\tinstrumentState.echoShelfSampleL = echoShelfSampleL;\n\t\t\t\tinstrumentState.echoShelfSampleR = echoShelfSampleR;\n\t\t\t\tinstrumentState.echoShelfPrevInputL = echoShelfPrevInputL;\n\t\t\t\tinstrumentState.echoShelfPrevInputR = echoShelfPrevInputR;";
            }
            if (usesReverb) {
                effectsSource += "\n\t\t\t\t\n\t\t\t\tSynth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos        , reverbMask);\n\t\t\t\tSynth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  3041, reverbMask);\n\t\t\t\tSynth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos +  6426, reverbMask);\n\t\t\t\tSynth.sanitizeDelayLine(reverbDelayLine, reverbDelayPos + 10907, reverbMask);\n\t\t\t\tinstrumentState.reverbDelayPos = reverbDelayPos;\n\t\t\t\tinstrumentState.reverbMult = reverb;\n\t\t\t\t\n\t\t\t\tif (!Number.isFinite(reverbShelfSample0) || Math.abs(reverbShelfSample0) < epsilon) reverbShelfSample0 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfSample1) || Math.abs(reverbShelfSample1) < epsilon) reverbShelfSample1 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfSample2) || Math.abs(reverbShelfSample2) < epsilon) reverbShelfSample2 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfSample3) || Math.abs(reverbShelfSample3) < epsilon) reverbShelfSample3 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfPrevInput0) || Math.abs(reverbShelfPrevInput0) < epsilon) reverbShelfPrevInput0 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfPrevInput1) || Math.abs(reverbShelfPrevInput1) < epsilon) reverbShelfPrevInput1 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfPrevInput2) || Math.abs(reverbShelfPrevInput2) < epsilon) reverbShelfPrevInput2 = 0.0;\n\t\t\t\tif (!Number.isFinite(reverbShelfPrevInput3) || Math.abs(reverbShelfPrevInput3) < epsilon) reverbShelfPrevInput3 = 0.0;\n\t\t\t\tinstrumentState.reverbShelfSample0 = reverbShelfSample0;\n\t\t\t\tinstrumentState.reverbShelfSample1 = reverbShelfSample1;\n\t\t\t\tinstrumentState.reverbShelfSample2 = reverbShelfSample2;\n\t\t\t\tinstrumentState.reverbShelfSample3 = reverbShelfSample3;\n\t\t\t\tinstrumentState.reverbShelfPrevInput0 = reverbShelfPrevInput0;\n\t\t\t\tinstrumentState.reverbShelfPrevInput1 = reverbShelfPrevInput1;\n\t\t\t\tinstrumentState.reverbShelfPrevInput2 = reverbShelfPrevInput2;\n\t\t\t\tinstrumentState.reverbShelfPrevInput3 = reverbShelfPrevInput3;";
            }
            effectsSource += "}";
            effectsFunction = new Function("Config", "Synth", effectsSource)(SynthConfig_1.Config, Synth);
            Synth.effectsFunctionCache[signature] = effectsFunction;
        }
        effectsFunction(synth, outputDataL, outputDataR, bufferIndex, runLength, instrumentState);
    };
    Synth.pulseWidthSynth = function (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) {
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var pulseFunction = Synth.pulseFunctionCache[instrumentState.unisonVoices];
        if (pulseFunction == undefined) {
            var pulseSource = "return (synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState) => {";
            pulseSource += "\n        const data = synth.tempMonoInstrumentSampleBuffer;\n\n        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n\n        let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                pulseSource += "let phaseDelta# = tone.phaseDeltas[#];\n            let phaseDeltaScale# = +tone.phaseDeltaScales[#];\n\n            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];\n            ".replaceAll("#", i + "");
            }
            for (var i = 0; i < voiceCount; i++) {
                pulseSource += "phase# = (tone.phases[#] - (tone.phases[#] | 0));\n            ".replaceAll("#", i + "");
            }
            pulseSource += "let pulseWidth = tone.pulseWidth;\n        const pulseWidthDelta = tone.pulseWidthDelta;\n\n        const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;\n\n        const stopIndex = bufferIndex + roundedSamplesPerTick;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n        ";
            for (var i = 0; i < voiceCount; i++) {
                pulseSource += "const sawPhaseA# = phase# - (phase# | 0);\n                const sawPhaseB# = (phase# + pulseWidth) - ((phase# + pulseWidth) | 0);\n                let pulseWave# = sawPhaseB# - sawPhaseA#;\n                if (!instrumentState.aliases) {\n                    if (sawPhaseA# < phaseDelta#) {\n                        var t = sawPhaseA# / phaseDelta#;\n                        pulseWave# += (t + t - t * t - 1) * 0.5;\n                    } else if (sawPhaseA# > 1.0 - phaseDelta#) {\n                        var t = (sawPhaseA# - 1.0) / phaseDelta#;\n                        pulseWave# += (t + t + t * t + 1) * 0.5;\n                    }\n                    if (sawPhaseB# < phaseDelta#) {\n                        var t = sawPhaseB# / phaseDelta#;\n                        pulseWave# -= (t + t - t * t - 1) * 0.5;\n                    } else if (sawPhaseB# > 1.0 - phaseDelta#) {\n                        var t = (sawPhaseB# - 1.0) / phaseDelta#;\n                        pulseWave# -= (t + t + t * t + 1) * 0.5;\n                    }\n                }\n\n                ".replaceAll("#", i + "");
            }
            var sampleList = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleList.push("pulseWave" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            pulseSource += "let inputSample = " + sampleList.join(" + ") + ";";
            pulseSource += "const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample;";
            for (var i = 0; i < voiceCount; i++) {
                pulseSource += "phase# += phaseDelta#;\n                phaseDelta# *= phaseDeltaScale#;\n                ".replaceAll("#", i + "");
            }
            pulseSource += "pulseWidth += pulseWidthDelta;\n\n            const output = sample * expression;\n            expression += expressionDelta;\n            data[sampleIndex] += output;\n        }";
            for (var i = 0; i < voiceCount; i++) {
                pulseSource += "tone.phases[#] = phase#;\n            tone.phaseDeltas[#] = phaseDelta#;\n                ".replaceAll("#", i + "");
            }
            pulseSource += "tone.expression = expression;\n        tone.pulseWidth = pulseWidth;\n\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n    }";
            pulseFunction = new Function("Config", "Synth", pulseSource)(SynthConfig_1.Config, Synth);
            Synth.pulseFunctionCache[instrumentState.unisonVoices] = pulseFunction;
        }
        pulseFunction(synth, bufferIndex, roundedSamplesPerTick, tone, instrumentState);
    };
    Synth.supersawSynth = function (synth, bufferIndex, runLength, tone, instrumentState) {
        var voiceCount = SynthConfig_1.Config.supersawVoiceCount | 0;
        var supersawFunction = Synth.supersawFunctionCache[0]; //currently only one supersaw function can exist in a given song / mod. Change to an array if you desire to support multiple by, for example, having unisons on supersaws
        if (supersawFunction == undefined) {
            var supersawSource = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";
            supersawSource += "\n        const data = synth.tempMonoInstrumentSampleBuffer;\n\n        let phaseDelta = tone.phaseDeltas[0];\n        const phaseDeltaScale = +tone.phaseDeltaScales[0];\n        let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                supersawSource += "\n                let phase# = tone.phases[#];\n                const unisonDetune# = tone.supersawUnisonDetunes[#];\n                ".replaceAll("#", i + "");
            }
            supersawSource += "\n        let dynamism = +tone.supersawDynamism;\n        const dynamismDelta = +tone.supersawDynamismDelta;\n        let shape = +tone.supersawShape;\n        const shapeDelta = +tone.supersawShapeDelta;\n        let delayLength = +tone.supersawDelayLength;\n        const delayLengthDelta = +tone.supersawDelayLengthDelta;\n        const delayLine = tone.supersawDelayLine;\n        const delayBufferMask = (delayLine.length - 1) >> 0;\n        let delayIndex = tone.supersawDelayIndex | 0;\n        delayIndex = (delayIndex & delayBufferMask) + delayLine.length;\n\n        const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;\n\n        const stopIndex = bufferIndex + runLength;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n            // The phase initially starts at a zero crossing so apply\n            // the delta before first sample to get a nonzero value.\n            phase0 = (phase0 + phaseDelta) - ((phase0 + phaseDelta) | 0);\n            let supersawSample = phase0 - 0.5 * (1.0 + (" + voiceCount + " - 1.0) * dynamism);\n            // This is a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. \n            if (!instrumentState.aliases) {\n                if (phase0 < phaseDelta) {\n                    var t = phase0 / phaseDelta;\n                    supersawSample -= (t + t - t * t - 1) * 0.5;\n                } else if (phase0 > 1.0 - phaseDelta) {\n                    var t = (phase0 - 1.0) / phaseDelta;\n                    supersawSample -= (t + t + t * t + 1) * 0.5;\n                }\n            }\n\n            if (!instrumentState.aliases) {\n            ";
            for (var i = 1; i < voiceCount; i++) {
                supersawSource += "\n                const detunedPhaseDelta# = phaseDelta * unisonDetune#;\n                // The phase initially starts at a zero crossing so apply\n                // the delta before first sample to get a nonzero value.\n                const aphase# = (phase# + detunedPhaseDelta#) - ((phase# + detunedPhaseDelta#) | 0);\n                supersawSample += aphase# * dynamism;\n\n                // This is a PolyBLEP, which smooths out discontinuities at any frequency to reduce aliasing. \n                if (aphase# < detunedPhaseDelta#) {\n                    const t = aphase# / detunedPhaseDelta#;\n                    supersawSample -= (t + t - t * t - 1) * 0.5 * dynamism;\n                } else if (aphase# > 1.0 - detunedPhaseDelta#) {\n                    const t = (aphase# - 1.0) / detunedPhaseDelta#;\n                    supersawSample -= (t + t + t * t + 1) * 0.5 * dynamism;\n                }\n                phase# = aphase#;\n                ".replaceAll("#", i + "");
            }
            supersawSource += "\n            } else {\n             ";
            for (var i = 1; i < voiceCount; i++) {
                supersawSource += "\n                const detunedPhaseDelta# = phaseDelta * unisonDetune#;\n                // The phase initially starts at a zero crossing so apply\n                // the delta before first sample to get a nonzero value.\n                phase# = (phase# + detunedPhaseDelta#) - ((phase# + detunedPhaseDelta#) | 0);\n                supersawSample += phase# * dynamism;\n                ".replaceAll("#", i + "");
            }
            supersawSource += "\n            }\n            delayLine[delayIndex & delayBufferMask] = supersawSample;\n            const delaySampleTime = delayIndex - delayLength;\n            const lowerIndex = delaySampleTime | 0;\n            const upperIndex = lowerIndex + 1;\n            const delayRatio = delaySampleTime - lowerIndex;\n            const prevDelaySample = delayLine[lowerIndex & delayBufferMask];\n            const nextDelaySample = delayLine[upperIndex & delayBufferMask];\n            const delaySample = prevDelaySample + (nextDelaySample - prevDelaySample) * delayRatio;\n            delayIndex++;\n\n            const inputSample = supersawSample - delaySample * shape;\n            const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample;\n\n            phaseDelta *= phaseDeltaScale;\n            dynamism += dynamismDelta;\n            shape += shapeDelta;\n            delayLength += delayLengthDelta;\n\n            const output = sample * expression;\n            expression += expressionDelta;\n\n            data[sampleIndex] += output;\n        }";
            for (var i = 0; i < voiceCount; i++) {
                supersawSource += "\n            tone.phases[#] = phase#;\n            ".replaceAll("#", i + "");
            }
            supersawSource += "\n        tone.phaseDeltas[0] = phaseDelta;\n        tone.expression = expression;\n        tone.supersawDynamism = dynamism;\n        tone.supersawShape = shape;\n        tone.supersawDelayLength = delayLength;\n        tone.supersawDelayIndex = delayIndex;\n\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n        }";
            supersawFunction = new Function("Config", "Synth", supersawSource)(SynthConfig_1.Config, Synth);
            Synth.supersawFunctionCache[0] = supersawFunction;
        }
        supersawFunction(synth, bufferIndex, runLength, tone, instrumentState);
    };
    Synth.noiseSynth = function (synth, bufferIndex, runLength, tone, instrumentState) {
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var noiseFunction = Synth.noiseFunctionCache[instrumentState.unisonVoices];
        if (noiseFunction == undefined) {
            var noiseSource = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";
            noiseSource += "\n        const data = synth.tempMonoInstrumentSampleBuffer;\n        const wave = instrumentState.wave;\n\n        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "\n            let phaseDelta# = tone.phaseDeltas[#];\n            let phaseDeltaScale# = +tone.phaseDeltaScales[#];\n            let noiseSample# = +tone.noiseSamples[#];\n            // This is for a \"legacy\" style simplified 1st order lowpass filter with\n            // a cutoff frequency that is relative to the tone's fundamental frequency.\n            const pitchRelativefilter# = Math.min(1.0, phaseDelta# * instrumentState.noisePitchFilterMult);\n            \n            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[#-1];\n            ".replaceAll("#", i + "");
            }
            noiseSource += "\n        let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n\n        const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;\n\n        const phaseMask = Config.spectrumNoiseLength - 1;\n\n        ";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * Config.chipNoiseLength;\n                ".replaceAll("#", i + "");
            }
            noiseSource += "let test = true;";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "\n            if (tone.phases[#] == 0.0) {\n                // Zero phase means the tone was reset, just give noise a random start phase instead.\n                phase# = Math.random() * Config.chipNoiseLength;\n                if (@ <= # && test && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {".replaceAll("#", i + "").replaceAll("@", voiceCount + "").replaceAll("~", tone.phases.length + "");
                for (var j = i + 1; j < tone.phases.length; j++) {
                    noiseSource += "phase~ = phase#;".replaceAll("#", i + "").replaceAll("~", j + "");
                }
                noiseSource += "\n                    test = false;\n                }\n            }";
            }
            noiseSource += "\n        const stopIndex = bufferIndex + runLength;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n            ";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "\n                let waveSample# = wave[phase# & phaseMask];\n\n                noiseSample# += (waveSample# - noiseSample#) * pitchRelativefilter#;\n                ".replaceAll("#", i + "");
            }
            var sampleList = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleList.push("noiseSample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            noiseSource += "let inputSample = " + sampleList.join(" + ") + ";";
            noiseSource += "const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample;";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "phase# += phaseDelta#;\n                phaseDelta# *= phaseDeltaScale#;\n                ".replaceAll("#", i + "");
            }
            noiseSource += "const output = sample * expression;\n            expression += expressionDelta;\n            data[sampleIndex] += output;\n        }";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "tone.phases[#] = phase# / ".replaceAll("#", i + "") + SynthConfig_1.Config.chipNoiseLength + ";\n            tone.phaseDeltas[#] = phaseDelta#;\n            ".replaceAll("#", i + "");
            }
            noiseSource += "tone.expression = expression;";
            for (var i = 0; i < voiceCount; i++) {
                noiseSource += "tone.noiseSamples[#] = noiseSample#;\n             ".replaceAll("#", i + "");
            }
            noiseSource += "\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n    }";
            noiseFunction = new Function("Config", "Synth", noiseSource)(SynthConfig_1.Config, Synth);
            ;
            Synth.noiseFunctionCache[instrumentState.unisonVoices] = noiseFunction;
        }
        noiseFunction(synth, bufferIndex, runLength, tone, instrumentState);
    };
    Synth.spectrumSynth = function (synth, bufferIndex, runLength, tone, instrumentState) {
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var spectrumFunction = Synth.spectrumFunctionCache[instrumentState.unisonVoices];
        if (spectrumFunction == undefined) {
            var spectrumSource = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";
            spectrumSource += "\n        const data = synth.tempMonoInstrumentSampleBuffer;\n        const wave = instrumentState.wave;\n        const samplesInPeriod = (1 << 7);\n\n        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                spectrumSource += "\n                if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[#-1];\n                let phaseDelta# = tone.phaseDeltas[#] * samplesInPeriod;\n                let phaseDeltaScale# = +tone.phaseDeltaScales[#];\n                let noiseSample# = +tone.noiseSamples[#];\n                // This is for a \"legacy\" style simplified 1st order lowpass filter with\n                // a cutoff frequency that is relative to the tone's fundamental frequency.\n                const pitchRelativefilter# = Math.min(1.0, phaseDelta#);\n                ".replaceAll("#", i + "");
            }
            spectrumSource += "\n        let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n\n        const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;\n\n        const phaseMask = Config.spectrumNoiseLength - 1;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                spectrumSource += "let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * Config.spectrumNoiseLength;\n                ".replaceAll("#", i + "");
            }
            spectrumSource += "\n            if (tone.phases[0] == 0.0) {\n                // Zero phase means the tone was reset, just give noise a random start phase instead.\n                phase0 = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta0;\n            ";
            for (var i = 1; i < voiceCount; i++) {
                spectrumSource += "\n                if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {\n                    phase# = phase0;\n                }\n            ".replaceAll("#", i + "");
            }
            spectrumSource += "}";
            for (var i = 1; i < voiceCount; i++) {
                spectrumSource += "\n                if (tone.phases[#] == 0.0 && !(instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval)) {\n                    // Zero phase means the tone was reset, just give noise a random start phase instead.\n                phase# = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta#;\n                }\n            ".replaceAll("#", i + "");
            }
            spectrumSource += "\n        const stopIndex = bufferIndex + runLength;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {";
            for (var i = 0; i < voiceCount; i++) {
                spectrumSource += "\n                const phase#Int = phase# | 0;\n                const index# = phase#Int & phaseMask;\n                let waveSample# = wave[index#]\n                const phase#Ratio = phase# - phase#Int;\n                waveSample# += (wave[index# + 1] - waveSample#) * phase#Ratio;\n\n                noiseSample# += (waveSample# - noiseSample#) * pitchRelativefilter#;\n                ".replaceAll("#", i + "");
            }
            var sampleList = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleList.push("noiseSample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            spectrumSource += "let inputSample = " + sampleList.join(" + ") + ";";
            spectrumSource += "const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample;";
            for (var i = 0; i < voiceCount; i++) {
                spectrumSource += "phase# += phaseDelta#;\n                phaseDelta# *= phaseDeltaScale#;\n                ".replaceAll("#", i + "");
            }
            spectrumSource += "const output = sample * expression;\n            expression += expressionDelta;\n            data[sampleIndex] += output;\n        }";
            for (var i = 0; i < voiceCount; i++) {
                spectrumSource += "tone.phases[#] = phase# / ".replaceAll("#", i + "") + SynthConfig_1.Config.spectrumNoiseLength + ";\n            tone.phaseDeltas[#] = phaseDelta# / samplesInPeriod;\n            ".replaceAll("#", i + "");
            }
            spectrumSource += "tone.expression = expression;";
            for (var i = 0; i < voiceCount; i++) {
                spectrumSource += "tone.noiseSamples[#] = noiseSample#;\n             ".replaceAll("#", i + "");
            }
            spectrumSource += "\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n    }";
            spectrumFunction = new Function("Config", "Synth", spectrumSource)(SynthConfig_1.Config, Synth);
            ;
            Synth.spectrumFunctionCache[instrumentState.unisonVoices] = spectrumFunction;
        }
        spectrumFunction(synth, bufferIndex, runLength, tone, instrumentState);
    };
    Synth.drumsetSynth = function (synth, bufferIndex, runLength, tone, instrumentState) {
        var voiceCount = Math.max(2, instrumentState.unisonVoices);
        var drumFunction = Synth.drumFunctionCache[instrumentState.unisonVoices];
        if (drumFunction == undefined) {
            var drumSource = "return (synth, bufferIndex, runLength, tone, instrumentState) => {";
            drumSource += "\n        const data = synth.tempMonoInstrumentSampleBuffer;\n        let wave = instrumentState.getDrumsetWave(tone.drumsetPitch);\n        const referenceDelta = InstrumentState.drumsetIndexReferenceDelta(tone.drumsetPitch);\n        const unisonSign = tone.specialIntervalExpressionMult * instrumentState.unisonSign;\n        ";
            for (var i = 0; i < voiceCount; i++) {
                drumSource += "let phaseDelta# = tone.phaseDeltas[#] / referenceDelta;\n            let phaseDeltaScale# = +tone.phaseDeltaScales[#];\n            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) tone.phases[#] = tone.phases[# - 1];\n            ".replaceAll("#", i + "");
            }
            drumSource += "let expression = +tone.expression;\n        const expressionDelta = +tone.expressionDelta;\n\n        const filters = tone.noteFilters;\n        const filterCount = tone.noteFilterCount | 0;\n        let initialFilterInput1 = +tone.initialNoteFilterInput1;\n        let initialFilterInput2 = +tone.initialNoteFilterInput2;\n        const applyFilters = Synth.applyFilters;";
            for (var i = 0; i < voiceCount; i++) {
                drumSource += "let phase# = (tone.phases[#] - (tone.phases[#] | 0)) * Config.spectrumNoiseLength;\n            ".replaceAll("#", i + "");
            }
            drumSource += "\n        if (tone.phases[0] == 0.0) {\n            // Zero phase means the tone was reset, just give noise a random start phase instead.\n            phase0 = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta0;\n        ";
            for (var i = 1; i < voiceCount; i++) {
                drumSource += "\n            if (instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval) {\n                phase# = phase0;\n            }\n        ".replaceAll("#", i + "");
            }
            drumSource += "}";
            for (var i = 1; i < voiceCount; i++) {
                drumSource += "\n            if (tone.phases[#] == 0.0 && !(instrumentState.unisonVoices <= # && instrumentState.unisonSpread == 0 && !instrumentState.chord.customInterval)) {\n                // Zero phase means the tone was reset, just give noise a random start phase instead.\n            phase# = Synth.findRandomZeroCrossing(wave, Config.spectrumNoiseLength) + phaseDelta#;\n            }\n        ".replaceAll("#", i + "");
            }
            drumSource += "const phaseMask = Config.spectrumNoiseLength - 1;\n\n        const stopIndex = bufferIndex + runLength;\n        for (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n        ";
            for (var i = 0; i < voiceCount; i++) {
                drumSource += "\n                const phase#Int = phase# | 0;\n                const index# = phase#Int & phaseMask;\n                let noiseSample# = wave[index#]\n                const phase#Ratio = phase# - phase#Int;\n                noiseSample# += (wave[index# + 1] - noiseSample#) * phase#Ratio;\n                ".replaceAll("#", i + "");
            }
            var sampleList = [];
            for (var voice = 0; voice < voiceCount; voice++) {
                sampleList.push("noiseSample" + voice + (voice != 0 ? " * unisonSign" : ""));
            }
            drumSource += "let inputSample = " + sampleList.join(" + ") + ";";
            drumSource += "const sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n            initialFilterInput2 = initialFilterInput1;\n            initialFilterInput1 = inputSample;";
            for (var i = 0; i < voiceCount; i++) {
                drumSource += "phase# += phaseDelta#;\n                phaseDelta# *= phaseDeltaScale#;\n                ".replaceAll("#", i + "");
            }
            drumSource += "const output = sample * expression;\n            expression += expressionDelta;\n            data[sampleIndex] += output;\n        }";
            for (var i = 0; i < voiceCount; i++) {
                drumSource += "tone.phases[#] = phase# / ".replaceAll("#", i + "") + SynthConfig_1.Config.spectrumNoiseLength + ";\n            tone.phaseDeltas[#] = phaseDelta# * referenceDelta;\n            ".replaceAll("#", i + "");
            }
            drumSource += "tone.expression = expression;\n        synth.sanitizeFilters(filters);\n        tone.initialNoteFilterInput1 = initialFilterInput1;\n        tone.initialNoteFilterInput2 = initialFilterInput2;\n    }";
            drumFunction = new Function("Config", "Synth", "InstrumentState", drumSource)(SynthConfig_1.Config, Synth, InstrumentState);
            ;
            Synth.drumFunctionCache[instrumentState.unisonVoices] = drumFunction;
        }
        drumFunction(synth, bufferIndex, runLength, tone, instrumentState);
    };
    Synth.modSynth = function (synth, stereoBufferIndex, roundedSamplesPerTick, tone, instrument) {
        // Note: present modulator value is tone.expressionStarts[0].
        if (!synth.song)
            return;
        var mod = SynthConfig_1.Config.modCount - 1 - tone.pitches[0];
        // Flagged as invalid because unused by current settings, skip
        if (instrument.invalidModulators[mod])
            return;
        var setting = instrument.modulators[mod];
        // Generate list of used instruments
        var usedInstruments = [];
        if (SynthConfig_1.Config.modulators[instrument.modulators[mod]].forSong) {
            // Instrument doesn't matter for song, just push a random index to run the modsynth once
            usedInstruments.push(0);
        }
        else {
            // All
            if (instrument.modInstruments[mod] == synth.song.channels[instrument.modChannels[mod]].instruments.length) {
                for (var i = 0; i < synth.song.channels[instrument.modChannels[mod]].instruments.length; i++) {
                    usedInstruments.push(i);
                }
            }
            // Active
            else if (instrument.modInstruments[mod] > synth.song.channels[instrument.modChannels[mod]].instruments.length) {
                if (synth.song.getPattern(instrument.modChannels[mod], synth.bar) != null)
                    usedInstruments = synth.song.getPattern(instrument.modChannels[mod], synth.bar).instruments;
            }
            else {
                usedInstruments.push(instrument.modInstruments[mod]);
            }
        }
        for (var instrumentIndex = 0; instrumentIndex < usedInstruments.length; instrumentIndex++) {
            synth.setModValue(tone.expression, tone.expression + tone.expressionDelta, instrument.modChannels[mod], usedInstruments[instrumentIndex], setting);
            // If mods are being held (for smoother playback while recording mods), use those values instead.
            for (var i = 0; i < synth.heldMods.length; i++) {
                if (SynthConfig_1.Config.modulators[instrument.modulators[mod]].forSong) {
                    if (synth.heldMods[i].setting == setting)
                        synth.setModValue(synth.heldMods[i].volume, synth.heldMods[i].volume, instrument.modChannels[mod], usedInstruments[instrumentIndex], setting);
                }
                else if (synth.heldMods[i].channelIndex == instrument.modChannels[mod] && synth.heldMods[i].instrumentIndex == usedInstruments[instrumentIndex] && synth.heldMods[i].setting == setting) {
                    synth.setModValue(synth.heldMods[i].volume, synth.heldMods[i].volume, instrument.modChannels[mod], usedInstruments[instrumentIndex], setting);
                }
            }
            // Reset arps, but only at the start of the note
            if (setting == SynthConfig_1.Config.modulators.dictionary["reset arp"].index && synth.tick == 0 && tone.noteStartPart == synth.beat * SynthConfig_1.Config.partsPerBeat + synth.part) {
                synth.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]].arpTime = 0;
            }
            // Reset envelope, but only at the start of the note
            else if (setting == SynthConfig_1.Config.modulators.dictionary["reset envelope"].index && synth.tick == 0 && tone.noteStartPart == synth.beat * SynthConfig_1.Config.partsPerBeat + synth.part) {
                var envelopeTarget = instrument.modEnvelopeNumbers[mod];
                var tgtInstrumentState = synth.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                var tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                if (tgtInstrument.envelopeCount > envelopeTarget) {
                    tgtInstrumentState.envelopeTime[envelopeTarget] = 0;
                }
            }
            // Denote next bar skip
            else if (setting == SynthConfig_1.Config.modulators.dictionary["next bar"].index) {
                synth.wantToSkip = true;
            }
            // do song eq filter first
            else if (setting == SynthConfig_1.Config.modulators.dictionary["song eq"].index) {
                var tgtSong = synth.song;
                var dotTarget = instrument.modFilterTypes[mod] | 0;
                if (dotTarget == 0) { // Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point
                    var pinIdx = 0;
                    var currentPart = synth.getTicksIntoBar() / SynthConfig_1.Config.ticksPerPart;
                    while (tone.note.start + tone.note.pins[pinIdx].time <= currentPart)
                        pinIdx++;
                    // 0 to 1 based on distance to next morph
                    //let lerpStartRatio: number = (currentPart - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);
                    var lerpEndRatio = ((currentPart - tone.note.start + (roundedSamplesPerTick / (synth.getSamplesPerTick() * SynthConfig_1.Config.ticksPerPart)) * SynthConfig_1.Config.ticksPerPart) - tone.note.pins[pinIdx - 1].time) / (tone.note.pins[pinIdx].time - tone.note.pins[pinIdx - 1].time);
                    // Compute the new settings to go to.
                    if (tgtSong.eqSubFilters[tone.note.pins[pinIdx - 1].size] != null || tgtSong.eqSubFilters[tone.note.pins[pinIdx].size] != null) {
                        tgtSong.tmpEqFilterEnd = FilterSettings.lerpFilters(tgtSong.eqSubFilters[tone.note.pins[pinIdx - 1].size], tgtSong.eqSubFilters[tone.note.pins[pinIdx].size], lerpEndRatio);
                    }
                    else {
                        // No mutation will occur to the filter object so we can safely return it without copying
                        tgtSong.tmpEqFilterEnd = tgtSong.eqFilter;
                    }
                } // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
                else {
                    // Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters
                    for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                        if (tgtSong.tmpEqFilterEnd == tgtSong.eqSubFilters[i] && tgtSong.tmpEqFilterEnd != null) {
                            tgtSong.tmpEqFilterEnd = new FilterSettings();
                            tgtSong.tmpEqFilterEnd.fromJsonObject(tgtSong.eqSubFilters[i].toJsonObject());
                        }
                    }
                    if (tgtSong.tmpEqFilterEnd == null) {
                        tgtSong.tmpEqFilterEnd = new FilterSettings();
                        tgtSong.tmpEqFilterEnd.fromJsonObject(tgtSong.eqFilter.toJsonObject());
                    }
                    if (tgtSong.tmpEqFilterEnd.controlPointCount > Math.floor((dotTarget - 1) / 2)) {
                        if (dotTarget % 2) { // X
                            tgtSong.tmpEqFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].freq = tone.expression + tone.expressionDelta;
                        }
                        else { // Y
                            tgtSong.tmpEqFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].gain = tone.expression + tone.expressionDelta;
                        }
                    }
                }
            }
            // Extra info for eq filter target needs to be set as well
            else if (setting == SynthConfig_1.Config.modulators.dictionary["eq filter"].index) {
                var tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                if (!tgtInstrument.eqFilterType) {
                    var dotTarget = instrument.modFilterTypes[mod] | 0;
                    if (dotTarget == 0) { // Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point
                        var pinIdx = 0;
                        var currentPart = synth.getTicksIntoBar() / SynthConfig_1.Config.ticksPerPart;
                        while (tone.note.start + tone.note.pins[pinIdx].time <= currentPart)
                            pinIdx++;
                        // 0 to 1 based on distance to next morph
                        //let lerpStartRatio: number = (currentPart - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);
                        var lerpEndRatio = ((currentPart - tone.note.start + (roundedSamplesPerTick / (synth.getSamplesPerTick() * SynthConfig_1.Config.ticksPerPart)) * SynthConfig_1.Config.ticksPerPart) - tone.note.pins[pinIdx - 1].time) / (tone.note.pins[pinIdx].time - tone.note.pins[pinIdx - 1].time);
                        // Compute the new settings to go to.
                        if (tgtInstrument.eqSubFilters[tone.note.pins[pinIdx - 1].size] != null || tgtInstrument.eqSubFilters[tone.note.pins[pinIdx].size] != null) {
                            tgtInstrument.tmpEqFilterEnd = FilterSettings.lerpFilters(tgtInstrument.eqSubFilters[tone.note.pins[pinIdx - 1].size], tgtInstrument.eqSubFilters[tone.note.pins[pinIdx].size], lerpEndRatio);
                        }
                        else {
                            // No mutation will occur to the filter object so we can safely return it without copying
                            tgtInstrument.tmpEqFilterEnd = tgtInstrument.eqFilter;
                        }
                    } // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
                    else {
                        // Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters
                        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                            if (tgtInstrument.tmpEqFilterEnd == tgtInstrument.eqSubFilters[i] && tgtInstrument.tmpEqFilterEnd != null) {
                                tgtInstrument.tmpEqFilterEnd = new FilterSettings();
                                tgtInstrument.tmpEqFilterEnd.fromJsonObject(tgtInstrument.eqSubFilters[i].toJsonObject());
                            }
                        }
                        if (tgtInstrument.tmpEqFilterEnd == null) {
                            tgtInstrument.tmpEqFilterEnd = new FilterSettings();
                            tgtInstrument.tmpEqFilterEnd.fromJsonObject(tgtInstrument.eqFilter.toJsonObject());
                        }
                        if (tgtInstrument.tmpEqFilterEnd.controlPointCount > Math.floor((dotTarget - 1) / 2)) {
                            if (dotTarget % 2) { // X
                                tgtInstrument.tmpEqFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].freq = tone.expression + tone.expressionDelta;
                            }
                            else { // Y
                                tgtInstrument.tmpEqFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].gain = tone.expression + tone.expressionDelta;
                            }
                        }
                    }
                }
            }
            // Extra info for note filter target needs to be set as well
            else if (setting == SynthConfig_1.Config.modulators.dictionary["note filter"].index) {
                var tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                if (!tgtInstrument.noteFilterType) {
                    var dotTarget = instrument.modFilterTypes[mod] | 0;
                    if (dotTarget == 0) { // Morph. Figure out the target filter's X/Y coords for this point. If no point exists with this index, or point types don't match, do lerp-out for this point and lerp-in of a new point
                        var pinIdx = 0;
                        var currentPart = synth.getTicksIntoBar() / SynthConfig_1.Config.ticksPerPart;
                        while (tone.note.start + tone.note.pins[pinIdx].time <= currentPart)
                            pinIdx++;
                        // 0 to 1 based on distance to next morph
                        //let lerpStartRatio: number = (currentPart - tone.note!.pins[pinIdx - 1].time) / (tone.note!.pins[pinIdx].time - tone.note!.pins[pinIdx - 1].time);
                        var lerpEndRatio = ((currentPart - tone.note.start + (roundedSamplesPerTick / (synth.getSamplesPerTick() * SynthConfig_1.Config.ticksPerPart)) * SynthConfig_1.Config.ticksPerPart) - tone.note.pins[pinIdx - 1].time) / (tone.note.pins[pinIdx].time - tone.note.pins[pinIdx - 1].time);
                        // Compute the new settings to go to.
                        if (tgtInstrument.noteSubFilters[tone.note.pins[pinIdx - 1].size] != null || tgtInstrument.noteSubFilters[tone.note.pins[pinIdx].size] != null) {
                            tgtInstrument.tmpNoteFilterEnd = FilterSettings.lerpFilters(tgtInstrument.noteSubFilters[tone.note.pins[pinIdx - 1].size], tgtInstrument.noteSubFilters[tone.note.pins[pinIdx].size], lerpEndRatio);
                        }
                        else {
                            // No mutation will occur to the filter object so we can safely return it without copying
                            tgtInstrument.tmpNoteFilterEnd = tgtInstrument.noteFilter;
                        }
                    } // Target (1 is dot 1 X, 2 is dot 1 Y, etc.)
                    else {
                        // Since we are directly manipulating the filter, make sure it is a new one and not an actual one of the instrument's filters
                        for (var i = 0; i < SynthConfig_1.Config.filterMorphCount; i++) {
                            if (tgtInstrument.tmpNoteFilterEnd == tgtInstrument.noteSubFilters[i] && tgtInstrument.tmpNoteFilterEnd != null) {
                                tgtInstrument.tmpNoteFilterEnd = new FilterSettings();
                                tgtInstrument.tmpNoteFilterEnd.fromJsonObject(tgtInstrument.noteSubFilters[i].toJsonObject());
                            }
                        }
                        if (tgtInstrument.tmpNoteFilterEnd == null) {
                            tgtInstrument.tmpNoteFilterEnd = new FilterSettings();
                            tgtInstrument.tmpNoteFilterEnd.fromJsonObject(tgtInstrument.noteFilter.toJsonObject());
                        }
                        if (tgtInstrument.tmpNoteFilterEnd.controlPointCount > Math.floor((dotTarget - 1) / 2)) {
                            if (dotTarget % 2) { // X
                                tgtInstrument.tmpNoteFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].freq = tone.expression + tone.expressionDelta;
                            }
                            else { // Y
                                tgtInstrument.tmpNoteFilterEnd.controlPoints[Math.floor((dotTarget - 1) / 2)].gain = tone.expression + tone.expressionDelta;
                            }
                        }
                    }
                }
            }
            else if (setting == SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index) {
                var tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                var envelopeTarget = instrument.modEnvelopeNumbers[mod];
                var speed = tone.expression + tone.expressionDelta;
                if (tgtInstrument.envelopeCount > envelopeTarget) {
                    if (Number.isInteger(speed)) {
                        tgtInstrument.envelopes[envelopeTarget].tempEnvelopeSpeed = SynthConfig_1.Config.perEnvelopeSpeedIndices[speed];
                    }
                    else {
                        //linear interpolation
                        speed = (1 - (speed % 1)) * SynthConfig_1.Config.perEnvelopeSpeedIndices[Math.floor(speed)] + (speed % 1) * SynthConfig_1.Config.perEnvelopeSpeedIndices[Math.ceil(speed)];
                        tgtInstrument.envelopes[envelopeTarget].tempEnvelopeSpeed = speed;
                    }
                }
            }
            else if (setting == SynthConfig_1.Config.modulators.dictionary["individual envelope lower bound"].index) {
                var tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                var envelopeTarget = instrument.modEnvelopeNumbers[mod];
                var bound = tone.expression + tone.expressionDelta;
                if (tgtInstrument.envelopeCount > envelopeTarget) {
                    tgtInstrument.envelopes[envelopeTarget].tempEnvelopeLowerBound = bound / 10;
                }
            }
            else if (setting == SynthConfig_1.Config.modulators.dictionary["individual envelope upper bound"].index) {
                var tgtInstrument = synth.song.channels[instrument.modChannels[mod]].instruments[usedInstruments[instrumentIndex]];
                var envelopeTarget = instrument.modEnvelopeNumbers[mod];
                var bound = tone.expression + tone.expressionDelta;
                if (tgtInstrument.envelopeCount > envelopeTarget) {
                    tgtInstrument.envelopes[envelopeTarget].tempEnvelopeUpperBound = bound / 10;
                }
            }
        }
    };
    Synth.findRandomZeroCrossing = function (wave, waveLength) {
        var phase = Math.random() * waveLength;
        var phaseMask = waveLength - 1;
        // Spectrum and drumset waves sounds best when they start at a zero crossing,
        // otherwise they pop. Try to find a zero crossing.
        var indexPrev = phase & phaseMask;
        var wavePrev = wave[indexPrev];
        var stride = 16;
        for (var attemptsRemaining = 128; attemptsRemaining > 0; attemptsRemaining--) {
            var indexNext = (indexPrev + stride) & phaseMask;
            var waveNext = wave[indexNext];
            if (wavePrev * waveNext <= 0.0) {
                // Found a zero crossing! Now let's narrow it down to two adjacent sample indices.
                for (var i = 0; i < stride; i++) {
                    var innerIndexNext = (indexPrev + 1) & phaseMask;
                    var innerWaveNext = wave[innerIndexNext];
                    if (wavePrev * innerWaveNext <= 0.0) {
                        // Found the zero crossing again! Now let's find the exact intersection.
                        var slope = innerWaveNext - wavePrev;
                        phase = indexPrev;
                        if (Math.abs(slope) > 0.00000001) {
                            phase += -wavePrev / slope;
                        }
                        phase = Math.max(0, phase) % waveLength;
                        break;
                    }
                    else {
                        indexPrev = innerIndexNext;
                        wavePrev = innerWaveNext;
                    }
                }
                break;
            }
            else {
                indexPrev = indexNext;
                wavePrev = waveNext;
            }
        }
        return phase;
    };
    Synth.instrumentVolumeToVolumeMult = function (instrumentVolume) {
        return (instrumentVolume == -SynthConfig_1.Config.volumeRange / 2.0) ? 0.0 : Math.pow(2, SynthConfig_1.Config.volumeLogScale * instrumentVolume);
    };
    Synth.volumeMultToInstrumentVolume = function (volumeMult) {
        return (volumeMult <= 0.0) ? -SynthConfig_1.Config.volumeRange / 2 : Math.min(SynthConfig_1.Config.volumeRange, (Math.log(volumeMult) / Math.LN2) / SynthConfig_1.Config.volumeLogScale);
    };
    Synth.noteSizeToVolumeMult = function (size) {
        return Math.pow(Math.max(0.0, size) / SynthConfig_1.Config.noteSizeMax, 1.5);
    };
    Synth.volumeMultToNoteSize = function (volumeMult) {
        return Math.pow(Math.max(0.0, volumeMult), 1 / 1.5) * SynthConfig_1.Config.noteSizeMax;
    };
    Synth.fadeInSettingToSeconds = function (setting) {
        return 0.0125 * (0.95 * setting + 0.05 * setting * setting);
    };
    Synth.secondsToFadeInSetting = function (seconds) {
        return clamp(0, SynthConfig_1.Config.fadeInRange, Math.round((-0.95 + Math.sqrt(0.9025 + 0.2 * seconds / 0.0125)) / 0.1));
    };
    Synth.fadeOutSettingToTicks = function (setting) {
        return SynthConfig_1.Config.fadeOutTicks[setting];
    };
    Synth.ticksToFadeOutSetting = function (ticks) {
        var lower = SynthConfig_1.Config.fadeOutTicks[0];
        if (ticks <= lower)
            return 0;
        for (var i = 1; i < SynthConfig_1.Config.fadeOutTicks.length; i++) {
            var upper = SynthConfig_1.Config.fadeOutTicks[i];
            if (ticks <= upper)
                return (ticks < (lower + upper) / 2) ? i - 1 : i;
            lower = upper;
        }
        return SynthConfig_1.Config.fadeOutTicks.length - 1;
    };
    // public static lerp(t: number, a: number, b: number): number {
    //     return a + (b - a) * t;
    // }
    // public static unlerp(x: number, a: number, b: number): number {
    //     return (x - a) / (b - a);
    // }
    Synth.detuneToCents = function (detune) {
        // BeepBox formula, for reference:
        // return detune * (Math.abs(detune) + 1) / 2;
        return detune - SynthConfig_1.Config.detuneCenter;
    };
    Synth.centsToDetune = function (cents) {
        // BeepBox formula, for reference:
        // return Math.sign(cents) * (Math.sqrt(1 + 8 * Math.abs(cents)) - 1) / 2.0;
        return cents + SynthConfig_1.Config.detuneCenter;
    };
    Synth.getOperatorWave = function (waveform, pulseWidth) {
        if (waveform != 2) {
            return SynthConfig_1.Config.operatorWaves[waveform];
        }
        else {
            return SynthConfig_1.Config.pwmOperatorWaves[pulseWidth];
        }
    };
    Synth.prototype.getSamplesPerTick = function () {
        if (this.song == null)
            return 0;
        var beatsPerMinute = this.song.getBeatsPerMinute();
        if (this.isModActive(SynthConfig_1.Config.modulators.dictionary["tempo"].index)) {
            beatsPerMinute = this.getModValue(SynthConfig_1.Config.modulators.dictionary["tempo"].index);
        }
        return this.getSamplesPerTickSpecificBPM(beatsPerMinute);
    };
    Synth.prototype.getSamplesPerTickSpecificBPM = function (beatsPerMinute) {
        var beatsPerSecond = beatsPerMinute / 60.0;
        var partsPerSecond = SynthConfig_1.Config.partsPerBeat * beatsPerSecond;
        var tickPerSecond = SynthConfig_1.Config.ticksPerPart * partsPerSecond;
        return this.samplesPerSecond / tickPerSecond;
    };
    Synth.fittingPowerOfTwo = function (x) {
        return 1 << (32 - Math.clz32(Math.ceil(x) - 1));
    };
    Synth.prototype.sanitizeFilters = function (filters) {
        var reset = false;
        for (var _i = 0, filters_1 = filters; _i < filters_1.length; _i++) {
            var filter = filters_1[_i];
            var output1 = Math.abs(filter.output1);
            var output2 = Math.abs(filter.output2);
            // If either is a large value, Infinity, or NaN, then just reset all filter history.
            if (!(output1 < 100) || !(output2 < 100)) {
                reset = true;
                break;
            }
            if (output1 < epsilon)
                filter.output1 = 0.0;
            if (output2 < epsilon)
                filter.output2 = 0.0;
        }
        if (reset) {
            for (var _a = 0, filters_2 = filters; _a < filters_2.length; _a++) {
                var filter = filters_2[_a];
                filter.output1 = 0.0;
                filter.output2 = 0.0;
            }
        }
    };
    Synth.sanitizeDelayLine = function (delayLine, lastIndex, mask) {
        while (true) {
            lastIndex--;
            var index = lastIndex & mask;
            var sample = Math.abs(delayLine[index]);
            if (Number.isFinite(sample) && (sample == 0.0 || sample >= epsilon))
                break;
            delayLine[index] = 0.0;
        }
    };
    Synth.applyFilters = function (sample, input1, input2, filterCount, filters) {
        for (var i = 0; i < filterCount; i++) {
            var filter = filters[i];
            var output1 = filter.output1;
            var output2 = filter.output2;
            var a1 = filter.a1;
            var a2 = filter.a2;
            var b0 = filter.b0;
            var b1 = filter.b1;
            var b2 = filter.b2;
            sample = b0 * sample + b1 * input1 + b2 * input2 - a1 * output1 - a2 * output2;
            filter.a1 = a1 + filter.a1Delta;
            filter.a2 = a2 + filter.a2Delta;
            if (filter.useMultiplicativeInputCoefficients) {
                filter.b0 = b0 * filter.b0Delta;
                filter.b1 = b1 * filter.b1Delta;
                filter.b2 = b2 * filter.b2Delta;
            }
            else {
                filter.b0 = b0 + filter.b0Delta;
                filter.b1 = b1 + filter.b1Delta;
                filter.b2 = b2 + filter.b2Delta;
            }
            filter.output2 = output1;
            filter.output1 = sample;
            // Updating the input values is waste if the next filter doesn't exist...
            input2 = output2;
            input1 = output1;
        }
        return sample;
    };
    Synth.prototype.computeTicksSinceStart = function (ofBar) {
        var _a, _b;
        if (ofBar === void 0) { ofBar = false; }
        var beatsPerBar = ((_a = this.song) === null || _a === void 0 ? void 0 : _a.beatsPerBar) ? (_b = this.song) === null || _b === void 0 ? void 0 : _b.beatsPerBar : 8;
        if (ofBar) {
            return SynthConfig_1.Config.ticksPerPart * SynthConfig_1.Config.partsPerBeat * beatsPerBar * this.bar;
        }
        else {
            return this.tick + SynthConfig_1.Config.ticksPerPart * (this.part + SynthConfig_1.Config.partsPerBeat * (this.beat + beatsPerBar * this.bar));
        }
    };
    Synth.tempFilterStartCoefficients = new filtering_1.FilterCoefficients();
    Synth.tempFilterEndCoefficients = new filtering_1.FilterCoefficients();
    Synth.fmSynthFunctionCache = {};
    Synth.fm6SynthFunctionCache = {};
    Synth.effectsFunctionCache = Array(1 << 7).fill(undefined); // keep in sync with the number of post-process effects.
    Synth.pickedStringFunctionCache = Array(3).fill(undefined); // keep in sync with the number of unison voices.
    Synth.spectrumFunctionCache = [];
    Synth.noiseFunctionCache = [];
    Synth.drumFunctionCache = [];
    Synth.chipFunctionCache = [];
    Synth.pulseFunctionCache = [];
    Synth.supersawFunctionCache = [];
    Synth.harmonicsFunctionCache = [];
    Synth.loopableChipFunctionCache = Array(SynthConfig_1.Config.unisonVoicesMax + 1).fill(undefined); //For loopable chips, we have a matrix where the rows represent voices and the columns represent loop types
    Synth.fmSourceTemplate = ("\n\t\tconst data = synth.tempMonoInstrumentSampleBuffer;\n\t\tconst sineWave = Config.sineWave;\n\t\t\t\n\t\t// I'm adding 1000 to the phase to ensure that it's never negative even when modulated by other waves because negative numbers don't work with the modulus operator very well.\n\t\tlet operator#Phase       = +((tone.phases[#] - (tone.phases[#] | 0)) + 1000) * " + SynthConfig_1.Config.sineWaveLength + ";\n\t\tlet operator#PhaseDelta  = +tone.phaseDeltas[#] * " + SynthConfig_1.Config.sineWaveLength + ";\n\t\tlet operator#PhaseDeltaScale = +tone.phaseDeltaScales[#];\n\t\tlet operator#OutputMult  = +tone.operatorExpressions[#];\n\t\tconst operator#OutputDelta = +tone.operatorExpressionDeltas[#];\n\t\tlet operator#Output      = +tone.feedbackOutputs[#];\n        const operator#Wave      = tone.operatorWaves[#].samples;\n\t\tlet feedbackMult         = +tone.feedbackMult;\n\t\tconst feedbackDelta        = +tone.feedbackDelta;\n        let expression = +tone.expression;\n\t\tconst expressionDelta = +tone.expressionDelta;\n\t\t\n\t\tconst filters = tone.noteFilters;\n\t\tconst filterCount = tone.noteFilterCount|0;\n\t\tlet initialFilterInput1 = +tone.initialNoteFilterInput1;\n\t\tlet initialFilterInput2 = +tone.initialNoteFilterInput2;\n\t\tconst applyFilters = Synth.applyFilters;\n\t\t\n\t\tconst stopIndex = bufferIndex + roundedSamplesPerTick;\n\t\tfor (let sampleIndex = bufferIndex; sampleIndex < stopIndex; sampleIndex++) {\n\t\t\t\t// INSERT OPERATOR COMPUTATION HERE\n\t\t\t\tconst fmOutput = (/*operator#Scaled*/); // CARRIER OUTPUTS\n\t\t\t\t\n\t\t\tconst inputSample = fmOutput;\n\t\t\tconst sample = applyFilters(inputSample, initialFilterInput1, initialFilterInput2, filterCount, filters);\n\t\t\tinitialFilterInput2 = initialFilterInput1;\n\t\t\tinitialFilterInput1 = inputSample;\n\t\t\t\t\n\t\t\t\tfeedbackMult += feedbackDelta;\n\t\t\t\toperator#OutputMult += operator#OutputDelta;\n\t\t\t\toperator#Phase += operator#PhaseDelta;\n\t\t\toperator#PhaseDelta *= operator#PhaseDeltaScale;\n\t\t\t\n\t\t\tconst output = sample * expression;\n\t\t\texpression += expressionDelta;\n\n\t\t\tdata[sampleIndex] += output;\n\t\t\t}\n\t\t\t\n\t\t\ttone.phases[#] = operator#Phase / " + SynthConfig_1.Config.sineWaveLength + ";\n\t\t\ttone.phaseDeltas[#] = operator#PhaseDelta / " + SynthConfig_1.Config.sineWaveLength + ";\n\t\t\ttone.operatorExpressions[#] = operator#OutputMult;\n\t\t    tone.feedbackOutputs[#] = operator#Output;\n\t\t    tone.feedbackMult = feedbackMult;\n\t\t    tone.expression = expression;\n\t\t\t\n\t\tsynth.sanitizeFilters(filters);\n\t\ttone.initialNoteFilterInput1 = initialFilterInput1;\n\t\ttone.initialNoteFilterInput2 = initialFilterInput2;\n\t\t").split("\n");
    Synth.operatorSourceTemplate = ("\n\t\t\t\tconst operator#PhaseMix = operator#Phase/* + operator@Scaled*/;\n\t\t\t\tconst operator#PhaseInt = operator#PhaseMix|0;\n\t\t\t\tconst operator#Index    = operator#PhaseInt & " + SynthConfig_1.Config.sineWaveMask + ";\n                const operator#Sample   = operator#Wave[operator#Index];\n                operator#Output         = operator#Sample + (operator#Wave[operator#Index + 1] - operator#Sample) * (operator#PhaseMix - operator#PhaseInt);\n\t\t\t\tconst operator#Scaled   = operator#OutputMult * operator#Output;\n\t\t").split("\n");
    return Synth;
}());
exports.Synth = Synth;
