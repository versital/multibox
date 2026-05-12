"use strict";
// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongEditor = void 0;
//import {Layout} from "./Layout";
var SynthConfig_1 = require("../synth/SynthConfig");
var BarScrollBar_1 = require("./BarScrollBar");
var BeatsPerBarPrompt_1 = require("./BeatsPerBarPrompt");
var Change_1 = require("./Change");
var ChannelSettingsPrompt_1 = require("./ChannelSettingsPrompt");
var ColorConfig_1 = require("./ColorConfig");
var CustomChipPrompt_1 = require("./CustomChipPrompt");
var CustomFilterPrompt_1 = require("./CustomFilterPrompt");
var InstrumentExportPrompt_1 = require("./InstrumentExportPrompt");
var InstrumentImportPrompt_1 = require("./InstrumentImportPrompt");
var EditorConfig_1 = require("./EditorConfig");
var EuclidgenRhythmPrompt_1 = require("./EuclidgenRhythmPrompt");
var ExportPrompt_1 = require("./ExportPrompt");
require("./Layout"); // Imported here for the sake of ensuring this code is transpiled early.
var synth_1 = require("../synth/synth");
var elements_strict_1 = require("imperative-html/dist/esm/elements-strict");
var HarmonicsEditor_1 = require("./HarmonicsEditor");
var HTMLWrapper_1 = require("./HTMLWrapper");
var ImportPrompt_1 = require("./ImportPrompt");
var ChannelRow_1 = require("./ChannelRow");
var LayoutPrompt_1 = require("./LayoutPrompt");
var EnvelopeEditor_1 = require("./EnvelopeEditor");
var FadeInOutEditor_1 = require("./FadeInOutEditor");
var FilterEditor_1 = require("./FilterEditor");
var LimiterPrompt_1 = require("./LimiterPrompt");
var CustomScalePrompt_1 = require("./CustomScalePrompt");
var LoopEditor_1 = require("./LoopEditor");
var MoveNotesSidewaysPrompt_1 = require("./MoveNotesSidewaysPrompt");
var MuteEditor_1 = require("./MuteEditor");
var OctaveScrollBar_1 = require("./OctaveScrollBar");
var MidiInput_1 = require("./MidiInput");
var KeyboardLayout_1 = require("./KeyboardLayout");
var PatternEditor_1 = require("./PatternEditor");
var Piano_1 = require("./Piano");
var SongDocument_1 = require("./SongDocument");
var SongDurationPrompt_1 = require("./SongDurationPrompt");
var SustainPrompt_1 = require("./SustainPrompt");
var SongRecoveryPrompt_1 = require("./SongRecoveryPrompt");
var RecordingSetupPrompt_1 = require("./RecordingSetupPrompt");
var SpectrumEditor_1 = require("./SpectrumEditor");
var CustomThemePrompt_1 = require("./CustomThemePrompt");
var ThemePrompt_1 = require("./ThemePrompt");
var TipPrompt_1 = require("./TipPrompt");
var changes_1 = require("./changes");
var TrackEditor_1 = require("./TrackEditor");
var Oscilloscope_1 = require("../global/Oscilloscope");
var VisualLoopControlsPrompt_1 = require("./VisualLoopControlsPrompt");
var SampleLoadingStatusPrompt_1 = require("./SampleLoadingStatusPrompt");
var AddSamplesPrompt_1 = require("./AddSamplesPrompt");
var ShortenerConfigPrompt_1 = require("./ShortenerConfigPrompt");
var MultiplayerPrompt_1 = require("./MultiplayerPrompt");
var button = elements_strict_1.HTML.button, div = elements_strict_1.HTML.div, input = elements_strict_1.HTML.input, select = elements_strict_1.HTML.select, span = elements_strict_1.HTML.span, optgroup = elements_strict_1.HTML.optgroup, option = elements_strict_1.HTML.option, canvas = elements_strict_1.HTML.canvas;
function buildOptions(menu, items) {
    for (var index = 0; index < items.length; index++) {
        menu.appendChild(option({ value: index }, items[index]));
    }
    return menu;
}
// Similar to the above, but adds a non-interactive header to the list.
// @jummbus: Honestly not necessary with new HTML options interface, but not exactly necessary to change either!
function buildHeaderedOptions(header, menu, items) {
    menu.appendChild(option({ selected: true, disabled: true, value: header }, header));
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        menu.appendChild(option({ value: item }, item));
    }
    return menu;
}
function buildPresetOptions(isNoise, idSet) {
    var menu = select({ id: idSet, class: "presetSelect" });
    // Show the "spectrum" custom type in both pitched and noise channels.
    //const customTypeGroup: HTMLElement = optgroup({label: EditorConfig.presetCategories[0].name});
    if (isNoise) {
        menu.appendChild(option({ value: 2 /* InstrumentType.noise */ }, EditorConfig_1.EditorConfig.valueToPreset(2 /* InstrumentType.noise */).name));
        menu.appendChild(option({ value: 3 /* InstrumentType.spectrum */ }, EditorConfig_1.EditorConfig.valueToPreset(3 /* InstrumentType.spectrum */).name));
        menu.appendChild(option({ value: 4 /* InstrumentType.drumset */ }, EditorConfig_1.EditorConfig.valueToPreset(4 /* InstrumentType.drumset */).name));
    }
    else {
        menu.appendChild(option({ value: 0 /* InstrumentType.chip */ }, EditorConfig_1.EditorConfig.valueToPreset(0 /* InstrumentType.chip */).name));
        menu.appendChild(option({ value: 9 /* InstrumentType.customChipWave */ }, EditorConfig_1.EditorConfig.valueToPreset(9 /* InstrumentType.customChipWave */).name));
        menu.appendChild(option({ value: 6 /* InstrumentType.pwm */ }, EditorConfig_1.EditorConfig.valueToPreset(6 /* InstrumentType.pwm */).name));
        menu.appendChild(option({ value: 8 /* InstrumentType.supersaw */ }, EditorConfig_1.EditorConfig.valueToPreset(8 /* InstrumentType.supersaw */).name));
        menu.appendChild(option({ value: 1 /* InstrumentType.fm */ }, EditorConfig_1.EditorConfig.valueToPreset(1 /* InstrumentType.fm */).name));
        menu.appendChild(option({ value: 11 /* InstrumentType.fm6op */ }, EditorConfig_1.EditorConfig.instrumentToPreset(11 /* InstrumentType.fm6op */).name));
        menu.appendChild(option({ value: 5 /* InstrumentType.harmonics */ }, EditorConfig_1.EditorConfig.valueToPreset(5 /* InstrumentType.harmonics */).name));
        menu.appendChild(option({ value: 7 /* InstrumentType.pickedString */ }, EditorConfig_1.EditorConfig.valueToPreset(7 /* InstrumentType.pickedString */).name));
        menu.appendChild(option({ value: 3 /* InstrumentType.spectrum */ }, EditorConfig_1.EditorConfig.valueToPreset(3 /* InstrumentType.spectrum */).name));
        menu.appendChild(option({ value: 2 /* InstrumentType.noise */ }, EditorConfig_1.EditorConfig.valueToPreset(2 /* InstrumentType.noise */).name));
    }
    // TODO - When you port over the Dogebox2 import/export buttons be sure to uncomment these
    var randomGroup = optgroup({ label: "Randomize ▾" });
    // const randomGroup: HTMLElement = optgroup({ label: "▾ Randomize" });
    randomGroup.appendChild(option({ value: "randomPreset" }, "Random Preset (R)"));
    randomGroup.appendChild(option({ value: "randomGenerated" }, "Random Generated (Shift + R)"));
    menu.appendChild(randomGroup);
    var firstCategoryGroup = null;
    var customSampleCategoryGroup = null;
    for (var categoryIndex = 1; categoryIndex < EditorConfig_1.EditorConfig.presetCategories.length; categoryIndex++) {
        var category = EditorConfig_1.EditorConfig.presetCategories[categoryIndex];
        var group = optgroup({ label: category.name + " ▾" });
        // const group: HTMLElement = optgroup({ label: "▾ " + category.name });
        var foundAny = false;
        for (var presetIndex = 0; presetIndex < category.presets.length; presetIndex++) {
            var preset = category.presets[presetIndex];
            if (((preset.isNoise == true) == isNoise)) {
                group.appendChild(option({ value: (categoryIndex << 12) + presetIndex }, preset.name));
                foundAny = true;
            }
        }
        if (categoryIndex === 1 && foundAny) {
            firstCategoryGroup = group;
        }
        else if (category.name === "Custom Sample Presets" && foundAny) {
            customSampleCategoryGroup = group;
        }
        // Need to re-sort some elements for readability. Can't just do this in the menu, because indices are saved in URLs and would get broken if the ordering actually changed.
        if (category.name == "String Presets" && foundAny) {
            // Put violin 2 after violin 1
            var moveViolin2 = group.removeChild(group.children[11]);
            group.insertBefore(moveViolin2, group.children[1]);
        }
        if (category.name == "Flute Presets" && foundAny) {
            // Put flute 2 after flute 1
            var moveFlute2 = group.removeChild(group.children[11]);
            group.insertBefore(moveFlute2, group.children[1]);
        }
        if (category.name == "Keyboard Presets" && foundAny) {
            // Put grand piano 2 and 3 after grand piano 1
            var moveGrandPiano2 = group.removeChild(group.children[9]);
            var moveGrandPiano3 = group.removeChild(group.children[9]);
            group.insertBefore(moveGrandPiano3, group.children[1]);
            group.insertBefore(moveGrandPiano2, group.children[1]);
        }
        if (foundAny)
            menu.appendChild(group);
    }
    if (firstCategoryGroup != null && customSampleCategoryGroup != null) {
        // Put the custom sample presets at the top.
        var parent_1 = customSampleCategoryGroup.parentNode;
        parent_1.removeChild(customSampleCategoryGroup);
        parent_1.insertBefore(customSampleCategoryGroup, firstCategoryGroup);
    }
    return menu;
}
function setSelectedValue(menu, value, isSelect2) {
    if (isSelect2 === void 0) { isSelect2 = false; }
    var stringValue = value.toString();
    if (menu.value != stringValue) {
        menu.value = stringValue;
        // Change select2 value, if this select is a member of that class.
        if (isSelect2) {
            $(menu).val(value).trigger('change.select2');
        }
    }
}
var CustomChipCanvas = /** @class */ (function () {
    function CustomChipCanvas(canvas, _doc, _getChange) {
        var _this = this;
        this.canvas = canvas;
        this._doc = _doc;
        this._getChange = _getChange;
        this._change = null;
        this._onMouseMove = function (event) {
            if (_this.mouseDown) {
                var x = (event.clientX || event.pageX) - _this.canvas.getBoundingClientRect().left;
                var y = Math.floor((event.clientY || event.pageY) - _this.canvas.getBoundingClientRect().top);
                if (y < 2)
                    y = 2;
                if (y > 50)
                    y = 50;
                var ctx = _this.canvas.getContext("2d");
                if (_this.continuousEdit == true && Math.abs(_this.lastX - x) < 40) {
                    var lowerBound = (x < _this.lastX) ? x : _this.lastX;
                    var upperBound = (x < _this.lastX) ? _this.lastX : x;
                    for (var i = lowerBound; i <= upperBound; i += 2) {
                        var progress = (Math.abs(x - _this.lastX) > 2.0) ? ((x > _this.lastX) ?
                            1.0 - ((i - lowerBound) / (upperBound - lowerBound))
                            : ((i - lowerBound) / (upperBound - lowerBound))) : 0.0;
                        var j = Math.round(y + (_this.lastY - y) * progress);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
                        ctx.fillRect(Math.floor(i / 2) * 2, 0, 2, 53);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--ui-widget-background");
                        ctx.fillRect(Math.floor(i / 2) * 2, 25, 2, 2);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                        ctx.fillRect(Math.floor(i / 2) * 2, 13, 2, 1);
                        ctx.fillRect(Math.floor(i / 2) * 2, 39, 2, 1);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputedChannelColor(_this._doc.song, _this._doc.channel).primaryNote;
                        ctx.fillRect(Math.floor(i / 2) * 2, j - 2, 2, 4);
                        // Actually update current instrument's custom waveform
                        _this.newArray[Math.floor(i / 2)] = (j - 26);
                    }
                }
                else {
                    ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
                    ctx.fillRect(Math.floor(x / 2) * 2, 0, 2, 52);
                    ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--ui-widget-background");
                    ctx.fillRect(Math.floor(x / 2) * 2, 25, 2, 2);
                    ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                    ctx.fillRect(Math.floor(x / 2) * 2, 13, 2, 1);
                    ctx.fillRect(Math.floor(x / 2) * 2, 39, 2, 1);
                    ctx.fillStyle = ColorConfig_1.ColorConfig.getComputedChannelColor(_this._doc.song, _this._doc.channel).primaryNote;
                    ctx.fillRect(Math.floor(x / 2) * 2, y - 2, 2, 4);
                    // Actually update current instrument's custom waveform
                    _this.newArray[Math.floor(x / 2)] = (y - 26);
                }
                _this.continuousEdit = true;
                _this.lastX = x;
                _this.lastY = y;
                // Preview - update integral used for sound synthesis based on new array, not actual stored array. When mouse is released, real update will happen.
                var instrument = _this._doc.song.channels[_this._doc.channel].instruments[_this._doc.getCurrentInstrument()];
                var sum = 0.0;
                for (var i = 0; i < _this.newArray.length; i++) {
                    sum += _this.newArray[i];
                }
                var average = sum / _this.newArray.length;
                // Perform the integral on the wave. The chipSynth will perform the derivative to get the original wave back but with antialiasing.
                var cumulative = 0;
                var wavePrev = 0;
                for (var i = 0; i < _this.newArray.length; i++) {
                    cumulative += wavePrev;
                    wavePrev = _this.newArray[i] - average;
                    instrument.customChipWaveIntegral[i] = cumulative;
                }
                instrument.customChipWaveIntegral[64] = 0.0;
            }
        };
        this._onMouseDown = function (event) {
            _this.mouseDown = true;
            // Allow single-click edit
            _this._onMouseMove(event);
        };
        this._onMouseUp = function () {
            _this.mouseDown = false;
            _this.continuousEdit = false;
            _this._whenChange();
        };
        this._whenChange = function () {
            _this._change = _this._getChange(_this.newArray);
            _this._doc.record(_this._change);
            _this._change = null;
        };
        canvas.addEventListener("mousemove", this._onMouseMove);
        canvas.addEventListener("mousedown", this._onMouseDown);
        canvas.addEventListener("mouseup", this._onMouseUp);
        canvas.addEventListener("mouseleave", this._onMouseUp);
        this.mouseDown = false;
        this.continuousEdit = false;
        this.lastX = 0;
        this.lastY = 0;
        this.newArray = new Float32Array(64);
        this.renderedArray = new Float32Array(64);
        this.renderedColor = "";
        // Init waveform
        this.redrawCanvas();
    }
    CustomChipCanvas.prototype.redrawCanvas = function () {
        var chipData = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customChipWave;
        var renderColor = ColorConfig_1.ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
        // Check if the data has changed from the last render.
        var needsRedraw = false;
        if (renderColor != this.renderedColor) {
            needsRedraw = true;
        }
        else
            for (var i = 0; i < 64; i++) {
                if (chipData[i] != this.renderedArray[i]) {
                    needsRedraw = true;
                    i = 64;
                }
            }
        if (!needsRedraw) {
            return;
        }
        this.renderedArray.set(chipData);
        var ctx = this.canvas.getContext("2d");
        // Black BG
        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, 128, 52);
        // Mid-bar
        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--ui-widget-background");
        ctx.fillRect(0, 25, 128, 2);
        // 25-75 bars
        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--track-editor-bg-pitch-dim");
        ctx.fillRect(0, 13, 128, 1);
        ctx.fillRect(0, 39, 128, 1);
        // Waveform
        ctx.fillStyle = renderColor;
        for (var x = 0; x < 64; x++) {
            var y = chipData[x] + 26;
            ctx.fillRect(x * 2, y - 2, 2, 4);
            this.newArray[x] = y - 26;
        }
    };
    return CustomChipCanvas;
}());
var CustomAlgorythmCanvas = /** @class */ (function () {
    function CustomAlgorythmCanvas(canvas, _doc, _getChange) {
        var _this = this;
        this.canvas = canvas;
        this._doc = _doc;
        this._getChange = _getChange;
        this._change = null;
        this._onMouseMove = function (event) {
            var _a, _b, _c, _d;
            if (_this.mouseDown) { //todo rework to handle draging and single clicks differently
                var x = (event.clientX || event.pageX) - _this.canvas.getBoundingClientRect().left;
                var y = Math.floor((event.clientY || event.pageY) - _this.canvas.getBoundingClientRect().top);
                var ctx = _this.canvas.getContext("2d");
                ctx.fillStyle = ColorConfig_1.ColorConfig.getComputedChannelColor(_this._doc.song, _this._doc.channel).primaryNote;
                var yindex = Math.ceil(y / 12);
                var xindex = Math.ceil(x / 12);
                yindex = (yindex / 2) - Math.floor(yindex / 2) >= 0.5 ? Math.floor(yindex / 2) : -1;
                xindex = (xindex / 2) + 0.5 - Math.floor(xindex / 2) <= 0.5 ? Math.floor(xindex / 2) - 1 : -1;
                yindex = yindex >= 0 && yindex <= 5 ? yindex : -1;
                xindex = xindex >= 0 && xindex <= 5 ? xindex : -1;
                ctx.fillRect(xindex * 24 + 12, yindex * 24, 2, 2);
                if (_this.selected == -1) {
                    if (((_b = (_a = _this.drawArray) === null || _a === void 0 ? void 0 : _a[yindex]) === null || _b === void 0 ? void 0 : _b[xindex]) != undefined) {
                        _this.selected = _this.drawArray[yindex][xindex];
                        ctx.fillRect(xindex * 24 + 12, yindex * 24, 12, 12);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
                        ctx.fillText(_this.drawArray[yindex][xindex] + "", xindex * 24 + 14, yindex * 24 + 10);
                        _this.mouseDown = false;
                    }
                }
                else {
                    if (((_d = (_c = _this.drawArray) === null || _c === void 0 ? void 0 : _c[yindex]) === null || _d === void 0 ? void 0 : _d[xindex]) != undefined) {
                        if (_this.mode == "feedback") {
                            var newmod = _this.drawArray[yindex][xindex];
                            var check = _this.feedback[newmod - 1].indexOf(_this.selected);
                            if (check != -1) {
                                _this.feedback[newmod - 1].splice(check, 1);
                            }
                            else {
                                _this.feedback[newmod - 1].push(_this.selected);
                            }
                        }
                        else {
                            if (_this.drawArray[yindex][xindex] == _this.selected) {
                                if (_this.selected == _this.carriers) {
                                    if (_this.selected > 1) {
                                        _this.carriers--;
                                    }
                                }
                                else if (_this.selected - 1 == _this.carriers) {
                                    _this.carriers++;
                                }
                            }
                            else {
                                var newmod = _this.drawArray[yindex][xindex];
                                if (_this.selected > newmod) { //todo try to rebalence then do this in algorithm mode otherwise input as needed
                                    var check = _this.newMods[newmod - 1].indexOf(_this.selected);
                                    if (check != -1) {
                                        _this.newMods[newmod - 1].splice(check, 1);
                                    }
                                    else {
                                        _this.newMods[newmod - 1].push(_this.selected);
                                    }
                                }
                                else {
                                    var check = _this.newMods[_this.selected - 1].indexOf(newmod);
                                    if (check != -1) {
                                        _this.newMods[_this.selected - 1].splice(check, 1);
                                    }
                                    else {
                                        _this.newMods[_this.selected - 1].push(newmod);
                                    }
                                }
                            }
                        }
                        _this.selected = -1;
                        _this.redrawCanvas(true);
                        _this.mouseDown = false;
                    }
                    else {
                        _this.selected = -1;
                        _this.redrawCanvas(true);
                        _this.mouseDown = false;
                    }
                }
            }
        };
        this._onMouseDown = function (event) {
            _this.mouseDown = true;
            // Allow single-click edit
            _this._onMouseMove(event);
        };
        this._onMouseUp = function () {
            _this.mouseDown = false;
            //this.continuousEdit = false;
            _this._whenChange();
        };
        this._whenChange = function () {
            _this._change = _this._getChange(_this.mode == "algorithm" ? _this.newMods : _this.feedback, _this.carriers, _this.mode);
            _this._doc.record(_this._change);
            _this._change = null;
        };
        //canvas.addEventListener("input", this._whenInput);
        //canvas.addEventListener("change", this._whenChange);
        canvas.addEventListener("mousemove", this._onMouseMove);
        canvas.addEventListener("mousedown", this._onMouseDown);
        canvas.addEventListener("mouseup", this._onMouseUp);
        canvas.addEventListener("mouseleave", this._onMouseUp);
        this.mouseDown = false;
        //this.continuousEdit = false;
        //this.lastX = 0;
        //this.lastY = 0;
        this.drawArray = [[], [], [], [], [], []];
        this.lookUpArray = [[], [], [], [], [], []];
        this.carriers = 1;
        this.selected = -1;
        this.newMods = [[], [], [], [], [], []];
        this.inverseModulation = [[], [], [], [], [], []];
        this.feedback = [[], [], [], [], [], []];
        this.inverseFeedback = [[], [], [], [], [], []];
        this.mode = "algorithm";
        this.redrawCanvas();
    }
    CustomAlgorythmCanvas.prototype.reset = function () {
        this.redrawCanvas(false);
        this.selected = -1;
    };
    CustomAlgorythmCanvas.prototype.fillDrawArray = function (noReset) {
        if (noReset === void 0) { noReset = false; }
        if (noReset) {
            this.drawArray = [];
            this.drawArray = [[], [], [], [], [], []];
            this.inverseModulation = [[], [], [], [], [], []];
            this.lookUpArray = [[], [], [], [], [], []];
            for (var i = 0; i < this.newMods.length; i++) {
                for (var o = 0; o < this.newMods[i].length; o++) {
                    this.inverseModulation[this.newMods[i][o] - 1].push(i + 1);
                }
            }
            if (this.mode == "feedback") {
                this.inverseFeedback = [[], [], [], [], [], []];
                for (var i = 0; i < this.feedback.length; i++) {
                    for (var o = 0; o < this.feedback[i].length; o++) {
                        this.inverseFeedback[this.feedback[i][o] - 1].push(i + 1);
                    }
                }
            }
        }
        else {
            this.drawArray = [];
            this.drawArray = [[], [], [], [], [], []];
            this.carriers = 1;
            this.newMods = [[], [], [], [], [], []];
            this.inverseModulation = [[], [], [], [], [], []];
            this.lookUpArray = [[], [], [], [], [], []];
            var oldMods = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customAlgorithm;
            this.carriers = oldMods.carrierCount;
            for (var i = 0; i < oldMods.modulatedBy.length; i++) {
                for (var o = 0; o < oldMods.modulatedBy[i].length; o++) {
                    this.inverseModulation[oldMods.modulatedBy[i][o] - 1].push(i + 1);
                    this.newMods[i][o] = oldMods.modulatedBy[i][o];
                }
            }
            if (this.mode == "feedback") {
                this.feedback = [[], [], [], [], [], []];
                this.inverseFeedback = [[], [], [], [], [], []];
                var oldfeed = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customFeedbackType.indices;
                for (var i = 0; i < oldfeed.length; i++) {
                    for (var o = 0; o < oldfeed[i].length; o++) {
                        this.inverseFeedback[oldfeed[i][o] - 1].push(i + 1);
                        this.feedback[i][o] = oldfeed[i][o];
                    }
                }
            }
        }
        for (var i = 0; i < this.inverseModulation.length; i++) {
            if (i < this.carriers) {
                this.drawArray[this.drawArray.length - 1][i] = i + 1;
                this.lookUpArray[i] = [0, i];
            }
            else {
                if (this.inverseModulation[i][0] != undefined) {
                    var testPos = [this.drawArray.length - (this.lookUpArray[this.inverseModulation[i][this.inverseModulation[i].length - 1] - 1][0] + 2), this.lookUpArray[this.inverseModulation[i][this.inverseModulation[i].length - 1] - 1][1]];
                    if (this.drawArray[testPos[0]][testPos[1]] != undefined) {
                        while (this.drawArray[testPos[0]][testPos[1]] != undefined && testPos[1] < 6) {
                            testPos[1]++;
                            if (this.drawArray[testPos[0]][testPos[1]] == undefined) {
                                this.drawArray[testPos[0]][testPos[1]] = i + 1;
                                this.lookUpArray[i] = [this.drawArray.length - (testPos[0] + 1), testPos[1]];
                                break;
                            }
                        }
                    }
                    else {
                        this.drawArray[testPos[0]][testPos[1]] = i + 1;
                        this.lookUpArray[i] = [this.drawArray.length - (testPos[0] + 1), testPos[1]];
                    }
                }
                else {
                    var testPos = [5, 0];
                    while (this.drawArray[testPos[0]][testPos[1]] != undefined && testPos[1] < 6) {
                        testPos[1]++;
                        if (this.drawArray[testPos[0]][testPos[1]] == undefined) {
                            this.drawArray[testPos[0]][testPos[1]] = i + 1;
                            this.lookUpArray[i] = [this.drawArray.length - (testPos[0] + 1), testPos[1]];
                            break;
                        }
                    }
                }
            }
        }
    };
    CustomAlgorythmCanvas.prototype.drawLines = function (ctx) {
        if (this.mode == "feedback") {
            for (var off = 0; off < 6; off++) {
                ctx.strokeStyle = ColorConfig_1.ColorConfig.getArbitaryChannelColor("pitch", off).primaryChannel;
                var set = off * 2 + 0.5;
                for (var i = 0; i < this.inverseFeedback[off].length; i++) {
                    var tar = this.inverseFeedback[off][i] - 1;
                    var srtpos = this.lookUpArray[off];
                    var tarpos = this.lookUpArray[tar];
                    ctx.beginPath();
                    ctx.moveTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12);
                    ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                    if (tarpos[1] != srtpos[1]) {
                        var side = 0;
                        if (tarpos[0] >= srtpos[0]) {
                            side = 24;
                        }
                        ctx.lineTo(srtpos[1] * 24 + side + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                        if ((tarpos[1] == (srtpos[1] - 1)) && (tarpos[0] <= (srtpos[0] - 1))) {
                        }
                        else {
                            if (tarpos[0] >= srtpos[0]) {
                                ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                                ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                            }
                            else {
                                ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                                ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                            }
                        }
                        ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                        ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                        ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                    }
                    else {
                        if (srtpos[0] - tarpos[0] == 1) {
                            ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                        }
                        else {
                            if (tarpos[0] >= srtpos[0]) {
                                ctx.lineTo(srtpos[1] * 24 + 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                                ctx.lineTo(srtpos[1] * 24 + 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                                ctx.lineTo(tarpos[1] * 24 + set + 12, (6 - tarpos[0] - 1) * 24 + set - 12);
                                ctx.lineTo(tarpos[1] * 24 + set + 12, (6 - tarpos[0] - 1) * 24);
                            }
                            else {
                                ctx.lineTo(srtpos[1] * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                                ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                                ctx.lineTo(tarpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                                ctx.lineTo(tarpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                            }
                        }
                    }
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            return;
        }
        ;
        for (var off = 0; off < 6; off++) {
            ctx.strokeStyle = ColorConfig_1.ColorConfig.getArbitaryChannelColor("pitch", off).primaryChannel;
            var set = off * 2 - 1 + 0.5;
            for (var i = 0; i < this.inverseModulation[off].length; i++) {
                var tar = this.inverseModulation[off][i] - 1;
                var srtpos = this.lookUpArray[off];
                var tarpos = this.lookUpArray[tar];
                ctx.beginPath();
                ctx.moveTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12);
                ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                if ((tarpos[1]) != srtpos[1]) {
                    ctx.lineTo(srtpos[1] * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                    if ((tarpos[1] == (srtpos[1] - 1)) && (tarpos[0] <= (srtpos[0] - 1))) {
                    }
                    else {
                        ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                        ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + 12 + set);
                    }
                    ctx.lineTo((tarpos[1] + 1) * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                    ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                    ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                }
                else {
                    if (Math.abs(tarpos[0] - srtpos[0]) == 1) {
                        ctx.lineTo((tarpos[1]) * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                    }
                    else {
                        ctx.lineTo(srtpos[1] * 24 + set, (6 - srtpos[0] - 1) * 24 + 12 + set);
                        ctx.lineTo(srtpos[1] * 24 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                        ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24 + set - 12);
                        ctx.lineTo(srtpos[1] * 24 + 12 + set, (6 - tarpos[0] - 1) * 24);
                    }
                }
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    };
    CustomAlgorythmCanvas.prototype.redrawCanvas = function (noReset) {
        if (noReset === void 0) { noReset = false; }
        this.fillDrawArray(noReset);
        var ctx = this.canvas.getContext("2d");
        // Black BG
        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, 144, 144);
        for (var x = 0; x < 6; x++) {
            for (var y = 0; y < 6; y++) {
                ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--track-editor-bg-pitch-dim");
                ctx.fillRect(x * 24 + 12, ((y) * 24), 12, 12);
                ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
                ctx.fillRect(x * 24 + 13, ((y) * 24) + 1, 10, 10);
                if (this.drawArray[y][x] != undefined) {
                    if (this.drawArray[y][x] <= this.carriers) {
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--primary-text");
                        ctx.fillRect(x * 24 + 12, ((y) * 24), 12, 12);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
                        ctx.fillRect(x * 24 + 13, ((y) * 24) + 1, 10, 10);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                        ctx.fillText(this.drawArray[y][x] + "", x * 24 + 14, y * 24 + 10);
                    }
                    else {
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;
                        ctx.fillRect(x * 24 + 12, (y * 24), 12, 12);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--editor-background");
                        ctx.fillRect(x * 24 + 13, ((y) * 24) + 1, 10, 10);
                        ctx.fillStyle = ColorConfig_1.ColorConfig.getComputed("--primary-text");
                        ctx.fillText(this.drawArray[y][x] + "", x * 24 + 14, y * 24 + 10);
                    }
                }
            }
        }
        this.drawLines(ctx);
    };
    return CustomAlgorythmCanvas;
}());
var SongEditor = /** @class */ (function () {
    function SongEditor( /*private _doc: SongDocument*/) {
        var _this = this;
        this.prompt = null;
        this.doc = new SongDocument_1.SongDocument();
        this._keyboardLayout = new KeyboardLayout_1.KeyboardLayout(this.doc);
        this._patternEditorPrev = new PatternEditor_1.PatternEditor(this.doc, false, -1);
        this._patternEditor = new PatternEditor_1.PatternEditor(this.doc, true, 0);
        this._patternEditorNext = new PatternEditor_1.PatternEditor(this.doc, false, 1);
        this._trackEditor = new TrackEditor_1.TrackEditor(this.doc, this);
        this._muteEditor = new MuteEditor_1.MuteEditor(this.doc, this);
        this._loopEditor = new LoopEditor_1.LoopEditor(this.doc, this._trackEditor);
        this._piano = new Piano_1.Piano(this.doc);
        this._octaveScrollBar = new OctaveScrollBar_1.OctaveScrollBar(this.doc, this._piano);
        this._playButton = button({ class: "playButton", type: "button", title: "Play (Space)" }, span("Play"));
        this._pauseButton = button({ class: "pauseButton", style: "display: none;", type: "button", title: "Pause (Space)" }, "Pause");
        this._recordButton = button({ class: "recordButton", style: "display: none;", type: "button", title: "Record (Ctrl+Space)" }, span("Record"));
        this._stopButton = button({ class: "stopButton", style: "display: none;", type: "button", title: "Stop Recording (Space)" }, "Stop Recording");
        this._prevBarButton = button({ class: "prevBarButton", type: "button", title: "Previous Bar (left bracket)" });
        this._nextBarButton = button({ class: "nextBarButton", type: "button", title: "Next Bar (right bracket)" });
        this._volumeSlider = new HTMLWrapper_1.Slider(input({ title: "main volume", style: "width: 5em; flex-grow: 1; margin: 0;", type: "range", min: "0", max: "75", value: "50", step: "1" }), this.doc, null, false);
        this._outVolumeBarBg = elements_strict_1.SVG.rect({ "pointer-events": "none", width: "90%", height: "50%", x: "5%", y: "25%", fill: ColorConfig_1.ColorConfig.uiWidgetBackground });
        this._outVolumeBar = elements_strict_1.SVG.rect({ "pointer-events": "none", height: "50%", width: "0%", x: "5%", y: "25%", fill: "url('#volumeGrad2')" });
        this._outVolumeCap = elements_strict_1.SVG.rect({ "pointer-events": "none", width: "2px", height: "50%", x: "5%", y: "25%", fill: ColorConfig_1.ColorConfig.uiWidgetFocus });
        this._stop1 = elements_strict_1.SVG.stop({ "stop-color": "lime", offset: "60%" });
        this._stop2 = elements_strict_1.SVG.stop({ "stop-color": "orange", offset: "90%" });
        this._stop3 = elements_strict_1.SVG.stop({ "stop-color": "red", offset: "100%" });
        this._gradient = elements_strict_1.SVG.linearGradient({ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" }, this._stop1, this._stop2, this._stop3);
        this._defs = elements_strict_1.SVG.defs({}, this._gradient);
        this._volumeBarContainer = elements_strict_1.SVG.svg({ style: "touch-action: none; overflow: visible; margin: auto; max-width: 20vw;", width: "160px", height: "100%", preserveAspectRatio: "none", viewBox: "0 0 160 12" }, this._defs, this._outVolumeBarBg, this._outVolumeBar, this._outVolumeCap);
        this._volumeBarBox = div({ class: "playback-volume-bar", style: "height: 12px; align-self: center;" }, this._volumeBarContainer);
        this._fileMenu = select({ style: "width: 100%;" }, option({ selected: true, disabled: true, hidden: false }, "File"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "new" }, "+ New Blank Song (⇧`)"), option({ value: "import" }, "↑ Import Song... (" + EditorConfig_1.EditorConfig.ctrlSymbol + "O)"), option({ value: "export" }, "↓ Export Song... (" + EditorConfig_1.EditorConfig.ctrlSymbol + "S)"),
        option({ value: "copyUrl" }, "⎘ Copy Song URL"),
        option({ value: "generateSong" }, "🎲 Generate Random Song"),
        option({ value: "configureShortener" }, "🛠 Customize Url Shortener..."),
        option({ value: "shortenUrl" }, "… Shorten Song URL (⇧U)"),
        option({ value: "viewPlayer" }, "▶ View in Song Player (⇧P)"),
        option({ value: "copyEmbed" }, "⎘ Copy HTML Embed Code"),
        option({ value: "songRecovery" }, "⚠ Recover Recent Song... (`)"), option({ value: "multiplayer" }, "🎮 Multiplayer..."), option({ value: "shareUrl" }, "📤 Share Song..."));
        this._editMenu = select({ style: "width: 100%;" }, option({ selected: true, disabled: true, hidden: false }, "Edit"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        option({ value: "undo" }, "Undo (Z)"), option({ value: "redo" }, "Redo (Y)"), option({ value: "copy" }, "Copy Pattern (C)"), option({ value: "pasteNotes" }, "Paste Pattern Notes (V)"), option({ value: "pasteNumbers" }, "Paste Pattern Numbers (" + EditorConfig_1.EditorConfig.ctrlSymbol + "⇧V)"), option({ value: "insertBars" }, "Insert Bar (⏎)"), option({ value: "deleteBars" }, "Delete Selected Bars (⌫)"), option({ value: "insertChannel" }, "Insert Channel (" + EditorConfig_1.EditorConfig.ctrlSymbol + "⏎)"), option({ value: "deleteChannel" }, "Delete Selected Channels (" + EditorConfig_1.EditorConfig.ctrlSymbol + "⌫)"), option({ value: "selectChannel" }, "Select Channel (⇧A)"), option({ value: "selectAll" }, "Select All (A)"), option({ value: "duplicatePatterns" }, "Duplicate Reused Patterns (D)"), option({ value: "transposeUp" }, "Move Notes Up (+ or ⇧+)"), option({ value: "transposeDown" }, "Move Notes Down (- or ⇧-)"), option({ value: "moveNotesSideways" }, "Move All Notes Sideways... (W)"), option({ value: "generateEuclideanRhythm" }, "Generate Euclidean Rhythm... (" + EditorConfig_1.EditorConfig.ctrlSymbol + "E)"), option({ value: "beatsPerBar" }, "Change Beats Per Bar... (⇧B)"), option({ value: "barCount" }, "Change Song Length... (L)"), option({ value: "channelSettings" }, "Channel Settings... (Q)"), option({ value: "limiterSettings" }, "Limiter Settings... (⇧L)"), option({ value: "addExternal" }, "Add Custom Samples... (⇧Q)"));
        this._optionsMenu = select({ style: "width: 100%;" }, option({ selected: true, disabled: true, hidden: false }, "Preferences"), // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        optgroup({ label: "Technical" }, option({ value: "autoPlay" }, "Auto Play on Load"), option({ value: "autoFollow" }, "Auto Follow Playhead"), option({ value: "enableNotePreview" }, "Hear Added Notes"), option({ value: "notesOutsideScale" }, "Place Notes Out of Scale"), option({ value: "setDefaultScale" }, "Set Current Scale as Default"), option({ value: "alwaysFineNoteVol" }, "Always Fine Note Volume"), option({ value: "enableChannelMuting" }, "Enable Channel Muting"), option({ value: "instrumentCopyPaste" }, "Enable Copy/Paste Buttons"), option({ value: "enableTagSearch" }, "Enable Tag Search"), option({ value: "instrumentImportExport" }, "Enable Import/Export Buttons"), 
        //option({ value: "displayBrowserUrl" }, "Enable Song Data in URL"), //comment for testing
        option({ value: "closePromptByClickoff" }, "Close Prompts on Click Off"), option({ value: "rollNoveltyPresets" }, "Can Randomly Select Novelty Presets"), option({ value: "recordingSetup" }, "Note Recording...")), optgroup({ label: "Appearance" }, option({ value: "showFifth" }, 'Highlight "Fifth" Note'), option({ value: "notesFlashWhenPlayed" }, "Notes Flash When Played (DogeBox2)"), option({ value: "instrumentButtonsAtTop" }, "Instrument Buttons at Top"), option({ value: "frostedGlassBackground" }, "Frosted Glass Prompt Backdrop"), option({ value: "showChannels" }, "Show All Channels"), option({ value: "showScrollBar" }, "Show Octave Scroll Bar"), option({ value: "showInstrumentScrollbars" }, "Show Intsrument Scrollbars"), option({ value: "showLetters" }, "Show Piano Keys"), option({ value: "displayVolumeBar" }, "Show Playback Volume"), option({ value: "showOscilloscope" }, "Show Oscilloscope"), option({ value: "showSampleLoadingStatus" }, "Show Sample Loading Status"), option({ value: "showDescription" }, "Show Description"), option({ value: "layout" }, "Set Layout..."), option({ value: "colorTheme" }, "Set Theme..."), option({ value: "customTheme" }, "Custom Theme...")));
        this._scaleSelect = buildOptions(select(), SynthConfig_1.Config.scales.map(function (scale) { return scale.name; }));
        this._keySelect = buildOptions(select(), SynthConfig_1.Config.keys.map(function (key) { return key.name; }).reverse());
        this._octaveStepper = input({ style: "width: 59.5%;", type: "number", min: SynthConfig_1.Config.octaveMin, max: SynthConfig_1.Config.octaveMax, value: "0" });
        this._tempoSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0; vertical-align: middle;", type: "range", min: "1", max: "500", value: "160", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeTempo(_this.doc, oldValue, newValue); }, false);
        this._tempoStepper = input({ style: "width: 4em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", type: "number", step: "1" });
        this._songEqFilterEditor = new FilterEditor_1.FilterEditor(this.doc, false, false, true);
        this._songEqFilterZoom = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: function () { return _this._openPrompt("customSongEQFilterSettings"); } }, "+");
        this._chorusSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.chorusRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeChorus(_this.doc, oldValue, newValue); }, false);
        this._chorusRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("chorus"); } }, "Chorus:"), this._chorusSlider.container);
        this._reverbSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0; position: sticky,", type: "range", min: "0", max: SynthConfig_1.Config.reverbRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeReverb(_this.doc, oldValue, newValue); }, false);
        this._reverbRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("reverb"); } }, "Reverb:"), this._reverbSlider.container);
        this._ringModWaveSelect = buildOptions(select({}), SynthConfig_1.Config.operatorWaves.map(function (wave) { return wave.name; }));
        this._ringModPulsewidthSlider = new HTMLWrapper_1.Slider(input({ style: "margin-left: 10px; width: 85%;", type: "range", min: "0", max: SynthConfig_1.Config.pwmOperatorWaves.length - 1, value: "0", step: "1", title: "Pulse Width" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeRingModPulseWidth(_this.doc, oldValue, newValue); }, true);
        this._ringModSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.ringModRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeRingMod(_this.doc, oldValue, newValue); }, false);
        this._ringModRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("ringMod"); } }, "Ring Mod:"), this._ringModSlider.container);
        this._ringModHzSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.ringModHzRange - 1, value: (SynthConfig_1.Config.ringModHzRange - (SynthConfig_1.Config.ringModHzRange / 2)), step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeRingModHz(_this.doc, oldValue, newValue); }, true);
        this.ringModHzNum = div({ style: "font-size: 80%; ", id: "ringModHzNum" });
        this._ringModHzSliderRow = div({ class: "selectRow", style: "width:100%;" }, div({ style: "display:flex; flex-direction:column; align-items:center;" }, span({ class: "tip", style: "font-size: smaller;", onclick: function () { return _this._openPrompt("RingModHz"); } }, "Hertz: "), div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; ") }, this.ringModHzNum)), this._ringModHzSlider.container);
        this._ringModWaveText = span({ class: "tip", onclick: function () { return _this._openPrompt("ringModChipWave"); } }, "Wave: ");
        this._ringModWaveSelectRow = div({ class: "selectRow", style: "width: 100%;" }, this._ringModWaveText, this._ringModPulsewidthSlider.container, div({ class: "selectContainer", style: "width:40%;" }, this._ringModWaveSelect));
        this._ringModContainerRow = div({ class: "", style: "display:flex; flex-direction:column;" }, this._ringModRow, this._ringModHzSliderRow, 
        // this._rmOffsetHzSliderRow,
        this._ringModWaveSelectRow);
        this._granularSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.granularRange, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeGranular(_this.doc, oldValue, newValue); }, false);
        this._granularRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("granular"); } }, "Granular:"), this._granularSlider.container);
        this._grainSizeSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: SynthConfig_1.Config.grainSizeMin / SynthConfig_1.Config.grainSizeStep, max: SynthConfig_1.Config.grainSizeMax / SynthConfig_1.Config.grainSizeStep, value: SynthConfig_1.Config.grainSizeMin / SynthConfig_1.Config.grainSizeStep, step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeGrainSize(_this.doc, oldValue, newValue); }, false);
        this.grainSizeNum = div({ style: "font-size: 80%; ", id: "grainSizeNum" });
        this._grainSizeSliderRow = div({ class: "selectRow", style: "width:100%;" }, div({ style: "display:flex; flex-direction:column; align-items:center;" }, span({ class: "tip", style: "font-size: smaller;", onclick: function () { return _this._openPrompt("grainSize"); } }, "Grain: "), div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; ") }, this.grainSizeNum)), this._grainSizeSlider.container);
        this._grainAmountsSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.grainAmountsMax, value: 8, step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeGrainAmounts(_this.doc, oldValue, newValue); }, false);
        this._grainAmountsRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("grainAmount"); } }, "Grain Freq:"), this._grainAmountsSlider.container);
        this._grainRangeSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.grainRangeMax / SynthConfig_1.Config.grainSizeStep, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeGrainRange(_this.doc, oldValue, newValue); }, false);
        this.grainRangeNum = div({ style: "font-size: 80%; ", id: "grainRangeNum" });
        this._grainRangeSliderRow = div({ class: "selectRow", style: "width:100%;" }, div({ style: "display:flex; flex-direction:column; align-items:center;" }, span({ class: "tip", style: "font-size: smaller;", onclick: function () { return _this._openPrompt("grainRange"); } }, "Range: "), div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; ") }, this.grainRangeNum)), this._grainRangeSlider.container);
        this._granularContainerRow = div({ class: "", style: "display:flex; flex-direction:column;" }, this._granularRow, this._grainAmountsRow, this._grainSizeSliderRow, this._grainRangeSliderRow);
        this._echoSustainSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.echoSustainRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeEchoSustain(_this.doc, oldValue, newValue); }, false);
        this._echoSustainRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("echoSustain"); } }, "Echo:"), this._echoSustainSlider.container);
        this._echoDelaySlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.echoDelayRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeEchoDelay(_this.doc, oldValue, newValue); }, false);
        this._echoDelayRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("echoDelay"); } }, "Echo Delay:"), this._echoDelaySlider.container);
        this._rhythmSelect = buildOptions(select(), SynthConfig_1.Config.rhythms.map(function (rhythm) { return rhythm.name; }));
        this._phaserMixSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.phaserMixRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePhaserMix(_this.doc, oldValue, newValue); }, false);
        this._phaserMixRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("phaserMix"); } }, span("Phaser:")), this._phaserMixSlider.container);
        this._phaserFreqSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.phaserFreqRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePhaserFreq(_this.doc, oldValue, newValue); }, false);
        this._phaserFreqRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("phaserFreq"); } }, span(" Freq:")), this._phaserFreqSlider.container);
        this._phaserFeedbackSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.phaserFeedbackRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePhaserFeedback(_this.doc, oldValue, newValue); }, false);
        this._phaserFeedbackRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("phaserFeedback"); } }, span(" Feedback:")), this._phaserFeedbackSlider.container);
        this._phaserStagesSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: SynthConfig_1.Config.phaserMinStages, max: SynthConfig_1.Config.phaserMaxStages, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePhaserStages(_this.doc, oldValue, newValue); }, false);
        this._phaserStagesRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("phaserStages"); } }, span(" Stages:")), this._phaserStagesSlider.container);
        this._pitchedPresetSelect = buildPresetOptions(false, "pitchPresetSelect");
        this._drumPresetSelect = buildPresetOptions(true, "drumPresetSelect");
        this._algorithmSelect = buildOptions(select(), SynthConfig_1.Config.algorithms.map(function (algorithm) { return algorithm.name; }));
        this._algorithmSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("algorithm"); } }, "Algorithm: "), div({ class: "selectContainer" }, this._algorithmSelect));
        this._instrumentButtons = [];
        this._instrumentAddButton = button({ type: "button", class: "add-instrument last-button" });
        this._instrumentRemoveButton = button({ type: "button", class: "remove-instrument" });
        this._instrumentsButtonBar = div({ class: "instrument-bar" }, this._instrumentRemoveButton, this._instrumentAddButton);
        this._instrumentsButtonRow = div({ class: "selectRow", style: "display: none;" }, span({ class: "tip", onclick: function () { return _this._openPrompt("instrumentIndex"); } }, "Instrument:"), this._instrumentsButtonBar);
        this._instrumentVolumeSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: Math.floor(-SynthConfig_1.Config.volumeRange / 2), max: Math.floor(SynthConfig_1.Config.volumeRange / 2), value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeVolume(_this.doc, oldValue, newValue); }, true);
        this._instrumentVolumeSliderInputBox = input({ style: "width: 4em; font-size: 80%", id: "volumeSliderInputBox", type: "number", step: "1", min: Math.floor(-SynthConfig_1.Config.volumeRange / 2), max: Math.floor(SynthConfig_1.Config.volumeRange / 2), value: "0" });
        this._instrumentVolumeSliderTip = div({ class: "selectRow", style: "height: 1em" }, span({ class: "tip", style: "font-size: smaller;", onclick: function () { return _this._openPrompt("instrumentVolume"); } }, "Volume: "));
        this._instrumentVolumeSliderRow = div({ class: "selectRow" }, div({}, div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, ";") }, span({ class: "tip" }, this._instrumentVolumeSliderTip)), div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; margin-top: -3px;") }, this._instrumentVolumeSliderInputBox)), this._instrumentVolumeSlider.container);
        this._panSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: "0", max: SynthConfig_1.Config.panMax, value: SynthConfig_1.Config.panCenter, step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePan(_this.doc, oldValue, newValue); }, true);
        this._panDropdown = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(1 /* DropdownID.Pan */); } }, "▼");
        this._panSliderInputBox = input({ style: "width: 4em; font-size: 80%; ", id: "panSliderInputBox", type: "number", step: "1", min: "0", max: "100", value: "0" });
        this._panSliderRow = div({ class: "selectRow" }, div({}, span({ class: "tip", tabindex: "0", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("pan"); } }, "Pan: "), div({ style: "color: " + ColorConfig_1.ColorConfig.secondaryText + "; margin-top: -3px;" }, this._panSliderInputBox)), this._panDropdown, this._panSlider.container);
        this._panDelaySlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.modulators.dictionary["pan delay"].maxRawVol, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePanDelay(_this.doc, oldValue, newValue); }, false);
        this._panDelayRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("panDelay"); } }, "‣ Delay:"), this._panDelaySlider.container);
        this._panDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this._panDelayRow);
        this._chipWaveSelect = buildOptions(select(), SynthConfig_1.Config.chipWaves.map(function (wave) { return wave.name; }));
        this._chipNoiseSelect = buildOptions(select(), SynthConfig_1.Config.chipNoises.map(function (wave) { return wave.name; }));
        // advloop addition
        // @TODO: Add a dropdown for these. Or maybe this checkbox is fine?
        this._useChipWaveAdvancedLoopControlsBox = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-left: 0.4em; margin-right: 4em;" });
        this._chipWaveLoopModeSelect = buildOptions(select(), ["Loop", "Ping-Pong", "Play Once", "Play Loop Once"]);
        this._chipWaveLoopStartStepper = input({ type: "number", min: "0", step: "1", value: "0", style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;" });
        this._chipWaveLoopEndStepper = input({ type: "number", min: "0", step: "1", value: "0", style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;" });
        this._setChipWaveLoopEndToEndButton = button({ type: "button", style: "width: 1.5em; height: 1.5em; padding: 0; margin-left: 0.5em;" }, elements_strict_1.SVG.svg({ width: "16", height: "16", viewBox: "-13 -14 26 26", "pointer-events": "none", style: "width: 100%; height: 100%;" }, elements_strict_1.SVG.rect({ x: "4", y: "-6", width: "2", height: "12", fill: ColorConfig_1.ColorConfig.primaryText }), elements_strict_1.SVG.path({ d: "M -6 -6 L -6 6 L 3 0 z", fill: ColorConfig_1.ColorConfig.primaryText })));
        this._chipWaveStartOffsetStepper = input({ type: "number", min: "0", step: "1", value: "0", style: "width: 100%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;" });
        this._chipWavePlayBackwardsBox = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-left: 0.4em; margin-right: 4em;" });
        // advloop addition
        this._chipWaveSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("chipWave"); } }, "Wave: "), div({ class: "selectContainer" }, this._chipWaveSelect));
        this._chipNoiseSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("chipNoise"); } }, "Noise: "), div({ class: "selectContainer" }, this._chipNoiseSelect));
        this._visualLoopControlsButton = button({ style: "margin-left: 0em; padding-left: 0.2em; height: 1.5em; max-width: 12px;", onclick: function () { return _this._openPrompt("visualLoopControls"); } }, "+");
        this._useChipWaveAdvancedLoopControlsRow = div({ class: "selectRow" }, span({ class: "tip", style: "flex-shrink: 0;", onclick: function () { return _this._openPrompt("loopControls"); } }, "Loop Controls: "), this._useChipWaveAdvancedLoopControlsBox);
        this._chipWaveLoopModeSelectRow = div({ class: "selectRow" }, span({ class: "tip", style: "font-size: x-small;", onclick: function () { return _this._openPrompt("loopMode"); } }, "Loop Mode: "), div({ class: "selectContainer" }, this._chipWaveLoopModeSelect));
        this._chipWaveLoopStartRow = div({ class: "selectRow" }, span({ class: "tip", style: "font-size: x-small;", onclick: function () { return _this._openPrompt("loopStart"); } }, "Loop Start: "), this._visualLoopControlsButton, span({ style: "display: flex;" }, this._chipWaveLoopStartStepper));
        this._chipWaveLoopEndRow = div({ class: "selectRow" }, span({ class: "tip", style: "font-size: x-small;", onclick: function () { return _this._openPrompt("loopEnd"); } }, "Loop End: "), span({ style: "display: flex;" }, this._chipWaveLoopEndStepper, this._setChipWaveLoopEndToEndButton));
        this._chipWaveStartOffsetRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("offset"); } }, "Offset: "), span({ style: "display: flex;" }, this._chipWaveStartOffsetStepper));
        this._chipWavePlayBackwardsRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("backwards"); } }, "Backwards: "), this._chipWavePlayBackwardsBox);
        this._fadeInOutEditor = new FadeInOutEditor_1.FadeInOutEditor(this.doc);
        this._fadeInOutRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("fadeInOut"); } }, "Fade:"), this._fadeInOutEditor.container);
        this._transitionSelect = buildOptions(select(), SynthConfig_1.Config.transitions.map(function (transition) { return transition.name; }));
        this._transitionDropdown = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(3 /* DropdownID.Transition */); } }, "▼");
        this._transitionRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("transition"); } }, "Transition:"), this._transitionDropdown, div({ class: "selectContainer", style: "width: 52.5%;" }, this._transitionSelect));
        this._clicklessTransitionBox = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
        this._clicklessTransitionRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("clicklessTransition"); } }, "‣ Clickless:"), this._clicklessTransitionBox);
        this._transitionDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this._clicklessTransitionRow);
        this._effectsSelect = select(option({ selected: true, disabled: true, hidden: false })); // todo: "hidden" should be true but looks wrong on mac chrome, adds checkmark next to first visible option even though it's not selected. :(
        this._eqFilterSimpleButton = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "no-underline", onclick: function () { return _this._switchEQFilterType(true); } }, "simple");
        this._eqFilterAdvancedButton = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button no-underline", onclick: function () { return _this._switchEQFilterType(false); } }, "advanced");
        this._eqFilterTypeRow = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" }, span({ style: "font-size: x-small;", class: "tip", onclick: function () { return _this._openPrompt("filterType"); } }, "EQ Filt.Type:"), div({ class: "instrument-bar" }, this._eqFilterSimpleButton, this._eqFilterAdvancedButton));
        this._eqFilterEditor = new FilterEditor_1.FilterEditor(this.doc);
        this._eqFilterZoom = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: function () { return _this._openPrompt("customEQFilterSettings"); } }, "+");
        this._eqFilterRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("eqFilter"); } }, "EQ Filt:"), this._eqFilterZoom, this._eqFilterEditor.container);
        this._eqFilterSimpleCutSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.filterSimpleCutRange - 1, value: "6", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeEQFilterSimpleCut(_this.doc, oldValue, newValue); }, false);
        this._eqFilterSimpleCutRow = div({ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" }, span({ class: "tip", onclick: function () { return _this._openPrompt("filterCutoff"); } }, "Filter Cut:"), this._eqFilterSimpleCutSlider.container);
        this._eqFilterSimplePeakSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.filterSimplePeakRange - 1, value: "6", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeEQFilterSimplePeak(_this.doc, oldValue, newValue); }, false);
        this._eqFilterSimplePeakRow = div({ class: "selectRow", title: "Low-pass Filter Peak Resonance" }, span({ class: "tip", onclick: function () { return _this._openPrompt("filterResonance"); } }, "Filter Peak:"), this._eqFilterSimplePeakSlider.container);
        this._noteFilterSimpleButton = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "no-underline", onclick: function () { return _this._switchNoteFilterType(true); } }, "simple");
        this._noteFilterAdvancedButton = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button no-underline", onclick: function () { return _this._switchNoteFilterType(false); } }, "advanced");
        this._noteFilterTypeRow = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: 0px;" }, span({ style: "font-size: x-small;", class: "tip", onclick: function () { return _this._openPrompt("filterType"); } }, "Note Filt.Type:"), div({ class: "instrument-bar" }, this._noteFilterSimpleButton, this._noteFilterAdvancedButton));
        this._noteFilterEditor = new FilterEditor_1.FilterEditor(this.doc, true);
        this._noteFilterZoom = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: function () { return _this._openPrompt("customNoteFilterSettings"); } }, "+");
        this._noteFilterRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("noteFilter"); } }, "Note Filt:"), this._noteFilterZoom, this._noteFilterEditor.container);
        this._noteFilterSimpleCutSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.filterSimpleCutRange - 1, value: "6", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeNoteFilterSimpleCut(_this.doc, oldValue, newValue); }, false);
        this._noteFilterSimpleCutRow = div({ class: "selectRow", title: "Low-pass Filter Cutoff Frequency" }, span({ class: "tip", onclick: function () { return _this._openPrompt("filterCutoff"); } }, "Filter Cut:"), this._noteFilterSimpleCutSlider.container);
        this._noteFilterSimplePeakSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.filterSimplePeakRange - 1, value: "6", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeNoteFilterSimplePeak(_this.doc, oldValue, newValue); }, false);
        this._noteFilterSimplePeakRow = div({ class: "selectRow", title: "Low-pass Filter Peak Resonance" }, span({ class: "tip", onclick: function () { return _this._openPrompt("filterResonance"); } }, "Filter Peak:"), this._noteFilterSimplePeakSlider.container);
        this._supersawDynamismSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.supersawDynamismMax, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeSupersawDynamism(_this.doc, oldValue, newValue); }, false);
        this._supersawDynamismRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("supersawDynamism"); } }, "Dynamism:"), this._supersawDynamismSlider.container);
        this._supersawSpreadSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.supersawSpreadMax, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeSupersawSpread(_this.doc, oldValue, newValue); }, false);
        this._supersawSpreadRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("supersawSpread"); } }, "Spread:"), this._supersawSpreadSlider.container);
        this._supersawShapeSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.supersawShapeMax, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeSupersawShape(_this.doc, oldValue, newValue); }, false);
        this._supersawShapeRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("supersawShape"); }, style: "overflow: clip;" }, "Saw/Pulse:"), this._supersawShapeSlider.container);
        this._pulseWidthSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "1", max: SynthConfig_1.Config.pulseWidthRange, value: "1", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePulseWidth(_this.doc, oldValue, newValue); }, false);
        this._pulseWidthDropdown = button({ style: "margin-left:53px; position: absolute; margin-top: 15px; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(5 /* DropdownID.PulseWidth */); } }, "▼");
        this._pwmSliderInputBox = input({ style: "width: 4em; font-size: 70%;", id: "pwmSliderInputBox", type: "number", step: "1", min: "1", max: SynthConfig_1.Config.pulseWidthRange, value: "1" });
        this._pulseWidthRow = div({ class: "selectRow" }, div({}, span({ class: "tip", tabindex: "0", style: "height:1em; font-size: smaller; white-space: nowrap;", onclick: function () { return _this._openPrompt("pulseWidth"); } }, "Pulse Width:"), div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; margin-top: -3px;") }, this._pwmSliderInputBox)), this._pulseWidthDropdown, this._pulseWidthSlider.container);
        //private readonly _pulseWidthRow: HTMLDivElement = div({ class: "selectRow" }, span({ class: "tip", onclick: () => this._openPrompt("pulseWidth") }, "Pulse Width:"), this._pulseWidthDropdown, this._pulseWidthSlider.container);
        this._decimalOffsetSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: "99", value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeDecimalOffset(_this.doc, oldValue, 99 - newValue); }, false);
        this._decimalOffsetRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:10px;", onclick: function () { return _this._openPrompt("decimalOffset"); } }, "‣ Offset:"), this._decimalOffsetSlider.container);
        this._pulseWidthDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this._decimalOffsetRow);
        this._pitchShiftSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.pitchShiftRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangePitchShift(_this.doc, oldValue, newValue); }, true);
        this._pitchShiftTonicMarkers = [div({ class: "pitchShiftMarker", style: { color: ColorConfig_1.ColorConfig.tonic } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig_1.ColorConfig.tonic, left: "50%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig_1.ColorConfig.tonic, left: "100%" } })];
        this._pitchShiftFifthMarkers = [div({ class: "pitchShiftMarker", style: { color: ColorConfig_1.ColorConfig.fifthNote, left: (100 * 7 / 24) + "%" } }), div({ class: "pitchShiftMarker", style: { color: ColorConfig_1.ColorConfig.fifthNote, left: (100 * 19 / 24) + "%" } })];
        this._pitchShiftMarkerContainer = div({ style: "display: flex; position: relative;" }, this._pitchShiftSlider.container, div({ class: "pitchShiftMarkerContainer" }, this._pitchShiftTonicMarkers, this._pitchShiftFifthMarkers));
        this._pitchShiftRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("pitchShift"); } }, "Pitch Shift:"), this._pitchShiftMarkerContainer);
        this._detuneSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: SynthConfig_1.Config.detuneMin - SynthConfig_1.Config.detuneCenter, max: SynthConfig_1.Config.detuneMax - SynthConfig_1.Config.detuneCenter, value: 0, step: "4" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeDetune(_this.doc, oldValue, newValue); }, true);
        this._detuneSliderInputBox = input({ style: "width: 4em; font-size: 80%; ", id: "detuneSliderInputBox", type: "number", step: "1", min: SynthConfig_1.Config.detuneMin - SynthConfig_1.Config.detuneCenter, max: SynthConfig_1.Config.detuneMax - SynthConfig_1.Config.detuneCenter, value: 0 });
        this._detuneSliderRow = div({ class: "selectRow" }, div({}, span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("detune"); } }, "Detune: "), div({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; margin-top: -3px;") }, this._detuneSliderInputBox)), this._detuneSlider.container);
        this._distortionSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0; position: sticky;", type: "range", min: "0", max: SynthConfig_1.Config.distortionRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeDistortion(_this.doc, oldValue, newValue); }, false);
        this._distortionRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("distortion"); } }, "Distortion:"), this._distortionSlider.container);
        this._aliasingBox = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
        this._aliasingRow = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: function () { return _this._openPrompt("aliases"); } }, "Aliasing:"), this._aliasingBox);
        this._bitcrusherQuantizationSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.bitcrusherQuantizationRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeBitcrusherQuantization(_this.doc, oldValue, newValue); }, false);
        this._bitcrusherQuantizationRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("bitcrusherQuantization"); } }, "Bit Crush:"), this._bitcrusherQuantizationSlider.container);
        this._bitcrusherFreqSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.bitcrusherFreqRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeBitcrusherFreq(_this.doc, oldValue, newValue); }, false);
        this._bitcrusherFreqRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("bitcrusherFreq"); } }, "Freq Crush:"), this._bitcrusherFreqSlider.container);
        this._stringSustainSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.stringSustainRange - 1, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeStringSustain(_this.doc, oldValue, newValue); }, false);
        this._stringSustainLabel = span({ class: "tip", onclick: function () { return _this._openPrompt("stringSustain"); } }, "Sustain:");
        this._stringSustainRow = div({ class: "selectRow" }, this._stringSustainLabel, this._stringSustainSlider.container);
        this._unisonDropdown = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(6 /* DropdownID.Unison */); } }, "▼");
        this._unisonSelect = buildOptions(select(), SynthConfig_1.Config.unisons.map(function (unison) { return unison.name; }));
        this._unisonSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("unison"); } }, "Unison:"), this._unisonDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._unisonSelect));
        this._unisonVoicesInputBox = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonVoicesInputBox", type: "number", step: "1", min: SynthConfig_1.Config.unisonVoicesMin, max: SynthConfig_1.Config.unisonVoicesMax, value: 1 });
        this._unisonVoicesRow = div({ class: "selectRow dropFader" }, div({}, span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("unisonVoices"); } }, "‣ Voices: "), div({ style: "color: " + ColorConfig_1.ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonVoicesInputBox)));
        this._unisonSpreadInputBox = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonSpreadInputBox", type: "number", step: "0.001", min: SynthConfig_1.Config.unisonSpreadMin, max: SynthConfig_1.Config.unisonSpreadMax, value: 0.0 });
        this._unisonSpreadRow = div({ class: "selectRow dropFader" }, div({}, span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("unisonSpread"); } }, "‣ Spread: "), div({ style: "color: " + ColorConfig_1.ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonSpreadInputBox)));
        this._unisonOffsetInputBox = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonOffsetInputBox", type: "number", step: "0.001", min: SynthConfig_1.Config.unisonOffsetMin, max: SynthConfig_1.Config.unisonOffsetMax, value: 0.0 });
        this._unisonOffsetRow = div({ class: "selectRow dropFader" }, div({}, span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("unisonOffset"); } }, "‣ Offset: "), div({ style: "color: " + ColorConfig_1.ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonOffsetInputBox)));
        this._unisonExpressionInputBox = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonExpressionInputBox", type: "number", step: "0.001", min: SynthConfig_1.Config.unisonExpressionMin, max: SynthConfig_1.Config.unisonExpressionMax, value: 1.4 });
        this._unisonExpressionRow = div({ class: "selectRow dropFader" }, div({}, span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("unisonExpression"); } }, "‣ Volume: "), div({ style: "color: " + ColorConfig_1.ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonExpressionInputBox)));
        this._unisonSignInputBox = input({ style: "width: 150%; height: 1.5em; font-size: 80%; margin-left: 0.4em; vertical-align: middle;", id: "unisonSignInputBox", type: "number", step: "0.001", min: SynthConfig_1.Config.unisonSignMin, max: SynthConfig_1.Config.unisonSignMax, value: 1.0 });
        this._unisonSignRow = div({ class: "selectRow dropFader" }, div({}, span({ class: "tip", style: "height:1em; font-size: smaller;", onclick: function () { return _this._openPrompt("unisonSign"); } }, "‣ Sign: "), div({ style: "color: " + ColorConfig_1.ColorConfig.secondaryText + "; margin-top: -3px;" }, this._unisonSignInputBox)));
        this._unisonDropdownGroup = div({ class: "editor-controls", style: "display: none; gap: 3px; margin-bottom: 0.5em;" }, this._unisonVoicesRow, this._unisonSpreadRow, this._unisonOffsetRow, this._unisonExpressionRow, this._unisonSignRow);
        this._chordSelect = buildOptions(select({ style: "flex-shrink: 100" }), SynthConfig_1.Config.chords.map(function (chord) { return chord.name; }));
        this._chordDropdown = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(2 /* DropdownID.Chord */); } }, "▼");
        this._monophonicNoteInputBox = input({ style: "width: 2.35em; height: 1.5em; font-size: 80%; margin: 0.5em; vertical-align: middle;", id: "unisonSignInputBox", type: "number", step: "1", min: 1, max: SynthConfig_1.Config.maxChordSize, value: 1.0 });
        this._chordSelectContainer = div({ class: "selectContainer", style: "width=100%" }, this._chordSelect);
        this._chordSelectRow = div({ class: "selectRow", style: "display: flex; flex-direction: row" }, span({ class: "tip", onclick: function () { return _this._openPrompt("chords"); } }, "Chords:"), this._monophonicNoteInputBox, this._chordDropdown, this._chordSelectContainer);
        this._arpeggioSpeedDisplay = span({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; font-size: smaller; text-overflow: clip;") }, "x1");
        this._arpeggioSpeedSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.modulators.dictionary["arp speed"].maxRawVol, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeArpeggioSpeed(_this.doc, oldValue, newValue); }, false);
        this._arpeggioSpeedRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("arpeggioSpeed"); } }, "‣ Spd:"), this._arpeggioSpeedDisplay, this._arpeggioSpeedSlider.container);
        this._twoNoteArpBox = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
        this._twoNoteArpRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("twoNoteArpeggio"); } }, "‣ Fast Two-Note:"), this._twoNoteArpBox);
        this._chordDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this._arpeggioSpeedRow, this._twoNoteArpRow);
        this._invertWaveBox = input({ type: "checkbox", style: "width: 1em; padding: 0; margin-right: 4em;" });
        this._invertWaveRow = div({ class: "selectRow" }, span({ class: "tip", style: "margin-left:10px;", onclick: function () { return _this._openPrompt("invertWave"); } }, "Invert Wave:"), this._invertWaveBox);
        this._vibratoSelect = buildOptions(select(), SynthConfig_1.Config.vibratos.map(function (vibrato) { return vibrato.name; }));
        this._vibratoDropdown = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(0 /* DropdownID.Vibrato */); } }, "▼");
        this._vibratoSelectRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("vibrato"); } }, "Vibrato:"), this._vibratoDropdown, div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoSelect));
        this._vibratoDepthSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.modulators.dictionary["vibrato depth"].maxRawVol, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeVibratoDepth(_this.doc, oldValue, newValue); }, false);
        this._vibratoDepthRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("vibratoDepth"); } }, "‣ Depth:"), this._vibratoDepthSlider.container);
        this._vibratoSpeedDisplay = span({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; font-size: smaller; text-overflow: clip;") }, "x1");
        this._vibratoSpeedSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0; text-overflow: clip;", type: "range", min: "0", max: SynthConfig_1.Config.modulators.dictionary["vibrato speed"].maxRawVol, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeVibratoSpeed(_this.doc, oldValue, newValue); }, false);
        this._vibratoSpeedRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("vibratoSpeed"); } }, "‣ Spd:"), this._vibratoSpeedDisplay, this._vibratoSpeedSlider.container);
        this._vibratoDelaySlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.modulators.dictionary["vibrato delay"].maxRawVol, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeVibratoDelay(_this.doc, oldValue, newValue); }, false);
        this._vibratoDelayRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("vibratoDelay"); } }, "‣ Delay:"), this._vibratoDelaySlider.container);
        this._vibratoTypeSelect = buildOptions(select(), SynthConfig_1.Config.vibratoTypes.map(function (vibrato) { return vibrato.name; }));
        this._vibratoTypeSelectRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("vibratoType"); } }, "‣ Type:"), div({ class: "selectContainer", style: "width: 61.5%;" }, this._vibratoTypeSelect));
        this._vibratoDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this._vibratoDepthRow, this._vibratoSpeedRow, this._vibratoDelayRow, this._vibratoTypeSelectRow);
        this._phaseModGroup = div({ class: "editor-controls" });
        this._feedbackTypeSelect = buildOptions(select(), SynthConfig_1.Config.feedbacks.map(function (feedback) { return feedback.name; }));
        this._feedbackRow1 = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("feedbackType"); } }, "Feedback:"), div({ class: "selectContainer" }, this._feedbackTypeSelect));
        this._spectrumEditor = new SpectrumEditor_1.SpectrumEditor(this.doc, null);
        this._spectrumZoom = button({ style: "margin-left:0em; padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: function () { return _this._openPrompt("spectrumSettings"); } }, "+");
        this._spectrumRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("spectrum"); }, style: "font-size: smaller" }, "Spectrum:"), this._spectrumZoom, this._spectrumEditor.container);
        this._harmonicsEditor = new HarmonicsEditor_1.HarmonicsEditor(this.doc);
        this._harmonicsZoom = button({ style: "padding-left:0.2em; height:1.5em; max-width: 12px;", onclick: function () { return _this._openPrompt("harmonicsSettings"); } }, "+");
        this._harmonicsRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("harmonics"); }, style: "font-size: smaller" }, "Harmonics:"), this._harmonicsZoom, this._harmonicsEditor.container);
        //SongEditor.ts
        this.envelopeEditor = new EnvelopeEditor_1.EnvelopeEditor(this.doc, function (id, submenu, subtype) { return _this._toggleDropdownMenu(id, submenu, subtype); }, function (name) { return _this._openPrompt(name); });
        this._envelopeSpeedDisplay = span({ style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; font-size: smaller; text-overflow: clip;") }, "x1");
        this._envelopeSpeedSlider = new HTMLWrapper_1.Slider(input({ style: "margin: 0;", type: "range", min: "0", max: SynthConfig_1.Config.modulators.dictionary["envelope speed"].maxRawVol, value: "0", step: "1" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeEnvelopeSpeed(_this.doc, oldValue, newValue); }, false);
        this._envelopeSpeedRow = div({ class: "selectRow dropFader" }, span({ class: "tip", style: "margin-left:4px;", onclick: function () { return _this._openPrompt("envelopeSpeed"); } }, "‣ Spd:"), this._envelopeSpeedDisplay, this._envelopeSpeedSlider.container);
        this._envelopeDropdownGroup = div({ class: "editor-controls", style: "display: none;" }, this._envelopeSpeedRow);
        this._envelopeDropdown = button({ style: "margin-left:0em; margin-right: 1em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(7 /* DropdownID.Envelope */); } }, "▼");
        this._drumsetGroup = div({ class: "editor-controls" });
        this._drumsetZoom = button({ style: "margin-left:0em; padding-left:0.3em; margin-right:0.5em; height:1.5em; max-width: 16px;", onclick: function () { return _this._openPrompt("drumsetSettings"); } }, "+");
        this._modulatorGroup = div({ class: "editor-controls" });
        this._upperNoteLimitInputBox = input({ style: "width: 4em; font-size: 80%; ", id: "upperNoteLimitInputBox", type: "number", step: "1", min: 0, max: SynthConfig_1.Config.maxPitch, value: 60 });
        this._upperNoteLimitRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("upperNoteLimit"); } }, "Upper Note Limit:"), this._upperNoteLimitInputBox);
        this._lowerNoteLimitInputBox = input({ style: "width: 4em; font-size: 80%; ", id: "lowerNoteLimitInputBox", type: "number", step: "1", min: 0, max: SynthConfig_1.Config.maxPitch, value: 60 });
        this._lowerNoteLimitRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("lowerNoteLimit"); } }, "Lower Note Limit:"), this._lowerNoteLimitInputBox);
        this._feedback6OpTypeSelect = buildOptions(select(), SynthConfig_1.Config.feedbacks6Op.map(function (feedback) { return feedback.name; }));
        this._feedback6OpRow1 = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("feedbackType"); } }, "Feedback:"), div({ class: "selectContainer" }, this._feedback6OpTypeSelect));
        this._algorithmCanvasSwitch = button({ style: "margin-left:0em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: function (e) { return _this._toggleAlgorithmCanvas(e); } }, "A");
        this._customAlgorithmCanvas = new CustomAlgorythmCanvas(canvas({ width: 144, height: 144, style: "border:2px solid " + ColorConfig_1.ColorConfig.uiWidgetBackground, id: "customAlgorithmCanvas" }), this.doc, function (newArray, carry, mode) { return new changes_1.ChangeCustomAlgorythmorFeedback(_this.doc, newArray, carry, mode); });
        this._algorithm6OpSelect = buildOptions(select(), SynthConfig_1.Config.algorithms6Op.map(function (algorithm) { return algorithm.name; }));
        this._algorithm6OpSelectRow = div(div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("algorithm"); } }, "Algorithm: "), div({ class: "selectContainer" }, this._algorithm6OpSelect)), div({ style: "height:144px; display:flex; flex-direction: row; align-items:center; justify-content:center;" }, div({ style: "display:block; width:10px; margin-right: 0.2em" }, this._algorithmCanvasSwitch), div({ style: "width:144px; height:144px;" }, this._customAlgorithmCanvas.canvas))); //temp
        this._instrumentCopyButton = button({ style: "max-width:86px; width: 86px;", class: "copyButton", title: "Copy Instrument (⇧C)" }, [
            "Copy",
            // Copy icon:
            elements_strict_1.SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
                elements_strict_1.SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
            ]),
        ]);
        this._instrumentPasteButton = button({ style: "max-width:86px;", class: "pasteButton", title: "Paste Instrument (⇧V)" }, [
            "Paste",
            // Paste icon:
            elements_strict_1.SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
                elements_strict_1.SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
                elements_strict_1.SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
            ]),
        ]);
        this._instrumentExportButton = button({ style: "max-width:86px; width: 86px;", class: "exportInstrumentButton" }, [
            "Export",
            // Export icon:
            elements_strict_1.SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 -960 960 960" }, [
                elements_strict_1.SVG.path({ d: "M200-120v-40h560v40H200Zm279.231-150.769L254.615-568.462h130.769V-840h188.462v271.538h130.77L479.231-270.769Zm0-65.385 142.923-191.538h-88.308V-800H425.385v272.308h-88.308l142.154 191.538ZM480-527.692Z", fill: "currentColor" }),
            ]),
        ]);
        this._instrumentImportButton = button({ style: "max-width:86px;", class: "importInstrumentButton" }, [
            "Import",
            // Import icon:
            elements_strict_1.SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 -960 960 960" }, [
                elements_strict_1.SVG.path({ d: "M200-120v-40h560v40H200Zm185.384-150.769v-271.539H254.615L480-840l224.616 297.692h-130.77v271.539H385.384Zm40.001-40h108.461v-272.308h88.308L480-774.615 337.077-583.077h88.308v272.308ZM480-583.077Z", fill: "currentColor" }),
            ]),
        ]);
        this._globalOscscope = new Oscilloscope_1.oscilloscopeCanvas(canvas({ width: 144, height: 32, style: "border: 2px solid ".concat(ColorConfig_1.ColorConfig.uiWidgetBackground, "; position: static;"), id: "oscilloscopeAll" }), 1);
        this._globalOscscopeContainer = div({ style: "height: 38px; margin-left: auto; margin-right: auto;" }, this._globalOscscope.canvas);
        this._customWaveDrawCanvas = new CustomChipCanvas(canvas({ width: 128, height: 52, style: "border:2px solid " + ColorConfig_1.ColorConfig.uiWidgetBackground, id: "customWaveDrawCanvas" }), this.doc, function (newArray) { return new changes_1.ChangeCustomWave(_this.doc, newArray); });
        this._customWavePresetDrop = buildHeaderedOptions("Load Preset", select({ style: "width: 50%; height:1.5em; text-align: center; text-align-last: center;" }), SynthConfig_1.Config.chipWaves.map(function (wave) { return wave.name; }));
        this._customWaveZoom = button({ style: "margin-left:0.5em; height:1.5em; max-width: 20px;", onclick: function () { return _this._openPrompt("customChipSettings"); } }, "+");
        this._customWaveDraw = div({ style: "height:80px; margin-top:10px; margin-bottom:5px" }, [
            div({ style: "height:54px; display:flex; justify-content:center;" }, [this._customWaveDrawCanvas.canvas]),
            div({ style: "margin-top:5px; display:flex; justify-content:center;" }, [this._customWavePresetDrop, this._customWaveZoom]),
        ]);
        this._songTitleInputBox = new HTMLWrapper_1.InputBox(input({ style: "font-weight:bold; border:none; width: 98%; background-color:${ColorConfig.editorBackground}; color:${ColorConfig.primaryText}; text-align:center", maxlength: "30", type: "text", value: EditorConfig_1.EditorConfig.versionDisplayName }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeSongTitle(_this.doc, oldValue, newValue); });
        this._presetTagsInputBox = input({ style: "width: 60%; height: 1.5em; font-size: 80%; margin-left: 0.0em; vertical-align: middle;", id: "presetTagsInputBox", type: "text", value: "" });
        this._feedbackAmplitudeSlider = new HTMLWrapper_1.Slider(input({ type: "range", min: "0", max: SynthConfig_1.Config.operatorAmplitudeMax, value: "0", step: "1", title: "Feedback Amplitude" }), this.doc, function (oldValue, newValue) { return new changes_1.ChangeFeedbackAmplitude(_this.doc, oldValue, newValue); }, false);
        this._feedbackRow2 = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("feedbackVolume"); } }, "Fdback Vol:"), this._feedbackAmplitudeSlider.container);
        /*
         * @jummbus - my very real, valid reason for cutting this button: I don't like it.
         *
        private readonly _customizeInstrumentButton: HTMLButtonElement = button({type: "button", style: "margin: 2px 0"},
    
            "Customize Instrument",
        );
        */
        this._addEnvelopeButton = button({ type: "button", class: "add-envelope" });
        this._customInstrumentSettingsGroup = div({ class: "editor-controls" }, this._panSliderRow, this._panDropdownGroup, this._chipWaveSelectRow, this._chipNoiseSelectRow, this._useChipWaveAdvancedLoopControlsRow, this._chipWaveLoopModeSelectRow, this._chipWaveLoopStartRow, this._chipWaveLoopEndRow, this._chipWaveStartOffsetRow, this._chipWavePlayBackwardsRow, this._customWaveDraw, this._eqFilterTypeRow, this._eqFilterRow, this._eqFilterSimpleCutRow, this._eqFilterSimplePeakRow, this._fadeInOutRow, this._algorithmSelectRow, this._algorithm6OpSelectRow, this._phaseModGroup, this._feedbackRow1, this._feedback6OpRow1, this._feedbackRow2, this._spectrumRow, this._harmonicsRow, this._drumsetGroup, this._supersawDynamismRow, this._supersawSpreadRow, this._supersawShapeRow, this._pulseWidthRow, 
        // this._decimalOffsetRow,
        this._pulseWidthDropdownGroup, this._stringSustainRow, this._unisonSelectRow, this._unisonDropdownGroup, div({ style: "padding: 2px 0; margin-left: 2em; display: flex; align-items: center;" }, span({ style: "flex-grow: 1; text-align: center;" }, span({ class: "tip", onclick: function () { return _this._openPrompt("effects"); } }, "Effects")), div({ class: "effects-menu" }, this._effectsSelect)), this._transitionRow, this._transitionDropdownGroup, this._chordSelectRow, this._chordDropdownGroup, this._pitchShiftRow, this._detuneSliderRow, this._vibratoSelectRow, this._vibratoDropdownGroup, this._noteFilterTypeRow, this._noteFilterRow, this._noteFilterSimpleCutRow, this._noteFilterSimplePeakRow, 
        // this._corruptionRow,
        // this._corruptionTypeRow,
        this._distortionRow, this._aliasingRow, this._bitcrusherQuantizationRow, this._bitcrusherFreqRow, this._chorusRow, this._echoSustainRow, this._echoDelayRow, this._reverbRow, this._ringModContainerRow, this._phaserMixRow, this._phaserFreqRow, this._phaserFeedbackRow, this._phaserStagesRow, this._invertWaveRow, this._upperNoteLimitRow, this._lowerNoteLimitRow, this._granularContainerRow, div({ style: "padding: 2px 0; margin-left: 2em; display: flex; align-items: center;" }, span({ style: "flex-grow: 1; text-align: center;" }, span({ class: "tip", onclick: function () { return _this._openPrompt("envelopes"); } }, "Envelopes")), this._envelopeDropdown, this._addEnvelopeButton), this._envelopeDropdownGroup, this.envelopeEditor.container);
        this._instrumentCopyGroup = div({ class: "editor-controls" }, div({ class: "selectRow" }, this._instrumentCopyButton, this._instrumentPasteButton));
        this._instrumentExportGroup = div({ class: "editor-controls" }, div({ class: "selectRow" }, this._instrumentExportButton, this._instrumentImportButton));
        this._instrumentSettingsTextRow = div({ id: "instrumentSettingsText", style: "padding: 3px 0; max-width: 15em; text-align: center; color: ".concat(ColorConfig_1.ColorConfig.secondaryText, ";") }, "Instrument Settings");
        this._instrumentTagRow = div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("instrumentTags"); } }, "Tags:"), this._presetTagsInputBox);
        this._instrumentTypeSelectRow = div({ class: "selectRow", id: "typeSelectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("instrumentType"); } }, "Type:"), div(div({ class: "pitchSelect" }, this._pitchedPresetSelect), div({ class: "drumSelect" }, this._drumPresetSelect)));
        this._instrumentSettingsGroup = div({ class: "editor-controls" }, this._instrumentSettingsTextRow, this._instrumentTagRow, this._instrumentsButtonRow, 
        // these could've been put into _instrumentSettingsGroup as well but I decided not to
        // this._instrumentCopyGroup,
        // this._instrumentExportGroup,
        this._instrumentTypeSelectRow, this._instrumentVolumeSliderRow, 
        //this._customizeInstrumentButton,
        this._customInstrumentSettingsGroup);
        this._usedPatternIndicator = elements_strict_1.SVG.path({ d: "M -6 -6 H 6 V 6 H -6 V -6 M -2 -3 L -2 -3 L -1 -4 H 1 V 4 H -1 V -1.2 L -1.2 -1 H -2 V -3 z", fill: ColorConfig_1.ColorConfig.indicatorSecondary, "fill-rule": "evenodd" });
        this._usedInstrumentIndicator = elements_strict_1.SVG.path({ d: "M -6 -0.8 H -3.8 V -6 H 0.8 V 4.4 H 2.2 V -0.8 H 6 V 0.8 H 3.8 V 6 H -0.8 V -4.4 H -2.2 V 0.8 H -6 z", fill: ColorConfig_1.ColorConfig.indicatorSecondary });
        this._jumpToModIndicator = elements_strict_1.SVG.svg({ style: "width: 92%; height: 1.3em; flex-shrink: 0; position: absolute;", viewBox: "0 0 200 200" }, [
            elements_strict_1.SVG.path({ d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z" }),
            elements_strict_1.SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
            elements_strict_1.SVG.path({ d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z" }),
            elements_strict_1.SVG.path({ d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z" }),
            elements_strict_1.SVG.path({ d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z" })
        ]);
        this._promptContainer = div({ class: "promptContainer", style: "display: none;" });
        this._promptContainerBG = div({ class: "promptContainerBG", style: "display: none; height: 100%; width: 100%; position: fixed; z-index: 99; overflow-x: hidden; pointer-events: none;" });
        this._zoomInButton = button({ class: "zoomInButton", type: "button", title: "Zoom In" });
        this._zoomOutButton = button({ class: "zoomOutButton", type: "button", title: "Zoom Out" });
        this._patternEditorRow = div({ style: "flex: 1; height: 100%; display: flex; overflow: hidden; justify-content: center;" }, this._patternEditorPrev.container, this._patternEditor.container, this._patternEditorNext.container);
        this._patternArea = div({ class: "pattern-area" }, this._piano.container, this._patternEditorRow, this._octaveScrollBar.container, this._zoomInButton, this._zoomOutButton);
        this._trackContainer = div({ class: "trackContainer" }, this._trackEditor.container, this._loopEditor.container);
        this._trackVisibleArea = div({ style: "position: absolute; width: 100%; height: 100%; pointer-events: none;" });
        this._trackAndMuteContainer = div({ class: "trackAndMuteContainer" }, this._muteEditor.container, this._trackContainer, this._trackVisibleArea);
        this._barScrollBar = new BarScrollBar_1.BarScrollBar(this.doc);
        this._trackArea = div({ class: "track-area" }, this._trackAndMuteContainer, this._barScrollBar.container);
        this._multiplayerStatus = div({ class: "multiplayer-status", style: "font-size: 80%; color: #94a3b8; display: none; align-items: center; gap: 5px; padding: 0 8px;" }, span({ style: "width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block;" }), span("Connected"));
        this._menuArea = div({ class: "menu-area" }, div({ class: "selectContainer menu file" }, this._fileMenu), div({ class: "selectContainer menu edit" }, this._editMenu), div({ class: "selectContainer menu preferences" }, this._optionsMenu), this._multiplayerStatus);
        this._sampleLoadingBar = div({ style: "width: 0%; height: 100%; background-color: ".concat(ColorConfig_1.ColorConfig.indicatorPrimary, ";") });
        this._sampleLoadingBarContainer = div({ style: "width: 80%; height: 4px; overflow: hidden; margin-left: auto; margin-right: auto; margin-top: 0.5em; cursor: pointer; background-color: ".concat(ColorConfig_1.ColorConfig.indicatorSecondary, ";") }, this._sampleLoadingBar);
        this._sampleLoadingStatusContainer = div({ style: "cursor: pointer;" }, div({ style: "margin-top: 0.5em; text-align: center; color: ".concat(ColorConfig_1.ColorConfig.secondaryText, ";") }, "Sample Loading Status"), div({ class: "selectRow", style: "height: 6px; margin-bottom: 0.5em;" }, this._sampleLoadingBarContainer));
        this._songSettingsArea = div({ class: "song-settings-area" }, div({ class: "editor-controls" }, div({ class: "editor-song-settings" }, div({ style: "margin: 3px 0; position: relative; text-align: center; color: ${ColorConfig.secondaryText};" }, div({ class: "tip", style: "flex-shrink: 0; position:absolute; left: 0; top: 0; width: 12px; height: 12px", onclick: function () { return _this._openPrompt("usedPattern"); } }, elements_strict_1.SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "0.5em", viewBox: "-6 -6 12 12" }, this._usedPatternIndicator)), div({ class: "tip", style: "flex-shrink: 0; position: absolute; left: 14px; top: 0; width: 12px; height: 12px", onclick: function () { return _this._openPrompt("usedInstrument"); } }, elements_strict_1.SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 0; pointer-events: none;", width: "12px", height: "12px", "margin-right": "1em", viewBox: "-6 -6 12 12" }, this._usedInstrumentIndicator)), "Song Settings", div({ style: "width: 100%; left: 0; top: -1px; position:absolute; overflow-x:clip;" }, this._jumpToModIndicator))), div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("scale"); } }, "Scale: "), div({ class: "selectContainer" }, this._scaleSelect)), div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("key"); } }, "Key: "), div({ class: "selectContainer" }, this._keySelect)), div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("key_octave"); } }, "Octave: "), this._octaveStepper), div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("tempo"); } }, "Tempo: "), span({ style: "display: flex;" }, this._tempoSlider.container, this._tempoStepper)), div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("rhythm"); } }, "Rhythm: "), div({ class: "selectContainer" }, this._rhythmSelect)), div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("songeq"); } }, span("Song EQ:")), this._songEqFilterZoom, this._songEqFilterEditor.container), this._sampleLoadingStatusContainer));
        this._instrumentSettingsArea = div({ class: "instrument-settings-area" }, this._instrumentSettingsGroup, this._modulatorGroup);
        this._settingsArea = div({ class: "settings-area noSelection" }, div({ class: "version-area" }, div({ style: "text-align: center; margin: 3px 0; color: ".concat(ColorConfig_1.ColorConfig.secondaryText, ";") }, this._songTitleInputBox.input)), div({ class: "play-pause-area" }, this._volumeBarBox, div({ class: "playback-bar-controls" }, this._playButton, this._pauseButton, this._recordButton, this._stopButton, this._prevBarButton, this._nextBarButton), div({ class: "playback-volume-controls" }, span({ class: "volume-speaker" }), this._volumeSlider.container), this._globalOscscopeContainer), this._menuArea, this._songSettingsArea, this._instrumentSettingsArea);
        this.mainLayer = div({ class: "beepboxEditor", tabIndex: "0" }, this._patternArea, this._trackArea, this._settingsArea, this._promptContainer);
        this._wasPlaying = false;
        this._currentPromptName = null;
        this._highlightedInstrumentIndex = -1;
        this._renderedInstrumentCount = 0;
        this._renderedIsPlaying = false;
        this._renderedIsRecording = false;
        this._renderedShowRecordButton = false;
        this._renderedCtrlHeld = false;
        this._renderedMultiplayerConnected = false;
        this._ctrlHeld = false;
        this._shiftHeld = false;
        this._deactivatedInstruments = false;
        this._operatorRows = [];
        this._operatorAmplitudeSliders = [];
        this._operatorFrequencySelects = [];
        this._operatorDropdowns = [];
        this._operatorWaveformSelects = [];
        this._operatorWaveformHints = [];
        this._operatorWaveformPulsewidthSliders = [];
        this._operatorDropdownRows = [];
        this._operatorDropdownGroups = [];
        this._drumsetSpectrumEditors = [];
        this._drumsetEnvelopeSelects = [];
        this._showModSliders = [];
        this._newShowModSliders = [];
        this._modSliderValues = [];
        this._hasActiveModSliders = false;
        this._openPanDropdown = false;
        this._openVibratoDropdown = false;
        this._openEnvelopeDropdown = false;
        this._openChordDropdown = false;
        this._openTransitionDropdown = false;
        this._openOperatorDropdowns = [];
        this._openPulseWidthDropdown = false;
        this._openUnisonDropdown = false;
        this.outVolumeHistoricTimer = 0;
        this.outVolumeHistoricCap = 0;
        this.lastOutVolumeCap = 0;
        this.patternUsed = false;
        this._modRecTimeout = -1;
        this._whenSampleLoadingStatusClicked = function () {
            _this._openPrompt("sampleLoadingStatus");
        };
        this.refocusStage = function () {
            _this.mainLayer.focus({ preventScroll: true });
        };
        this._onFocusIn = function (event) {
            if (_this.doc.synth.recording && event.target != _this.mainLayer && event.target != _this._stopButton && event.target != _this._volumeSlider.input) {
                // Don't allow using tab to focus on the song settings while recording,
                // since interacting with them while recording would mess up the recording.
                _this.refocusStage();
            }
        };
        // Refocus stage if a sub-element that needs focus isn't being edited.
        this._refocusStageNotEditing = function () {
            if (!_this._patternEditor.editingModLabel)
                _this.mainLayer.focus({ preventScroll: true });
        };
        this.whenUpdated = function () {
            var prefs = _this.doc.prefs;
            _this._muteEditor.container.style.display = prefs.enableChannelMuting ? "" : "none";
            var trackBounds = _this._trackVisibleArea.getBoundingClientRect();
            _this.doc.trackVisibleBars = Math.floor((trackBounds.right - trackBounds.left - (prefs.enableChannelMuting ? 32 : 0)) / _this.doc.getBarWidth());
            _this.doc.trackVisibleChannels = Math.floor((trackBounds.bottom - trackBounds.top - 30) / ChannelRow_1.ChannelRow.patternHeight);
            for (var i = _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount; i < _this.doc.song.channels.length; i++) {
                var channel_1 = _this.doc.song.channels[i];
                for (var j = 0; j < channel_1.instruments.length; j++) {
                    _this.doc.synth.determineInvalidModulators(channel_1.instruments[j]);
                }
            }
            _this._barScrollBar.render();
            _this._trackEditor.render();
            _this._muteEditor.render();
            _this._trackAndMuteContainer.scrollLeft = _this.doc.barScrollPos * _this.doc.getBarWidth();
            _this._trackAndMuteContainer.scrollTop = _this.doc.channelScrollPos * ChannelRow_1.ChannelRow.patternHeight;
            if (document.activeElement != _this._patternEditor.modDragValueLabel && _this._patternEditor.editingModLabel) {
                _this._patternEditor.stopEditingModLabel(false);
            }
            _this._piano.container.style.display = prefs.showLetters ? "" : "none";
            _this._octaveScrollBar.container.style.display = prefs.showScrollBar ? "" : "none";
            _this._barScrollBar.container.style.display = _this.doc.song.barCount > _this.doc.trackVisibleBars ? "" : "none";
            _this._volumeBarBox.style.display = _this.doc.prefs.displayVolumeBar ? "" : "none";
            _this._globalOscscopeContainer.style.display = _this.doc.prefs.showOscilloscope ? "" : "none";
            _this.doc.synth.oscEnabled = _this.doc.prefs.showOscilloscope;
            _this._sampleLoadingStatusContainer.style.display = _this.doc.prefs.showSampleLoadingStatus ? "" : "none";
            _this._instrumentCopyGroup.style.display = _this.doc.prefs.instrumentCopyPaste ? "" : "none";
            _this._instrumentTagRow.style.display = _this.doc.prefs.enableTagSearch ? "" : "none";
            _this._instrumentExportGroup.style.display = _this.doc.prefs.instrumentImportExport ? "" : "none";
            _this._instrumentSettingsArea.style.scrollbarWidth = _this.doc.prefs.showInstrumentScrollbars ? "" : "none";
            if (document.getElementById('text-content'))
                document.getElementById('text-content').style.display = _this.doc.prefs.showDescription ? "" : "none";
            if (_this.doc.getFullScreen()) {
                var semitoneHeight = _this._patternEditorRow.clientHeight / _this.doc.getVisiblePitchCount();
                var targetBeatWidth = semitoneHeight * 5;
                var minBeatWidth = _this._patternEditorRow.clientWidth / (_this.doc.song.beatsPerBar * 3);
                var maxBeatWidth = _this._patternEditorRow.clientWidth / (_this.doc.song.beatsPerBar + 2);
                var beatWidth = Math.max(minBeatWidth, Math.min(maxBeatWidth, targetBeatWidth));
                var patternEditorWidth = beatWidth * _this.doc.song.beatsPerBar;
                var beepboxEditorContainer = document.getElementById("beepboxEditorContainer");
                if (_this.doc.prefs.showDescription == false) {
                    beepboxEditorContainer.style.paddingBottom = "0";
                    beepboxEditorContainer.style.borderStyle = "none";
                }
                else {
                    beepboxEditorContainer.style.paddingBottom = "";
                    beepboxEditorContainer.style.borderStyle = "";
                }
                _this._patternEditorPrev.container.style.width = patternEditorWidth + "px";
                _this._patternEditor.container.style.width = patternEditorWidth + "px";
                _this._patternEditorNext.container.style.width = patternEditorWidth + "px";
                _this._patternEditorPrev.container.style.flexShrink = "0";
                _this._patternEditor.container.style.flexShrink = "0";
                _this._patternEditorNext.container.style.flexShrink = "0";
                _this._patternEditorPrev.container.style.display = "";
                _this._patternEditorNext.container.style.display = "";
                _this._patternEditorPrev.render();
                _this._patternEditorNext.render();
                _this._zoomInButton.style.display = (_this.doc.channel < _this.doc.song.pitchChannelCount) ? "" : "none";
                _this._zoomOutButton.style.display = (_this.doc.channel < _this.doc.song.pitchChannelCount) ? "" : "none";
                _this._zoomInButton.style.right = prefs.showScrollBar ? "24px" : "4px";
                _this._zoomOutButton.style.right = prefs.showScrollBar ? "24px" : "4px";
            }
            else {
                _this._patternEditor.container.style.width = "";
                _this._patternEditor.container.style.flexShrink = "";
                _this._patternEditorPrev.container.style.display = "none";
                _this._patternEditorNext.container.style.display = "none";
                _this._zoomInButton.style.display = "none";
                _this._zoomOutButton.style.display = "none";
            }
            _this._patternEditor.render();
            // make the names of these two variables as short as possible for readability
            // also, these two variables are used for the effects tab as well, should they be renamed?
            // the theme variables are named "icon" to prevent people getting confused and thinking they're svg
            var textOnIcon = ColorConfig_1.ColorConfig.getComputed("--text-enabled-icon");
            var textOffIcon = ColorConfig_1.ColorConfig.getComputed("--text-disabled-icon");
            var textSpacingIcon = ColorConfig_1.ColorConfig.getComputed("--text-spacing-icon");
            var optionCommands = [
                "Technical",
                (prefs.autoPlay ? textOnIcon : textOffIcon) + "Auto Play on Load",
                (prefs.autoFollow ? textOnIcon : textOffIcon) + "Auto Follow Playhead",
                (prefs.enableNotePreview ? textOnIcon : textOffIcon) + "Hear Added Notes",
                (prefs.notesOutsideScale ? textOnIcon : textOffIcon) + "Place Notes Out of Scale",
                (prefs.defaultScale == _this.doc.song.scale ? textOnIcon : textOffIcon) + "Set Current Scale as Default",
                (prefs.alwaysFineNoteVol ? textOnIcon : textOffIcon) + "Always Fine Note Volume",
                (prefs.enableChannelMuting ? textOnIcon : textOffIcon) + "Enable Channel Muting",
                (prefs.instrumentCopyPaste ? textOnIcon : textOffIcon) + "Enable Copy/Paste Buttons",
                (prefs.enableTagSearch ? textOnIcon : textOffIcon) + "Enable Tag Search",
                (prefs.instrumentImportExport ? textOnIcon : textOffIcon) + "Enable Import/Export Buttons",
                //(prefs.displayBrowserUrl ? textOnIcon : textOffIcon) + "Enable Song Data in URL", //comment for testing
                (prefs.closePromptByClickoff ? textOnIcon : textOffIcon) + "Close Prompts on Click Off",
                (prefs.rollNoveltyPresets ? textOnIcon : textOffIcon) + "Can Randomly Select Novelty Presets",
                textSpacingIcon + "Note Recording...",
                textSpacingIcon + "Appearance",
                (prefs.showFifth ? textOnIcon : textOffIcon) + 'Highlight "Fifth" Note',
                (prefs.notesFlashWhenPlayed ? textOnIcon : textOffIcon) + "Notes Flash When Played (Dogebox2)",
                (prefs.instrumentButtonsAtTop ? textOnIcon : textOffIcon) + "Instrument Buttons at Top",
                (prefs.frostedGlassBackground ? textOnIcon : textOffIcon) + "Frosted Glass Prompt Backdrop",
                (prefs.showChannels ? textOnIcon : textOffIcon) + "Show All Channels",
                (prefs.showScrollBar ? textOnIcon : textOffIcon) + "Show Octave Scroll Bar",
                (prefs.showInstrumentScrollbars ? textOnIcon : textOffIcon) + "Show Instrument Scrollbars",
                (prefs.showLetters ? textOnIcon : textOffIcon) + "Show Piano Keys",
                (prefs.displayVolumeBar ? textOnIcon : textOffIcon) + "Show Playback Volume",
                (prefs.showOscilloscope ? textOnIcon : textOffIcon) + "Show Oscilloscope",
                (prefs.showSampleLoadingStatus ? textOnIcon : textOffIcon) + "Show Sample Loading Status",
                (prefs.showDescription ? textOnIcon : textOffIcon) + "Show Description",
                textSpacingIcon + "Set Layout...",
                textSpacingIcon + "Set Theme...",
                textSpacingIcon + "Custom Theme...",
            ];
            // Technical dropdown
            var technicalOptionGroup = _this._optionsMenu.children[1];
            for (var i = 0; i < technicalOptionGroup.children.length; i++) {
                var option_1 = technicalOptionGroup.children[i];
                if (option_1.textContent != optionCommands[i + 1])
                    option_1.textContent = optionCommands[i + 1];
            }
            // Appearance dropdown
            var appearanceOptionGroup = _this._optionsMenu.children[2];
            for (var i = 0; i < appearanceOptionGroup.children.length; i++) {
                var option_2 = appearanceOptionGroup.children[i];
                if (option_2.textContent != optionCommands[i + technicalOptionGroup.children.length + 2])
                    option_2.textContent = optionCommands[i + technicalOptionGroup.children.length + 2];
            }
            var channel = _this.doc.song.channels[_this.doc.channel];
            var instrumentIndex = _this.doc.getCurrentInstrument();
            var instrument = channel.instruments[instrumentIndex];
            var wasActive = _this.mainLayer.contains(document.activeElement);
            var activeElement = document.activeElement;
            var colors = ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel);
            for (var i = _this._effectsSelect.childElementCount - 1; i < SynthConfig_1.Config.effectOrder.length; i++) {
                _this._effectsSelect.appendChild(option({ value: i }));
            }
            _this._effectsSelect.selectedIndex = -1;
            for (var i = 0; i < SynthConfig_1.Config.effectOrder.length; i++) {
                var effectFlag = SynthConfig_1.Config.effectOrder[i];
                var selected = ((instrument.effects & (1 << effectFlag)) != 0);
                var label = (selected ? textOnIcon : textOffIcon) + SynthConfig_1.Config.effectNames[effectFlag];
                var option_3 = _this._effectsSelect.children[i + 1];
                if (option_3.textContent != label)
                    option_3.textContent = label;
            }
            setSelectedValue(_this._scaleSelect, _this.doc.song.scale);
            _this._scaleSelect.title = SynthConfig_1.Config.scales[_this.doc.song.scale].realName;
            setSelectedValue(_this._keySelect, SynthConfig_1.Config.keys.length - 1 - _this.doc.song.key);
            _this._octaveStepper.value = Math.round(_this.doc.song.octave).toString();
            _this._tempoSlider.updateValue(Math.max(0, Math.round(_this.doc.song.tempo)));
            _this._tempoStepper.value = Math.round(_this.doc.song.tempo).toString();
            _this._songTitleInputBox.updateValue(_this.doc.song.title);
            if (_this.doc.synth.isFilterModActive(false, 0, 0, true)) {
                _this._songEqFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
            }
            else {
                _this._songEqFilterEditor.render();
            }
            _this._eqFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
            _this._eqFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
            _this._eqFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
            _this._eqFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);
            if (instrument.eqFilterType) {
                _this._eqFilterSimpleButton.classList.remove("deactivated");
                _this._eqFilterAdvancedButton.classList.add("deactivated");
                _this._eqFilterRow.style.display = "none";
                _this._eqFilterSimpleCutRow.style.display = "";
                _this._eqFilterSimplePeakRow.style.display = "";
            }
            else {
                _this._eqFilterSimpleButton.classList.add("deactivated");
                _this._eqFilterAdvancedButton.classList.remove("deactivated");
                _this._eqFilterRow.style.display = "";
                _this._eqFilterSimpleCutRow.style.display = "none";
                _this._eqFilterSimplePeakRow.style.display = "none";
            }
            setSelectedValue(_this._rhythmSelect, _this.doc.song.rhythm);
            if (!_this.doc.song.getChannelIsMod(_this.doc.channel)) {
                _this._customInstrumentSettingsGroup.style.display = "";
                _this._panSliderRow.style.display = "";
                _this._panDropdownGroup.style.display = (_this._openPanDropdown ? "" : "none");
                _this._detuneSliderRow.style.display = "";
                if (prefs.enableTagSearch) {
                    _this._instrumentTagRow.style.display = "";
                }
                _this._instrumentVolumeSliderRow.style.display = "";
                _this._instrumentTypeSelectRow.style.setProperty("display", "");
                if (prefs.instrumentButtonsAtTop) {
                    _this._instrumentSettingsGroup.insertBefore(_this._instrumentExportGroup, _this._instrumentSettingsGroup.firstChild);
                    _this._instrumentSettingsGroup.insertBefore(_this._instrumentCopyGroup, _this._instrumentSettingsGroup.firstChild);
                }
                else {
                    _this._instrumentSettingsGroup.appendChild(_this._instrumentCopyGroup);
                    _this._instrumentSettingsGroup.appendChild(_this._instrumentExportGroup);
                }
                _this._instrumentSettingsGroup.insertBefore(_this._instrumentsButtonRow, _this._instrumentSettingsGroup.firstChild);
                _this._instrumentSettingsGroup.insertBefore(_this._instrumentSettingsTextRow, _this._instrumentSettingsGroup.firstChild);
                if (_this.doc.song.channels[_this.doc.channel].name == "") {
                    _this._instrumentSettingsTextRow.textContent = "Instrument Settings";
                }
                else {
                    _this._instrumentSettingsTextRow.textContent = _this.doc.song.channels[_this.doc.channel].name;
                }
                _this._modulatorGroup.style.display = "none";
                // Check if current viewed pattern on channel is used anywhere
                // + Check if current instrument on channel is used anywhere
                // + Check if a mod targets this
                _this._usageCheck(_this.doc.channel, instrumentIndex);
                if (_this.doc.song.getChannelIsNoise(_this.doc.channel)) {
                    _this._pitchedPresetSelect.style.display = "none";
                    _this._drumPresetSelect.style.display = "";
                    // Also hide select2
                    $("#pitchPresetSelect").parent().hide();
                    $("#drumPresetSelect").parent().show();
                    setSelectedValue(_this._drumPresetSelect, instrument.preset, true);
                }
                else {
                    _this._pitchedPresetSelect.style.display = "";
                    _this._drumPresetSelect.style.display = "none";
                    // Also hide select2
                    $("#pitchPresetSelect").parent().show();
                    $("#drumPresetSelect").parent().hide();
                    setSelectedValue(_this._pitchedPresetSelect, instrument.preset, true);
                }
                if (instrument.type == 2 /* InstrumentType.noise */) {
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    _this._chipNoiseSelectRow.style.display = "";
                    setSelectedValue(_this._chipNoiseSelect, instrument.chipNoise, true);
                }
                else {
                    _this._chipNoiseSelectRow.style.display = "none";
                }
                if (instrument.type == 3 /* InstrumentType.spectrum */) {
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    _this._spectrumRow.style.display = "";
                    _this._spectrumEditor.render();
                }
                else {
                    _this._spectrumRow.style.display = "none";
                }
                if (instrument.type == 5 /* InstrumentType.harmonics */ || instrument.type == 7 /* InstrumentType.pickedString */) {
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    _this._harmonicsRow.style.display = "flex";
                    _this._harmonicsEditor.render();
                }
                else {
                    _this._harmonicsRow.style.display = "none";
                }
                if (instrument.type == 7 /* InstrumentType.pickedString */) {
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    _this._stringSustainRow.style.display = "";
                    _this._stringSustainSlider.updateValue(instrument.stringSustain);
                    _this._stringSustainLabel.textContent = SynthConfig_1.Config.enableAcousticSustain ? "Sustain (" + SynthConfig_1.Config.sustainTypeNames[instrument.stringSustainType].substring(0, 1).toUpperCase() + "):" : "Sustain:";
                }
                else {
                    _this._stringSustainRow.style.display = "none";
                }
                if (instrument.type == 4 /* InstrumentType.drumset */) {
                    _this._drumsetGroup.style.display = "";
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    _this._fadeInOutRow.style.display = "none";
                    for (var i = 0; i < SynthConfig_1.Config.drumCount; i++) {
                        setSelectedValue(_this._drumsetEnvelopeSelects[i], instrument.drumsetEnvelopes[i]);
                        _this._drumsetSpectrumEditors[i].render();
                    }
                }
                else {
                    _this._drumsetGroup.style.display = "none";
                    _this._fadeInOutRow.style.display = "";
                    _this._fadeInOutEditor.render();
                }
                if (instrument.type == 0 /* InstrumentType.chip */) {
                    _this._chipWaveSelectRow.style.display = "";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "";
                    if (instrument.isUsingAdvancedLoopControls) {
                        _this._chipWaveLoopModeSelectRow.style.display = "";
                        _this._chipWaveLoopStartRow.style.display = "";
                        _this._chipWaveLoopEndRow.style.display = "";
                        _this._chipWaveStartOffsetRow.style.display = "";
                        _this._chipWavePlayBackwardsRow.style.display = "";
                    }
                    else {
                        _this._chipWaveLoopModeSelectRow.style.display = "none";
                        _this._chipWaveLoopStartRow.style.display = "none";
                        _this._chipWaveLoopEndRow.style.display = "none";
                        _this._chipWaveStartOffsetRow.style.display = "none";
                        _this._chipWavePlayBackwardsRow.style.display = "none";
                    }
                    // advloop addition
                    setSelectedValue(_this._chipWaveSelect, instrument.chipWave);
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsBox.checked = instrument.isUsingAdvancedLoopControls ? true : false;
                    setSelectedValue(_this._chipWaveLoopModeSelect, instrument.chipWaveLoopMode);
                    _this._chipWaveLoopStartStepper.value = instrument.chipWaveLoopStart + "";
                    // this._chipWaveLoopStartStepper.max = (chipWaveLength - 1) + "";
                    _this._chipWaveLoopEndStepper.value = instrument.chipWaveLoopEnd + "";
                    // this._chipWaveLoopEndStepper.max = (chipWaveLength - 1) + "";
                    _this._chipWaveStartOffsetStepper.value = instrument.chipWaveStartOffset + "";
                    // this._chipWaveStartOffsetStepper.max = (chipWaveLength - 1) + "";
                    _this._chipWavePlayBackwardsBox.checked = instrument.chipWavePlayBackwards ? true : false;
                    // advloop addition
                }
                if (instrument.type == 9 /* InstrumentType.customChipWave */) {
                    _this._customWaveDraw.style.display = "";
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                }
                else {
                    _this._customWaveDraw.style.display = "none";
                }
                if (instrument.type == 8 /* InstrumentType.supersaw */) {
                    _this._supersawDynamismRow.style.display = "";
                    _this._supersawSpreadRow.style.display = "";
                    _this._supersawShapeRow.style.display = "";
                    _this._supersawDynamismSlider.updateValue(instrument.supersawDynamism);
                    _this._supersawSpreadSlider.updateValue(instrument.supersawSpread);
                    _this._supersawShapeSlider.updateValue(instrument.supersawShape);
                }
                else {
                    _this._supersawDynamismRow.style.display = "none";
                    _this._supersawSpreadRow.style.display = "none";
                    _this._supersawShapeRow.style.display = "none";
                }
                if (instrument.type == 6 /* InstrumentType.pwm */ || instrument.type == 8 /* InstrumentType.supersaw */) {
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    _this._pulseWidthRow.style.display = "";
                    _this._pulseWidthSlider.input.title = (0, EditorConfig_1.prettyNumber)(instrument.pulseWidth) + "%";
                    _this._pulseWidthSlider.updateValue(instrument.pulseWidth);
                    // this._decimalOffsetRow.style.display = "";
                    _this._decimalOffsetSlider.input.title = instrument.decimalOffset / 100 <= 0 ? "none" : "-" + (0, EditorConfig_1.prettyNumber)(instrument.decimalOffset / 100) + "%";
                    _this._decimalOffsetSlider.updateValue(99 - instrument.decimalOffset);
                    // this._pulseWidthDropdownGroup.style.display = "";
                    _this._pulseWidthDropdownGroup.style.display = (_this._openPulseWidthDropdown ? "" : "none");
                }
                else {
                    _this._pulseWidthRow.style.display = "none";
                    // this._decimalOffsetRow.style.display = "none";
                    _this._pulseWidthDropdownGroup.style.display = "none";
                }
                if (instrument.type == 1 /* InstrumentType.fm */ || instrument.type == 11 /* InstrumentType.fm6op */) {
                    _this._phaseModGroup.style.display = "";
                    _this._feedbackRow2.style.display = "";
                    _this._chipWaveSelectRow.style.display = "none";
                    // advloop addition
                    _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                    _this._chipWaveLoopModeSelectRow.style.display = "none";
                    _this._chipWaveLoopStartRow.style.display = "none";
                    _this._chipWaveLoopEndRow.style.display = "none";
                    _this._chipWaveStartOffsetRow.style.display = "none";
                    _this._chipWavePlayBackwardsRow.style.display = "none";
                    // advloop addition
                    setSelectedValue(_this._algorithmSelect, instrument.algorithm);
                    setSelectedValue(_this._feedbackTypeSelect, instrument.feedbackType);
                    _this._feedbackAmplitudeSlider.updateValue(instrument.feedbackAmplitude);
                    for (var i = 0; i < SynthConfig_1.Config.operatorCount + (instrument.type == 11 /* InstrumentType.fm6op */ ? 2 : 0); i++) {
                        var isCarrier = instrument.type == 1 /* InstrumentType.fm */ ? (i < SynthConfig_1.Config.algorithms[instrument.algorithm].carrierCount) : (i < instrument.customAlgorithm.carrierCount);
                        _this._operatorRows[i].style.color = isCarrier ? ColorConfig_1.ColorConfig.primaryText : "";
                        setSelectedValue(_this._operatorFrequencySelects[i], instrument.operators[i].frequency);
                        _this._operatorAmplitudeSliders[i].updateValue(instrument.operators[i].amplitude);
                        setSelectedValue(_this._operatorWaveformSelects[i], instrument.operators[i].waveform);
                        _this._operatorWaveformPulsewidthSliders[i].updateValue(instrument.operators[i].pulseWidth);
                        _this._operatorWaveformPulsewidthSliders[i].input.title = "" + SynthConfig_1.Config.pwmOperatorWaves[instrument.operators[i].pulseWidth].name;
                        _this._operatorDropdownGroups[i].style.color = isCarrier ? ColorConfig_1.ColorConfig.primaryText : "";
                        var operatorName = (isCarrier ? "Voice " : "Modulator ") + (i + 1);
                        _this._operatorFrequencySelects[i].title = operatorName + " Frequency";
                        _this._operatorAmplitudeSliders[i].input.title = operatorName + (isCarrier ? " Volume" : " Amplitude");
                        _this._operatorDropdownGroups[i].style.display = (_this._openOperatorDropdowns[i] ? "" : "none");
                        if (instrument.operators[i].waveform == 2) {
                            _this._operatorWaveformPulsewidthSliders[i].container.style.display = "";
                            _this._operatorWaveformHints[i].style.display = "none";
                        }
                        else {
                            _this._operatorWaveformPulsewidthSliders[i].container.style.display = "none";
                            _this._operatorWaveformHints[i].style.display = "";
                        }
                    }
                    if (instrument.type == 11 /* InstrumentType.fm6op */) {
                        setSelectedValue(_this._algorithm6OpSelect, instrument.algorithm6Op);
                        setSelectedValue(_this._feedback6OpTypeSelect, instrument.feedbackType6Op);
                        _this._customAlgorithmCanvas.redrawCanvas();
                        _this._algorithm6OpSelectRow.style.display = "";
                        _this._feedback6OpRow1.style.display = "";
                        _this._operatorRows[4].style.display = "";
                        _this._operatorRows[5].style.display = "";
                        _this._operatorDropdownGroups[4].style.display = (_this._openOperatorDropdowns[4] ? "" : "none");
                        _this._operatorDropdownGroups[5].style.display = (_this._openOperatorDropdowns[5] ? "" : "none");
                        _this._algorithmSelectRow.style.display = "none";
                        _this._feedbackRow1.style.display = "none";
                    }
                    else {
                        _this._algorithm6OpSelectRow.style.display = "none";
                        _this._feedback6OpRow1.style.display = "none";
                        _this._operatorRows[4].style.display = "none";
                        _this._operatorRows[5].style.display = "none";
                        _this._operatorDropdownGroups[4].style.display = "none";
                        _this._operatorDropdownGroups[5].style.display = "none";
                        _this._feedbackRow1.style.display = "";
                        _this._algorithmSelectRow.style.display = "";
                    }
                }
                else {
                    _this._algorithm6OpSelectRow.style.display = "none";
                    _this._feedback6OpRow1.style.display = "none";
                    _this._algorithmSelectRow.style.display = "none";
                    _this._phaseModGroup.style.display = "none";
                    _this._feedbackRow1.style.display = "none";
                    _this._feedbackRow2.style.display = "none";
                }
                _this._pulseWidthSlider.input.title = (0, EditorConfig_1.prettyNumber)(instrument.pulseWidth) + "%";
                if ((0, SynthConfig_1.effectsIncludeTransition)(instrument.effects)) {
                    _this._transitionRow.style.display = "";
                    if (_this._openTransitionDropdown)
                        _this._transitionDropdownGroup.style.display = "";
                    setSelectedValue(_this._transitionSelect, instrument.transition);
                }
                else {
                    _this._transitionDropdownGroup.style.display = "none";
                    _this._transitionRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeChord)(instrument.effects)) {
                    _this._chordSelectRow.style.display = "flex";
                    _this._chordDropdown.style.display = instrument.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index ? "" : "none";
                    if (_this._openChordDropdown) {
                        if (instrument.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index) {
                            _this._chordDropdownGroup.style.display = "";
                        }
                        else if (instrument.chord == SynthConfig_1.Config.chords.dictionary["monophonic"].index) {
                            _this._chordDropdownGroup.style.display = "";
                            setSelectedValue(_this._chordSelect, instrument.chord);
                        }
                        else {
                            _this._chordDropdownGroup.style.display = "none";
                        }
                    }
                    if (instrument.chord == SynthConfig_1.Config.chords.dictionary["monophonic"].index) {
                        _this._monophonicNoteInputBox.value = instrument.monoChordTone + 1 + "";
                        _this._monophonicNoteInputBox.style.display = "";
                        _this._chordSelectContainer.style.width = "52.5%";
                    }
                    else {
                        _this._monophonicNoteInputBox.style.display = "none";
                        _this._chordSelectContainer.style.width = "61.5%";
                    }
                }
                else {
                    _this._chordSelectRow.style.display = "none";
                    _this._chordDropdown.style.display = "none";
                    _this._chordDropdownGroup.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludePitchShift)(instrument.effects)) {
                    _this._pitchShiftRow.style.display = "";
                    _this._pitchShiftSlider.updateValue(instrument.pitchShift);
                    _this._pitchShiftSlider.input.title = (instrument.pitchShift - SynthConfig_1.Config.pitchShiftCenter) + " semitone(s)";
                    for (var _i = 0, _a = _this._pitchShiftFifthMarkers; _i < _a.length; _i++) {
                        var marker = _a[_i];
                        marker.style.display = prefs.showFifth ? "" : "none";
                    }
                }
                else {
                    _this._pitchShiftRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeDetune)(instrument.effects)) {
                    _this._detuneSliderRow.style.display = "";
                    _this._detuneSlider.updateValue(instrument.detune - SynthConfig_1.Config.detuneCenter);
                    _this._detuneSlider.input.title = (synth_1.Synth.detuneToCents(instrument.detune)) + " cent(s)";
                }
                else {
                    _this._detuneSliderRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeVibrato)(instrument.effects)) {
                    _this._vibratoSelectRow.style.display = "";
                    if (_this._openVibratoDropdown)
                        _this._vibratoDropdownGroup.style.display = "";
                    setSelectedValue(_this._vibratoSelect, instrument.vibrato);
                }
                else {
                    _this._vibratoDropdownGroup.style.display = "none";
                    _this._vibratoSelectRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeNoteFilter)(instrument.effects)) {
                    _this._noteFilterTypeRow.style.setProperty("--text-color-lit", colors.primaryNote);
                    _this._noteFilterTypeRow.style.setProperty("--text-color-dim", colors.secondaryNote);
                    _this._noteFilterTypeRow.style.setProperty("--background-color-lit", colors.primaryChannel);
                    _this._noteFilterTypeRow.style.setProperty("--background-color-dim", colors.secondaryChannel);
                    _this._noteFilterTypeRow.style.display = "";
                    if (_this.doc.synth.isFilterModActive(true, _this.doc.channel, _this.doc.getCurrentInstrument())) {
                        _this._noteFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
                    }
                    else {
                        _this._noteFilterEditor.render();
                    }
                    if (instrument.noteFilterType) {
                        _this._noteFilterSimpleButton.classList.remove("deactivated");
                        _this._noteFilterAdvancedButton.classList.add("deactivated");
                        _this._noteFilterRow.style.display = "none";
                        _this._noteFilterSimpleCutRow.style.display = "";
                        _this._noteFilterSimplePeakRow.style.display = "";
                    }
                    else {
                        _this._noteFilterSimpleButton.classList.add("deactivated");
                        _this._noteFilterAdvancedButton.classList.remove("deactivated");
                        _this._noteFilterRow.style.display = "";
                        _this._noteFilterSimpleCutRow.style.display = "none";
                        _this._noteFilterSimplePeakRow.style.display = "none";
                    }
                }
                else {
                    _this._noteFilterRow.style.display = "none";
                    _this._noteFilterSimpleCutRow.style.display = "none";
                    _this._noteFilterSimplePeakRow.style.display = "none";
                    _this._noteFilterTypeRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeDistortion)(instrument.effects)) {
                    _this._distortionRow.style.display = "";
                    if (instrument.type == 0 /* InstrumentType.chip */ || instrument.type == 9 /* InstrumentType.customChipWave */ || instrument.type == 6 /* InstrumentType.pwm */ || instrument.type == 8 /* InstrumentType.supersaw */)
                        _this._aliasingRow.style.display = "";
                    else
                        _this._aliasingRow.style.display = "none";
                    _this._distortionSlider.updateValue(instrument.distortion);
                }
                else {
                    _this._distortionRow.style.display = "none";
                    _this._aliasingRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeBitcrusher)(instrument.effects)) {
                    _this._bitcrusherQuantizationRow.style.display = "";
                    _this._bitcrusherFreqRow.style.display = "";
                    _this._bitcrusherQuantizationSlider.updateValue(instrument.bitcrusherQuantization);
                    _this._bitcrusherFreqSlider.updateValue(instrument.bitcrusherFreq);
                }
                else {
                    _this._bitcrusherQuantizationRow.style.display = "none";
                    _this._bitcrusherFreqRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludePanning)(instrument.effects)) {
                    _this._panSliderRow.style.display = "";
                    if (_this._openPanDropdown)
                        _this._panDropdownGroup.style.display = "";
                    _this._panSlider.updateValue(instrument.pan);
                }
                else {
                    _this._panSliderRow.style.display = "none";
                    _this._panDropdownGroup.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeChorus)(instrument.effects)) {
                    _this._chorusRow.style.display = "";
                    _this._chorusSlider.updateValue(instrument.chorus);
                }
                else {
                    _this._chorusRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeEcho)(instrument.effects)) {
                    _this._echoSustainRow.style.display = "";
                    _this._echoSustainSlider.updateValue(instrument.echoSustain);
                    _this._echoDelayRow.style.display = "";
                    _this._echoDelaySlider.updateValue(instrument.echoDelay);
                    _this._echoDelaySlider.input.title = (Math.round((instrument.echoDelay + 1) * SynthConfig_1.Config.echoDelayStepTicks / (SynthConfig_1.Config.ticksPerPart * SynthConfig_1.Config.partsPerBeat) * 1000) / 1000) + " beat(s)";
                }
                else {
                    _this._echoSustainRow.style.display = "none";
                    _this._echoDelayRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeReverb)(instrument.effects)) {
                    _this._reverbRow.style.display = "";
                    _this._reverbSlider.updateValue(instrument.reverb);
                }
                else {
                    _this._reverbRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeRingModulation)(instrument.effects)) {
                    _this._ringModContainerRow.style.display = "";
                    _this._ringModSlider.updateValue(instrument.ringModulation);
                    _this._ringModHzSlider.updateValue(instrument.ringModulationHz);
                    setSelectedValue(_this._ringModWaveSelect, instrument.ringModWaveformIndex);
                    _this._ringModPulsewidthSlider.updateValue(instrument.ringModPulseWidth);
                }
                else {
                    _this._ringModContainerRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeGranular)(instrument.effects)) {
                    _this._granularContainerRow.style.display = "";
                    _this._granularSlider.updateValue(instrument.granular);
                    _this._grainSizeSlider.updateValue(instrument.grainSize);
                    _this._grainAmountsSlider.updateValue(instrument.grainAmounts);
                    _this._grainRangeSlider.updateValue(instrument.grainRange);
                }
                else {
                    _this._granularContainerRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludePhaser)(instrument.effects)) {
                    _this._phaserMixRow.style.display = "";
                    _this._phaserMixSlider.updateValue(instrument.phaserMix);
                    _this._phaserFreqRow.style.display = "";
                    _this._phaserFreqSlider.updateValue(instrument.phaserFreq);
                    _this._phaserFeedbackRow.style.display = "";
                    _this._phaserFeedbackSlider.updateValue(instrument.phaserFeedback);
                    _this._phaserStagesRow.style.display = "";
                    _this._phaserStagesSlider.updateValue(instrument.phaserStages);
                }
                else {
                    _this._phaserMixRow.style.display = "none";
                    _this._phaserFreqRow.style.display = "none";
                    _this._phaserFeedbackRow.style.display = "none";
                    _this._phaserStagesRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeInvertWave)(instrument.effects)) {
                    _this._invertWaveRow.style.display = "";
                }
                else {
                    _this._invertWaveRow.style.display = "none";
                }
                if ((0, SynthConfig_1.effectsIncludeNoteRange)(instrument.effects)) {
                    _this._upperNoteLimitRow.style.display = "";
                    _this._lowerNoteLimitRow.style.display = "";
                    _this._upperNoteLimitInputBox.value = String(instrument.upperNoteLimit);
                    _this._lowerNoteLimitInputBox.value = String(instrument.lowerNoteLimit);
                }
                else {
                    _this._upperNoteLimitRow.style.display = "none";
                    _this._lowerNoteLimitRow.style.display = "none";
                }
                if (instrument.type == 0 /* InstrumentType.chip */ || instrument.type == 9 /* InstrumentType.customChipWave */ || instrument.type == 5 /* InstrumentType.harmonics */ || instrument.type == 7 /* InstrumentType.pickedString */ || instrument.type == 3 /* InstrumentType.spectrum */ || instrument.type == 6 /* InstrumentType.pwm */ || instrument.type == 2 /* InstrumentType.noise */ || instrument.type == 4 /* InstrumentType.drumset */ /*|| instrument.type == InstrumentType.supersaw*/) {
                    _this._unisonSelectRow.style.display = "";
                    setSelectedValue(_this._unisonSelect, instrument.unison);
                    _this._unisonVoicesInputBox.value = instrument.unisonVoices + "";
                    _this._unisonSpreadInputBox.value = instrument.unisonSpread + "";
                    _this._unisonOffsetInputBox.value = instrument.unisonOffset + "";
                    _this._unisonExpressionInputBox.value = instrument.unisonExpression + "";
                    _this._unisonSignInputBox.value = instrument.unisonSign + "";
                    _this._unisonDropdownGroup.style.display = (_this._openUnisonDropdown ? "" : "none");
                }
                else {
                    _this._unisonSelectRow.style.display = "none";
                    _this._unisonDropdownGroup.style.display = "none";
                }
                if (_this._openEnvelopeDropdown)
                    _this._envelopeDropdownGroup.style.display = "";
                else
                    _this._envelopeDropdownGroup.style.display = "none";
                _this.envelopeEditor.render();
                _this.envelopeEditor.rerenderExtraSettings();
                for (var chordIndex = 0; chordIndex < SynthConfig_1.Config.chords.length; chordIndex++) {
                    var hidden = (!SynthConfig_1.Config.instrumentTypeHasSpecialInterval[instrument.type] && SynthConfig_1.Config.chords[chordIndex].customInterval);
                    var option_4 = _this._chordSelect.children[chordIndex];
                    if (hidden) {
                        if (!option_4.hasAttribute("hidden")) {
                            option_4.setAttribute("hidden", "");
                        }
                    }
                    else {
                        option_4.removeAttribute("hidden");
                    }
                }
                _this._instrumentSettingsGroup.style.color = ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel).primaryNote;
                setSelectedValue(_this._transitionSelect, instrument.transition);
                setSelectedValue(_this._vibratoSelect, instrument.vibrato);
                setSelectedValue(_this._vibratoTypeSelect, instrument.vibratoType);
                setSelectedValue(_this._chordSelect, instrument.chord);
                _this._panSliderInputBox.value = instrument.pan + "";
                _this._pwmSliderInputBox.value = instrument.pulseWidth + "";
                _this._detuneSliderInputBox.value = (instrument.detune - SynthConfig_1.Config.detuneCenter) + "";
                _this.ringModHzNum.innerHTML = " (" + (0, SynthConfig_1.calculateRingModHertz)(instrument.ringModulationHz / (SynthConfig_1.Config.ringModHzRange - 1)) + ")";
                _this.grainSizeNum.innerHTML = " (" + instrument.grainSize * SynthConfig_1.Config.grainSizeStep + ")";
                _this.grainRangeNum.innerHTML = " (" + instrument.grainRange * SynthConfig_1.Config.grainSizeStep + ")";
                _this._instrumentVolumeSlider.updateValue(instrument.volume);
                _this._instrumentVolumeSliderInputBox.value = "" + (instrument.volume);
                _this._vibratoDepthSlider.updateValue(Math.round(instrument.vibratoDepth * 25));
                _this._vibratoDelaySlider.updateValue(Math.round(instrument.vibratoDelay));
                _this._vibratoSpeedSlider.updateValue(instrument.vibratoSpeed);
                setSelectedValue(_this._vibratoTypeSelect, instrument.vibratoType);
                _this._arpeggioSpeedSlider.updateValue(instrument.arpeggioSpeed);
                _this._panDelaySlider.updateValue(instrument.panDelay);
                _this._vibratoDelaySlider.input.title = "" + Math.round(instrument.vibratoDelay);
                _this._vibratoDepthSlider.input.title = "" + instrument.vibratoDepth;
                _this._vibratoSpeedSlider.input.title = "x" + instrument.vibratoSpeed / 10;
                _this._vibratoSpeedDisplay.textContent = "x" + instrument.vibratoSpeed / 10;
                _this._panDelaySlider.input.title = "" + instrument.panDelay;
                _this._arpeggioSpeedSlider.input.title = "x" + (0, EditorConfig_1.prettyNumber)(SynthConfig_1.Config.arpSpeedScale[instrument.arpeggioSpeed]);
                _this._arpeggioSpeedDisplay.textContent = "x" + (0, EditorConfig_1.prettyNumber)(SynthConfig_1.Config.arpSpeedScale[instrument.arpeggioSpeed]);
                _this._eqFilterSimpleCutSlider.updateValue(instrument.eqFilterSimpleCut);
                _this._eqFilterSimplePeakSlider.updateValue(instrument.eqFilterSimplePeak);
                _this._noteFilterSimpleCutSlider.updateValue(instrument.noteFilterSimpleCut);
                _this._noteFilterSimplePeakSlider.updateValue(instrument.noteFilterSimplePeak);
                _this._envelopeSpeedSlider.updateValue(instrument.envelopeSpeed);
                _this._envelopeSpeedSlider.input.title = "x" + (0, EditorConfig_1.prettyNumber)(SynthConfig_1.Config.arpSpeedScale[instrument.envelopeSpeed]);
                _this._envelopeSpeedDisplay.textContent = "x" + (0, EditorConfig_1.prettyNumber)(SynthConfig_1.Config.arpSpeedScale[instrument.envelopeSpeed]);
                _this._upperNoteLimitRow.firstChild.textContent = "Upper Note Limit [" + Piano_1.Piano.getPitchNameAlwaysOctave((instrument.upperNoteLimit + SynthConfig_1.Config.keys[_this.doc.song.key].basePitch) % SynthConfig_1.Config.pitchesPerOctave, instrument.upperNoteLimit, _this.doc.song.octave)
                    + "]:";
                _this._lowerNoteLimitRow.firstChild.textContent = "Lower Note Limit [" + Piano_1.Piano.getPitchNameAlwaysOctave((instrument.lowerNoteLimit + SynthConfig_1.Config.keys[_this.doc.song.key].basePitch) % SynthConfig_1.Config.pitchesPerOctave, instrument.lowerNoteLimit, _this.doc.song.octave)
                    + "]:";
                if (instrument.type == 9 /* InstrumentType.customChipWave */) {
                    _this._customWaveDrawCanvas.redrawCanvas();
                    if (_this.prompt instanceof CustomChipPrompt_1.CustomChipPrompt) {
                        _this.prompt.customChipCanvas.render();
                    }
                }
                _this._renderInstrumentBar(channel, instrumentIndex, colors);
            } // Options for mod channel
            else {
                _this._usageCheck(_this.doc.channel, instrumentIndex);
                _this._pitchedPresetSelect.style.display = "none";
                _this._drumPresetSelect.style.display = "none";
                $("#pitchPresetSelect").parent().hide();
                $("#drumPresetSelect").parent().hide();
                if (prefs.instrumentButtonsAtTop) {
                    _this._modulatorGroup.insertBefore(_this._instrumentExportGroup, _this._modulatorGroup.firstChild);
                    _this._modulatorGroup.insertBefore(_this._instrumentCopyGroup, _this._modulatorGroup.firstChild);
                }
                else {
                    _this._modulatorGroup.appendChild(_this._instrumentCopyGroup);
                    _this._modulatorGroup.appendChild(_this._instrumentExportGroup);
                }
                _this._modulatorGroup.insertBefore(_this._instrumentsButtonRow, _this._modulatorGroup.firstChild);
                _this._modulatorGroup.insertBefore(_this._instrumentSettingsTextRow, _this._modulatorGroup.firstChild);
                if (_this.doc.song.channels[_this.doc.channel].name == "") {
                    _this._instrumentSettingsTextRow.textContent = "Modulator Settings";
                }
                else {
                    _this._instrumentSettingsTextRow.textContent = _this.doc.song.channels[_this.doc.channel].name;
                }
                _this._chipNoiseSelectRow.style.display = "none";
                _this._chipWaveSelectRow.style.display = "none";
                // advloop addition
                _this._useChipWaveAdvancedLoopControlsRow.style.display = "none";
                _this._chipWaveLoopModeSelectRow.style.display = "none";
                _this._chipWaveLoopStartRow.style.display = "none";
                _this._chipWaveLoopEndRow.style.display = "none";
                _this._chipWaveStartOffsetRow.style.display = "none";
                _this._chipWavePlayBackwardsRow.style.display = "none";
                // advloop addition
                _this._spectrumRow.style.display = "none";
                _this._harmonicsRow.style.display = "none";
                _this._transitionRow.style.display = "none";
                _this._chordSelectRow.style.display = "none";
                _this._chordDropdownGroup.style.display = "none";
                //this._filterCutoffRow.style.display = "none";
                //this._filterResonanceRow.style.display = "none";
                //this._filterEnvelopeRow.style.display = "none";
                _this._drumsetGroup.style.display = "none";
                _this._customWaveDraw.style.display = "none";
                _this._supersawDynamismRow.style.display = "none";
                _this._supersawSpreadRow.style.display = "none";
                _this._supersawShapeRow.style.display = "none";
                _this._algorithmSelectRow.style.display = "none";
                _this._phaseModGroup.style.display = "none";
                _this._feedbackRow1.style.display = "none";
                _this._feedbackRow2.style.display = "none";
                //this._pulseEnvelopeRow.style.display = "none";
                _this._pulseWidthRow.style.display = "none";
                // this._decimalOffsetRow.style.display = "none";
                _this._vibratoSelectRow.style.display = "none";
                _this._vibratoDropdownGroup.style.display = "none";
                _this._envelopeDropdownGroup.style.display = "none";
                //this._intervalSelectRow.style.display = "none";
                _this._detuneSliderRow.style.display = "none";
                _this._panSliderRow.style.display = "none";
                _this._panDropdownGroup.style.display = "none";
                _this._pulseWidthDropdownGroup.style.display = "none";
                _this._unisonDropdownGroup.style.display = "none";
                _this._modulatorGroup.style.display = "";
                _this._modulatorGroup.style.color = ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel).primaryNote;
                for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                    var instrument_1 = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
                    var modChannel = Math.max(0, instrument_1.modChannels[mod]);
                    var modInstrument = instrument_1.modInstruments[mod];
                    // Boundary checking
                    if (modInstrument >= _this.doc.song.channels[modChannel].instruments.length + 2 || (modInstrument > 0 && _this.doc.song.channels[modChannel].instruments.length <= 1)) {
                        modInstrument = 0;
                        instrument_1.modInstruments[mod] = 0;
                    }
                    if (modChannel >= _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount) {
                        instrument_1.modInstruments[mod] = 0;
                        instrument_1.modulators[mod] = 0;
                    }
                    // Build options for modulator channels (make sure it has the right number).
                    if (_this.doc.recalcChannelNames || (_this._modChannelBoxes[mod].children.length != 2 + _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount)) {
                        while (_this._modChannelBoxes[mod].firstChild)
                            _this._modChannelBoxes[mod].remove(0);
                        var channelList = [];
                        channelList.push("none");
                        channelList.push("song");
                        for (var i = 0; i < _this.doc.song.pitchChannelCount; i++) {
                            if (_this.doc.song.channels[i].name == "") {
                                channelList.push("pitch " + (i + 1));
                            }
                            else {
                                channelList.push(_this.doc.song.channels[i].name);
                            }
                        }
                        for (var i = 0; i < _this.doc.song.noiseChannelCount; i++) {
                            if (_this.doc.song.channels[i + _this.doc.song.pitchChannelCount].name == "") {
                                channelList.push("noise " + (i + 1));
                            }
                            else {
                                channelList.push(_this.doc.song.channels[i + _this.doc.song.pitchChannelCount].name);
                            }
                        }
                        buildOptions(_this._modChannelBoxes[mod], channelList);
                    }
                    // Set selected index based on channel info.
                    _this._modChannelBoxes[mod].selectedIndex = instrument_1.modChannels[mod] + 2; // Offset to get to first pitch channel
                    var channel_2 = _this.doc.song.channels[modChannel];
                    // Build options for modulator instruments (make sure it has the right number).
                    if (_this._modInstrumentBoxes[mod].children.length != channel_2.instruments.length + 2) {
                        while (_this._modInstrumentBoxes[mod].firstChild)
                            _this._modInstrumentBoxes[mod].remove(0);
                        var instrumentList = [];
                        for (var i = 0; i < channel_2.instruments.length; i++) {
                            instrumentList.push("" + i + 1);
                        }
                        instrumentList.push("all");
                        instrumentList.push("active");
                        buildOptions(_this._modInstrumentBoxes[mod], instrumentList);
                    }
                    // If non-zero pattern, point to which instrument(s) is/are the current
                    if (channel_2.bars[_this.doc.bar] > 0) {
                        var usedInstruments = channel_2.patterns[channel_2.bars[_this.doc.bar] - 1].instruments;
                        for (var i = 0; i < channel_2.instruments.length; i++) {
                            if (usedInstruments.includes(i)) {
                                _this._modInstrumentBoxes[mod].options[i].label = "🢒" + (i + 1);
                            }
                            else {
                                _this._modInstrumentBoxes[mod].options[i].label = "" + (i + 1);
                            }
                        }
                    }
                    else {
                        for (var i = 0; i < channel_2.instruments.length; i++) {
                            _this._modInstrumentBoxes[mod].options[i].label = "" + (i + 1);
                        }
                    }
                    // Set selected index based on instrument info.
                    _this._modInstrumentBoxes[mod].selectedIndex = instrument_1.modInstruments[mod];
                    // Build options for modulator settings (based on channel settings)
                    if (instrument_1.modChannels[mod] != -2) {
                        while (_this._modSetBoxes[mod].firstChild)
                            _this._modSetBoxes[mod].remove(0);
                        var settingList = [];
                        var unusedSettingList = [];
                        // Make sure these names match the names declared for modulators in SynthConfig.ts.
                        settingList.push("none");
                        // Populate mod setting options for the song scope.
                        if (instrument_1.modChannels[mod] == -1) {
                            settingList.push("song volume");
                            settingList.push("tempo");
                            settingList.push("song reverb");
                            settingList.push("next bar");
                            settingList.push("song detune");
                            settingList.push("song eq");
                        }
                        // Populate mod setting options for instrument scope.
                        else {
                            settingList.push("note volume");
                            settingList.push("mix volume");
                            // Build a list of target instrument indices, types and other info. It will be a single type for a single instrument, but with "all" and "active" it could be more.
                            // All or active are included together. Active allows any to be set, just in case the user fiddles with which are active later.
                            var tgtInstrumentTypes = [];
                            var anyInstrumentAdvancedEQ = false, anyInstrumentSimpleEQ = false, anyInstrumentAdvancedNote = false, anyInstrumentSimpleNote = false, anyInstrumentArps = false, anyInstrumentPitchShifts = false, anyInstrumentDetunes = false, anyInstrumentVibratos = false, anyInstrumentNoteFilters = false, anyInstrumentDistorts = false, anyInstrumentBitcrushes = false, anyInstrumentPans = false, anyInstrumentChorus = false, anyInstrumentEchoes = false, anyInstrumentReverbs = false, anyInstrumentRingMods = false, anyInstrumentGranulars = false, anyInstrumentPhasers = false, anyInstrumentHasEnvelopes = false;
                            var allInstrumentPitchShifts = true, allInstrumentNoteFilters = true, allInstrumentDetunes = true, allInstrumentVibratos = true, allInstrumentDistorts = true, allInstrumentBitcrushes = true, allInstrumentPans = true, allInstrumentChorus = true, allInstrumentEchoes = true, allInstrumentReverbs = true, allInstrumentRingMods = true, anyInstrumentInvertWave = true, allInstrumentGranulars = true;
                            var instrumentCandidates = [];
                            if (modInstrument >= channel_2.instruments.length) {
                                for (var i = 0; i < channel_2.instruments.length; i++) {
                                    instrumentCandidates.push(i);
                                }
                            }
                            else {
                                instrumentCandidates.push(modInstrument);
                            }
                            for (var i = 0; i < instrumentCandidates.length; i++) {
                                var instrumentIndex_1 = instrumentCandidates[i];
                                if (!tgtInstrumentTypes.includes(channel_2.instruments[instrumentIndex_1].type))
                                    tgtInstrumentTypes.push(channel_2.instruments[instrumentIndex_1].type);
                                if (channel_2.instruments[instrumentIndex_1].eqFilterType)
                                    anyInstrumentSimpleEQ = true;
                                else
                                    anyInstrumentAdvancedEQ = true;
                                if ((0, SynthConfig_1.effectsIncludeChord)(channel_2.instruments[instrumentIndex_1].effects) && channel_2.instruments[instrumentIndex_1].getChord().arpeggiates) {
                                    anyInstrumentArps = true;
                                }
                                if ((0, SynthConfig_1.effectsIncludePitchShift)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentPitchShifts = true;
                                }
                                else {
                                    allInstrumentPitchShifts = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeDetune)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentDetunes = true;
                                }
                                else {
                                    allInstrumentDetunes = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeVibrato)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentVibratos = true;
                                }
                                else {
                                    allInstrumentVibratos = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeNoteFilter)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentNoteFilters = true;
                                    if (channel_2.instruments[instrumentIndex_1].noteFilterType)
                                        anyInstrumentSimpleNote = true;
                                    else
                                        anyInstrumentAdvancedNote = true;
                                }
                                else {
                                    allInstrumentNoteFilters = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeDistortion)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentDistorts = true;
                                }
                                else {
                                    allInstrumentDistorts = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeBitcrusher)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentBitcrushes = true;
                                }
                                else {
                                    allInstrumentBitcrushes = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludePanning)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentPans = true;
                                }
                                else {
                                    allInstrumentPans = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeChorus)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentChorus = true;
                                }
                                else {
                                    allInstrumentChorus = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeEcho)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentEchoes = true;
                                }
                                else {
                                    allInstrumentEchoes = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeReverb)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentReverbs = true;
                                }
                                else {
                                    allInstrumentReverbs = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeRingModulation)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentRingMods = true;
                                }
                                else {
                                    allInstrumentRingMods = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeGranular)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentGranulars = true;
                                }
                                else {
                                    allInstrumentGranulars = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludePhaser)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentPhasers = true;
                                }
                                else {
                                    anyInstrumentPhasers = false;
                                }
                                if ((0, SynthConfig_1.effectsIncludeInvertWave)(channel_2.instruments[instrumentIndex_1].effects)) {
                                    anyInstrumentInvertWave = true;
                                }
                                else {
                                    anyInstrumentInvertWave = false;
                                }
                                if (channel_2.instruments[instrumentIndex_1].envelopes.length > 0) {
                                    anyInstrumentHasEnvelopes = true;
                                }
                            }
                            if (anyInstrumentAdvancedEQ) {
                                settingList.push("eq filter");
                            }
                            if (anyInstrumentSimpleEQ) {
                                settingList.push("eq filt cut");
                                settingList.push("eq filt peak");
                            }
                            if (tgtInstrumentTypes.includes(1 /* InstrumentType.fm */)) {
                                settingList.push("fm slider 1");
                                settingList.push("fm slider 2");
                                settingList.push("fm slider 3");
                                settingList.push("fm slider 4");
                                settingList.push("fm feedback");
                            }
                            if (tgtInstrumentTypes.includes(11 /* InstrumentType.fm6op */)) {
                                settingList.push("fm slider 1");
                                settingList.push("fm slider 2");
                                settingList.push("fm slider 3");
                                settingList.push("fm slider 4");
                                settingList.push("fm slider 5");
                                settingList.push("fm slider 6");
                                settingList.push("fm feedback");
                            }
                            if (tgtInstrumentTypes.includes(6 /* InstrumentType.pwm */) || tgtInstrumentTypes.includes(8 /* InstrumentType.supersaw */)) {
                                settingList.push("pulse width");
                                settingList.push("decimal offset");
                            }
                            if (tgtInstrumentTypes.includes(8 /* InstrumentType.supersaw */)) {
                                settingList.push("dynamism");
                                settingList.push("spread");
                                settingList.push("saw shape");
                            }
                            if (tgtInstrumentTypes.includes(7 /* InstrumentType.pickedString */)) {
                                settingList.push("sustain");
                            }
                            if (anyInstrumentArps) {
                                settingList.push("arp speed");
                                settingList.push("reset arp");
                            }
                            if (anyInstrumentPitchShifts) {
                                settingList.push("pitch shift");
                            }
                            if (!allInstrumentPitchShifts) {
                                unusedSettingList.push("+ pitch shift");
                            }
                            if (anyInstrumentDetunes) {
                                settingList.push("detune");
                            }
                            if (!allInstrumentDetunes) {
                                unusedSettingList.push("+ detune");
                            }
                            if (anyInstrumentVibratos) {
                                settingList.push("vibrato depth");
                                settingList.push("vibrato speed");
                                settingList.push("vibrato delay");
                            }
                            if (!allInstrumentVibratos) {
                                unusedSettingList.push("+ vibrato depth");
                                unusedSettingList.push("+ vibrato speed");
                                unusedSettingList.push("+ vibrato delay");
                            }
                            if (anyInstrumentNoteFilters) {
                                if (anyInstrumentAdvancedNote) {
                                    settingList.push("note filter");
                                }
                                if (anyInstrumentSimpleNote) {
                                    settingList.push("note filt cut");
                                    settingList.push("note filt peak");
                                }
                            }
                            if (!allInstrumentNoteFilters) {
                                unusedSettingList.push("+ note filter");
                            }
                            if (anyInstrumentDistorts) {
                                settingList.push("distortion");
                            }
                            if (!allInstrumentDistorts) {
                                unusedSettingList.push("+ distortion");
                            }
                            if (anyInstrumentBitcrushes) {
                                settingList.push("bit crush");
                                settingList.push("freq crush");
                            }
                            if (!allInstrumentBitcrushes) {
                                unusedSettingList.push("+ bit crush");
                                unusedSettingList.push("+ freq crush");
                            }
                            if (anyInstrumentPans) {
                                settingList.push("pan");
                                settingList.push("pan delay");
                            }
                            if (!allInstrumentPans) {
                                unusedSettingList.push("+ pan");
                                unusedSettingList.push("+ pan delay");
                            }
                            if (anyInstrumentChorus) {
                                settingList.push("chorus");
                            }
                            if (!allInstrumentChorus) {
                                unusedSettingList.push("+ chorus");
                            }
                            if (anyInstrumentEchoes) {
                                settingList.push("echo");
                                // Still need to look into this...
                                settingList.push("echo delay");
                            }
                            if (!allInstrumentEchoes) {
                                unusedSettingList.push("+ echo");
                                unusedSettingList.push("+ echo delay");
                            }
                            if (anyInstrumentReverbs) {
                                settingList.push("reverb");
                            }
                            if (!allInstrumentReverbs) {
                                unusedSettingList.push("+ reverb");
                            }
                            if (anyInstrumentRingMods) {
                                settingList.push("ring modulation");
                                settingList.push("ring mod hertz");
                            }
                            if (!allInstrumentRingMods) {
                                unusedSettingList.push("+ ring modulation");
                                unusedSettingList.push("+ ring mod hertz");
                            }
                            if (anyInstrumentGranulars) {
                                settingList.push("granular");
                                settingList.push("grain freq");
                                settingList.push("grain size");
                                settingList.push("grain range");
                            }
                            if (!allInstrumentGranulars) {
                                unusedSettingList.push("+ granular");
                                unusedSettingList.push("+ grain freq");
                                unusedSettingList.push("+ grain size");
                                unusedSettingList.push("+ grain range");
                            }
                            if (anyInstrumentPhasers) {
                                settingList.push("phaser");
                                settingList.push("phaser frequency");
                                settingList.push("phaser feedback");
                                settingList.push("phaser stages");
                            }
                            if (anyInstrumentInvertWave) {
                                settingList.push("invert wave");
                            }
                            if (anyInstrumentHasEnvelopes) {
                                settingList.push("envelope speed");
                                settingList.push("individual envelope speed");
                                settingList.push("individual envelope lower bound");
                                settingList.push("individual envelope upper bound");
                                settingList.push("reset envelope");
                            }
                        }
                        buildOptions(_this._modSetBoxes[mod], settingList);
                        if (unusedSettingList.length > 0) {
                            _this._modSetBoxes[mod].appendChild(option({ selected: false, disabled: true, value: "Add Effect" }, "Add Effect"));
                            buildOptions(_this._modSetBoxes[mod], unusedSettingList);
                        }
                        var setIndex = settingList.indexOf(SynthConfig_1.Config.modulators[instrument_1.modulators[mod]].name);
                        // Catch instances where invalid set forced setting to "none"
                        if (setIndex == -1) {
                            _this._modSetBoxes[mod].insertBefore(option({ value: SynthConfig_1.Config.modulators[instrument_1.modulators[mod]].name, style: "color: red;" }, SynthConfig_1.Config.modulators[instrument_1.modulators[mod]].name), _this._modSetBoxes[mod].children[0]);
                            _this._modSetBoxes[mod].selectedIndex = 0;
                            _this._whenSetModSetting(mod, true);
                        }
                        else {
                            _this._modSetBoxes[mod].selectedIndex = setIndex;
                            _this._modSetBoxes[mod].classList.remove("invalidSetting");
                            instrument_1.invalidModulators[mod] = false;
                        }
                    }
                    else if (_this._modSetBoxes[mod].selectedIndex > 0) {
                        _this._modSetBoxes[mod].selectedIndex = 0;
                        _this._whenSetModSetting(mod);
                    }
                    //Hide instrument select if channel is "none" or "song"
                    //Hopefully the !. don't ruin something...
                    if (instrument_1.modChannels[mod] < 0) {
                        (_this._modInstrumentBoxes[mod].parentElement).style.display = "none";
                        $("#modInstrumentText" + mod).get(0).style.display = "none";
                        $("#modChannelText" + mod).get(0).innerText = "Channel:";
                        //Hide setting select if channel is "none"
                        if (instrument_1.modChannels[mod] == -2) {
                            $("#modSettingText" + mod).get(0).style.display = "none";
                            (_this._modSetBoxes[mod].parentElement).style.display = "none";
                        }
                        else {
                            $("#modSettingText" + mod).get(0).style.display = "";
                            (_this._modSetBoxes[mod].parentElement).style.display = "";
                        }
                        _this._modTargetIndicators[mod].style.setProperty("fill", ColorConfig_1.ColorConfig.uiWidgetFocus);
                        _this._modTargetIndicators[mod].classList.remove("modTarget");
                    }
                    else {
                        (_this._modInstrumentBoxes[mod].parentElement).style.display = (channel_2.instruments.length > 1) ? "" : "none";
                        $("#modInstrumentText" + mod).get(0).style.display = (channel_2.instruments.length > 1) ? "" : "none";
                        $("#modChannelText" + mod).get(0).innerText = (channel_2.instruments.length > 1) ? "Ch:" : "Channel:";
                        $("#modSettingText" + mod).get(0).style.display = "";
                        (_this._modSetBoxes[mod].parentElement).style.display = "";
                        _this._modTargetIndicators[mod].style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorPrimary);
                        _this._modTargetIndicators[mod].classList.add("modTarget");
                    }
                    var filterType = SynthConfig_1.Config.modulators[instrument_1.modulators[mod]].name;
                    var useSongEq = filterType == "song eq";
                    if (useSongEq)
                        filterType = "eq filter";
                    if (filterType == "eq filter" || filterType == "note filter") {
                        $("#modFilterText" + mod).get(0).style.display = "";
                        $("#modEnvelopeText" + mod).get(0).style.display = "none";
                        $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "2px");
                        var useInstrument = instrument_1.modInstruments[mod];
                        var modChannel_1 = _this.doc.song.channels[Math.max(0, instrument_1.modChannels[mod])];
                        var tmpCount = -1;
                        if (useInstrument >= modChannel_1.instruments.length) {
                            // Use greatest number of dots among all instruments if setting is 'all' or 'active'. If it won't have an effect on one, no worry.
                            for (var i = 0; i < modChannel_1.instruments.length; i++) {
                                if (filterType == "eq filter") {
                                    if (modChannel_1.instruments[i].eqFilter.controlPointCount > tmpCount) {
                                        tmpCount = modChannel_1.instruments[i].eqFilter.controlPointCount;
                                        useInstrument = i;
                                    }
                                }
                                else {
                                    if (modChannel_1.instruments[i].noteFilter.controlPointCount > tmpCount) {
                                        tmpCount = modChannel_1.instruments[i].noteFilter.controlPointCount;
                                        useInstrument = i;
                                    }
                                }
                            }
                        }
                        // Build options for modulator filters (make sure it has the right number of filter dots).
                        var dotCount = (filterType == "eq filter")
                            ? channel_2.instruments[useInstrument].getLargestControlPointCount(false)
                            : channel_2.instruments[useInstrument].getLargestControlPointCount(true);
                        var isSimple = useSongEq ? false : (filterType == "eq filter" ? channel_2.instruments[useInstrument].eqFilterType : channel_2.instruments[useInstrument].noteFilterType);
                        if (isSimple)
                            dotCount = 0;
                        if (useSongEq) {
                            dotCount = _this.doc.song.eqFilter.controlPointCount;
                            if (_this._modFilterBoxes[mod].children.length != 1 + dotCount * 2) {
                                while (_this._modFilterBoxes[mod].firstChild)
                                    _this._modFilterBoxes[mod].remove(0);
                                var dotList = [];
                                dotList.push("morph");
                                for (var i = 0; i < dotCount; i++) {
                                    dotList.push("dot " + (i + 1) + " x");
                                    dotList.push("dot " + (i + 1) + " y");
                                }
                                buildOptions(_this._modFilterBoxes[mod], dotList);
                            }
                        }
                        else if (isSimple || _this._modFilterBoxes[mod].children.length != 1 + dotCount * 2) {
                            while (_this._modFilterBoxes[mod].firstChild)
                                _this._modFilterBoxes[mod].remove(0);
                            var dotList = [];
                            if (!isSimple)
                                dotList.push("morph");
                            for (var i = 0; i < dotCount; i++) {
                                dotList.push("dot " + (i + 1) + " x");
                                dotList.push("dot " + (i + 1) + " y");
                            }
                            buildOptions(_this._modFilterBoxes[mod], dotList);
                        }
                        if (isSimple || instrument_1.modFilterTypes[mod] >= _this._modFilterBoxes[mod].length) {
                            _this._modFilterBoxes[mod].classList.add("invalidSetting");
                            instrument_1.invalidModulators[mod] = true;
                            var useName = ((instrument_1.modFilterTypes[mod] - 1) % 2 == 1) ?
                                "dot " + (Math.floor((instrument_1.modFilterTypes[mod] - 1) / 2) + 1) + " y"
                                : "dot " + (Math.floor((instrument_1.modFilterTypes[mod] - 1) / 2) + 1) + " x";
                            if (instrument_1.modFilterTypes[mod] == 0)
                                useName = "morph";
                            _this._modFilterBoxes[mod].insertBefore(option({ value: useName, style: "color: red;" }, useName), _this._modFilterBoxes[mod].children[0]);
                            _this._modFilterBoxes[mod].selectedIndex = 0;
                        }
                        else {
                            _this._modFilterBoxes[mod].classList.remove("invalidSetting");
                            instrument_1.invalidModulators[mod] = false;
                            _this._modFilterBoxes[mod].selectedIndex = instrument_1.modFilterTypes[mod];
                        }
                    }
                    else {
                        $("#modFilterText" + mod).get(0).style.display = "none";
                        $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "0.9em");
                    }
                    var envelopes = SynthConfig_1.Config.modulators[instrument_1.modulators[mod]].name;
                    if (envelopes == "individual envelope speed" || envelopes == "reset envelope" || envelopes == "individual envelope lower bound" || envelopes == "individual envelope upper bound") {
                        $("#modEnvelopeText" + mod).get(0).style.display = "";
                        $("#modFilterText" + mod).get(0).style.display = "none";
                        $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "2px");
                        var modChannel_2 = _this.doc.song.channels[Math.max(0, instrument_1.modChannels[mod])];
                        var envCount = -1;
                        // Use greatest envelope count among all instruments if setting is 'all' or 'active'. If it won't have an effect on one, no worry.
                        for (var i = 0; i < modChannel_2.instruments.length; i++) {
                            if (modChannel_2.instruments[i].envelopeCount > envCount) {
                                envCount = modChannel_2.instruments[i].envelopeCount;
                            }
                        }
                        // Build options for modulator envelopes (make sure it has the right number of envelopes).
                        while (_this._modEnvelopeBoxes[mod].firstChild)
                            _this._modEnvelopeBoxes[mod].remove(0);
                        var envelopeList = [];
                        for (var i = 0; i < envCount; i++) {
                            envelopeList.push("envelope " + (i + 1));
                        }
                        buildOptions(_this._modEnvelopeBoxes[mod], envelopeList);
                        if (instrument_1.modEnvelopeNumbers[mod] >= _this._modEnvelopeBoxes[mod].length) {
                            _this._modEnvelopeBoxes[mod].classList.add("invalidSetting");
                            instrument_1.invalidModulators[mod] = true;
                            var useName = "envelope " + (instrument_1.modEnvelopeNumbers[mod]);
                            _this._modEnvelopeBoxes[mod].insertBefore(option({ value: useName, style: "color: red;" }, useName), _this._modEnvelopeBoxes[mod].children[0]);
                            _this._modEnvelopeBoxes[mod].selectedIndex = 0;
                        }
                        else {
                            _this._modEnvelopeBoxes[mod].classList.remove("invalidSetting");
                            instrument_1.invalidModulators[mod] = false;
                            _this._modEnvelopeBoxes[mod].selectedIndex = instrument_1.modEnvelopeNumbers[mod];
                        }
                    }
                    else {
                        $("#modEnvelopeText" + mod).get(0).style.display = "none";
                        if (!(filterType == "eq filter" || filterType == "note filter")) {
                            $("#modSettingText" + mod).get(0).style.setProperty("margin-bottom", "0.9em");
                        }
                    }
                }
                _this.doc.recalcChannelNames = false;
                for (var chordIndex = 0; chordIndex < SynthConfig_1.Config.chords.length; chordIndex++) {
                    var option_5 = _this._chordSelect.children[chordIndex];
                    if (!option_5.hasAttribute("hidden")) {
                        option_5.setAttribute("hidden", "");
                    }
                }
                //this._instrumentSelectRow.style.display = "none";
                _this._customInstrumentSettingsGroup.style.display = "none";
                _this._panSliderRow.style.display = "none";
                _this._panDropdownGroup.style.display = "none";
                _this._instrumentTagRow.style.display = "none";
                _this._instrumentVolumeSliderRow.style.display = "none";
                _this._instrumentTypeSelectRow.style.setProperty("display", "none");
                _this._instrumentSettingsGroup.style.color = ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel).primaryNote;
                // Force piano to re-show, if channel is modulator
                if (_this.doc.channel >= _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount) {
                    _this._piano.forceRender();
                }
                _this._renderInstrumentBar(channel, instrumentIndex, colors);
            }
            _this._instrumentSettingsGroup.style.color = colors.primaryNote;
            if (_this.doc.synth.isFilterModActive(false, _this.doc.channel, _this.doc.getCurrentInstrument())) {
                _this._eqFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
            }
            else {
                _this._eqFilterEditor.render();
            }
            if (_this.doc.synth.isFilterModActive(false, 0, 0, true)) {
                _this._songEqFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
            }
            else {
                _this._songEqFilterEditor.render();
            }
            _this._instrumentVolumeSlider.updateValue(instrument.volume);
            _this._detuneSlider.updateValue(instrument.detune - SynthConfig_1.Config.detuneCenter);
            _this._twoNoteArpBox.checked = instrument.fastTwoNoteArp ? true : false;
            _this._clicklessTransitionBox.checked = instrument.clicklessTransition ? true : false;
            _this._aliasingBox.checked = instrument.aliases ? true : false;
            _this._invertWaveBox.checked = instrument.invertWave ? true : false;
            _this._addEnvelopeButton.disabled = (instrument.envelopeCount >= SynthConfig_1.Config.maxEnvelopeCount);
            _this._volumeSlider.updateValue(prefs.volume);
            // If an interface element was selected, but becomes invisible (e.g. an instrument
            // select menu) just select the editor container so keyboard commands still work.
            if (wasActive && activeElement != null && activeElement.clientWidth == 0) {
                _this.refocusStage();
            }
            _this._setPrompt(_this.doc.prompt);
            if (prefs.autoFollow && !_this.doc.synth.playing) {
                _this.doc.synth.goToBar(_this.doc.bar);
            }
            // When adding effects or envelopes to an instrument in fullscreen modes,
            // auto-scroll the settings areas to ensure the new settings are visible.
            if (_this.doc.addedEffect) {
                var envButtonRect = _this._addEnvelopeButton.getBoundingClientRect();
                var instSettingsRect = _this._instrumentSettingsArea.getBoundingClientRect();
                var settingsRect = _this._settingsArea.getBoundingClientRect();
                _this._instrumentSettingsArea.scrollTop += Math.max(0, envButtonRect.top - (instSettingsRect.top + instSettingsRect.height));
                _this._settingsArea.scrollTop += Math.max(0, envButtonRect.top - (settingsRect.top + settingsRect.height));
                _this.doc.addedEffect = false;
            }
            if (_this.doc.addedEnvelope) {
                _this._instrumentSettingsArea.scrollTop = _this._instrumentSettingsArea.scrollHeight;
                _this._settingsArea.scrollTop = _this._settingsArea.scrollHeight;
                _this.doc.addedEnvelope = false;
            }
            if (_this._ringModWaveSelect.selectedIndex == SynthConfig_1.Config.operatorWaves.dictionary['pulse width'].index) {
                _this._ringModPulsewidthSlider.container.style.display = "";
                _this._ringModWaveText.style.display = "none";
            }
            else {
                _this._ringModPulsewidthSlider.container.style.display = "none";
                _this._ringModWaveText.style.display = "";
            }
            // Writeback to mods if control key is held while moving a slider.
            _this.handleModRecording();
        };
        this.updatePlayButton = function () {
            var isMultiplayerConnected = _this.doc.multiplayer.connected;
            if (_this._renderedIsPlaying != _this.doc.synth.playing || _this._renderedIsRecording != _this.doc.synth.recording || _this._renderedShowRecordButton != _this.doc.prefs.showRecordButton || _this._renderedCtrlHeld != _this._ctrlHeld || _this._renderedMultiplayerConnected != isMultiplayerConnected) {
                _this._renderedIsPlaying = _this.doc.synth.playing;
                _this._renderedIsRecording = _this.doc.synth.recording;
                _this._renderedShowRecordButton = _this.doc.prefs.showRecordButton;
                _this._renderedCtrlHeld = _this._ctrlHeld;
                _this._renderedMultiplayerConnected = isMultiplayerConnected;
                _this._multiplayerStatus.style.display = isMultiplayerConnected ? "flex" : "none";
                if (document.activeElement == _this._playButton || document.activeElement == _this._pauseButton || document.activeElement == _this._recordButton || document.activeElement == _this._stopButton) {
                    // When a focused element is hidden, focus is transferred to the document, so let's refocus the editor instead to make sure we can still capture keyboard input.
                    _this.refocusStage();
                }
                _this._playButton.style.display = "none";
                _this._pauseButton.style.display = "none";
                _this._recordButton.style.display = "none";
                _this._stopButton.style.display = "none";
                _this._prevBarButton.style.display = "";
                _this._nextBarButton.style.display = "";
                _this._playButton.classList.remove("shrunk");
                _this._recordButton.classList.remove("shrunk");
                _this._patternEditorRow.style.pointerEvents = "";
                _this._octaveScrollBar.container.style.pointerEvents = "";
                _this._octaveScrollBar.container.style.opacity = "";
                _this._trackContainer.style.pointerEvents = "";
                _this._loopEditor.container.style.opacity = "";
                _this._instrumentSettingsArea.style.pointerEvents = "";
                _this._instrumentSettingsArea.style.opacity = "";
                _this._menuArea.style.pointerEvents = "";
                _this._menuArea.style.opacity = "";
                _this._songSettingsArea.style.pointerEvents = "";
                _this._songSettingsArea.style.opacity = "";
                if (_this.doc.synth.recording) {
                    _this._stopButton.style.display = "";
                    _this._prevBarButton.style.display = "none";
                    _this._nextBarButton.style.display = "none";
                    _this._patternEditorRow.style.pointerEvents = "none";
                    _this._octaveScrollBar.container.style.pointerEvents = "none";
                    _this._octaveScrollBar.container.style.opacity = "0.5";
                    _this._trackContainer.style.pointerEvents = "none";
                    _this._loopEditor.container.style.opacity = "0.5";
                    _this._instrumentSettingsArea.style.pointerEvents = "none";
                    _this._instrumentSettingsArea.style.opacity = "0.5";
                    _this._menuArea.style.pointerEvents = "none";
                    _this._menuArea.style.opacity = "0.5";
                    _this._songSettingsArea.style.pointerEvents = "none";
                    _this._songSettingsArea.style.opacity = "0.5";
                }
                else if (_this.doc.synth.playing) {
                    _this._pauseButton.style.display = "";
                }
                else if (_this.doc.prefs.showRecordButton) {
                    _this._playButton.style.display = "";
                    _this._recordButton.style.display = "";
                    _this._playButton.classList.add("shrunk");
                    _this._recordButton.classList.add("shrunk");
                }
                else if (_this._ctrlHeld) {
                    _this._recordButton.style.display = "";
                }
                else {
                    _this._playButton.style.display = "";
                }
            }
            window.requestAnimationFrame(_this.updatePlayButton);
        };
        this._onTrackAreaScroll = function (event) {
            _this.doc.barScrollPos = (_this._trackAndMuteContainer.scrollLeft / _this.doc.getBarWidth());
            _this.doc.channelScrollPos = (_this._trackAndMuteContainer.scrollTop / ChannelRow_1.ChannelRow.patternHeight);
            //this._doc.notifier.changed();
        };
        this._disableCtrlContextMenu = function (event) {
            // On a Mac, clicking while holding control opens the right-click context menu.
            // But in the pattern and track editors I'd rather prevent that and instead allow
            // custom behaviors such as setting the volume of a note.
            if (event.ctrlKey) {
                event.preventDefault();
                return false;
            }
            return true;
        };
        this._tempoStepperCaptureNumberKeys = function (event) {
            // When the number input is in focus, allow some keyboard events to
            // edit the input without accidentally editing the song otherwise.
            switch (event.keyCode) {
                case 8: // backspace/delete
                case 13: // enter/return
                case 38: // up
                case 40: // down
                case 37: // left
                case 39: // right
                case 48: // 0
                case 49: // 1
                case 50: // 2
                case 51: // 3
                case 52: // 4
                case 53: // 5
                case 54: // 6
                case 55: // 7
                case 56: // 8
                case 57: // 9
                    event.stopPropagation();
                    break;
            }
        };
        this._whenKeyPressed = function (event) {
            _this._ctrlHeld = event.ctrlKey;
            _this._shiftHeld = event.shiftKey;
            if (_this.prompt) {
                if (_this.prompt instanceof CustomChipPrompt_1.CustomChipPrompt || _this.prompt instanceof LimiterPrompt_1.LimiterPrompt || _this.prompt instanceof CustomScalePrompt_1.CustomScalePrompt || _this.prompt instanceof CustomFilterPrompt_1.CustomFilterPrompt) {
                    _this.prompt.whenKeyPressed(event);
                }
                if (event.keyCode == 27) { // ESC key
                    // close prompt.
                    _this.doc.undo();
                }
                return;
            }
            // Defer to actively editing song title, channel name, or mod label
            if (document.activeElement == _this._songTitleInputBox.input || _this._patternEditor.editingModLabel || document.activeElement == _this._muteEditor._channelNameInput.input) {
                // Enter/esc returns focus to form
                if (event.keyCode == 13 || event.keyCode == 27) {
                    _this.mainLayer.focus();
                    _this._patternEditor.stopEditingModLabel(event.keyCode == 27);
                }
                return;
            }
            // Defer to actively editing volume/pan rows
            if (document.activeElement == _this._panSliderInputBox
                || document.activeElement == _this._pwmSliderInputBox
                || document.activeElement == _this._detuneSliderInputBox
                || document.activeElement == _this._instrumentVolumeSliderInputBox
                || document.activeElement == _this._presetTagsInputBox
                // advloop addition
                || document.activeElement == _this._chipWaveLoopStartStepper
                || document.activeElement == _this._chipWaveLoopEndStepper
                || document.activeElement == _this._chipWaveStartOffsetStepper
                // advloop addition
                || document.activeElement == _this._octaveStepper
                || document.activeElement == _this._unisonVoicesInputBox
                || document.activeElement == _this._unisonSpreadInputBox
                || document.activeElement == _this._unisonOffsetInputBox
                || document.activeElement == _this._unisonExpressionInputBox
                || document.activeElement == _this._unisonSignInputBox
                || document.activeElement == _this._monophonicNoteInputBox
                || _this.envelopeEditor.pitchStartBoxes.find(function (element) { return element == document.activeElement; })
                || _this.envelopeEditor.pitchEndBoxes.find(function (element) { return element == document.activeElement; })
                || _this.envelopeEditor.perEnvelopeLowerBoundBoxes.find(function (element) { return element == document.activeElement; })
                || _this.envelopeEditor.perEnvelopeUpperBoundBoxes.find(function (element) { return element == document.activeElement; })
                || _this.envelopeEditor.randomStepsBoxes.find(function (element) { return element == document.activeElement; })
                || _this.envelopeEditor.randomStepsBoxes.find(function (element) { return element == document.activeElement; })
                || _this.envelopeEditor.LFOStepsBoxes.find(function (element) { return element == document.activeElement; })) {
                // Enter/esc returns focus to form
                if (event.keyCode == 13 || event.keyCode == 27) {
                    _this.mainLayer.focus();
                }
                return;
            }
            // Defer to actively editing upper note limit
            if (document.activeElement == _this._upperNoteLimitInputBox || document.activeElement == _this._lowerNoteLimitInputBox) {
                // Enter/esc returns focus to form
                if (event.keyCode == 13 || event.keyCode == 27) {
                    _this.mainLayer.focus();
                }
                return;
            }
            if (_this.doc.synth.recording) {
                // The only valid keyboard interactions when recording are playing notes or pressing space OR P to stop.
                if (!event.ctrlKey && !event.metaKey) {
                    _this._keyboardLayout.handleKeyEvent(event, true);
                }
                if (event.keyCode == 32) { // space
                    _this._toggleRecord();
                    event.preventDefault();
                    _this.refocusStage();
                }
                else if (event.keyCode == 80 && (event.ctrlKey || event.metaKey)) { // p
                    _this._toggleRecord();
                    event.preventDefault();
                    _this.refocusStage();
                }
                return;
            }
            var needControlForShortcuts = (_this.doc.prefs.pressControlForShortcuts != event.getModifierState("CapsLock"));
            var canPlayNotes = (!event.ctrlKey && !event.metaKey && needControlForShortcuts);
            if (canPlayNotes)
                _this._keyboardLayout.handleKeyEvent(event, true);
            //this._trackEditor.onKeyPressed(event);
            switch (event.keyCode) {
                case 27: // ESC key
                    if (!event.ctrlKey && !event.metaKey) {
                        new changes_1.ChangePatternSelection(_this.doc, 0, 0);
                        _this.doc.selection.resetBoxSelection();
                    }
                    break;
                case 16: // Shift
                    _this._patternEditor.shiftMode = true;
                    break;
                case 17: // Ctrl
                    _this._patternEditor.controlMode = true;
                    break;
                case 32: // space
                    if (event.ctrlKey) {
                        _this._toggleRecord();
                    }
                    else if (event.shiftKey) {
                        // Jump to mouse
                        if (_this._trackEditor.movePlayheadToMouse() || _this._patternEditor.movePlayheadToMouse()) {
                            if (!_this.doc.synth.playing)
                                _this.doc.performance.play();
                        }
                        if (Math.floor(_this.doc.synth.playhead) < _this.doc.synth.loopBarStart || Math.floor(_this.doc.synth.playhead) > _this.doc.synth.loopBarEnd) {
                            _this.doc.synth.loopBarStart = -1;
                            _this.doc.synth.loopBarEnd = -1;
                            _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        }
                    }
                    else {
                        _this.togglePlay();
                    }
                    event.preventDefault();
                    _this.refocusStage();
                    break;
                case 80: // p
                    if (canPlayNotes)
                        break;
                    if (event.ctrlKey || event.metaKey) {
                        _this._toggleRecord();
                        _this.doc.synth.loopBarStart = -1;
                        _this.doc.synth.loopBarEnd = -1;
                        _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        event.preventDefault();
                        _this.refocusStage();
                    }
                    else if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey) && event.shiftKey) {
                        location.href = "player/" + (OFFLINE ? "index.html" : "") + "#song=" + _this.doc.song.toBase64String();
                        event.preventDefault();
                    }
                    break;
                /*comment for testing
                case 85: // u
                    if (event.shiftKey) {
                        let shortenerStrategy: string = "https://tinyurl.com/api-create.php?url=";
                        const localShortenerStrategy: string | null = window.localStorage.getItem("shortenerStrategySelect");
    
                        // if (localShortenerStrategy == "beepboxnet") shortenerStrategy = "https://www.beepbox.net/api-create.php?url=";
                        if (localShortenerStrategy == "isgd") shortenerStrategy = "https://is.gd/create.php?format=simple&url=";
    
                        window.open(shortenerStrategy + encodeURIComponent(new URL("#" + this.doc.song.toBase64String(), location.href).href));
                    }
                    break;
                // */
                case 192: // `/~
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        _this.doc.goBackToStart();
                        _this.doc.song.restoreLimiterDefaults();
                        for (var _i = 0, _a = _this.doc.song.channels; _i < _a.length; _i++) {
                            var channel = _a[_i];
                            channel.muted = false;
                            channel.name = "";
                        }
                        _this.doc.record(new changes_1.ChangeSong(_this.doc, ""), false, true);
                    }
                    /*comment for testing
                    else {
                        if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                            this._openPrompt("songRecovery");
                        }
                    } // */
                    event.preventDefault();
                    break;
                case 90: // z
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        _this.doc.redo();
                    }
                    else {
                        _this.doc.undo();
                    }
                    event.preventDefault();
                    break;
                case 88: // x
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.cutNotes();
                    event.preventDefault();
                    break;
                case 89: // y
                    if (canPlayNotes)
                        break;
                    _this.doc.redo();
                    event.preventDefault();
                    break;
                case 66: // b
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        if (event.shiftKey) {
                            _this._openPrompt("beatsPerBar");
                        }
                        else {
                            var leftSel = Math.min(_this.doc.selection.boxSelectionX0, _this.doc.selection.boxSelectionX1);
                            var rightSel = Math.max(_this.doc.selection.boxSelectionX0, _this.doc.selection.boxSelectionX1);
                            if ((leftSel < _this.doc.synth.loopBarStart || _this.doc.synth.loopBarStart == -1)
                                || (rightSel > _this.doc.synth.loopBarEnd || _this.doc.synth.loopBarEnd == -1)) {
                                _this.doc.synth.loopBarStart = leftSel;
                                _this.doc.synth.loopBarEnd = rightSel;
                                if (!_this.doc.synth.playing) {
                                    _this.doc.synth.snapToBar();
                                    _this.doc.performance.play();
                                }
                            }
                            else {
                                _this.doc.synth.loopBarStart = -1;
                                _this.doc.synth.loopBarEnd = -1;
                            }
                            // Pressed while viewing a different bar than the current synth playhead.
                            if (_this.doc.bar != Math.floor(_this.doc.synth.playhead) && _this.doc.synth.loopBarStart != -1) {
                                _this.doc.synth.goToBar(_this.doc.bar);
                                _this.doc.synth.snapToBar();
                                _this.doc.synth.initModFilters(_this.doc.song);
                                _this.doc.synth.computeLatestModValues();
                                if (_this.doc.prefs.autoFollow) {
                                    _this.doc.selection.setChannelBar(_this.doc.channel, Math.floor(_this.doc.synth.playhead));
                                }
                            }
                            _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        }
                    }
                    event.preventDefault();
                    break;
                case 67: // c
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        _this._copyInstrument();
                    }
                    else {
                        _this.doc.selection.copy();
                        _this.doc.selection.resetBoxSelection();
                        _this.doc.selection.selectionUpdated();
                    }
                    event.preventDefault();
                    break;
                case 13: // enter/return
                    _this.doc.synth.loopBarStart = -1;
                    _this.doc.synth.loopBarEnd = -1;
                    _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                    if ((event.ctrlKey || event.metaKey) && !event.shiftKey) {
                        _this.doc.selection.insertChannel();
                    }
                    else if (event.shiftKey) {
                        var width = _this.doc.selection.boxSelectionWidth;
                        _this.doc.selection.boxSelectionX0 -= width;
                        _this.doc.selection.boxSelectionX1 -= width;
                        _this.doc.selection.insertBars();
                    }
                    else if (event.altKey) {
                        _this.doc.record(new changes_1.ChangeAddChannelInstrument(_this.doc));
                    }
                    else {
                        _this.doc.selection.insertBars();
                    }
                    event.preventDefault();
                    break;
                case 8: // backspace/delete
                    _this.doc.synth.loopBarStart = -1;
                    _this.doc.synth.loopBarEnd = -1;
                    _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                    if (event.ctrlKey || event.metaKey) {
                        _this.doc.selection.deleteChannel();
                    }
                    else if (event.altKey) {
                        _this.doc.record(new changes_1.ChangeRemoveChannelInstrument(_this.doc));
                    }
                    else {
                        _this.doc.selection.deleteBars();
                    }
                    _this._barScrollBar.animatePlayhead();
                    event.preventDefault();
                    break;
                case 65: // a
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        _this.doc.selection.selectChannel();
                    }
                    else {
                        _this.doc.selection.selectAll();
                    }
                    event.preventDefault();
                    break;
                case 68: // d
                    if (event.shiftKey) {
                    }
                    else {
                        if (canPlayNotes)
                            break;
                        if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                            //shift d replaces old d functionality, while d will duplicate replacing an unused pattern
                            //This is for consistency with n (n uses ctrl instead of shift, but this will have to do for now)
                            _this.doc.selection.duplicatePatterns(event.shiftKey ? false : true);
                            event.preventDefault();
                        }
                    }
                    break;
                case 69: // e (+shift: eq filter settings)
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
                        if (!instrument.eqFilterType && _this.doc.channel < _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount)
                            _this._openPrompt("customEQFilterSettings");
                    }
                    else if (event.altKey) {
                        //open / close all envelope dropdowns
                        var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
                        var isAllOpen = _this.envelopeEditor.openExtraSettingsDropdowns.every(function (x) { return x == true; });
                        for (var i = 0; i < instrument.envelopeCount; i++) {
                            if (isAllOpen)
                                _this.envelopeEditor.openExtraSettingsDropdowns[i] = false;
                            else
                                _this.envelopeEditor.openExtraSettingsDropdowns[i] = true;
                        }
                        _this.envelopeEditor.rerenderExtraSettings();
                        event.preventDefault();
                    }
                    else if (event.ctrlKey) {
                        // EUCLEDIAN RHYTHM SHORTCUT (E)
                        _this._openPrompt("generateEuclideanRhythm");
                        event.preventDefault();
                        break;
                    }
                    else if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this._openPrompt("customSongEQFilterSettings");
                    }
                    break;
                case 70: // f
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) { // if shift+f, move to start of loop bar instead 
                        _this.doc.synth.loopBarStart = -1;
                        _this.doc.synth.loopBarEnd = -1;
                        _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        _this.doc.synth.goToBar(_this.doc.song.loopStart);
                        _this.doc.synth.snapToBar();
                        _this.doc.synth.initModFilters(_this.doc.song);
                        _this.doc.synth.computeLatestModValues();
                        if (_this.doc.prefs.autoFollow) {
                            _this.doc.selection.setChannelBar(_this.doc.channel, Math.floor(_this.doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    else if (event.altKey) {
                        //open / close all fm dropdowns
                        var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
                        var operatorCount = instrument.type == 1 /* InstrumentType.fm */ ? 4 : 6;
                        var isAllOpen = true;
                        for (var i = 0; i < operatorCount; i++) {
                            if (!_this._openOperatorDropdowns[i])
                                isAllOpen = false;
                        }
                        for (var i = 0; i < operatorCount; i++) {
                            if (_this._openOperatorDropdowns[i] == false && !isAllOpen || isAllOpen)
                                _this._toggleDropdownMenu(4 /* DropdownID.FM */, i);
                        }
                        event.preventDefault();
                    }
                    else if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this.doc.synth.loopBarStart = -1;
                        _this.doc.synth.loopBarEnd = -1;
                        _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        _this.doc.synth.snapToStart();
                        _this.doc.synth.initModFilters(_this.doc.song);
                        _this.doc.synth.computeLatestModValues();
                        if (_this.doc.prefs.autoFollow) {
                            _this.doc.selection.setChannelBar(_this.doc.channel, Math.floor(_this.doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 72: // h
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this.doc.synth.goToBar(_this.doc.bar);
                        _this.doc.synth.snapToBar();
                        _this.doc.synth.initModFilters(_this.doc.song);
                        _this.doc.synth.computeLatestModValues();
                        if (Math.floor(_this.doc.synth.playhead) < _this.doc.synth.loopBarStart || Math.floor(_this.doc.synth.playhead) > _this.doc.synth.loopBarEnd) {
                            _this.doc.synth.loopBarStart = -1;
                            _this.doc.synth.loopBarEnd = -1;
                            _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        }
                        if (_this.doc.prefs.autoFollow) {
                            _this.doc.selection.setChannelBar(_this.doc.channel, Math.floor(_this.doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 74: // j
                    if (canPlayNotes)
                        break;
                    // Ctrl Alt Shift J: Jummbify - set all prefs to my preferred ones lol
                    if (event.shiftKey && event.ctrlKey && event.altKey) {
                        _this.doc.prefs.autoPlay = false;
                        _this.doc.prefs.autoFollow = false;
                        _this.doc.prefs.enableNotePreview = true;
                        _this.doc.prefs.showFifth = true;
                        _this.doc.prefs.notesOutsideScale = false;
                        _this.doc.prefs.defaultScale = 0;
                        _this.doc.prefs.showLetters = true;
                        _this.doc.prefs.showChannels = true;
                        _this.doc.prefs.showScrollBar = true;
                        _this.doc.prefs.alwaysFineNoteVol = false;
                        _this.doc.prefs.enableChannelMuting = true;
                        //this.doc.prefs.displayBrowserUrl = true;
                        _this.doc.prefs.displayVolumeBar = true;
                        _this.doc.prefs.layout = "wide";
                        _this.doc.prefs.visibleOctaves = 5;
                        _this.doc.prefs.colorTheme = "jummbox classic";
                        _this.doc.prefs.rollNoveltyPresets = false;
                        _this.doc.prefs.enableTagSearch = false;
                        _this.doc.prefs.save();
                        event.preventDefault();
                        location.reload();
                    }
                    break;
                case 76: // l
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey) {
                        _this._openPrompt("limiterSettings");
                    }
                    else {
                        _this._openPrompt("barCount");
                    }
                    break;
                case 77: // m
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        if (_this.doc.prefs.enableChannelMuting) {
                            _this.doc.selection.muteChannels(event.shiftKey);
                            event.preventDefault();
                        }
                    }
                    break;
                case 78: // n
                    if (canPlayNotes)
                        break;
                    // Find lowest-index unused pattern for current channel
                    // Ctrl+n - lowest-index completely empty pattern
                    // Shift+n - note filter settings
                    var group = new Change_1.ChangeGroup();
                    if (event.shiftKey) {
                        var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
                        if ((0, SynthConfig_1.effectsIncludeNoteFilter)(instrument.effects) && !instrument.noteFilterType && _this.doc.channel < _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount)
                            _this._openPrompt("customNoteFilterSettings");
                        break;
                    }
                    else if (event.ctrlKey) {
                        var nextEmpty = 0;
                        while (nextEmpty < _this.doc.song.patternsPerChannel && _this.doc.song.channels[_this.doc.channel].patterns[nextEmpty].notes.length > 0)
                            nextEmpty++;
                        nextEmpty++; // The next empty pattern is actually the one after the found one
                        // Can't set anything if we're at the absolute limit.
                        if (nextEmpty <= SynthConfig_1.Config.barCountMax) {
                            if (nextEmpty > _this.doc.song.patternsPerChannel) {
                                // Add extra empty pattern, if all the rest have something in them.
                                group.append(new changes_1.ChangePatternsPerChannel(_this.doc, nextEmpty));
                            }
                            // Change pattern number to lowest-index unused
                            group.append(new changes_1.ChangePatternNumbers(_this.doc, nextEmpty, _this.doc.bar, _this.doc.channel, 1, 1));
                            // Auto set the used instruments to the ones you were most recently viewing.
                            if (_this.doc.channel >= _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount) {
                                _this.doc.viewedInstrument[_this.doc.channel] = _this.doc.recentPatternInstruments[_this.doc.channel][0];
                            }
                            group.append(new changes_1.ChangeSetPatternInstruments(_this.doc, _this.doc.channel, _this.doc.recentPatternInstruments[_this.doc.channel], _this.doc.song.channels[_this.doc.channel].patterns[nextEmpty - 1]));
                        }
                    }
                    else {
                        var nextUnused = 1;
                        while (_this.doc.song.channels[_this.doc.channel].bars.indexOf(nextUnused) != -1
                            && nextUnused <= _this.doc.song.patternsPerChannel)
                            nextUnused++;
                        // Can't set anything if we're at the absolute limit.
                        if (nextUnused <= SynthConfig_1.Config.barCountMax) {
                            if (nextUnused > _this.doc.song.patternsPerChannel) {
                                // Add extra empty pattern, if all the rest are used.
                                group.append(new changes_1.ChangePatternsPerChannel(_this.doc, nextUnused));
                            }
                            // Change pattern number to lowest-index unused
                            group.append(new changes_1.ChangePatternNumbers(_this.doc, nextUnused, _this.doc.bar, _this.doc.channel, 1, 1));
                            // Auto set the used instruments to the ones you were most recently viewing.
                            if (_this.doc.channel >= _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount) {
                                _this.doc.viewedInstrument[_this.doc.channel] = _this.doc.recentPatternInstruments[_this.doc.channel][0];
                            }
                            group.append(new changes_1.ChangeSetPatternInstruments(_this.doc, _this.doc.channel, _this.doc.recentPatternInstruments[_this.doc.channel], _this.doc.song.channels[_this.doc.channel].patterns[nextUnused - 1]));
                        }
                    }
                    _this.doc.record(group);
                    event.preventDefault();
                    break;
                case 81: // q
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        if (event.shiftKey) {
                            _this._openPrompt("addExternal");
                            event.preventDefault();
                            break;
                        }
                        else {
                            _this._openPrompt("channelSettings");
                            event.preventDefault();
                            break;
                        }
                    }
                    break;
                case 83: // s
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey && event.ctrlKey && event.altKey) {
                        // Ctrl Alt Shift S: Slarmooify - set all prefs to my preferred ones lol
                        _this.doc.prefs.autoPlay = false;
                        _this.doc.prefs.autoFollow = true;
                        _this.doc.prefs.enableNotePreview = true;
                        _this.doc.prefs.showFifth = true;
                        _this.doc.prefs.notesOutsideScale = false;
                        _this.doc.prefs.defaultScale = 0;
                        _this.doc.prefs.showLetters = true;
                        _this.doc.prefs.showChannels = true;
                        _this.doc.prefs.showScrollBar = true;
                        _this.doc.prefs.alwaysFineNoteVol = false;
                        _this.doc.prefs.enableChannelMuting = true;
                        //this.doc.prefs.displayBrowserUrl = true;
                        _this.doc.prefs.displayVolumeBar = true;
                        _this.doc.prefs.layout = "tall";
                        _this.doc.prefs.visibleOctaves = 5;
                        _this.doc.prefs.closePromptByClickoff = false;
                        _this.doc.prefs.colorTheme = "slarmoosbox";
                        _this.doc.prefs.frostedGlassBackground = false;
                        _this.doc.prefs.instrumentButtonsAtTop = true;
                        _this.doc.prefs.instrumentCopyPaste = true;
                        _this.doc.prefs.instrumentImportExport = true;
                        _this.doc.prefs.notesFlashWhenPlayed = true;
                        _this.doc.prefs.showOscilloscope = true;
                        _this.doc.prefs.rollNoveltyPresets = false;
                        _this.doc.prefs.enableTagSearch = false;
                        _this.doc.prefs.save();
                        event.preventDefault();
                        location.reload();
                    }
                    else if (event.ctrlKey || event.metaKey) {
                        _this._openPrompt("export");
                        event.preventDefault();
                    }
                    else if (event.altKey) {
                        _this._openPrompt("exportInstrument");
                    }
                    else if (_this.doc.prefs.enableChannelMuting) {
                        // JummBox deviation: I like shift+s as just another mute toggle personally.
                        // Easier to reach than M and the shift+s invert functionality I am overwriting could be 
                        // obtained with M anyway. Useability-wise you very often want to 'add' channels on to a solo as you work.
                        if (event.shiftKey) {
                            _this.doc.selection.muteChannels(false);
                        }
                        else {
                            _this.doc.selection.soloChannels(false);
                        }
                        event.preventDefault();
                    }
                    break;
                case 79: // o
                    if (canPlayNotes)
                        break;
                    if (event.ctrlKey || event.metaKey) {
                        _this._openPrompt("import");
                        event.preventDefault();
                    }
                    else if (event.altKey) {
                        _this._openPrompt("importInstrument");
                    }
                    break;
                case 86: // v
                    if (canPlayNotes)
                        break;
                    if ((event.ctrlKey || event.metaKey) && event.shiftKey && !needControlForShortcuts) {
                        _this.doc.selection.pasteNumbers();
                    }
                    else if (event.shiftKey) {
                        _this._pasteInstrument();
                    }
                    else {
                        _this.doc.selection.pasteNotes();
                    }
                    event.preventDefault();
                    break;
                case 87: // w
                    if (canPlayNotes)
                        break;
                    _this._openPrompt("moveNotesSideways");
                    break;
                case 73: // i
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey) && event.shiftKey) {
                        // Copy the current instrument as a preset to the clipboard.
                        var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
                        var instrumentObject = instrument.toJsonObject();
                        delete instrumentObject["preset"];
                        // Volume and the panning effect are not included in presets.
                        delete instrumentObject["volume"];
                        delete instrumentObject["pan"];
                        var panningEffectIndex = instrumentObject["effects"].indexOf(SynthConfig_1.Config.effectNames[2 /* EffectType.panning */]);
                        if (panningEffectIndex != -1)
                            instrumentObject["effects"].splice(panningEffectIndex, 1);
                        for (var i = 0; i < instrumentObject["envelopes"].length; i++) {
                            var envelope = instrumentObject["envelopes"][i];
                            // If there are any envelopes targeting panning or none, remove those too.
                            if (envelope["target"] == "panning" || envelope["target"] == "none" || envelope["envelope"] == "none") {
                                instrumentObject["envelopes"].splice(i, 1);
                                i--;
                            }
                        }
                        _this._copyTextToClipboard(JSON.stringify(instrumentObject));
                        event.preventDefault();
                    }
                    break;
                case 82: // r
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        if (event.shiftKey) {
                            _this._randomGenerated(false);
                        }
                        else if (event.altKey) {
                            _this._randomGenerated(true);
                        }
                        else {
                            _this._randomPreset();
                        }
                        event.preventDefault();
                    }
                    break;
                case 84: // t
                    if (canPlayNotes)
                        break;
                    if (event.shiftKey && event.ctrlKey && event.altKey) {
                        // Ctrl Alt Shift t: tasify - take a guess lol
                        _this.doc.prefs.autoPlay = false;
                        _this.doc.prefs.autoFollow = true;
                        _this.doc.prefs.enableNotePreview = true;
                        _this.doc.prefs.showFifth = true;
                        _this.doc.prefs.notesOutsideScale = true;
                        _this.doc.prefs.defaultScale = 0;
                        _this.doc.prefs.showLetters = true;
                        _this.doc.prefs.showChannels = true;
                        _this.doc.prefs.showScrollBar = true;
                        _this.doc.prefs.alwaysFineNoteVol = true;
                        _this.doc.prefs.enableChannelMuting = true;
                        //this.doc.prefs.displayBrowserUrl = true;
                        _this.doc.prefs.displayVolumeBar = true;
                        _this.doc.prefs.layout = "long";
                        _this.doc.prefs.visibleOctaves = 4;
                        _this.doc.prefs.closePromptByClickoff = true;
                        _this.doc.prefs.colorTheme = "violet verdant";
                        _this.doc.prefs.frostedGlassBackground = false;
                        _this.doc.prefs.instrumentButtonsAtTop = true;
                        _this.doc.prefs.instrumentCopyPaste = true;
                        _this.doc.prefs.instrumentImportExport = true;
                        _this.doc.prefs.notesFlashWhenPlayed = true;
                        _this.doc.prefs.showOscilloscope = true;
                        _this.doc.prefs.rollNoveltyPresets = true;
                        _this.doc.prefs.enableTagSearch = true;
                        _this.doc.prefs.save();
                        event.preventDefault();
                        location.reload();
                    }
                    else {
                        _this._nextPreset();
                        event.preventDefault();
                    }
                    break;
                case 219: // left brace
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this.doc.synth.goToPrevBar();
                        _this.doc.synth.initModFilters(_this.doc.song);
                        _this.doc.synth.computeLatestModValues();
                        if (Math.floor(_this.doc.synth.playhead) < _this.doc.synth.loopBarStart || Math.floor(_this.doc.synth.playhead) > _this.doc.synth.loopBarEnd) {
                            _this.doc.synth.loopBarStart = -1;
                            _this.doc.synth.loopBarEnd = -1;
                            _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        }
                        if (_this.doc.prefs.autoFollow) {
                            _this.doc.selection.setChannelBar(_this.doc.channel, Math.floor(_this.doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 221: // right brace
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this.doc.synth.goToNextBar();
                        _this.doc.synth.initModFilters(_this.doc.song);
                        _this.doc.synth.computeLatestModValues();
                        if (Math.floor(_this.doc.synth.playhead) < _this.doc.synth.loopBarStart || Math.floor(_this.doc.synth.playhead) > _this.doc.synth.loopBarEnd) {
                            _this.doc.synth.loopBarStart = -1;
                            _this.doc.synth.loopBarEnd = -1;
                            _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
                        }
                        if (_this.doc.prefs.autoFollow) {
                            _this.doc.selection.setChannelBar(_this.doc.channel, Math.floor(_this.doc.synth.playhead));
                        }
                        event.preventDefault();
                    }
                    break;
                case 189: // -
                case 173: // Firefox -
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this.doc.selection.transpose(false, event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 187: // +
                case 61: // Firefox +
                case 171: // Some users have this as +? Hmm.
                    if (canPlayNotes)
                        break;
                    if (needControlForShortcuts == (event.ctrlKey || event.metaKey)) {
                        _this.doc.selection.transpose(true, event.shiftKey);
                        event.preventDefault();
                    }
                    break;
                case 38: // up
                    if (event.ctrlKey || event.metaKey) {
                        _this.doc.selection.swapChannels(-1);
                    }
                    else if (event.shiftKey) {
                        _this.doc.selection.boxSelectionY1 = Math.max(0, _this.doc.selection.boxSelectionY1 - 1);
                        _this.doc.selection.scrollToEndOfSelection();
                        _this.doc.selection.selectionUpdated();
                    }
                    else {
                        _this.doc.selection.setChannelBar((_this.doc.channel - 1 + _this.doc.song.getChannelCount()) % _this.doc.song.getChannelCount(), _this.doc.bar);
                        _this.doc.selection.resetBoxSelection();
                        //envelopes aren't rerendering when channels are changed so...
                        _this.envelopeEditor.rerenderExtraSettings();
                    }
                    event.preventDefault();
                    break;
                case 40: // down
                    if (event.ctrlKey || event.metaKey) {
                        _this.doc.selection.swapChannels(1);
                    }
                    else if (event.shiftKey) {
                        _this.doc.selection.boxSelectionY1 = Math.min(_this.doc.song.getChannelCount() - 1, _this.doc.selection.boxSelectionY1 + 1);
                        _this.doc.selection.scrollToEndOfSelection();
                        _this.doc.selection.selectionUpdated();
                    }
                    else {
                        _this.doc.selection.setChannelBar((_this.doc.channel + 1) % _this.doc.song.getChannelCount(), _this.doc.bar);
                        _this.doc.selection.resetBoxSelection();
                        _this.envelopeEditor.rerenderExtraSettings();
                    }
                    event.preventDefault();
                    break;
                case 37: // left
                    if (event.shiftKey) {
                        _this.doc.selection.boxSelectionX1 = Math.max(0, _this.doc.selection.boxSelectionX1 - 1);
                        _this.doc.selection.scrollToEndOfSelection();
                        _this.doc.selection.selectionUpdated();
                    }
                    else {
                        _this.doc.selection.setChannelBar(_this.doc.channel, (_this.doc.bar + _this.doc.song.barCount - 1) % _this.doc.song.barCount);
                        _this.doc.selection.resetBoxSelection();
                    }
                    event.preventDefault();
                    break;
                case 39: // right
                    if (event.shiftKey) {
                        _this.doc.selection.boxSelectionX1 = Math.min(_this.doc.song.barCount - 1, _this.doc.selection.boxSelectionX1 + 1);
                        _this.doc.selection.scrollToEndOfSelection();
                        _this.doc.selection.selectionUpdated();
                    }
                    else {
                        _this.doc.selection.setChannelBar(_this.doc.channel, (_this.doc.bar + 1) % _this.doc.song.barCount);
                        _this.doc.selection.resetBoxSelection();
                    }
                    event.preventDefault();
                    break;
                case 46: // Delete
                    _this.doc.selection.digits = "";
                    _this.doc.selection.nextDigit("0", false, false);
                    break;
                case 48: // 0
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("0", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 49: // 1
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("1", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 50: // 2
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("2", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 51: // 3
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("3", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 52: // 4
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("4", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 53: // 5
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("5", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 54: // 6
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("6", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 55: // 7
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("7", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 56: // 8
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("8", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                case 57: // 9
                    if (canPlayNotes)
                        break;
                    _this.doc.selection.nextDigit("9", needControlForShortcuts != (event.shiftKey || event.ctrlKey || event.metaKey), event.altKey);
                    _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], _this.doc.getCurrentInstrument(), ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
                    event.preventDefault();
                    break;
                default:
                    _this.doc.selection.digits = "";
                    _this.doc.selection.instrumentDigits = "";
                    break;
            }
            if (canPlayNotes) {
                _this.doc.selection.digits = "";
                _this.doc.selection.instrumentDigits = "";
            }
        };
        this._whenKeyReleased = function (event) {
            _this._muteEditor.onKeyUp(event);
            if (!event.ctrlKey) { // Ctrl
                _this._patternEditor.controlMode = false;
            }
            if (!event.shiftKey) { // Shift
                _this._patternEditor.shiftMode = false;
            }
            _this._ctrlHeld = event.ctrlKey;
            _this._shiftHeld = event.shiftKey;
            // Release live pitches regardless of control or caps lock so that any pitches played before will get released even if the modifier keys changed.
            _this._keyboardLayout.handleKeyEvent(event, false);
        };
        this._whenPrevBarPressed = function () {
            _this.doc.synth.goToPrevBar();
            if (Math.floor(_this.doc.synth.playhead) < _this.doc.synth.loopBarStart || Math.floor(_this.doc.synth.playhead) > _this.doc.synth.loopBarEnd) {
                _this.doc.synth.loopBarStart = -1;
                _this.doc.synth.loopBarEnd = -1;
                _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
            }
            _this._barScrollBar.animatePlayhead();
        };
        this._whenNextBarPressed = function () {
            _this.doc.synth.goToNextBar();
            if (Math.floor(_this.doc.synth.playhead) < _this.doc.synth.loopBarStart || Math.floor(_this.doc.synth.playhead) > _this.doc.synth.loopBarEnd) {
                _this.doc.synth.loopBarStart = -1;
                _this.doc.synth.loopBarEnd = -1;
                _this._loopEditor.setLoopAt(_this.doc.synth.loopBarStart, _this.doc.synth.loopBarEnd);
            }
            _this._barScrollBar.animatePlayhead();
        };
        this.togglePlay = function () {
            if (_this.doc.synth.playing) {
                _this.doc.performance.pause();
                _this.outVolumeHistoricCap = 0;
            }
            else {
                _this.doc.synth.snapToBar();
                _this.doc.performance.play();
            }
        };
        this._toggleRecord = function () {
            if (_this.doc.synth.playing) {
                _this.doc.performance.pause();
            }
            else {
                _this.doc.performance.record();
            }
        };
        this._animate = function () {
            // Need to update mods once more to clear the slider display
            _this._modSliderUpdate();
            // Same for volume display
            if (_this.doc.prefs.displayVolumeBar) {
                _this._volumeUpdate();
            }
            // ...and barscrollbar playhead
            _this._barScrollBar.animatePlayhead();
            // ...and filters
            if (_this.doc.synth.isFilterModActive(false, _this.doc.channel, _this.doc.getCurrentInstrument())) {
                _this._eqFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
            }
            if (_this.doc.synth.isFilterModActive(true, _this.doc.channel, _this.doc.getCurrentInstrument())) {
                _this._noteFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
            }
            if (_this.doc.synth.isFilterModActive(false, 0, 0, true)) {
                _this._songEqFilterEditor.render(true, _this._ctrlHeld || _this._shiftHeld);
            }
            window.requestAnimationFrame(_this._animate);
        };
        this._volumeUpdate = function () {
            _this.outVolumeHistoricTimer--;
            if (_this.outVolumeHistoricTimer <= 0) {
                _this.outVolumeHistoricCap -= 0.03;
            }
            if (_this.doc.song.outVolumeCap > _this.outVolumeHistoricCap) {
                _this.outVolumeHistoricCap = _this.doc.song.outVolumeCap;
                _this.outVolumeHistoricTimer = 50;
            }
            if (_this.doc.song.outVolumeCap != _this.lastOutVolumeCap) {
                _this.lastOutVolumeCap = _this.doc.song.outVolumeCap;
                _this._animateVolume(_this.doc.song.outVolumeCap, _this.outVolumeHistoricCap);
            }
        };
        this._setVolumeSlider = function () {
            // Song volume slider doesn't use a change, but it can still be modulated.
            if ((_this._ctrlHeld || _this._shiftHeld) && _this.doc.synth.playing) {
                var prevVol = _this.doc.prefs.volume;
                // The slider only goes to 75, but the mod is 0-100 and in this instance we're using the value for a mod set.
                _this.doc.prefs.volume = Math.round(Number(_this._volumeSlider.input.value) * 4 / 3);
                var changedPatterns = _this._patternEditor.setModSettingsForChange(null, _this);
                var useVol_1 = _this.doc.prefs.volume;
                window.clearTimeout(_this._modRecTimeout);
                _this._modRecTimeout = window.setTimeout(function () { _this._recordVolumeSlider(useVol_1); }, 10);
                _this.doc.recordingModulators = true;
                _this.doc.prefs.volume = prevVol;
                _this._volumeSlider.updateValue(_this.doc.prefs.volume);
                if (changedPatterns)
                    _this._trackEditor.render();
            }
            else {
                _this.doc.setVolume(Number(_this._volumeSlider.input.value));
                if (_this.doc.recordingModulators) {
                    _this.doc.recordingModulators = false;
                    // A dummy change that pushes history state.
                    _this.doc.record(new changes_1.ChangeHoldingModRecording(_this.doc, null, null, null));
                }
            }
        };
        this._copyInstrument = function () {
            var channel = _this.doc.song.channels[_this.doc.channel];
            var instrument = channel.instruments[_this.doc.getCurrentInstrument()];
            var instrumentCopy = instrument.toJsonObject();
            instrumentCopy["isDrum"] = _this.doc.song.getChannelIsNoise(_this.doc.channel);
            instrumentCopy["isMod"] = _this.doc.song.getChannelIsMod(_this.doc.channel);
            window.localStorage.setItem("instrumentCopy", JSON.stringify(instrumentCopy));
            _this.refocusStage();
        };
        this._pasteInstrument = function () {
            var channel = _this.doc.song.channels[_this.doc.channel];
            var instrument = channel.instruments[_this.doc.getCurrentInstrument()];
            var instrumentCopy = JSON.parse(String(window.localStorage.getItem("instrumentCopy")));
            if (instrumentCopy != null && instrumentCopy["isDrum"] == _this.doc.song.getChannelIsNoise(_this.doc.channel) && instrumentCopy["isMod"] == _this.doc.song.getChannelIsMod(_this.doc.channel)) {
                _this.doc.record(new changes_1.ChangePasteInstrument(_this.doc, instrument, instrumentCopy));
            }
            _this.refocusStage();
        };
        this._exportInstruments = function () {
            _this._openPrompt("exportInstrument");
        };
        this._importInstruments = function () {
            _this._openPrompt("importInstrument");
        };
        this._whenSetTempo = function () {
            _this.doc.record(new changes_1.ChangeTempo(_this.doc, -1, parseInt(_this._tempoStepper.value) | 0));
        };
        this._whenSetOctave = function () {
            _this.doc.record(new changes_1.ChangeKeyOctave(_this.doc, _this.doc.song.octave, parseInt(_this._octaveStepper.value) | 0));
            _this._piano.forceRender();
        };
        this._whenSetScale = function () {
            if (isNaN(_this._scaleSelect.value)) {
                switch (_this._scaleSelect.value) {
                    case "forceScale":
                        _this.doc.selection.forceScale();
                        break;
                    case "customize":
                        _this._openPrompt("customScale");
                        break;
                }
                _this.doc.notifier.changed();
            }
            else {
                _this.doc.record(new changes_1.ChangeScale(_this.doc, _this._scaleSelect.selectedIndex));
            }
        };
        this._whenSetKey = function () {
            if (isNaN(_this._keySelect.value)) {
                switch (_this._keySelect.value) {
                    case "detectKey":
                        _this.doc.record(new changes_1.ChangeDetectKey(_this.doc));
                        break;
                }
                _this.doc.notifier.changed();
            }
            else {
                _this.doc.record(new changes_1.ChangeKey(_this.doc, SynthConfig_1.Config.keys.length - 1 - _this._keySelect.selectedIndex));
            }
        };
        this._whenSetRhythm = function () {
            if (isNaN(_this._rhythmSelect.value)) {
                switch (_this._rhythmSelect.value) {
                    case "forceRhythm":
                        _this.doc.selection.forceRhythm();
                        break;
                }
                _this.doc.notifier.changed();
            }
            else {
                _this.doc.record(new changes_1.ChangeRhythm(_this.doc, _this._rhythmSelect.selectedIndex));
            }
        };
        this._refocus = function () {
            // Waits a bit because select2 "steals" back focus even after the close event fires.
            var selfRef = _this;
            setTimeout(function () { selfRef.mainLayer.focus(); }, 20);
        };
        this._whenSetPitchedPreset = function () {
            _this._setPreset($('#pitchPresetSelect').val() + "");
        };
        this._whenSetDrumPreset = function () {
            _this._setPreset($('#drumPresetSelect').val() + "");
        };
        this._whenSetFeedbackType = function () {
            _this.doc.record(new changes_1.ChangeFeedbackType(_this.doc, _this._feedbackTypeSelect.selectedIndex));
        };
        this._whenSetAlgorithm = function () {
            _this.doc.record(new changes_1.ChangeAlgorithm(_this.doc, _this._algorithmSelect.selectedIndex));
        };
        this._whenSet6OpFeedbackType = function () {
            _this.doc.record(new changes_1.Change6OpFeedbackType(_this.doc, _this._feedback6OpTypeSelect.selectedIndex));
            _this._customAlgorithmCanvas.reset();
        };
        this._whenSet6OpAlgorithm = function () {
            _this.doc.record(new changes_1.Change6OpAlgorithm(_this.doc, _this._algorithm6OpSelect.selectedIndex));
            _this._customAlgorithmCanvas.reset();
        };
        this._whenSelectInstrument = function (event) {
            if (event.target == _this._instrumentAddButton) {
                _this.doc.record(new changes_1.ChangeAddChannelInstrument(_this.doc));
            }
            else if (event.target == _this._instrumentRemoveButton) {
                _this.doc.record(new changes_1.ChangeRemoveChannelInstrument(_this.doc));
            }
            else {
                var index = _this._instrumentButtons.indexOf(event.target);
                if (index != -1) {
                    _this.doc.selection.selectInstrument(index);
                }
                // Force piano to re-show, if channel is modulator
                if (_this.doc.channel >= _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount) {
                    _this._piano.forceRender();
                }
                _this._renderInstrumentBar(_this.doc.song.channels[_this.doc.channel], index, ColorConfig_1.ColorConfig.getChannelColor(_this.doc.song, _this.doc.channel));
            }
            _this.refocusStage();
        };
        this._whenSetModChannel = function (mod) {
            var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
            var previouslyUnset = (instrument.modulators[mod] == 0 || SynthConfig_1.Config.modulators[instrument.modulators[mod]].forSong);
            _this.doc.selection.setModChannel(mod, _this._modChannelBoxes[mod].selectedIndex);
            var modChannel = Math.max(0, instrument.modChannels[mod]);
            // Check if setting was 'song' or 'none' and is changing to a channel number, in which case suggested instrument to mod will auto-set to the current one.
            if (_this.doc.song.channels[modChannel].instruments.length > 1 && previouslyUnset && _this._modChannelBoxes[mod].selectedIndex >= 2) {
                if (_this.doc.song.channels[modChannel].bars[_this.doc.bar] > 0) {
                    _this.doc.selection.setModInstrument(mod, _this.doc.song.channels[modChannel].patterns[_this.doc.song.channels[modChannel].bars[_this.doc.bar] - 1].instruments[0]);
                }
            }
            // Force piano to re-show
            _this._piano.forceRender();
        };
        this._whenSetModInstrument = function (mod) {
            _this.doc.selection.setModInstrument(mod, _this._modInstrumentBoxes[mod].selectedIndex);
            // Force piano to re-show
            _this._piano.forceRender();
        };
        this._whenSetModSetting = function (mod, invalidIndex) {
            if (invalidIndex === void 0) { invalidIndex = false; }
            var text = "none";
            if (_this._modSetBoxes[mod].selectedIndex != -1) {
                text = _this._modSetBoxes[mod].children[_this._modSetBoxes[mod].selectedIndex].textContent;
                if (invalidIndex) {
                    // A setting is invalid (not in instrument's effects). It will be the first index. Allow it, but mark it as red.
                    _this._modSetBoxes[mod].selectedOptions.item(0).style.setProperty("color", "red");
                    _this._modSetBoxes[mod].classList.add("invalidSetting");
                    _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].invalidModulators[mod] = true;
                }
                else {
                    _this._modSetBoxes[mod].classList.remove("invalidSetting");
                    _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].invalidModulators[mod] = false;
                }
            }
            if (!invalidIndex) // Invalid index means a set is actually not occurring, just the same index and a warning.
                _this.doc.selection.setModSetting(mod, text);
            // Force piano to re-show if channel is modulator, as text shown on it needs to update
            _this._piano.forceRender();
        };
        this._whenClickModTarget = function (mod) {
            if (_this._modChannelBoxes[mod].selectedIndex >= 2) {
                _this.doc.selection.setChannelBar(_this._modChannelBoxes[mod].selectedIndex - 2, _this.doc.bar);
            }
        };
        this._whenClickJumpToModTarget = function () {
            var channelIndex = _this.doc.channel;
            var instrumentIndex = _this.doc.getCurrentInstrument();
            if (channelIndex < _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount) {
                for (var modChannelIdx = _this.doc.song.pitchChannelCount + _this.doc.song.noiseChannelCount; modChannelIdx < _this.doc.song.channels.length; modChannelIdx++) {
                    var modChannel = _this.doc.song.channels[modChannelIdx];
                    var patternIdx = modChannel.bars[_this.doc.bar];
                    if (patternIdx > 0) {
                        var modInstrumentIdx = modChannel.patterns[patternIdx - 1].instruments[0];
                        var modInstrument = modChannel.instruments[modInstrumentIdx];
                        for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                            if (modInstrument.modChannels[mod] == channelIndex && (modInstrument.modInstruments[mod] == instrumentIndex || modInstrument.modInstruments[mod] >= _this.doc.song.channels[channelIndex].instruments.length)) {
                                _this.doc.selection.setChannelBar(modChannelIdx, _this.doc.bar);
                                return;
                            }
                        }
                    }
                }
            }
        };
        this._whenSetModFilter = function (mod) {
            _this.doc.selection.setModFilter(mod, _this._modFilterBoxes[mod].selectedIndex);
        };
        this._whenSetModEnvelope = function (mod) {
            _this.doc.selection.setModEnvelope(mod, _this._modEnvelopeBoxes[mod].selectedIndex);
        };
        this._whenSetChipWave = function () {
            _this.doc.record(new changes_1.ChangeChipWave(_this.doc, _this._chipWaveSelect.selectedIndex));
        };
        this._whenSetRingModChipWave = function () {
            _this.doc.record(new changes_1.ChangeRingModChipWave(_this.doc, _this._ringModWaveSelect.selectedIndex));
        };
        // advloop addition
        this._whenSetUseChipWaveAdvancedLoopControls = function () {
            _this.doc.record(new changes_1.ChangeChipWaveUseAdvancedLoopControls(_this.doc, _this._useChipWaveAdvancedLoopControlsBox.checked ? true : false));
        };
        this._whenSetChipWaveLoopMode = function () {
            _this.doc.record(new changes_1.ChangeChipWaveLoopMode(_this.doc, _this._chipWaveLoopModeSelect.selectedIndex));
        };
        this._whenSetChipWaveLoopStart = function () {
            // this._doc.record(new ChangeChipWaveLoopStart(this._doc, Math.max(0, Math.min(chipWaveLoopEnd - 1, parseInt(this._chipWaveLoopStartStepper.value)))));
            _this.doc.record(new changes_1.ChangeChipWaveLoopStart(_this.doc, parseInt(_this._chipWaveLoopStartStepper.value) | 0));
        };
        this._whenSetChipWaveLoopEnd = function () {
            // this._doc.record(new ChangeChipWaveLoopEnd(this._doc, Math.max(0, Math.min(chipWaveLength - 1, parseInt(this._chipWaveLoopEndStepper.value)))));
            _this.doc.record(new changes_1.ChangeChipWaveLoopEnd(_this.doc, parseInt(_this._chipWaveLoopEndStepper.value) | 0));
        };
        this._whenSetChipWaveLoopEndToEnd = function () {
            var channel = _this.doc.song.channels[_this.doc.channel];
            var instrument = channel.instruments[_this.doc.getCurrentInstrument()];
            var chipWave = SynthConfig_1.Config.rawRawChipWaves[instrument.chipWave];
            var chipWaveLength = chipWave.samples.length;
            _this.doc.record(new changes_1.ChangeChipWaveLoopEnd(_this.doc, chipWaveLength - 1));
        };
        this._whenSetChipWaveStartOffset = function () {
            // this._doc.record(new ChangeChipWaveStartOffset(this._doc, Math.max(0, Math.min(chipWaveLength - 1, parseInt(this._chipWaveStartOffsetStepper.value)))));
            _this.doc.record(new changes_1.ChangeChipWaveStartOffset(_this.doc, parseInt(_this._chipWaveStartOffsetStepper.value) | 0));
        };
        this._whenSetChipWavePlayBackwards = function () {
            _this.doc.record(new changes_1.ChangeChipWavePlayBackwards(_this.doc, _this._chipWavePlayBackwardsBox.checked));
        };
        // advloop addition
        this._whenSetNoiseWave = function () {
            _this.doc.record(new changes_1.ChangeNoiseWave(_this.doc, _this._chipNoiseSelect.selectedIndex));
        };
        this._whenSetTransition = function () {
            _this.doc.record(new changes_1.ChangeTransition(_this.doc, _this._transitionSelect.selectedIndex));
        };
        this._whenSetEffects = function () {
            var instrument = _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()];
            var oldValue = instrument.effects;
            var toggleFlag = SynthConfig_1.Config.effectOrder[_this._effectsSelect.selectedIndex - 1];
            _this.doc.record(new changes_1.ChangeToggleEffects(_this.doc, toggleFlag, null));
            _this._effectsSelect.selectedIndex = 0;
            if (instrument.effects > oldValue) {
                _this.doc.addedEffect = true;
            }
            _this.doc.notifier.changed();
        };
        this._whenSetVibrato = function () {
            _this.doc.record(new changes_1.ChangeVibrato(_this.doc, _this._vibratoSelect.selectedIndex));
        };
        this._whenSetVibratoType = function () {
            _this.doc.record(new changes_1.ChangeVibratoType(_this.doc, _this._vibratoTypeSelect.selectedIndex));
        };
        this._whenSetUnison = function () {
            _this.doc.record(new changes_1.ChangeUnison(_this.doc, _this._unisonSelect.selectedIndex));
        };
        this._whenSetChord = function () {
            _this.doc.record(new changes_1.ChangeChord(_this.doc, _this._chordSelect.selectedIndex));
        };
        this._whenSetMonophonicNote = function () {
            _this.doc.record(new changes_1.ChangeMonophonicTone(_this.doc, parseInt(_this._monophonicNoteInputBox.value) - 1));
        };
        this._addNewEnvelope = function () {
            _this.doc.record(new changes_1.ChangeAddEnvelope(_this.doc));
            _this.refocusStage();
            _this.doc.addedEnvelope = true;
        };
        this._zoomIn = function () {
            _this.doc.prefs.visibleOctaves = Math.max(1, _this.doc.prefs.visibleOctaves - 1);
            _this.doc.prefs.save();
            _this.doc.notifier.changed();
            _this.refocusStage();
        };
        this._zoomOut = function () {
            _this.doc.prefs.visibleOctaves = Math.min(SynthConfig_1.Config.pitchOctaves, _this.doc.prefs.visibleOctaves + 1);
            _this.doc.prefs.save();
            _this.doc.notifier.changed();
            _this.refocusStage();
        };
        this._fileMenuHandler = function (event) {
            switch (_this._fileMenu.value) {
                case "new":
                    _this.doc.goBackToStart();
                    _this.doc.song.restoreLimiterDefaults();
                    for (var _i = 0, _a = _this.doc.song.channels; _i < _a.length; _i++) {
                        var channel = _a[_i];
                        channel.muted = false;
                        channel.name = "";
                    }
                    _this.doc.record(new changes_1.ChangeSong(_this.doc, ""), false, true);
                    break;
                case "export":
                    _this._openPrompt("export");
                    break;
                case "import":
                    _this._openPrompt("import");
                    break;
                case "copyUrl":
                    _this._copyTextToClipboard(new URL("#" + _this.doc.song.toBase64String(), location.href).href);
                    break;
                case "generateSong":
                    var generated = window.generateRandomSong();
                    window.location.hash = "song=" + generated;
                    window.location.reload();
                    break;
                case "shareUrl":
                    navigator.share({ url: new URL("#" + _this.doc.song.toBase64String(), location.href).href });
                    break;
                case "shortenUrl":
                    var shortenerStrategy = "https://tinyurl.com/api-create.php?url=";
                    var localShortenerStrategy = window.localStorage.getItem("shortenerStrategySelect");
                    // if (localShortenerStrategy == "beepboxnet") shortenerStrategy = "https://www.beepbox.net/api-create.php?url=";
                    if (localShortenerStrategy == "isgd")
                        shortenerStrategy = "https://is.gd/create.php?format=simple&url=";
                    window.open(shortenerStrategy + encodeURIComponent(new URL("#" + _this.doc.song.toBase64String(), location.href).href));
                    break;
                case "configureShortener":
                    _this._openPrompt("configureShortener");
                    break;
                case "viewPlayer":
                    location.href = "player/" + (OFFLINE ? "index.html" : "") + "#song=" + _this.doc.song.toBase64String();
                    break;
                case "copyEmbed":
                    _this._copyTextToClipboard("<iframe width=\"384\" height=\"60\" style=\"border: none;\" src=\"".concat(new URL("player/#song=" + _this.doc.song.toBase64String(), location.href).href, "\"></iframe>"));
                    break;
                case "songRecovery":
                    _this._openPrompt("songRecovery");
                    break;
                case "multiplayer":
                    _this._openPrompt("multiplayer");
                    break;
            }
            _this._fileMenu.selectedIndex = 0;
        };
        this._editMenuHandler = function (event) {
            switch (_this._editMenu.value) {
                case "undo":
                    _this.doc.undo();
                    break;
                case "redo":
                    _this.doc.redo();
                    break;
                case "copy":
                    _this.doc.selection.copy();
                    break;
                case "insertBars":
                    _this.doc.selection.insertBars();
                    break;
                case "deleteBars":
                    _this.doc.selection.deleteBars();
                    break;
                case "insertChannel":
                    _this.doc.selection.insertChannel();
                    break;
                case "deleteChannel":
                    _this.doc.selection.deleteChannel();
                    break;
                case "pasteNotes":
                    _this.doc.selection.pasteNotes();
                    break;
                case "pasteNumbers":
                    _this.doc.selection.pasteNumbers();
                    break;
                case "transposeUp":
                    _this.doc.selection.transpose(true, false);
                    break;
                case "transposeDown":
                    _this.doc.selection.transpose(false, false);
                    break;
                case "selectAll":
                    _this.doc.selection.selectAll();
                    break;
                case "selectChannel":
                    _this.doc.selection.selectChannel();
                    break;
                case "duplicatePatterns":
                    _this.doc.selection.duplicatePatterns(false);
                    break;
                case "barCount":
                    _this._openPrompt("barCount");
                    break;
                case "beatsPerBar":
                    _this._openPrompt("beatsPerBar");
                    break;
                case "moveNotesSideways":
                    _this._openPrompt("moveNotesSideways");
                    break;
                case "channelSettings":
                    _this._openPrompt("channelSettings");
                    break;
                case "limiterSettings":
                    _this._openPrompt("limiterSettings");
                    break;
                case "generateEuclideanRhythm":
                    _this._openPrompt("generateEuclideanRhythm");
                    break;
                case "addExternal":
                    _this._openPrompt("addExternal");
                    break;
            }
            _this._editMenu.selectedIndex = 0;
        };
        this._optionsMenuHandler = function (event) {
            switch (_this._optionsMenu.value) {
                case "autoPlay":
                    _this.doc.prefs.autoPlay = !_this.doc.prefs.autoPlay;
                    break;
                case "autoFollow":
                    _this.doc.prefs.autoFollow = !_this.doc.prefs.autoFollow;
                    break;
                case "enableNotePreview":
                    _this.doc.prefs.enableNotePreview = !_this.doc.prefs.enableNotePreview;
                    break;
                case "showLetters":
                    _this.doc.prefs.showLetters = !_this.doc.prefs.showLetters;
                    break;
                case "showFifth":
                    _this.doc.prefs.showFifth = !_this.doc.prefs.showFifth;
                    break;
                case "notesOutsideScale":
                    _this.doc.prefs.notesOutsideScale = !_this.doc.prefs.notesOutsideScale;
                    break;
                case "setDefaultScale":
                    _this.doc.prefs.defaultScale = _this.doc.song.scale;
                    break;
                case "showChannels":
                    _this.doc.prefs.showChannels = !_this.doc.prefs.showChannels;
                    break;
                case "showScrollBar":
                    _this.doc.prefs.showScrollBar = !_this.doc.prefs.showScrollBar;
                    break;
                case "alwaysFineNoteVol":
                    _this.doc.prefs.alwaysFineNoteVol = !_this.doc.prefs.alwaysFineNoteVol;
                    break;
                case "enableChannelMuting":
                    _this.doc.prefs.enableChannelMuting = !_this.doc.prefs.enableChannelMuting;
                    for (var _i = 0, _a = _this.doc.song.channels; _i < _a.length; _i++) {
                        var channel = _a[_i];
                        channel.muted = false;
                    }
                    break;
                case "displayBrowserUrl":
                    _this.doc.toggleDisplayBrowserUrl();
                    break;
                case "displayVolumeBar":
                    _this.doc.prefs.displayVolumeBar = !_this.doc.prefs.displayVolumeBar;
                    break;
                case "notesFlashWhenPlayed":
                    _this.doc.prefs.notesFlashWhenPlayed = !_this.doc.prefs.notesFlashWhenPlayed;
                    break;
                case "layout":
                    _this._openPrompt("layout");
                    break;
                case "colorTheme":
                    _this._openPrompt("theme");
                    break;
                case "customTheme":
                    _this._openPrompt("customTheme");
                    break;
                case "recordingSetup":
                    _this._openPrompt("recordingSetup");
                    break;
                case "showOscilloscope":
                    _this.doc.prefs.showOscilloscope = !_this.doc.prefs.showOscilloscope;
                    break;
                case "showDescription":
                    _this.doc.prefs.showDescription = !_this.doc.prefs.showDescription;
                    break;
                case "showInstrumentScrollbars":
                    _this.doc.prefs.showInstrumentScrollbars = !_this.doc.prefs.showInstrumentScrollbars;
                    break;
                case "showSampleLoadingStatus":
                    _this.doc.prefs.showSampleLoadingStatus = !_this.doc.prefs.showSampleLoadingStatus;
                    break;
                case "closePromptByClickoff":
                    _this.doc.prefs.closePromptByClickoff = !_this.doc.prefs.closePromptByClickoff;
                    break;
                case "instrumentCopyPaste":
                    _this.doc.prefs.instrumentCopyPaste = !_this.doc.prefs.instrumentCopyPaste;
                    break;
                case "instrumentImportExport":
                    _this.doc.prefs.instrumentImportExport = !_this.doc.prefs.instrumentImportExport;
                    break;
                case "instrumentButtonsAtTop":
                    _this.doc.prefs.instrumentButtonsAtTop = !_this.doc.prefs.instrumentButtonsAtTop;
                    break;
                case "frostedGlassBackground":
                    _this.doc.prefs.frostedGlassBackground = !_this.doc.prefs.frostedGlassBackground;
                    break;
                case "rollNoveltyPresets":
                    _this.doc.prefs.rollNoveltyPresets = !_this.doc.prefs.rollNoveltyPresets;
                    break;
                case "enableTagSearch":
                    _this.doc.prefs.enableTagSearch = !_this.doc.prefs.enableTagSearch;
                    _this._presetTagsInputBox.value = "";
                    break;
            }
            _this._optionsMenu.selectedIndex = 0;
            _this.doc.notifier.changed();
            _this.doc.prefs.save();
        };
        this._customWavePresetHandler = function (event) {
            // Update custom wave value
            var customWaveArray = new Float32Array(64);
            var index = _this._customWavePresetDrop.selectedIndex - 1;
            var maxValue = Number.MIN_VALUE;
            var minValue = Number.MAX_VALUE;
            var arrayPoint = 0;
            var arrayStep = (SynthConfig_1.Config.chipWaves[index].samples.length - 1) / 64.0;
            for (var i = 0; i < 64; i++) {
                // Compute derivative to get original wave.
                customWaveArray[i] = (SynthConfig_1.Config.chipWaves[index].samples[Math.floor(arrayPoint)] - SynthConfig_1.Config.chipWaves[index].samples[(Math.floor(arrayPoint) + 1)]) / arrayStep;
                if (customWaveArray[i] < minValue)
                    minValue = customWaveArray[i];
                if (customWaveArray[i] > maxValue)
                    maxValue = customWaveArray[i];
                // Scale an any-size array to 64 elements
                arrayPoint += arrayStep;
            }
            for (var i = 0; i < 64; i++) {
                // Change array range from Min~Max to 0~(Max-Min)
                customWaveArray[i] -= minValue;
                // Divide by (Max-Min) to get a range of 0~1,
                customWaveArray[i] /= (maxValue - minValue);
                //then multiply by 48 to get 0~48,
                customWaveArray[i] *= 48.0;
                //then subtract 24 to get - 24~24
                customWaveArray[i] -= 24.0;
                //need to force integers
                customWaveArray[i] = Math.ceil(customWaveArray[i]);
                // Copy back data to canvas
                _this._customWaveDrawCanvas.newArray[i] = customWaveArray[i];
            }
            //this._instrumentVolumeSlider.input.value = "" + Math.round(Config.waveVolumes[index] * 50.0 - 50.0);
            _this.doc.record(new changes_1.ChangeCustomWave(_this.doc, customWaveArray));
            if (+_this._instrumentVolumeSlider.input.value != -SynthConfig_1.Config.volumeRange / 2) {
                _this.doc.record(new changes_1.ChangeVolume(_this.doc, +_this._instrumentVolumeSlider.input.value, Math.min(Math.max(-SynthConfig_1.Config.volumeRange / 2 + Math.round(Math.sqrt(SynthConfig_1.Config.chipWaves[index].expression) * SynthConfig_1.Config.volumeRange / 2 + parseInt(_this._instrumentVolumeSlider.input.value)), -SynthConfig_1.Config.volumeRange / 2) >> 1, SynthConfig_1.Config.volumeRange / 2)));
            }
            _this._customWavePresetDrop.selectedIndex = 0;
            _this.doc.notifier.changed();
            _this.doc.prefs.save();
        };
        this.doc.notifier.watch(this.whenUpdated);
        this.doc.modRecordingHandler = function () { _this.handleModRecording(); };
        new MidiInput_1.MidiInputHandler(this.doc);
        window.addEventListener("resize", this.whenUpdated);
        window.requestAnimationFrame(this.updatePlayButton);
        window.requestAnimationFrame(this._animate);
        if (!("share" in navigator)) {
            var shareOption = this._fileMenu.querySelector("[value='shareUrl']");
            if (shareOption) {
                shareOption.disabled = true;
                shareOption.textContent += " (Not supported)";
            }
        }
        this._scaleSelect.appendChild(optgroup({ label: "Edit" }, option({ value: "forceScale" }, "Snap Notes To Scale"), option({ value: "customize" }, "Edit Custom Scale")));
        this._keySelect.appendChild(optgroup({ label: "Edit" }, option({ value: "detectKey" }, "Detect Key")));
        this._rhythmSelect.appendChild(optgroup({ label: "Edit" }, option({ value: "forceRhythm" }, "Snap Notes To Rhythm")));
        this._vibratoSelect.appendChild(option({ hidden: true, value: 5 }, "custom"));
        //this._unisonSelect.appendChild(option({ hidden: true, value: 28 }, "custom"));
        this._unisonSelect.appendChild(option({ hidden: true, value: SynthConfig_1.Config.unisons.length }, "custom"));
        this._showModSliders = new Array(SynthConfig_1.Config.modulators.length);
        this._modSliderValues = new Array(SynthConfig_1.Config.modulators.length);
        //set default values
        for (var i = 0; i < SynthConfig_1.Config.modulators.length; i++) {
            this._newShowModSliders[i] = [];
            this._showModSliders[i] = [];
            this._modSliderValues[i] = [];
        }
        this._phaseModGroup.appendChild(div({ class: "selectRow", style: "color: ".concat(ColorConfig_1.ColorConfig.secondaryText, "; height: 1em; margin-top: 0.5em;") }, div({ style: "margin-right: .1em; visibility: hidden;" }, 1 + "."), div({ style: "width: 3em; margin-right: .3em;", class: "tip", onclick: function () { return _this._openPrompt("operatorFrequency"); } }, "Freq:"), div({ class: "tip", onclick: function () { return _this._openPrompt("operatorVolume"); } }, "Volume:")));
        var _loop_1 = function (i) {
            var operatorIndex = i;
            var operatorNumber = div({ style: "margin-right: 0px; color: " + ColorConfig_1.ColorConfig.secondaryText + ";" }, i + 1 + "");
            var frequencySelect = buildOptions(select({ style: "width: 100%;", title: "Frequency" }), SynthConfig_1.Config.operatorFrequencies.map(function (freq) { return freq.name; }));
            var amplitudeSlider = new HTMLWrapper_1.Slider(input({ type: "range", min: "0", max: SynthConfig_1.Config.operatorAmplitudeMax, value: "0", step: "1", title: "Volume" }), this_1.doc, function (oldValue, newValue) { return new changes_1.ChangeOperatorAmplitude(_this.doc, operatorIndex, oldValue, newValue); }, false);
            var waveformSelect = buildOptions(select({ style: "width: 100%;", title: "Waveform" }), SynthConfig_1.Config.operatorWaves.map(function (wave) { return wave.name; }));
            var waveformDropdown = button({ style: "margin-left:0em; margin-right: 2px; height:1.5em; width: 8px; max-width: 10px; padding: 0px; font-size: 8px;", onclick: function () { return _this._toggleDropdownMenu(4 /* DropdownID.FM */, i); } }, "▼");
            var waveformDropdownHint = span({ class: "tip", style: "margin-left: 10px;", onclick: function () { return _this._openPrompt("operatorWaveform"); } }, "Wave:");
            var waveformPulsewidthSlider = new HTMLWrapper_1.Slider(input({ style: "margin-left: 10px; width: 85%;", type: "range", min: "0", max: SynthConfig_1.Config.pwmOperatorWaves.length - 1, value: "0", step: "1", title: "Pulse Width" }), this_1.doc, function (oldValue, newValue) { return new changes_1.ChangeOperatorPulseWidth(_this.doc, operatorIndex, oldValue, newValue); }, true);
            var waveformDropdownRow = div({ class: "selectRow" }, waveformDropdownHint, waveformPulsewidthSlider.container, div({ class: "selectContainer", style: "width: 6em; margin-left: .3em;" }, waveformSelect));
            var waveformDropdownGroup = div({ class: "operatorRow" }, waveformDropdownRow);
            var row = div({ class: "selectRow" }, operatorNumber, waveformDropdown, div({ class: "selectContainer", style: "width: 3em; margin-right: .3em;" }, frequencySelect), amplitudeSlider.container);
            this_1._phaseModGroup.appendChild(row);
            this_1._operatorRows[i] = row;
            this_1._operatorAmplitudeSliders[i] = amplitudeSlider;
            this_1._operatorFrequencySelects[i] = frequencySelect;
            this_1._operatorDropdowns[i] = waveformDropdown;
            this_1._operatorWaveformHints[i] = waveformDropdownHint;
            this_1._operatorWaveformSelects[i] = waveformSelect;
            this_1._operatorWaveformPulsewidthSliders[i] = waveformPulsewidthSlider;
            this_1._operatorDropdownRows[i] = waveformDropdownRow;
            this_1._phaseModGroup.appendChild(waveformDropdownGroup);
            this_1._operatorDropdownGroups[i] = waveformDropdownGroup;
            this_1._openOperatorDropdowns[i] = false;
            waveformSelect.addEventListener("change", function () {
                _this.doc.record(new changes_1.ChangeOperatorWaveform(_this.doc, operatorIndex, waveformSelect.selectedIndex));
            });
            frequencySelect.addEventListener("change", function () {
                _this.doc.record(new changes_1.ChangeOperatorFrequency(_this.doc, operatorIndex, frequencySelect.selectedIndex));
            });
        };
        var this_1 = this;
        for (var i = 0; i < SynthConfig_1.Config.operatorCount + 2; i++) {
            _loop_1(i);
        }
        this._drumsetGroup.appendChild(div({ class: "selectRow" }, span({ class: "tip", onclick: function () { return _this._openPrompt("drumsetEnvelope"); } }, "Envelope:"), span({ class: "tip", onclick: function () { return _this._openPrompt("drumsetSpectrum"); } }, "Spectrum:"), this._drumsetZoom));
        var _loop_2 = function (i) {
            var drumIndex = i;
            var spectrumEditor = new SpectrumEditor_1.SpectrumEditor(this_2.doc, drumIndex);
            spectrumEditor.container.addEventListener("mousedown", this_2.refocusStage);
            this_2._drumsetSpectrumEditors[i] = spectrumEditor;
            var envelopeSelect = buildOptions(select({ style: "width: 100%;", title: "Filter Envelope" }), SynthConfig_1.Config.envelopes.map(function (envelope) { return envelope.name; }));
            this_2._drumsetEnvelopeSelects[i] = envelopeSelect;
            envelopeSelect.addEventListener("change", function () {
                _this.doc.record(new changes_1.ChangeDrumsetEnvelope(_this.doc, drumIndex, envelopeSelect.selectedIndex));
            });
            var row = div({ class: "selectRow" }, div({ class: "selectContainer", style: "width: 5em; margin-right: .3em;" }, envelopeSelect), this_2._drumsetSpectrumEditors[i].container);
            this_2._drumsetGroup.appendChild(row);
        };
        var this_2 = this;
        for (var i = SynthConfig_1.Config.drumCount - 1; i >= 0; i--) {
            _loop_2(i);
        }
        this._modNameRows = [];
        this._modChannelBoxes = [];
        this._modInstrumentBoxes = [];
        this._modSetRows = [];
        this._modSetBoxes = [];
        this._modFilterRows = [];
        this._modFilterBoxes = [];
        this._modEnvelopeRows = [];
        this._modEnvelopeBoxes = [];
        this._modTargetIndicators = [];
        var _loop_3 = function (mod) {
            var modChannelBox = select({ style: "width: 100%; color: currentColor; text-overflow:ellipsis;" });
            var modInstrumentBox = select({ style: "width: 100%; color: currentColor;" });
            var modNameRow = div({ class: "operatorRow", style: "height: 1em; margin-bottom: 0.65em;" }, div({ class: "tip", style: "width: 10%; max-width: 5.4em;", id: "modChannelText" + mod, onclick: function () { return _this._openPrompt("modChannel"); } }, "Ch:"), div({ class: "selectContainer", style: 'width: 35%;' }, modChannelBox), div({ class: "tip", style: "width: 1.2em; margin-left: 0.8em;", id: "modInstrumentText" + mod, onclick: function () { return _this._openPrompt("modInstrument"); } }, "Ins:"), div({ class: "selectContainer", style: "width: 10%;" }, modInstrumentBox));
            var modSetBox = select();
            var modFilterBox = select();
            var modEnvelopeBox = select();
            var modSetRow = div({ class: "selectRow", id: "modSettingText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: function () { return _this._openPrompt("modSet"); } }, "Setting: "), span({ class: "tip", style: "font-size:x-small;", onclick: function () { return _this._openPrompt("modSetInfo" + mod); } }, "?"), div({ class: "selectContainer" }, modSetBox));
            var modFilterRow = div({ class: "selectRow", id: "modFilterText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: function () { return _this._openPrompt("modFilter" + mod); } }, "Target: "), div({ class: "selectContainer" }, modFilterBox));
            var modEnvelopeRow = div({ class: "selectRow", id: "modEnvelopeText" + mod, style: "margin-bottom: 0.9em; color: currentColor;" }, span({ class: "tip", onclick: function () { return _this._openPrompt("modEnvelope"); } }, "Envelope: "), div({ class: "selectContainer" }, modEnvelopeBox));
            // @jummbus: I could template this up above and simply create from the template, especially since I also reuse it in song settings, but unsure how to do that with imperative-html :P
            var modTarget = elements_strict_1.SVG.svg({ style: "transform: translate(0px, 1px);", width: "1.5em", height: "1em", viewBox: "0 0 200 200" }, [
                elements_strict_1.SVG.path({ d: "M90 155 l0 -45 -45 0 c-25 0 -45 -4 -45 -10 0 -5 20 -10 45 -10 l45 0 0 -45 c0 -25 5 -45 10 -45 6 0 10 20 10 45 l0 45 45 0 c25 0 45 5 45 10 0 6 -20 10 -45 10 l -45 0 0 45 c0 25 -4 45 -10 45 -5 0 -10 -20 -10 -45z" }),
                elements_strict_1.SVG.path({ d: "M42 158 c-15 -15 -16 -38 -2 -38 6 0 10 7 10 15 0 8 7 15 15 15 8 0 15 5 15 10 0 14 -23 13 -38 -2z" }),
                elements_strict_1.SVG.path({ d: "M120 160 c0 -5 7 -10 15 -10 8 0 15 -7 15 -15 0 -8 5 -15 10 -15 14 0 13 23 -2 38 -15 15 -38 16 -38 2z" }),
                elements_strict_1.SVG.path({ d: "M32 58 c3 -23 48 -40 48 -19 0 6 -7 11 -15 11 -8 0 -15 7 -15 15 0 8 -5 15 -11 15 -6 0 -9 -10 -7 -22z" }),
                elements_strict_1.SVG.path({ d: "M150 65 c0 -8 -7 -15 -15 -15 -8 0 -15 -4 -15 -10 0 -14 23 -13 38 2 15 15 16 38 2 38 -5 0 -10 -7 -10 -15z" })
            ]);
            this_3._modNameRows.push(modNameRow);
            this_3._modChannelBoxes.push(modChannelBox);
            this_3._modInstrumentBoxes.push(modInstrumentBox);
            this_3._modSetRows.push(modSetRow);
            this_3._modSetBoxes.push(modSetBox);
            this_3._modFilterRows.push(modFilterRow);
            this_3._modFilterBoxes.push(modFilterBox);
            this_3._modEnvelopeRows.push(modEnvelopeRow);
            this_3._modEnvelopeBoxes.push(modEnvelopeBox);
            this_3._modTargetIndicators.push(modTarget);
            this_3._modulatorGroup.appendChild(div({ style: "margin: 3px 0; font-weight: bold; margin-bottom: 0.7em; text-align: center; color: " + ColorConfig_1.ColorConfig.secondaryText + "; background: " + ColorConfig_1.ColorConfig.uiWidgetBackground + ";" }, ["Modulator " + (mod + 1), modTarget]));
            this_3._modulatorGroup.appendChild(modNameRow);
            this_3._modulatorGroup.appendChild(modSetRow);
            this_3._modulatorGroup.appendChild(modFilterRow);
            this_3._modulatorGroup.appendChild(modEnvelopeRow);
        };
        var this_3 = this;
        for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
            _loop_3(mod);
        }
        // @jummbus - Unsure why this hack is needed for alignment, but I've never been a css wiz...
        this._pitchShiftSlider.container.style.setProperty("transform", "translate(0px, 3px)");
        this._pitchShiftSlider.container.style.setProperty("width", "100%");
        this._fileMenu.addEventListener("change", this._fileMenuHandler);
        this._editMenu.addEventListener("change", this._editMenuHandler);
        this._optionsMenu.addEventListener("change", this._optionsMenuHandler);
        this._customWavePresetDrop.addEventListener("change", this._customWavePresetHandler);
        this._tempoStepper.addEventListener("change", this._whenSetTempo);
        this._scaleSelect.addEventListener("change", this._whenSetScale);
        this._keySelect.addEventListener("change", this._whenSetKey);
        this._octaveStepper.addEventListener("change", this._whenSetOctave);
        this._rhythmSelect.addEventListener("change", this._whenSetRhythm);
        //this._pitchedPresetSelect.addEventListener("change", this._whenSetPitchedPreset);
        //this._drumPresetSelect.addEventListener("change", this._whenSetDrumPreset);
        this._algorithmSelect.addEventListener("change", this._whenSetAlgorithm);
        this._instrumentsButtonBar.addEventListener("click", this._whenSelectInstrument);
        //this._customizeInstrumentButton.addEventListener("click", this._whenCustomizePressed);
        this._feedbackTypeSelect.addEventListener("change", this._whenSetFeedbackType);
        this._algorithm6OpSelect.addEventListener("change", this._whenSet6OpAlgorithm);
        this._feedback6OpTypeSelect.addEventListener("change", this._whenSet6OpFeedbackType);
        this._chipWaveSelect.addEventListener("change", this._whenSetChipWave);
        this._ringModWaveSelect.addEventListener("change", this._whenSetRingModChipWave);
        // advloop addition
        this._useChipWaveAdvancedLoopControlsBox.addEventListener("input", this._whenSetUseChipWaveAdvancedLoopControls);
        this._chipWaveLoopModeSelect.addEventListener("change", this._whenSetChipWaveLoopMode);
        this._chipWaveLoopStartStepper.addEventListener("change", this._whenSetChipWaveLoopStart);
        this._chipWaveLoopEndStepper.addEventListener("change", this._whenSetChipWaveLoopEnd);
        this._setChipWaveLoopEndToEndButton.addEventListener("click", this._whenSetChipWaveLoopEndToEnd);
        this._chipWaveStartOffsetStepper.addEventListener("change", this._whenSetChipWaveStartOffset);
        this._chipWavePlayBackwardsBox.addEventListener("input", this._whenSetChipWavePlayBackwards);
        // advloop addition
        this._sampleLoadingStatusContainer.addEventListener("click", this._whenSampleLoadingStatusClicked);
        this._chipNoiseSelect.addEventListener("change", this._whenSetNoiseWave);
        this._transitionSelect.addEventListener("change", this._whenSetTransition);
        this._effectsSelect.addEventListener("change", this._whenSetEffects);
        this._unisonSelect.addEventListener("change", this._whenSetUnison);
        this._chordSelect.addEventListener("change", this._whenSetChord);
        this._monophonicNoteInputBox.addEventListener("input", this._whenSetMonophonicNote);
        this._vibratoSelect.addEventListener("change", this._whenSetVibrato);
        this._vibratoTypeSelect.addEventListener("change", this._whenSetVibratoType);
        this._playButton.addEventListener("click", this.togglePlay);
        this._pauseButton.addEventListener("click", this.togglePlay);
        this._recordButton.addEventListener("click", this._toggleRecord);
        this._stopButton.addEventListener("click", this._toggleRecord);
        // Start recording instead of opening context menu when control-clicking the record button on a Mac.
        this._recordButton.addEventListener("contextmenu", function (event) {
            if (event.ctrlKey) {
                event.preventDefault();
                _this._toggleRecord();
            }
        });
        this._stopButton.addEventListener("contextmenu", function (event) {
            if (event.ctrlKey) {
                event.preventDefault();
                _this._toggleRecord();
            }
        });
        this._prevBarButton.addEventListener("click", this._whenPrevBarPressed);
        this._nextBarButton.addEventListener("click", this._whenNextBarPressed);
        this._volumeSlider.input.addEventListener("input", this._setVolumeSlider);
        this._zoomInButton.addEventListener("click", this._zoomIn);
        this._zoomOutButton.addEventListener("click", this._zoomOut);
        this._patternArea.addEventListener("mousedown", this._refocusStageNotEditing);
        this._trackArea.addEventListener("mousedown", this.refocusStage);
        // The song volume slider is styled slightly different than the class' default.
        this._volumeSlider.container.style.setProperty("flex-grow", "1");
        this._volumeSlider.container.style.setProperty("display", "flex");
        this._volumeBarContainer.style.setProperty("flex-grow", "1");
        this._volumeBarContainer.style.setProperty("display", "flex");
        // Also, any slider with a multiplicative effect instead of a replacement effect gets a different mod color, and a round slider.
        this._volumeSlider.container.style.setProperty("--mod-color", ColorConfig_1.ColorConfig.multiplicativeModSlider);
        this._volumeSlider.container.style.setProperty("--mod-border-radius", "50%");
        this._instrumentVolumeSlider.container.style.setProperty("--mod-color", ColorConfig_1.ColorConfig.multiplicativeModSlider);
        this._instrumentVolumeSlider.container.style.setProperty("--mod-border-radius", "50%");
        this._feedbackAmplitudeSlider.container.style.setProperty("--mod-color", ColorConfig_1.ColorConfig.multiplicativeModSlider);
        this._feedbackAmplitudeSlider.container.style.setProperty("--mod-border-radius", "50%");
        for (var i = 0; i < SynthConfig_1.Config.operatorCount + 2; i++) {
            this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-color", ColorConfig_1.ColorConfig.multiplicativeModSlider);
            this._operatorAmplitudeSliders[i].container.style.setProperty("--mod-border-radius", "50%");
        }
        var thisRef = this;
        var _loop_4 = function (mod) {
            this_4._modChannelBoxes[mod].addEventListener("change", function () { thisRef._whenSetModChannel(mod); });
            this_4._modInstrumentBoxes[mod].addEventListener("change", function () { thisRef._whenSetModInstrument(mod); });
            this_4._modSetBoxes[mod].addEventListener("change", function () { thisRef._whenSetModSetting(mod); });
            this_4._modFilterBoxes[mod].addEventListener("change", function () { thisRef._whenSetModFilter(mod); });
            this_4._modEnvelopeBoxes[mod].addEventListener("change", function () { thisRef._whenSetModEnvelope(mod); });
            this_4._modTargetIndicators[mod].addEventListener("click", function () { thisRef._whenClickModTarget(mod); });
        };
        var this_4 = this;
        for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
            _loop_4(mod);
        }
        this._jumpToModIndicator.addEventListener("click", function () { thisRef._whenClickJumpToModTarget(); });
        this._patternArea.addEventListener("mousedown", this.refocusStage);
        this._fadeInOutEditor.container.addEventListener("mousedown", this.refocusStage);
        this._spectrumEditor.container.addEventListener("mousedown", this.refocusStage);
        this._eqFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._noteFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._songEqFilterEditor.container.addEventListener("mousedown", this.refocusStage);
        this._harmonicsEditor.container.addEventListener("mousedown", this.refocusStage);
        this._tempoStepper.addEventListener("keydown", this._tempoStepperCaptureNumberKeys, false);
        this._addEnvelopeButton.addEventListener("click", this._addNewEnvelope);
        this._patternArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this._trackArea.addEventListener("contextmenu", this._disableCtrlContextMenu);
        this.mainLayer.addEventListener("keydown", this._whenKeyPressed);
        this.mainLayer.addEventListener("keyup", this._whenKeyReleased);
        this.mainLayer.addEventListener("focusin", this._onFocusIn);
        this._instrumentCopyButton.addEventListener("click", this._copyInstrument.bind(this));
        this._instrumentPasteButton.addEventListener("click", this._pasteInstrument.bind(this));
        this._instrumentExportButton.addEventListener("click", this._exportInstruments.bind(this));
        this._instrumentImportButton.addEventListener("click", this._importInstruments.bind(this));
        SynthConfig_1.sampleLoadEvents.addEventListener("sampleloaded", this._updateSampleLoadingBar.bind(this));
        this._instrumentVolumeSliderInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeVolume(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].volume, Math.min(25.0, Math.max(-25.0, Math.round(+_this._instrumentVolumeSliderInputBox.value))))); });
        this._panSliderInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangePan(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].pan, Math.min(100.0, Math.max(0.0, Math.round(+_this._panSliderInputBox.value))))); });
        this._pwmSliderInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangePulseWidth(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].pulseWidth, Math.min(SynthConfig_1.Config.pulseWidthRange, Math.max(1.0, Math.round(+_this._pwmSliderInputBox.value))))); });
        this._detuneSliderInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeDetune(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].detune, Math.min(SynthConfig_1.Config.detuneMax - SynthConfig_1.Config.detuneCenter, Math.max(SynthConfig_1.Config.detuneMin - SynthConfig_1.Config.detuneCenter, Math.round(+_this._detuneSliderInputBox.value))))); });
        this._unisonVoicesInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeUnisonVoices(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].unisonVoices, Math.min(SynthConfig_1.Config.unisonVoicesMax, Math.max(SynthConfig_1.Config.unisonVoicesMin, Math.round(+_this._unisonVoicesInputBox.value))))); });
        this._unisonSpreadInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeUnisonSpread(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].unisonSpread, Math.min(SynthConfig_1.Config.unisonSpreadMax, Math.max(SynthConfig_1.Config.unisonSpreadMin, +_this._unisonSpreadInputBox.value)))); });
        this._unisonOffsetInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeUnisonOffset(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].unisonOffset, Math.min(SynthConfig_1.Config.unisonOffsetMax, Math.max(SynthConfig_1.Config.unisonOffsetMin, +_this._unisonOffsetInputBox.value)))); });
        this._unisonExpressionInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeUnisonExpression(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].unisonExpression, Math.min(SynthConfig_1.Config.unisonExpressionMax, Math.max(SynthConfig_1.Config.unisonExpressionMin, +_this._unisonExpressionInputBox.value)))); });
        this._unisonSignInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeUnisonSign(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].unisonSign, Math.min(SynthConfig_1.Config.unisonSignMax, Math.max(SynthConfig_1.Config.unisonSignMin, +_this._unisonSignInputBox.value)))); });
        this._customWaveDraw.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeCustomWave(_this.doc, _this._customWaveDrawCanvas.newArray)); });
        this._twoNoteArpBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeFastTwoNoteArp(_this.doc, _this._twoNoteArpBox.checked)); });
        this._clicklessTransitionBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeClicklessTransition(_this.doc, _this._clicklessTransitionBox.checked)); });
        this._aliasingBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeAliasing(_this.doc, _this._aliasingBox.checked)); });
        this._upperNoteLimitInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeUpperLimit(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].upperNoteLimit, (Math.min(SynthConfig_1.Config.maxPitch, Math.max(0.0, Math.round(+_this._upperNoteLimitInputBox.value)))))); });
        this._lowerNoteLimitInputBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeLowerLimit(_this.doc, _this.doc.song.channels[_this.doc.channel].instruments[_this.doc.getCurrentInstrument()].lowerNoteLimit, (Math.min(SynthConfig_1.Config.maxPitch, Math.max(0.0, Math.round(+_this._lowerNoteLimitInputBox.value)))))); });
        this._invertWaveBox.addEventListener("input", function () { _this.doc.record(new changes_1.ChangeInvertWave(_this.doc, _this._invertWaveBox.checked)); });
        this._promptContainer.addEventListener("click", function (event) {
            if (_this.doc.prefs.closePromptByClickoff === true) {
                if (_this.prompt != null && _this.prompt.gotMouseUp === true)
                    return;
                if (event.target == _this._promptContainer) {
                    _this.doc.undo();
                }
            }
        });
        // Sorry, bypassing typescript type safety on this function because I want to use the new "passive" option.
        //this._trackAndMuteContainer.addEventListener("scroll", this._onTrackAreaScroll, {capture: false, passive: true});
        this._trackAndMuteContainer.addEventListener("scroll", this._onTrackAreaScroll, { capture: false, passive: true });
        if (EditorConfig_1.isMobile) {
            var autoPlayOption = this._optionsMenu.querySelector("[value=autoPlay]");
            autoPlayOption.disabled = true;
            autoPlayOption.setAttribute("hidden", "");
        }
        // Beepbox uses availHeight too, but I have a display that fails the check even when one of the other layouts would look better on it. -jummbus
        if (window.screen.availWidth < 710 /*|| window.screen.availHeight < 710*/) {
            var layoutOption = this._optionsMenu.querySelector("[value=layout]");
            layoutOption.disabled = true;
            layoutOption.setAttribute("hidden", "");
        }
    }
    SongEditor.prototype._updateSampleLoadingBar = function (_e) {
        // @TODO: Avoid this cast and type EventTarget/Event properly.
        var e = _e;
        var percent = (e.totalSamples === 0
            ? 0
            : Math.floor((e.samplesLoaded / e.totalSamples) * 100));
        this._sampleLoadingBar.style.width = "".concat(percent, "%");
    };
    SongEditor.prototype._toggleAlgorithmCanvas = function (e) {
        if (this._customAlgorithmCanvas.mode != "feedback") {
            this._customAlgorithmCanvas.mode = "feedback";
            e.target.textContent = "F";
            this._algorithmCanvasSwitch.value = "feedback";
        }
        else {
            this._customAlgorithmCanvas.mode = "algorithm";
            e.target.textContent = "A";
        }
        this._customAlgorithmCanvas.redrawCanvas();
    };
    SongEditor.prototype._toggleDropdownMenu = function (dropdown, submenu, subtype) {
        if (submenu === void 0) { submenu = 0; }
        if (subtype === void 0) { subtype = null; }
        var target = this._vibratoDropdown;
        var group = this._vibratoDropdownGroup;
        switch (dropdown) {
            case 7 /* DropdownID.Envelope */:
                target = this._envelopeDropdown;
                this._openEnvelopeDropdown = this._openEnvelopeDropdown ? false : true;
                group = this._envelopeDropdownGroup;
                break;
            case 0 /* DropdownID.Vibrato */:
                target = this._vibratoDropdown;
                this._openVibratoDropdown = this._openVibratoDropdown ? false : true;
                group = this._vibratoDropdownGroup;
                break;
            case 1 /* DropdownID.Pan */:
                target = this._panDropdown;
                this._openPanDropdown = this._openPanDropdown ? false : true;
                group = this._panDropdownGroup;
                break;
            case 2 /* DropdownID.Chord */:
                target = this._chordDropdown;
                this._openChordDropdown = this._openChordDropdown ? false : true;
                group = this._chordDropdownGroup;
                break;
            case 3 /* DropdownID.Transition */:
                target = this._transitionDropdown;
                this._openTransitionDropdown = this._openTransitionDropdown ? false : true;
                group = this._transitionDropdownGroup;
                break;
            case 4 /* DropdownID.FM */:
                target = this._operatorDropdowns[submenu];
                this._openOperatorDropdowns[submenu] = this._openOperatorDropdowns[submenu] ? false : true;
                group = this._operatorDropdownGroups[submenu];
                break;
            case 5 /* DropdownID.PulseWidth */:
                target = this._pulseWidthDropdown;
                this._openPulseWidthDropdown = this._openPulseWidthDropdown ? false : true;
                group = this._pulseWidthDropdownGroup;
                break;
            case 6 /* DropdownID.Unison */:
                target = this._unisonDropdown;
                this._openUnisonDropdown = this._openUnisonDropdown ? false : true;
                group = this._unisonDropdownGroup;
                break;
            case 8 /* DropdownID.EnvelopeSettings */:
                target = this.envelopeEditor.extraSettingsDropdowns[submenu];
                this.envelopeEditor.openExtraSettingsDropdowns[submenu] = this.envelopeEditor.openExtraSettingsDropdowns[submenu] ? false : true;
                group = this.envelopeEditor.extraSettingsDropdownGroups[submenu];
                break;
        }
        if (target.textContent == "▼") {
            var instrument = this.doc.song.channels[this.doc.channel].instruments[this.doc.getCurrentInstrument()];
            target.textContent = "▲";
            if (dropdown == 8 /* DropdownID.EnvelopeSettings */) {
                group.style.display = "flex";
                // if (subtype == "pitch") { 
                //     this.envelopeEditor.extraPitchSettingsGroups[submenu].style.display = "flex";
                //     this.envelopeEditor.perEnvelopeSpeedGroups[submenu].style.display = "none";
                // } else {
                //     this.envelopeEditor.extraPitchSettingsGroups[submenu].style.display = "none";
                //     if (subtype == "notesize" || subtype == "none" || subtype == "punch") {
                //         this.envelopeEditor.perEnvelopeSpeedGroups[submenu].style.display = "none";
                //     } else {
                //         this.envelopeEditor.perEnvelopeSpeedGroups[submenu].style.display = "flex";
                //     }
                // }
                this.envelopeEditor.rerenderExtraSettings();
            }
            else if (group != this._chordDropdownGroup) {
                group.style.display = "";
            } // Only show arpeggio dropdown if chord arpeggiates
            else if (instrument.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index) {
                group.style.display = "";
                if (instrument.chord == SynthConfig_1.Config.chords.dictionary["arpeggio"].index) {
                    this._chordDropdownGroup.style.display = "";
                }
                else {
                    this._chordDropdownGroup.style.display = "none";
                }
            }
            var _loop_5 = function (i) {
                // A timeout is needed so that the previous 0s, 0 opacity settings can be applied. They're not done until the group is visible again because display: none prunes animation steps.
                setTimeout(function () {
                    group.children[i].style.animationDelay = '0.17s';
                    group.children[i].style.opacity = '1';
                });
            };
            for (var i = 0; i < group.children.length; i++) {
                _loop_5(i);
            }
        }
        else {
            for (var i = 0; i < group.children.length; i++) {
                group.children[i].style.animationDelay = '0s';
                group.children[i].style.opacity = '0';
            }
            target.textContent = "▼";
            group.style.display = "none";
        }
    };
    SongEditor.prototype._modSliderUpdate = function () {
        if (!this.doc.synth.playing) {
            this._hasActiveModSliders = false;
            this._songEqFilterEditor.render();
            for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
                for (var index = 0; index <= SynthConfig_1.Config.modulators[setting].maxIndex; index++) {
                    if (this._showModSliders[setting][index] == true) {
                        this._showModSliders[setting][index] = false;
                        this._newShowModSliders[setting][index] = false;
                        var slider = this.getSliderForModSetting(setting, index);
                        if (slider != null) {
                            slider.container.classList.remove("modSlider");
                        }
                    }
                }
            }
        }
        else {
            var instrument = this.doc.getCurrentInstrument();
            var anyModActive = this.doc.synth.isAnyModActive(this.doc.channel, instrument);
            // Check and update mod values on sliders
            if (anyModActive) {
                var instrument_2 = this.doc.getCurrentInstrument();
                function updateModSlider(editor, slider, setting, channel, instrument, index) {
                    if (editor.doc.synth.isModActive(setting, channel, instrument)) {
                        if (SynthConfig_1.Config.modulators[setting].maxIndex > 0) {
                            //detect that the mod actually does need updating for the specific index
                            var envelope = editor.doc.synth.song.channels[channel].instruments[instrument].envelopes[index];
                            switch (setting) {
                                case SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index: {
                                    if (envelope.tempEnvelopeSpeed == null) {
                                        return false;
                                    }
                                    break;
                                }
                                case SynthConfig_1.Config.modulators.dictionary["individual envelope lower bound"].index: {
                                    if (envelope.tempEnvelopeLowerBound == null) {
                                        return false;
                                    }
                                    break;
                                }
                                case SynthConfig_1.Config.modulators.dictionary["individual envelope upper bound"].index: {
                                    if (envelope.tempEnvelopeUpperBound == null) {
                                        return false;
                                    }
                                    break;
                                }
                            }
                        }
                        var currentVal = (editor.doc.synth.getModValue(setting, channel, instrument, false) - SynthConfig_1.Config.modulators[setting].convertRealFactor) / SynthConfig_1.Config.modulators[setting].maxRawVol;
                        if (SynthConfig_1.Config.modulators[setting].invertSliderIndicator == true) {
                            currentVal = 1 - currentVal;
                        }
                        if (currentVal != editor._modSliderValues[setting][index]) {
                            editor._modSliderValues[setting][index] = currentVal;
                            slider.container.style.setProperty("--mod-position", (currentVal * 96.0 + 2.0) + "%");
                        }
                        return true;
                    }
                    return false;
                }
                // Set mod sliders to present values
                for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
                    for (var index = 0; index <= SynthConfig_1.Config.modulators[setting].maxIndex; index++) {
                        // Set to last value
                        this._newShowModSliders[setting][index] = Boolean(this._showModSliders[setting][index]);
                        // Check for newer value
                        var slider = this.getSliderForModSetting(setting, index);
                        if (slider != null) {
                            this._newShowModSliders[setting][index] = updateModSlider(this, slider, setting, this.doc.channel, instrument_2, index);
                        }
                    }
                }
            }
            else if (this._hasActiveModSliders) {
                // Zero out show-mod-slider settings (since none are active) to kill active mod slider flag
                for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
                    for (var index = 0; index <= SynthConfig_1.Config.modulators[setting].maxIndex; index++) {
                        this._newShowModSliders[setting][index] = false;
                    }
                }
            }
            // Class or unclass mod sliders based on present status
            if (anyModActive || this._hasActiveModSliders) {
                var anySliderActive = false;
                for (var setting = 0; setting < SynthConfig_1.Config.modulators.length; setting++) {
                    for (var index = 0; index <= SynthConfig_1.Config.modulators[setting].maxIndex; index++) {
                        if (this._newShowModSliders[setting][index] != this._showModSliders[setting][index]) {
                            this._showModSliders[setting][index] = this._newShowModSliders[setting][index];
                            var slider = this.getSliderForModSetting(setting, index);
                            if (slider != null) {
                                if (this._showModSliders[setting][index] == true) {
                                    slider.container.classList.add("modSlider");
                                }
                                else {
                                    slider.container.classList.remove("modSlider");
                                }
                            }
                        }
                        if (this._newShowModSliders[setting][index] == true)
                            anySliderActive = true;
                    }
                }
                this._hasActiveModSliders = anySliderActive;
            }
        }
    };
    SongEditor.prototype.getSliderForModSetting = function (setting, index) {
        index = index == undefined ? 0 : index;
        switch (setting) {
            case SynthConfig_1.Config.modulators.dictionary["pan"].index:
                return this._panSlider;
            case SynthConfig_1.Config.modulators.dictionary["detune"].index:
                return this._detuneSlider;
            case SynthConfig_1.Config.modulators.dictionary["fm slider 1"].index:
                return this._operatorAmplitudeSliders[0];
            case SynthConfig_1.Config.modulators.dictionary["fm slider 2"].index:
                return this._operatorAmplitudeSliders[1];
            case SynthConfig_1.Config.modulators.dictionary["fm slider 3"].index:
                return this._operatorAmplitudeSliders[2];
            case SynthConfig_1.Config.modulators.dictionary["fm slider 4"].index:
                return this._operatorAmplitudeSliders[3];
            case SynthConfig_1.Config.modulators.dictionary["fm feedback"].index:
                return this._feedbackAmplitudeSlider;
            case SynthConfig_1.Config.modulators.dictionary["pulse width"].index:
                return this._pulseWidthSlider;
            case SynthConfig_1.Config.modulators.dictionary["decimal offset"].index:
                return this._decimalOffsetSlider;
            case SynthConfig_1.Config.modulators.dictionary["reverb"].index:
                return this._reverbSlider;
            case SynthConfig_1.Config.modulators.dictionary["distortion"].index:
                return this._distortionSlider;
            case SynthConfig_1.Config.modulators.dictionary["note volume"].index:
                // So, this should technically not affect this slider, but it will look better as legacy songs used this mod as 'volume'.
                // In the case that mix volume is used as well, they'd fight for the display, so just don't use this.
                if (!this._showModSliders[SynthConfig_1.Config.modulators.dictionary["mix volume"].index][index])
                    return this._instrumentVolumeSlider;
                return null;
            case SynthConfig_1.Config.modulators.dictionary["mix volume"].index:
                return this._instrumentVolumeSlider;
            case SynthConfig_1.Config.modulators.dictionary["vibrato depth"].index:
                return this._vibratoDepthSlider;
            case SynthConfig_1.Config.modulators.dictionary["vibrato speed"].index:
                return this._vibratoSpeedSlider;
            case SynthConfig_1.Config.modulators.dictionary["vibrato delay"].index:
                return this._vibratoDelaySlider;
            case SynthConfig_1.Config.modulators.dictionary["arp speed"].index:
                return this._arpeggioSpeedSlider;
            case SynthConfig_1.Config.modulators.dictionary["pan delay"].index:
                return this._panDelaySlider;
            case SynthConfig_1.Config.modulators.dictionary["tempo"].index:
                return this._tempoSlider;
            case SynthConfig_1.Config.modulators.dictionary["song volume"].index:
                return this._volumeSlider;
            case SynthConfig_1.Config.modulators.dictionary["eq filt cut"].index:
                return this._eqFilterSimpleCutSlider;
            case SynthConfig_1.Config.modulators.dictionary["eq filt peak"].index:
                return this._eqFilterSimplePeakSlider;
            case SynthConfig_1.Config.modulators.dictionary["note filt cut"].index:
                return this._noteFilterSimpleCutSlider;
            case SynthConfig_1.Config.modulators.dictionary["note filt peak"].index:
                return this._noteFilterSimplePeakSlider;
            case SynthConfig_1.Config.modulators.dictionary["bit crush"].index:
                return this._bitcrusherQuantizationSlider;
            case SynthConfig_1.Config.modulators.dictionary["freq crush"].index:
                return this._bitcrusherFreqSlider;
            case SynthConfig_1.Config.modulators.dictionary["pitch shift"].index:
                return this._pitchShiftSlider;
            case SynthConfig_1.Config.modulators.dictionary["chorus"].index:
                return this._chorusSlider;
            case SynthConfig_1.Config.modulators.dictionary["echo"].index:
                return this._echoSustainSlider;
            case SynthConfig_1.Config.modulators.dictionary["echo delay"].index:
                return this._echoDelaySlider;
            case SynthConfig_1.Config.modulators.dictionary["sustain"].index:
                return this._stringSustainSlider;
            case SynthConfig_1.Config.modulators.dictionary["fm slider 5"].index:
                return this._operatorAmplitudeSliders[4];
            case SynthConfig_1.Config.modulators.dictionary["fm slider 6"].index:
                return this._operatorAmplitudeSliders[5];
            case SynthConfig_1.Config.modulators.dictionary["envelope speed"].index:
                return this._envelopeSpeedSlider;
            case SynthConfig_1.Config.modulators.dictionary["dynamism"].index:
                return this._supersawDynamismSlider;
            case SynthConfig_1.Config.modulators.dictionary["spread"].index:
                return this._supersawSpreadSlider;
            case SynthConfig_1.Config.modulators.dictionary["saw shape"].index:
                return this._supersawShapeSlider;
            case SynthConfig_1.Config.modulators.dictionary["individual envelope speed"].index:
                return this.envelopeEditor.perEnvelopeSpeedSliders[index];
            case SynthConfig_1.Config.modulators.dictionary["individual envelope lower bound"].index:
                return this.envelopeEditor.perEnvelopeLowerBoundSliders[index];
            case SynthConfig_1.Config.modulators.dictionary["individual envelope upper bound"].index:
                return this.envelopeEditor.perEnvelopeUpperBoundSliders[index];
            case SynthConfig_1.Config.modulators.dictionary["ring modulation"].index:
                return this._ringModSlider;
            case SynthConfig_1.Config.modulators.dictionary["ring mod hertz"].index:
                return this._ringModHzSlider;
            case SynthConfig_1.Config.modulators.dictionary["phaser"].index:
                return this._phaserMixSlider;
            case SynthConfig_1.Config.modulators.dictionary["phaser frequency"].index:
                return this._phaserFreqSlider;
            case SynthConfig_1.Config.modulators.dictionary["phaser feedback"].index:
                return this._phaserFeedbackSlider;
            case SynthConfig_1.Config.modulators.dictionary["phaser stages"].index:
                return this._phaserStagesSlider;
            case SynthConfig_1.Config.modulators.dictionary["granular"].index:
                return this._granularSlider;
            case SynthConfig_1.Config.modulators.dictionary["grain freq"].index:
                return this._grainAmountsSlider;
            case SynthConfig_1.Config.modulators.dictionary["grain size"].index:
                return this._grainSizeSlider;
            case SynthConfig_1.Config.modulators.dictionary["grain range"].index:
                return this._grainRangeSlider;
            default:
                return null;
        }
    };
    SongEditor.prototype._openPrompt = function (promptName) {
        this.doc.openPrompt(promptName);
        this._setPrompt(promptName);
    };
    SongEditor.prototype._setPrompt = function (promptName) {
        if (this._currentPromptName == promptName)
            return;
        this._currentPromptName = promptName;
        if (this.prompt) {
            if (this._wasPlaying && !(this.prompt instanceof TipPrompt_1.TipPrompt || this.prompt instanceof LimiterPrompt_1.LimiterPrompt || this.prompt instanceof CustomScalePrompt_1.CustomScalePrompt || this.prompt instanceof CustomChipPrompt_1.CustomChipPrompt || this.prompt instanceof CustomFilterPrompt_1.CustomFilterPrompt || this.prompt instanceof VisualLoopControlsPrompt_1.VisualLoopControlsPrompt || this.prompt instanceof SustainPrompt_1.SustainPrompt || this.prompt instanceof HarmonicsEditor_1.HarmonicsEditorPrompt || this.prompt instanceof SpectrumEditor_1.SpectrumEditorPrompt)) {
                this.doc.performance.play();
            }
            this._wasPlaying = false;
            this._promptContainerBG.style.display = "none";
            this._promptContainer.style.display = "none";
            this._promptContainer.removeChild(this.prompt.container);
            this.prompt.cleanUp();
            this.prompt = null;
            this.refocusStage();
        }
        if (promptName) {
            switch (promptName) {
                case "export":
                    this.prompt = new ExportPrompt_1.ExportPrompt(this.doc);
                    break;
                case "import":
                    this.prompt = new ImportPrompt_1.ImportPrompt(this.doc);
                    break;
                case "songRecovery":
                    this.prompt = new SongRecoveryPrompt_1.SongRecoveryPrompt(this.doc);
                    break;
                case "barCount":
                    this.prompt = new SongDurationPrompt_1.SongDurationPrompt(this.doc);
                    break;
                case "beatsPerBar":
                    this.prompt = new BeatsPerBarPrompt_1.BeatsPerBarPrompt(this.doc);
                    break;
                case "moveNotesSideways":
                    this.prompt = new MoveNotesSidewaysPrompt_1.MoveNotesSidewaysPrompt(this.doc);
                    break;
                case "channelSettings":
                    this.prompt = new ChannelSettingsPrompt_1.ChannelSettingsPrompt(this.doc);
                    break;
                case "limiterSettings":
                    this.prompt = new LimiterPrompt_1.LimiterPrompt(this.doc, this);
                    break;
                case "customScale":
                    this.prompt = new CustomScalePrompt_1.CustomScalePrompt(this.doc);
                    break;
                case "customChipSettings":
                    this.prompt = new CustomChipPrompt_1.CustomChipPrompt(this.doc, this);
                    break;
                case "customEQFilterSettings":
                    this.prompt = new CustomFilterPrompt_1.CustomFilterPrompt(this.doc, this, false);
                    break;
                case "customNoteFilterSettings":
                    this.prompt = new CustomFilterPrompt_1.CustomFilterPrompt(this.doc, this, true);
                    break;
                case "customSongEQFilterSettings":
                    this.prompt = new CustomFilterPrompt_1.CustomFilterPrompt(this.doc, this, false, true);
                    break;
                case "theme":
                    this.prompt = new ThemePrompt_1.ThemePrompt(this.doc);
                    break;
                case "layout":
                    this.prompt = new LayoutPrompt_1.LayoutPrompt(this.doc);
                    break;
                case "recordingSetup":
                    this.prompt = new RecordingSetupPrompt_1.RecordingSetupPrompt(this.doc);
                    break;
                case "exportInstrument":
                    this.prompt = new InstrumentExportPrompt_1.InstrumentExportPrompt(this.doc); //, this);
                    break;
                case "importInstrument":
                    this.prompt = new InstrumentImportPrompt_1.InstrumentImportPrompt(this.doc); //, this);
                    break;
                case "stringSustain":
                    this.prompt = new SustainPrompt_1.SustainPrompt(this.doc);
                    break;
                case "addExternal":
                    this.prompt = new AddSamplesPrompt_1.AddSamplesPrompt(this.doc);
                    break;
                case "generateEuclideanRhythm":
                    this.prompt = new EuclidgenRhythmPrompt_1.EuclideanRhythmPrompt(this.doc);
                    break;
                case "customTheme":
                    this.prompt = new CustomThemePrompt_1.CustomThemePrompt(this.doc, this._patternEditor, this._trackArea, document.getElementById("beepboxEditorContainer"));
                    break;
                case "visualLoopControls":
                    this.prompt = new VisualLoopControlsPrompt_1.VisualLoopControlsPrompt(this.doc, this);
                    break;
                case "sampleLoadingStatus":
                    this.prompt = new SampleLoadingStatusPrompt_1.SampleLoadingStatusPrompt(this.doc);
                    break;
                case "configureShortener":
                    this.prompt = new ShortenerConfigPrompt_1.ShortenerConfigPrompt(this.doc);
                    break;
                case "multiplayer":
                    this.prompt = new MultiplayerPrompt_1.MultiplayerPrompt(this.doc);
                    break;
                case "harmonicsSettings":
                    this.prompt = new HarmonicsEditor_1.HarmonicsEditorPrompt(this.doc, this);
                    break;
                case "spectrumSettings":
                    this.prompt = new SpectrumEditor_1.SpectrumEditorPrompt(this.doc, this, false);
                    break;
                case "drumsetSettings":
                    this.prompt = new SpectrumEditor_1.SpectrumEditorPrompt(this.doc, this, true);
                    break;
                default:
                    this.prompt = new TipPrompt_1.TipPrompt(this.doc, promptName);
                    break;
            }
            if (this.prompt) {
                if (!(this.prompt instanceof TipPrompt_1.TipPrompt || this.prompt instanceof LimiterPrompt_1.LimiterPrompt || this.prompt instanceof CustomChipPrompt_1.CustomChipPrompt || this.prompt instanceof CustomFilterPrompt_1.CustomFilterPrompt || this.prompt instanceof VisualLoopControlsPrompt_1.VisualLoopControlsPrompt || this.prompt instanceof SustainPrompt_1.SustainPrompt || this.prompt instanceof HarmonicsEditor_1.HarmonicsEditorPrompt || this.prompt instanceof SpectrumEditor_1.SpectrumEditorPrompt)) {
                    this._wasPlaying = this.doc.synth.playing;
                    this.doc.performance.pause();
                }
                this._promptContainer.style.display = "";
                if (this.doc.prefs.frostedGlassBackground == true) {
                    this._promptContainerBG.style.display = "";
                    this._promptContainerBG.style.backgroundColor = "rgba(0,0,0, 0)";
                    this._promptContainerBG.style.backdropFilter = "brightness(0.9) blur(14px)";
                    this._promptContainerBG.style.opacity = "1";
                }
                else {
                    this._promptContainerBG.style.display = "";
                    this._promptContainerBG.style.backgroundColor = "var(--editor-background)";
                    this._promptContainerBG.style.backdropFilter = "";
                    this._promptContainerBG.style.opacity = "0.5";
                }
                this._promptContainer.appendChild(this.prompt.container);
                document.body.appendChild(this._promptContainerBG);
            }
        }
    };
    SongEditor.prototype.changeBarScrollPos = function (offset) {
        this._barScrollBar.changePos(offset);
    };
    SongEditor.prototype.handleModRecording = function () {
        var _this = this;
        window.clearTimeout(this._modRecTimeout);
        var lastChange = this.doc.checkLastChange();
        if ((this._ctrlHeld || this._shiftHeld) && lastChange != null && this.doc.synth.playing) {
            var changedPatterns = this._patternEditor.setModSettingsForChange(lastChange, this);
            if (this.doc.continuingModRecordingChange != null) {
                this._modRecTimeout = window.setTimeout(function () { _this.handleModRecording(); }, 10);
                this.doc.recordingModulators = true;
                if (changedPatterns)
                    this._trackEditor.render();
            }
        }
        else if (this.doc.recordingModulators) {
            this.doc.recordingModulators = false;
            // A dummy change that pushes history state.
            this.doc.record(new changes_1.ChangeHoldingModRecording(this.doc, null, null, null));
        }
    };
    SongEditor.prototype._renderInstrumentBar = function (channel, instrumentIndex, colors) {
        if (this.doc.song.layeredInstruments || this.doc.song.patternInstruments) {
            this._instrumentsButtonRow.style.display = "";
            this._instrumentsButtonBar.style.setProperty("--text-color-lit", colors.primaryNote);
            this._instrumentsButtonBar.style.setProperty("--text-color-dim", colors.secondaryNote);
            this._instrumentsButtonBar.style.setProperty("--background-color-lit", colors.primaryChannel);
            this._instrumentsButtonBar.style.setProperty("--background-color-dim", colors.secondaryChannel);
            var maxInstrumentsPerChannel = this.doc.song.getMaxInstrumentsPerChannel();
            while (this._instrumentButtons.length < channel.instruments.length) {
                var instrumentButton = button(String(this._instrumentButtons.length + 1));
                this._instrumentButtons.push(instrumentButton);
                this._instrumentsButtonBar.insertBefore(instrumentButton, this._instrumentRemoveButton);
            }
            for (var i = this._renderedInstrumentCount; i < channel.instruments.length; i++) {
                this._instrumentButtons[i].style.display = "";
            }
            for (var i = channel.instruments.length; i < this._renderedInstrumentCount; i++) {
                this._instrumentButtons[i].style.display = "none";
            }
            this._renderedInstrumentCount = channel.instruments.length;
            while (this._instrumentButtons.length > maxInstrumentsPerChannel) {
                this._instrumentsButtonBar.removeChild(this._instrumentButtons.pop());
            }
            this._instrumentRemoveButton.style.display = (channel.instruments.length > SynthConfig_1.Config.instrumentCountMin) ? "" : "none";
            this._instrumentAddButton.style.display = (channel.instruments.length < maxInstrumentsPerChannel) ? "" : "none";
            if (channel.instruments.length < maxInstrumentsPerChannel) {
                this._instrumentRemoveButton.classList.remove("last-button");
            }
            else {
                this._instrumentRemoveButton.classList.add("last-button");
            }
            if (channel.instruments.length > 1) {
                if (this._highlightedInstrumentIndex != instrumentIndex) {
                    var oldButton = this._instrumentButtons[this._highlightedInstrumentIndex];
                    if (oldButton != null)
                        oldButton.classList.remove("selected-instrument");
                    var newButton = this._instrumentButtons[instrumentIndex];
                    newButton.classList.add("selected-instrument");
                    this._highlightedInstrumentIndex = instrumentIndex;
                }
            }
            else {
                var oldButton = this._instrumentButtons[this._highlightedInstrumentIndex];
                if (oldButton != null)
                    oldButton.classList.remove("selected-instrument");
                this._highlightedInstrumentIndex = -1;
            }
            if (this.doc.song.layeredInstruments && this.doc.song.patternInstruments && (this.doc.channel < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount)) {
                //const pattern: Pattern | null = this._doc.getCurrentPattern();
                for (var i = 0; i < channel.instruments.length; i++) {
                    if (this.doc.recentPatternInstruments[this.doc.channel].indexOf(i) != -1) {
                        this._instrumentButtons[i].classList.remove("deactivated");
                    }
                    else {
                        this._instrumentButtons[i].classList.add("deactivated");
                    }
                }
                this._deactivatedInstruments = true;
            }
            else if (this._deactivatedInstruments || (this.doc.channel >= this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount)) {
                for (var i = 0; i < channel.instruments.length; i++) {
                    this._instrumentButtons[i].classList.remove("deactivated");
                }
                this._deactivatedInstruments = false;
            }
            if ((this.doc.song.layeredInstruments && this.doc.song.patternInstruments) && channel.instruments.length > 1 && (this.doc.channel < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount)) {
                for (var i = 0; i < channel.instruments.length; i++) {
                    this._instrumentButtons[i].classList.remove("no-underline");
                }
            }
            else {
                for (var i = 0; i < channel.instruments.length; i++) {
                    this._instrumentButtons[i].classList.add("no-underline");
                }
            }
        }
        else {
            this._instrumentsButtonRow.style.display = "none";
        }
    };
    SongEditor.prototype._usageCheck = function (channelIndex, instrumentIndex) {
        var instrumentUsed = false;
        var patternUsed = false;
        var modUsed = false;
        var channel = this.doc.song.channels[channelIndex];
        if (channelIndex < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount) {
            for (var modChannelIdx = this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount; modChannelIdx < this.doc.song.channels.length; modChannelIdx++) {
                var modChannel = this.doc.song.channels[modChannelIdx];
                var patternIdx = modChannel.bars[this.doc.bar];
                if (patternIdx > 0) {
                    var modInstrumentIdx = modChannel.patterns[patternIdx - 1].instruments[0];
                    var modInstrument = modChannel.instruments[modInstrumentIdx];
                    for (var mod = 0; mod < SynthConfig_1.Config.modCount; mod++) {
                        if (modInstrument.modChannels[mod] == channelIndex && (modInstrument.modInstruments[mod] == instrumentIndex || modInstrument.modInstruments[mod] >= channel.instruments.length)) {
                            modUsed = true;
                        }
                    }
                }
            }
        }
        var lowestSelX = Math.min(this.doc.selection.boxSelectionX0, this.doc.selection.boxSelectionX1);
        var highestSelX = Math.max(this.doc.selection.boxSelectionX0, this.doc.selection.boxSelectionX1);
        var lowestSelY = Math.min(this.doc.selection.boxSelectionY0, this.doc.selection.boxSelectionY1);
        var highestSelY = Math.max(this.doc.selection.boxSelectionY0, this.doc.selection.boxSelectionY1);
        if (channel.bars[this.doc.bar] != 0) {
            for (var i = 0; i < this.doc.song.barCount; i++) {
                // Check for this exact bar in another place, but only count it if it's not within the selection
                if (channel.bars[i] == channel.bars[this.doc.bar] && i != this.doc.bar &&
                    (i < lowestSelX || i > highestSelX || this.doc.channel < lowestSelY || this.doc.channel > highestSelY)) {
                    patternUsed = true;
                    i = this.doc.song.barCount;
                }
            }
        }
        for (var i = 0; i < this.doc.song.barCount; i++) {
            // Check for this exact instrument in another place, but only count it if it's not within the selection
            if (channel.bars[i] != 0 && channel.bars[i] != channel.bars[this.doc.bar] &&
                channel.patterns[channel.bars[i] - 1].instruments.includes(instrumentIndex) && i != this.doc.bar &&
                (i < lowestSelX || i > highestSelX || this.doc.channel < lowestSelY || this.doc.channel > highestSelY)) {
                instrumentUsed = true;
                i = this.doc.song.barCount;
            }
        }
        if (patternUsed) {
            this._usedPatternIndicator.style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorPrimary);
            this.patternUsed = true;
        }
        else {
            this._usedPatternIndicator.style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorSecondary);
            this.patternUsed = false;
        }
        if (instrumentUsed) {
            this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorPrimary);
        }
        else {
            this._usedInstrumentIndicator.style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorSecondary);
        }
        if (modUsed) {
            this._jumpToModIndicator.style.setProperty("display", "");
            this._jumpToModIndicator.style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorPrimary);
            this._jumpToModIndicator.classList.add("modTarget");
        }
        else if (channelIndex < this.doc.song.pitchChannelCount + this.doc.song.noiseChannelCount) {
            this._jumpToModIndicator.style.setProperty("display", "");
            this._jumpToModIndicator.style.setProperty("fill", ColorConfig_1.ColorConfig.indicatorSecondary);
            this._jumpToModIndicator.classList.remove("modTarget");
        }
        else {
            this._jumpToModIndicator.style.setProperty("display", "none");
        }
    };
    SongEditor.prototype._copyTextToClipboard = function (text) {
        // Set as any to allow compilation without clipboard types (since, uh, I didn't write this bit and don't know the proper types library) -jummbus
        var nav;
        nav = navigator;
        if (nav.clipboard && nav.clipboard.writeText) {
            nav.clipboard.writeText(text).catch(function () {
                window.prompt("Copy to clipboard:", text);
            });
            return;
        }
        var textField = document.createElement("textarea");
        textField.textContent = text;
        document.body.appendChild(textField);
        textField.select();
        var succeeded = document.execCommand("copy");
        textField.remove();
        this.refocusStage();
        if (!succeeded)
            window.prompt("Copy this:", text);
    };
    SongEditor.prototype._animateVolume = function (outVolumeCap, historicOutCap) {
        this._outVolumeBar.setAttribute("width", "" + Math.min(144, outVolumeCap * 144));
        this._outVolumeCap.setAttribute("x", "" + (8 + Math.min(144, historicOutCap * 144)));
    };
    SongEditor.prototype._recordVolumeSlider = function (useVol) {
        var _this = this;
        // Song volume slider doesn't use a change, but it can still be modulated.
        if ((this._ctrlHeld || this._shiftHeld) && this.doc.synth.playing) {
            var prevVol = this.doc.prefs.volume;
            // The slider only goes to 75, but the mod is 0-100 and in this instance we're using the value for a mod set.
            this.doc.prefs.volume = useVol;
            this._patternEditor.setModSettingsForChange(null, this);
            window.clearTimeout(this._modRecTimeout);
            this._modRecTimeout = window.setTimeout(function () { _this._recordVolumeSlider(useVol); }, 10);
            this.doc.recordingModulators = true;
            this.doc.prefs.volume = prevVol;
            this._volumeSlider.updateValue(this.doc.prefs.volume);
        }
        else {
            this.doc.setVolume(Number(this._volumeSlider.input.value));
            if (this.doc.recordingModulators) {
                this.doc.recordingModulators = false;
                // A dummy change that pushes history state.
                this.doc.record(new changes_1.ChangeHoldingModRecording(this.doc, null, null, null));
            }
        }
    };
    SongEditor.prototype._switchEQFilterType = function (toSimple) {
        var channel = this.doc.song.channels[this.doc.channel];
        var instrument = channel.instruments[this.doc.getCurrentInstrument()];
        if (instrument.eqFilterType != toSimple) {
            this.doc.record(new changes_1.ChangeEQFilterType(this.doc, instrument, toSimple));
        }
    };
    SongEditor.prototype._switchNoteFilterType = function (toSimple) {
        var channel = this.doc.song.channels[this.doc.channel];
        var instrument = channel.instruments[this.doc.getCurrentInstrument()];
        if (instrument.noteFilterType != toSimple) {
            this.doc.record(new changes_1.ChangeNoteFilterType(this.doc, instrument, toSimple));
        }
    };
    SongEditor.prototype._randomPreset = function () {
        var isNoise = this.doc.song.getChannelIsNoise(this.doc.channel);
        var presetValue = (0, changes_1.pickRandomPresetValue)(isNoise, this.doc.prefs.rollNoveltyPresets);
        if (presetValue > 0) {
            this.doc.record(new changes_1.ChangePreset(this.doc, presetValue));
        }
        else if (presetValue == -1) { //no results
            alert("Either you are using incompatible tags, or you are using a tag combination that no preset has. \n\nPlease double check your tag combination.");
        }
        else if (presetValue == -2) { //incorrect tag
            alert("One or more of the tags you entered doesn't exist. \nPlease double check your spelling. \n\nIf you don't know what tags exist, you can reffer to the tag list in the description below.");
        }
    };
    SongEditor.prototype._nextPreset = function () {
        var isNoise = this.doc.song.getChannelIsNoise(this.doc.channel);
        var presetValue = (0, changes_1.pickNextPresetValue)(isNoise, this.doc.prefs.rollNoveltyPresets);
        if (presetValue > 0) {
            this.doc.record(new changes_1.ChangePreset(this.doc, presetValue));
        }
        else if (presetValue == -1) { //no results
            alert("One or more of the tags you entered doesn't exist. \nPlease double check your spelling. \n\nIf you don't know what tags exist, you can reffer to the tag list in the description below.");
        }
        else if (presetValue == -2) { //incorrect tag
            alert("One or more of the tags you entered doesn't exist. \n\nPlease double check your spelling.");
        }
    };
    SongEditor.prototype._randomGenerated = function (usesCurrentInstrumentType) {
        this.doc.record(new changes_1.ChangeRandomGeneratedInstrument(this.doc, usesCurrentInstrumentType));
    };
    SongEditor.prototype._setPreset = function (preset) {
        if (isNaN(preset)) {
            switch (preset) {
                case "copyInstrument":
                    this._copyInstrument();
                    break;
                case "pasteInstrument":
                    this._pasteInstrument();
                    break;
                case "randomPreset":
                    this._randomPreset();
                    break;
                case "randomGenerated":
                    this._randomGenerated(false);
                    break;
            }
            this.doc.notifier.changed();
        }
        else {
            this.doc.record(new changes_1.ChangePreset(this.doc, parseInt(preset)));
        }
    };
    return SongEditor;
}());
exports.SongEditor = SongEditor;
