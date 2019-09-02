"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var app = express();
var axios = require('axios');
var gender = require('gender');
require('dotenv').config();
var YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
var channels = ['The Laugh Factory', 'Just For Laughs', 'Comedy Central Stand-Up', 'Dry Bar Comedy'];
var channelIds = ['UCxyCzPY2pjAjrxoSYclpuLg', 'UCqq3PZwp8Ob8_jN0esCunIw', 'UCtw7q4SyOeoCwM1i_3x8lDg', 'UCvlVuntLjdURVD3b3Hx7kxw'];
var videoIds = {};
var videoInfo = {};
// used to get and store channel ids
// const getChannelId = (channelName: string) => {
//     axios.get(`https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&q=${channelName}&type=channel&key=${YOUTUBE_API_KEY}`)
//         .then(function(res: any) {
//             // console.log(res.data.items[0].id.channelId)
//             console.log(res.data.items[0])
//         })
//         .catch(function(err: any) {
//             console.log(err)
//         })
// }
// for (let channel of channels) {
//     getChannelId(channel)
// }
function getChannelVideos(channelName, channelId, nextPageToken) {
    if (nextPageToken === void 0) { nextPageToken = ''; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // TODO update maxResults query
                return [4 /*yield*/, axios.get("https://www.googleapis.com/youtube/v3/search?key=" + YOUTUBE_API_KEY + "&channelId=" + channelId + "&part=snippet,id&order=date&maxResults=5&pageToken=" + nextPageToken)
                        .then(function (res) {
                        for (var _i = 0, _a = res.data.items; _i < _a.length; _i++) {
                            var item = _a[_i];
                            videoIds[channelName].push(item.id.videoId);
                        }
                        // if (videoIds[channelName].length < 500) {
                        //     getChannelVideos(channelName, channelId, res.data.nextPageToken)
                        // }
                    })
                        .catch(function (err) {
                        console.log(err);
                    })
                        .then(function (res) {
                        var joinedVideoIds = videoIds[channelName].join(',');
                        axios.get("https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=" + joinedVideoIds + "&key=" + YOUTUBE_API_KEY)
                            .then(function (res) {
                            for (var _i = 0, _a = res.data.items; _i < _a.length; _i++) {
                                var item = _a[_i];
                                videoInfo[channelName].titles.push(item.snippet.title);
                                videoInfo[channelName].viewCounts.push(item.statistics.viewCount);
                                videoInfo[channelName].likeCounts.push(item.statistics.likeCount);
                                videoInfo[channelName].dislikeCounts.push(item.statistics.dislikeCount);
                            }
                        })
                            .catch(function (err) {
                            console.log(err);
                        })
                            .then(function (res) {
                            for (var item in videoInfo[channelName].titles) {
                                try {
                                    // TODO swap out with a function that grabs comments
                                    // TODO look for a repo with more names to choose from
                                    console.log(videoInfo[channelName].titles[item], gender.guess(videoInfo[channelName].titles[item]));
                                }
                                catch (err) {
                                    console.log(err);
                                }
                            }
                        });
                    })];
                case 1:
                    // TODO update maxResults query
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// for (let idx in channelIds) {
//     videoIds[channels[idx]] = []
//     getChannelVideos(channels[idx], channelIds[idx])
// }
videoIds[channels[0]] = [];
videoInfo[channels[0]] = {
    titles: [],
    viewCounts: [],
    likeCounts: [],
    dislikeCounts: []
};
getChannelVideos(channels[0], channelIds[0]);
