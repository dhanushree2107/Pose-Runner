/* =========================================================
   POSE RUNNER - Local Leaderboard & Statistics Store
   ========================================================= */

const STORAGE_KEY = 'pose_runner_highscores';

export class LeaderboardManager {
  static getScores() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Could not read leaderboard from localStorage:', e);
    }

    // Default seeded records for Expo excitement
    return [
      { rank: 1, name: 'CYBER_ACE', score: 6420, distance: 780, date: 'Today' },
      { rank: 2, name: 'AI_PIONEER', score: 4890, distance: 610, date: 'Today' },
      { rank: 3, name: 'NEON_RUNNER', score: 3250, distance: 430, date: 'Today' },
      { rank: 4, name: 'KINETIC_BOY', score: 2180, distance: 310, date: 'Today' },
      { rank: 5, name: 'BLAZE_BOT', score: 1450, distance: 220, date: 'Today' }
    ];
  }

  static getHighScore() {
    const scores = this.getScores();
    return scores.length > 0 ? scores[0].score : 0;
  }

  static saveScore(playerName, score, distance) {
    let scores = this.getScores();
    const entry = {
      name: (playerName || 'RUNNER').toUpperCase().slice(0, 12),
      score: Math.round(score),
      distance: Math.round(distance),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 8); // Keep top 8

    // Reassign ranks
    scores.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    return {
      scores,
      isTopScore: entry.score >= scores[0].score
    };
  }

  static resetScores() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Ignored
    }
  }
}
