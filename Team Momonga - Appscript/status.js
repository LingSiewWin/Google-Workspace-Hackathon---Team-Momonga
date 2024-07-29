function status(presentDate) {
    const today = new Date();
  
    // Check if today's date is the same or after the preset date
    if (today >= presentDate) {
      return 'Posted';
    } else {
      return 'Ready to Post'; // If today is before the preset date, it’s ready to post
    }
  }
  