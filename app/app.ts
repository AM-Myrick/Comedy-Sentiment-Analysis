import express = require('express');
const app: express.Application = express();
const axios = require('axios');
const gender = require('gender');
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

require('dotenv').config();
const maxResults = 10 //maximum results given by YouTube API per get request
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const channels: string[] = ['The Laugh Factory', 'Just For Laughs', 'Comedy Central Stand-Up', 'Dry Bar Comedy']
const channelIds: string[] = ['UCxyCzPY2pjAjrxoSYclpuLg', 'UCqq3PZwp8Ob8_jN0esCunIw', 'UCtw7q4SyOeoCwM1i_3x8lDg', 'UCvlVuntLjdURVD3b3Hx7kxw']
interface VideoDict {
  [key: string]: any
}

const videoIds: VideoDict = {}
const videoInfo: VideoDict = {}
const channelBreakdown: VideoDict = {}
const commentsBreakdown: VideoDict = {}
const finalData: VideoDict = {}

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
      // if (videoIds[channelName].length < 10) {
      //   getChannelVideoIds(channelName, channelId, res.data.nextPageToken)
      // }
      getVideoInfo(channelName)
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
  const promises = []
  for (let item in videoInfo[channelName].titles) {
    const videoTitle: string = videoInfo[channelName].titles[item]
    const getGender: string = gender.guess(videoTitle).gender
    channelBreakdown[channelName][getGender].viewCounts.push(parseInt(videoInfo[channelName].viewCounts[item]))
    channelBreakdown[channelName][getGender].likeCounts.push(parseInt(videoInfo[channelName].likeCounts[item]))
    channelBreakdown[channelName][getGender].dislikeCounts.push(parseInt(videoInfo[channelName].dislikeCounts[item]))
    channelBreakdown[channelName][getGender].videoIds.push(videoIds[channelName][item])
    channelBreakdown[channelName][getGender].titles.push(videoTitle)

    commentsBreakdown[channelName][getGender] = {
      comments: [],
      sentimentScores: [],
      positiveWords: [],
      negativeWords: []
    }
    promises.push(getVideoComments(channelName, videoIds[channelName][item], getGender))
  }
  Promise.all(promises).then((values) => { 
    getCommentSentiment(channelName, 'male')
    getCommentSentiment(channelName, 'female')
    getCommentSentiment(channelName, 'unknown')
  })
}

function getVideoComments(channelName: string, videoId: string, gender: string, nextPageToken = '') {
  return axios.get(`https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet%2Creplies&videoId=${videoId}&key=${YOUTUBE_API_KEY}&pageToken=${nextPageToken}`)
    .then((res: any) => {
      for (let item of res.data.items) {
        let commentText = item.snippet.topLevelComment.snippet.textDisplay
        commentsBreakdown[channelName][gender].comments.push(commentText)
        if (item.replies) {
          let comments = item.replies.comments
          for (let comment of comments) {
            commentsBreakdown[channelName][gender].comments.push(comment.snippet.textDisplay)
          }
        }
      }
      if (res.data.nextPageToken) {
        return getVideoComments(channelName, videoId, gender, res.data.nextPageToken)
      }
      else {
        return res.data
      }
    })
    .catch((err: any) => {
      return err
    })
}

function getCommentSentiment(channelName: string, gender: string) {
  const comments: string[] = commentsBreakdown[channelName][gender].comments
  for (let comment of comments) {
    let result = sentiment.analyze(comment)
    commentsBreakdown[channelName][gender].sentimentScores.push(result.score)
    result.positive.map((str: any) => commentsBreakdown[channelName][gender].positiveWords.push(str))
    result.negative.map((str: any) => commentsBreakdown[channelName][gender].negativeWords.push(str))
  }
  getAverages(channelName, gender)
}

function getAverages(channelName: string, gender: string) {
  const average = (array: number[]) => array.reduce((a, b) => a + b) / array.length

  const sentimentScores: number[] = commentsBreakdown[channelName][gender].sentimentScores
  const viewCounts: number[] = channelBreakdown[channelName][gender].viewCounts
  const likeCounts: number[] = channelBreakdown[channelName][gender].likeCounts
  const dislikeCounts: number[] = channelBreakdown[channelName][gender].dislikeCounts

  finalData[channelName][gender].avgSentiment = average(sentimentScores)
  finalData[channelName][gender].avgViewCount = average(viewCounts)
  finalData[channelName][gender].avgLikeCount = average(likeCounts)
  finalData[channelName][gender].avgDislikeCount = average(dislikeCounts)
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
  male: {},
  female: {},
  unknown: {}
}

finalData[channels[0]] = {
  male: {
    avgSentiment: null,
    mostUsedPositiveWords: [],
    mostUsedNegativeWords: [],
    avgViewCount: null,
    avgLikeCount: null,
    avgDislikeCount: null
  },
  female: {
    avgSentiment: null,
    mostUsedPositiveWords: [],
    mostUsedNegativeWords: [],
    avgViewCount: null,
    avgLikeCount: null,
    avgDislikeCount: null
  },
  unknown: {
    avgSentiment: null,
    mostUsedPositiveWords: [],
    mostUsedNegativeWords: [],
    avgViewCount: null,
    avgLikeCount: null,
    avgDislikeCount: null
  }
}
getChannelVideoIds(channels[0], channelIds[0])