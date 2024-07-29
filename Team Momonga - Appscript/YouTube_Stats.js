// Enabled service:
// YouTube Data API v3 
// YouTube Analytics API v2

function main() {
    // Step 1: Retrieve the uploaded videos and their statistics
    const videoStats = retrieveVideoStats();
  
    // Step 2: Store the collected data into a Google Sheet
    if (videoStats.length > 0) {
      storeVideoStatsToSheet(videoStats);
    } else {
      console.log('No video statistics to store.');
    }
  }
  
  function retrieveVideoStats() {
    const videoStats = []; // Array to store video stats
  
    try {
      // Fetch the user's channel
      const results = YouTube.Channels.list('contentDetails', {
        mine: true
      });
  
      if (!results || !results.items || results.items.length === 0) {
        console.log('No Channels found.');
        return videoStats;
      }
  
      const item = results.items[0];
      const playlistId = item.contentDetails.relatedPlaylists.uploads;
      let nextPageToken = null;
  
      do {
        const playlistResponse = YouTube.PlaylistItems.list('snippet', {
          playlistId: playlistId,
          maxResults: 25,
          pageToken: nextPageToken
        });
  
        if (!playlistResponse || !playlistResponse.items || playlistResponse.items.length === 0) {
          console.log('No Playlist found.');
          break;
        }
  
        // Extract video IDs from the playlist response
        const videoIds = playlistResponse.items.map(playlistItem => playlistItem.snippet.resourceId.videoId);
  
        // Retrieve detailed statistics and details for the videos
        const videoResponse = YouTube.Videos.list('snippet,statistics,contentDetails', {
          id: videoIds.join(',')
        });
  
        if (!videoResponse || !videoResponse.items || videoResponse.items.length === 0) {
          console.log('No Video details found.');
          break;
        }
  
        videoResponse.items.forEach(video => {
          // Get video duration
          const duration = parseISO8601Duration(video.contentDetails.duration);
  
          // Placeholder for watch time and average watch duration (to be fetched from YouTube Analytics)
          const watchTime = 'N/A'; // Placeholder
          const averageWatchDuration = 'N/A'; // Placeholder
  
          // Add comment count
          const commentCount = video.statistics.commentCount || 'N/A';
  
          // Get the upload date
          const uploadDate = video.snippet.publishedAt.split('T')[0];
  
          videoStats.push([
            video.id,
            uploadDate, // Upload Date
            video.snippet.title,
            video.statistics.viewCount,
            video.statistics.likeCount,
            duration,
            watchTime,
            averageWatchDuration,
            commentCount // Add comment count here
          ]);
        });
  
        nextPageToken = playlistResponse.nextPageToken;
      } while (nextPageToken);
    } catch (err) {
      console.log('Failed with an error: %s', err.message);
    }
  
    return videoStats;
  }
  
  function parseISO8601Duration(isoDuration) {
    if (isoDuration === 'P0D') {
      return '0:00:00'; // Handle zero duration case
    }
    
    const regex = /PT(\d+H)?(\d+M)?(\d+S)?/;
    const match = regex.exec(isoDuration);
  
    if (!match) {
      console.log('Invalid ISO 8601 duration: %s', isoDuration);
      return '0:00:00';
    }
  
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
  
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  function storeVideoStatsToSheet(videoStats) {
    const spreadsheetName = 'Content Management'; // Replace with your Google Sheet name
    const sheetName = 'Test_Sheet'; // Replace with your desired sheet name
  
    try {
      // Open the existing spreadsheet by name
      const files = DriveApp.getFilesByName(spreadsheetName);
      if (!files.hasNext()) {
        console.log('Spreadsheet not found.');
        return;
      }
  
      const spreadsheet = SpreadsheetApp.open(files.next());
      const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.getActiveSheet();
  
      // Define headers including comment count
      const headers = ['Video ID', 'Upload Date', 'Time', 'Title', 'Views', 'Likes', 'Duration', 'Comments', 'Watch Time', 'Average Watch Duration', 'Last Updated Time'];
  
      // Find the last row with data to append new data after it
      const lastRow = sheet.getLastRow();
  
      // Add headers if the sheet is empty
      if (lastRow === 0) {
        sheet.appendRow(headers);
      }
  
      // Prepare data with date and time
      const now = new Date();
      const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss');
      const lastUpdatedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
      // Map videoStats data to align with the headers
      const dataWithDateTime = videoStats.map(row => [
        row[0], // Video ID
        row[1], // Upload Date
        time,   // Time
        row[2], // Title
        row[3], // Views
        row[4], // Likes
        row[5], // Duration
        row[8], // Comments
        row[6], // Watch Time
        row[7], // Average Watch Duration
        lastUpdatedTime // Last Updated Time
      ]);
  
      // Get all video IDs currently in the sheet
      const videoIdsInSheet = sheet.getRange(2, 1, lastRow, 1).getValues().flat();
  
      // Iterate through the data and either update existing rows or append new rows
      dataWithDateTime.forEach(row => {
        const videoId = row[0];
        const rowIndex = videoIdsInSheet.indexOf(videoId) + 2; // +2 because getValues() returns a zero-based index and we have headers
  
        if (rowIndex > 1) {
          // Update existing row
          sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
        } else {
          // Append new row
          sheet.appendRow(row);
        }
      });
  
      console.log('Data updated in sheet: %s', spreadsheet.getUrl());
    } catch (err) {
      console.log('Failed to update spreadsheet with an error: %s', err.message);
    }
  }
  