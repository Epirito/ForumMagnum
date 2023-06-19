import moment from "moment"
import { getDownvoteRatio } from "../../components/sunshineDashboard/UsersReviewInfoCard"
import { AutoRateLimit, RateLimitInfo, RecentKarmaInfo, TimeframeUnitType, UserKarmaInfo, UserRateLimit, rateLimitThresholds } from "./types"
import { userIsAdmin, userIsMemberOf } from "../vulcan-users"
import { RecentVoteInfo } from "../../server/repos/VotesRepo"
import uniq from "lodash/uniq"

export function getModRateLimitInfo(documents: Array<DbPost|DbComment>, modRateLimitHours: number, itemsPerTimeframe: number): RateLimitInfo|null {
  if (modRateLimitHours <= 0) return null
  const nextEligible = getNextAbleToSubmitDate(documents, "hours", modRateLimitHours, itemsPerTimeframe)
  if (!nextEligible) return null
  return {
    nextEligible,
    rateLimitMessage: "A moderator has rate limited you.",
    rateLimitType: "moderator"
  }
}

export function getUserRateLimitIntervalHours(userRateLimit: DbUserRateLimit | null): number {
  if (!userRateLimit) return 0;
  return moment.duration(userRateLimit.intervalLength, userRateLimit.intervalUnit).asHours();
}

export function getMaxAutoLimitHours(rateLimits?: Array<AutoRateLimit>) {
  if (!rateLimits) return 0
  return Math.max(...rateLimits.map(({timeframeLength, timeframeUnit}) => {
    return moment.duration(timeframeLength, timeframeUnit).asHours()
  }))
}

export function shouldIgnorePostRateLimit(user: DbUser) {
  return userIsAdmin(user) || userIsMemberOf(user, "sunshineRegiment") || userIsMemberOf(user, "canBypassPostRateLimit")
}

export function getStrictestRateLimitInfo(rateLimits: Array<RateLimitInfo|null>): RateLimitInfo | null {
  const nonNullRateLimits = rateLimits.filter((rateLimit): rateLimit is RateLimitInfo => rateLimit !== null)
  const sortedRateLimits = nonNullRateLimits.sort((a, b) => b.nextEligible.getTime() - a.nextEligible.getTime());
  return sortedRateLimits[0] ?? null;
}

export function getUserRateLimitInfo(userRateLimit: DbUserRateLimit|null, documents: Array<DbPost|DbComment>): RateLimitInfo|null {
  if (!userRateLimit) return null
  const nextEligible = getNextAbleToSubmitDate(documents, userRateLimit.intervalUnit, userRateLimit.intervalLength, userRateLimit.actionsPerInterval)
  if (!nextEligible) return null
  return {
    nextEligible,
    rateLimitType: "moderator",
    rateLimitMessage: "A moderator has rate limited you."
  }
}

export function shouldRateLimitApply(user: UserKarmaInfo, rateLimit: AutoRateLimit, recentKarmaInfo: RecentKarmaInfo): boolean {
  // rate limit conditions
  const { karmaThreshold, downvoteRatioThreshold, 
          recentKarmaThreshold, recentPostKarmaThreshold, recentCommentKarmaThreshold,
          downvoterCountThreshold, postDownvoterCountThreshold, commentDownvoterCountThreshold, 
          lastMonthKarmaThreshold, lastMonthDownvoterCountThreshold } = rateLimit

  // user's recent karma info
  const { recentKarma, lastMonthKarma, recentPostKarma, recentCommentKarma, 
          downvoterCount, postDownvoterCount, commentDownvoterCount, lastMonthDownvoterCount } = recentKarmaInfo

  // Karma is actually sometimes null, and numeric comparisons with null always return false (sometimes incorrectly)
  if ((karmaThreshold !== undefined) && (user.karma ?? 0) > karmaThreshold) return false 
  if ((downvoteRatioThreshold !== undefined) && getDownvoteRatio(user) < downvoteRatioThreshold) return false

  if ((recentKarmaThreshold !== undefined) && (recentKarma > recentKarmaThreshold)) return false
  if ((recentPostKarmaThreshold !== undefined) && (recentPostKarma > recentPostKarmaThreshold)) return false
  if ((recentCommentKarmaThreshold !== undefined) && (recentCommentKarma > recentCommentKarmaThreshold)) return false

  if ((lastMonthKarmaThreshold !== undefined && (lastMonthKarma > lastMonthKarmaThreshold))) return false
  if ((lastMonthDownvoterCountThreshold !== undefined && (lastMonthDownvoterCount > lastMonthDownvoterCountThreshold))) return false

  if ((downvoterCountThreshold !== undefined) && (downvoterCount > downvoterCountThreshold)) return false
  if ((postDownvoterCountThreshold !== undefined) && (postDownvoterCount > postDownvoterCountThreshold)) return false
  if ((commentDownvoterCountThreshold !== undefined) && (commentDownvoterCount > commentDownvoterCountThreshold)) return false
  return true
}

export function getNextAbleToSubmitDate(documents: Array<DbPost|DbComment>, timeframeUnit: TimeframeUnitType, timeframeLength: number, itemsPerTimeframe: number): Date|null {
  // make sure documents are sorted by descending date
  const sortedDocs = documents.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
  const docsInTimeframe = sortedDocs.filter(doc => doc.postedAt > moment().subtract(timeframeLength, timeframeUnit).toDate())
  const doc = docsInTimeframe[itemsPerTimeframe - 1]
  if (!doc) return null 
  return moment(doc.postedAt).add(timeframeLength, timeframeUnit).toDate()
}

export function getAutoRateLimitInfo(user: DbUser, rateLimit: AutoRateLimit,  documents: Array<DbPost|DbComment>, recentKarmaInfo: RecentKarmaInfo): RateLimitInfo|null {
  // rate limit effects
  const { timeframeUnit, timeframeLength, itemsPerTimeframe, rateLimitMessage, rateLimitType } = rateLimit 

  if (!shouldRateLimitApply(user, rateLimit, recentKarmaInfo)) return null

  const nextEligible = getNextAbleToSubmitDate(documents, timeframeUnit, timeframeLength, itemsPerTimeframe)
  if (!nextEligible) return null 
  return { nextEligible, rateLimitType, rateLimitMessage }
}

function getVotesOnLatestDocuments (votes: RecentVoteInfo[], numItems=20): RecentVoteInfo[] {
  // sort the votes via the date of the *postedAt* (joined from )
  const sortedVotes = votes.sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
  
  const uniqueDocumentIds = uniq(sortedVotes.map((vote) => vote.documentId))
  const latestDocumentIds = new Set(uniqueDocumentIds.slice(0, numItems))

  // get all votes whose documentId is in the top 20 most recent documents
  return sortedVotes.filter((vote) => latestDocumentIds.has(vote.documentId))
}

export function calculateRecentKarmaInfo(userId: string, allVotes: RecentVoteInfo[]): RecentKarmaInfo  {
  const top20DocumentVotes = getVotesOnLatestDocuments(allVotes)
  
  // We filter out the user's self-upvotes here, rather than in the query, because
  // otherwise the getLatest20contentItems won't know about all the relevant posts and comments. 
  // i.e. if a user comments 20 times, and nobody upvotes them, we wouldn't know to include them in the sorted list
  // (the alternative here would be making an additional query for all posts/comments, regardless of who voted on them,
  // which seemed at least as expensive as filtering out the self-votes here)
  const nonuserIDallVotes = allVotes.filter((vote: RecentVoteInfo) => vote.userId !== userId)
  const nonUserIdTop20DocVotes = top20DocumentVotes.filter((vote: RecentVoteInfo) => vote.userId !== userId)
  const postVotes = nonuserIDallVotes.filter(vote => vote.collectionName === "Posts")
  const commentVotes = nonuserIDallVotes.filter(vote => vote.collectionName === "Comments")

  const oneMonthAgo = moment().subtract(30, 'days').toDate();
  const lastMonthVotes = nonUserIdTop20DocVotes.filter(vote => vote.postedAt > oneMonthAgo)
  const lastMonthKarma = lastMonthVotes.reduce((sum: number, vote: RecentVoteInfo) => sum + vote.power, 0)

  const recentKarma = nonUserIdTop20DocVotes.reduce((sum: number, vote: RecentVoteInfo) => sum + vote.power, 0)
  const recentPostKarma = postVotes.reduce((sum: number, vote: RecentVoteInfo) => sum + vote.power, 0)
  const recentCommentKarma = commentVotes.reduce((sum: number, vote: RecentVoteInfo) => sum + vote.power, 0)
  
  const downvoters = nonUserIdTop20DocVotes.filter((vote: RecentVoteInfo) => vote.power < 0).map((vote: RecentVoteInfo) => vote.userId)
  const downvoterCount = uniq(downvoters).length
  const commentDownvoters = commentVotes.filter((vote: RecentVoteInfo) => vote.power < 0).map((vote: RecentVoteInfo) => vote.userId)
  const commentDownvoterCount = uniq(commentDownvoters).length
  const postDownvotes = postVotes.filter((vote: RecentVoteInfo) => vote.power < 0).map((vote: RecentVoteInfo) => vote.userId)
  const postDownvoterCount = uniq(postDownvotes).length
  const lastMonthDownvotes = lastMonthVotes.filter((vote: RecentVoteInfo) => vote.power < 0).map((vote: RecentVoteInfo) => vote.userId)
  const lastMonthDownvoterCount = uniq(lastMonthDownvotes).length
  return { 
    recentKarma: recentKarma ?? 0, 
    lastMonthKarma: lastMonthKarma ?? 0,
    recentPostKarma: recentPostKarma ?? 0,
    recentCommentKarma: recentCommentKarma ?? 0,
    downvoterCount: downvoterCount ?? 0, 
    postDownvoterCount: postDownvoterCount ?? 0,
    commentDownvoterCount: commentDownvoterCount ?? 0,
    lastMonthDownvoterCount: lastMonthDownvoterCount ?? 0
  }
}

export function getRateLimitNames(user: SunshineUsersList, autoRateLimits: AutoRateLimit[]) {
  const userRateLimits = autoRateLimits.filter(rateLimit => rateLimit.rateLimitType !== "universal")

  function getRateLimitName (rateLimit: AutoRateLimit) {
    let rateLimitName = `${rateLimit.itemsPerTimeframe} ${rateLimit.actionType} per ${rateLimit.timeframeLength} ${rateLimit.timeframeUnit}`

    const thresholdInfo = rateLimitThresholds.map(threshold => rateLimit[threshold] ? `${rateLimit[threshold]} ${threshold.replace("Threshold", "")}` : undefined).filter(threshold => threshold)

    return rateLimitName += ` (${thresholdInfo.join(", ")})`
  }

  return userRateLimits
    .map(rateLimit => shouldRateLimitApply(user, rateLimit, user.recentKarmaInfo) && getRateLimitName(rateLimit))
    .filter(rateLimit => rateLimit)
    .reverse()
}
