"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var app = express();
var axios = require('axios');
var gender = require('gender');
var Sentiment = require('sentiment');
var sentiment = new Sentiment();
require('dotenv').config();
var maxResults = 10; //maximum results given by YouTube API per get request
var YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
var channels = ['The Laugh Factory', 'Just For Laughs', 'Comedy Central Stand-Up', 'Dry Bar Comedy'];
var channelIds = ['UCxyCzPY2pjAjrxoSYclpuLg', 'UCqq3PZwp8Ob8_jN0esCunIw', 'UCtw7q4SyOeoCwM1i_3x8lDg', 'UCvlVuntLjdURVD3b3Hx7kxw'];
var videoIds = {};
var videoInfo = {};
var channelBreakdown = {};
var commentsBreakdown = {};
// used to get and store channel ids
// const getChannelId = (channelName: string) => {
//     axios.get(`https://www.googleapis.com/youtube/v3/search?part=id%2Csnippet&q=${channelName}&type=channel&key=${YOUTUBE_API_KEY}`)
//         .then((res: any) => {
//             // console.log(res.data.items[0].id.channelId)
//             console.log(res.data.items[0])
//         })
//         .catch((err: any) => {
//             console.log(err)
//         })
// }
// for (let channel of channels) {
//     getChannelId(channel)
// }
function getChannelVideoIds(channelName, channelId, nextPageToken) {
    if (nextPageToken === void 0) { nextPageToken = ''; }
    axios.get("https://www.googleapis.com/youtube/v3/search?key=" + YOUTUBE_API_KEY + "&channelId=" + channelId + "&part=snippet,id&order=date&maxResults=" + maxResults + "&pageToken=" + nextPageToken)
        .then(function (res) {
        for (var _i = 0, _a = res.data.items; _i < _a.length; _i++) {
            var item = _a[_i];
            videoIds[channelName].push(item.id.videoId);
        }
        // if (videoIds[channelName].length < 10) {
        //   getChannelVideoIds(channelName, channelId, res.data.nextPageToken)
        // }
        getVideoInfo(channelName);
    })
        .catch(function (err) {
        console.log(err);
    });
}
function getVideoInfo(channelName) {
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
        getVideoTitleGender(channelName);
    })
        .catch(function (err) {
        console.log(err);
    });
}
function getVideoTitleGender(channelName) {
    var promises = [];
    for (var item in videoInfo[channelName].titles) {
        var videoTitle = videoInfo[channelName].titles[item];
        var getGender = gender.guess(videoTitle).gender;
        channelBreakdown[channelName][getGender].viewCounts.push(videoInfo[channelName].viewCounts[item]);
        channelBreakdown[channelName][getGender].likeCounts.push(videoInfo[channelName].likeCounts[item]);
        channelBreakdown[channelName][getGender].dislikeCounts.push(videoInfo[channelName].dislikeCounts[item]);
        channelBreakdown[channelName][getGender].videoIds.push(videoIds[channelName][item]);
        channelBreakdown[channelName][getGender].titles.push(videoTitle);
        commentsBreakdown[channelName][getGender] = {
            comments: [],
            sentimentScores: [],
            positiveWords: [],
            negativeWords: []
        };
        promises.push(getVideoComments(channelName, videoIds[channelName][item], getGender));
    }
    Promise.all(promises).then(function (values) {
        getCommentSentiment(channelName, 'male');
        getCommentSentiment(channelName, 'female');
        getCommentSentiment(channelName, 'unknown');
    });
}
function getVideoComments(channelName, videoId, gender, nextPageToken) {
    if (nextPageToken === void 0) { nextPageToken = ''; }
    return axios.get("https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet%2Creplies&videoId=" + videoId + "&key=" + YOUTUBE_API_KEY + "&pageToken=" + nextPageToken)
        .then(function (res) {
        for (var _i = 0, _a = res.data.items; _i < _a.length; _i++) {
            var item = _a[_i];
            var commentText = item.snippet.topLevelComment.snippet.textDisplay;
            commentsBreakdown[channelName][gender].comments.push(commentText);
            if (item.replies) {
                var comments = item.replies.comments;
                for (var _b = 0, comments_1 = comments; _b < comments_1.length; _b++) {
                    var comment = comments_1[_b];
                    commentsBreakdown[channelName][gender].comments.push(comment.snippet.textDisplay);
                }
            }
        }
        if (res.data.nextPageToken) {
            return getVideoComments(channelName, videoId, gender, res.data.nextPageToken);
        }
        else {
            // TODO this function is called as many times as the parent function is called - figure out a fix
            return res.data;
        }
    })
        .catch(function (err) {
        return err;
    });
}
function getCommentSentiment(channelName, gender) {
    console.log('here');
    var comments = commentsBreakdown[channelName][gender].comments;
    for (var _i = 0, comments_2 = comments; _i < comments_2.length; _i++) {
        var comment = comments_2[_i];
        var result = sentiment.analyze(comment);
        commentsBreakdown[channelName][gender].sentimentScores.push(result.score);
        result.positive.map(function (str) { return commentsBreakdown[channelName][gender].positiveWords.push(str); });
        result.negative.map(function (str) { return commentsBreakdown[channelName][gender].negativeWords.push(str); });
    }
}
// for (let idx in channelIds) {
//     videoIds[channels[idx]] = []
//     getChannelVideoIds(channels[idx], channelIds[idx])
// }
videoIds[channels[0]] = [];
videoInfo[channels[0]] = {
    titles: [],
    viewCounts: [],
    likeCounts: [],
    dislikeCounts: []
};
channelBreakdown[channels[0]] = {
    male: {
        viewCounts: [],
        likeCounts: [],
        dislikeCounts: [],
        videoIds: [],
        titles: []
    },
    female: {
        viewCounts: [],
        likeCounts: [],
        dislikeCounts: [],
        videoIds: [],
        titles: []
    },
    unknown: {
        viewCounts: [],
        likeCounts: [],
        dislikeCounts: [],
        videoIds: [],
        titles: []
    }
};
commentsBreakdown[channels[0]] = {
    male: {},
    female: {},
    unknown: {}
};
getChannelVideoIds(channels[0], channelIds[0]);
