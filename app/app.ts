import express = require('express');
const app: express.Application = express();
const axios = require('axios');
const gender = require('gender');

require('dotenv').config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const channels: string[] = ['The Laugh Factory', 'Just For Laughs', 'Comedy Central Stand-Up', 'Dry Bar Comedy']
const channelIds: string[] = ['UCxyCzPY2pjAjrxoSYclpuLg', 'UCqq3PZwp8Ob8_jN0esCunIw', 'UCtw7q4SyOeoCwM1i_3x8lDg', 'UCvlVuntLjdURVD3b3Hx7kxw']
interface VideoDict {
    [key: string]: any
}

let videoIds: VideoDict = {}
let videoInfo: VideoDict = {}

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

async function getChannelVideos(channelName:string, channelId: string, nextPageToken = '') {
    // TODO update maxResults query
    await axios.get(`https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=5&pageToken=${nextPageToken}`)
        .then(function(res: any) {
            for (let item of res.data.items) {
                videoIds[channelName].push(item.id.videoId)
            }
            // if (videoIds[channelName].length < 500) {
            //     getChannelVideos(channelName, channelId, res.data.nextPageToken)
            // }
        })
        .catch(function(err: any) {
            console.log(err)
        })
    .then(function(res: any) {
        let joinedVideoIds = videoIds[channelName].join(',')
        axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${joinedVideoIds}&key=${YOUTUBE_API_KEY}`)
            .then(function(res: any) {
                for (let item of res.data.items) {
                    videoInfo[channelName].titles.push(item.snippet.title)
                    videoInfo[channelName].viewCounts.push(item.statistics.viewCount)
                    videoInfo[channelName].likeCounts.push(item.statistics.likeCount)
                    videoInfo[channelName].dislikeCounts.push(item.statistics.dislikeCount)
                }
            })
            .catch(function(err: any) {
                console.log(err)
            })
            .then(function(res: any) {
                for (let item in videoInfo[channelName].titles) {
                    try {
                        // TODO swap out with a function that grabs comments
                        // TODO look for a repo with more names to choose from
                        console.log(videoInfo[channelName].titles[item], gender.guess(videoInfo[channelName].titles[item]))
                    }
                    catch(err) {
                        console.log(err)
                    }
                }
            })
    })
}

// for (let idx in channelIds) {
//     videoIds[channels[idx]] = []
//     getChannelVideos(channels[idx], channelIds[idx])
// }
videoIds[channels[0]] = []
videoInfo[channels[0]] = {
    titles: [],
    viewCounts: [],
    likeCounts: [],
    dislikeCounts: []
}
getChannelVideos(channels[0], channelIds[0])