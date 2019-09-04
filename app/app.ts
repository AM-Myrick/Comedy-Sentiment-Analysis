import express = require('express');
const app: express.Application = express();
const axios = require('axios');
const gender = require('gender');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

require('dotenv').config();
const maxResults = 5 //maximum results given by YouTube API per get request
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const channels: string[] = ['The Laugh Factory', 'Just For Laughs', 'Comedy Central Stand-Up', 'Dry Bar Comedy']
const channelIds: string[] = ['UCxyCzPY2pjAjrxoSYclpuLg', 'UCqq3PZwp8Ob8_jN0esCunIw', 'UCtw7q4SyOeoCwM1i_3x8lDg', 'UCvlVuntLjdURVD3b3Hx7kxw']
interface VideoDict {
  [key: string]: any
}

let videoIds: VideoDict = {}
let videoInfo: VideoDict = {}
let channelBreakdown: VideoDict = {}
let commentsBreakdown: VideoDict = {}

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

function getChannelVideoIds(channelName:string, channelId: string, nextPageToken = '') {
  axios.get(`https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${maxResults}&pageToken=${nextPageToken}`)
    .then((res: any) => {
      for (let item of res.data.items) {
        videoIds[channelName].push(item.id.videoId)
      }
      if (videoIds[channelName].length < 10) {
        getChannelVideoIds(channelName, channelId, res.data.nextPageToken)
      }
      else {
        getVideoInfo(channelName)
      }
    })
    .catch((err: any) => {
      console.log(err)
    })
}

function getVideoInfo(channelName: string) {
  const joinedVideoIds: string = videoIds[channelName].join(',')
  axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${joinedVideoIds}&key=${YOUTUBE_API_KEY}`)
    .then((res: any) => {
      for (let item of res.data.items) {
        videoInfo[channelName].titles.push(item.snippet.title)
        videoInfo[channelName].viewCounts.push(item.statistics.viewCount)
        videoInfo[channelName].likeCounts.push(item.statistics.likeCount)
        videoInfo[channelName].dislikeCounts.push(item.statistics.dislikeCount)
      }
      getVideoTitleGender(channelName)
    })
    .catch((err: any) => {
      console.log(err)
    })
}

function getVideoTitleGender(channelName: string) {
  for (let item in videoInfo[channelName].titles) {
    const videoTitle: string = videoInfo[channelName].titles[item]
    const getGender: string = gender.guess(videoTitle).gender
    channelBreakdown[channelName][getGender].viewCounts.push(videoInfo[channelName].viewCounts[item])
    channelBreakdown[channelName][getGender].likeCounts.push(videoInfo[channelName].likeCounts[item])
    channelBreakdown[channelName][getGender].dislikeCounts.push(videoInfo[channelName].dislikeCounts[item])
    channelBreakdown[channelName][getGender].videoIds.push(videoIds[channelName][item])
    channelBreakdown[channelName][getGender].titles.push(videoTitle)

    commentsBreakdown[channelName][getGender][videoTitle] = {
      comments: [],
      sentimentScores: [],
      positiveWords: [],
      negativeWords: []
    }
    getVideoComments(channelName, videoTitle, videoIds[channelName][item], getGender)
  }
}

function getVideoComments(channelName: string, videoTitle: string, videoId: string, gender: string, nextPageToken = '') {
  axios.get(`https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet%2Creplies&videoId=${videoId}&key=${YOUTUBE_API_KEY}&pageToken=${nextPageToken}`)
    .then((res: any) => {
      // TODO figure out how to get all comments SOLUTION - use comments endpoint to get all replies to any given comment
      // get rid of if item.replies block at that point
      // console.log(res.data.items)
      for (let item of res.data.items) {
        item.snippet.textDisplay ? commentsBreakdown[channelName][gender][videoTitle].comments.push(item.snippet.textDisplay) : ''
        if (item.replies) {
          let comments = item.replies.comments
          for (let comment of comments) {
            commentsBreakdown[channelName][gender][videoTitle].comments.push(comment.snippet.textDisplay)
          }
        }
      }
      if (res.data.nextPageToken) {
        getVideoComments(channelName, videoTitle, videoId, gender, res.data.nextPageToken)
      }
      else {
        getCommentSentiment(channelName, videoTitle, gender)
      }
    })
    .catch((err: any) => {
      console.log(err)
    })
}

function getCommentSentiment(channelName: string, videoTitle: string, gender: string) {
  const comments: string[] = commentsBreakdown[channelName][gender][videoTitle].comments
  console.log(comments)
  for (let comment of comments) {
    let result = sentiment.analyze(comment)
    commentsBreakdown[channelName][gender][videoTitle].sentimentScores.push(result.score)
    result.positive.map((str: any) => commentsBreakdown[channelName][gender][videoTitle].positiveWords.push(str))
    result.negative.map((str: any) => commentsBreakdown[channelName][gender][videoTitle].negativeWords.push(str))
  }
  console.log(commentsBreakdown[channelName][gender][videoTitle].comments.length, videoTitle)
}

// for (let idx in channelIds) {
//     videoIds[channels[idx]] = []
//     getChannelVideoIds(channels[idx], channelIds[idx])
// }
videoIds[channels[0]] = []
videoInfo[channels[0]] = {
  titles: [],
  viewCounts: [],
  likeCounts: [],
  dislikeCounts: []
}
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
}
commentsBreakdown[channels[0]] = {
  male: {

  },
  female: {

  },
  unknown: {

  }
}
getChannelVideoIds(channels[0], channelIds[0])